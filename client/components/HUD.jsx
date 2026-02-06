function HUD({ stageId, timeRemaining, movesRemaining, tokens }) {
  return (
    <section className="hud">
      <div className="hud__item">Stage: {stageId}</div>
      <div className="hud__item">Time: {timeRemaining}</div>
      <div className="hud__item">Moves: {movesRemaining}</div>
      <div className="hud__item">Tokens: {tokens}</div>
    </section>
  );
}

export default HUD;
