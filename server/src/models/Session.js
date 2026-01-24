/**
 * Pseudocode:
 * 1) Document Session model shape.
 * 2) Attach summary stats later.
 */

/**
 * @typedef {Object} Session
 * @property {string} sessionId
 * @property {string} userId
 * @property {string} configId
 * @property {string} startTime
 * @property {string=} endTime
 * @property {"completed"|"quit"|"failed"=} outcome
 * @property {number=} totalTimeSeconds
 * @property {number=} totalFails
 * @property {number=} totalTokensSpent
 */

export const SESSION_MODEL_DOCS = {};
