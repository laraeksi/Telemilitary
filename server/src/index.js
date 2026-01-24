import { routes } from "./routes";

/**
 * Pseudocode:
 * 1) Start an HTTP server (Express/Fastify/etc).
 * 2) Register routes from the route table.
 * 3) Add auth + validation middleware.
 */

export const startServer = () => {
  // TODO: Replace with actual server (Express/Fastify/etc).
  // This placeholder logs the route table for scaffolding.
  routes.forEach((route) => {
    // eslint-disable-next-line no-console
    console.log(`${route.method} ${route.path} -> ${route.handlerName}`);
  });
};

// TODO: Hook startServer into a real HTTP server.
