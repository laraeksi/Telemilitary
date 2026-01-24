import React from "react";

/**
 * Pseudocode:
 * 1) Render cards as focusable buttons.
 * 2) Support Enter/Space selection.
 * 3) Add arrow-key navigation later.
 */

export const StageGrid = ({ cardIds, selectedCardId, matchedCardIds, onCardSelect }) => {
  const handleKeyDown = (event, cardId) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCardSelect(cardId);
    }
    // TODO: Implement arrow key navigation between cards.
  };

  return (
    <div className="stage-grid" role="grid" aria-label="Card grid">
      {cardIds.map((cardId) => {
        const isSelected = selectedCardId === cardId;
        const isMatched = matchedCardIds.includes(cardId);

        return (
          <button
            key={cardId}
            type="button"
            className={`card ${isSelected ? "is-selected" : ""} ${isMatched ? "is-matched" : ""}`}
            onClick={() => onCardSelect(cardId)}
            onKeyDown={(event) => handleKeyDown(event, cardId)}
            aria-pressed={isSelected}
            aria-disabled={isMatched}
          >
            {/* TODO: Render card face/hidden state */}
            Card
          </button>
        );
      })}
    </div>
  );
};
