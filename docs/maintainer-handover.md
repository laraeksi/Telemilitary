# Maintainer handover (operations role)

The project brief refers to three stakeholder types: **Player**, **Designer**, and **Maintainer**.  
In this codebase, **Maintainer** is **not** implemented as a third login screen alongside Player and Designer. It maps to **operations and engineering** responsibilities: keeping the stack running, data safe, tests green, and releases documented.

**In the client:** the home menu (`client/src/pages/Menu.jsx`) includes **Maintainer / ops**, which opens a small modal with a live `GET /api/health` check and pointers to this document and the deployment guide — a signpost for markers, not a separate authenticated role.

## What a Maintainer does for Telemilitary

| Area | Actions |
|------|---------|
| **Repository** | Default branch policy, tags/releases, README and `docs/` kept current. |
| **Runtime** | Python backend + Node client versions per `deployment_guide.md`; environment variables (`VITE_API_BASE_URL` for production builds). |
| **Database** | `backend/data/game.db` — backup before upgrades; understand that **telemetry seed** runs only when `events` is empty (see `docs/dataset-vs-spec.md`). |
| **Quality** | Run `python -m pytest` from `backend/`; follow `docs/test-plan.md` for manual checks before demos. |
| **Security** | Designer/dashboard auth as implemented in `backend/utils/auth.py`; role guards via `require_dashboard()` and `require_designer()`; do not commit secrets; use HTTPS in production. |

## Handover checklist for a new Maintainer

1. Clone repo; install backend `requirements.txt` and client `npm install`.
2. Confirm `GET /api/health` after `python app.py`.
3. Run full pytest suite.
4. Read `docs/cw2-spec-coverage.md` and `docs/deployment_guide.md`.
5. Know how to reset telemetry DB for a **fresh seed** (delete or empty `game.db` per dataset doc).

## Relationship to “Designer”

- **Designer** = game/balance/analytics user (in-app).
- **Maintainer** = person who deploys, monitors, backs up data, and updates dependencies — aligned with GitHub + CI + documentation in the brief.
