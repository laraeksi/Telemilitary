/**
 * Game board grid renderer.
 *
 * This component is intentionally "dumb": it just maps the deck array into
 * `Card` components and sets up the CSS grid sizing via CSS variables.
 *
 * The actual game rules (matching, timers, tokens) live in `pages/Game.jsx`.
 */
import Card from "./Card";

function Board({
  deck,
  rows,
  cols,
  flippedUids,
  matchedUids,
  mismatchUids = [],
  replayUids = [],
  onFlip,
}) {
  return (
    <section
      className="board"
      aria-label="Game board"
      style={{
        // CSS variables let the stylesheet size the grid without inline math everywhere.
        "--board-cols": cols,
        "--board-rows": rows,
      }}
    >
      {deck.map((card) => (
        <Card
          key={card.uid}
          imgSrc={card.img}
          alt={card.id}
          flipped={flippedUids.includes(card.uid)}
          matched={matchedUids.has(card.uid)}
          shaking={mismatchUids.includes(card.uid)}
          ghostFlipped={replayUids.includes(card.uid)}
          onFlip={() => onFlip(card.uid)}
        />
      ))}
    </section>
  );
}

export default Board;