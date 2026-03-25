# Tests for CSV export endpoint.
import csv
import io
from app import create_app
from config import Config


def _make_client(tmp_path, monkeypatch):
    db_path = tmp_path / "test_export.db"
    monkeypatch.setattr(Config, "DB_PATH", str(db_path))
    app = create_app()
    return app.test_client()


# CSV export should return valid CSV with correct headers.
def test_csv_export_has_correct_headers(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/export/events.csv", headers={"X-Role": "designer"})
    assert resp.status_code == 200

    text = resp.data.decode("utf-8")
    reader = csv.reader(io.StringIO(text))
    headers = next(reader)
    assert headers == [
        "event_id", "timestamp", "event_type", "user_id",
        "session_id", "stage_id", "config_id", "payload_json",
    ]


# CSV export should contain seeded events.
def test_csv_export_contains_events(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get("/api/export/events.csv", headers={"X-Role": "designer"})
    text = resp.data.decode("utf-8")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    # Header + at least some seeded events
    assert len(rows) > 100


# CSV export with config_id filter should only return matching events.
def test_csv_export_filters_by_config(tmp_path, monkeypatch):
    client = _make_client(tmp_path, monkeypatch)
    resp = client.get(
        "/api/export/events.csv?config_id=easy",
        headers={"X-Role": "designer"},
    )
    text = resp.data.decode("utf-8")
    reader = csv.reader(io.StringIO(text))
    headers = next(reader)
    config_idx = headers.index("config_id")
    for row in reader:
        assert row[config_idx] == "easy"
