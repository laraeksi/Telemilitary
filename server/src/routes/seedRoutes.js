/**
 * Pseudocode:
 * 1) Define seed endpoint for designer.
 */

export const seedRoutes = [
  { method: "POST", path: "/seed", handlerName: "SeedController.seed", requiresRole: "designer" },
];
