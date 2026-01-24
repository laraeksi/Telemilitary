import { validateEvent } from "../validators/eventValidator";

/**
 * Pseudocode:
 * 1) Validate event payload.
 * 2) Store event + anomalies.
 * 3) List/export events for designers.
 */

export const ingestEvent = async (event) => {
  const validation = validateEvent(event);

  // TODO: Store event and anomalies in database.
  return {
    accepted: validation.isValid,
    anomalies: validation.anomalies,
  };
};

export const listEvents = async (filters) => {
  // TODO: Query database with filters.
  return { filters, events: [] };
};

export const exportEventsCsv = async () => {
  // TODO: Stream CSV export with proper headers.
  return "event_id,timestamp,event_type\n";
};
