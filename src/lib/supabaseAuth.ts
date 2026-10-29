/**
 * Trades a Supabase Auth session (created by Google sign-in) for the app's own
 * bearer token, so none of the existing protected API routes need to change.
 *
 * Flow:
 *   1. supabase.auth.signInWithOAuth({ provider: 'google' })  -> Google -> Supabase
 *   2. Supabase redirects back with a session (detectSessionInUrl)
 *   3. POST /api/auth/supabase { access_token }
 *   4. Server verifies the token with Supabase, links/creates the Users row and
 *      returns the usual { token, user } payload.
 */
import { apiFetch } from './api';
import { getSupabaseClient } from './supabaseClient';
import type { User } from '../types';

export interface BridgedSession {
  user: User;
  token: string;
}

/**
 * Returns a bridged app session when Supabase currently has a session, or
 * `null` when there is nothing to bridge (no session / not configured).
 * Throws with a user-facing message when the server rejects the token.
 */
export async function bridgeSupabaseSession(): Promise<BridgedSession | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const accessToken = data.session?.access_token;
  if (!accessToken) return null;

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

  return { token: payload.token as string, user: payload.user as User };
}
