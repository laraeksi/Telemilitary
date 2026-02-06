function Controls({ onPeek, onFreeze, onUndo, onRetry, onQuit, costs, tokens }) {
  return (
    <section className="controls">
      <button type="button" onClick={onPeek} disabled={tokens < costs.peek}>
        Hint (-{costs.peek})
      </button>

      <button type="button" onClick={onFreeze} disabled={tokens < costs.freeze}>
        Freeze (-{costs.freeze})
      </button>

      <button type="button" onClick={onUndo} disabled={tokens < costs.undo}>
        Undo (-{costs.undo})
      </button>

      <button type="button" onClick={onRetry}>Retry</button>
      <button type="button" onClick={onQuit}>Quit</button>
    </section>
  );
}

export default Controls;
