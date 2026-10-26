"""geocode(city) -> coordinates, via Open-Meteo's geocoding API (no key needed)."""

import httpx

from app.tools.cache import cached

OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"


@cached("geocode")
def geocode(city: str) -> dict:
    resp = httpx.get(OPEN_METEO_GEOCODE_URL, params={"name": city, "count": 1}, timeout=10)
    resp.raise_for_status()
    results = resp.json().get("results") or []
    if not results:
        raise ValueError(f"Couldn't find coordinates for '{city}'.")
    r = results[0]
    return {
        "name": r["name"],
        "country": r.get("country"),
        "lat": r["latitude"],
        "lon": r["longitude"],
    }
