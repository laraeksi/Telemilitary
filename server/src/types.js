/**
 * Pseudocode:
 * 1) Document shared server types with JSDoc.
 * 2) Keep route metadata in a simple structure.
 */

/**
 * @typedef {"GET"|"POST"|"PUT"|"PATCH"|"DELETE"} HttpMethod
 */

/**
 * @typedef {Object} RouteDefinition
 * @property {HttpMethod} method
 * @property {string} path
 * @property {string} handlerName
 * @property {"player"|"designer"=} requiresRole
 */

/**
 * @typedef {Object} RequestContext
 * @property {string=} userId
 * @property {"player"|"designer"=} role
 */

/**
 * @typedef {Object} TelemetryEventRecord
 * @property {string} eventId
 * @property {string} sessionId
 * @property {string} timestamp
 * @property {number} stageId
 * @property {string} eventType
 * @property {Object<string, unknown>} payload
 * @property {string} configId
 * @property {boolean=} isValid
 */

export const SERVER_TYPE_DOCS = {};
