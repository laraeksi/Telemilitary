<!-- How to run and deploy the project. -->
<!-- Covers dev and production steps. -->
# Deployment Guide (CW1)

## Overview
This guide covers local development and production deployment for the memory match game, telemetry API, and dashboard.
The frontend calls `/api/*` endpoints, so production deployment must either proxy `/api` to the backend or build the
frontend with an explicit API base URL.
<!-- Keep API paths consistent across envs -->

## Prerequisites
- Python 3.11+
- Node 18+

## Local development (current setup)
<!-- These steps assume a fresh clone with no deps installed. -->
<!-- Use two terminals for backend and client -->

### Backend (Flask)
1. Open a terminal and go to `backend/`
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Run the server:
   - `python app.py`
4. Health check:
   - `GET http://localhost:5000/api/health`

The backend seeds a small dataset on first run (`backend/data/seed_telemetry.py`).

### Client (React)
1. Open a second terminal and go to `client/`
2. Install dependencies:
   - `npm install`
3. Start the dev server:
   - `npm run dev`
4. Open the printed URL (default `http://localhost:5173`)

## Designer access
The dashboard uses a lightweight role header. From the UI:
- Click **Designer** on the home menu
- Open **Dashboard**

## How to run tests
From `backend/` (with requirements installed):
- `python -m pytest`

## Production deployment

### Backend (Flask API)
- Use a persistent disk for `backend/data/game.db`.
- Install dependencies: `pip install -r requirements.txt`
- Run with a production WSGI server (do not use `python app.py` in production):
  - Windows (Waitress):
    - `pip install waitress`
    - `waitress-serve --listen=0.0.0.0:5000 app:create_app`
  - Linux/macOS (Gunicorn):
    - `pip install gunicorn`
    - `gunicorn -w 2 -b 0.0.0.0:5000 "app:create_app()"`
- Health check: `GET http://<host>:5000/api/health`

### Frontend (Vite build)
1. In `client/`, install deps and build:
   - `npm install`
   - If hosting frontend separately, set the API base at build time:
     - PowerShell: `$env:VITE_API_BASE_URL="https://api.example.com"; npm run build`
     - Bash: `VITE_API_BASE_URL=https://api.example.com npm run build`
   - If proxying `/api` on the same domain, skip `VITE_API_BASE_URL` and just run `npm run build`.
2. Deploy the static output from `client/dist` to your host (Netlify, Vercel, S3, etc).

### Same-domain reverse proxy (optional)
If you want to keep `/api` relative paths, serve `client/dist` as static files and proxy `/api` to the Flask server.
