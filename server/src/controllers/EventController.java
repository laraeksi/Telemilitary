package controllers;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import models.Anomaly;
import models.Event;
import validators.EventValidator;

/**
 * Pseudocode:
 * 1) Validate event payload.
 * 2) Store event + anomalies.
 * 3) List/export events for designers.
 */
public class EventController {
  public static IngestResult ingestEvent(Event event) {
    EventValidator.ValidationResult validation = EventValidator.validateEvent(event);

    // TODO: Store event and anomalies in database.
    return new IngestResult(validation.isValid, validation.anomalies);
  }

  public static EventListResult listEvents(Map<String, Object> filters) {
    // TODO: Query database with filters.
    return new EventListResult(filters, Collections.emptyList());
  }

  public static String exportEventsCsv() {
    // TODO: Stream CSV export with proper headers.
    return "event_id,timestamp,event_type\n";
  }

  public static class IngestResult {
    public final boolean accepted;
    public final List<Anomaly> anomalies;

    public IngestResult(boolean accepted, List<Anomaly> anomalies) {
      this.accepted = accepted;
      this.anomalies = anomalies;
    }
  }

  public static class EventListResult {
    public final Map<String, Object> filters;
    public final List<Event> events;

    public EventListResult(Map<String, Object> filters, List<Event> events) {
      this.filters = filters;
      this.events = events;
    }
  }
}
