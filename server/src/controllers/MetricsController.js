import { getFunnelMetrics } from "../services/metrics/funnel";
import { getStageStats } from "../services/metrics/stageStats";
import { getProgressionMetrics } from "../services/metrics/progression";
import { getFairnessMetrics } from "../services/metrics/fairness";
import { getCompareMetrics } from "../services/metrics/compare";

/**
 * Pseudocode:
 * 1) Call metric services by endpoint.
 * 2) Return aggregated data for dashboard.
 */

export const funnel = async (configId) => getFunnelMetrics(configId);

export const stageStats = async (configId) => getStageStats(configId);

export const progression = async (configId) => getProgressionMetrics(configId);

export const fairness = async (segment, configId) => getFairnessMetrics(segment, configId);

export const compare = async (configs) => getCompareMetrics(configs);
