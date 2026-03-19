from app import create_app
from config import Config


def _post_event(client, payload):
    response = client.post("/api/events", json=payload)
    assert response.status_code == 201


def test_simulation_route_returns_result_for_requested_stage(tmp_path, monkeypatch):
    db_path = tmp_path / "test_balancing.db"
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))

    app = create_app()
    client = app.test_client()

    for idx in range(10):
        _post_event(
            client,
            {
                "event_id": f"sim_start_{idx}",
                "timestamp": f"2026-03-01T12:0{idx}:00Z",
                "event_type": "stage_start",
                "user_id": f"u{idx}",
                "session_id": f"s{idx}",
                "stage_id": 2,
                "config_id": "balanced",
                "payload": {
                    "timer_seconds": 60,
                    "move_limit": 20,
                    "card_count": 10,
                    "token_start": 5,
                },
            },
        )
        _post_event(
            client,
            {
                "event_id": f"sim_fail_{idx}",
                "timestamp": f"2026-03-01T12:1{idx}:00Z",
                "event_type": "stage_fail",
                "user_id": f"u{idx}",
                "session_id": f"s{idx}",
                "stage_id": 2,
                "config_id": "balanced",
                "payload": {
                    "fail_reason": "time",
                    "time_remaining": -2,
                    "moves_remaining": 4,
                    "tokens_earned": 0,
                    "tokens_spent": 0,
                },
            },
        )

    response = client.post(
        "/api/balancing/simulate",
        json={
            "config_id": "balanced",
            "changes": [
                {
                    "stage_id": 2,
                    "timer_seconds_delta": 10,
                    "move_limit_delta": 0,
                }
            ],
        },
        headers={"X-Role": "designer"},
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["config_id"] == "balanced"
    assert len(body["results"]) == 1
    assert body["results"][0]["stage_id"] == 2
    assert body["results"][0]["after"]["completion_rate"] > body["results"][0]["before"]["completion_rate"]
    assert len(body["results"][0]["notes"]) >= 1

