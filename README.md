# Telemilitary
Indie game telemetry and progression balancing prototype.

## Overview
Telemilitary is a browser-based memory match game with a telemetry pipeline and
designer dashboard. The client emits structured gameplay events, the backend
validates and stores them, and the dashboard visualizes funnel, difficulty,
progression, and fairness metrics.

## Features
- Memory match game with multiple stages and powerups
- Telemetry event capture (sessions, stages, matches, resources)
- Dashboard analytics (funnel, difficulty spikes, progression, fairness)
- Balancing tools (rule-based suggestions and simulation preview)
- CSV export for telemetry events

## Tech Stack
- Frontend: React + Vite
- Backend: Flask + SQLite
- Tests: Pytest

## Repo Structure
- `client/` React app (game + dashboard)
- `backend/` Flask API (ingestion, metrics, balancing)
- `shared/` JSDoc type definitions and shared configs
- `docs/` project documentation

## Local Development

### Backend (Flask)
1. `cd backend`
2. `python -m pip install -r requirements.txt`
3. `python app.py`
4. Health check: `http://localhost:5000/api/health`

The backend seeds a small telemetry dataset on first run.

### Client (React)
1. `cd client`
2. `npm install`
3. `npm run dev`
4. Open the printed URL (default `http://localhost:5173`)

The client proxies `/api` to the backend in development.

## Designer Access
From the home menu, choose **Designer** to reach the login/register flow and
open the dashboard.

## Tests
From `backend/`:
- `python -m pytest`

## Configuration
- Dev API base is proxied; production builds can set:
  - PowerShell: `$env:VITE_API_BASE_URL="https://api.example.com"; npm run build`
  - Bash: `VITE_API_BASE_URL=https://api.example.com npm run build`

## Notes
- This is a coursework prototype; see `docs/` for reports and diagrams.
