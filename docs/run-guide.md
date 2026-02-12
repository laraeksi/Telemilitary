# Deployment Guide (CW1)

## Overview
This guide explains how to run the memory match game, telemetry API, and dashboard locally.

## Prerequisites
- Python 3.11+
- Node 18+

## Backend (Flask)
1. Open a terminal and go to `backend/`
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Run the server:
   - `python app.py`
4. Health check:
   - `GET http://localhost:5000/api/health`

The backend seeds a small dataset on first run (`backend/data/seed_telemetry.py`).

## Client (React)
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
From `backend/`:
- `pytest`
