// Shared stage defaults for the game.
// One source of truth for stage rules.
/**
 * Pseudocode:
 * 1) Define base stage parameters for 10 stages.
 * 2) Attach helper costs by stage band.
 * 3) Export a single source of truth for stage configs.
 */

const BASE_TOKEN_EARN = {
  tokenEarnPerMatch: 1,
  tokenEarnOnStageComplete: 2,
};

const STAGE_CARD_COUNTS = [8, 10, 12, 14, 16, 18, 20, 22, 24, 24];
const STAGE_TIMERS = [60, 55, 55, 50, 50, 45, 45, 40, 40, 35];
const STAGE_MOVE_LIMITS = [16, 18, 20, 22, 24, 26, 28, 30, 32, 28];
const STAGE_PENALTIES = [3, 3, 3, 4, 4, 4, 5, 5, 5, 5];

const HELPER_COSTS_BY_BAND = {
  1: { peek: 2, freeze: 3, shuffle: 4 },
  2: { peek: 3, freeze: 4, shuffle: 5 },
  3: { peek: 4, freeze: 5, shuffle: 6 },
};

export const CONFIG_DEFINITIONS = [
  { configId: "easy", label: "Easy", parameterOverrides: { timerSeconds: 5 } },
  { configId: "balanced", label: "Balanced" },
  { configId: "hard", label: "Hard", parameterOverrides: { timerSeconds: -5 } },
];

// Helper cost bands scale with stage index.
// TODO: Apply ConfigDefinition.parameterOverrides when building per-config stage settings.

// Group stages into bands for helper cost tiers.
const getBandForStage = (stageIndex) => {
  if (stageIndex <= 2) return 1;
  if (stageIndex <= 5) return 2;
  return 3;
};

export const STAGE_CONFIGS = STAGE_CARD_COUNTS.map((cards, index) => {
  const stageNumber = index + 1;
  // Stage index is zero-based, id is one-based.
  const band = getBandForStage(index);

  return {
    stageId: stageNumber,
    name: `Stage ${stageNumber}`,
    completionRule: "all_pairs_matched",
    baseParameters: {
      cards,
      timerSeconds: STAGE_TIMERS[index],
      moveLimit: STAGE_MOVE_LIMITS[index],
      mismatchPenaltySeconds: STAGE_PENALTIES[index],
      helperCosts: HELPER_COSTS_BY_BAND[band],
      ...BASE_TOKEN_EARN,
    },
  };
});

export const getStageConfigById = (stageId) =>
  STAGE_CONFIGS.find((stage) => stage.stageId === stageId);
