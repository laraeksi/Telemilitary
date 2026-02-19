// Renders the grid of cards for the game.
// Maps deck data into Card components.
import Card from "./Card";

function Board({ deck, flippedUids, matchedUids, onFlip }) {
  return (
    <section className="board" aria-label="Game board">
      {/* Render each card from the shuffled deck */}
      {deck.map((card) => (
        <Card
          key={card.uid}
          // Image + id for the card face.
          imgSrc={card.img}
          alt={card.id}
          // Card is flipped if in the flipped list.
          flipped={flippedUids.includes(card.uid)}
          // Card is matched if it exists in the Set.
          matched={matchedUids.has(card.uid)}
          // Pass uid back to the parent handler.
          onFlip={() => onFlip(card.uid)}
        />
      ))}
    </section>
  );
}

export default Board;