/**
 * Pseudocode:
 * 1) Document DecisionLog shape.
 * 2) Store human decisions about balancing changes.
 */

/**
 * @typedef {Object} DecisionLog
 * @property {string} decisionId
 * @property {"easy"|"balanced"|"hard"} configId
 * @property {number=} stageId
 * @property {Object<string, unknown>} change
 * @property {string} rationale
 * @property {string[]} evidenceLinks
 * @property {string} timestamp
 */

export const DECISION_LOG_DOCS = {};
