# Tests that ingestion stores valid events.
# Ensures payloads are persisted to DB.
from app import create_app
from config import Config
from data.db import get_connection


# Ingestion should store a valid event.
def test_event_ingestion_stores_event(tmp_path, monkeypatch):
    db_path = tmp_path / "test_ingestion.db"
    # Point Config to temp DB for isolation.
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))

    app = create_app()
    client = app.test_client()

    # Minimal valid stage_start payload.
    payload = {
        "event_id": "test_ev_001",
        "timestamp": "2026-02-12T12:00:00Z",
        "event_type": "stage_start",
        "user_id": "u_test",
        "session_id": "s_test",
        "stage_id": 1,
        "config_id": "balanced",
        "payload": {
            "timer_seconds": 30,
            "move_limit": 12,
            "card_count": 8,
            "token_start": 0,
        },
    }

    response = client.post("/api/events", json=payload)
    assert response.status_code == 201

    with get_connection() as conn:
        row = conn.execute(
            "SELECT event_id, is_valid FROM events WHERE event_id = ?",
            ("test_ev_001",),
        ).fetchone()

    assert row is not None
    assert row["is_valid"] == 1


# Ingestion should store anomalies for invalid events.
def test_event_ingestion_records_anomalies(tmp_path, monkeypatch):
    db_path = tmp_path / "test_ingestion_invalid.db"
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))

    app = create_app()
    client = app.test_client()

    # Missing required payload fields for stage_start.
    payload = {
        "event_id": "test_ev_bad_001",
        "timestamp": "2026-02-12T12:00:00Z",
        "event_type": "stage_start",
        "user_id": "u_test",
        "session_id": "s_test",
        "stage_id": 1,
        "config_id": "balanced",
        "payload": {},
    }

    response = client.post("/api/events", json=payload)
    assert response.status_code == 201
    body = response.get_json()
    assert body["stored"] is True
    assert body["is_valid"] is False
    assert len(body["anomalies"]) >= 1

    with get_connection() as conn:
        anomaly_count = conn.execute(
            "SELECT COUNT(*) as c FROM anomalies WHERE event_id = ?", ("test_ev_bad_001",)
        ).fetchone()["c"]

    assert anomaly_count >= 1
