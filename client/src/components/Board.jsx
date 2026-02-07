import Card from "./Card";

function Board({ deck, flippedUids, matchedUids, onFlip }) {
  return (
    <section className="board" aria-label="Game board">
      {deck.map((card) => (
        <Card
          key={card.uid}
          imgSrc={card.img}
          alt={card.id}
          flipped={flippedUids.includes(card.uid)}
          matched={matchedUids.has(card.uid)}
          onFlip={() => onFlip(card.uid)}
        />
      ))}
    </section>
  );
}

export default Board;