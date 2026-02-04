package routes;

import java.util.List;
import types.Types;

/**
 * Pseudocode:
 * 1) Define telemetry ingestion and export endpoints.
 * 2) Protect designer-only routes.
 */
public class EventRoutes {
  public static final List<Types.RouteDefinition> ROUTES = List.of(
    new Types.RouteDefinition(Types.HttpMethod.POST, "/events", "EventController.ingestEvent", null),
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/events",
      "EventController.listEvents",
      Types.Role.DESIGNER
    ),
    new Types.RouteDefinition(
      Types.HttpMethod.GET,
      "/export/events.csv",
      "EventController.exportEventsCsv",
      Types.Role.DESIGNER
    )
  );
}
