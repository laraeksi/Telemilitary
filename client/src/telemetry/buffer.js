/**
 * Tiny in-memory buffer for telemetry.
 *
 * Right now we don’t heavily batch/stream events, but this buffer is useful for:
 * - debugging "what happened during this stage" without opening the network tab
 * - future batching if we decide to flush only at stage end
 *
 * Note: this buffer resets on page refresh because it’s just an array in memory.
 */
let stageBuffer = [];

export function bufferStage(evt) {
  // Collect per-stage events before a flush.
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