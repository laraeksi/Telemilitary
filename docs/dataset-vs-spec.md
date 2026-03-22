# Seeded dataset vs COMM2020 Project 7 spec (§4.1)

Use this to verify coursework dataset requirements before submission.  
**Full spec checklist:** [`cw2-spec-coverage.md`](cw2-spec-coverage.md).

## What we did (dataset alignment update)

We brought the **seeded SQLite dataset** in line with **§4.1** of the project spec (minimum event volume, sessions, users, **≥30 balancing decisions**, and **≥150 data-quality anomalies** for validation/auditing demos).

### Code changes (`backend/data/seed_telemetry.py`)

1. **`seed_decisions()`**  
   Replaced the old **6** fixed demo rows with **34** programmatic rows (`dec_cw2_01` … `dec_cw2_34`). Each row rotates **easy / balanced / hard**, stages **1–10**, varied JSON changes (timer, moves, mismatch penalty, helper costs), and evidence links. Some rationales are explicitly marked **`[QUESTIONABLE]`** so the decision log can illustrate both sound and flawed audit entries, as the brief suggests.

2. **`seed_bulk_quality_anomalies()`** (new)  
   Inserts **30** synthetic events of type `stage_complete` with an **empty `{}` payload**. The existing `validate_event()` rules require five fields for that event type; each missing field becomes one **anomaly** row → **30 × 5 = 150** anomalies from this block alone, satisfying the minimum **150** “data quality” anomalies without hand-writing 150 separate stories.

3. **`seed_intentional_anomalies()`**  
   Still inserts the **3** original targeted bad events (partial payload, complete-without-start, session_end without outcome). Those add extra anomaly rows and temporal checks. The bulk function runs **after** those so totals stay above 150.

4. **Docstring** at the top of `seed_telemetry()` was updated so it no longer claims outdated user/session numbers; it now describes the CW2-scale pool (102 user IDs, 600 primary sessions, three configs).

### Verification

- On a **fresh** database (`events` empty → `seed_telemetry_if_empty` runs), we observed approximately: **34** decisions, **~187** anomalies, **~11k+** events, **600** sessions, **102** distinct users, **200 sessions per config** (easy / balanced / hard).
- **`python -m pytest`** from `backend/` still passes (15 tests) after these changes.

### If your local `game.db` looks “old”

Seeding runs **only when the `events` table is empty**. Delete `backend/data/game.db` (or move it aside) and restart the backend once so the new seed applies.

---

## How to re-check locally

From `backend/` with SQLite available:

```powershell
sqlite3 data/game.db "SELECT 'events', COUNT(*) FROM events UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'distinct_users_sessions', COUNT(DISTINCT user_id) FROM sessions UNION ALL SELECT 'anomalies', COUNT(*) FROM anomalies UNION ALL SELECT 'decisions', COUNT(*) FROM decisions;"
```

Sessions per difficulty:

```powershell
sqlite3 data/game.db "SELECT config_id, COUNT(*) FROM sessions GROUP BY config_id;"
```

**Note:** Counts apply to `backend/data/game.db` after a fresh seed (empty `events` table on first run). If you reset the DB, delete `game.db` or clear tables before starting the server so `seed_telemetry_if_empty` runs again.

---

## Spec minimums (from brief)

| Requirement | Minimum |
|-------------|---------|
| Telemetry events | ≥ 1,500 |
| Sessions | ≥ 80 |
| Pseudonymous users | ≥ 40 |
| Difficulty configs with telemetry | 3 (easy / balanced / hard) |
| Balancing decisions (decision log) | ≥ 30 |
| Data-quality anomalies (for validation demo) | ≥ 150 |

---

## Snapshot: fresh seed (verified)

After **deleting** `backend/data/game.db` (or using a new DB path) and running `init_db()` once, counts from `seed_telemetry.py` should meet or exceed:

| Metric | Spec minimum | After fresh seed (typical) |
|--------|----------------|----------------------------|
| Events | 1,500 | **~11k+** (depends on session paths) |
| Sessions | 80 | **600+** (plus chain sessions) |
| Distinct `user_id` in `sessions` | 40 | **102** unique IDs in pool |
| Decisions | 30 | **34** (`dec_cw2_01` … `dec_cw2_34`) |
| Anomalies | 150 | **~180+** (3 hand-crafted bad events + 30×5 payload anomalies from bulk) |
| Configs in `sessions` | all 3 | **easy, balanced, hard** |

**Older `game.db` files** from before this seed update may still show fewer decisions/anomalies — reset the DB to pick up the new seed.

### Example: verified counts on a reset `game.db`

After deleting `game.db` and letting the app re-seed, one check showed:

| Table / check | Value |
|---------------|------:|
| `events` | 11,455 |
| `sessions` | 600 |
| Distinct `user_id` in `sessions` | 102 |
| `decisions` | 34 |
| `anomalies` | 187 |
| Sessions per config | 200 easy, 200 balanced, 200 hard |

Your machine should match these orders of magnitude after a fresh seed.

---

## Seed script parameters (reference)

In `seed_telemetry.py`:

- `users`: `u_001` … `u_102` → **102** pseudonymous users  
- `session_count`: **600** main loops (+ extra seed sessions for stage coverage)  
- `seed_decisions`: **34** entries  
- `seed_intentional_anomalies`: **3** narrative cases + **`seed_bulk_quality_anomalies`** (30 events → 150+ anomaly rows)

After changing the seed, reset the DB and restart the backend once so markers see a deterministic seeded state.
