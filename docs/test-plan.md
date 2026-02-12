# Test Plan (CW1)

## Manual end-to-end scenario (CW1 minimum)
Scenario: Play Stage 1 and view the dashboard funnel.

Steps:
1. Start backend (`python app.py`) and client (`npm run dev`).
2. Open the game, complete Stage 1.
3. Quit to menu.
4. Open the designer dashboard.
5. Verify the funnel metrics are visible.

Expected results:
- Stage 1 completion is recorded.
- Dashboard loads without errors.

Evidence:
- Record screenshots and add to `testing_evidence.pdf`.

## Automated tests
Run from `backend/`:
- `pytest`

Current automated coverage:
- telemetry validation (missing fields, invalid event types, invalid fail reason)
- metrics aggregation for stage events
