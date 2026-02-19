// Base URL for API calls (empty means same origin).
// In dev we rely on the Vite proxy, so force empty base.
export const API_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_BASE_URL ?? "");

export function apiUrl(path) {
  // If no base is set, return the path as-is.
  if (!API_BASE) return path;
  // Respect full URLs so callers can override.
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Normalize slashes when joining base + path.
  if (API_BASE.endsWith("/") && path.startsWith("/")) {
    return `${API_BASE.slice(0, -1)}${path}`;
  }
  if (!API_BASE.endsWith("/") && !path.startsWith("/")) {
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}${path}`;
}
