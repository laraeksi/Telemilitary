// Low-level sender for telemetry events.
// Handles retrying pending events.
// src/telemetry/client.js
import { apiUrl } from "../api/base";

const PENDING_KEY = "telemetry_pending_events_v1";

function safeGet(key) {
  try {
    // Guard against storage errors (private mode).
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, val) {
  try {
    // Best-effort write to localStorage.
    localStorage.setItem(key, val);
  } catch {
    // ignore storage failures
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function getOrCreateId(key, prefix) {
  const existing = safeGet(key);
  if (existing) return existing;
  const value = `${prefix}_${crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`;
  safeSet(key, value);
  return value;
}

function loadPending() {
  try {
    // Stored as JSON array.
    return JSON.parse(safeGet(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePending(arr) {
  safeSet(PENDING_KEY, JSON.stringify(arr));
}

async function postEvent(evt) {
  // Send one event to the API.
  const res = await fetch(apiUrl("/api/events"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(evt),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function emitEvent(evt) {
  // Persist first so events survive reloads.
  const pending = loadPending();
  pending.push({ evt, createdAt: nowIso() });
  savePending(pending);

  await flushPendingEvents();
}

export async function flushPendingEvents() {
  const pending = loadPending();
  if (!pending.length) return;

  // Send in order and stop on first failure.
  const remaining = [];
  for (const item of pending) {
    try {
      await postEvent(item.evt);
    } catch {
      remaining.push(item);
      break;
    }
  }

  savePending(remaining);
}
