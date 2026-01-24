/**
 * Pseudocode:
 * 1) Define aggregated metrics endpoints.
 * 2) Lock to designer role.
 */

export const metricsRoutes = [
  { method: "GET", path: "/metrics/funnel", handlerName: "MetricsController.funnel", requiresRole: "designer" },
  {
    method: "GET",
    path: "/metrics/stage-stats",
    handlerName: "MetricsController.stageStats",
    requiresRole: "designer",
  },
  {
    method: "GET",
    path: "/metrics/progression",
    handlerName: "MetricsController.progression",
    requiresRole: "designer",
  },
  {
    method: "GET",
    path: "/metrics/fairness",
    handlerName: "MetricsController.fairness",
    requiresRole: "designer",
  },
  {
    method: "GET",
    path: "/metrics/compare",
    handlerName: "MetricsController.compare",
    requiresRole: "designer",
  },
];
