// Heads-up display for game status numbers.
// Shows difficulty, time, moves, and tokens.
function HUD({ 
  configId,
   stageId, 
   timeRemaining,
    movesRemaining, 
    tokens,
    freezeActive,
    streakCount = 0,
    freeHintCharges = 0,
    streakBonusTokens = 0,
 }) {
   const isLowTime = timeRemaining > 0 && timeRemaining <= 15 && !freezeActive;
   const streakProgress = Math.max(0, Math.min(5, streakCount));
  return (
    <section className="hud">
      <div className="hud__item">Stage: {stageId}</div>
      <div className="hud__item">Difficulty: {configId}</div> 
      <div className="hud__item">Stage: {stageId}</div>
      {/* Current difficulty config */}
      <div className="hud__item">Difficulty: {configId}</div>
      {/* Time left in seconds */}
      <div className="hud__item">Time: {timeRemaining}</div>
      {/* Moves remaining */}
      <div className="hud__item">Moves: {movesRemaining}</div>
      {/* Token balance */}
      <div className="hud__item">Tokens: {tokens}</div>
    </section>
  );
}

export default HUD;
