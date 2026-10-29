from app.models import FactExtraction, FactProposal


def _make_person(client):
    return client.post("/people", json={"name": "Maya", "relationship": "partner"}).json()


def test_capture_note_returns_proposed_facts_without_saving_them(client, monkeypatch):
    person = _make_person(client)

    proposals = FactExtraction(
        facts=[
            FactProposal(category="wishlist", value="try pottery", sentiment="positive", confidence=0.9),
            FactProposal(category="dislike", value="loud bars", sentiment="negative", confidence=0.85),
        ]
    )
    monkeypatch.setattr("app.routers.notes.extract_facts", lambda text, **kwargs: proposals)

    res = client.post(
        f"/people/{person['id']}/notes",
        json={"text": "Maya wants to try pottery, hates loud bars."},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["note"]["text"] == "Maya wants to try pottery, hates loud bars."
    assert len(body["proposed_facts"]) == 2

    # Proposed facts are NOT persisted until explicitly confirmed.
    detail = client.get(f"/people/{person['id']}").json()
    assert detail["facts"] == []
    assert len(detail["notes"]) == 1


def test_confirm_facts_persists_chosen_subset(client, monkeypatch):
    person = _make_person(client)
    monkeypatch.setattr("app.routers.notes.extract_facts", lambda text, **kwargs: FactExtraction(facts=[]))

    note = client.post(f"/people/{person['id']}/notes", json={"text": "note text"}).json()["note"]

    # User edited one chip and dropped another before saving.
    res = client.post(
        f"/notes/{note['id']}/facts",
        json={
            "facts": [
                {"category": "wishlist", "value": "pottery class", "sentiment": "positive", "confidence": 0.9}
            ]
        },
    )
    assert res.status_code == 201
    saved = res.json()
    assert len(saved) == 1
    assert saved[0]["confirmed"] is True
    assert saved[0]["note_id"] == note["id"]

    detail = client.get(f"/people/{person['id']}").json()
    assert len(detail["facts"]) == 1


def test_capture_note_saves_note_even_if_extraction_fails(client, monkeypatch):
    person = _make_person(client)

    def boom(text, **kwargs):
        raise ValueError("Nano did not return valid fact JSON: simulated failure")

    monkeypatch.setattr("app.routers.notes.extract_facts", boom)

    res = client.post(f"/people/{person['id']}/notes", json={"text": "a note"})
    assert res.status_code == 502

    # Note capture is not rolled back - the raw note is still the source of truth.
    detail = client.get(f"/people/{person['id']}").json()
    assert len(detail["notes"]) == 1
    assert detail["notes"][0]["text"] == "a note"


def test_delete_note_cascades_its_facts(client, monkeypatch):
    person = _make_person(client)
    monkeypatch.setattr("app.routers.notes.extract_facts", lambda text, **kwargs: FactExtraction(facts=[]))

    note = client.post(f"/people/{person['id']}/notes", json={"text": "note"}).json()["note"]
    client.post(
        f"/notes/{note['id']}/facts",
        json={"facts": [{"category": "like", "value": "tea", "sentiment": "positive", "confidence": 1}]},
    )

    assert client.delete(f"/notes/{note['id']}").status_code == 204

    detail = client.get(f"/people/{person['id']}").json()
    assert detail["notes"] == []
    assert detail["facts"] == []


def test_delete_fact(client, monkeypatch):
    person = _make_person(client)
    monkeypatch.setattr("app.routers.notes.extract_facts", lambda text, **kwargs: FactExtraction(facts=[]))
    note = client.post(f"/people/{person['id']}/notes", json={"text": "note"}).json()["note"]
    fact = client.post(
        f"/notes/{note['id']}/facts",
        json={"facts": [{"category": "like", "value": "tea", "sentiment": "positive", "confidence": 1}]},
    ).json()[0]

    assert client.delete(f"/facts/{fact['id']}").status_code == 204
    assert client.delete(f"/facts/{fact['id']}").status_code == 404
