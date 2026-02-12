// src/telemetry/client.js
const PENDING_KEY = "telemetry_pending_events_v1";

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, val) {
  try {
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
    return JSON.parse(safeGet(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePending(arr) {
  safeSet(PENDING_KEY, JSON.stringify(arr));
}

async function postEvent(evt) {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(evt),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function emitEvent(evt) {
  const pending = loadPending();
  pending.push({ evt, createdAt: nowIso() });
  savePending(pending);

  await flushPendingEvents();
}

export async function flushPendingEvents() {
  const pending = loadPending();
  if (!pending.length) return;

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
