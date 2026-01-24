/**
 * Pseudocode:
 * 1) Define auth endpoints.
 * 2) Wire to controllers in router setup.
 */

export const authRoutes = [
  { method: "POST", path: "/auth/login", handlerName: "AuthController.login" },
  { method: "GET", path: "/me", handlerName: "AuthController.getMe" },
];
