import csv
import io
import json
import uuid
from datetime import datetime

from flask import Flask, jsonify, request

from config import Config
from data.db import get_connection, init_db
from logic.balancing import get_suggestions, simulate_balance_change
from logic.metrics import (
    get_compare_metrics,
    get_fairness_metrics,
    get_funnel_metrics,
    get_progression_metrics,
    get_stage_stats,
)
from logic.telemetry import validate_event
from models import ConfigId, EventType


# Build a standard error response with the same JSON shape everywhere.
def _error_response(message: str, code: str = "VALIDATION_ERROR", details: dict | None = None, status: int = 400):
    return (
        {
            "ok": False,
            "error": {"code": code, "message": message, "details": details or {}},
        },
        status,
    )


# Load all configs, stages, and helpers from SQLite and build the API shape.
def _fetch_configs() -> list:
    # Open a DB connection and pull raw rows.
    with get_connection() as conn:
        config_rows = conn.execute("SELECT * FROM configs ORDER BY config_id").fetchall()
        stage_rows = conn.execute("SELECT * FROM stages ORDER BY stage_id").fetchall()
        helper_rows = conn.execute("SELECT * FROM helpers").fetchall()

    # Organize helpers by (config_id, stage_id) so we can attach them to stages.
    stages_by_config: dict[str, list] = {}
    helpers_by_stage: dict[tuple[str, int], dict] = {}

    # Build a helpers dictionary for each stage.
    for helper in helper_rows:
        key = (helper["config_id"], helper["stage_id"])
        helpers_by_stage.setdefault(key, {})
        helpers_by_stage[key][helper["helper_key"]] = {
            "cost": helper["cost"],
            **(
                {"effect_seconds": helper["effect_seconds"]}
                if helper["effect_seconds"] is not None
                else {}
            ),
        }

    # Build stages and attach helper info.
    for stage in stage_rows:
        key = (stage["config_id"], stage["stage_id"])
        stages_by_config.setdefault(stage["config_id"], [])
        stages_by_config[stage["config_id"]].append(
            {
                "stage_id": stage["stage_id"],
                "card_count": stage["card_count"],
                "timer_seconds": stage["timer_seconds"],
                "move_limit": stage["move_limit"],
                "mismatch_penalty_seconds": stage["mismatch_penalty_seconds"],
                "helpers": helpers_by_stage.get(key, {}),
            }
        )

    # Finally, attach stages to each config.
    configs = []
    for config in config_rows:
        configs.append(
            {
                "config_id": config["config_id"],
                "label": config["label"],
                "stages": stages_by_config.get(config["config_id"], []),
            }
        )

    return configs


# Return a single config by id, or None if not found.
def _get_config(config_id: str) -> dict | None:
    for config in _fetch_configs():
        if config["config_id"] == config_id:
            return config
    return None


# Return all config ids (used in compare endpoint).
def _get_config_ids() -> list[str]:
    with get_connection() as conn:
        rows = conn.execute("SELECT config_id FROM configs ORDER BY config_id").fetchall()
    return [row["config_id"] for row in rows]


# Read role from headers. Defaults to "player".
def _get_role() -> str:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.replace("Bearer ", "", 1).strip()
    return request.headers.get("X-Role", "player")


# Block access unless role is "designer".
def _require_designer():
    if _get_role() != "designer":
        return _error_response("designer role required", code="FORBIDDEN", status=403)
    return None


# Create the Flask app and register all routes.
def create_app():
    # Create the web server and load config values.
    app = Flask(__name__)
    app.config.from_object(Config)
    # Ensure tables exist and seed default configs.
    init_db()

    # Simple health check for "is the server running?"
    @app.get("/api/health")
    def health():
        return {"ok": True}

    # Fake login: decide role by username.
    @app.post("/api/auth/login")
    def login():
        body = request.get_json() or {}
        username = body.get("username", "")
        role = "designer" if username == "designer" else "player"
        return {"ok": True, "user": {"user_id": "u_admin_1", "role": role}}

    # Logout is a no-op for this simple backend.
    @app.post("/api/auth/logout")
    def logout():
        return {"ok": True}

    # Return current user info (from headers).
    @app.get("/api/me")
    def me():
        role = _get_role()
        user_id = request.headers.get("X-User-Id", "u_104")
        return {"is_authenticated": True, "user": {"user_id": user_id, "role": role}}

    # Frontend reads all config settings from here.
    @app.get("/api/game/configs")
    def get_game_configs():
        return {"configs": _fetch_configs()}

    # Update one stage in one config.
    @app.put("/api/game/configs/<config_id>/stages/<int:stage_id>")
    def update_stage_config(config_id: str, stage_id: int):
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})
        if not (1 <= stage_id <= 10):
            return _error_response("stage_id is invalid", details={"field": "stage_id"})

        # Read the update payload.
        payload = request.get_json() or {}
        stage_fields = {
            "card_count": payload.get("card_count"),
            "timer_seconds": payload.get("timer_seconds"),
            "move_limit": payload.get("move_limit"),
            "mismatch_penalty_seconds": payload.get("mismatch_penalty_seconds"),
        }
        helpers = payload.get("helpers") or {}
        token_rules = payload.get("token_rules") or {}

        # Update rows in the database.
        with get_connection() as conn:
            existing = conn.execute(
                """
                SELECT 1 FROM stages
                WHERE config_id = ? AND stage_id = ?
                """,
                (config_id, stage_id),
            ).fetchone()
            if existing is None:
                return _error_response(
                    "stage not found", code="NOT_FOUND", status=404
                )

            conn.execute(
                """
                UPDATE stages
                SET card_count = COALESCE(?, card_count),
                    timer_seconds = COALESCE(?, timer_seconds),
                    move_limit = COALESCE(?, move_limit),
                    mismatch_penalty_seconds = COALESCE(?, mismatch_penalty_seconds)
                WHERE config_id = ? AND stage_id = ?
                """,
                (
                    stage_fields["card_count"],
                    stage_fields["timer_seconds"],
                    stage_fields["move_limit"],
                    stage_fields["mismatch_penalty_seconds"],
                    config_id,
                    stage_id,
                ),
            )

            helper_map = {
                "peek_cost": "peek",
                "freeze_cost": "freeze",
                "shuffle_cost": "shuffle",
            }
            for key, helper_key in helper_map.items():
                if key in helpers and helpers[key] is not None:
                    conn.execute(
                        """
                        UPDATE helpers
                        SET cost = ?
                        WHERE config_id = ? AND stage_id = ? AND helper_key = ?
                        """,
                        (helpers[key], config_id, stage_id, helper_key),
                    )

            if "per_match" in token_rules or "on_complete" in token_rules:
                conn.execute(
                    """
                    UPDATE token_rules
                    SET per_match = COALESCE(?, per_match),
                        on_complete = COALESCE(?, on_complete)
                    WHERE config_id = ? AND stage_id = ?
                    """,
                    (
                        token_rules.get("per_match"),
                        token_rules.get("on_complete"),
                        config_id,
                        stage_id,
                    ),
                )

        # Return the updated stage.
        updated = _get_config(config_id)
        return {
            "ok": True,
            "config_id": config_id,
            "stage_id": stage_id,
            "stage": next(
                (stage for stage in (updated or {}).get("stages", []) if stage["stage_id"] == stage_id),
                None,
            ),
        }

    # Update many stages in one request.
    @app.put("/api/game/configs/<config_id>/stages")
    def bulk_update_stages(config_id: str):
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})

        # Read the list of stage updates.
        payload = request.get_json() or {}
        stages = payload.get("stages")
        if not isinstance(stages, list):
            return _error_response("stages must be a list", details={"field": "stages"})

        updated_stage_ids = []
        # Apply each stage update.
        for stage_payload in stages:
            if not isinstance(stage_payload, dict):
                continue
            stage_id = stage_payload.get("stage_id")
            if not isinstance(stage_id, int) or not (1 <= stage_id <= 10):
                continue

            stage_fields = {
                "card_count": stage_payload.get("card_count"),
                "timer_seconds": stage_payload.get("timer_seconds"),
                "move_limit": stage_payload.get("move_limit"),
                "mismatch_penalty_seconds": stage_payload.get("mismatch_penalty_seconds"),
            }
            helpers = stage_payload.get("helpers") or {}
            token_rules = stage_payload.get("token_rules") or {}

            # Update this stage in the DB.
            with get_connection() as conn:
                existing = conn.execute(
                    """
                    SELECT 1 FROM stages
                    WHERE config_id = ? AND stage_id = ?
                    """,
                    (config_id, stage_id),
                ).fetchone()
                if existing is None:
                    continue

                conn.execute(
                    """
                    UPDATE stages
                    SET card_count = COALESCE(?, card_count),
                        timer_seconds = COALESCE(?, timer_seconds),
                        move_limit = COALESCE(?, move_limit),
                        mismatch_penalty_seconds = COALESCE(?, mismatch_penalty_seconds)
                    WHERE config_id = ? AND stage_id = ?
                    """,
                    (
                        stage_fields["card_count"],
                        stage_fields["timer_seconds"],
                        stage_fields["move_limit"],
                        stage_fields["mismatch_penalty_seconds"],
                        config_id,
                        stage_id,
                    ),
                )

                helper_map = {
                    "peek_cost": "peek",
                    "freeze_cost": "freeze",
                    "shuffle_cost": "shuffle",
                }
                for key, helper_key in helper_map.items():
                    if key in helpers and helpers[key] is not None:
                        conn.execute(
                            """
                            UPDATE helpers
                            SET cost = ?
                            WHERE config_id = ? AND stage_id = ? AND helper_key = ?
                            """,
                            (helpers[key], config_id, stage_id, helper_key),
                        )

                if "per_match" in token_rules or "on_complete" in token_rules:
                    conn.execute(
                        """
                        UPDATE token_rules
                        SET per_match = COALESCE(?, per_match),
                            on_complete = COALESCE(?, on_complete)
                        WHERE config_id = ? AND stage_id = ?
                        """,
                        (
                            token_rules.get("per_match"),
                            token_rules.get("on_complete"),
                            config_id,
                            stage_id,
                        ),
                    )

            updated_stage_ids.append(stage_id)

        # Return only the updated stages.
        updated_config = _get_config(config_id)
        updated_stages = []
        if updated_config:
            stage_map = {stage["stage_id"]: stage for stage in updated_config.get("stages", [])}
            updated_stages = [stage_map[stage_id] for stage_id in updated_stage_ids if stage_id in stage_map]

        return {"ok": True, "config_id": config_id, "updated_stages": updated_stages}

    # Apply deltas (same change) to every stage in a config.
    @app.patch("/api/game/configs/<config_id>/apply")
    def apply_config_deltas(config_id: str):
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})

        # Read delta values (like +2 seconds).
        payload = request.get_json() or {}
        timer_delta = payload.get("timer_seconds_delta")
        move_delta = payload.get("move_limit_delta")
        mismatch_delta = payload.get("mismatch_penalty_seconds_delta")
        helper_delta = payload.get("helper_cost_delta")
        token_rules = payload.get("token_rules_delta") or {}

        # Apply deltas across all stages/helpers.
        with get_connection() as conn:
            if timer_delta is not None:
                conn.execute(
                    """
                    UPDATE stages
                    SET timer_seconds = timer_seconds + ?
                    WHERE config_id = ?
                    """,
                    (timer_delta, config_id),
                )
            if move_delta is not None:
                conn.execute(
                    """
                    UPDATE stages
                    SET move_limit = move_limit + ?
                    WHERE config_id = ?
                    """,
                    (move_delta, config_id),
                )
            if mismatch_delta is not None:
                conn.execute(
                    """
                    UPDATE stages
                    SET mismatch_penalty_seconds = mismatch_penalty_seconds + ?
                    WHERE config_id = ?
                    """,
                    (mismatch_delta, config_id),
                )
            if helper_delta is not None:
                conn.execute(
                    """
                    UPDATE helpers
                    SET cost = cost + ?
                    WHERE config_id = ?
                    """,
                    (helper_delta, config_id),
                )
            if "per_match" in token_rules or "on_complete" in token_rules:
                conn.execute(
                    """
                    UPDATE token_rules
                    SET per_match = per_match + COALESCE(?, 0),
                        on_complete = on_complete + COALESCE(?, 0)
                    WHERE config_id = ?
                    """,
                    (
                        token_rules.get("per_match"),
                        token_rules.get("on_complete"),
                        config_id,
                    ),
                )

        return {"ok": True, "config_id": config_id}

    # Create or accept a pseudonymous player id.
    @app.post("/api/player/identify")
    def identify_player():
        body = request.get_json() or {}
        user_id = body.get("client_user_id") or f"u_{uuid.uuid4().hex[:8]}"
        return {"user_id": user_id}

    # Start a new session (run).
    @app.post("/api/sessions/start")
    def start_session():
        body = request.get_json() or {}
        user_id = body.get("user_id")
        config_id = body.get("config_id")
        if not user_id:
            return _error_response("user_id is required", details={"field": "user_id"})
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})

        session_id = str(uuid.uuid4())
        started_at = body.get("started_at") or datetime.utcnow().isoformat() + "Z"
        # Save the session in the DB.
        with get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO sessions
                (session_id, user_id, config_id, start_time)
                VALUES (?, ?, ?, ?)
                """,
                (session_id, user_id, config_id, started_at),
            )
        return (
            {
                "session_id": session_id,
                "user_id": user_id,
                "config_id": config_id,
                "started_at": started_at,
            },
            201,
        )

    # End a session.
    @app.post("/api/sessions/end")
    def end_session():
        body = request.get_json() or {}
        session_id = body.get("session_id")
        outcome = body.get("outcome")
        ended_at = body.get("ended_at") or datetime.utcnow().isoformat() + "Z"
        if not session_id:
            return _error_response("session_id is required", details={"field": "session_id"})
        if outcome not in ("completed", "quit", "failed"):
            return _error_response("outcome is invalid", details={"field": "outcome"})

        # Update the session row.
        with get_connection() as conn:
            conn.execute(
                """
                UPDATE sessions
                SET end_time = ?, outcome = ?
                WHERE session_id = ?
                """,
                (ended_at, outcome, session_id),
            )
        return {"ok": True}

    # Main telemetry ingest endpoint.
    @app.post("/api/events")
    def ingest_event():
        body = request.get_json() or {}
        if not body.get("event_id"):
            body["event_id"] = str(uuid.uuid4())
        # Validate event shape and payload.
        validation = validate_event(body)

        payload = body.get("payload") or {}
        if not isinstance(payload, dict):
            payload = {}

        # Check temporal rule: stage_complete/fail must follow stage_start.
        event_type = body.get("event_type")
        if event_type in (EventType.STAGE_COMPLETE.value, EventType.STAGE_FAIL.value):
            with get_connection() as conn:
                start_row = conn.execute(
                    """
                    SELECT 1 FROM events
                    WHERE session_id = ? AND stage_id = ? AND event_type = ?
                    LIMIT 1
                    """,
                    (
                        body.get("session_id"),
                        body.get("stage_id"),
                        EventType.STAGE_START.value,
                    ),
                ).fetchone()

            if start_row is None:
                validation["anomalies"].append(
                    {
                        "anomaly_id": f"{body['event_id']}_missing_stage_start",
                        "event_id": body["event_id"],
                        "anomaly_type": "invalid_sequence",
                        "detected_by": "temporal_logic_check",
                        "resolution_status": "open",
                        "created_at": datetime.utcnow().isoformat(),
                        "details": {"event_type": event_type},
                    }
                )
                validation["is_valid"] = False

        # Store event and anomalies.
        with get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO events
                (event_id, session_id, user_id, timestamp, stage_id, config_id, event_type, payload, is_valid)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    body.get("event_id"),
                    body.get("session_id"),
                    body.get("user_id"),
                    body.get("timestamp"),
                    body.get("stage_id"),
                    body.get("config_id"),
                    body.get("event_type"),
                    json.dumps(payload),
                    1 if validation["is_valid"] else 0,
                ),
            )

            for anomaly in validation["anomalies"]:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO anomalies
                    (anomaly_id, event_id, anomaly_type, detected_by, resolution_status, created_at, details)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        anomaly.get("anomaly_id"),
                        anomaly.get("event_id"),
                        anomaly.get("anomaly_type"),
                        anomaly.get("detected_by"),
                        anomaly.get("resolution_status"),
                        anomaly.get("created_at"),
                        json.dumps(anomaly.get("details") or {}),
                    ),
                )

        # Build a simplified anomaly list for the API response.
        response_anomalies = []
        for anomaly in validation["anomalies"]:
            detail = anomaly.get("details", {}).get("field") or anomaly.get("details")
            response_anomalies.append(
                {"anomaly_type": anomaly.get("anomaly_type"), "detail": detail}
            )

        return (
            {
                "stored": True,
                "is_valid": validation["is_valid"],
                "anomalies": response_anomalies,
            },
            201,
        )

    # Designer-only list of events.
    @app.get("/api/events")
    def list_events():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        filters = request.args.to_dict(flat=False)
        query = "SELECT * FROM events WHERE 1=1"
        params = []
        for key in ("config_id", "stage_id", "event_type", "session_id", "user_id"):
            values = request.args.getlist(key)
            if values:
                query += f" AND {key} IN ({','.join(['?'] * len(values))})"
                params.extend(values)

        # Read matching events from DB.
        with get_connection() as conn:
            rows = conn.execute(query, params).fetchall()

        events = []
        for row in rows:
            payload = {}
            if row["payload"]:
                try:
                    payload = json.loads(row["payload"])
                except json.JSONDecodeError:
                    payload = {}
            events.append(
                {
                    "event_id": row["event_id"],
                    "session_id": row["session_id"],
                    "user_id": row["user_id"],
                    "timestamp": row["timestamp"],
                    "stage_id": row["stage_id"],
                    "config_id": row["config_id"],
                    "event_type": row["event_type"],
                    "payload": payload,
                    "is_valid": bool(row["is_valid"]),
                }
            )

        return {"filters": filters, "events": events}

    # Export events as CSV (designer-only).
    @app.get("/api/export/events.csv")
    def export_events():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        config_id = request.args.get("config_id")
        query = "SELECT * FROM events WHERE 1=1"
        params = []
        if config_id:
            query += " AND config_id = ?"
            params.append(config_id)

        # Read all matching events.
        with get_connection() as conn:
            rows = conn.execute(
                f"{query} ORDER BY timestamp", params
            ).fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "event_id",
                "timestamp",
                "event_type",
                "user_id",
                "session_id",
                "stage_id",
                "config_id",
                "payload_json",
            ]
        )
        for row in rows:
            writer.writerow(
                [
                    row["event_id"],
                    row["timestamp"],
                    row["event_type"],
                    row["user_id"],
                    row["session_id"],
                    row["stage_id"],
                    row["config_id"],
                    row["payload"] or "{}",
                ]
            )

        return output.getvalue(), 200, {"Content-Type": "text/csv"}

    # Funnel metrics endpoint.
    @app.get("/api/metrics/funnel")
    def funnel():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        config_id = request.args.get("config_id", "balanced")
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})
        return get_funnel_metrics(
            config_id,
            request.args.get("from"),
            request.args.get("to"),
        )

    # Stage statistics endpoint.
    @app.get("/api/metrics/stage-stats")
    def stage_stats():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        config_id = request.args.get("config_id", "balanced")
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})
        data = get_stage_stats(
            config_id,
            request.args.get("from"),
            request.args.get("to"),
        )
        return {"config_id": data["config_id"], "stages": data["stats"]}

    # Progression metrics endpoint.
    @app.get("/api/metrics/progression")
    def progression():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        config_id = request.args.get("config_id", "balanced")
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})
        return get_progression_metrics(
            config_id,
            request.args.get("from"),
            request.args.get("to"),
        )

    # Fairness metrics endpoint.
    @app.get("/api/metrics/fairness")
    def fairness():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        segment = request.args.get("segment", "all")
        config_id = request.args.get("config_id", "balanced")
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})
        return get_fairness_metrics(
            segment,
            config_id,
            request.args.get("from"),
            request.args.get("to"),
        )

    # Compare multiple configs.
    @app.get("/api/metrics/compare")
    def compare():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        configs_param = request.args.get("configs")
        if configs_param:
            configs = [config.strip() for config in configs_param.split(",") if config.strip()]
        else:
            configs = request.args.getlist("config_id") or _get_config_ids()
        for config_id in configs:
            if config_id not in [c.value for c in ConfigId]:
                return _error_response("config_id is invalid", details={"field": "config_id"})
        return get_compare_metrics(
            configs,
            request.args.get("from"),
            request.args.get("to"),
        )

    # Run deterministic balancing rules.
    @app.post("/api/balancing/suggestions")
    def suggestions():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        payload = request.get_json() or {}
        config_id = payload.get("config_id", "balanced")
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})
        return get_suggestions(config_id)

    # Simulate changes based on past events.
    @app.post("/api/balancing/simulate")
    def simulate():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        payload = request.get_json() or {}
        config_id = payload.get("config_id", "balanced")
        if config_id not in [c.value for c in ConfigId]:
            return _error_response("config_id is invalid", details={"field": "config_id"})
        return simulate_balance_change(payload)

    # Return editable parameters for the dashboard.
    @app.get("/api/balancing/parameters")
    def balancing_parameters():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        config_id = request.args.get("config_id", "balanced")
        config = _get_config(config_id)
        if not config:
            return _error_response("config_id is invalid", details={"field": "config_id"})

        with get_connection() as conn:
            token_rows = conn.execute(
                "SELECT stage_id, per_match, on_complete FROM token_rules WHERE config_id = ?",
                (config_id,),
            ).fetchall()
        token_by_stage = {
            row["stage_id"]: {"per_match": row["per_match"], "on_complete": row["on_complete"]}
            for row in token_rows
        }

        editable = {
            "stages": [
                {
                    "stage_id": stage["stage_id"],
                    "timer_seconds": stage["timer_seconds"],
                    "move_limit": stage["move_limit"],
                    "mismatch_penalty_seconds": stage["mismatch_penalty_seconds"],
                    "helpers": {
                        "peek_cost": stage["helpers"]["peek"]["cost"],
                        "freeze_cost": stage["helpers"]["freeze"]["cost"],
                        "shuffle_cost": stage["helpers"]["shuffle"]["cost"],
                    },
                    "token_rules": token_by_stage.get(
                        stage["stage_id"], {"per_match": 1, "on_complete": 2}
                    ),
                }
                for stage in config["stages"]
            ]
        }
        return {"config_id": config_id, "editable": editable}

    # List designer decisions.
    @app.get("/api/decisions")
    def list_decisions():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        config_id = request.args.get("config_id")
        query = "SELECT * FROM decisions"
        params = []
        if config_id:
            query += " WHERE config_id = ?"
            params.append(config_id)
        with get_connection() as conn:
            rows = conn.execute(
                f"{query} ORDER BY timestamp DESC", params
            ).fetchall()

        decisions = []
        for row in rows:
            change = {}
            evidence = []
            if row["change_json"]:
                try:
                    change = json.loads(row["change_json"])
                except json.JSONDecodeError:
                    change = {}
            if row["evidence_links"]:
                try:
                    evidence = json.loads(row["evidence_links"])
                except json.JSONDecodeError:
                    evidence = []

            decisions.append(
                {
                    "decision_id": row["decision_id"],
                    "config_id": row["config_id"],
                    "stage_id": row["stage_id"],
                    "change": change,
                    "rationale": row["rationale"],
                    "evidence_links": evidence,
                    "created_at": row["timestamp"],
                }
            )

        return {"decisions": decisions}

    # Create a new decision entry.
    @app.post("/api/decisions")
    def create_decision():
        auth_error = _require_designer()
        if auth_error:
            return auth_error
        payload = request.get_json() or {}
        decision_id = payload.get("decision_id") or str(uuid.uuid4())
        created_at = payload.get("created_at") or datetime.utcnow().isoformat() + "Z"
        with get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO decisions
                (decision_id, config_id, stage_id, change_json, rationale, evidence_links, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    decision_id,
                    payload.get("config_id"),
                    payload.get("stage_id"),
                    json.dumps(payload.get("change") or {}),
                    payload.get("rationale"),
                    json.dumps(payload.get("evidence_links") or []),
                    created_at,
                ),
            )

        return {"decision_id": decision_id, "ok": True}, 201

    # Build a session summary from telemetry.
    @app.get("/api/sessions/<session_id>/summary")
    def session_summary(session_id: str):
        with get_connection() as conn:
            session = conn.execute(
                "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
            ).fetchone()
            events = conn.execute(
                "SELECT * FROM events WHERE session_id = ? ORDER BY timestamp",
                (session_id,),
            ).fetchall()

        if session is None:
            return _error_response("session not found", code="NOT_FOUND", status=404)

        per_stage: dict[int, dict] = {}
        total_retries = 0
        total_tokens_earned = 0
        total_tokens_spent = 0
        fails_by_reason = {"time": 0, "moves": 0}

        # Combine events into per-stage summaries.
        for row in events:
            stage_id = row["stage_id"]
            payload = {}
            if row["payload"]:
                try:
                    payload = json.loads(row["payload"])
                except json.JSONDecodeError:
                    payload = {}

            if stage_id is None:
                continue

            stage_id = int(stage_id)
            per_stage.setdefault(
                stage_id,
                {
                    "stage_id": stage_id,
                    "outcome": None,
                    "fail_reason": None,
                    "time_spent_seconds": None,
                    "retries": 0,
                    "tokens_earned": 0,
                    "tokens_spent": 0,
                    "start_time": None,
                },
            )

            if row["event_type"] == EventType.STAGE_START.value:
                per_stage[stage_id]["start_time"] = row["timestamp"]

            if row["event_type"] == EventType.RETRY.value:
                per_stage[stage_id]["retries"] += 1
                total_retries += 1

            if row["event_type"] == EventType.RESOURCE_GAIN.value:
                amount = payload.get("amount")
                if isinstance(amount, (int, float)):
                    per_stage[stage_id]["tokens_earned"] += amount
                    total_tokens_earned += amount

            if row["event_type"] == EventType.RESOURCE_SPEND.value:
                amount = payload.get("amount")
                if isinstance(amount, (int, float)):
                    per_stage[stage_id]["tokens_spent"] += amount
                    total_tokens_spent += amount

            if row["event_type"] in (
                EventType.STAGE_COMPLETE.value,
                EventType.STAGE_FAIL.value,
                EventType.QUIT.value,
            ):
                start_time = per_stage[stage_id]["start_time"]
                if start_time:
                    start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                    end_dt = datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))
                    per_stage[stage_id]["time_spent_seconds"] = (
                        end_dt - start_dt
                    ).total_seconds()

                if row["event_type"] == EventType.STAGE_COMPLETE.value:
                    per_stage[stage_id]["outcome"] = "completed"
                elif row["event_type"] == EventType.STAGE_FAIL.value:
                    per_stage[stage_id]["outcome"] = "failed"
                    fail_reason = payload.get("fail_reason")
                    per_stage[stage_id]["fail_reason"] = fail_reason
                    if fail_reason in fails_by_reason:
                        fails_by_reason[fail_reason] += 1
                elif row["event_type"] == EventType.QUIT.value:
                    per_stage[stage_id]["outcome"] = "quit"

                if per_stage[stage_id]["tokens_earned"] == 0 and isinstance(
                    payload.get("tokens_earned"), (int, float)
                ):
                    per_stage[stage_id]["tokens_earned"] = payload.get("tokens_earned")
                    total_tokens_earned += payload.get("tokens_earned")

                if per_stage[stage_id]["tokens_spent"] == 0 and isinstance(
                    payload.get("tokens_spent"), (int, float)
                ):
                    per_stage[stage_id]["tokens_spent"] = payload.get("tokens_spent")
                    total_tokens_spent += payload.get("tokens_spent")

        stages_completed = len(
            [stage for stage in per_stage.values() if stage["outcome"] == "completed"]
        )

        total_time_seconds = None
        if session["start_time"] and session["end_time"]:
            start_dt = datetime.fromisoformat(session["start_time"].replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(session["end_time"].replace("Z", "+00:00"))
            total_time_seconds = (end_dt - start_dt).total_seconds()

        # Final response object.
        summary = {
            "session_id": session_id,
            "config_id": session["config_id"],
            "stages_completed": stages_completed,
            "total_time_seconds": total_time_seconds,
            "total_retries": total_retries,
            "total_tokens_earned": total_tokens_earned,
            "total_tokens_spent": total_tokens_spent,
            "fails_by_reason": fails_by_reason,
            "per_stage": [
                {
                    "stage_id": stage["stage_id"],
                    "outcome": stage["outcome"],
                    "fail_reason": stage["fail_reason"],
                    "time_spent_seconds": stage["time_spent_seconds"],
                    "retries": stage["retries"],
                    "tokens_earned": stage["tokens_earned"],
                    "tokens_spent": stage["tokens_spent"],
                }
                for stage in sorted(per_stage.values(), key=lambda item: item["stage_id"])
            ],
        }
        return summary

    # Re-run DB init and seed.
    @app.post("/api/seed")
    def seed():
        init_db()
        return {"ok": True, "seed": 42}

    # Return the configured Flask app.
    return app


# Start the server if you run: python app.py
if __name__ == "__main__":
    create_app().run(debug=True)
