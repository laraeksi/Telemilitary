import java.util.List;
import types.Types;

/**
 * Pseudocode:
 * 1) Start an HTTP server (Express/Fastify/etc).
 * 2) Register routes from the route table.
 * 3) Add auth + validation middleware.
 */
public class Index {
  public static void startServer() {
    // TODO: Replace with actual server (Spring/Jetty/etc).
    // This placeholder logs the route table for scaffolding.
    List<Types.RouteDefinition> routeList = routes.Index.ROUTES;
    for (Types.RouteDefinition route : routeList) {
      System.out.println(route.method + " " + route.path + " -> " + route.handlerName);
    }
  }

  // TODO: Hook startServer into a real HTTP server.
}
