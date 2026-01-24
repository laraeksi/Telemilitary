/**
 * Pseudocode:
 * 1) Show timer, moves, and tokens.
 * 2) Update values based on game state.
 * 3) Keep aria-live for accessible updates.
 */

export const Hud = ({ timeRemaining, movesRemaining, tokens }) => (
  <section className="hud" aria-label="Stage status">
    <div className="hud-item">
      <span className="hud-label">Time</span>
      <span className="hud-value" aria-live="polite">
        {timeRemaining}s
      </span>
    </div>
    <div className="hud-item">
      <span className="hud-label">Moves</span>
      <span className="hud-value" aria-live="polite">
        {movesRemaining}
      </span>
    </div>
    <div className="hud-item">
      <span className="hud-label">Tokens</span>
      <span className="hud-value" aria-live="polite">
        {tokens}
      </span>
    </div>
  </section>
);
