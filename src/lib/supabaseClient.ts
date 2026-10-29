/**
 * Browser-side Supabase client, used only for Google sign-in.
 *
 * The app keeps its own bearer-token sessions for every API route, so Supabase
 * is the identity provider here, not the session store: the client completes
 * the Google OAuth flow with Supabase, then `bridgeSupabaseSession()` trades the
 * Supabase access token for the app's existing `user_token`.
 *
 * Required env vars (see .env.example):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || '').trim();
const SUPABASE_ANON_KEY = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '').trim();

/** True when both public Supabase values are present; the Google button is hidden otherwise. */
export const isSupabaseAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseAuthConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // PKCE keeps the token exchange in the browser without a client secret.
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export interface GoogleSignInResult {
  ok: boolean;
  error?: string;
}

/**
 * Starts the Supabase-hosted Google OAuth redirect.
 * `redirectPath` is the app route to land on afterwards (`/` or `/bm`).
 */
export async function signInWithGoogle(redirectPath = '/'): Promise<GoogleSignInResult> {
  if (!supabase) {
    return {
      ok: false,
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
