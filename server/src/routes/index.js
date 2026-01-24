import { authRoutes } from "./authRoutes";
import { eventRoutes } from "./eventRoutes";
import { metricsRoutes } from "./metricsRoutes";
import { balancingRoutes } from "./balancingRoutes";
import { seedRoutes } from "./seedRoutes";

/**
 * Pseudocode:
 * 1) Combine all route groups.
 * 2) Provide to the HTTP server.
 */

export const routes = [
  ...authRoutes,
  ...eventRoutes,
  ...metricsRoutes,
  ...balancingRoutes,
  ...seedRoutes,
];
