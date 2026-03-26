/**
 * Control panel for power-ups + session actions.
 *
 * This component is UI-only: it doesn’t decide game rules, it just calls the
 * callbacks passed down from `Game.jsx`.
 *
 * The buttons are disabled when the player can’t afford the power-up.
 */
import { playClick } from "../audio/sounds";

function Controls({ onPeek, onFreeze, onUndo, onRetry, onQuit, costs, tokens }) {
  const withClick = (fn) => () => {
    // Keep button presses feeling responsive even if the next action is async.
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
        <span className="controls__meta">H, −{costs.peek}</span>
      </button>
      <button
        type="button"
        className="controls__powerup"
        onClick={withClick(onFreeze)}
        disabled={tokens < costs.freeze}
        title="Freeze shortcut: F"
      >
        <span className="controls__label">Freeze</span>
        <span className="controls__meta">F, −{costs.freeze}</span>
      </button>
      <button
        type="button"
        className="controls__powerup"
        onClick={withClick(onUndo)}
        disabled={tokens < costs.undo}
        title="Undo shortcut: U"
      >
        <span className="controls__label">Undo</span>
        <span className="controls__meta">U, −{costs.undo}</span>
      </button>
      <button type="button" onClick={withClick(onRetry)}>Retry</button>
      <button type="button" onClick={withClick(onQuit)}>Quit</button>
    </section>
  );
}

export default Controls;
