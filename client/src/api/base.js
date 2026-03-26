/**
 * API URL builder.
 *
 * In development we rely on the Vite proxy, so we keep the base empty and use
 * same-origin paths like `/api/metrics/...`.
 *
 * In production the API might be hosted somewhere else, so we allow an env var
 * base URL and safely join it with request paths.
 */
export const API_BASE = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_BASE_URL ?? "");

export function apiUrl(path) {
  // Allow callers to pass absolute URLs.
  // If no base is set, return the path as-is.
  if (!API_BASE) return path;
  // Bail out if path is falsy.
  if (!path) return path;
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
