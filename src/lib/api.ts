/**
 * Single place that knows where the Express API lives.
 *
 * Locally (`npm run dev`) the API is served by the same process as the Vite
 * dev server, so `VITE_API_BASE_URL` stays empty and every request stays
 * same-origin. In production the React SPA is hosted separately (Vercel) from
 * the Node/Python API (Render/Railway), so `VITE_API_BASE_URL` points at that
 * host and all `/api/...` calls are prefixed here.
 */

const RAW_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '').trim();

/** Normalised API origin, e.g. `https://ets-api.onrender.com` ('' when same-origin). */
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');

/** Resolves an app path (usually `/api/...`) against the configured API host. */
export function apiUrl(path: string): string {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** `fetch` wrapper that routes through {@link apiUrl}. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
