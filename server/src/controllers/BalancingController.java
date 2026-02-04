package controllers;

import services.balancing.DecisionLog;
import services.balancing.Parameters;
import services.balancing.Suggestions;
import services.simulation.SimulateBalanceChange;

/**
 * Pseudocode:
 * 1) Fetch and save balancing parameters.
 * 2) Return rule-based suggestions.
 * 3) Run simulation and store decisions.
 */
public class BalancingController {
  public static Object getParameters(String configId) {
    return Parameters.getBalancingParameters(configId);
  }

  public static Object saveParameters(Object payload) {
    return Parameters.saveBalancingParameters(payload);
  }

  public static Object suggestions(String configId) {
    return Suggestions.getBalancingSuggestions(configId);
  }

  public static Object simulate(Object payload) {
    return SimulateBalanceChange.simulateBalanceChange(payload);
  }

  public static Object decisions() {
    return DecisionLog.listDecisions();
  }

  public static Object createDecisionEntry(Object payload) {
    return DecisionLog.createDecision(payload);
  }
}
