// src/game/stages.js
export const DIFFICULTY_CONFIGS = {
  balanced: [
    // Stage 1 (2x4 = 8 cards = 4 pairs)
    {
      stageId: 1,
      rows: 2,
      cols: 4,
      timeLimit: 30,     // seconds
      moveLimit: 12,     // number of pair attempts
      startTokens: 0,
      stageWinTokens: 5,    // tokens awarded for completing the stage

      // Economy / rules
      rewardMatch: 1,          // tokens gained per match
      penaltyMismatchTime: 2,  // seconds removed on mismatch

      // Powerups (we’ll implement later)
      powerupCosts: {
        peek: 2,
        freeze: 3,
        undo: 3,
      },
    },

    // Stage 2 (3x4 = 12 cards = 6 pairs)
    {
      stageId: 2,
      rows: 3,
      cols: 4,
      timeLimit: 45,
      moveLimit: 18,
      startTokens: 0,
      stageWinTokens: 5,

      rewardMatch: 1,
      penaltyMismatchTime: 2,

      powerupCosts: {
        peek: 2,
        freeze: 3,
        undo: 3,
      },
    },
  ],
};
