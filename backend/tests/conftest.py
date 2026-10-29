import pytest
from fastapi.testclient import TestClient

from app import db as db_module

TEST_EMAIL = "kindred-test@example.com"
TEST_PASSWORD = "testpassword123"


@pytest.fixture()
def raw_client(tmp_path, monkeypatch):
    """A TestClient backed by a fresh, throwaway SQLite file per test, with no
    auth header attached - for testing signup/login themselves, 401 behavior,
    and cross-user isolation (sign up a second user against the same client).
    """
    monkeypatch.setattr(db_module, "DB_PATH", tmp_path / "test.db")

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def client(raw_client):
    """Same as raw_client, but pre-authenticated as a throwaway test user -
    the default for any test that isn't specifically about auth itself."""
    res = raw_client.post("/auth/signup", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert res.status_code == 201, res.text
    token = res.json()["access_token"]
    raw_client.headers["Authorization"] = f"Bearer {token}"
    return raw_client


@pytest.fixture()
def tool_db(tmp_path, monkeypatch):
    """A fresh, throwaway SQLite file with the schema loaded, no HTTP app involved.

    For tests that exercise the tool cache / tool functions directly.
    """
    monkeypatch.setattr(db_module, "DB_PATH", tmp_path / "tools-test.db")
    db_module.init_db()
    yield


@pytest.fixture()
def test_user_id(tool_db):
    """A real user row in the tool_db database, for crud-level tests that need
    an owning user_id but don't go through the HTTP client."""
    from app import crud

    user = crud.create_user(TEST_EMAIL, "not-a-real-hash")
    return user.id
