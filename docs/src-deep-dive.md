# Server src deep dive (non-line-by-line)

This document explains what each file in `server/src` is for, in clear terms. It is not line-by-line; it focuses on intent, responsibilities, inputs/outputs, and how files connect.

## `Index.java`
- Purpose: A placeholder entry point for the backend.
- What it does: It loops over the route list and prints each route (method + path + handler).
- Why it exists: To show how the server would eventually start and wire routes, even before a real web framework is chosen.
- How it connects: Uses `routes.Index` for the full route list and `types.Types` for the route shape.

## `config/Env.java`
- Purpose: Central place to read environment settings.
- What it does:
  - Reads `DATABASE_URL`, `ADMIN_PASSWORD`, and `SEED_MODE` from environment variables.
  - If a value is missing and no fallback exists, it throws an error.
  - Stores the values in the `ENV` object so other code can use them.
- Why it exists: Server configuration should not be hardcoded; environments (dev/prod) use different values.

## `controllers/` (request handlers)
These files represent the "what should happen when an API request comes in" layer. Controllers should be thin: validate input, call services, return a response.

### `controllers/AuthController.java`
- Purpose: Temporary login and "who am I" endpoints.
- What it does:
  - `login` returns a role token (designer vs player) based on username.
  - `getMe` returns current user info from the request context.
- Why it exists: Scaffolds authentication flow until a real auth system is added.

### `controllers/EventController.java`
- Purpose: Handles telemetry events coming from the client/game.
- What it does:
  - Validates events using `EventValidator`.
  - Pretends to store the event and anomalies (placeholder).
  - Lists events (placeholder).
  - Exports CSV (placeholder).
- Why it exists: Telemetry is the backbone for dashboards, balancing, and analysis.

### `controllers/MetricsController.java`
- Purpose: Provides dashboard metrics.
- What it does: Calls metric services like funnel, stage stats, progression, fairness, and compare.
- Why it exists: Keeps the API responses consistent and isolates where metrics are computed.

### `controllers/BalancingController.java`
- Purpose: Balancing toolkit endpoints.
- What it does:
  - Reads and saves balancing parameters.
  - Returns rule-based suggestions.
  - Runs balance simulations.
  - Manages decision logs.
- Why it exists: Designers need a toolkit to tune difficulty and track decisions.

### `controllers/SeedController.java`
- Purpose: Seed data endpoint.
- What it does: Runs the seed generator to create synthetic data (placeholder).
- Why it exists: Useful for testing dashboards before real telemetry exists.

## `middleware/Auth.java`
- Purpose: Simple, mock authentication and authorization.
- What it does:
  - `mockAuthenticate` maps a token to a role.
  - `requireRole` throws an error if the current user is not allowed.
- Why it exists: Protects designer-only endpoints even in scaffold mode.

## `models/` (data shapes)
These classes are the intended shapes of data. They are not tied to a database yet.

### `models/User.java`
- Represents: A player.
- Key fields: `userId`, `createdAt`, `segmentTags`.
- Used by: Sessions, metrics segmentation, and role checks.

### `models/Session.java`
- Represents: One play session.
- Key fields: `sessionId`, `userId`, `configId`, times, outcomes, totals.
- Used by: Funnels and aggregated session stats.

### `models/Event.java`
- Represents: One telemetry event.
- Key fields: `eventId`, `sessionId`, `timestamp`, `stageId`, `eventType`, `payload`, `configId`, `isValid`.
- Used by: Validation, anomaly detection, metrics aggregation.

### `models/Stage.java`
- Represents: Stage configuration.
- Key fields: `stageId`, `name`, `baseParameters`, `completionRule`.
- Used by: Balancing, simulation, and UI alignment.

### `models/Config.java`
- Represents: Difficulty presets (easy/balanced/hard).
- Key fields: `configId`, `label`, `parameterSet`.
- Used by: Compare metrics and balancing parameters.

### `models/Anomaly.java`
- Represents: A validation issue in telemetry.
- Key fields: `anomalyId`, `eventId`, `anomalyType`, `detectedBy`, `resolutionStatus`, `details`.
- Used by: Data quality tracking and debugging.

### `models/BalancingRule.java`
- Represents: A balancing rule suggestion.
- Key fields: `ruleId`, `name`, `triggerCondition`, `suggestedChange`, `explanation`.
- Used by: Balancing suggestions endpoint.

### `models/DecisionLog.java`
- Represents: A record of a design decision.
- Key fields: `decisionId`, `configId`, `stageId`, `change`, `rationale`, `evidenceLinks`, `timestamp`.
- Used by: Auditing why balance changes were made.

## `routes/` (API map)
Routes define the available endpoints and which controller methods handle them.

### `routes/AuthRoutes.java`
- Provides `/auth/login` and `/me`.
- No role required for these endpoints.

### `routes/EventRoutes.java`
- Provides `/events` POST for ingestion.
- Provides `/events` GET and `/export/events.csv` for designers only.

### `routes/MetricsRoutes.java`
- Provides metrics endpoints for dashboards.
- All endpoints require designer role.

### `routes/BalancingRoutes.java`
- Provides balancing endpoints: parameters, suggestions, simulation, decisions.
- All endpoints require designer role.

### `routes/SeedRoutes.java`
- Provides `/seed` to generate synthetic data.
- Designer only (so it does not get used by players).

### `routes/Index.java`
- Combines all route lists into one big list for the server to register.

## `services/` (business logic)
Services are where real data processing should live. They are currently placeholders.

### `services/metrics/Funnel.java`
- Goal: Compute how many players move from stage start to stage completion.
- Inputs: `configId`.
- Output: List of stage funnel metrics (placeholder).

### `services/metrics/StageStats.java`
- Goal: Compute stats like fail rate, average time, retries per stage.
- Inputs: `configId`.
- Output: Per-stage stats list (placeholder).

### `services/metrics/Progression.java`
- Goal: Summarize time/moves/tokens across stages.
- Inputs: `configId`.
- Output: Progression summary (placeholder).

### `services/metrics/Fairness.java`
- Goal: Compare different player segments.
- Inputs: `segment`, `configId`.
- Output: Segment comparison stats (placeholder).

### `services/metrics/Compare.java`
- Goal: Compare easy/balanced/hard configs.
- Inputs: array of config IDs.
- Output: Comparison results (placeholder).

### `services/balancing/Rules.java`
- Goal: Define rule logic that checks metrics and suggests changes.
- What it contains:
  - Several rule functions (fail rate high, moves fails dominant, etc).
  - A list of all rules.
  - A context object for inputs and a suggestion object for output.
- Why it matters: This is the core of automated balancing suggestions.

### `services/balancing/Suggestions.java`
- Goal: Run all rules and return the suggestions.
- What it does: Builds a placeholder context, runs each rule, and collects non-null results.

### `services/balancing/Parameters.java`
- Goal: Load/save the current tuning parameters for a config.
- What it does: Placeholder read/write with return values.

### `services/balancing/DecisionLog.java`
- Goal: Read/write designer decisions about balancing.
- What it does: Placeholder list/create of decision entries.

### `services/simulation/SimulateBalanceChange.java`
- Goal: Predict how changes (extra time, extra moves) would affect outcomes.
- What it does: Placeholder method that returns empty predictions.
- Why it matters: Lets designers see "what if" impacts before changing live values.

## `validators/EventValidator.java`
- Purpose: Validate incoming telemetry events.
- What it does:
  - Checks required fields are present.
  - Checks `eventType` is one of the allowed types.
  - Creates anomalies for missing/invalid values.
- Why it exists: Prevents bad data from corrupting analytics.

## `types/Types.java`
- Purpose: Small shared type definitions for the server.
- What it contains:
  - `HttpMethod` enum.
  - `Role` enum.
  - `RouteDefinition` structure.
  - `RequestContext`.
  - `TelemetryEventRecord`.
- Why it exists: Keeps core shapes consistent across routing and middleware.
