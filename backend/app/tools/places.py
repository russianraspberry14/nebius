"""search_places(query, area) -> candidate venues.

Primary: Google Places API (New) Text Search, if GOOGLE_PLACES_API_KEY is set.
Fallback, keyless: OpenStreetMap Nominatim's own /search endpoint, searched
by venue category rather than the raw query text (a real craft-beer bar is
almost never literally named "craft beer taproom"). Overpass is kept as a
second-line fallback for the categories Nominatim's index covers more
thinly (pottery studios, board-game cafes), since live testing found
Nominatim far more reliably reachable than the shared Overpass instance.
"""

import re
import time

import httpx

from app.config import GOOGLE_PLACES_API_KEY
from app.tools.cache import cached
from app.tools.geocode import geocode

GOOGLE_PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
# Both OSM services' usage policies ask for a descriptive User-Agent, and
# Overpass's nginx front-end 406s requests that don't send one at all.
USER_AGENT = "Kindred/0.1 (hackathon demo project, contact via project repo)"
# Nominatim's public instance asks for max 1 request/second.
NOMINATIM_MIN_INTERVAL = 1.1

STOPWORDS = {
    "a", "an", "the", "in", "near", "at", "with", "for", "of", "to", "and",
    "or", "spot", "place", "venue", "nearby", "good", "nice",
}

# OSM tags real businesses are actually categorized under - matching a
# conversational query against a place's *name* almost never works (a real
# craft-beer bar is tagged amenity=bar / microbrewery=yes, it isn't
# literally named "craft beer taproom"). Each keyword found in the query
# adds its tag clauses to the search, so "vegetarian restaurant" pulls in
# both the cuisine and the venue type. Also used to derive plain search
# terms for Nominatim (see _nominatim_terms_for).
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

_TAG_VALUE_RE = re.compile(r'="([^"]+)"')
_last_nominatim_call = 0.0


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


def _significant_words(query: str) -> list[str]:
    words = re.findall(r"[a-z]+", query.lower())
    return [w for w in words if w not in STOPWORDS]


def _nominatim_terms_for(query: str) -> list[str]:
    """Plain search terms Nominatim's own index actually matches well -
    derived from the same category map as Overpass, by pulling the tag
    *value* back out (["amenity"="bar"] -> "bar"), since Nominatim matches
    venue type/name, not OSM tag syntax."""
    terms: list[str] = []
    for word in _significant_words(query):
        for clause in CATEGORY_TAGS.get(word, []):
            m = _TAG_VALUE_RE.search(clause)
            if not m:
                continue
            value = m.group(1).replace("_", " ")
            if value != "yes" and value not in terms:
                terms.append(value)
    return terms or _significant_words(query)[:2]


def _throttle_nominatim() -> None:
    global _last_nominatim_call
    wait = NOMINATIM_MIN_INTERVAL - (time.monotonic() - _last_nominatim_call)
    if wait > 0:
        time.sleep(wait)
    _last_nominatim_call = time.monotonic()


def _search_places_nominatim(query: str, area: str) -> list[dict]:
    coords = geocode(city=area)
    lat, lon = coords["lat"], coords["lon"]
    # A ~11km bounding box around the area's center. Combined with
    # bounded=1 below, this is a hard filter - without it a plain category
    # word like "bar" ranks places literally named that (there's a town
    # called Bar in Montenegro) above real bars in the actual area.
    viewbox = f"{lon - 0.1},{lat + 0.1},{lon + 0.1},{lat - 0.1}"

    results: list[dict] = []
    seen_ids: set[str] = set()
    last_error: Exception | None = None
    for term in _nominatim_terms_for(query):
        if len(results) >= 8:
            break
        # The public instance is occasionally flaky for a single request -
        # one retry clears most of that without waiting for the full
        # Overpass fallback (which has its own, slower, 3-mirror retry).
        for attempt in range(2):
            _throttle_nominatim()
            try:
                resp = httpx.get(
                    NOMINATIM_SEARCH_URL,
                    params={
                        "q": term,
                        "format": "jsonv2",
                        "viewbox": viewbox,
                        # Without this, viewbox is only a ranking hint - a
                        # plain category word like "bar" matches places
                        # literally named "Bar" anywhere on earth (there's a
                        # town called Bar in Montenegro) before it matches
                        # real bars in the area.
                        "bounded": 1,
                        "limit": 8,
                    },
                    headers={"User-Agent": USER_AGENT},
                    timeout=10,
                )
                resp.raise_for_status()
                break
            except (httpx.TimeoutException, httpx.HTTPStatusError, httpx.ConnectError) as exc:
                last_error = exc
                if attempt == 0:
                    time.sleep(1)
        else:
            # Both attempts for this term failed - skip it rather than
            # aborting the whole search; other terms may still succeed.
            continue
        for item in resp.json():
            osm_id = f"{item.get('osm_type')}{item.get('osm_id')}"
            if osm_id in seen_ids:
                continue
            seen_ids.add(osm_id)
            name = item.get("display_name", "").split(",")[0].strip()
            if not name:
                continue
            results.append(
                {
                    "name": name,
                    "address": item.get("display_name"),
                    "rating": None,
                    "price_level": None,
                    "url": f"https://www.google.com/maps/search/?api=1&query={item['lat']},{item['lon']}",
                    "source": "nominatim",
                }
            )
    if not results and last_error is not None:
        # Every term that got tried genuinely failed (not just "no
        # matches") - raise so search_places() falls through to Overpass
        # and, if that fails too, doesn't cache this as "no results" for
        # 24h.
        raise last_error
    return results


def _overpass_clauses(query: str, lat: float, lon: float) -> list[str]:
    significant = _significant_words(query)

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
                headers={"User-Agent": USER_AGENT},
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

    nominatim_error: Exception | None = None
    try:
        results = _search_places_nominatim(query=query, area=area)
    except Exception as exc:
        nominatim_error = exc
        results = []
    if results:
        return results

    # Nominatim came up empty - either a niche category its index covers
    # thinly, or it errored - Overpass's wider tag search is worth a shot
    # before giving up.
    try:
        return _search_places_overpass(query=query, area=area)
    except Exception as overpass_error:
        if nominatim_error is not None:
            # Both sources actually failed (not "genuinely no results") -
            # raise so the 24h cache doesn't memoize a transient outage as
            # "nothing here".
            raise RuntimeError(
                f"Both place sources failed: nominatim={nominatim_error}; overpass={overpass_error}"
            ) from overpass_error
        return results
