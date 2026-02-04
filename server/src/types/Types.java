package types;

import java.util.Map;

/**
 * Pseudocode:
 * 1) Document shared server types with Java classes.
 * 2) Keep route metadata in a simple structure.
 */
public class Types {
  public enum HttpMethod {
    GET,
    POST,
    PUT,
    PATCH,
    DELETE
  }

  public enum Role {
    PLAYER,
    DESIGNER
  }

  public static class RouteDefinition {
    public final HttpMethod method;
    public final String path;
    public final String handlerName;
    public final Role requiresRole;

    public RouteDefinition(HttpMethod method, String path, String handlerName, Role requiresRole) {
      this.method = method;
      this.path = path;
      this.handlerName = handlerName;
      this.requiresRole = requiresRole;
    }
  }

  public static class RequestContext {
    public String userId;
    public Role role;
  }

  public static class TelemetryEventRecord {
    public String eventId;
    public String sessionId;
    public String timestamp;
    public Integer stageId;
    public String eventType;
    public Map<String, Object> payload;
    public String configId;
    public Boolean isValid;
  }
}
