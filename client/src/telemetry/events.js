// src/telemetry/events.js
import { emitEvent, getOrCreateId, nowIso } from "./client";

export const USER_ID = getOrCreateId("telemetry_user_id");
export const SESSION_ID = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);

export function track(type, data = {}) {
  emitEvent({
    type,
    ts: nowIso(),
    userId: USER_ID,
    sessionId: SESSION_ID,
    data,
  });
}
