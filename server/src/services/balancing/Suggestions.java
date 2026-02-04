package services.balancing;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Pseudocode:
 * 1) Load metrics context for each stage.
 * 2) Run rules and return suggestions.
 */
public class Suggestions {
  public static SuggestionResult getBalancingSuggestions(String configId) {
    // TODO: Load metrics context per stage and run rules.
    Rules.RuleContext placeholderContext = new Rules.RuleContext();
    List<Rules.RuleSuggestion> suggestions = new ArrayList<>();

    for (Function<Rules.RuleContext, Rules.RuleSuggestion> rule : Rules.BALANCING_RULES) {
      Rules.RuleSuggestion suggestion = rule.apply(placeholderContext);
      if (suggestion != null) {
        suggestions.add(suggestion);
      }
    }

    return new SuggestionResult(configId, suggestions);
  }

  public static class SuggestionResult {
    public final String configId;
    public final List<Rules.RuleSuggestion> suggestions;

    public SuggestionResult(String configId, List<Rules.RuleSuggestion> suggestions) {
      this.configId = configId;
      this.suggestions = suggestions;
    }
  }
}
