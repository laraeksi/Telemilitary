// Renders the grid of cards for the game.
// Maps deck data into Card components.
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