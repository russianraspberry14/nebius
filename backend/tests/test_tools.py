from types import SimpleNamespace

import pytest

from app.tools import events, geocode, places
from app.tools.cache import get_cached, set_cached
from app.tools.weather import get_weather


class FakeResponse:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._data


# ---- cache ----

def test_cache_round_trip(tool_db):
    assert get_cached("ns", {"a": 1}) is None
    set_cached("ns", {"a": 1}, {"value": 42})
    assert get_cached("ns", {"a": 1}) == {"value": 42}
    # Different args -> different key -> no hit.
    assert get_cached("ns", {"a": 2}) is None


def test_cache_expires_after_ttl(tool_db, monkeypatch):
    import datetime as dt

    from app.tools import cache as cache_module

    set_cached("ns", {"a": 1}, {"value": 42})

    real_datetime = cache_module.datetime

    class FrozenFuture(real_datetime):
        @classmethod
        def now(cls, tz=None):
            return real_datetime.now(tz) + dt.timedelta(hours=25)

    monkeypatch.setattr(cache_module, "datetime", FrozenFuture)
    assert get_cached("ns", {"a": 1}) is None


# ---- geocode ----

def test_geocode_caches_and_hits_network_once(tool_db, monkeypatch):
    calls = []

    def fake_get(url, params=None, timeout=None):
        calls.append(params)
        return FakeResponse({"results": [{"name": "Austin", "country": "US", "latitude": 30.27, "longitude": -97.74}]})

    monkeypatch.setattr("httpx.get", fake_get)

    first = geocode.geocode(city="Austin")
    second = geocode.geocode(city="Austin")
    assert first == second
    assert first["lat"] == 30.27
    assert len(calls) == 1  # second call was served from cache


def test_geocode_not_found_raises(tool_db, monkeypatch):
    monkeypatch.setattr("httpx.get", lambda *a, **k: FakeResponse({"results": []}))
    with pytest.raises(ValueError, match="Couldn't find coordinates"):
        geocode.geocode(city="Nowhereville")


# ---- weather ----

def test_get_weather_geocodes_then_fetches_forecast(tool_db, monkeypatch):
    def fake_get(url, params=None, timeout=None):
        if "geocoding" in url:
            return FakeResponse({"results": [{"name": "Austin", "country": "US", "latitude": 30.27, "longitude": -97.74}]})
        return FakeResponse(
            {
                "daily": {
                    "time": ["2026-11-12"],
                    "temperature_2m_max": [75.0],
                    "temperature_2m_min": [55.0],
                    "precipitation_probability_max": [10],
                    "weathercode": [1],
                }
            }
        )

    monkeypatch.setattr("httpx.get", fake_get)
    result = get_weather(area="Austin", date="2026-11-12")
    assert result["temp_high_c"] == 75.0
    assert result["date"] == "2026-11-12"


def test_get_weather_no_forecast_raises(tool_db, monkeypatch):
    def fake_get(url, params=None, timeout=None):
        if "geocoding" in url:
            return FakeResponse({"results": [{"name": "Austin", "country": "US", "latitude": 30.27, "longitude": -97.74}]})
        return FakeResponse({"daily": {"time": []}})

    monkeypatch.setattr("httpx.get", fake_get)
    with pytest.raises(ValueError, match="No forecast available"):
        get_weather(area="Austin", date="2099-01-01")


# ---- places ----

def test_search_places_uses_google_when_key_set(tool_db, monkeypatch):
    monkeypatch.setattr("app.tools.places.GOOGLE_PLACES_API_KEY", "fake-key")

    def fake_post(url, json=None, headers=None, timeout=None, data=None):
        return FakeResponse(
            {
                "places": [
                    {
                        "displayName": {"text": "Clay Pottery Studio"},
                        "formattedAddress": "123 Main St",
                        "rating": 4.8,
                        "priceLevel": "PRICE_LEVEL_MODERATE",
                        "googleMapsUri": "https://maps.google.com/?cid=1",
                    }
                ]
            }
        )

    monkeypatch.setattr("httpx.post", fake_post)
    results = places.search_places(query="pottery studio", area="Austin")
    assert results[0]["name"] == "Clay Pottery Studio"
    assert results[0]["source"] == "google_places"


def test_search_places_falls_back_to_overpass_without_key(tool_db, monkeypatch):
    monkeypatch.setattr("app.tools.places.GOOGLE_PLACES_API_KEY", "")
    monkeypatch.setattr(
        "httpx.get",
        lambda *a, **k: FakeResponse({"results": [{"name": "Austin", "country": "US", "latitude": 30.27, "longitude": -97.74}]}),
    )
    monkeypatch.setattr(
        "httpx.post",
        lambda *a, **k: FakeResponse({"elements": [{"id": 1, "tags": {"name": "Clayworks"}}]}),
    )
    results = places.search_places(query="pottery studio", area="Austin")
    assert results[0]["name"] == "Clayworks"
    assert results[0]["source"] == "openstreetmap"


# ---- events ----

def test_search_events_without_any_key_configured_raises(tool_db, monkeypatch):
    monkeypatch.setattr("app.tools.events.TICKETMASTER_API_KEY", "")
    monkeypatch.setattr("app.tools.events.SEATGEEK_CLIENT_ID", "")
    with pytest.raises(ValueError, match="No events source configured"):
        events.search_events(area="Austin", date_range="2026-11-12")


def test_search_events_uses_ticketmaster_when_key_set(tool_db, monkeypatch):
    monkeypatch.setattr("app.tools.events.TICKETMASTER_API_KEY", "fake-key")

    def fake_get(url, params=None, timeout=None):
        return FakeResponse(
            {
                "_embedded": {
                    "events": [
                        {
                            "name": "Jazz Night",
                            "_embedded": {"venues": [{"name": "Blue Note"}]},
                            "dates": {"start": {"localDate": "2026-11-12"}},
                            "url": "https://ticketmaster.com/jazz-night",
                        }
                    ]
                }
            }
        )

    monkeypatch.setattr("httpx.get", fake_get)
    results = events.search_events(area="Austin", date_range="2026-11-12")
    assert results[0]["name"] == "Jazz Night"
    assert results[0]["source"] == "ticketmaster"
