# Seeds fake telemetry data for demos/tests.
# Used to populate demo dashboards.
import json
import random
from datetime import UTC, datetime, timedelta

from logic.telemetry import validate_event
from models import ConfigId, EventType


def _seeded_stage_clear_duration_seconds(config_id: str, stage_id: int, rng: random.Random) -> int:
    """
    Wall-clock seconds from STAGE_START to STAGE_COMPLETE for synthetic sessions.
    Later stages take longer on average (more cards, tighter clocks). Demo dashboards
    expect this curve to rise — old seeds used ~30–90s for every stage, which made
    stage 10 averages look faster than stage 1 (random overlap + survivor bias).
    """
    center = 34 + stage_id * 7
    jitter = rng.randint(-12, 20)
    cfg_bonus = {"easy": -8, "balanced": 0, "hard": 12}[config_id]
    return max(28, center + jitter + cfg_bonus)


def _seeded_stage_fail_duration_seconds(config_id: str, stage_id: int, rng: random.Random) -> int:
    """Failed attempts are usually shorter than a full clear, but ramp with stage."""
    base = 22 + stage_id * 4
    jitter = rng.randint(-10, 15)
    cfg_bonus = {"easy": -4, "balanced": 0, "hard": 6}[config_id]
    return max(12, base + jitter + cfg_bonus)


# Mirrors client `stageWinTokens` in game/stages.js (per stage index 0..9).
_SEED_STAGE_WIN_TOKENS = {
    "easy": [5, 5, 6, 6, 6, 7, 7, 7, 8, 8],
    "balanced": [5, 5, 6, 6, 6, 7, 7, 7, 8, 8],
    "hard": [4, 4, 5, 5, 5, 6, 6, 6, 7, 7],
}


def _seed_match_token_total(card_count: int, reward_per_pair: int = 1) -> int:
    """Sum of per-match gains for a full clear (pairs × rewardMatch)."""
    return max(1, card_count // 2) * reward_per_pair


 #Seed telemetry only if events table is empty, don't want to insert duplicate telemetry every time the server restarts
# Seed telemetry only if table is empty.
def seed_telemetry_if_empty(conn):
    row = conn.execute("SELECT COUNT(*) as c FROM events").fetchone()
    # Avoid duplicating demo data.
    if row and row["c"] > 0:
        return
    seed_telemetry(conn)


# Insert deterministic demo telemetry data.
def seed_telemetry(conn):
    """
    CW2-scale seeded telemetry (first run only, see seed_telemetry_if_empty):
    - 102 pseudonymous user IDs (u_001..u_102)
    - 600 primary sessions + extra coverage sessions; all three configs (easy/balanced/hard)
    - Large event stream for dashboards; decision log >= 30 rows; >= 150 data-quality anomalies
    """
    rng = random.Random(20260211)  # deterministic seed
    # Base timestamp for seeded sessions.
    base_time = datetime(2026, 2, 1, 12, 0, 0)

    # Pseudonymous user IDs (no real personal data). 100+ users (doubled).
    users = [f"u_{i:03d}" for i in range(1, 103)]
    # Rotate through difficulty configs.
    configs = [ConfigId.EASY.value, ConfigId.BALANCED.value, ConfigId.HARD.value]

    # Number of demo sessions to seed (doubled: 600 sessions = more players).
    session_count = 600

    # Target completion rate per (config, stage). More people finish each; easy > balanced > hard.
    # Easy: very high rates (~55–60% of easy sessions finish).
    # Balanced: high rates (~30–35% finish).
    # Hard: raised so more complete all 10 stages (~22–28% finish), still fewer than balanced.
    # Strictly easier → harder by stage; last stage has a larger drop so stage 10 is clearly the peak struggle
    # (and survives “survivor bias” in raw telemetry: only strong players reach late stages).
    TARGET_COMPLETION = {
        "easy": [0.995, 0.98, 0.965, 0.95, 0.935, 0.92, 0.905, 0.89, 0.87, 0.78],
        "balanced": [0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.79, 0.76, 0.72, 0.58],
        "hard": [0.96, 0.92, 0.88, 0.84, 0.80, 0.76, 0.72, 0.68, 0.62, 0.45],
    }
    # Running (completes, fails) per (config_id, stage_id) to assign outcomes against target.
    stage_counts = {}

    def choose_pass_fail(config_id, stage_id):
        key = (config_id, stage_id)
        c, f = stage_counts.get(key, (0, 0))
        target = TARGET_COMPLETION[config_id][stage_id - 1]
        rate_if_complete = (c + 1) / (c + f + 1)
        rate_if_fail = c / (c + f + 1)
        choose_fail = abs(rate_if_fail - target) < abs(rate_if_complete - target)
        stage_counts[key] = (c + (0 if choose_fail else 1), f + (1 if choose_fail else 0))
        return choose_fail

    for i in range(session_count):
        # Create session IDs like s_0001, s_0002.
        session_id = f"s_{i+1:04d}"
        user_id = rng.choice(users) # Picks a user at random 
        config_id = configs[i % 3]
        # Whether to attempt stage 2 and quit probability. More attempt = more reach later stages (easy > balanced > hard).
        attempt_stage2_prob = {"easy": 0.98, "balanced": 0.92, "hard": 0.90}[config_id]
        # Same per-visit quit chance at stage 2 and stages 3–10 (aggregate counts still drop with funnel).
        quit_prob_per_stage = {"easy": 0.01, "balanced": 0.02, "hard": 0.03}[config_id]

        # When stage2 fails, what share are move-based fails (vs time-based)?
        move_fail_share = {"easy": 0.40, "balanced": 0.45, "hard": 0.50}[config_id]

        
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
        # Stage 1 duration (start is at started_at + 5s)
        stg1_clear_sec = _seeded_stage_clear_duration_seconds(config_id, 1, rng)
        stg1_complete_time = started_at + timedelta(seconds=5 + stg1_clear_sec)
        stg1_time_remaining = rng.randint(2, 15)
        stg1_moves_remaining = rng.randint(1, 6)
        stg1_total_moves_used = rng.randint(7, 13)

        # Stage 1: assign pass/fail so observed completion tracks target (smooth decrease).
        stg1_failed = choose_pass_fail(config_id, 1)

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
                    started_at + timedelta(seconds=5 + _seeded_stage_fail_duration_seconds(config_id, 1, rng)),
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
            # Stage 1 completes — mirror client: per-match gains + stage bonus (telemetry uses resource_gain rows).
            stg1_card_count = 10
            win_amt = _SEED_STAGE_WIN_TOKENS[config_id][0]
            match_amt = _seed_match_token_total(stg1_card_count)
            insert_event(
                conn,
                build_event(
                    f"{session_id}_stg1_match_gain",
                    session_id,
                    user_id,
                    stg1_complete_time - timedelta(seconds=2),
                    1,
                    config_id,
                    EventType.RESOURCE_GAIN.value,
                    {"amount": match_amt, "reason": "match"},
                ),
            )
            insert_event(
                conn,
                build_event(
                    f"{session_id}_stg1_win_gain",
                    session_id,
                    user_id,
                    stg1_complete_time - timedelta(seconds=1),
                    1,
                    config_id,
                    EventType.RESOURCE_GAIN.value,
                    {"amount": win_amt, "reason": "stage_complete"},
                ),
            )
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
                        "tokens_earned": match_amt + win_amt,
                        "tokens_spent": 2,
                    },
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
            if rng.random() < quit_prob_per_stage:
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
                stage2_failed = choose_pass_fail(config_id, 2)
                stg2_dur = (
                    _seeded_stage_fail_duration_seconds(config_id, 2, rng)
                    if stage2_failed
                    else _seeded_stage_clear_duration_seconds(config_id, 2, rng)
                )
                stg2_end_time = stg2_start_time + timedelta(seconds=stg2_dur)

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
                    stg2_cc = 12
                    win2 = _SEED_STAGE_WIN_TOKENS[config_id][1]
                    match2 = _seed_match_token_total(stg2_cc)
                    insert_event(
                        conn,
                        build_event(
                            f"{session_id}_stg2_match_gain",
                            session_id,
                            user_id,
                            stg2_end_time - timedelta(seconds=2),
                            2,
                            config_id,
                            EventType.RESOURCE_GAIN.value,
                            {"amount": match2, "reason": "match"},
                        ),
                    )
                    insert_event(
                        conn,
                        build_event(
                            f"{session_id}_stg2_win_gain",
                            session_id,
                            user_id,
                            stg2_end_time - timedelta(seconds=1),
                            2,
                            config_id,
                            EventType.RESOURCE_GAIN.value,
                            {"amount": win2, "reason": "stage_complete"},
                        ),
                    )
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
                                "tokens_earned": match2 + win2,
                                "tokens_spent": 0,
                            },
                        ),
                    )
                    stages_completed = 2

        # Seed later stages (3–10) with lighter coverage so metrics and fairness
        # charts have data across all 10 stages per config.
        max_stage_reached = stages_completed
        for stage_id in range(3, 11):
            # Simple decreasing chance to even attempt higher stages.
            # If the player previously failed or quit, stop.
            if outcome != "completed":
                break

            # Attempt probability: more sessions progress to later stages; hard raised so more finish, still easy > balanced > hard.
            base_attempt = {"easy": 0.99, "balanced": 0.94, "hard": 0.91}[config_id]
            attempt_prob = max(0.60, base_attempt - (stage_id - 2) * {"easy": 0.010, "balanced": 0.018, "hard": 0.022}[config_id])
            if rng.random() >= attempt_prob:
                break

            stage_start_time = started_at + timedelta(
                seconds=90 + (stage_id - 1) * 40 + rng.randint(0, 20)
            )
            insert_event(
                conn,
                build_event(
                    f"{session_id}_stg{stage_id}_start",
                    session_id,
                    user_id,
                    stage_start_time,
                    stage_id,
                    config_id,
                    EventType.STAGE_START.value,
                    {
                        "timer_seconds": 40 + stage_id * 4,
                        "move_limit": 14 + stage_id * 2,
                        "card_count": 8 if stage_id <= 2 else 10 + (stage_id - 2) * 2,
                        "token_start": 10,
                    },
                ),
            )

            if rng.random() < quit_prob_per_stage:
                insert_event(
                    conn,
                    build_event(
                        f"{session_id}_stg{stage_id}_quit",
                        session_id,
                        user_id,
                        stage_start_time + timedelta(seconds=rng.randint(8, 50)),
                        stage_id,
                        config_id,
                        EventType.QUIT.value,
                        {"reason": "player_left"},
                    ),
                )
                outcome = "quit"
                break

            # Assign pass/fail so observed completion tracks target (smooth decrease by stage).
            stage_failed = choose_pass_fail(config_id, stage_id)
            stage_dur_sec = (
                _seeded_stage_fail_duration_seconds(config_id, stage_id, rng)
                if stage_failed
                else _seeded_stage_clear_duration_seconds(config_id, stage_id, rng)
            )
            stage_end_time = stage_start_time + timedelta(seconds=stage_dur_sec)

            if stage_failed:
                is_move_fail = rng.random() < 0.5
                if is_move_fail:
                    fail_payload = {
                        "fail_reason": "moves",
                        "time_remaining": rng.randint(1, 10),
                        "moves_remaining": rng.choice([0, -1]),
                        "tokens_earned": 0,
                        "tokens_spent": 0,
                    }
                else:
                    fail_payload = {
                        "fail_reason": "time",
                        "time_remaining": rng.randint(-4, -1),
                        "moves_remaining": rng.randint(-3, 1),
                        "tokens_earned": 0,
                        "tokens_spent": 0,
                    }

                insert_event(
                    conn,
                    build_event(
                        f"{session_id}_stg{stage_id}_fail",
                        session_id,
                        user_id,
                        stage_end_time,
                        stage_id,
                        config_id,
                        EventType.STAGE_FAIL.value,
                        fail_payload,
                    ),
                )
                total_fails += 1
                outcome = "failed"
            else:
                cc = 8 if stage_id <= 2 else 10 + (stage_id - 2) * 2
                win_n = _SEED_STAGE_WIN_TOKENS[config_id][stage_id - 1]
                match_n = _seed_match_token_total(cc)
                insert_event(
                    conn,
                    build_event(
                        f"{session_id}_stg{stage_id}_match_gain",
                        session_id,
                        user_id,
                        stage_end_time - timedelta(seconds=2),
                        stage_id,
                        config_id,
                        EventType.RESOURCE_GAIN.value,
                        {"amount": match_n, "reason": "match"},
                    ),
                )
                insert_event(
                    conn,
                    build_event(
                        f"{session_id}_stg{stage_id}_win_gain",
                        session_id,
                        user_id,
                        stage_end_time - timedelta(seconds=1),
                        stage_id,
                        config_id,
                        EventType.RESOURCE_GAIN.value,
                        {"amount": win_n, "reason": "stage_complete"},
                    ),
                )
                extra_spend = 0
                if stage_id >= 5 and rng.random() < 0.38:
                    extra_spend = {"easy": 3, "balanced": 4, "hard": 4}[config_id]
                    insert_event(
                        conn,
                        build_event(
                            f"{session_id}_stg{stage_id}_freeze_spend",
                            session_id,
                            user_id,
                            stage_end_time - timedelta(seconds=0.5),
                            stage_id,
                            config_id,
                            EventType.RESOURCE_SPEND.value,
                            {"amount": extra_spend, "powerup_type": "freeze"},
                        ),
                    )
                insert_event(
                    conn,
                    build_event(
                        f"{session_id}_stg{stage_id}_complete",
                        session_id,
                        user_id,
                        stage_end_time,
                        stage_id,
                        config_id,
                        EventType.STAGE_COMPLETE.value,
                        {
                            "time_remaining": rng.randint(1, 10),
                            "moves_remaining": rng.randint(0, 6),
                            "total_moves_used": rng.randint(10, 22),
                            "tokens_earned": match_n + win_n,
                            "tokens_spent": extra_spend,
                        },
                    ),
                )
                max_stage_reached = stage_id

        stages_completed = max(stages_completed, max_stage_reached)
        
        # Update session summary row to reflect what actually happened (optional but good)
        conn.execute(
            """
            UPDATE sessions
            SET outcome = ?, total_fails = ?, stages_completed = ?
            WHERE session_id = ?
            """,
            (outcome, total_fails, stages_completed, session_id),
        )

    # Ensure every (config, stage) has at least one run so the dashboard shows all 10 stages.
    # Use full-progression sessions (stage 1 → 2 → … → N) so the funnel never increases:
    # "Starts" at stage N+1 can never exceed "Starts" at stage N.
    for config_id in configs:
        for stage_id in range(1, 11):
            row = conn.execute(
                "SELECT COUNT(*) as c FROM events WHERE config_id = ? AND stage_id = ?",
                (config_id, stage_id),
            ).fetchone()
            if row and row["c"] > 0:
                continue

            seed_session_id = f"s_seed_{config_id}_chain_{stage_id:02d}"
            seed_user_id = f"u_seed_{config_id}"
            seed_start = base_time + timedelta(days=3, minutes=stage_id * 10)

            # One session that plays stages 1, 2, … stage_id in order (each stage: start then complete or fail).
            # Always clear the chain: the old rule (fail when stage_id % 3 == 0) injected fails on 3/6/9 but never on 10,
            # which made stage 9 look harder than stage 10 in “Where Players Struggle.”
            will_fail_last = False
            outcome = "failed" if will_fail_last else "completed"
            total_fails = 1 if will_fail_last else 0

            conn.execute(
                """
                INSERT OR REPLACE INTO sessions
                (session_id, user_id, config_id, start_time, end_time,
                 outcome, total_time_seconds, total_fails,
                 total_tokens_spent, stages_completed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    seed_session_id,
                    seed_user_id,
                    config_id,
                    seed_start.isoformat() + "Z",
                    (seed_start + timedelta(minutes=stage_id + 1)).isoformat() + "Z",
                    outcome,
                    60 * (stage_id + 1),
                    total_fails,
                    0,
                    stage_id if not will_fail_last else stage_id - 1,
                ),
            )

            t = seed_start
            for s in range(1, stage_id + 1):
                t = t + timedelta(seconds=30)
                insert_event(
                    conn,
                    build_event(
                        f"{seed_session_id}_stg{s}_start",
                        seed_session_id,
                        seed_user_id,
                        t,
                        s,
                        config_id,
                        EventType.STAGE_START.value,
                        {
                            "timer_seconds": 40 + s * 4,
                            "move_limit": 14 + s * 2,
                            "card_count": 8 if s <= 2 else 10 + (s - 2) * 2,
                            "token_start": 10,
                        },
                    ),
                )
                stage_dur = (
                    _seeded_stage_fail_duration_seconds(config_id, s, rng)
                    if (s == stage_id and will_fail_last)
                    else _seeded_stage_clear_duration_seconds(config_id, s, rng)
                )
                t = t + timedelta(seconds=stage_dur)
                if s == stage_id and will_fail_last:
                    insert_event(
                        conn,
                        build_event(
                            f"{seed_session_id}_stg{s}_fail",
                            seed_session_id,
                            seed_user_id,
                            t,
                            s,
                            config_id,
                            EventType.STAGE_FAIL.value,
                            {
                                "fail_reason": "time",
                                "time_remaining": -3,
                                "moves_remaining": 0,
                                "tokens_earned": 0,
                                "tokens_spent": 0,
                            },
                        ),
                    )
                else:
                    cc_s = 8 if s <= 2 else 10 + (s - 2) * 2
                    win_s = _SEED_STAGE_WIN_TOKENS[config_id][s - 1]
                    match_s = _seed_match_token_total(cc_s)
                    insert_event(
                        conn,
                        build_event(
                            f"{seed_session_id}_stg{s}_match_gain",
                            seed_session_id,
                            seed_user_id,
                            t - timedelta(seconds=2),
                            s,
                            config_id,
                            EventType.RESOURCE_GAIN.value,
                            {"amount": match_s, "reason": "match"},
                        ),
                    )
                    insert_event(
                        conn,
                        build_event(
                            f"{seed_session_id}_stg{s}_win_gain",
                            seed_session_id,
                            seed_user_id,
                            t - timedelta(seconds=1),
                            s,
                            config_id,
                            EventType.RESOURCE_GAIN.value,
                            {"amount": win_s, "reason": "stage_complete"},
                        ),
                    )
                    insert_event(
                        conn,
                        build_event(
                            f"{seed_session_id}_stg{s}_complete",
                            seed_session_id,
                            seed_user_id,
                            t,
                            s,
                            config_id,
                            EventType.STAGE_COMPLETE.value,
                            {
                                "time_remaining": 10,
                                "moves_remaining": 4,
                                "total_moves_used": 16,
                                "tokens_earned": match_s + win_s,
                                "tokens_spent": 0,
                            },
                        ),
                    )

    # Seed a few designer decisions (Sprint 1 scale)
    seed_decisions(conn, base_time)

    # Seed a few intentional anomalies so validation is demonstrable in Sprint 1
    seed_intentional_anomalies(conn, base_time)


# Build an event dict for seeding.
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


# Insert an event and log anomalies.
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
                    "created_at": datetime.now(UTC).isoformat(),
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


def _random_decision_timestamp(rng: random.Random, year: int, month: int, day_min: int, day_max: int) -> str:
    """Wall-clock time for a designer note, biased toward work hours with occasional late edits."""
    day = rng.randint(day_min, day_max)
    if rng.random() < 0.85:
        hour = rng.randint(9, 17)
    elif rng.random() < 0.5:
        hour = rng.randint(8, 8)
    else:
        hour = rng.randint(18, 20)
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    return datetime(year, month, day, hour, minute, second).isoformat() + "Z"


# Insert demo decision log entries.
def seed_decisions(conn, base_time):
    """
    Seed >= 30 balancing decisions. Timestamps spread across days; evidence_links stored as JSON arrays.
    """
    rng = random.Random(20260326)
    configs = [ConfigId.EASY.value, ConfigId.BALANCED.value, ConfigId.HARD.value]
    evidence_pool = [
        ["Funnel chart, stages 3 and 4"],
        ["Stage stats, fail rate"],
        ["Easy vs hard comparison"],
        ["Simulation run before patch"],
        ["Exported CSV, last week"],
    ]
    # (change dict, one-line summary for UI, rationale)
    change_templates = [
        (
            {"timer_seconds_delta": 5},
            "Added 5s to the timer",
            "Fails were stacking up here; a little more time felt fair.",
        ),
        (
            {"timer_seconds_delta": -3},
            "Took 3s off the timer",
            "Runs were finishing with too much time left, so we wanted a bit more pressure.",
        ),
        (
            {"move_limit_delta": 2},
            "Raised move limit by 2",
            "Lots of move-based losses in telemetry; this was the smallest bump we tried.",
        ),
        (
            {"move_limit_delta": -2},
            "Lowered move limit by 2",
            "Stage felt a bit soft compared to the next one.",
        ),
        (
            {"mismatch_penalty_seconds_delta": -1},
            "Reduced mismatch penalty by 1s",
            "Fast players were getting punished too hard on bad luck.",
        ),
        (
            {"helper_cost_modifier": -1},
            "Cheaper helpers (about one token less)",
            "People weren’t using hints because the price felt steep next to earnings.",
        ),
        (
            {"helper_cost_modifier": 1},
            "Pricier peek",
            "Peek was getting spammed; small nudge to see if behaviour changes.",
        ),
    ]
    jan_evidence = [
        ["First-week funnel"],
        ["Stage 1 and 2 stats only"],
        ["CSV export, Jan run"],
    ]
    decisions = []
    for i in range(34):
        cfg = configs[i % 3]
        change, summary, rationale = change_templates[i % len(change_templates)]
        if i % 11 == 0:
            rationale += " (Flag this one: might hurt low-skill players.)"
        change_obj = {"summary": summary, **change}

        # Split across late Jan (stages 1 and 2 only), all of February, and March.
        if i < 8:
            stage_id = 1 if i % 2 == 0 else 2
            ev = jan_evidence[i % len(jan_evidence)]
            ts = _random_decision_timestamp(rng, 2026, 1, 25, 31)
        elif i < 21:
            stage_id = ((i - 8) % 10) + 1
            ev = evidence_pool[i % len(evidence_pool)]
            ts = _random_decision_timestamp(rng, 2026, 2, 1, 28)
        else:
            stage_id = ((i - 21) % 10) + 1
            ev = evidence_pool[i % len(evidence_pool)]
            ts = _random_decision_timestamp(rng, 2026, 3, 1, 31)

        decisions.append(
            (
                f"dec_cw2_{i+1:02d}",
                cfg,
                stage_id,
                json.dumps(change_obj),
                rationale,
                json.dumps(ev),
                ts,
            )
        )

    conn.executemany(
        """
        INSERT OR REPLACE INTO decisions
        (decision_id, config_id, stage_id,
         change_json, rationale, evidence_links, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        decisions,
    )


def seed_bulk_quality_anomalies(conn, base_time):
    """
    Insert synthetic invalid stage_complete events with empty payloads.
    Each event yields 5 payload-field anomalies (required keys missing) => 30 events => 150 rows.
    """
    configs = [ConfigId.EASY.value, ConfigId.BALANCED.value, ConfigId.HARD.value]
    for i in range(30):
        ts = base_time + timedelta(days=3, seconds=i * 2)
        insert_event(
            conn,
            build_event(
                f"seed_qa_bulk_{i:03d}",
                f"s_qa_bulk_{i:04d}",
                f"u_{(i % 102) + 1:03d}",
                ts,
                (i % 10) + 1,
                configs[i % 3],
                EventType.STAGE_COMPLETE.value,
                {},
            ),
        )


# Insert invalid events for testing.
def seed_intentional_anomalies(conn, base_time):
    """
    Seed intentionally invalid events to demonstrate data quality checks.
    Hand-crafted cases plus bulk rows to meet CW2 minimum anomaly count.
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

    # 4) Bulk synthetic invalid events: 30 x 5 missing payload fields => 150 anomaly rows (CW2 minimum).
    seed_bulk_quality_anomalies(conn, base_time)
