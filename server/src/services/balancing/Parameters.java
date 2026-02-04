package services.balancing;

import java.util.Collections;
import java.util.Map;

/**
 * Pseudocode:
 * 1) Load editable parameters for a config.
 * 2) Save edits for simulation.
 */
public class Parameters {
  public static Map<String, Object> getBalancingParameters(String configId) {
    // TODO: Load editable parameters for the config from storage.
    return Map.of("configId", configId, "parameters", Collections.emptyMap());
  }

  public static Map<String, Object> saveBalancingParameters(Object payload) {
    // TODO: Persist parameter edits for simulation.
    return Map.of("saved", true, "payload", payload);
  }
}
