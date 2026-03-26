/**
 * Keyboard navigation helper (experimental).
 *
 * This is an optional component that can provide arrow-key navigation across a
 * list of "card-like" items. The main `Card` component already supports Enter/Space,
 * so this is mostly here as a scaffold for extended accessibility work.
 */
import { useEffect, useState } from "react";

function KeyboardNav({ cards, onFlip }) {
  // Tracks the currently focused card index.
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // This listens globally, so we keep logic small and predictable.
      // Move focus right.
      if (event.key === "ArrowRight") {
        setFocusedIndex((i) => Math.min(i + 1, cards.length - 1));
      }

      // Move focus left.
      if (event.key === "ArrowLeft") {
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }

      // Flip the focused card on Enter/Space.
      if (event.key === "Enter" || event.key === " ") {
        onFlip(focusedIndex);
      }
    };

    // Global listener for arrow/enter navigation.
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [focusedIndex, cards.length, onFlip]);

  return (
    <>
      {cards.map((card, index) => (
        <div
          key={card.id}
          tabIndex={0}
          className={index === focusedIndex ? "card focused" : "card"}
        >
          {card.content}
        </div>
      ))}
    </>
  );
}

export default KeyboardNav;
