from contextlib import asynccontextmanager

from datetime import date, timedelta

from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.app.services import bookings, calendar, groups as group_service, sessions, students as student_service
from backend.app.services.common import DomainError, now_local
from backend.app.database import get_engine, upgrade_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    upgrade_database()
    yield
    get_engine().dispose()


app = FastAPI(title="Belén Pilates API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


class StudentInput(BaseModel):
    name: str
    phone: str | None = None
    groupIds: list[int] = Field(default_factory=list)


class WeeklyScheduleInput(BaseModel):
    weekday: int
    startTime: str
    durationMinutes: int | None = None


class GroupInput(BaseModel):
    name: str
    level: str
    modality: str
    weeklySchedule: list[WeeklyScheduleInput] | None = None
    weekday: int | None = None
    startTime: str | None = None
    recurrence: str = "Semanal"
    capacity: int
    studentIds: list[int] = Field(default_factory=list)


class AbsenceInput(BaseModel):
    studentId: int
    sessionId: int


class RecoveryInput(BaseModel):
    absenceId: int
    sessionId: int


class CalendarDayInput(BaseModel):
    isNonWorking: bool = True
    note: str | None = None


class ManualSessionInput(BaseModel):
    groupId: int
    startsAt: str


@app.exception_handler(DomainError)
async def domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "local"}


@app.get("/api/students")
def list_students(q: str = Query(default="", max_length=120), engine=Depends(get_engine)) -> list[dict]:
    return student_service.list_students(engine, q)


@app.post("/api/students", status_code=201)
def create_student(payload: StudentInput, engine=Depends(get_engine)) -> dict:
    return student_service.create_student(engine, payload.model_dump())


@app.get("/api/students/{student_id}")
def get_student(student_id: int, engine=Depends(get_engine)) -> dict:
    return student_service.get_student(engine, student_id)


@app.put("/api/students/{student_id}")
def update_student(student_id: int, payload: StudentInput, engine=Depends(get_engine)) -> dict:
    return student_service.update_student(engine, student_id, payload.model_dump())


@app.delete("/api/students/{student_id}", status_code=204)
def deactivate_student(student_id: int, engine=Depends(get_engine)) -> None:
    student_service.deactivate_student(engine, student_id)


@app.get("/api/groups")
def list_groups(engine=Depends(get_engine)) -> list[dict]:
    return group_service.list_groups(engine)


@app.post("/api/groups", status_code=201)
def create_group(payload: GroupInput, engine=Depends(get_engine)) -> dict:
    return group_service.create_group(engine, payload.model_dump())


@app.put("/api/groups/{group_id}")
def update_group(group_id: int, payload: GroupInput, engine=Depends(get_engine)) -> dict:
    return group_service.update_group(engine, group_id, payload.model_dump())


@app.get("/api/sessions")
def list_sessions(
    start: date | None = None,
    end: date | None = None,
    group_id: int | None = None,
    engine=Depends(get_engine),
) -> list[dict]:
    first = start or now_local().date()
    return sessions.list_sessions(engine, first, end or first, group_id)


@app.get("/api/sessions/{session_id}")
def get_session(session_id: int, engine=Depends(get_engine)) -> dict:
    return sessions.get_session(engine, session_id)


@app.get("/api/absences")
def list_absences(engine=Depends(get_engine)) -> list[dict]:
    return bookings.list_absences(engine)


@app.post("/api/absences", status_code=201)
def register_absence(payload: AbsenceInput, engine=Depends(get_engine)) -> dict:
    return bookings.register_absence(engine, payload.studentId, payload.sessionId)


@app.get("/api/absences/{absence_id}/recoveries")
def eligible_recoveries(absence_id: int, engine=Depends(get_engine)) -> list[dict]:
    return bookings.eligible_recoveries(engine, absence_id)


@app.post("/api/recoveries", status_code=201)
def book_recovery(payload: RecoveryInput, engine=Depends(get_engine)) -> dict:
    return bookings.book_recovery(engine, payload.absenceId, payload.sessionId)


@app.get("/api/calendar")
def list_calendar(
    start: date | None = None,
    end: date | None = None,
    engine=Depends(get_engine),
) -> dict:
    first = start or now_local().date()
    last = end or first + timedelta(days=35)
    return {"days": calendar.list_calendar(engine, first, last), "sessions": sessions.list_sessions(engine, first, last)}


@app.put("/api/calendar/days/{day}")
def set_calendar_day(day: date, payload: CalendarDayInput, engine=Depends(get_engine)) -> dict:
    return calendar.set_calendar_day(engine, day, payload.model_dump())


@app.post("/api/calendar/manual-sessions", status_code=201)
def enable_manual_session(payload: ManualSessionInput, engine=Depends(get_engine)) -> dict:
    return calendar.enable_manual_session(engine, payload.model_dump())
