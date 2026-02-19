// Single memory-card button with flip behavior.
// Also handles keyboard activation.
function Card({ imgSrc, alt, flipped, matched, onFlip }) {
  // Treat matched cards as permanently flipped.
  const isFlipped = flipped || matched;

  return (
    <button
      type="button"
      // Use "flipped" class to trigger CSS rotation.
      className={`card ${isFlipped ? "flipped" : ""}`}
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
