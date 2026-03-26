/**
 * Telemetry "transport" layer (low-level sender).
 *
 * Idea: we queue events in `localStorage` first, then try to flush them to the backend.
 * That way, if the user refreshes the page or goes offline briefly, we don’t just lose
 * the telemetry stream.
 *
 * This is deliberately simple (no background service worker etc.) because it’s a student
 * project and we want the logic to be easy to follow/mark.
 */
import { apiUrl } from "../api/base";

const PENDING_KEY = "telemetry_pending_events_v1";

function safeGet(key) {
  try {
    // Guard against storage errors (private mode, blocked third-party storage, etc).
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
    // Ignore storage failures: telemetry is "nice to have", not gameplay-critical.
  }
}

export function nowIso() {
  // Using ISO timestamps keeps backend parsing consistent and timezone-safe.
  return new Date().toISOString();
}

export function getOrCreateId(key, prefix) {
  const existing = safeGet(key);
  if (existing) return existing;
  // Prefer `crypto.randomUUID()` when available; fall back to a timestamp+random string.
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
  // Send one event to the API (backend handles validation + storage).
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
  // Persist first so events survive reloads/crashes.
  const pending = loadPending();
  pending.push({ evt, createdAt: nowIso() });
  savePending(pending);

  // Then attempt to flush. If it fails, the queue stays for later.
  await flushPendingEvents();
}

export async function flushPendingEvents() {
  const pending = loadPending();
  if (!pending.length) return;

  // Send in order and stop on first failure.
  // Stopping early avoids reordering and makes the queue easier to reason about.
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
