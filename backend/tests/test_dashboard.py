from datetime import date

from app import crud
from app.dashboard import get_upcoming_dates
from app.models import FactExtraction, FactProposal, KeyDateCreate, KeyDateProposal


def test_upcoming_dates_sorted_and_filters_past_one_time_dates(tool_db, test_user_id):
    today = date(2026, 10, 25)

    maya = crud.create_person(test_user_id, "Maya", "partner", None)
    crud.create_key_date(maya.id, KeyDateCreate(label="Birthday", date="2020-11-12", recurring=True))

    sam = crud.create_person(test_user_id, "Sam", "friend", None)
    crud.create_key_date(sam.id, KeyDateCreate(label="Birthday", date="2020-11-08", recurring=True))
    # One-time date already in the past - should not appear.
    crud.create_key_date(sam.id, KeyDateCreate(label="Old anniversary", date="2020-01-01", recurring=False))

    result = get_upcoming_dates(test_user_id, today=today)

    assert [u.person_name for u in result] == ["Sam", "Maya"]
    assert result[0].label == "Birthday"
    assert result[0].days_until == 14
    assert result[1].days_until == 18
    assert all(u.label != "Old anniversary" for u in result)


def test_upcoming_dates_empty_when_no_people(tool_db, test_user_id):
    assert get_upcoming_dates(test_user_id, today=date(2026, 10, 25)) == []


def test_upcoming_dates_only_shows_the_requesting_users_people(tool_db, test_user_id):
    other_user = crud.create_user("Other", "other@example.com", "not-a-real-hash")
    other_person = crud.create_person(other_user.id, "Not Mine", "friend", None)
    crud.create_key_date(
        other_person.id, KeyDateCreate(label="Birthday", date="2020-11-12", recurring=True)
    )

    assert get_upcoming_dates(test_user_id, today=date(2026, 10, 25)) == []


def _make_person(client, name):
    return client.post("/people", json={"name": name, "relationship": "friend"}).json()


def test_quick_capture_routes_to_the_named_person(client, monkeypatch):
    maya = _make_person(client, "Maya Chen")
    _make_person(client, "Sam Rivera")

    extraction = FactExtraction(
        facts=[FactProposal(category="past_experience", value="graduated", sentiment="positive", confidence=0.9)],
        key_date=KeyDateProposal(label="Graduation", date="2026-11-08"),
    )
    monkeypatch.setattr("app.routers.dashboard.extract_facts", lambda text, **kwargs: extraction)

    res = client.post("/dashboard/capture", json={"text": "Maya graduated on 8th November"})
    assert res.status_code == 201
    body = res.json()
    assert body["person_id"] == maya["id"]
    assert body["person_name"] == "Maya Chen"
    assert body["proposed_key_date"] == {"label": "Graduation", "date": "2026-11-08"}
    assert len(body["proposed_facts"]) == 1

    # The note is saved against the resolved person, same as per-person capture.
    detail = client.get(f"/people/{maya['id']}").json()
    assert len(detail["notes"]) == 1


def test_quick_capture_ambiguous_without_a_name_asks_to_pick(client, monkeypatch):
    _make_person(client, "Maya Chen")
    _make_person(client, "Sam Rivera")
    monkeypatch.setattr(
        "app.routers.dashboard.extract_facts", lambda text, **kwargs: FactExtraction(facts=[])
    )

    res = client.post("/dashboard/capture", json={"text": "graduated on 8th November"})
    assert res.status_code == 422
    detail = res.json()["detail"]
    # No name recognized at all - no candidates, frontend falls back to the full list.
    assert detail["candidates"] == []
    assert "catch a name" in detail["message"].lower()


def test_quick_capture_ambiguous_with_multiple_matches_lists_them(client, monkeypatch):
    sam_r = _make_person(client, "Sam Rivera")
    sam_p = _make_person(client, "Sam Patel")
    monkeypatch.setattr(
        "app.routers.dashboard.extract_facts", lambda text, **kwargs: FactExtraction(facts=[])
    )

    res = client.post("/dashboard/capture", json={"text": "Sam said hi"})
    assert res.status_code == 422
    detail = res.json()["detail"]
    assert {c["id"] for c in detail["candidates"]} == {sam_r["id"], sam_p["id"]}
    assert "more than one" in detail["message"].lower()


def test_quick_capture_with_explicit_person_id_skips_matching(client, monkeypatch):
    maya = _make_person(client, "Maya Chen")
    _make_person(client, "Sam Rivera")
    monkeypatch.setattr(
        "app.routers.dashboard.extract_facts", lambda text, **kwargs: FactExtraction(facts=[])
    )

    res = client.post(
        "/dashboard/capture", json={"text": "graduated on 8th November", "person_id": maya["id"]}
    )
    assert res.status_code == 201
    assert res.json()["person_id"] == maya["id"]
