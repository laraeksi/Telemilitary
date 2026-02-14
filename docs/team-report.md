# Project Report (Team Explanation Draft)

## What we built (prototype scope)
**Playable game**
- Browser memory match game with multiple stages (prototype currently covers stage 1–2 in gameplay logic).
- Core mechanics: timed play, move limits, matching pairs, powerups (peek/freeze/undo).

**Telemetry pipeline**
- Client emits structured events for sessions, stages, matches, resources, powerups, and failures.
- Backend validates event structure and stores telemetry in SQLite.

**Secure login/registration system for users with the designer role**
- Any user can register as a designer using a chosen username and a password to view the analytics dashboard.
- The credentials for registered users are stored in a local database and are not visible to any user.
- No personal information is collected from a user with the player role and their access to the dashboard is restricted.
- Should it be that a user chooses an existing username for registration, an error prompt will be triggered and the user will be requested to choose another username.
- Logged in users will be instantly logged out if they decide to return to the main menu.

**Designer dashboard**
- Funnel view (completion rate by stage)
- Difficulty/spike view (failure rates)
- Progression curves (avg time + net tokens per stage)
- Fairness comparison (fast vs slow segment gap)
- Config comparison (easy vs hard gap)

**Balancing tools**
- Rule-based suggestions (6 rules)
- Simulation preview for timer/move changes
- Decision log endpoint (recording changes + rationale)

## What is not yet built (CW2 scope)
- Full 10+ stage gameplay experience in the client.
- Full telemetry dataset size (1500+ events, 80+ sessions, 40+ users).
- Advanced designer parameter editor (UI for editing stage configs directly).
- Expanded testing (15+ automated + 8 manual scenarios with evidence).
- Full documentation pack in PDF format.

## Prioritised requirements and prototype goals
1. **Playable game loop** — at least 2 stages to demonstrate telemetry.
2. **Telemetry capture** — send events to backend with validation.
3. **Dashboard views** — show funnel, difficulty, progression, fairness.
4. **Balancing toolkit** — rule suggestions + simulation preview.
5. **Usable seeded dataset** — dashboard works without live play.

## Architecture overview
**Client (React)**
- Game UI/state
- Telemetry capture (events)
- Dashboard UI

**Server (Flask + SQLite)**
- Ingest and validate events
- Aggregate metrics for analytics
- Provide balancing rules and simulation
- Export CSV for designers

## Data model overview
Main entities (SQLite tables):
- `users` (pseudonymous user IDs)
- `sessions` (session run with outcome)
- `events` (telemetry stream)
- `anomalies` (validation issues)
- `configs`, `stages`, `helpers`, `token_rules` (balancing parameters)
- `decisions` (designer change log)

Telemetry event schema:
- `timestamp`, `event_type`, `user_id`, `session_id`
- `stage_id`, `config_id`
- `payload` (event-specific fields)

## Evaluation approach (current)
Small-scale validation:
- Played Stage 1 and verified funnel updates.
- Ran balancing simulation to see “before vs after” rates.
- Seeded anomalies to confirm validation flags appear.

Metrics used:
- Completion rate by stage
- Failure rate and drop-off spikes
- Fairness gap between segments (fast vs slow)

## Risks and plan for Coursework 2
**Risks**
- Dataset size short of CW2 minimum.
- UI still prototype-level (charts are basic).
- Limited end-to-end testing evidence.
- Manual process for adding new stages.

**CW2 plan**
- Expand to 10+ stages with complete telemetry coverage.
- Generate full dataset (1500+ events, 80+ sessions, 40+ users).
- Add UI for editing stage parameters directly.
- Add more automated tests + full manual test evidence.
- Improve documentation and evaluation detail.

## How to run
Backend:
- `cd backend`
- `python -m pip install -r requirements.txt`
- `python app.py`

Client:
- `cd client`
- `npm install`
- `npm run dev`

Dashboard:
- Open the app and select **Designer** to view charts and run simulations.

## How the client and backend connect
- The client posts events to `/api/events`.
- The backend validates and stores events in SQLite.
- The dashboard fetches aggregated metrics from `/api/metrics/*`.
- Balancing uses `/api/balancing/*` endpoints.

## Summary
The prototype demonstrates the full telemetry loop: game → telemetry → analytics → balancing. It is a strong foundation for CW2 work, with clear next steps focused on scale, polish, and testing.
