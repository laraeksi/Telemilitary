# Final evaluation (CW2) — template

**Purpose:** Satisfy the coursework requirement for a **written evaluation** (method, outcomes, limitations).  
**Submission:** Copy into your main report or **export this file to PDF** if the brief asks for a separate evaluation document.

## 1. Aims and research questions

- *What did the telemetry-driven balancing dashboard set out to validate?*
- *Which difficulty/stage metrics were prioritised (e.g. funnel, fairness, progression)?*

## 2. Method

- **Instrument:** event schema, session model, SQLite storage (`backend/`), dashboard views (`client/`).
- **Dataset:** seeded telemetry — scope and minimums documented in `docs/dataset-vs-spec.md`.
- **Validation:** automated tests (`backend/tests/`) + manual scenarios (`docs/test-plan.md`).
- **Balancing workflow:** parameter listing/editing via API and Dashboard editor; decision log in DB.

## 3. Results (summary)

- *Summarise what the dashboard showed across easy / balanced / hard (e.g. drop-off, stage spikes).*
- *Reference one or two balancing decisions (from the decision log) and whether metrics supported them.*

## 4. Limitations

- Synthetic seeded data vs live cohorts.
- Simulator vs real player behaviour.
- Single-machine SQLite vs scaled deployment.

## 5. Future work

- A/B tests, live consent flows, richer anomaly tooling, accessibility audits (see `docs/accessibility.md`).

---

*Replace italic prompts with project-specific prose before submission.*
