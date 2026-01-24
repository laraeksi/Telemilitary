# Architecture Notes (Scaffold)

## Overview

- Client emits telemetry via `client/telemetry/emitEvent.ts`.
- Server ingests events via `/events` and validates anomalies.
- Metrics and balancing endpoints are aggregated server-side.
- Simulation service replays historical failures to estimate outcomes.

## Shared config

- `shared/stages.ts` holds stage parameters and helper costs.
- Config definitions live in `shared/types.ts`.

## TODO

- Decide on framework and persistence layer.
- Add API client for dashboard pages.
