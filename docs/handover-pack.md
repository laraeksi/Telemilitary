# Client Handover Pack (CW2)

This document is for the next team (or future you) who needs to run, maintain, and extend Telemilitary. It covers the telemetry pipeline, the dashboard metrics, and the balancing workflow in practical terms.

## 1) Executive Overview

Telemilitary is a browser game with analytics built in. The frontend emits gameplay events, the Flask backend validates and stores them in SQLite, and the dashboard reads aggregated metrics to show progression, fairness, and drop-off. The balancing toolkit then suggests tuning changes and lets designers simulate outcomes before applying anything.

Useful existing docs:

- Deployment: [`deployment_guide.md`](./deployment_guide.md)
- Test plan: [`test-plan.md`](./test-plan.md)
- Architecture: [`architecture-diagram.md`](./architecture-diagram.md)
- Software inventory: [`software-inventory.md`](./software-inventory.md)

## 2) Quick Start (Local Run)

### 2A)

Prerequisites:

- Python 3.11+
- Node 18+

Backend (first time):

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Client (first time):

```bash
cd client
npm install
npm run dev
```

Health check:

```text
GET http://localhost:5000/api/health
```

On first run, `init_db()` in `backend/data/db.py` sets up the schema and seed data automatically (including telemetry seed data).

### 2B) Run tests

```bash
cd backend
python -m pytest
```

## 3) Operations and Maintenance Runbook

- Database path: `backend/config.py` (`Config.DB_PATH = "data/game.db"`).
- On startup:
  - schema is applied from `backend/data/schema.sql`
  - default configs/stages/helpers/token rules are seeded by `backend/data/db.py`
  - demo telemetry is seeded by `backend/data/seed_telemetry.py`
- Dev reset endpoint: `POST /api/seed` in `backend/routes/dev.py`.
  - Re-runs `init_db()`.
  - Use for local development only.

If your local data looks odd during testing, run `POST /api/seed` and refresh the dashboard.

## 4) Telemetry Pipeline

- Validation entry point: `validate_event()` in `backend/logic/telemetry.py`.
  - Checks required top-level fields (`REQUIRED_FIELDS`).
  - Checks event-specific payload keys (`required_payload_fields`).
- Sequence rule:
  - `stage_complete` and `stage_fail` need a prior `stage_start` for the same `session_id` and `stage_id`.
  - Enforced in `backend/routes/telemetry.py` (`ingest_event()`).
- Consent and pseudonymity:
  - Telemetry emission is gated in `client/src/telemetry/events.js`.
  - IDs are pseudonymous, not personal identifiers.
- Invalid events:
  - Stored with `is_valid = 0` and anomalies logged in `anomalies` table.
- Designer export:
  - `GET /api/export/events.csv` in `backend/routes/telemetry.py`.

## 5) Analytics Dashboard Mapping (Events -> charts)

All analytics are calculated in `backend/logic/metrics.py`.

- Funnel/drop-off:
  - Uses counts of `stage_start`, `stage_complete`, `stage_fail`, `quit`.
  - Main function: `get_funnel_metrics()`.
- Difficulty spikes:
  - Calculated in `get_stage_stats()`.
  - Flags based on combined thresholds (failure, retries, drop-off, pressure indicators).
- Progression curves:
  - Built in `get_progression_metrics()`.
  - Includes average time spent, moves used, tokens earned/spent.
- Fairness metrics:
  - Function: `get_fairness_metrics()`.
  - Segments:
    - `fast_vs_slow` (bottom/top 40% by `time_spent`)
    - `high_vs_low` (bottom/top 40% by `tokens_spent`)

If a new event should affect analytics, you must update `backend/logic/metrics.py` and the related tests.

## 6) Balancing Toolkit and Decision Log

Balancing endpoints (`backend/routes/balancing.py`):

- `POST /api/balancing/suggestions` (rule-based suggestions)
- `POST /api/balancing/simulate` (simulate impact, no persistence)
- `GET /api/balancing/parameters` (editable parameter model)

Decision log endpoints (`backend/routes/decisions.py`):

- `GET /api/decisions` (list decisions)
- `POST /api/decisions` (record a new decision)

The suggestion logic itself sits in `backend/logic/balancing.py` (`get_suggestions()`).

## 7) Extension Guide

### 7A) Adding a new telemetry event type (Checklist)

Follow this order to avoid regression.

1. Add the event type to `EventType` in `backend/models.py`.
2. Add required payload keys in `required_payload_fields` inside `validate_event()` in `backend/logic/telemetry.py`.
3. Confirm ingest behaviour in `backend/routes/telemetry.py` (`ingest_event()`):
   - payload stored as JSON
   - any event-order rules are enforced
4. Emit the event from frontend gameplay with `trackEvent("<new_event>", payload)` (normally in `client/src/pages/Game.jsx`).
5. Add representative samples in `backend/data/seed_telemetry.py`.
6. If this event should change charts, update aggregation logic in `backend/logic/metrics.py`.
7. Extend tests:
   - `backend/tests/test_events.py`
   - `backend/tests/test_metrics.py` (if analytics changes)

Important: payload key names must match backend validation exactly, or events will be logged as invalid/anomalies.

### 7B) Adding a new stage (Short checklist)

- Update `DIFFICULTY_CONFIGS` in `client/src/game/stages.js`.
- Update stage bounds where needed (currently `1..10`) in:
  - `backend/logic/telemetry.py`
  - `backend/routes/game_config.py`
- Update seeding logic in `backend/data/db.py` and telemetry seed coverage in `backend/data/seed_telemetry.py`.
