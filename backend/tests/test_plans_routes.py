from app.models import CandidateSearchResult, PlanGenerateResult


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
