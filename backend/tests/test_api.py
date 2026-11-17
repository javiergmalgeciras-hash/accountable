from datetime import date, datetime, timedelta

from backend.app.services.sessions import get_session

from backend.app.seed import seed_data


def test_health_and_local_json_api(client):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "mode": "local"}
    student = client.post("/api/students", json={"name": "Irene Ejemplo", "phone": "", "groupIds": []})
    assert student.status_code == 201
    assert student.json()["phone"] is None
    assert client.get(f"/api/students/{student.json()['id']}").json()["name"] == "Irene Ejemplo"
    duplicate = client.post("/api/students", json={"name": " IRENE   EJEMPLO ", "groupIds": []})
    assert duplicate.status_code == 409
    assert "Ya existe" in duplicate.json()["detail"]


def test_api_lists_seeded_day_and_groups(client, engine):
    seed_data(engine)
    today = date.today().isoformat()
    agenda = client.get("/api/sessions", params={"start": today, "end": today})
    assert agenda.status_code == 200
    assert agenda.json()
    session = agenda.json()[0]
    assert {"occupancy", "freeSeats", "capacity", "group", "students", "absences", "recoveries"} <= session.keys()
    assert session["occupancy"] <= session["capacity"]
    groups = client.get("/api/groups").json()
    assert any(group["level"] and group["modality"] and group["recurrence"] for group in groups)


def test_api_rejects_absence_outside_notice_window(client, engine):
    seed_data(engine)
    start_day = date.today()
    end_day = start_day + timedelta(days=1)
    near_sessions = client.get("/api/sessions", params={"start": start_day.isoformat(), "end": end_day.isoformat()}).json()
    now = datetime.now()
    near = next(
        item for item in near_sessions
        if item["group"]["name"] == "Suelo intermedio"
        and not item["absences"]
        and timedelta() < datetime.fromisoformat(item["startsAt"]) - now < timedelta(hours=24)
    )
    student_id = near["students"][0]["id"]
    before = near["occupancy"]
    response = client.post("/api/absences", json={"studentId": student_id, "sessionId": near["id"]})
    assert response.status_code == 422
    assert "24 horas" in response.json()["detail"]
    assert get_session(engine, near["id"])["occupancy"] == before
