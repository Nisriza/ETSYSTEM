/**
 * Translates raw Google/Supabase OAuth errors into friendly, actionable,
 * localised messages. Google and Supabase return terse error strings in the
 * redirect URL (error / error_description) or via the API, none of which tell
 * an end user — or even the admin — what to actually fix.
 *
 * The raw message is always kept in the console log for debugging; only the
 * friendly version reaches the login screen.
 */

export interface FriendlyAuthError {
  title: string;
  message: string;
  /** Concrete fix for the person configuring the app (admin/developer). */
  hint: string;
}

const COPY = {
  en: {
    testingTitle: 'Google sign-in is in test mode',
    testingMsg:
      'This Google account is not on the allowed tester list, so Google blocked the sign-in.',
    testingHint:
      'Fix: Google Cloud Console → APIs & Services → OAuth consent screen → click "Publish app" (or add this Gmail address under Test users).',

    redirectTitle: 'Sign-in redirect is not registered',
    redirectMsg: 'Google rejected the return address after sign-in.',
    redirectHint:
      'Fix: Google Cloud Console → Credentials → your OAuth Client → add https://<project>.supabase.co/auth/v1/callback to Authorized redirect URIs.',

    clientTitle: 'Google credentials mismatch',
    clientMsg: 'Google rejected the client ID or secret stored in Supabase.',
    clientHint:
      'Fix: Supabase → Authentication → Providers → Google → re-paste the Client ID and Client Secret from Google Cloud Console (watch for trailing spaces).',

    providerTitle: 'Google provider is turned off',
    providerMsg: 'Supabase is not accepting Google sign-ins at the moment.',
    providerHint:
      'Fix: Supabase → Authentication → Providers → enable Google and save.',

    urlTitle: 'This app URL is not allowlisted',
    urlMsg: 'Supabase refused to send you back to this website address.',
    urlHint:
      'Fix: Supabase → Authentication → URL Configuration → add this site URL (and the /bm variant) to Redirect URLs.',

    migrationTitle: 'Database update required',
    migrationMsg: 'The account database is missing the Google sign-in columns.',
    migrationHint: 'Fix: run supabase_migration_phase5.sql in the Supabase SQL Editor.',

    configTitle: 'Google sign-in is not configured',
    configMsg: 'The server has no Supabase credentials yet.',
    configHint:
      'Fix: set SUPABASE_URL and SUPABASE_ANON_KEY on the API host (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel).',

    serverTitle: 'Sign-in could not be completed',
    serverMsg: 'The server rejected the Google session after sign-in.',
    serverHint: 'Please try again. If it keeps failing, contact the administrator.',

    incompleteTitle: 'Google sign-in did not finish',
    incompleteMsg: 'You came back from Google, but the app could not confirm a signed-in session.',
    incompleteHint:
      'Click "Sign in with Google" and try again. If it keeps happening, clear this site\'s cookies and retry, or sign in with your username and password.',

    fallbackTitle: 'Google sign-in failed',
    fallbackHint: 'Please try again, or sign in with your username and password.',
  },
  bm: {
    testingTitle: 'Log masuk Google dalam mod ujian',
    testingMsg:
      'Akaun Google ini tiada dalam senarai penguji yang dibenarkan, jadi Google menyekat log masuk.',
    testingHint:
      'Penyelesaian: Google Cloud Console → APIs & Services → OAuth consent screen → klik "Publish app" (atau tambah alamat Gmail ini di bawah Test users).',

    redirectTitle: 'Alamat kembali tidak didaftarkan',
    redirectMsg: 'Google menolak alamat kembali selepas log masuk.',
    redirectHint:
      'Penyelesaian: Google Cloud Console → Credentials → OAuth Client anda → tambah https://<project>.supabase.co/auth/v1/callback pada Authorized redirect URIs.',

    clientTitle: 'Kredensial Google tidak sepadan',
    clientMsg: 'Google menolak Client ID atau Client Secret yang disimpan dalam Supabase.',
    clientHint:
      'Penyelesaian: Supabase → Authentication → Providers → Google → tampal semula Client ID dan Client Secret daripada Google Cloud Console (pastikan tiada ruang kosong).',

    providerTitle: 'Penyedia Google dimatikan',
    providerMsg: 'Supabase tidak menerima log masuk Google buat masa ini.',
    providerHint:
      'Penyelesaian: Supabase → Authentication → Providers → aktifkan Google dan simpan.',

    urlTitle: 'URL aplikasi ini tidak dibenarkan',
    urlMsg: 'Supabase enggan menghantar anda kembali ke alamat laman web ini.',
    urlHint:
      'Penyelesaian: Supabase → Authentication → URL Configuration → tambah URL laman ini (dan varian /bm) pada Redirect URLs.',

    migrationTitle: 'Kemas kini pangkalan data diperlukan',
    migrationMsg: 'Pangkalan data akaun tiada lajur untuk log masuk Google.',
    migrationHint: 'Penyelesaian: jalankan supabase_migration_phase5.sql dalam Supabase SQL Editor.',

    configTitle: 'Log masuk Google belum dikonfigurasikan',
    configMsg: 'Pelayan belum mempunyai kredensial Supabase.',
    configHint:
      'Penyelesaian: tetapkan SUPABASE_URL dan SUPABASE_ANON_KEY pada hos API (atau VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di Vercel).',

    serverTitle: 'Log masuk tidak dapat disempurnakan',
    serverMsg: 'Pelayan menolak sesi Google selepas log masuk.',
    serverHint: 'Sila cuba lagi. Jika masih gagal, hubungi pentadbir.',

    incompleteTitle: 'Log masuk Google tidak selesai',
    incompleteMsg: 'Anda kembali daripada Google, tetapi aplikasi tidak dapat mengesahkan sesi log masuk.',
    incompleteHint:
      'Klik "Log masuk dengan Google" dan cuba lagi. Jika berterusan, kosongkan kuki laman ini dan cuba semula, atau log masuk dengan nama pengguna dan kata laluan.',

    fallbackTitle: 'Log masuk Google gagal',
    fallbackHint: 'Sila cuba lagi, atau log masuk menggunakan nama pengguna dan kata laluan.',
  },
} as const;

/**
 * Maps a raw OAuth/server error to a friendly explanation. Never throws —
 * unknown errors fall through to a generic message with the original text
 * appended for context.
 */
export function describeGoogleAuthError(raw: string, isBM: boolean): FriendlyAuthError {
  const c = isBM ? COPY.bm : COPY.en;
  const m = (raw || '').toLowerCase();

  if (m.includes('access_denied') || m.includes('verification process') || m.includes('access blocked') || m.includes('unverified app')) {
    return { title: c.testingTitle, message: c.testingMsg, hint: c.testingHint };
  }
  if (m.includes('redirect_uri_mismatch')) {
    return { title: c.redirectTitle, message: c.redirectMsg, hint: c.redirectHint };
  }
  if (m.includes('invalid_client') || m.includes('client_secret') || m.includes('unauthorized_client')) {
    return { title: c.clientTitle, message: c.clientMsg, hint: c.clientHint };
  }
  if (m.includes('unsupported provider') || m.includes('provider') && m.includes('not enabled')) {
    return { title: c.providerTitle, message: c.providerMsg, hint: c.providerHint };
  }
  if (m.includes('redirect') && (m.includes('not allowed') || m.includes('not whitelisted') || m.includes('not allowlisted') || m.includes('invalid redirect'))) {
    return { title: c.urlTitle, message: c.urlMsg, hint: c.urlHint };
  }
  if (m.includes('migration') || m.includes('supabase_uid') || m.includes('column')) {
    return { title: c.migrationTitle, message: c.migrationMsg, hint: c.migrationHint };
  }
  if (m.includes('not configured')) {
    return { title: c.configTitle, message: c.configMsg, hint: c.configHint };
  }
  if (m.includes('did not return') || m.includes('invalid or expired') || m.includes('did not return a session')) {
    return { title: c.serverTitle, message: c.serverMsg, hint: c.serverHint };
  }
  if (m.includes('did not complete') || m.includes('no session was created') || m.includes('no session')) {
    return { title: c.incompleteTitle, message: c.incompleteMsg, hint: c.incompleteHint };
  }
  if (m.includes('code verifier') || m.includes('pkce') || m.includes('invalid flow state') || m.includes('auth code')) {
    return { title: c.incompleteTitle, message: c.incompleteMsg, hint: c.incompleteHint };
  }
  return { title: c.fallbackTitle, message: raw, hint: c.fallbackHint };
}

/** Formats the friendly error as the plain multi-line string LoginView displays. */
export function formatGoogleAuthError(raw: string, isBM: boolean): string {
  const f = describeGoogleAuthError(raw, isBM);
  return `${f.title}\n${f.message}\n${f.hint}`;
}
