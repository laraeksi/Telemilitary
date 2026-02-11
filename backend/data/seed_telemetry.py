
import json
import random
from datetime import datetime, timedelta

from logic.telemetry import validate_event
from models import ConfigId, EventType


 #Seed telemetry only if events table is empty, don't want to insert duplicate telemetry every time the server restarts
def seed_telemetry_if_empty(conn):
    row = conn.execute("SELECT COUNT(*) as c FROM events").fetchone()
    if row and row["c"] > 0:
        return
    seed_telemetry(conn)


def seed_telemetry(conn):
    """
    Sprint 1 seeded telemetry dataset:
    - 15 pseudonymous users
    - 30 sessions across easy/balanced/hard
    - Stage 1 always completes
    - Stage 2 attempted ~60% of the time with ~50% failure
    - Seeds a few decisions and a few anomalies
    """
    rng = random.Random(20260211)  # deterministic seed
    base_time = datetime(2026, 2, 1, 12, 0, 0)

    users = [f"u_{i:03d}" for i in range(1, 16)] # Pseudonymous user IDs- no real personal data
    configs = [ConfigId.EASY.value, ConfigId.BALANCED.value, ConfigId.HARD.value]

    session_count = 30

    for i in range(session_count):
        session_id = f"s_{i+1:04d}"  # Create  session IDs like s_0001, s_0002
        user_id = rng.choice(users) # Picks a user at random 
        config_id = configs[i % 3]
        # Create a session timeline 
        started_at = base_time + timedelta(minutes=i * 4)
        ended_at = started_at + timedelta(minutes=3)

        
        total_fails = 0
        total_tokens_spent = 0
        stages_completed = 1  # stage 1 always completes
        outcome = "completed"

        # Insert session summary row (kept consistent with what we seed below)
        conn.execute(
            """
            INSERT OR REPLACE INTO sessions
            (session_id, user_id, config_id, start_time, end_time,
             outcome, total_time_seconds, total_fails,
             total_tokens_spent, stages_completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                user_id,
                config_id,
                started_at.isoformat() + "Z",
                ended_at.isoformat() + "Z",
                outcome,
                180,
                total_fails,
                total_tokens_spent,
                stages_completed,
            ),
        )
            
        # SESSION_START - payload requires started_at
        insert_event(
            conn,
            build_event(
                f"{session_id}_start",
                session_id,
                user_id,
                started_at,
                1,
                config_id,
                EventType.SESSION_START.value,
                {"started_at": started_at.isoformat() + "Z"},
            ),
        )

        # stage 1 start
        insert_event(
            conn,
            build_event(
                f"{session_id}_stg1_start",
                session_id,
                user_id,
                started_at + timedelta(seconds=5),
                1,
                config_id,
                EventType.STAGE_START.value,
                {
                    "timer_seconds": 60,
                    "move_limit": 20,
                    "card_count": 10,
                    "token_start": 10,
                },
            ),
        )

        # Stage 1 completes
        insert_event(
            conn,
            build_event(
                f"{session_id}_stg1_complete",
                session_id,
                user_id,
                started_at + timedelta(seconds=60),
                1,
                config_id,
                EventType.STAGE_COMPLETE.value,
                {
                    "time_remaining": 5,
                    "moves_remaining": 3,
                    "total_moves_used": 10,
                    "tokens_earned": 2,
                    "tokens_spent": 0,
                },
            ),
        )

        # Only ~60% attempt stage 2 → creates drop-off
        attempted_stage2 = rng.random() < 0.6
        if attempted_stage2:
            # stage 2 starts
            insert_event(
                conn,
                build_event(
                    f"{session_id}_stg2_start",
                    session_id,
                    user_id,
                    started_at + timedelta(seconds=70),
                    2,
                    config_id,
                    EventType.STAGE_START.value,
                    {
                        "timer_seconds": 50,
                        "move_limit": 18,
                        "card_count": 12,
                        "token_start": 12,
                    },
                ),
            )

            # Stage 2 harder: ~50% fail
            stage2_failed = rng.random() < 0.5
            if stage2_failed:
                total_fails += 1
                outcome = "failed"

                insert_event(
                    conn,
                    build_event(
                        f"{session_id}_stg2_fail",
                        session_id,
                        user_id,
                        started_at + timedelta(seconds=120),
                        2,
                        config_id,
                        EventType.STAGE_FAIL.value,
                        {
                            "fail_reason": "time",
                            # Negative time_remaining for simulation- e.g. if designer increases timer, these failures may become successes
                            "time_remaining": -3,
                            "moves_remaining": 2,
                            "tokens_earned": 0,
                            "tokens_spent": 0,
                        },
                    ),
                )
            else:
                stages_completed += 1
                insert_event(
                    conn,
                    build_event(
                        f"{session_id}_stg2_complete",
                        session_id,
                        user_id,
                        started_at + timedelta(seconds=120),
                        2,
                        config_id,
                        EventType.STAGE_COMPLETE.value,
                        {
                            "time_remaining": 2,
                            "moves_remaining": 1,
                            "total_moves_used": 14,
                            "tokens_earned": 2,
                            "tokens_spent": 0,
                        },
                    ),
                )

        # SESSION_END (payload MUST include ended_at + outcome)
        insert_event(
            conn,
            build_event(
                f"{session_id}_end",
                session_id,
                user_id,
                ended_at,
                1,
                config_id,
                EventType.SESSION_END.value,
                {"ended_at": ended_at.isoformat() + "Z", "outcome": outcome},
            ),
        )

        # Update session summary row to reflect what actually happened (optional but good)
        conn.execute(
            """
            UPDATE sessions
            SET outcome = ?, total_fails = ?, stages_completed = ?
            WHERE session_id = ?
            """,
            (outcome, total_fails, stages_completed, session_id),
        )

    # Seed a few designer decisions (Sprint 1 scale)
    seed_decisions(conn, base_time)

    # Seed a few intentional anomalies so validation is demonstrable in Sprint 1
    seed_intentional_anomalies(conn, base_time)


def build_event(event_id, session_id, user_id, ts, stage_id, config_id, event_type, payload):
    return {
        "event_id": event_id,
        "timestamp": ts.isoformat() + "Z",
        "event_type": event_type,
        "user_id": user_id,
        "session_id": session_id,
        "stage_id": stage_id,
        "config_id": config_id,
        "payload": payload,
    }


def insert_event(conn, event):
    """
    Insert an event into DB while:
    - running validate_event(event)
    - applying the SAME temporal sequence rule as your ingestion route:
        stage_complete/stage_fail must have a prior stage_start for that session/stage
    - storing any anomalies in anomalies table
    """
    validation = validate_event(event)

    # Temporal rule: complete/fail without start is invalid (impossible sequence)
    if event["event_type"] in (EventType.STAGE_COMPLETE.value, EventType.STAGE_FAIL.value):
        start_row = conn.execute(
            """
            SELECT 1 FROM events
            WHERE session_id = ? AND stage_id = ? AND event_type = ?
            LIMIT 1
            """,
            (event["session_id"], event["stage_id"], EventType.STAGE_START.value),
        ).fetchone()

        if start_row is None:
            validation["is_valid"] = False
            validation["anomalies"].append(
                {
                    "anomaly_id": f"{event['event_id']}_missing_start",
                    "event_id": event["event_id"],
                    "anomaly_type": "invalid_sequence",
                    "detected_by": "temporal_check",
                    "resolution_status": "open",
                    "created_at": datetime.utcnow().isoformat(),
                    "details": {"reason": "complete_or_fail_without_start"},
                }
            )

    conn.execute(
        """
        INSERT OR REPLACE INTO events
        (event_id, session_id, user_id, timestamp,
         stage_id, config_id, event_type, payload, is_valid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event["event_id"],
            event["session_id"],
            event["user_id"],
            event["timestamp"],
            event["stage_id"],
            event["config_id"],
            event["event_type"],
            json.dumps(event["payload"]),
            1 if validation["is_valid"] else 0,
        ),
    )

    for anomaly in validation["anomalies"]:
        conn.execute(
            """
            INSERT OR REPLACE INTO anomalies
            (anomaly_id, event_id, anomaly_type,
             detected_by, resolution_status,
             created_at, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                anomaly["anomaly_id"],
                anomaly["event_id"],
                anomaly["anomaly_type"],
                anomaly["detected_by"],
                anomaly["resolution_status"],
                anomaly["created_at"],
                json.dumps(anomaly.get("details", {})),
            ),
        )


def seed_decisions(conn, base_time):
    """
    Seed a few decisions for Sprint 1 (CW2 will scale to 30).
    """
    now = (base_time + timedelta(days=1, hours=2)).isoformat() + "Z"
    decisions = [
        ("dec1", "balanced", 2, json.dumps({"timer_seconds_delta": 5}), "Stage 2 timeout rate high.", "dashboard:funnel", now),
        ("dec2", "hard", 2, json.dumps({"move_limit_delta": 2}), "Hard drop-off too steep.", "dashboard:stage_stats", now),
        ("dec3", "easy", 2, json.dumps({"timer_seconds_delta": -2}), "Easy too forgiving.", "dashboard:compare", now),
        ("dec4", "balanced", 1, json.dumps({"mismatch_penalty_seconds_delta": -1}), "Stage 1 mismatch penalty too punishing.", "dashboard:stage_stats", now),
        ("dec5", "hard", 1, json.dumps({"timer_seconds_delta": 3}), "Reduce early frustration on hard.", "dashboard:funnel", now),
        ("dec6", "easy", 2, json.dumps({"move_limit_delta": -1}), "Prevent trivial completion on easy.", "dashboard:compare", now),
    ]

    conn.executemany(
        """
        INSERT OR REPLACE INTO decisions
        (decision_id, config_id, stage_id,
         change_json, rationale, evidence_links, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        decisions,
    )


def seed_intentional_anomalies(conn, base_time):
    """
    Seed a few intentionally invalid events to demonstrate data quality checks.
    These should produce anomalies via validate_event and/or the temporal rule.
    """
    # 1) Missing required payload fields for stage_complete
    insert_event(
        conn,
        build_event(
            "bad_ev_missing_fields",
            "s_bad_0001",
            "u_001",
            base_time + timedelta(days=2),
            1,
            "balanced",
            EventType.STAGE_COMPLETE.value,
            {
                # Intentionally missing required keys like moves_remaining, total_moves_used, tokens_earned, tokens_spent
                "time_remaining": 5
            },
        ),
    )

    # 2) Complete without start (temporal rule should flag it)
    insert_event(
        conn,
        build_event(
            "bad_ev_complete_without_start",
            "s_bad_0002",
            "u_002",
            base_time + timedelta(days=2, minutes=5),
            2,
            "hard",
            EventType.STAGE_COMPLETE.value,
            {
                "time_remaining": 4,
                "moves_remaining": 1,
                "total_moves_used": 12,
                "tokens_earned": 2,
                "tokens_spent": 0,
            },
        ),
    )

    # 3 Session_end missing outcome (should be flagged by validate_event)
    insert_event(
        conn,
        build_event(
            "bad_ev_session_end_missing_outcome",
            "s_bad_0003",
            "u_003",
            base_time + timedelta(days=2, minutes=10),
            1,
            "easy",
            EventType.SESSION_END.value,
            {
                "ended_at": (base_time + timedelta(days=2, minutes=10)).isoformat() + "Z"
                # outcome intentionally missing
            },
        ),
    )
