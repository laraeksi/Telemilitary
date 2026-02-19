// JSDoc docs for telemetry event shapes.
// Helps keep event payloads consistent.
/**
 * Pseudocode:
 * 1) Define the telemetry event shape via JSDoc.
 * 2) Keep anomalies in a separate shape for validation warnings.
 * 3) Use these docs for consistent payloads across client/server.
 */

/**
 * @typedef {Object<string, unknown>} TelemetryEventPayload
 */

/**
 * @typedef {Object} TelemetryEvent
 * @property {string} eventId
 * @property {string} timestamp
 * @property {string} eventType
 * @property {string} userId
 * @property {string} sessionId
 * @property {number} stageId
 * @property {string} configId
 * @property {TelemetryEventPayload} payload
 */

/**
 * @typedef {Object} TelemetryAnomaly
 * @property {string} anomalyId
 * @property {string} eventId
 * @property {"missing_field"|"invalid_event_type"|"impossible_order"|"out_of_range"|"unknown"} anomalyType
 * @property {string} detectedBy
 * @property {"open"|"ignored"|"fixed"} resolutionStatus
 * @property {Object<string, unknown>=} details
 */

// Export placeholder to keep module non-empty.
// Use JSDoc types for consistency.
export const TELEMETRY_DOCS = {};
