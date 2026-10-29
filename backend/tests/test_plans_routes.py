from datetime import date, timedelta

from app.models import CandidateSearchResult, PlanChatSlots, PlanGenerateResult


def _make_person(client, name="Maya"):
    return client.post("/people", json={"name": name, "relationship": "partner"}).json()


def test_generate_plan_returns_grounded_options(client, monkeypatch):
    person = _make_person(client)

    monkeypatch.setattr(
        "app.routers.plans.run_candidate_search",
        lambda **kwargs: CandidateSearchResult(),
    )
    monkeypatch.setattr(
        "app.routers.plans.generate_plan_options",
        lambda **kwargs: PlanGenerateResult(
            options=[{"title": "Option A", "stops": [{"name": "Clayworks", "cited_fact_ids": []}]}]
        ),
    )

    res = client.post(
        "/plans/generate",
        json={
            "person_ids": [person["id"]],
            "occasion": "birthday",
            "date": "2026-11-12",
            "area": "Austin",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["options"][0]["title"] == "Option A"


def test_generate_plan_404s_for_unknown_person(client):
    res = client.post(
        "/plans/generate",
        json={"person_ids": [999], "occasion": "birthday", "date": "2026-11-12", "area": "Austin"},
    )
    assert res.status_code == 404


def test_save_and_list_plan(client):
    person = _make_person(client)

    res = client.post(
        "/plans",
        json={
            "person_ids": [person["id"]],
            "occasion": "birthday",
            "date": "2026-11-12",
            "area": "Austin",
            "budget": "$$",
            "stops": [
                {
                    "name": "Clayworks",
                    "time": "2pm",
                    "url": "https://real.example/clayworks",
                    "cost_estimate": "$40",
                    "cited_fact_ids": [],
                    "why": "She wants to try pottery.",
                }
            ],
        },
    )
    assert res.status_code == 201
    saved = res.json()
    assert saved["status"] == "saved"
    assert saved["person_ids"] == [person["id"]]
    assert saved["stops"][0]["name"] == "Clayworks"

    res = client.get(f"/people/{person['id']}/plans")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_upcoming_plans_returns_future_plans_with_person_names(client):
    person = _make_person(client, "Maya")
    future = (date.today() + timedelta(days=5)).isoformat()
    past = (date.today() - timedelta(days=5)).isoformat()

    client.post(
        "/plans",
        json={
            "person_ids": [person["id"]],
            "occasion": "birthday",
            "date": future,
            "stops": [{"name": "Clayworks", "cited_fact_ids": []}],
        },
    )
    client.post(
        "/plans",
        json={
            "person_ids": [person["id"]],
            "occasion": "old outing",
            "date": past,
            "stops": [{"name": "Somewhere", "cited_fact_ids": []}],
        },
    )

    res = client.get("/plans/upcoming")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1  # the past-dated plan is excluded
    assert body[0]["occasion"] == "birthday"
    assert body[0]["person_names"] == ["Maya"]


def test_upcoming_plans_isolated_between_users(client, raw_client):
    person = _make_person(client, "Maya")
    future = (date.today() + timedelta(days=5)).isoformat()
    client.post(
        "/plans",
        json={
            "person_ids": [person["id"]],
            "occasion": "birthday",
            "date": future,
            "stops": [{"name": "Clayworks", "cited_fact_ids": []}],
        },
    )

    signup = raw_client.post(
        "/auth/signup",
        json={"name": "Other", "email": "upcoming-other@example.com", "password": "correcthorse123"},
    )
    other_headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    res = raw_client.get("/plans/upcoming", headers=other_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_revise_stop_returns_grounded_replacement(client, monkeypatch):
    person = _make_person(client)

    monkeypatch.setattr(
        "app.routers.plans.run_candidate_search",
        lambda **kwargs: CandidateSearchResult(),
    )
    monkeypatch.setattr(
        "app.routers.plans.revise_stop",
        lambda **kwargs: {"name": "Cheap Eats", "cited_fact_ids": []},
    )

    res = client.post(
        "/plans/revise-stop",
        json={
            "person_ids": [person["id"]],
            "occasion": "birthday",
            "date": "2026-11-12",
            "area": "Austin",
            "stops": [
                {"name": "Fancy Bistro", "cited_fact_ids": []},
                {"name": "Clayworks", "cited_fact_ids": []},
            ],
            "stop_index": 0,
            "instruction": "swap dinner for something cheaper",
        },
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Cheap Eats"


def test_revise_stop_out_of_range_index_400s(client):
    person = _make_person(client)
    res = client.post(
        "/plans/revise-stop",
        json={
            "person_ids": [person["id"]],
            "occasion": "birthday",
            "date": "2026-11-12",
            "area": "Austin",
            "stops": [{"name": "Only Stop", "cited_fact_ids": []}],
            "stop_index": 5,
            "instruction": "anything",
        },
    )
    assert res.status_code == 400


def test_revise_stop_404s_for_unknown_person(client):
    res = client.post(
        "/plans/revise-stop",
        json={
            "person_ids": [999],
            "occasion": "birthday",
            "date": "2026-11-12",
            "area": "Austin",
            "stops": [{"name": "X", "cited_fact_ids": []}],
            "stop_index": 0,
            "instruction": "anything",
        },
    )
    assert res.status_code == 404


def test_save_plan_404s_for_unknown_person(client):
    res = client.post(
        "/plans",
        json={
            "person_ids": [999],
            "occasion": "birthday",
            "date": "2026-11-12",
            "stops": [{"name": "X", "cited_fact_ids": []}],
        },
    )
    assert res.status_code == 404


def test_plan_chat_asks_for_missing_slots(client, monkeypatch):
    _make_person(client, "Maya")
    monkeypatch.setattr(
        "app.routers.plans.parse_plan_slots",
        lambda text, known, **kwargs: PlanChatSlots(occasion="dinner date"),
    )

    res = client.post("/plans/chat", json={"text": "plan a dinner date for me and Maya"})
    assert res.status_code == 200
    body = res.json()
    assert body["ready"] is False
    assert set(body["missing"]) == {"date", "area"}
    assert body["slots"]["occasion"] == "dinner date"
    assert "area" in body["reply"].lower() or "day" in body["reply"].lower()


def test_plan_chat_generates_once_slots_are_complete(client, monkeypatch):
    maya = _make_person(client, "Maya")
    monkeypatch.setattr(
        "app.routers.plans.parse_plan_slots",
        lambda text, known, **kwargs: PlanChatSlots(date="2026-11-14", area="Austin"),
    )
    monkeypatch.setattr(
        "app.routers.plans.run_candidate_search", lambda **kwargs: CandidateSearchResult()
    )
    monkeypatch.setattr(
        "app.routers.plans.generate_plan_options",
        lambda **kwargs: PlanGenerateResult(
            options=[{"title": "Cozy night", "stops": [{"name": "Clayworks", "cited_fact_ids": []}]}]
        ),
    )

    res = client.post(
        "/plans/chat",
        json={
            "text": "Saturday evening, somewhere in Austin",
            "person_id": maya["id"],
            "slots": {"occasion": "dinner date"},
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["ready"] is True
    assert body["person_id"] == maya["id"]
    assert len(body["options"]) == 1
    assert body["options"][0]["title"] == "Cozy night"


def test_plan_chat_ambiguous_without_a_name(client, monkeypatch):
    _make_person(client, "Maya Chen")
    _make_person(client, "Sam Rivera")

    res = client.post("/plans/chat", json={"text": "plan a dinner date"})
    assert res.status_code == 422
    detail = res.json()["detail"]
    assert detail["candidates"] == []


def test_plan_chat_with_explicit_person_id_skips_matching(client, monkeypatch):
    maya = _make_person(client, "Maya Chen")
    monkeypatch.setattr(
        "app.routers.plans.parse_plan_slots",
        lambda text, known, **kwargs: PlanChatSlots(),
    )

    res = client.post(
        "/plans/chat", json={"text": "plan something", "person_id": maya["id"]}
    )
    assert res.status_code == 200
    assert res.json()["person_id"] == maya["id"]


def test_dashboard_upcoming_dates(client):
    person = _make_person(client)
    client.post(
        f"/people/{person['id']}/key-dates",
        json={"label": "Birthday", "date": "2020-11-12", "recurring": True},
    )
    res = client.get("/dashboard/upcoming-dates")
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 1
    assert body[0]["person_name"] == "Maya"
    assert body[0]["label"] == "Birthday"
    assert body[0]["days_until"] >= 0
