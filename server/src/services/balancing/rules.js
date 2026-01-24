/**
 * Pseudocode:
 * 1) Define rule functions that check metrics.
 * 2) Return a suggestion when triggered.
 * 3) Leave TODOs for real data wiring.
 */

export const ruleHighFailHighTime = (context) => {
  if (!context.failRate || !context.medianTime) return null;
  if (context.failRate <= 0.4) return null;
  return {
    ruleId: "rule_high_fail_high_time",
    name: "High fail rate with high time",
    triggerCondition: "Stage fail rate > 40% and median time high",
    suggestedChange: { timerSeconds: "+5", moveLimit: "+1" },
    explanation: "Reduce difficulty by adding time or moves.",
  };
};

export const ruleMovesDominantFails = (context) => {
  if (!context.movesFailRate || context.movesFailRate < 0.6) return null;
  return {
    ruleId: "rule_moves_dominant_fails",
    name: "Moves failures dominate",
    triggerCondition: "Moves-based fails dominate",
    suggestedChange: { moveLimit: "+2" },
    explanation: "Increase move limit slightly.",
  };
};

export const ruleTokenSpendTooHigh = (context) => {
  if (context.tokenSpendRate === undefined || context.tokenEarnRate === undefined) return null;
  if (context.tokenSpendRate <= context.tokenEarnRate) return null;
  return {
    ruleId: "rule_token_spend_high",
    name: "Token spend > earn early",
    triggerCondition: "Token spend rate exceeds earn rate",
    suggestedChange: { helperCosts: "-1" },
    explanation: "Reduce helper costs or increase earn rates.",
  };
};

export const ruleSegmentFairnessGap = (context) => {
  if (!context.aggressiveCompletion || !context.cautiousCompletion) return null;
  if (context.aggressiveCompletion - context.cautiousCompletion < 0.15) return null;
  return {
    ruleId: "rule_segment_fairness_gap",
    name: "Segment fairness gap",
    triggerCondition: "Aggressive completion >> cautious",
    suggestedChange: { mismatchPenaltySeconds: "-1" },
    explanation: "Reduce mismatch penalty or adjust helper economics.",
  };
};

export const ruleHighRetries = (context) => {
  if (!context.retries || context.retries < 3) return null;
  return {
    ruleId: "rule_high_retries",
    name: "High retries",
    triggerCondition: "Stage has unusually high retries",
    suggestedChange: { timerSeconds: "+3" },
    explanation: "Soften stage parameters slightly.",
  };
};

export const ruleDropOffSpike = (context) => {
  if (!context.dropOffSpike) return null;
  return {
    ruleId: "rule_dropoff_spike",
    name: "Drop-off spike",
    triggerCondition: "Drop-off spike at stage",
    suggestedChange: { timerSeconds: "+2", helperCosts: "-1" },
    explanation: "Add buffer time and reduce helper costs for the band.",
  };
};

export const balancingRules = [
  ruleHighFailHighTime,
  ruleMovesDominantFails,
  ruleTokenSpendTooHigh,
  ruleSegmentFairnessGap,
  ruleHighRetries,
  ruleDropOffSpike,
];
