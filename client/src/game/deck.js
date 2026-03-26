/**
 * Deck builder + shuffle helper.
 *
 * The memory game needs a deck where every card appears exactly twice (pairs).
 * `buildDeck()` takes a board size (rows/cols), chooses enough unique images,
 * duplicates them into pairs, and shuffles the result.
 */

function shuffle(array) {
  // Fisher–Yates shuffle (good, unbiased shuffle for arrays).
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Card image catalogue used to build decks.
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

  // Shuffle the art pool first so runs feel different even with the same board size.
  const chosen = shuffle(CARD_IMAGES).slice(0, pairsNeeded);

  // Duplicate each chosen card to create pairs.
  const rawDeck = chosen
    .flatMap((c) => [c, c])
    .map((c, index) => ({
      // `uid` is unique per card instance (even though `id` repeats for pairs).
      uid: `${c.id}-${index}-${crypto.randomUUID()}`,
      id: c.id,
      img: c.img,
    }));

  // Final shuffle so the pair positions are random.
  return shuffle(rawDeck);
}
