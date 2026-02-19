// Re-exports telemetry helpers in one place.
// Makes imports shorter for callers.
// src/telemetry/index.js
// Public API for the telemetry module

// Re-export the public telemetry API.
// This keeps imports consistent across the app.
export { logEvent } from "./logger";
export { TELEMETRY_EVENTS } from "./events";
export {
  startSession,
  endSession,
  startRun,
  getSessionId,
  getRunId,
} from "./session";