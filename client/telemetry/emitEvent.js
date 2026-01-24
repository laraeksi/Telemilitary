/**
 * Pseudocode:
 * 1) Send a telemetry event to the server.
 * 2) Handle network errors gracefully.
 * 3) Optional error callback for UI.
 */

export const emitEvent = async (event, options = {}) => {
  const endpoint = options.endpoint ?? "/events";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Telemetry event rejected (${response.status})`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error("Unknown telemetry error");
    if (typeof options.onError === "function") {
      options.onError(err);
    }
  }
};
