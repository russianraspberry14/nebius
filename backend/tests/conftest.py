import pytest
from fastapi.testclient import TestClient

from app import db as db_module


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """A TestClient backed by a fresh, throwaway SQLite file per test."""
    monkeypatch.setattr(db_module, "DB_PATH", tmp_path / "test.db")

    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture()
def tool_db(tmp_path, monkeypatch):
    """A fresh, throwaway SQLite file with the schema loaded, no HTTP app involved.

    For tests that exercise the tool cache / tool functions directly.
    """
    monkeypatch.setattr(db_module, "DB_PATH", tmp_path / "tools-test.db")
    db_module.init_db()
    yield
