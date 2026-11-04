/**
 * Single place that knows where the Express API lives.
 *
 * Locally (`npm run dev`) the API is served by the same process as the Vite
 * dev server, so no base URL is used and every request stays same-origin.
 *
 * In production the React SPA is normally hosted separately (Vercel) from the
 * Node/Python API (Render/Railway), so `VITE_API_BASE_URL` points at that host
 * and all `/api/...` calls are prefixed here.
 *
 * The committed fallback below exists because the Vercel project that builds
 * this SPA belongs to a team the maintainer cannot open, and its environment
 * still holds the `.env.example` placeholders with an empty
 * `VITE_API_BASE_URL`. Pushing to `main` is enough to rebuild the site, so the
 * API origin is versioned here instead of being configured in the dashboard.
 * A real `VITE_API_BASE_URL` still wins, and the Render/Railway deployment
 * (which serves the SPA itself) stays same-origin.
 */

/** Public API host that the Vercel-hosted SPA talks to (Render Blueprint default). */
const PRODUCTION_API_FALLBACK = 'https://etsystem-api.onrender.com';

/** Values copied from `.env.example` (or another placeholder) must not be used. */
function usableApiBase(value: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  if (/your-|example\.com/i.test(v)) return '';
  return v;
}

/** Hosts that serve the built SPA themselves, so absolute API URLs are not needed. */
function servesSpaItself(hostname: string): boolean {
  if (hostname === '127.0.0.1' || hostname === 'localhost') return true;
  return /(^|\.)(onrender\.com|railway\.app|up\.railway\.app|fly\.dev)$/i.test(hostname);
}

const ENV_BASE = usableApiBase((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '');

const USE_DEPLOYED_API =
  !ENV_BASE &&
  Boolean(import.meta.env.PROD) &&
  (typeof window === 'undefined' || !servesSpaItself(window.location.hostname));

/** Normalised API origin, e.g. `https://etsystem-api.onrender.com` ('' when same-origin). */
export const API_BASE_URL = (
  ENV_BASE || (USE_DEPLOYED_API ? PRODUCTION_API_FALLBACK : '')
).replace(/\/+$/, '');

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
