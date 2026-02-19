// Logging utility for telemetry (console-based).
// Keeps a simple debug log for now.
// src/telemetry/logger.js
// Central telemetry logger (Sprint 1: console-based)

import { getSessionId, getRunId } from "./session";

/**
 * Logs a telemetry event.
 * In Sprint 1, events are written to the console.
 * In later sprints, this can be replaced with a backend API call.
 */
export function logEvent(eventType, payload = {}) {
  // Bundle all telemetry details in one object.
  const event = {
    eventType,
    sessionId: getSessionId(),
    runId: getRunId(),
    timestamp: Date.now(),
    payload,
  };

  // Sprint 1 output (visible in DevTools)
  // TODO: Replace with API call in later sprint.
  // eslint-disable-next-line no-console
  console.log("[TELEMETRY EVENT]", event);
}