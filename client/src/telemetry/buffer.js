// Simple in-memory buffer for stage events.
// Useful for batching per-stage telemetry.
let stageBuffer = [];

export function bufferStage(evt) {
    // Collect per-stage events before flush.
    // This is a simple in-memory queue.
    stageBuffer.push(evt);
}

export function clearBuffer() {
    // Reset the buffer after send.
    stageBuffer = [];
}

export function getBuffer() {
  // Return a copy so callers can't mutate in-place.
  // Useful for debugging in devtools.
  return [...stageBuffer];
}