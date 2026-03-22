<!-- Dependency and data inventory. -->
<!-- Summarizes libraries and data assets. -->
# Software and Data Inventory (CW1 / CW2)

See also [`cw2-spec-coverage.md`](cw2-spec-coverage.md) for how this inventory maps to submission requirements. Expand version pins below when preparing a **PDF appendix**.

## Dependencies
<!-- Versions are pinned in requirements/package-lock where applicable -->
<!-- Keep this list updated when deps change -->
- Flask 3.0.3 (backend framework)
- flask-cors 4.0.1 (CORS support)
- pytest 8.3.2 (automated tests)
- React (via Vite)

## Data
- Seeded telemetry stored in `backend/data/game.db`
- Telemetry seed script: `backend/data/seed_telemetry.py`

## Assets
- UI components and icons are custom or generated in code
