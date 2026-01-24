import { balancingRules } from "./rules";

/**
 * Pseudocode:
 * 1) Load metrics context for each stage.
 * 2) Run rules and return suggestions.
 */

export const getBalancingSuggestions = async (configId) => {
  // TODO: Load metrics context per stage and run rules.
  const placeholderContext = {};
  const suggestions = balancingRules
    .map((rule) => rule(placeholderContext))
    .filter((rule) => Boolean(rule));

  return { configId, suggestions };
};
