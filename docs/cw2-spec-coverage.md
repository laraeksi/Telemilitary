# CW2 spec coverage checklist (COMM2020 Project 7)

Use this as a **traceability matrix** between the project brief and evidence in the repository or report.  
**PDFs for submission:** export the linked Markdown files (or paste into Word) and **Print → Save as PDF** for `evaluation`, `ethics/legal`, and `software inventory` deliverables where the brief asks for separate documents.

| Spec area | Requirement (summary) | Evidence in repo | Status |
|-----------|------------------------|------------------|--------|
| **§4.1 Seeded dataset** | ≥1,500 events, ≥80 sessions, ≥40 users, 3 configs, ≥30 decisions, ≥150 anomalies | `backend/data/seed_telemetry.py`; verification steps in `docs/dataset-vs-spec.md` | ✅ Met after fresh seed (see table in dataset doc) |
| **Balancing toolkit** | Parameter editor with **≥8** adjustable parameters | `GET/PUT` stage config in `backend/routes/balancing.py` + **Balancing parameter editor** block in `client/src/pages/Dashboard.jsx` (9 fields: card count, timer, moves, mismatch penalty, peek/freeze/shuffle costs, per_match, on_complete) | ✅ |
| **User types** | Player / Designer / Maintainer | **Player:** game UI. **Designer:** login + dashboard (`DesignerLogin`, `Dashboard.jsx`). **Maintainer:** operational role — `docs/maintainer-handover.md` + home menu **Maintainer / ops** (`Menu.jsx`: health check + doc pointers; not a third login) | ✅ Explained |
| **Automated tests** | e.g. 15 automated (per your test plan) | `backend/tests/` — run `python -m pytest` from `backend/` | ✅ 15 tests (verify locally) |
| **Manual / E2E** | e.g. 8 scenarios | `docs/test-plan.md` | ✅ |
| **Evaluation** | Final evaluation (method, results, limitations) | `docs/evaluation-cw2.md` — **export to PDF** for marker | 📝 Content for report |
| **Ethics & legal** | Privacy, consent, data handling | `docs/ethics-and-legal-cw2.md` — **export to PDF** | 📝 Content for report |
| **Software inventory** | Dependencies and data sources | `docs/software-inventory.md` — expand versions as needed; **export to PDF** | 📝 Update + PDF |
| **Accessibility** | Inclusive design / a11y considerations | `docs/accessibility.md` + implemented patterns (keyboard shortcuts, responsive UI, audio unlock on gesture) | 📝 + code |

## Quick verification commands

**Backend tests:** from `backend/`, `python -m pytest`  

**Dataset counts:** see `docs/dataset-vs-spec.md` (SQLite queries). Reset `game.db` if counts look stale (seed runs only when `events` is empty).

## Notes for markers

- **Viewer vs Maintainer:** the app may use a **viewer** (read-only) mode on the dashboard; **Maintainer** is documented as deployment, tests, backups, and repository hygiene — consistent with coursework handover practice.
- **PDFs:** **Markdown sources** are in the repo; final **PDF** submission is a **local export** step (Word/Pandoc/print-to-PDF).
