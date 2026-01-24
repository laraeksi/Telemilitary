/**
 * Pseudocode:
 * 1) Define telemetry ingestion and export endpoints.
 * 2) Protect designer-only routes.
 */

export const eventRoutes = [
  { method: "POST", path: "/events", handlerName: "EventController.ingestEvent" },
  { method: "GET", path: "/events", handlerName: "EventController.listEvents", requiresRole: "designer" },
  {
    method: "GET",
    path: "/export/events.csv",
    handlerName: "EventController.exportEventsCsv",
    requiresRole: "designer",
  },
];
