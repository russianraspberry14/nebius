from datetime import date

from app import crud, predraft
from app.models import CandidateSearchResult, KeyDateCreate, PlanGenerateResult


def _fake_generate(**kwargs):
    return PlanGenerateResult(
        options=[{"title": "Option A", "stops": [{"name": "Clayworks", "cited_fact_ids": []}]}]
    )


def test_predraft_creates_a_draft_plan_within_window(tool_db, test_user_id, monkeypatch):
    today = date(2026, 10, 25)
    maya = crud.create_person(test_user_id, "Maya", "partner", "Austin, TX")
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2020-11-12", recurring=True))

    monkeypatch.setattr(predraft, "run_candidate_search", lambda **kwargs: CandidateSearchResult())
    monkeypatch.setattr(predraft, "generate_plan_options", _fake_generate)

    outcomes = predraft.predraft_plans(test_user_id, today=today)

    assert len(outcomes) == 1
    assert outcomes[0].status == "drafted"
    plans = crud.list_plans(maya.id)
    assert len(plans) == 1
    assert plans[0].status == "draft"
    assert plans[0].stops[0].name == "Clayworks"


def test_predraft_skips_dates_outside_window(tool_db, test_user_id, monkeypatch):
    today = date(2026, 10, 25)
    maya = crud.create_person(test_user_id, "Maya", "partner", "Austin, TX")
    # 30 days out - outside the 21-day window.
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2020-11-24", recurring=True))

    monkeypatch.setattr(predraft, "run_candidate_search", lambda **kwargs: CandidateSearchResult())
    monkeypatch.setattr(predraft, "generate_plan_options", _fake_generate)

    outcomes = predraft.predraft_plans(test_user_id, today=today)
    assert outcomes == []
    assert crud.list_plans(maya.id) == []


def test_predraft_skips_when_a_plan_already_exists(tool_db, test_user_id, monkeypatch):
    today = date(2026, 10, 25)
    maya = crud.create_person(test_user_id, "Maya", "partner", "Austin, TX")
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2020-11-12", recurring=True))
    crud.create_plan(
        person_ids=[maya.id], occasion="Birthday", date="2026-11-12", area="Austin, TX",
        budget=None, stops=[], status="draft",
    )

    outcomes = predraft.predraft_plans(test_user_id, today=today)
    assert len(outcomes) == 1
    assert outcomes[0].status == "skipped"
    assert len(crud.list_plans(maya.id)) == 1  # no second plan created


def test_predraft_skips_person_without_home_city(tool_db, test_user_id):
    today = date(2026, 10, 25)
    maya = crud.create_person(test_user_id, "Maya", "partner", None)
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2020-11-12", recurring=True))

    outcomes = predraft.predraft_plans(test_user_id, today=today)
    assert len(outcomes) == 1
    assert outcomes[0].status == "skipped"
    assert "home city" in outcomes[0].detail


def test_predraft_records_error_without_crashing(tool_db, test_user_id, monkeypatch):
    today = date(2026, 10, 25)
    maya = crud.create_person(test_user_id, "Maya", "partner", "Austin, TX")
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2020-11-12", recurring=True))

    def boom(**kwargs):
        raise ValueError("No model ID configured for tier 'super'.")

    monkeypatch.setattr(predraft, "run_candidate_search", boom)

    outcomes = predraft.predraft_plans(test_user_id, today=today)
    assert len(outcomes) == 1
    assert outcomes[0].status == "error"
    assert crud.list_plans(maya.id) == []


def test_predraft_no_upcoming_dates_returns_empty(tool_db, test_user_id):
    assert predraft.predraft_plans(test_user_id, today=date(2026, 10, 25)) == []
