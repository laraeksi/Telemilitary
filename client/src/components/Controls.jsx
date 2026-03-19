// Action buttons for in-game power-ups.
// Disables buttons when tokens are low.
import{playClick} from "../audio/sounds";

function Controls({ onPeek, onFreeze, onUndo, onRetry, onQuit, costs, tokens }) {
  const withClick = (fn) => () => {
    playClick();
    fn?.();
  };
  return (
    <section className="controls">
      <button
        type="button"
        className="controls__powerup"
        onClick={withClick(onPeek)}
        disabled={tokens < costs.peek}
        title="Hint shortcut: H"
      >
        <span className="controls__label">Hint</span>
        <span className="controls__meta">H • -{costs.peek}</span>
      </button>
      <button
        type="button"
        className="controls__powerup"
        onClick={withClick(onFreeze)}
        disabled={tokens < costs.freeze}
        title="Freeze shortcut: F"
      >
        <span className="controls__label">Freeze</span>
        <span className="controls__meta">F • -{costs.freeze}</span>
      </button>
      <button
        type="button"
        className="controls__powerup"
        onClick={withClick(onUndo)}
        disabled={tokens < costs.undo}
        title="Undo shortcut: U"
      >
        <span className="controls__label">Undo</span>
        <span className="controls__meta">U • -{costs.undo}</span>
      </button>
      <button type="button" onClick={onRetry}>Retry</button>
      <button type="button" onClick={onQuit}>Quit</button>
    </section>
  );
}

export default Controls;
