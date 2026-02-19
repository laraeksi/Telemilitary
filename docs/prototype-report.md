<!-- Prototype report summary. -->
<!-- Short summary of CW1 outcomes. -->
# Prototype Report (CW1)

## Executive summary
<!-- Short overview used for CW1 submission -->
<!-- Keep within 2-3 sentences -->
Telemilitary is a small browser memory match game with telemetry and a designer dashboard. The system captures structured events, computes funnel and difficulty metrics, and provides rule-based balancing suggestions with a lightweight simulation preview.

## Prioritised requirements
1. Playable game with at least two stages (CW1 prototype scope)
2. Telemetry capture of key events (stage start, match, fail, quit)
3. Designer dashboard with funnel + stage stats + progression views
4. Balancing suggestions + simulation preview

## Architecture v1
- React client for gameplay and dashboard
- Flask API for event ingestion, metrics, and balancing
- SQLite for seeded telemetry data

## Telemetry schema (CW1)
Telemetry event fields:
- event_id (generated server-side)
- timestamp (ISO 8601)
- event_type (session_start, stage_start, match_success, etc.)
- user_id, session_id (pseudonymous)
- stage_id, config_id
- payload (event-specific fields)

## Initial evaluation evidence
CW1 demo shows:
- events stored successfully
- funnel view highlights stage drop-off
- simulation converts time-based fails to completes

## Sprint plan for CW2
- Expand to 10 stages and 12+ event types
- Add fairness comparison and configurable parameter editor
- Seed full dataset (1500+ events, 80+ sessions)
- Full automated + manual testing evidence
