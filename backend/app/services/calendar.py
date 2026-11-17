from datetime import date, datetime

from sqlalchemy import insert, select, update

from backend.app.services.common import MUTATION_LOCK, DomainError
from backend.app.services.groups import _make_session
from backend.app.services.sessions import _detail
from backend.app.tables import calendar_days, groups, sessions


def list_calendar(engine, start: date, end: date) -> list[dict]:
    if end < start or (end - start).days > 366:
        raise DomainError("El rango del calendario no es válido.")
    with engine.connect() as conn:
        rows = conn.execute(select(calendar_days).where(calendar_days.c.day >= start, calendar_days.c.day <= end).order_by(calendar_days.c.day)).mappings().all()
        return [{"date": row.day.isoformat(), "isNonWorking": row.is_non_working, "note": row.note} for row in rows]


def set_calendar_day(engine, day: date, payload: dict) -> dict:
    non_working = payload.get("isNonWorking", True)
    note = (payload.get("note") or "").strip() or None
    if note and len(note) > 200:
        raise DomainError("La nota no puede superar 200 caracteres.")
    with MUTATION_LOCK, engine.begin() as conn:
        existing = conn.execute(select(calendar_days.c.id).where(calendar_days.c.day == day)).first()
        if existing:
            conn.execute(update(calendar_days).where(calendar_days.c.id == existing.id).values(is_non_working=non_working, note=note))
        else:
            conn.execute(insert(calendar_days).values(day=day, is_non_working=non_working, note=note))
    return {"date": day.isoformat(), "isNonWorking": non_working, "note": note}


def enable_manual_session(engine, payload: dict) -> dict:
    group_id = payload.get("groupId")
    try:
        starts_at = datetime.fromisoformat(payload["startsAt"].replace("Z", "+00:00"))
        starts_at = starts_at.astimezone().replace(tzinfo=None) if starts_at.tzinfo else starts_at
    except (KeyError, ValueError) as exc:
        raise DomainError("Indica una fecha y hora válidas para la sesión.") from exc
    if starts_at.minute not in (0, 30) or starts_at.second or starts_at.microsecond:
        raise DomainError("El horario de la sesión debe terminar en :00 o :30.")
    with MUTATION_LOCK, engine.begin() as conn:
        day = conn.execute(select(calendar_days).where(calendar_days.c.day == starts_at.date())).mappings().first()
        if not day or not day.is_non_working:
            raise DomainError("Marca primero esta fecha como día no lectivo.", 409)
        group_row = conn.execute(select(groups).where(groups.c.id == group_id, groups.c.active.is_(True))).mappings().first()
        if not group_row:
            raise DomainError("No se encontró el grupo.", 404)
        if conn.execute(select(sessions.c.id).where(sessions.c.group_id == group_id, sessions.c.starts_at == starts_at)).first():
            raise DomainError("Ya existe una sesión de este grupo en esa fecha y hora.", 409)
        session_id = _make_session(conn, group_id, starts_at, group_row.capacity, manual=True)
    with engine.connect() as conn:
        return _detail(conn, session_id)
