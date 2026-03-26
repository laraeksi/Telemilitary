<!-- Test plan for CW2 manual E2E and automated tests. -->
# Test Plan (CW2)

Prerequisites for all manual runs:

1. Backend: `cd backend` → `python -m pip install -r requirements.txt` → `python app.py` (health: `GET http://localhost:5000/api/health`).
2. Client: `cd client` → `npm install` → `npm run dev` → open the printed URL (default `http://localhost:5173`).

Record pass/fail, screenshots, and short notes in `testing_evidence.pdf` as required by the module brief.

---

## Manual end-to-end scenarios (8+ required)

### Scenario 1 — Telemetry consent (accept) and player entry

Steps:

1. Open the app at `/`. If the telemetry modal appears, click **Yes, I agree**.
2. Click **Player** (or navigate to `/difficulty`).
3. Choose a difficulty (e.g. Balanced) and start the game.

Expected:

- Consent is stored; modal does not reappear on refresh (same browser) after accepting.
- Difficulty screen loads; game route opens without errors.

Actual Results:
- Consent preference was stored successfully in localStorage.
- On page refresh the modal did not reappear, confirming persistence works.
- Selecting the player role loaded the difficulty selection screen as expected.
Evidence: screenshot(s) are recorded in `testing_evidence.pdf` (Manual end-to-end: Scenario 1).

---

### Scenario 2 — Telemetry consent (decline) and still play

Steps:

1. Clear site data for localhost (or use a private/incognito window) so consent is asked again.
2. Open `/`. Click **No thanks** on telemetry. Close the info modal with **Continue** if shown.
3. Go to **Player** → start a run and play at least one flip.

Expected:

- Game remains playable after declining telemetry.
- No crash; UI responsive.

Actual Results:
- A decline notice appeared on screen confirming no data is recorded.
- The game loaded and was fully playable with all stages and power-ups available.
- No console errors were observed during a full play session.
Evidence: screenshot(s) are recorded in `testing_evidence.pdf` (Manual end-to-end: Scenario 2).

---

### Scenario 3 — Complete stage 1 and see post-stage flow

Steps:

1. From `/difficulty`, pick any difficulty and play until **Stage 1** is cleared (all pairs matched).
2. Use **Next Stage** or equivalent when the win modal appears.

Expected:

- Win modal shows token/time/moves summary; confetti or completion feedback appears.
- Advancing does not error (or end-of-campaign flow works if on last stage).

Actual Results:
- The win modal appeared after matching all cards, showing time, moves, and token reward.
- Advancing to the next stage loaded the new board layout without any errors.
Evidence: screenshot(s) are recorded in `testing_evidence.pdf` (Manual end-to-end: Scenario 3).

---

### Scenario 4 — Stage failure (time or moves) and retry

Steps:

1. Start a new run (or retry until you can fail quickly).
2. Let the timer reach 0 **or** run out of moves (avoid matching pairs).
3. On **You Lost**, click **Retry** and confirm the stage resets.

Expected:

- Fail modal explains time vs moves.
- Retry resets board and counters; game is playable again.

Actual Results:
- The fail modal appeared and displayed the specific failure reason (time expired or moves exhausted).
- After clicking retry, the board was reshuffled and all counters were reset to starting values.
Evidence: screenshot(s) are recorded in `testing_evidence.pdf` (Manual end-to-end: Scenario 4).

---

### Scenario 5 — Quit to menu mid-session

Steps:

1. During an active stage, use **Quit** (or equivalent) to return to the main menu.

Expected:

- Navigation returns to `/` or menu without freezing.
- No unhandled error in browser console (optional check).

Actual Results:
- Quitting returned the player to the main menu with the role selector visible.
- The browser console showed no errors after the quit action.
- The network tab confirmed a session-end event was sent to the backend.
Evidence: screenshot(s) are recorded in `testing_evidence.pdf` (Manual end-to-end: Scenario 5).

---

### Scenario 6 — Designer login failure (invalid credentials)

Steps:

1. Go to `/designer`.
2. Enter a wrong username/password (not the demo account).
3. Submit the form.

Expected:

- Error message shown (e.g. invalid credentials or server unreachable).
- User is **not** taken to `/dashboard` with designer privileges.

Actual Results:
- An error message was displayed indicating invalid username or password.
- The page remained on the designer login screen with no redirect to the dashboard.
Evidence: screenshot(s) are recorded in `testing_evidence.pdf` (Manual end-to-end: Scenario 6).

---

### Scenario 7 — Viewer (read-only) dashboard

Steps:

1. Go to `/designer`.
2. Click **Continue as Viewer (read-only dashboard)** (or open `/dashboard` after setting viewer role if your build differs).
3. Wait for metrics/charts to load.

Expected:

- Dashboard loads with funnel / stage / progression / fairness / compare sections (or loading then data).
- CSV export and write actions that require designer are disabled or blocked as designed.

Actual Results:
- The dashboard loaded with funnel, progression, and fairness charts populated from seeded data.
- The CSV export button and simulation controls were disabled, confirming read-only access.
Evidence: screenshot(s) are recorded in `testing_evidence.pdf` (Manual end-to-end: Scenario 7).

---

### Scenario 8 — Designer dashboard: metrics, balancing, export (happy path)

Steps:

1. Go to `/designer`.
2. Log in with valid designer credentials (e.g. demo `designer` / `1234` if enabled, or a registered account from `/register`).
3. On `/dashboard`, confirm **Funnel** (or equivalent tab) shows data for a selected config.
4. Open **Balancing** suggestions and run a **simulation** with a small parameter change (e.g. timer delta) if the UI exposes it.
5. Click **Export CSV** (or equivalent) and confirm a file downloads.

Expected:

- Authenticated designer sees charts and no persistent error banner.
- Suggestions/simulation return without 401 (designer role present).
- CSV file downloads and opens with event rows.

Actual Results:
- The dashboard loaded with all analytics views and the simulation panel was accessible.
- Clicking CSV export downloaded a file with headers matching the telemetry schema and containing event rows.
- Adjusting the timer parameter in the simulation panel updated the predicted completion, failure, and quit rates.
Evidence: screenshot(s) are recorded in `testing_evidence.pdf` (Manual end-to-end: Scenario 8).

---

## Automated tests

Run from `backend/` (with requirements installed):

```bash
python -m pytest
```

Coverage areas (37 tests in `backend/tests/`):

- **Authentication** (`test_auth.py`, 6 tests): registration and login (success, duplicates, weak passwords, wrong credentials).
- **Balancing** (`test_balancing.py`, 2 tests): suggestions and simulation endpoint.
- **Telemetry validation** (`test_events.py`, 8 tests): valid events, missing fields, bad types, invalid stage/config bounds, bad payload, missing payload keys, and sequence rules.
- **CSV export** (`test_export.py`, 3 tests): headers/content/config filtering.
- **Ingestion / storage** (`test_ingestion.py`, 2 tests): event ingestion and anomaly logging.
- **Metrics / dashboard computations** (`test_metrics.py`, 4 tests): funnel, stage stats, progression, and fairness metrics.
- **RBAC** (`test_rbac.py`, 9 tests): player/viewer/designer permissions across endpoints.
- **Session management** (`test_sessions.py`, 3 tests): session start, end, and summary.

Capture pytest output (pass summary) for `testing_evidence.pdf` and repeat the command in `deployment_guide.pdf` / README as required.
