"""search_places(query, area) -> candidate venues.

Primary: Google Places API (New) Text Search, if GOOGLE_PLACES_API_KEY is set.
Fallback: OpenStreetMap Overpass (keyless, thinner coverage) - keeps the demo
runnable with zero billing setup.
"""

import re
import time

import httpx

from app.config import GOOGLE_PLACES_API_KEY
from app.tools.cache import cached
from app.tools.geocode import geocode

GOOGLE_PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
# The main instance is a single shared, free, heavily-used server that's
# frequently overloaded - these are independently-run mirrors of the same
# Overpass API, so a timeout on one doesn't have to mean no real search
# happens at all.
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
# Overpass's nginx front-end 406s requests with no (or a generic) User-Agent.
OVERPASS_USER_AGENT = "Kindred/0.1 (hackathon demo project, contact via project repo)"

STOPWORDS = {
    "a", "an", "the", "in", "near", "at", "with", "for", "of", "to", "and",
    "or", "spot", "place", "venue", "nearby", "good", "nice",
}

# OSM tags real businesses are actually categorized under - matching a
# conversational query against a place's *name* almost never works (a real
# craft-beer bar is tagged amenity=bar / microbrewery=yes, it isn't
# literally named "craft beer taproom"). Each keyword found in the query
# adds its tag clauses to an OR'd search, so "vegetarian restaurant" pulls
# in both the cuisine and the venue type.
CATEGORY_TAGS: dict[str, list[str]] = {
    "restaurant": ['["amenity"="restaurant"]'],
    "dinner": ['["amenity"="restaurant"]'],
    "lunch": ['["amenity"="restaurant"]'],
    "vegetarian": ['["diet:vegetarian"="yes"]'],
    "vegan": ['["diet:vegan"="yes"]'],
    "pizza": ['["cuisine"="pizza"]'],
    "cafe": ['["amenity"="cafe"]'],
    "coffee": ['["amenity"="cafe"]'],
    "matcha": ['["amenity"="cafe"]'],
    "tea": ['["shop"="tea"]', '["amenity"="cafe"]'],
    "dessert": ['["shop"="pastry"]', '["amenity"="cafe"]'],
    "bakery": ['["shop"="bakery"]'],
    "bar": ['["amenity"="bar"]', '["amenity"="pub"]'],
    "pub": ['["amenity"="pub"]'],
    "beer": ['["amenity"="bar"]', '["amenity"="pub"]', '["microbrewery"="yes"]'],
    "brewery": ['["microbrewery"="yes"]', '["craft"="brewery"]'],
    "taproom": ['["amenity"="bar"]', '["microbrewery"="yes"]'],
    "wine": ['["shop"="wine"]', '["amenity"="bar"]'],
    "cocktail": ['["amenity"="bar"]'],
    "park": ['["leisure"="park"]'],
    "garden": ['["leisure"="garden"]'],
    "museum": ['["tourism"="museum"]'],
    "gallery": ['["tourism"="gallery"]'],
    "art": ['["shop"="art"]', '["amenity"="arts_centre"]'],
    "pottery": ['["craft"="pottery"]'],
    "studio": ['["craft"="pottery"]', '["amenity"="arts_centre"]'],
    "class": ['["amenity"="arts_centre"]'],
    "jazz": ['["amenity"="bar"]', '["amenity"="nightclub"]'],
    "music": ['["amenity"="nightclub"]', '["amenity"="bar"]'],
    "live": ['["amenity"="nightclub"]', '["amenity"="bar"]'],
    "cinema": ['["amenity"="cinema"]'],
    "movie": ['["amenity"="cinema"]'],
    "bowling": ['["leisure"="bowling_alley"]'],
    "arcade": ['["leisure"="adult_gaming_centre"]'],
    "game": ['["leisure"="adult_gaming_centre"]', '["shop"="games"]'],
    "games": ['["leisure"="adult_gaming_centre"]', '["shop"="games"]'],
    "trivia": ['["amenity"="bar"]', '["amenity"="pub"]'],
    "hike": ['["leisure"="park"]', '["natural"="wood"]'],
    "trail": ['["leisure"="park"]', '["natural"="wood"]'],
    "spa": ['["shop"="beauty"]', '["leisure"="spa"]'],
}


def _search_places_google(query: str, area: str) -> list[dict]:
    resp = httpx.post(
        GOOGLE_PLACES_TEXT_SEARCH_URL,
        json={"textQuery": f"{query} in {area}"},
        headers={
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": (
                "places.displayName,places.formattedAddress,places.rating,"
                "places.priceLevel,places.googleMapsUri"
            ),
        },
        timeout=10,
    )
    resp.raise_for_status()
    places = resp.json().get("places", [])
    return [
        {
            "name": p.get("displayName", {}).get("text", ""),
            "address": p.get("formattedAddress"),
            "rating": p.get("rating"),
            "price_level": p.get("priceLevel"),
            "url": p.get("googleMapsUri"),
            "source": "google_places",
        }
        for p in places
    ]


def _overpass_clauses(query: str, lat: float, lon: float) -> list[str]:
    """Builds one `node(around:...)[tag=value];` clause per matched category,
    plus a loose name-regex clause on whatever's left - so a query hits real
    OSM tag categories first, with a name match only as a last resort."""
    words = re.findall(r"[a-z]+", query.lower())
    significant = [w for w in words if w not in STOPWORDS]

    tag_filters: list[str] = []
    for word in significant:
        for tag in CATEGORY_TAGS.get(word, []):
            if tag not in tag_filters:
                tag_filters.append(tag)

    clauses = [f'node(around:5000,{lat},{lon}){tag};' for tag in tag_filters]

    name_terms = "|".join(re.escape(w) for w in significant) or re.escape(query)
    clauses.append(f'node(around:5000,{lat},{lon})["name"~"{name_terms}",i];')

    return clauses


def _search_places_overpass(query: str, area: str) -> list[dict]:
    coords = geocode(city=area)
    clauses = _overpass_clauses(query, coords["lat"], coords["lon"])
    overpass_query = "[out:json][timeout:25];(" + "".join(clauses) + ");out center 20;"

    last_error: Exception | None = None
    for i, url in enumerate(OVERPASS_URLS):
        try:
            resp = httpx.post(
                url,
                data={"data": overpass_query},
                headers={"User-Agent": OVERPASS_USER_AGENT},
                timeout=20,
            )
            resp.raise_for_status()
            break
        except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.ConnectError) as exc:
            last_error = exc
            if i < len(OVERPASS_URLS) - 1:
                time.sleep(1)
    else:
        raise RuntimeError(f"Overpass search failed on every mirror: {last_error}")

    elements = resp.json().get("elements", [])
    seen_ids: set[int] = set()
    results = []
    for el in elements:
        name = el.get("tags", {}).get("name")
        if not name or el["id"] in seen_ids:
            continue
        seen_ids.add(el["id"])
        results.append(
            {
                "name": name,
                "address": None,
                "rating": None,
                "price_level": None,
                "url": f"https://www.openstreetmap.org/node/{el['id']}",
                "source": "openstreetmap",
            }
        )
    return results


@cached("search_places")
def search_places(query: str, area: str) -> list[dict]:
    if GOOGLE_PLACES_API_KEY:
        return _search_places_google(query=query, area=area)
    return _search_places_overpass(query=query, area=area)
