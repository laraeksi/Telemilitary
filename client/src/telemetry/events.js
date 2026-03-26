/**
 * High-level telemetry helpers.
 *
 * This wraps the low-level sender so the game can just call:
 * - `startSession(configId)`
 * - `trackEvent(type, payload)`
 * - `endSession(outcome)`
 *
 * It also centralises consent checks so we don’t accidentally send telemetry when the
 * player hasn’t opted in.
 */
import { apiUrl } from "../api/base";
import { emitEvent, getOrCreateId, nowIso } from "./client";

const USER_KEY = "telemetry_user_id_v1";
const SESSION_KEY = "telemetry_session_id_v1";
const CONFIG_KEY = "telemetry_config_id_v1";
const CONSENT_KEY = "telemetry_consent_v1";

let userId = null;
let sessionId = null;
let configId = null;

function hasConsent() {
  try {
    // Only send events if the user opted in.
    return localStorage.getItem(CONSENT_KEY) === "yes";
  } catch {
    return false;
  }
}

async function ensureUserId() {
  if (userId) return userId;
  const localId = getOrCreateId(USER_KEY, "u");
  // Try to let the backend assign a canonical user id.
  // If the backend is down, we still keep working with a local id.
  try {
    const res = await fetch(apiUrl("/api/player/identify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_user_id: localId }),
    });
    if (res.ok) {
      const data = await res.json();
      userId = data.user_id || localId;
      return userId;
    }
  } catch {
    // fall back to local ID if backend unavailable
  }
  userId = localId;
  return userId;
}

export async function startSession(config) {
  if (!hasConsent()) return { skipped: true };
  configId = config;
  localStorage.setItem(CONFIG_KEY, configId);

  const currentUserId = await ensureUserId();
  const startedAt = nowIso();

  try {
    // Ask backend to create a session row (so dashboard can query sessions cleanly).
    const res = await fetch(apiUrl("/api/sessions/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUserId, config_id: configId, started_at: startedAt }),
    });
    if (res.ok) {
      const data = await res.json();
      sessionId = data.session_id;
      localStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch {
    // ignore, allow local session fallback below
  }

  if (!sessionId) {
    // Fallback to a local session id (keeps telemetry linkable even offline).
    sessionId = getOrCreateId(SESSION_KEY, "s");
  }

  // Record a session_start event in the telemetry stream too (separate from sessions table).
  await trackEvent("session_start", {
    stageId: 1,
    started_at: startedAt,
  });
}

export async function endSession(outcome, stageId) {
  if (!hasConsent()) return { skipped: true };
  const endedAt = nowIso();
  // Read cached ids if session hasn't been started.
  const currentSessionId = sessionId || localStorage.getItem(SESSION_KEY);
  const currentUserId = userId || localStorage.getItem(USER_KEY);
  const currentConfig = configId || localStorage.getItem(CONFIG_KEY);

  if (currentSessionId && currentUserId && currentConfig) {
    try {
      // Best-effort: update sessions table. If it fails, we still record telemetry below.
      await fetch(apiUrl("/api/sessions/end"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: currentSessionId,
          outcome,
          ended_at: endedAt,
        }),
      });
    } catch {
      // ignore session end failures
    }
  }

  // Always send a session_end event (this is what the telemetry validator expects too).
  await trackEvent("session_end", {
    stageId: stageId || 1,
    ended_at: endedAt,
    outcome,
  });
}

export async function trackEvent(eventType, payload = {}) {
  if (!hasConsent()) return { skipped: true };
  const currentUserId = await ensureUserId();
  // Pull session/config from memory or localStorage (so calls still work after refresh).
  const currentSessionId = sessionId || localStorage.getItem(SESSION_KEY) || getOrCreateId(SESSION_KEY, "s");
  const currentConfig = configId || localStorage.getItem(CONFIG_KEY) || "balanced";
  const stageId = payload.stageId ?? 1;
  const { stageId: _ignored, ...eventPayload } = payload;

  // Backend expects snake_case keys here (matches SQLite column names and validators).
  return emitEvent({
    timestamp: nowIso(),
    event_type: eventType,
    user_id: currentUserId,
    session_id: currentSessionId,
    stage_id: stageId,
    config_id: currentConfig,
    payload: eventPayload,
  });
}
