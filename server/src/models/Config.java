package models;

import java.util.Map;

/**
 * Pseudocode:
 * 1) Document Config model shape.
 * 2) Store parameter sets per config.
 */
public class Config {
  public String configId;
  public String label;
  public Map<String, Object> parameterSet;
}
