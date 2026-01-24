/**
 * Pseudocode:
 * 1) Define balancing toolkit endpoints.
 * 2) Protect them for designers.
 */

export const balancingRoutes = [
  {
    method: "GET",
    path: "/balancing/parameters",
    handlerName: "BalancingController.getParameters",
    requiresRole: "designer",
  },
  {
    method: "POST",
    path: "/balancing/parameters",
    handlerName: "BalancingController.saveParameters",
    requiresRole: "designer",
  },
  {
    method: "GET",
    path: "/balancing/suggestions",
    handlerName: "BalancingController.suggestions",
    requiresRole: "designer",
  },
  {
    method: "POST",
    path: "/balancing/simulate",
    handlerName: "BalancingController.simulate",
    requiresRole: "designer",
  },
  {
    method: "GET",
    path: "/decisions",
    handlerName: "BalancingController.decisions",
    requiresRole: "designer",
  },
  {
    method: "POST",
    path: "/decisions",
    handlerName: "BalancingController.createDecisionEntry",
    requiresRole: "designer",
  },
];
