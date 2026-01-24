import { getBalancingParameters, saveBalancingParameters } from "../services/balancing/parameters";
import { getBalancingSuggestions } from "../services/balancing/suggestions";
import { simulateBalanceChange } from "../services/simulation/simulateBalanceChange";
import { listDecisions, createDecision } from "../services/balancing/decisionLog";

/**
 * Pseudocode:
 * 1) Fetch and save balancing parameters.
 * 2) Return rule-based suggestions.
 * 3) Run simulation and store decisions.
 */

export const getParameters = async (configId) => getBalancingParameters(configId);

export const saveParameters = async (payload) => saveBalancingParameters(payload);

export const suggestions = async (configId) => getBalancingSuggestions(configId);

export const simulate = async (payload) => simulateBalanceChange(payload);

export const decisions = async () => listDecisions();

export const createDecisionEntry = async (payload) => createDecision(payload);
