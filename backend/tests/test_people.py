from app import crud
from app.models import FactExtraction


def test_create_and_list_people(client):
    res = client.post("/people", json={"name": "Maya", "relationship": "partner", "home_city": "Austin"})
    assert res.status_code == 201
    person = res.json()
    assert person["name"] == "Maya"
    assert person["id"] > 0

    res = client.get("/people")
    assert res.status_code == 200
    assert [p["name"] for p in res.json()] == ["Maya"]


def test_get_person_detail_includes_empty_lists(client):
    person = client.post("/people", json={"name": "Sam", "relationship": "friend"}).json()

    res = client.get(f"/people/{person['id']}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["person"]["name"] == "Sam"
    assert detail["key_dates"] == []
    assert detail["notes"] == []
    assert detail["facts"] == []


def test_get_unknown_person_404s(client):
    res = client.get("/people/999")
    assert res.status_code == 404


def test_update_person(client):
    person = client.post("/people", json={"name": "Sam", "relationship": "friend"}).json()
    res = client.patch(f"/people/{person['id']}", json={"home_city": "Dallas"})
    assert res.status_code == 200
    assert res.json()["home_city"] == "Dallas"
    assert res.json()["name"] == "Sam"


def test_delete_person_cascades_key_dates_notes_and_facts(client, monkeypatch):
    person = client.post("/people", json={"name": "Sam", "relationship": "friend"}).json()
    client.post(f"/people/{person['id']}/key-dates", json={"label": "Birthday", "date": "2026-05-01", "recurring": True})

    monkeypatch.setattr("app.routers.notes.extract_facts", lambda text, **kwargs: FactExtraction(facts=[]))
    note = client.post(f"/people/{person['id']}/notes", json={"text": "likes hiking"}).json()["note"]
    client.post(f"/notes/{note['id']}/facts", json={"facts": [{"category": "like", "value": "hiking", "sentiment": "positive", "confidence": 1}]})

    assert client.delete(f"/people/{person['id']}").status_code == 204
    assert client.get(f"/people/{person['id']}").status_code == 404


def test_key_date_crud(client):
    person = client.post("/people", json={"name": "Sam", "relationship": "friend"}).json()

    res = client.post(
        f"/people/{person['id']}/key-dates",
        json={"label": "Anniversary", "date": "2026-06-15", "recurring": False},
    )
    assert res.status_code == 201
    key_date = res.json()
    assert key_date["recurring"] is False

    res = client.get(f"/people/{person['id']}/key-dates")
    assert len(res.json()) == 1

    assert client.delete(f"/key-dates/{key_date['id']}").status_code == 204
    assert client.delete(f"/key-dates/{key_date['id']}").status_code == 404


def test_match_people_by_text_matches_first_name(tool_db, test_user_id):
    maya = crud.create_person(test_user_id, "Maya Chen", "partner", None)
    crud.create_person(test_user_id, "Sam Rivera", "friend", None)

    matches = crud.match_people_by_text(test_user_id, "Maya graduated on 8th November")
    assert [p.id for p in matches] == [maya.id]


def test_match_people_by_text_whole_word_only(tool_db, test_user_id):
    crud.create_person(test_user_id, "Sam Rivera", "friend", None)

    # "Samantha" contains "Sam" as a substring but is not the same word.
    assert crud.match_people_by_text(test_user_id, "Samantha called today") == []


def test_match_people_by_text_ambiguous_returns_all_matches(tool_db, test_user_id):
    crud.create_person(test_user_id, "Sam Rivera", "friend", None)
    crud.create_person(test_user_id, "Sam Patel", "coworker", None)

    matches = crud.match_people_by_text(test_user_id, "Sam said hi")
    assert len(matches) == 2


def test_match_people_by_text_no_match_returns_empty(tool_db, test_user_id):
    crud.create_person(test_user_id, "Maya Chen", "partner", None)
    assert crud.match_people_by_text(test_user_id, "no one mentioned here") == []
