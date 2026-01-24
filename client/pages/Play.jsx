import React from "react";
import { StageGrid } from "../components/StageGrid";
import { Hud } from "../components/Hud";
import { HelperButtons } from "../components/HelperButtons";
import { PostRunSummary } from "../components/PostRunSummary";
import { getStageConfigById } from "../configs/stages";

/**
 * Pseudocode:
 * 1) Load stage config.
 * 2) Render HUD, grid, helpers, summary.
 * 3) Wire game engine and telemetry later.
 */

export const PlayPage = () => {
  const stageConfig = getStageConfigById(1);

  return (
    <main className="play-page">
      <h1>Card Selection Game</h1>
      <Hud timeRemaining={stageConfig?.baseParameters.timerSeconds ?? 0} movesRemaining={0} tokens={0} />
      <StageGrid cardIds={["card-1", "card-2"]} matchedCardIds={[]} onCardSelect={() => {}} />
      <HelperButtons
        helpers={[
          { type: "peek", cost: stageConfig?.baseParameters.helperCosts.peek ?? 0, label: "Peek" },
          { type: "freeze", cost: stageConfig?.baseParameters.helperCosts.freeze ?? 0, label: "Freeze" },
          { type: "shuffle", cost: stageConfig?.baseParameters.helperCosts.shuffle ?? 0, label: "Shuffle" },
        ]}
        tokens={0}
        onUse={() => {}}
      />
      <PostRunSummary
        timeSpentSeconds={0}
        fails={0}
        tokensEarned={0}
        tokensSpent={0}
        stagesCompleted={0}
        onRetry={() => {}}
        onExit={() => {}}
      />
      {/* TODO: Wire game engine state, telemetry emit, keyboard navigation, and responsive layout. */}
    </main>
  );
};
