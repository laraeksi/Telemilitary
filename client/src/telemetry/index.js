/**
 * Telemetry module public API.
 *
 * This file is basically a "barrel" export: it re-exports the parts of telemetry
 * that the rest of the app is allowed to use. It keeps imports clean and helps
 * avoid circular dependencies as telemetry grows.
 */

// Re-export the public telemetry API (stable import paths across the app).
export { logEvent } from "./logger";
export { TELEMETRY_EVENTS } from "./events";
export {
  startSession,
  endSession,
  startRun,
  getSessionId,
  getRunId,
} from "./session";