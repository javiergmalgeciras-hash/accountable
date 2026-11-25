from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.database import make_engine, upgrade_database
from backend.app.main import app
from backend.app.database import get_engine

FIXED_NOW = datetime(2026, 11, 17, 12, 0)


@pytest.fixture(autouse=True)
def fixed_clock(monkeypatch: pytest.MonkeyPatch) -> datetime:
    monkeypatch.setenv("PILATES_TEST_NOW", FIXED_NOW.isoformat())
    return FIXED_NOW


@pytest.fixture
def db_url(tmp_path: Path) -> str:
    return f"sqlite:///{(tmp_path / 'test.sqlite').as_posix()}"


@pytest.fixture
def engine(db_url: str):
    upgrade_database(db_url)
    database = make_engine(db_url)
    yield database
    database.dispose()


@pytest.fixture
def client(engine, db_url: str, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("PILATES_DATABASE_URL", db_url)
    app.dependency_overrides[get_engine] = lambda: engine
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
