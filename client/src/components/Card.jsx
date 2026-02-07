function Card({ imgSrc, alt, flipped, matched, onFlip }) {
  const isFlipped = flipped || matched;

  return (
    <button
      type="button"
      className={`card ${isFlipped ? "flipped" : ""}`}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
      disabled={matched}
      aria-label="Memory card"
    >

      <div className="card-inner">
        <div className="card-face card-front" />
        <div className="card-face card-back">
          <img className="card-img" src={imgSrc} alt={alt} />
        </div>
      </div>
    </button>
  );
}

export default Card;
