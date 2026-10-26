from types import SimpleNamespace

import pytest

from app import planner
from app.models import CandidateSearchResult, FactOut, PlanGenerateResult


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

    grounded = planner._ground_plan(result, known_fact_ids={1, 2}, known_urls={"https://real.example/clayworks"})

    assert grounded.options[0].stops[0].cited_fact_ids == [1]
    assert grounded.options[0].stops[0].url == "https://real.example/clayworks"
    assert grounded.options[0].stops[1].url is None  # not a known candidate url
    assert grounded.options[0].stops[1].cited_fact_ids == [1]


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
