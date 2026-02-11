// src/telemetry/client.js
const API_BASE = "";

function safeGetItem(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key, value) {
  try { window.localStorage.setItem(key, value); } catch {}
}

export function getOrCreateId(key) {
  const existing = safeGetItem(key);
  if (existing) return existing;

  const id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
  safeSetItem(key, id);
  return id;
}

export function nowIso() {
  return new Date().toISOString();
}

const QUEUE_KEY = "telemetry_queue_v1";

function loadQueue() {
  try {
    return JSON.parse(safeGetItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  safeSetItem(QUEUE_KEY, JSON.stringify(queue));
}

async function postJson(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function flushQueue() {
  const queue = loadQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await postJson("/api/events", item);
    } catch {
      remaining.push(item);
      break;
    }
  }
  saveQueue(remaining);
}

export function emitEvent(event) {
  try {
    const queue = loadQueue();
    queue.push(event);
    saveQueue(queue);
    flushQueue();
  } catch {
    // never crash UI because telemetry failed
  }
}
