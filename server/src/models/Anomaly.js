/**
 * Pseudocode:
 * 1) Document Anomaly model shape.
 * 2) Store validation issues for analytics.
 */

/**
 * @typedef {Object} Anomaly
 * @property {string} anomalyId
 * @property {string} eventId
 * @property {"missing_field"|"impossible_order"|"out_of_range"|"unknown"} anomalyType
 * @property {string} detectedBy
 * @property {"open"|"ignored"|"fixed"} resolutionStatus
 * @property {Object<string, unknown>=} details
 */

export const ANOMALY_MODEL_DOCS = {};
