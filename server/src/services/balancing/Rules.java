package services.balancing;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Pseudocode:
 * 1) Define rule functions that check metrics.
 * 2) Return a suggestion when triggered.
 * 3) Leave TODOs for real data wiring.
 */
public class Rules {
  public static RuleSuggestion ruleHighFailHighTime(RuleContext context) {
    if (context == null || context.failRate == null || context.medianTime == null) return null;
    if (context.failRate <= 0.4) return null;
    return new RuleSuggestion(
      "rule_high_fail_high_time",
      "High fail rate with high time",
      "Stage fail rate > 40% and median time high",
      Map.of("timerSeconds", "+5", "moveLimit", "+1"),
      "Reduce difficulty by adding time or moves."
    );
  }

  public static RuleSuggestion ruleMovesDominantFails(RuleContext context) {
    if (context == null || context.movesFailRate == null || context.movesFailRate < 0.6) return null;
    return new RuleSuggestion(
      "rule_moves_dominant_fails",
      "Moves failures dominate",
      "Moves-based fails dominate",
      Map.of("moveLimit", "+2"),
      "Increase move limit slightly."
    );
  }

  public static RuleSuggestion ruleTokenSpendTooHigh(RuleContext context) {
    if (context == null || context.tokenSpendRate == null || context.tokenEarnRate == null) return null;
    if (context.tokenSpendRate <= context.tokenEarnRate) return null;
    return new RuleSuggestion(
      "rule_token_spend_high",
      "Token spend > earn early",
      "Token spend rate exceeds earn rate",
      Map.of("helperCosts", "-1"),
      "Reduce helper costs or increase earn rates."
    );
  }

  public static RuleSuggestion ruleSegmentFairnessGap(RuleContext context) {
    if (context == null || context.aggressiveCompletion == null || context.cautiousCompletion == null) return null;
    if (context.aggressiveCompletion - context.cautiousCompletion < 0.15) return null;
    return new RuleSuggestion(
      "rule_segment_fairness_gap",
      "Segment fairness gap",
      "Aggressive completion >> cautious",
      Map.of("mismatchPenaltySeconds", "-1"),
      "Reduce mismatch penalty or adjust helper economics."
    );
  }

  public static RuleSuggestion ruleHighRetries(RuleContext context) {
    if (context == null || context.retries == null || context.retries < 3) return null;
    return new RuleSuggestion(
      "rule_high_retries",
      "High retries",
      "Stage has unusually high retries",
      Map.of("timerSeconds", "+3"),
      "Soften stage parameters slightly."
    );
  }

  public static RuleSuggestion ruleDropOffSpike(RuleContext context) {
    if (context == null || context.dropOffSpike == null || !context.dropOffSpike) return null;
    return new RuleSuggestion(
      "rule_dropoff_spike",
      "Drop-off spike",
      "Drop-off spike at stage",
      Map.of("timerSeconds", "+2", "helperCosts", "-1"),
      "Add buffer time and reduce helper costs for the band."
    );
  }

  public static final List<Function<RuleContext, RuleSuggestion>> BALANCING_RULES = List.of(
    Rules::ruleHighFailHighTime,
    Rules::ruleMovesDominantFails,
    Rules::ruleTokenSpendTooHigh,
    Rules::ruleSegmentFairnessGap,
    Rules::ruleHighRetries,
    Rules::ruleDropOffSpike
  );

  public static class RuleContext {
    public Double failRate;
    public Double medianTime;
    public Double movesFailRate;
    public Double tokenSpendRate;
    public Double tokenEarnRate;
    public Double aggressiveCompletion;
    public Double cautiousCompletion;
    public Integer retries;
    public Boolean dropOffSpike;
  }

  public static class RuleSuggestion {
    public final String ruleId;
    public final String name;
    public final String triggerCondition;
    public final Map<String, Object> suggestedChange;
    public final String explanation;

    public RuleSuggestion(
      String ruleId,
      String name,
      String triggerCondition,
      Map<String, Object> suggestedChange,
      String explanation
    ) {
      this.ruleId = ruleId;
      this.name = name;
      this.triggerCondition = triggerCondition;
      this.suggestedChange = suggestedChange;
      this.explanation = explanation;
    }
  }
}
