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

/** True when both public Supabase values were baked in at build time. */
export const isSupabaseAuthConfigured = Boolean(ENV_URL && ENV_KEY);

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
      detectSessionInUrl: true,
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

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // Minimal scopes: identity only. Calendar access is not requested.
      scopes: 'email profile',
      queryParams: { prompt: 'select_account' },
    },
  });

  return error ? { ok: false, error: error.message } : { ok: true };
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

/** Removes the OAuth params from the address bar so a refresh does not replay them. */
export function clearOAuthParamsFromUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  const params = ['error', 'error_description', 'error_code', 'code', 'state'];
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
