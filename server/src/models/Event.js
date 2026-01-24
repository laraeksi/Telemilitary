/**
 * Pseudocode:
 * 1) Document Event model shape.
 * 2) Persist telemetry events to storage.
 */

/**
 * @typedef {Object} Event
 * @property {string} eventId
 * @property {string} sessionId
 * @property {string} timestamp
 * @property {number} stageId
 * @property {string} eventType
 * @property {Object<string, unknown>} payload
 * @property {string} configId
 * @property {boolean=} isValid
 */

export const EVENT_MODEL_DOCS = {};
