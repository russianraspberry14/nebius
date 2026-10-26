"""search_places(query, area) -> candidate venues.

Primary: Google Places API (New) Text Search, if GOOGLE_PLACES_API_KEY is set.
Fallback: OpenStreetMap Overpass (keyless, thinner coverage) - keeps the demo
runnable with zero billing setup.
"""

import httpx

from app.config import GOOGLE_PLACES_API_KEY
from app.tools.cache import cached
from app.tools.geocode import geocode

GOOGLE_PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
# Overpass's nginx front-end 406s requests with no (or a generic) User-Agent.
OVERPASS_USER_AGENT = "Kindred/0.1 (hackathon demo project, contact via project repo)"


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


def _search_places_overpass(query: str, area: str) -> list[dict]:
    coords = geocode(city=area)
    overpass_query = (
        "[out:json][timeout:15];"
        f'node(around:5000,{coords["lat"]},{coords["lon"]})["name"~"{query}",i];'
        "out center 15;"
    )
    resp = httpx.post(
        OVERPASS_URL,
        data={"data": overpass_query},
        headers={"User-Agent": OVERPASS_USER_AGENT},
        timeout=20,
    )
    resp.raise_for_status()
    elements = resp.json().get("elements", [])
    return [
        {
            "name": el["tags"]["name"],
            "address": None,
            "rating": None,
            "price_level": None,
            "url": f"https://www.openstreetmap.org/node/{el['id']}",
            "source": "openstreetmap",
        }
        for el in elements
        if el.get("tags", {}).get("name")
    ]


@cached("search_places")
def search_places(query: str, area: str) -> list[dict]:
    if GOOGLE_PLACES_API_KEY:
        return _search_places_google(query=query, area=area)
    return _search_places_overpass(query=query, area=area)
