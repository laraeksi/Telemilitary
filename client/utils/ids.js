/**
 * Pseudocode:
 * 1) Generate a pseudo-random ID.
 * 2) Store it in localStorage if available.
 * 3) Reuse it across sessions.
 */

export const createPseudoId = (prefix) => {
  const random = Math.random().toString(36).slice(2);
  const timestamp = Date.now().toString(36);
  return `${prefix}_${timestamp}_${random}`;
};

export const getOrCreateLocalId = (key, prefix) => {
  if (typeof window === "undefined") {
    return createPseudoId(prefix);
  }

  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next = createPseudoId(prefix);
  window.localStorage.setItem(key, next);
  return next;
};
