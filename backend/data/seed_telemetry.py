
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

    users = [f"u_{i:03d}" for i in range(1, 40)] # Pseudonymous user IDs- no real personal data
    configs = [ConfigId.EASY.value, ConfigId.BALANCED.value, ConfigId.HARD.value]

    session_count = 120

    for i in range(session_count):
        session_id = f"s_{i+1:04d}"  # Create  session IDs like s_0001, s_0002
        user_id = rng.choice(users) # Picks a user at random 
        config_id = configs[i % 3]
        # Config-dependent behaviour (makes compare charts meaningful)
        attempt_stage2_prob = {"easy": 0.85, "balanced": 0.70, "hard": 0.60}[config_id]
        stage2_fail_prob    = {"easy": 0.45, "balanced": 0.50, "hard": 0.65}[config_id]
        quit_prob           = {"easy": 0.04, "balanced": 0.06, "hard": 0.08}[config_id]

        # When stage2 fails, what share are move-based fails (vs time-based)?
        move_fail_share     = {"easy": 0.40, "balanced": 0.45, "hard": 0.50}[config_id]

        
        # Create a session timeline 
        started_at = base_time + timedelta(minutes=i * 4)
        ended_at = started_at + timedelta(minutes=3)

        
        total_fails = 0
        total_tokens_spent = 0
        stages_completed = 0
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

        # Example flips + matches for stage 1
        insert_event(
            conn,
            build_event(
                f"{session_id}_stg1_flip1",
                session_id,
                user_id,
                started_at + timedelta(seconds=8),
                1,
                config_id,
                EventType.CARD_FLIP.value,
                {"card_index": 0, "is_first_flip": True},
            ),
        )

        insert_event(
            conn,
            build_event(
                f"{session_id}_stg1_flip2",
                session_id,
                user_id,
                started_at + timedelta(seconds=10),
                1,
                config_id,
                EventType.CARD_FLIP.value,
                {"card_index": 1, "is_first_flip": False},
            ),
        )

        insert_event(
            conn,
            build_event(
                f"{session_id}_stg1_match_success",
                session_id,
                user_id,
                started_at + timedelta(seconds=12),
                1,
                config_id,
                EventType.MATCH_SUCCESS.value,
                {
                    "cards": [0, 1],
                    "moves_used": 1,
                    "moves_remaining": 19,
                    "time_remaining": 55,
                    "tokens_after": 10,
                },
            ),
        )

        insert_event(
            conn,
            build_event(
                f"{session_id}_stg1_move_used",
                session_id,
                user_id,
                started_at + timedelta(seconds=12),
                1,
                config_id,
                EventType.MOVE_USED.value,
                {"moves_used": 1, "moves_remaining": 19},
            ),
        )

        # Example resource spend + powerup usage for stage 1
        insert_event(
            conn,
            build_event(
                f"{session_id}_stg1_powerup_peek",
                session_id,
                user_id,
                started_at + timedelta(seconds=20),
                1,
                config_id,
                EventType.POWERUP_USED.value,
                {"powerup_type": "peek", "effect_duration_seconds": 1},
            ),
        )
        insert_event(
            conn,
            build_event(
                f"{session_id}_stg1_spend_peek",
                session_id,
                user_id,
                started_at + timedelta(seconds=20),
                1,
                config_id,
                EventType.RESOURCE_SPEND.value,
                {"amount": 2, "powerup_type": "peek"},
            ),
        )
        # Add variance to Stage 1 completion
        stg1_complete_time = started_at + timedelta(seconds=rng.randint(45, 75))
        stg1_time_remaining = rng.randint(2, 15)
        stg1_moves_remaining = rng.randint(1, 6)
        stg1_total_moves_used = rng.randint(7, 13)

        stg1_fail_prob = {"easy": 0.08, "balanced": 0.12, "hard": 0.18}[config_id]
        stg1_failed = rng.random() < stg1_fail_prob

        if stg1_failed:
            total_fails += 1
            outcome = "failed"

            fail_reason = "time" if rng.random() < 0.6 else "moves"
            insert_event(
                conn,
                build_event(
                    f"{session_id}_stg1_fail",
                    session_id,
                    user_id,
                    started_at + timedelta(seconds=rng.randint(35, 60)),
                    1,
                    config_id,
                    EventType.STAGE_FAIL.value,
                    {
                        "fail_reason": fail_reason,
                        "time_remaining": -2 if fail_reason == "time" else rng.randint(1, 3),
                        "moves_remaining": 0 if fail_reason == "moves" else rng.randint(1, 3),
                        "tokens_earned": 0,
                        "tokens_spent": 0,
                    },
                ),
            )
        else:
            stages_completed += 1
            # Stage 1 completes
            insert_event(
                conn,
                build_event(
                    f"{session_id}_stg1_complete",
                    session_id,
                    user_id,
                    stg1_complete_time, 
                    1,
                    config_id,
                    EventType.STAGE_COMPLETE.value,
                    {
                        "time_remaining": stg1_time_remaining,
                        "moves_remaining": stg1_moves_remaining,
                        "total_moves_used": stg1_total_moves_used,
                        "tokens_earned": 2,
                        "tokens_spent": 0,
                    },
                ),
            )

            insert_event(
                conn,
                build_event(
                    f"{session_id}_stg1_reward",
                    session_id,
                    user_id,
                    started_at + timedelta(seconds=61),
                    1,
                    config_id,
                    EventType.RESOURCE_GAIN.value,
                    {"amount": 2, "reason": "stage_complete"},
                ),
            )


        # Only attempt stage 2 if stage 1 completed, based on config probability
        attempted_stage2 = (not stg1_failed) and (rng.random() < attempt_stage2_prob)

        if attempted_stage2:
            stg2_start_time = started_at + timedelta(seconds=rng.randint(65, 85))

            insert_event(
                conn,
                build_event(
                    f"{session_id}_stg2_start",
                    session_id,
                    user_id,
                    stg2_start_time,
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

            # Quit mid-stage sometimes
            if rng.random() < quit_prob:
                insert_event(
                    conn,
                    build_event(
                        f"{session_id}_stg2_quit",
                        session_id,
                        user_id,
                        stg2_start_time + timedelta(seconds=rng.randint(10, 40)),
                        2,
                        config_id,
                        EventType.QUIT.value,
                        {"reason": "player_left"},
                    ),
                )

                outcome = "quit"
            else:
                stage2_failed = rng.random() < stage2_fail_prob
                stg2_end_time = stg2_start_time + timedelta(seconds=rng.randint(30, 70))

                if stage2_failed:
                    is_move_fail = rng.random() < move_fail_share

                    if is_move_fail:
                        fail_payload = {
                            "fail_reason": "moves",
                            "time_remaining": rng.randint(1, 12),
                            "moves_remaining": rng.choice([0, -1]),
                            "tokens_earned": 0,
                            "tokens_spent": 0,
                        }
                    else:
                        fail_payload = {
                            "fail_reason": "time",
                            "time_remaining": rng.randint(-3, -1),
                            "moves_remaining": rng.randint(-2, 0),
                            "tokens_earned": 0,
                            "tokens_spent": 0,
                        }

                    insert_event(
                        conn,
                        build_event(
                            f"{session_id}_stg2_fail",
                            session_id,
                            user_id,
                            stg2_end_time,
                            2,
                            config_id,
                            EventType.STAGE_FAIL.value,
                            fail_payload,
                        ),
                    )
                    total_fails += 1
                    outcome = "failed"

                    # Optional retry
                    if rng.random() < 0.25:
                        insert_event(
                            conn,
                            build_event(
                                f"{session_id}_stg2_retry",
                                session_id,
                                user_id,
                                stg2_end_time + timedelta(seconds=2),
                                2,
                                config_id,
                                EventType.RETRY.value,
                                {"reason": "retry_after_fail", "stage_id": 2},
                            ),
                        )

                else:
                    insert_event(
                        conn,
                        build_event(
                            f"{session_id}_stg2_complete",
                            session_id,
                            user_id,
                            stg2_end_time,
                            2,
                            config_id,
                            EventType.STAGE_COMPLETE.value,
                            {
                                "time_remaining": rng.randint(1, 12),
                                "moves_remaining": rng.randint(0, 4),
                                "total_moves_used": rng.randint(10, 18),
                                "tokens_earned": 2,
                                "tokens_spent": 0,
                            },
                        ),
                    )
                    stages_completed = 2
        
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
