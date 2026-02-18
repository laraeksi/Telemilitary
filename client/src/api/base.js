export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export function apiUrl(path) {
  if (!API_BASE) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (API_BASE.endsWith("/") && path.startsWith("/")) {
    return `${API_BASE.slice(0, -1)}${path}`;
  }
  if (!API_BASE.endsWith("/") && !path.startsWith("/")) {
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}${path}`;
}
