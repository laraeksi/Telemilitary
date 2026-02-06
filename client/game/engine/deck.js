// src/game/deck.js

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Card images
 */
export const CARD_IMAGES = [
  { id: "cat", img: "/cards/cat.png" },
  { id: "dog", img: "/cards/dog.png" },
  { id: "queen", img: "/cards/queen.png" },
  { id: "helmet", img: "/cards/helmet.png" },
  { id: "ring", img: "/cards/ring.png" },
  { id: "acorn", img: "/cards/acorn.png" },
  {id: "rose", img: "/cards/rose.png"},
  {id: "key", img: "/cards/key.png"},
  {id: "music", img: "/cards/music.png"},
  {id: "compass", img: "/cards/compass.png"},
  //we will add more later
];

/**
 * Builds a shuffled deck for a stage.
 * Returns array of cards: { uid, id, img }
 */
export function buildDeck({ rows, cols }) {
  const totalCards = rows * cols;

  if (totalCards % 2 !== 0) {
    throw new Error(`Deck size must be even. Got ${rows}x${cols} = ${totalCards}`);
  }

  const pairsNeeded = totalCards / 2;

  // If you don't have enough unique images yet, we reuse them (fine for prototype)
  const chosen = [];
  for (let i = 0; i < pairsNeeded; i++) {
    chosen.push(CARD_IMAGES[i % CARD_IMAGES.length]);
  }

  // Duplicate each chosen card to create pairs
  const rawDeck = chosen
    .flatMap((c) => [c, c])
    .map((c, index) => ({
      uid: `${c.id}-${index}-${crypto.randomUUID()}`, // unique even if ids repeat
      id: c.id,
      img: c.img,
    }));

  return shuffle(rawDeck);
}
