/**
 * Trades a Supabase Auth session (created by Google sign-in) for the app's own
 * bearer token, so none of the existing protected API routes need to change.
 *
 * Flow:
 *   1. supabase.auth.signInWithOAuth({ provider: 'google' })  -> Google -> Supabase
 *   2. Supabase redirects back with a one-time `?code=` parameter
 *   3. bridgeSupabaseSession() exchanges that code for a Supabase session
 *   4. POST /api/auth/supabase { access_token }
 *   5. Server verifies the token with Supabase, then:
 *        - existing account  -> links the Google identity and logs in
 *        - brand new account -> creates the Users row automatically and logs in
 *      and returns the usual { token, user } payload.
 */
import { apiFetch } from './api';
import { getSupabaseClient, readOAuthCodeFromUrl } from './supabaseClient';
import type { User } from '../types';

export interface BridgedSession {
  user: User;
  token: string;
}

// React StrictMode mounts effects twice in development. Both mounts can reach
// the bridge at the same time, but a PKCE code may only be redeemed once — so
// concurrent callers share one in-flight attempt instead of racing each other.
let bridgeInFlight: Promise<BridgedSession | null> | null = null;

export function bridgeSupabaseSession(): Promise<BridgedSession | null> {
  if (!bridgeInFlight) {
    bridgeInFlight = doBridgeSupabaseSession().finally(() => {
      bridgeInFlight = null;
    });
  }
  return bridgeInFlight;
}

/**
 * Returns a bridged app session when Supabase currently has a session, or
 * `null` when there is nothing to bridge (no session / not configured).
 * Throws with a user-facing message when the hand-off fails.
 */
async function doBridgeSupabaseSession(): Promise<BridgedSession | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  // 1. If we came back from Google with an authorization code, redeem it now
  //    and wait for the result. `detectSessionInUrl` is disabled on the client,
  //    so this is the only place the code is consumed.
  const code = readOAuthCodeFromUrl();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // A concurrent (StrictMode) or repeated exchange may already have stored
      // the session. Fall back to it before treating this as a failure.
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        console.warn('[auth] Supabase code exchange failed:', error.message);
        throw new Error(error.message || 'Google sign-in did not complete.');
      }
    } else {
      console.info('[auth] Exchanged the Google authorization code for a Supabase session.');
    }
  }

  // 2. Read whatever session Supabase now holds (fresh exchange or a still-valid
  //    session from an earlier visit in this browser).
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const accessToken = data.session?.access_token;
  if (!accessToken) return null;

  // 3. Trade it for the app's own bearer token; the server creates the local
  //    account automatically for first-time Google users.
  let res: Response;
  try {
    res = await apiFetch('/api/auth/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
  } catch {
    throw new Error('Could not reach the server to complete Google sign-in. Please try again.');
  }

  const payload: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    // A rejected Supabase session is useless from here on; drop it so the user
    // is not stuck in a half-signed-in state.
    if (res.status === 401) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    throw new Error(payload?.error || 'Google sign-in failed. Please try again.');
  }

  if (!payload?.token || !payload?.user) {
    throw new Error('The server did not return a session for this Google account.');
  }

  console.info(
    `[auth] Google sign-in bridged to local account #${payload.user.id} (${payload.user.username}).`
  );
  return { token: payload.token as string, user: payload.user as User };
}
