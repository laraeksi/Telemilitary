/**
 * Pseudocode:
 * 1) Show helper buttons (peek/freeze/shuffle).
 * 2) Disable button if tokens are too low.
 * 3) Call onUse when clicked.
 */

export const HelperButtons = ({ helpers, tokens, onUse }) => (
  <div className="helper-buttons" role="group" aria-label="Helpers">
    {helpers.map((helper) => {
      const disabled = tokens < helper.cost;

      return (
        <button
          key={helper.type}
          type="button"
          className="helper-button"
          onClick={() => onUse(helper.type)}
          disabled={disabled}
        >
          {helper.label} ({helper.cost})
        </button>
      );
    })}
  </div>
);
