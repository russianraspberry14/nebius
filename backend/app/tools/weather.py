"""get_weather(area, date) -> forecast, via Open-Meteo (no key, ~16 days out)."""

import httpx

from app.tools.cache import cached
from app.tools.geocode import geocode

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


@cached("weather")
def get_weather(area: str, date: str) -> dict:
    coords = geocode(city=area)
    resp = httpx.get(
        OPEN_METEO_FORECAST_URL,
        params={
            "latitude": coords["lat"],
            "longitude": coords["lon"],
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode",
            "timezone": "auto",
            "start_date": date,
            "end_date": date,
        },
        timeout=10,
    )
    resp.raise_for_status()
    daily = resp.json().get("daily") or {}
    if not daily.get("time"):
        raise ValueError(f"No forecast available for {area} on {date} (Open-Meteo covers ~16 days out).")
    return {
        "date": daily["time"][0],
        "temp_high_c": daily["temperature_2m_max"][0],
        "temp_low_c": daily["temperature_2m_min"][0],
        "precipitation_chance": daily["precipitation_probability_max"][0],
        "weather_code": daily["weathercode"][0],
    }
