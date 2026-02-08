from flask import Flask, jsonify, request

from config import Config
from logic.balancing import get_suggestions, simulate_balance_change
from logic.metrics import (
    get_compare_metrics,
    get_fairness_metrics,
    get_funnel_metrics,
    get_progression_metrics,
    get_stage_stats,
)
from logic.telemetry import validate_event


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.post("/auth/login")
    def login():
        body = request.get_json() or {}
        username = body.get("username", "")
        role = "designer" if username == "designer" else "player"
        return {"token": role, "role": role}

    @app.get("/me")
    def me():
        return {"user_id": "anonymous", "role": "player"}

    @app.post("/events")
    def ingest_event():
        body = request.get_json() or {}
        validation = validate_event(body)
        return {"accepted": validation["is_valid"], "anomalies": validation["anomalies"]}

    @app.get("/events")
    def list_events():
        return {"filters": request.args, "events": []}

    @app.get("/export/events.csv")
    def export_events():
        return "event_id,timestamp,event_type\n"

    @app.get("/metrics/funnel")
    def funnel():
        return get_funnel_metrics(request.args.get("config_id", "balanced"))

    @app.get("/metrics/stage-stats")
    def stage_stats():
        return get_stage_stats(request.args.get("config_id", "balanced"))

    @app.get("/metrics/progression")
    def progression():
        return get_progression_metrics(request.args.get("config_id", "balanced"))

    @app.get("/metrics/fairness")
    def fairness():
        segment = request.args.get("segment", "all")
        config_id = request.args.get("config_id", "balanced")
        return get_fairness_metrics(segment, config_id)

    @app.get("/metrics/compare")
    def compare():
        configs = request.args.getlist("config_id") or ["easy", "balanced", "hard"]
        return get_compare_metrics(configs)

    @app.get("/balancing/suggestions")
    def suggestions():
        config_id = request.args.get("config_id", "balanced")
        return get_suggestions(config_id)

    @app.post("/balancing/simulate")
    def simulate():
        payload = request.get_json() or {}
        return simulate_balance_change(payload)

    @app.get("/decisions")
    def list_decisions():
        return {"decisions": []}

    @app.post("/decisions")
    def create_decision():
        payload = request.get_json() or {}
        return {"created": True, "payload": payload}

    @app.post("/seed")
    def seed():
        return {"ok": True, "seed": 42}

    return app


if __name__ == "__main__":
    create_app().run(debug=True)
