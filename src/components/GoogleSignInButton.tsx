import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { signInWithGoogle } from '../lib/supabaseClient.ts';

interface GoogleSignInButtonProps {
  /** Localised label, e.g. "Sign in with Google". */
  label: string;
  /** Where Supabase should send the user back to: `/` (EN) or `/bm` (BM). */
  redirectPath?: string;
  /** Localised "please wait" label. */
  loadingLabel?: string;
  /** Localised message shown when the server has no Supabase credentials. */
  unavailableMessage?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.28-3.14.76-4.59l-7.97-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/**
 * Starts the Supabase Google OAuth redirect.
 *
 * The button deliberately never hides itself: it renders on both the English
 * and Malay login screens, and whether Google is configured is resolved when
 * the user clicks (build-time env first, then the API host). That prevents a
 * missing Vercel `VITE_*` variable from making the feature appear only in one
 * language/build.
 *
 * The actual "logged in" hand-off happens on app boot (see `bridgeSupabaseSession`
 * in src/lib/supabaseAuth.ts), because the browser leaves the page during the
 * redirect and comes back with the Supabase session already in the URL.
 */
export default function GoogleSignInButton({
  label,
  redirectPath = '/',
  loadingLabel = 'Redirecting to Google...',
  unavailableMessage = 'Google sign-in is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY on the API host (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel).',
  disabled = false,
  onError,
}: GoogleSignInButtonProps) {
  const [redirecting, setRedirecting] = useState(false);

  const handleClick = async () => {
    setRedirecting(true);
    const result = await signInWithGoogle(redirectPath);
    if (!result.ok) {
      setRedirecting(false);
      onError?.(
        result.code === 'not_configured'
          ? unavailableMessage
          : result.error || 'Google sign-in failed. Please try again.',
      );
    }
  };

  return (
    <div>
      <button
        id="btn-google-signin"
        type="button"
        onClick={handleClick}
        disabled={disabled || redirecting}
        className="w-full flex items-center justify-center gap-2.5 border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#1e293b] py-2.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {redirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
        {redirecting ? loadingLabel : label}
      </button>
    </div>
  );
}
