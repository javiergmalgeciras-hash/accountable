import os
from pathlib import Path
from threading import Lock

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, event

_engine: Engine | None = None
_engine_url: str | None = None
_migration_lock = Lock()


def database_url() -> str:
    url = os.environ.get("PILATES_DATABASE_URL", "sqlite:///./data/pilates.db")
    if not url.startswith("sqlite:"):
        raise ValueError("El MVP local solo admite una base SQLite.")
    return url


def make_engine(url: str) -> Engine:
    if not url.startswith("sqlite:"):
        raise ValueError("El MVP local solo admite una base SQLite.")
    engine = create_engine(url, connect_args={"check_same_thread": False, "timeout": 30})

    @event.listens_for(engine, "connect")
    def enable_sqlite_constraints(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

    return engine


def get_engine() -> Engine:
    global _engine, _engine_url
    url = database_url()
    if _engine is None or _engine_url != url:
        if _engine is not None:
            _engine.dispose()
        _engine = make_engine(url)
        _engine_url = url
    return _engine


def upgrade_database(url: str | None = None) -> None:
    chosen_url = url or database_url()
    if not chosen_url.startswith("sqlite:"):
        raise ValueError("El MVP local solo admite una base SQLite.")
    if chosen_url.startswith("sqlite:///./"):
        Path(chosen_url.removeprefix("sqlite:///./")).parent.mkdir(parents=True, exist_ok=True)
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", chosen_url.replace("%", "%%"))
    with _migration_lock:
        command.upgrade(config, "head")
