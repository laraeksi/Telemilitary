/**
 * One card button on the board.
 *
 * We render it as a real `<button>` so it’s naturally focusable/clickable and
 * accessible. Keyboard support (Enter/Space) is added to feel the same as a click.
 */
function Card({ imgSrc, alt, flipped, matched, shaking, ghostFlipped, onFlip }) {
  const isFlipped = flipped || matched;
  const isGhost = !isFlipped && ghostFlipped;

  return (
    <button
      type="button"
      className={`card ${isFlipped ? "flipped" : ""} ${matched ? "matched" : ""} ${shaking ? "shaking" : ""} ${isGhost ? "ghost" : ""}`}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          // Make keyboard behave like click.
          e.preventDefault();
          onFlip();
        }
      }}
      // Prevent re-clicking a matched pair.
      disabled={matched}
      // Keep an accessible label even when image fails.
      aria-label="Memory card"
    >

      <div className="card-inner">
        {/* Front shows the back of the card */}
        <div className="card-face card-front" />
        <div className="card-face card-back">
          {/* Back shows the matching image */}
          <img className="card-img" src={imgSrc} alt={alt} />
        </div>
      </div>
    </button>
  );
}

export default Card;
