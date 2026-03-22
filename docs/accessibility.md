# Accessibility (a11y) — Telemilitary

**Purpose:** Demonstrate awareness of **inclusive design** for CW2 (keyboard, motor, vision, hearing). This document complements implemented features and records **residual gaps**.

## Implemented or supported

| Topic | Implementation notes |
|-------|-------------------------|
| **Keyboard** | Powerups and actions documented in README (`H`, `F`, `U`); interactive controls are standard HTML/React where possible. |
| **Responsive layout** | README mentions responsive board scaling for desktop and mobile. |
| **Audio** | `client/src/audio/sounds.js` — **audio unlock on user gesture** avoids autoplay blocking; aligns with consent/menu flows. |
| **Motion / intensity** | Low-time audio pressure described as a design feature — consider reduced-motion or mute options for sensitivity (see gaps). |

## Recommended further improvements (gaps)

- **WCAG contrast:** audit `index.css` / `game.css` against **WCAG 2.1 AA** for text and focus states.
- **Focus visibility:** ensure all buttons/links show a visible `:focus-visible` outline.
- **Screen readers:** add **ARIA labels** for board cells, timer, and modal dialogs; announce stage changes.
- **Reduced motion:** `prefers-reduced-motion: reduce` to soften CSS animations and optional audio reduction.
- **Colour-blind safety:** do not rely on colour alone for match feedback (pair with icons/patterns).

## Testing suggestions

- Navigate the full game **without a mouse** (Tab / Enter / shortcuts).
- Zoom browser to **200%** and confirm no critical UI clipping.
- Use OS **screen reader** on menu and one stage (smoke test).

---

*For submission, add a short “Accessibility” subsection in the main report referencing this file and any audit you performed.*
