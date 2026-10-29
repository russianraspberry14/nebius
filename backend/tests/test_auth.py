def test_signup_then_me(raw_client):
    res = raw_client.post(
        "/auth/signup", json={"email": "new@example.com", "password": "correcthorse123"}
    )
    assert res.status_code == 201
    body = res.json()
    assert body["user"]["email"] == "new@example.com"
    assert "hashed_password" not in body["user"]
    token = body["access_token"]

    res = raw_client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "new@example.com"


def test_signup_duplicate_email_rejected(raw_client):
    raw_client.post("/auth/signup", json={"email": "dup@example.com", "password": "correcthorse123"})
    res = raw_client.post("/auth/signup", json={"email": "dup@example.com", "password": "somethingelse"})
    assert res.status_code == 409


def test_signup_short_password_rejected(raw_client):
    res = raw_client.post("/auth/signup", json={"email": "short@example.com", "password": "short"})
    assert res.status_code == 422


def test_login_success(raw_client):
    raw_client.post("/auth/signup", json={"email": "login@example.com", "password": "correcthorse123"})
    res = raw_client.post("/auth/login", json={"email": "login@example.com", "password": "correcthorse123"})
    assert res.status_code == 200
    assert res.json()["token_type"] == "bearer"


def test_login_wrong_password_rejected(raw_client):
    raw_client.post("/auth/signup", json={"email": "wrongpw@example.com", "password": "correcthorse123"})
    res = raw_client.post("/auth/login", json={"email": "wrongpw@example.com", "password": "nope"})
    assert res.status_code == 401


def test_login_unknown_email_rejected(raw_client):
    res = raw_client.post("/auth/login", json={"email": "ghost@example.com", "password": "whatever123"})
    assert res.status_code == 401


def test_protected_route_without_token_401s(raw_client):
    assert raw_client.get("/people").status_code == 401


def test_protected_route_with_garbage_token_401s(raw_client):
    res = raw_client.get("/people", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401


def test_people_are_isolated_between_users(client, raw_client):
    # `client` is already signed in as one user; sign up a second, separate user.
    person = client.post("/people", json={"name": "Mine", "relationship": "friend"}).json()

    signup = raw_client.post(
        "/auth/signup", json={"email": "other-user@example.com", "password": "correcthorse123"}
    )
    other_token = signup.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # The second user can't see the first user's person...
    res = raw_client.get("/people", headers=other_headers)
    assert res.status_code == 200
    assert res.json() == []

    # ...can't fetch it directly by id...
    res = raw_client.get(f"/people/{person['id']}", headers=other_headers)
    assert res.status_code == 404

    # ...and can't delete it either.
    res = raw_client.delete(f"/people/{person['id']}", headers=other_headers)
    assert res.status_code == 404

    # It's still there for its actual owner.
    assert client.get(f"/people/{person['id']}").status_code == 200
