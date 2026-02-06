import Card from "./Card";

function Board({ deck, flippedUids, matchedUids, onFlip, peekActive }) {
  return (
    <section className="board" aria-label="Game board">
      {deck.map((card) => {
        const forceFlip = peekActive && !matchedUids.has(card.uid);

        return(
         <Card
            key={card.uid}
            imgSrc={card.img}
            alt={card.id}
            flipped={forceFlip || flippedUids.includes(card.uid)}
            matched={matchedUids.has(card.uid)}
            onFlip={() => onFlip(card.uid)}
          />
      );
      })}

    </section>
  );
}

export default Board;
