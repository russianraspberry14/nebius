from types import SimpleNamespace

import pytest

from app import planner
from app.models import CandidateSearchResult, FactOut, PlanGenerateResult, PlanStop, StopReviseResult


def _fact(id, value="pottery"):
    return FactOut(
        id=id, person_id=1, note_id=1, category="wishlist", value=value,
        sentiment="positive", confidence=0.9, confirmed=True,
    )


def test_ground_plan_strips_unknown_fact_ids_and_urls():
    result = PlanGenerateResult.model_validate(
        {
            "options": [
                {
                    "title": "Option A",
                    "stops": [
                        {
                            "name": "Clayworks",
                            "url": "https://real.example/clayworks",
                            "cited_fact_ids": [1, 999],
                        },
                        {
                            "name": "Made-up Place",
                            "url": "https://invented.example/nope",
                            "cited_fact_ids": [1],
                        },
                    ],
                }
            ]
        }
    )

    grounded = planner._ground_plan(
        result,
        known_fact_ids={1, 2},
        known_urls={"https://real.example/clayworks"},
        known_names={"clayworks"},
    )

    assert grounded.options[0].stops[0].cited_fact_ids == [1]
    assert grounded.options[0].stops[0].url == "https://real.example/clayworks"
    assert grounded.options[0].stops[0].verified is True
    assert grounded.options[0].stops[1].url is None  # not a known candidate url
    assert grounded.options[0].stops[1].cited_fact_ids == [1]
    assert grounded.options[0].stops[1].verified is False  # name doesn't match any real candidate


def test_ground_stop_verifies_by_name_even_when_url_is_mistyped():
    # Our urls are long lat/lon strings a reasoning model can mangle while
    # copying - a stop shouldn't lose its "verified" status just because
    # the url came back slightly wrong when the name is an exact match.
    stop = PlanStop(
        name="Clayworks",
        url="https://www.google.com/maps/search/?api=1&query=30.1,-97.1",  # one digit off
        cited_fact_ids=[],
    )

    grounded = planner._ground_stop(
        stop,
        known_fact_ids=set(),
        known_urls={"https://www.google.com/maps/search/?api=1&query=30.100001,-97.1"},
        known_names={"clayworks"},
    )

    assert grounded.verified is True
    assert grounded.url is None  # the mismatched url is still dropped


def test_short_address_drops_redundant_name_and_trailing_boilerplate():
    # Real Nominatim display_names repeat the venue name, then tack on
    # county/state/zip/country - none of which helps Ultra pick a stop, and
    # all of which is completion-budget it isn't spending on copying the
    # name/url right.
    address = (
        "La Ferme Restaurant, 7101, Brookville Road, Chevy Chase, "
        "Montgomery County, Maryland, 20815, United States"
    )
    assert planner._short_address(address, "La Ferme Restaurant") == "7101, Brookville Road, Chevy Chase"
    assert planner._short_address(None, "Anywhere") == "no address"


def test_generate_plan_options_without_ultra_model_id_raises(monkeypatch):
    monkeypatch.setattr(planner, "ULTRA_MODEL_ID", "")
    monkeypatch.setattr(planner, "get_client", lambda: SimpleNamespace())
    with pytest.raises(ValueError, match="No model ID configured"):
        planner.generate_plan_options(
            people_facts={"Maya": [_fact(1)]},
            candidates=CandidateSearchResult(),
            past_stop_names=[],
            occasion="birthday",
            date="2026-11-12",
            area="Austin",
        )


def test_generate_plan_options_parses_and_grounds_response(monkeypatch):
    monkeypatch.setattr(planner, "ULTRA_MODEL_ID", "fake-ultra-model")

    raw = PlanGenerateResult(
        options=[
            {
                "title": "Cozy afternoon",
                "stops": [
                    {
                        "name": "Clayworks",
                        "url": "https://real.example/clayworks",
                        "cited_fact_ids": [1, 42],
                        "why": "She wants to try pottery.",
                    }
                ],
            }
        ]
    ).model_dump_json()

    class FakeCompletions:
        def create(self, **kwargs):
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=raw))])

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(planner, "get_client", lambda: fake_client)

    candidates = CandidateSearchResult(
        places=[{"name": "Clayworks", "url": "https://real.example/clayworks", "source": "test"}]
    )
    result = planner.generate_plan_options(
        people_facts={"Maya": [_fact(1, "try a pottery class")]},
        candidates=candidates,
        past_stop_names=["Some Old Place"],
        occasion="birthday",
        date="2026-11-12",
        area="Austin",
    )
    assert result.options[0].stops[0].cited_fact_ids == [1]  # 42 was never a real fact id
    assert result.options[0].stops[0].url == "https://real.example/clayworks"


def test_revise_stop_without_super_model_id_raises(monkeypatch):
    monkeypatch.setattr(planner, "SUPER_MODEL_ID", "")
    monkeypatch.setattr(planner, "get_client", lambda: SimpleNamespace())
    with pytest.raises(ValueError, match="No model ID configured"):
        planner.revise_stop(
            people_facts={"Maya": [_fact(1)]},
            candidates=CandidateSearchResult(),
            other_stops=[],
            past_stop_names=[],
            stop_to_revise=PlanStop(name="Old Place", cited_fact_ids=[]),
            instruction="make it cheaper",
            occasion="birthday",
            date="2026-11-12",
            area="Austin",
        )


def test_revise_stop_parses_and_grounds_response(monkeypatch):
    monkeypatch.setattr(planner, "SUPER_MODEL_ID", "fake-super-model")

    raw = StopReviseResult(
        stop={
            "name": "Cheap Eats Diner",
            "url": "https://real.example/cheap-eats",
            "cited_fact_ids": [1, 999],
            "why": "Budget-friendly as asked.",
        }
    ).model_dump_json()

    calls = []

    class FakeCompletions:
        def create(self, **kwargs):
            calls.append(kwargs)
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=raw))])

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=FakeCompletions()))
    monkeypatch.setattr(planner, "get_client", lambda: fake_client)

    candidates = CandidateSearchResult(
        places=[{"name": "Cheap Eats Diner", "url": "https://real.example/cheap-eats", "source": "test"}]
    )
    new_stop = planner.revise_stop(
        people_facts={"Maya": [_fact(1, "vegetarian")]},
        candidates=candidates,
        other_stops=[PlanStop(name="Clayworks", cited_fact_ids=[])],
        past_stop_names=["Some Old Place"],
        stop_to_revise=PlanStop(name="Fancy Bistro", url="https://real.example/fancy", cited_fact_ids=[1]),
        instruction="swap dinner for something cheaper",
        occasion="birthday",
        date="2026-11-12",
        area="Austin",
    )
    assert new_stop.name == "Cheap Eats Diner"
    assert new_stop.cited_fact_ids == [1]  # 999 was never a real fact id
    assert new_stop.url == "https://real.example/cheap-eats"
    # The instruction and the other stop's name reached the model.
    sent = calls[0]["messages"][1]["content"]
    assert "swap dinner for something cheaper" in sent
    assert "Clayworks" in sent
