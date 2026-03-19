# Telemilitary
A browser-based memory game with telemetry-driven balancing and a designer analytics dashboard.

## Overview
Telemilitary combines a memory matching game with a telemetry pipeline and a
designer-facing dashboard. The client records structured gameplay events, the
backend validates and stores them, and the dashboard turns that data into
funnel, difficulty, progression, and fairness insights that can support balance
decisions.

## Features
- 10-stage memory match campaigns across `easy`, `balanced`, and `hard`
- Powerups for Hint, Freeze, and Undo, available by mouse or keyboard shortcuts (`H`, `F`, `U`)
- A shared token economy used for gameplay rewards, powerups, and cosmetic style unlocks
- A retry-aware streak reward system that grants `+5` tokens and `1` free Hint after 5 consecutive clears
- Dynamic player support features, including contextual hint text and more intense low-time audio pressure
- A difficulty-specific Stage 10 finale with custom messaging, celebration effects, and spoken feedback
- Responsive board scaling designed for both desktop and mobile play
- Telemetry capture for sessions, stages, matches, resources, retries, and quits
- Dashboard analytics for funnel progression, difficulty spikes, player progression, and fairness comparisons
- Balancing support through rule-based recommendations and simulation previews
- CSV export for telemetry events

## Tech Stack
- Frontend: React + Vite
- Backend: Flask + SQLite
- Tests: Pytest

## Repository Structure
- `client/` React application for the game and dashboard
- `backend/` Flask API for ingestion, metrics, simulation, and balancing logic
- `shared/` shared JSDoc types and configuration definitions
- `docs/` supporting documentation and diagrams

## Local Development

### Backend (Flask)
1. `cd backend`
2. `python -m pip install -r requirements.txt`
3. `python app.py`
4. Health check: `http://localhost:5000/api/health`

The backend seeds a demo telemetry dataset on first run.

### Client (React)
1. `cd client`
2. `npm install`
3. `npm run dev`
4. Open the printed URL (default `http://localhost:5173`)

In development, the client proxies `/api` requests to the backend.

## Designer Access
From the main menu, choose **Designer** to open the login and registration flow
and access the dashboard.

## Gameplay Notes
- Each difficulty contains 10 stages with its own pacing, pressure curve, and ending celebration.
- Cosmetic styles are purchased using the same token balance earned during gameplay.
- Final campaign completion presents a difficulty-specific message, finale sound, and spoken congratulation.
- Dashboard funnel metrics should be interpreted as stage-by-stage progression analytics rather than as a standalone difficulty ranking.

## Tests
From `backend/`:
- `python -m pytest`

## Configuration
- Dev API base is proxied; production builds can set:
  - PowerShell: `$env:VITE_API_BASE_URL="https://api.example.com"; npm run build`
  - Bash: `VITE_API_BASE_URL=https://api.example.com npm run build`

## Notes
- This project was developed as a coursework prototype; see `docs/` for diagrams and supporting material.
