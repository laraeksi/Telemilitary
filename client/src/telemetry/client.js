// src/telemetry/client.js
import { bufferStage as bufferEvent, getBuffer, clearBuffer } from "./buffer";

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}

const PENDING_KEY = "telemetry_pending_batches_v1";

function loadPending() {
  try { return JSON.parse(safeGet(PENDING_KEY) || "[]"); } catch { return []; }
}
function savePending(arr) {
  safeSet(PENDING_KEY, JSON.stringify(arr));
}

// record every event (no network)
export function emitEvent(evt) {
  bufferEvent(evt);
}

// send ONE batch at stage end
export async function flushStageBatch(meta = {}) {
  const events = getBuffer();
  if (!events.length) return;

  // store pending first so nothing is lost
  const pending = loadPending();
  pending.push({ meta, events, createdAt: new Date().toISOString() });
  savePending(pending);

  // clear RAM buffer (stage ended)
  clearBuffer();

  // try upload pending batches
  await flushPendingBatches();
}

export async function flushPendingBatches() {
  const pending = loadPending();
  if (!pending.length) return;

  const remaining = [];
  for (const batch of pending) {
    try {
      const res = await fetch("/api/events/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      remaining.push(batch);
      break; // backend down: stop spamming
    }
  }

  savePending(remaining);
}
