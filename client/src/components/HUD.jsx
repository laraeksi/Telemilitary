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
  return (
    <section className="hud">
      {/* Basic status readout */}
      {/* Stage number for the current level */}
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
