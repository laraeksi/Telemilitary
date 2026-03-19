// Deck builder and shuffle helper.
// Produces a shuffled pair deck.
// src/game/deck.js

function shuffle(array) {
  // Fisher-Yates shuffle.
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
  { id: "rose", img: "/cards/rose.png" },
  { id: "key", img: "/cards/key.png" },
  { id: "music", img: "/cards/music.png" },
  { id: "compass", img: "/cards/compass.png" },
  { id: "lantern", img: "/cards/lantern.svg" },
  { id: "shield", img: "/cards/shield.svg" },
];

/**
 * Builds a shuffled deck for a stage.
 * Returns array of cards: { uid, id, img }
 */
export function buildDeck({ rows, cols }) {
  const totalCards = rows * cols;

  // Cards must be even to form pairs.
  if (totalCards % 2 !== 0) {
    throw new Error(`Deck size must be even. Got ${rows}x${cols} = ${totalCards}`);
  }

  // Number of pairs needed for this board size.
  const pairsNeeded = totalCards / 2;

  if (pairsNeeded > CARD_IMAGES.length) {
    throw new Error(
      `Not enough unique card images. Need ${pairsNeeded}, have ${CARD_IMAGES.length}`,
    );
  }

  // Shuffle the art pool first so large boards stay unique but runs still feel varied.
  const chosen = shuffle(CARD_IMAGES).slice(0, pairsNeeded);

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
