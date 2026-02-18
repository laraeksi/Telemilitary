// src/telemetry/events.js
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
    return localStorage.getItem(CONSENT_KEY) === "yes";
  } catch {
    return false;
  }
}

async function ensureUserId() {
  if (userId) return userId;
  const localId = getOrCreateId(USER_KEY, "u");
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
    sessionId = getOrCreateId(SESSION_KEY, "s");
  }

  await trackEvent("session_start", {
    stageId: 1,
    started_at: startedAt,
  });
}

export async function endSession(outcome, stageId) {
  if (!hasConsent()) return { skipped: true };
  const endedAt = nowIso();
  const currentSessionId = sessionId || localStorage.getItem(SESSION_KEY);
  const currentUserId = userId || localStorage.getItem(USER_KEY);
  const currentConfig = configId || localStorage.getItem(CONFIG_KEY);

  if (currentSessionId && currentUserId && currentConfig) {
    try {
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

  await trackEvent("session_end", {
    stageId: stageId || 1,
    ended_at: endedAt,
    outcome,
  });
}

export async function trackEvent(eventType, payload = {}) {
  if (!hasConsent()) return { skipped: true };
  const currentUserId = await ensureUserId();
  const currentSessionId = sessionId || localStorage.getItem(SESSION_KEY) || getOrCreateId(SESSION_KEY, "s");
  const currentConfig = configId || localStorage.getItem(CONFIG_KEY) || "balanced";
  const stageId = payload.stageId ?? 1;
  const { stageId: _ignored, ...eventPayload } = payload;

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
