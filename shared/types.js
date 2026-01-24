/**
 * Pseudocode:
 * 1) Document shared shapes used across client/server.
 * 2) Keep these as JSDoc typedefs (no TypeScript required).
 * 3) Import this file only for reference if needed.
 */

/**
 * @typedef {"easy"|"balanced"|"hard"} ConfigId
 */

/**
 * @typedef {number} StageId
 */

/**
 * @typedef {"peek"|"freeze"|"shuffle"} HelperType
 */

/**
 * @typedef {"time"|"moves"} FailReason
 */

/**
 * @typedef {"session_start"|"session_end"|"stage_start"|"stage_complete"|"stage_fail"|"retry"|"quit"|"card_flip"|"match_success"|"match_fail"|"move_used"|"resource_gain"|"resource_spend"|"powerup_used"|"settings_change"} EventType
 */

/**
 * @typedef {"player"|"designer"} Role
 */

/**
 * @typedef {Object} BaseParameters
 * @property {number} cards
 * @property {number} timerSeconds
 * @property {number} moveLimit
 * @property {number} mismatchPenaltySeconds
 * @property {Object<string, number>} helperCosts
 * @property {number} tokenEarnPerMatch
 * @property {number} tokenEarnOnStageComplete
 */

/**
 * @typedef {Object} StageConfig
 * @property {StageId} stageId
 * @property {string} name
 * @property {BaseParameters} baseParameters
 * @property {"all_pairs_matched"} completionRule
 */

/**
 * @typedef {Object} ConfigDefinition
 * @property {ConfigId} configId
 * @property {string} label
 * @property {Partial<BaseParameters>=} parameterOverrides
 */

export const TYPE_DOCS = {};
