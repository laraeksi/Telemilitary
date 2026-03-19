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
      <div
        className={`hud__item hud__time ${freezeActive ? "hud__time--frozen" : ""} ${isLowTime ? "hud__time--low" : ""}`}
        title={freezeActive ? "Timer frozen" : undefined}
      >
        Time: {timeRemaining}
        {freezeActive && <span className="hud__time-icon" aria-hidden> ❄</span>}
      </div>
      <div className="hud__item">Moves: {movesRemaining}</div>
      <div className="hud__item hud__tokens">
        Tokens: {tokens}
        {streakBonusTokens > 0 && (
          <span className="hud__bonus" aria-hidden>
            STREAK BONUS +{streakBonusTokens}
          </span>
        )}
      </div>

      <div className="hud__item hud__streak" title="Clear 5 stages in a row without retrying for +5 tokens and 1 free Hint">
        <div className="hud__streak-row">
          <span>Streak</span>
          <span className="hud__streak-meta">
            {streakProgress}/5 {freeHintCharges > 0 ? `• Free Hint x${freeHintCharges}` : ""}
          </span>
        </div>
        <div className="hud__streak-bar" aria-hidden>
          <div className="hud__streak-fill" style={{ width: `${(streakProgress / 5) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

export default HUD;
