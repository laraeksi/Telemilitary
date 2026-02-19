// Action buttons for in-game power-ups.
// Disables buttons when tokens are low.
function Controls({ onPeek, onFreeze, onUndo, onRetry, onQuit, costs, tokens }) {
  return (
    <section className="controls">
      {/* Power-ups cost tokens to use */}
      <button type="button" onClick={onPeek} disabled={tokens < costs.peek}>
        {/* Hint shows one pair briefly */}
        Hint (-{costs.peek})
      </button>

      <button type="button" onClick={onFreeze} disabled={tokens < costs.freeze}>
        {/* Freeze pauses the timer */}
        Freeze (-{costs.freeze})
      </button>

      <button type="button" onClick={onUndo} disabled={tokens < costs.undo}>
        {/* Undo reverts the last mismatch */}
        Undo (-{costs.undo})
      </button>

      {/* Non-powerup actions */}
      <button type="button" onClick={onRetry}>Retry</button>
      <button type="button" onClick={onQuit}>Quit</button>
    </section>
  );
}

export default Controls;
