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


GEOCODE_RESPONSE = {"results": [{"name": "Austin", "country": "US", "latitude": 30.27, "longitude": -97.74}]}


def _fake_get_dispatcher(nominatim_response):
    """A fake httpx.get that routes to geocode's or Nominatim's shape
    based on the URL - both go through httpx.get, so a single mock has to
    tell them apart."""

    def fake_get(url, params=None, headers=None, timeout=None):
        if "nominatim" in url:
            return FakeResponse(nominatim_response)
        return FakeResponse(GEOCODE_RESPONSE)

    return fake_get


def test_search_places_uses_nominatim_without_key(tool_db, monkeypatch):
    monkeypatch.setattr("app.tools.places.GOOGLE_PLACES_API_KEY", "")
    monkeypatch.setattr("time.sleep", lambda *a: None)
    nominatim_results = [
        {
            "osm_type": "node",
            "osm_id": 1,
            "display_name": "Lavaca Street Bar, 405, Lavaca Street, Austin, Texas",
            "lat": "30.267",
            "lon": "-97.743",
        }
    ]
    monkeypatch.setattr("httpx.get", _fake_get_dispatcher(nominatim_results))
    results = places.search_places(query="craft beer taproom", area="Austin")
    assert results[0]["name"] == "Lavaca Street Bar"
    assert results[0]["source"] == "nominatim"
    assert results[0]["url"] == "https://www.google.com/maps/search/?api=1&query=30.267,-97.743"


def test_search_places_falls_back_to_overpass_when_nominatim_empty(tool_db, monkeypatch):
    monkeypatch.setattr("app.tools.places.GOOGLE_PLACES_API_KEY", "")
    monkeypatch.setattr("time.sleep", lambda *a: None)
    monkeypatch.setattr("httpx.get", _fake_get_dispatcher([]))  # Nominatim finds nothing
    monkeypatch.setattr(
        "httpx.post",
        lambda *a, **k: FakeResponse({"elements": [{"id": 1, "tags": {"name": "Clayworks"}}]}),
    )
    results = places.search_places(query="pottery studio", area="Austin")
    assert results[0]["name"] == "Clayworks"
    assert results[0]["source"] == "openstreetmap"


def test_search_places_raises_when_both_sources_fail(tool_db, monkeypatch):
    # If both free sources genuinely error (not just "no results"), the
    # failure must propagate rather than get cached as an empty result for
    # 24h - a transient outage shouldn't look like "nothing here" tomorrow.
    import httpx as httpx_module

    monkeypatch.setattr("app.tools.places.GOOGLE_PLACES_API_KEY", "")
    monkeypatch.setattr("time.sleep", lambda *a: None)

    def nominatim_get(url, params=None, headers=None, timeout=None):
        if "nominatim" in url:
            raise httpx_module.TimeoutException("timed out")
        return FakeResponse(GEOCODE_RESPONSE)

    def always_times_out(*a, **k):
        raise httpx_module.TimeoutException("timed out")

    monkeypatch.setattr("httpx.get", nominatim_get)
    monkeypatch.setattr("httpx.post", always_times_out)
    with pytest.raises(RuntimeError, match="Both place sources failed"):
        places.search_places(query="pottery studio", area="Austin")


def test_search_places_nominatim_retries_once_on_timeout(tool_db, monkeypatch):
    # The public Nominatim instance is occasionally flaky for a single
    # request - a transient timeout on the first attempt shouldn't sink
    # the whole search when a retry would have worked.
    import httpx as httpx_module

    monkeypatch.setattr("app.tools.places.GOOGLE_PLACES_API_KEY", "")
    monkeypatch.setattr("time.sleep", lambda *a: None)

    calls = {"n": 0}
    nominatim_results = [
        {
            "osm_type": "node",
            "osm_id": 1,
            "display_name": "Lavaca Street Bar, 405, Lavaca Street, Austin, Texas",
            "lat": "30.267",
            "lon": "-97.743",
        }
    ]

    def flaky_get(url, params=None, headers=None, timeout=None):
        if "nominatim" not in url:
            return FakeResponse(GEOCODE_RESPONSE)
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx_module.TimeoutException("timed out")
        return FakeResponse(nominatim_results)

    monkeypatch.setattr("httpx.get", flaky_get)
    # "museum" maps to a single category term, so there's exactly one
    # Nominatim request to retry (a multi-term query would make the call
    # count depend on how many terms it takes to reach 8 results).
    results = places.search_places(query="museum", area="Austin")
    assert calls["n"] == 2
    assert results[0]["name"] == "Lavaca Street Bar"


def test_nominatim_terms_for_uses_category_values_not_raw_query():
    # Pulls the tag *value* back out of the Overpass category map, since
    # Nominatim matches plain words like "bar", not OSM tag syntax.
    assert places._nominatim_terms_for("craft beer taproom") == ["bar", "pub"]
    assert places._nominatim_terms_for("vegetarian restaurant") == ["restaurant"]


def test_overpass_clauses_use_category_tags_not_just_name_match():
    # "craft beer taproom" doesn't literally appear in real business names,
    # so the query must search by OSM tag category (bar/pub/microbrewery),
    # not just regex the query string against the name field.
    clauses = places._overpass_clauses("craft beer taproom", 30.27, -97.74)
    joined = " ".join(clauses)
    assert '["amenity"="bar"]' in joined
    assert '["microbrewery"="yes"]' in joined
    # A loose name-regex clause is still included as a last-resort fallback.
    assert '["name"~"' in joined


def test_overpass_clauses_drops_stopwords_from_name_fallback():
    clauses = places._overpass_clauses("a nice place near the park", 30.27, -97.74)
    name_clause = next(c for c in clauses if '["name"~"' in c)
    assert "nice|place|near|park" not in name_clause  # stopwords excluded
    assert "park" in name_clause  # not a stopword, and matches the park category too
    assert '["leisure"="park"]' in " ".join(clauses)


def test_search_places_overpass_dedupes_and_skips_unnamed_elements(tool_db, monkeypatch):
    monkeypatch.setattr("app.tools.places.GOOGLE_PLACES_API_KEY", "")
    monkeypatch.setattr("time.sleep", lambda *a: None)
    monkeypatch.setattr("httpx.get", _fake_get_dispatcher([]))  # Nominatim finds nothing
    monkeypatch.setattr(
        "httpx.post",
        lambda *a, **k: FakeResponse(
            {
                "elements": [
                    {"id": 1, "tags": {"name": "Clayworks"}},
                    {"id": 1, "tags": {"name": "Clayworks"}},  # duplicate (two matched clauses)
                    {"id": 2, "tags": {}},  # no name tag - skipped
                ]
            }
        ),
    )
    results = places.search_places(query="pottery studio", area="Austin")
    assert len(results) == 1
    assert results[0]["name"] == "Clayworks"


def test_search_places_overpass_retries_once_on_timeout(tool_db, monkeypatch):
    import httpx as httpx_module

    monkeypatch.setattr("app.tools.places.GOOGLE_PLACES_API_KEY", "")
    monkeypatch.setattr("time.sleep", lambda *a: None)
    monkeypatch.setattr("httpx.get", _fake_get_dispatcher([]))  # Nominatim finds nothing

    calls = {"n": 0}

    def flaky_post(*a, **k):
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx_module.TimeoutException("timed out")
        return FakeResponse({"elements": [{"id": 1, "tags": {"name": "Clayworks"}}]})

    monkeypatch.setattr("httpx.post", flaky_post)
    results = places.search_places(query="pottery studio", area="Austin")
    assert calls["n"] == 2
    assert results[0]["name"] == "Clayworks"


def test_overpass_raises_after_every_mirror_times_out(tool_db, monkeypatch):
    # Unit-level: _search_places_overpass itself, not the search_places
    # wrapper (which gracefully falls back to an empty list rather than
    # raising once Nominatim has already succeeded, even with 0 results).
    import httpx as httpx_module

    monkeypatch.setattr("time.sleep", lambda *a: None)
    monkeypatch.setattr("httpx.get", _fake_get_dispatcher([]))

    def always_times_out(*a, **k):
        raise httpx_module.TimeoutException("timed out")

    monkeypatch.setattr("httpx.post", always_times_out)
    with pytest.raises(RuntimeError, match="Overpass search failed on every mirror"):
        places._search_places_overpass(query="pottery studio", area="Austin")


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
