/**
 * Browser-side Supabase client, used only for Google sign-in.
 *
 * The app keeps its own bearer-token sessions for every API route, so Supabase
 * is the identity provider here, not the session store: the client completes
 * the Google OAuth flow with Supabase, then `bridgeSupabaseSession()` trades the
 * Supabase access token for the app's existing `user_token`.
 *
 * Configuration is resolved in two steps so the button works in every language
 * and deployment without a rebuild:
 *   1. Build-time `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (fast path).
 *   2. If those were not present when Vercel built the SPA, fetch the public
 *      values from the API host (`GET /api/auth/config`). Only the anon key is
 *      ever exposed; the service-role key stays server-side.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apiUrl } from './api';

const ENV_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || '').trim();
const ENV_KEY = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '').trim();

/**
 * Detects the untouched values from `.env.example`. Deployments have shipped
 * with these copied into the host's environment variables, which produced a
 * Supabase client pointed at a host that does not exist ("Failed to fetch" when
 * the user clicks Google). Treat them as "not configured" so the runtime
 * config lookup is attempted instead.
 */
function isPlaceholder(value: string): boolean {
  const v = value.toLowerCase();
  return (
    !v ||
    v.includes('your-project.supabase.co') ||
    v === 'your-anon-key' ||
    v.startsWith('your-') ||
    v.includes('example.com')
  );
}

/** True when real public Supabase values were baked in at build time. */
export const isSupabaseAuthConfigured = !isPlaceholder(ENV_URL) && !isPlaceholder(ENV_KEY);

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

interface RuntimeSupabaseConfig {
  enabled?: boolean;
  supabaseUrl?: string | null;
  supabaseAnonKey?: string | null;
}

function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      // PKCE keeps the token exchange in the browser without a client secret.
      flowType: 'pkce',
      // The PKCE code is exchanged explicitly in bridgeSupabaseSession() so the
      // app knows exactly when it finished. Relying on the library's URL
      // detection left the app on the login page when the exchange happened
      // later than the first getSession() call.
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

async function fetchRuntimeConfig(): Promise<RuntimeSupabaseConfig | null> {
  try {
    const res = await fetch(apiUrl('/api/auth/config'), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data: any = await res.json().catch(() => null);
    return data?.googleSignIn || null;
  } catch {
    return null;
  }
}

/**
 * Returns a configured Supabase client, or `null` when neither the build nor
 * the API host has public Supabase credentials.
 *
 * Called on demand (only when Google sign-in is actually used), so a missing
 * config never blocks app boot.
 */
export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (client) return client;

  if (!clientPromise) {
    clientPromise = (async () => {
      if (isSupabaseAuthConfigured) {
        client = createSupabaseClient(ENV_URL, ENV_KEY);
        return client;
      }

      const runtime = await fetchRuntimeConfig();
      const url = ((runtime?.supabaseUrl as string | undefined) || '').trim();
      const anonKey = ((runtime?.supabaseAnonKey as string | undefined) || '').trim();
      if (!url || !anonKey) return null;

      client = createSupabaseClient(url, anonKey);
      return client;
    })();
  }

  return clientPromise;
}

export interface GoogleSignInResult {
  ok: boolean;
  error?: string;
  /** `not_configured` lets the UI show a localised "not set up" message. */
  code?: 'not_configured';
}

/**
 * Set right before the browser leaves for Google, so the app can still tell
 * "the user just tried Google sign-in" even if Supabase returns to a URL with
 * no code/token in it (which otherwise looks identical to opening the login
 * page normally).
 */
export const GOOGLE_OAUTH_PENDING_KEY = 'ets-google-oauth-pending';

/** Marks a Google attempt as started (survives the redirect, per tab). */
export function markGoogleSignInStarted(): void {
  try {
    sessionStorage.setItem(GOOGLE_OAUTH_PENDING_KEY, String(Date.now()));
  } catch {
    /* sessionStorage can be unavailable; the URL check still works. */
  }
}

/** Reads and clears the "Google attempt started in this tab" marker. */
export function consumeGoogleSignInStarted(): boolean {
  try {
    const value = sessionStorage.getItem(GOOGLE_OAUTH_PENDING_KEY);
    if (value) sessionStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY);
    return Boolean(value);
  } catch {
    return false;
  }
}

/** Log-safe description of what the OAuth redirect handed back. */
export function describeOAuthCallbackInUrl(): string {
  if (typeof window === 'undefined') return 'no window';
  const hasCode = Boolean(readOAuthCodeFromUrl());
  const hasTokens = Boolean(readOAuthTokensFromUrl());
  const hasError = Boolean(readOAuthErrorFromUrl());
  const queryKeys = [...new URLSearchParams(window.location.search).keys()];
  const hashKeys = [...new URLSearchParams(window.location.hash.replace(/^#/, '')).keys()];
  return `code=${hasCode} tokens=${hasTokens} error=${hasError} query=[${queryKeys.join(',')}] hash=[${hashKeys.join(',')}]`;
}

/**
 * Starts the Supabase-hosted Google OAuth redirect.
 * `redirectPath` is the app route to land on afterwards (`/` or `/bm`).
 */
export async function signInWithGoogle(redirectPath = '/'): Promise<GoogleSignInResult> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      code: 'not_configured',
      error: 'Google sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  const path = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
  const redirectTo = `${window.location.origin}${path}`;

  markGoogleSignInStarted();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Minimal scopes: identity only. Calendar access is not requested.
      scopes: 'email profile',
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) {
    try {
      sessionStorage.removeItem(GOOGLE_OAUTH_PENDING_KEY);
    } catch {
      /* ignore */
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** Clears the Supabase session (best effort). */
export async function signOutOfSupabase(): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore */
  }
}

/** Google/Supabase return errors in the URL hash or query string. */
export function readOAuthErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const description =
    hash.get('error_description') || query.get('error_description') || hash.get('error') || query.get('error');

  return description ? description.replace(/\+/g, ' ') : null;
}

/**
 * The one-time PKCE authorization code Supabase appends to the redirect URL
 * (`?code=...`). `bridgeSupabaseSession()` exchanges it explicitly.
 */
export function readOAuthCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('code');
}

/**
 * Tokens returned in the URL fragment when a Supabase project answers the OAuth
 * redirect with the implicit flow (`#access_token=...&refresh_token=...`).
 * Handled as a fallback so the app works with either flow configuration.
 */
export function readOAuthTokensFromUrl(): { accessToken: string; refreshToken: string } | null {
  if (typeof window === 'undefined') return null;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
}

/**
 * True when the current URL looks like a return from an OAuth provider, i.e.
 * it carries a code, an access token or an error. Used to tell "the user never
 * started Google sign-in" apart from "the hand-off silently failed".
 */
export function hasOAuthCallbackInUrl(): boolean {
  if (typeof window === 'undefined') return false;

  const query = new URLSearchParams(window.location.search);
  if (query.has('code') || query.has('error') || query.has('error_description')) return true;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return hash.has('access_token') || hash.has('error') || hash.has('error_description');
}

/** Removes the OAuth params from the address bar so a refresh does not replay them. */
export function clearOAuthParamsFromUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  const params = [
    'error',
    'error_description',
    'error_code',
    'code',
    'state',
    // implicit-flow fragment values
    'access_token',
    'refresh_token',
    'expires_in',
    'expires_at',
    'token_type',
    'provider_token',
    'provider_refresh_token',
    'type',
  ];
  let changed = false;
  for (const key of params) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    let hashChanged = false;
    for (const key of params) {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        hashChanged = true;
      }
    }
    if (hashChanged) {
      const next = hashParams.toString();
      url.hash = next ? `#${next}` : '';
      changed = true;
    }
  }
  if (changed) window.history.replaceState({}, document.title, url.toString());
}
