import os
import re
from datetime import date, datetime, time, timedelta
from threading import RLock

from sqlalchemy import Engine


class DomainError(Exception):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


MUTATION_LOCK = RLock()


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).lower()


def clean_required(value: str, label: str, limit: int = 120) -> str:
    result = re.sub(r"\s+", " ", value.strip())
    if not result:
        raise DomainError(f"{label} es obligatorio.")
    if len(result) > limit:
        raise DomainError(f"{label} no puede superar {limit} caracteres.")
    return result


def as_local(value: datetime) -> datetime:
    return value.astimezone().replace(tzinfo=None) if value.tzinfo else value


def now_local() -> datetime:
    # A test-only override keeps API and seed data on the same controlled clock.
    test_now = os.getenv("PILATES_TEST_NOW")
    if test_now:
        return as_local(datetime.fromisoformat(test_now)).replace(microsecond=0)
    return datetime.now().replace(microsecond=0)


def to_iso(value: datetime) -> str:
    return as_local(value).isoformat()


def next_occurrences(weekday: int, start: date, days: int = 42) -> list[date]:
    return [start + timedelta(days=offset) for offset in range(days) if (start + timedelta(days=offset)).weekday() == weekday]


def parse_time(value: str) -> time:
    try:
        parsed = time.fromisoformat(value)
    except ValueError as exc:
        raise DomainError("El horario debe tener formato HH:MM.") from exc
    if parsed.second or parsed.microsecond or parsed.tzinfo:
        raise DomainError("El horario debe tener formato HH:MM.")
    return parsed


def assert_capacity(engine: Engine, session_id: int, *, conn=None) -> tuple[int, int]:
    from backend.app.services.sessions import occupancy

    return occupancy(engine, session_id, conn=conn)
