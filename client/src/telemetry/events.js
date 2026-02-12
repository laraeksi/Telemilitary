// src/telemetry/events.js
import { emitEvent } from "./client";

function uuid() {
  return crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function nowIso() {
  return new Date().toISOString();
}

// persisted pseudonymous user id (meets “no personal data” requirement)
function getOrCreateId(key) {
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `u_${uuid().slice(0, 8)}`;
  localStorage.setItem(key, id);
  return id;
}

export const USER_ID = getOrCreateId("telemetry_user_id");

// session id for THIS run
export const SESSION_ID = `s_${uuid()}`;

// config_id must be one of: easy/balanced/hard (backend validates)
export function getConfigId() {
  return localStorage.getItem("config_id") || "balanced";
}

// stage_id must be 1..10 (backend:contentReference[oaicite:6]{index=6}
export function getStageId() {
  const v = Number(localStorage.getItem("stage_id") || 1);
  return Number.isFinite(v) ? v : 1;
}

/**
 * track(event_type, payload, meta)
 * event_type must match backend EventType values (e.g. "stage_start")
 */
export function track(event_type, payload = {}, meta = {}) {
  const config_id = meta.config_id || getConfigId();
  const stage_id = meta.stage_id ?? getStageId();

  emitEvent({
    event_id: uuid(),          // backend can also generate if missing
    timestamp: nowIso(),       
    event_type,              
    user_id: USER_ID,         
    session_id: SESSION_ID,   
    stage_id,                
    config_id,                
    payload,                  
  });
}
