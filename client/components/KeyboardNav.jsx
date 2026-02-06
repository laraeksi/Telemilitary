import { useEffect, useState } from "react";

function KeyboardNav({ cards, onFlip }) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        setFocusedIndex((i) => Math.min(i + 1, cards.length - 1));
      }

      if (event.key === "ArrowLeft") {
        setFocusedIndex((i) => Math.max(i - 1, 0));
      }

      if (event.key === "Enter" || event.key === " ") {
        onFlip(focusedIndex);
      }
    };

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
