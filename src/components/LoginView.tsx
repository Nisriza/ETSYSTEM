import React, { useEffect, useState } from 'react';
import { User } from '../types.ts';
import { Train, User as UserIcon, Lock, Loader2, ArrowRight, CheckCircle2, UserRound } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton.tsx';
import InstallAppButton from './InstallAppButton.tsx';
import { apiFetch } from '../lib/api.ts';

type LoginLang = 'en' | 'bm';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  /** Message from a failed Google redirect (shown once, then cleared by the user). */
  initialError?: string | null;
  /** Route Supabase should return to after Google OAuth. */
  redirectPath?: string;
  /** Current UI language; the login screen copy follows it. */
  lang?: LoginLang;
}

const COPY = {
  en: {
    brandTag: 'Electric Train Service',
    subtitle: 'Public Transport Ridership Prediction & Travel Planning System',
    features: [
      'Forecast ridership by route, date and time',
      'Plan around public holidays and peak demand',
      'Save trips and share crowd feedback',
    ],
    signIn: 'Sign In',
    register: 'Register New Account',
    signInIntro: 'Sign in to continue to your dashboard.',
    registerIntro: 'Create an account to save trips and unlock every feature.',
    quickAccess: 'Quick access',
    guest: 'Continue as Guest',
    guestNote: 'Guests get limited access: search, prediction and holiday viewing.',
    divider: 'or use your account',
    fullName: 'Full Name',
    fullNamePlaceholder: 'e.g. Mohd Amin',
    username: 'Username',
    usernamePlaceholder: 'Enter username',
    password: 'Password',
    passwordPlaceholder: 'Enter password',
    roleLabel: 'User Type / Role',
    passenger: 'Passenger',
    operator: 'Operator',
    pleaseWait: 'Please Wait...',
    createAccount: 'Create Account',
    signInNow: 'Sign In Now',
    forgot: 'Forgot Password?',
    toggleRegister: "Don't have an account? Register here",
    toggleSignIn: 'Already have an account? Sign In',
    googleLabel: 'Sign in with Google',
    googleLoading: 'Redirecting to Google...',
    googleUnavailable:
      'Google sign-in is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY on the API host, or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel.',
    errRequired: 'Username and password are required.',
    errFullName: 'Please specify your Full Name.',
    errRegister: 'Failed to complete registration.',
    errAutoLogin: 'Registration successful, but auto-login failed. Please sign in manually.',
    errInvalid: 'Invalid credentials or user suspended.',
    errNetworkServer: 'Network error. Check connection or restart server.',
    errGuest: 'Failed to start guest session.',
    errNetwork: 'Network error. Please try again.',
    registrationSuccess: 'Registration successful! Logging you in...',
    forgotTitle: 'Reset Password',
    forgotIntro: 'Enter your registered full name and username to reset your password.',
    forgotFullNamePlaceholder: 'e.g. Aminah binti Ali',
    forgotUsername: 'Username',
    forgotUsernamePlaceholder: 'Your username',
    forgotNew: 'New Password',
    forgotNewPlaceholder: 'Min 8 chars, uppercase, lowercase, number, symbol',
    forgotConfirm: 'Confirm New Password',
    forgotConfirmPlaceholder: 'Re-enter new password',
    forgotSubmit: 'Reset Password',
    forgotSubmitting: 'Resetting...',
    cancel: 'Cancel',
    forgotErrFields: 'Please fill in all fields.',
    forgotErrMatch: 'Passwords do not match.',
    forgotErrFailed: 'Failed to reset password.',
    forgotSuccess: 'Password reset successfully!',
    guestTitle: 'Welcome, Guest!',
    guestIntro: 'Would you like a quick step-by-step tutorial on how to predict ridership?',
    guestYes: 'Yes, start tutorial',
    guestSkip: 'Skip for now',
  },
  bm: {
    brandTag: 'Perkhidmatan Kereta Api Elektrik',
    subtitle: 'Sistem Ramalan Ridership Pengangkutan Awam & Perancangan Perjalanan',
    features: [
      'Ramal jumlah penumpang mengikut laluan, tarikh dan masa',
      'Rancang perjalanan mengikut cuti umum dan permintaan puncak',
      'Simpan perjalanan dan kongsi maklum balas penumpang',
    ],
    signIn: 'Log Masuk',
    register: 'Daftar Akaun Baru',
    signInIntro: 'Log masuk untuk meneruskan ke papan pemuka anda.',
    registerIntro: 'Cipta akaun untuk menyimpan perjalanan dan membuka semua ciri.',
    quickAccess: 'Akses pantas',
    guest: 'Teruskan sebagai Tetamu',
    guestNote: 'Tetamu mendapat akses terhad: carian, ramalan dan paparan cuti sahaja.',
    divider: 'atau guna akaun anda',
    fullName: 'Nama Penuh',
    fullNamePlaceholder: 'cth. Mohd Amin',
    username: 'Nama Pengguna',
    usernamePlaceholder: 'Masukkan nama pengguna',
    password: 'Kata Laluan',
    passwordPlaceholder: 'Masukkan kata laluan',
    roleLabel: 'Jenis Pengguna / Peranan',
    passenger: 'Penumpang',
    operator: 'Pengendali',
    pleaseWait: 'Sila Tunggu...',
    createAccount: 'Buat Akaun',
    signInNow: 'Log Masuk Sekarang',
    forgot: 'Lupa Kata Laluan?',
    toggleRegister: 'Tiada akaun? Daftar di sini',
    toggleSignIn: 'Sudah ada akaun? Log Masuk',
    googleLabel: 'Log masuk dengan Google',
    googleLoading: 'Mengalih ke Google...',
    googleUnavailable:
      'Log masuk Google belum dikonfigurasikan. Tetapkan SUPABASE_URL dan SUPABASE_ANON_KEY pada hos API, atau VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di Vercel.',
    errRequired: 'Nama pengguna dan kata laluan diperlukan.',
    errFullName: 'Sila isi Nama Penuh anda.',
    errRegister: 'Pendaftaran gagal dilengkapkan.',
    errAutoLogin: 'Pendaftaran berjaya, tetapi log masuk automatik gagal. Sila log masuk secara manual.',
    errInvalid: 'Kelayakan tidak sah atau akaun digantung.',
    errNetworkServer: 'Ralat rangkaian. Sila semak sambungan atau mulakan semula pelayan.',
    errGuest: 'Gagal memulakan sesi tetamu.',
    errNetwork: 'Ralat rangkaian. Sila cuba lagi.',
    registrationSuccess: 'Pendaftaran berjaya! Log masuk...',
    forgotTitle: 'Set Semula Kata Laluan',
    forgotIntro: 'Masukkan nama penuh dan nama pengguna berdaftar untuk menyet semula kata laluan anda.',
    forgotFullNamePlaceholder: 'cth. Aminah binti Ali',
    forgotUsername: 'Nama Pengguna',
    forgotUsernamePlaceholder: 'Nama pengguna anda',
    forgotNew: 'Kata Laluan Baru',
    forgotNewPlaceholder: 'Minimum 8 aksara, huruf besar, huruf kecil, nombor, simbol',
    forgotConfirm: 'Sahkan Kata Laluan Baru',
    forgotConfirmPlaceholder: 'Masukkan semula kata laluan baru',
    forgotSubmit: 'Set Semula Kata Laluan',
    forgotSubmitting: 'Menyet semula...',
    cancel: 'Batal',
    forgotErrFields: 'Sila isi semua medan.',
    forgotErrMatch: 'Kata laluan tidak sepadan.',
    forgotErrFailed: 'Gagal menyet semula kata laluan.',
    forgotSuccess: 'Kata laluan berjaya diset semula!',
    guestTitle: 'Selamat Datang, Tetamu!',
    guestIntro: 'Adakah anda ingin melihat tutorial ringkas langkah demi langkah cara meramal jumlah penumpang?',
    guestYes: 'Ya, mula tutorial',
    guestSkip: 'Langkau',
  },
};

export default function LoginView({
  onLoginSuccess,
  initialError = null,
  lang = 'en',
  redirectPath = lang === 'bm' ? '/bm' : '/',
}: LoginViewProps) {
  const language: LoginLang = lang === 'bm' ? 'bm' : 'en';
  const c = COPY[language];

  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'passenger' | 'operator'>('passenger');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [forgotFullname, setForgotFullname] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [guestPrompt, setGuestPrompt] = useState(false);

  // Surface a Google redirect failure that happened outside this component.
  useEffect(() => {
    if (initialError) setErrorMsg(initialError);
  }, [initialError]);

  const startGuestSession = async (withTutorial: boolean) => {
    setGuestPrompt(false);
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await apiFetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || c.errGuest);
        setLoading(false);
        return;
      }
      if (withTutorial) localStorage.setItem('show_tutorial', '1');
      else localStorage.removeItem('show_tutorial');
      onLoginSuccess(data.user, data.token);
    } catch {
      setErrorMsg(c.errNetwork);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg(c.errRequired);
      return;
    }

    if (isRegister && !fullName.trim()) {
      setErrorMsg(c.errFullName);
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const response = await apiFetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: fullName,
            username: username.toLowerCase().trim(),
            password,
            role: userType,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMsg(data.error || c.errRegister);
          setLoading(false);
          return;
        }

        setSuccessMsg(c.registrationSuccess);

        const loginResponse = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.toLowerCase().trim(),
            password,
            language,
          }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          setErrorMsg(c.errAutoLogin);
          setIsRegister(false);
          setLoading(false);
          return;
        }

        onLoginSuccess(loginData.user, loginData.token);
      } else {
        const response = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.toLowerCase().trim(),
            password,
            language,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMsg(data.error || c.errInvalid);
          setLoading(false);
          return;
        }

        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      console.error('Submit handling error:', err);
      setErrorMsg(c.errNetworkServer);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!forgotFullname.trim() || !forgotUsername.trim() || !forgotNewPassword.trim()) {
      setErrorMsg(c.forgotErrFields);
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg(c.forgotErrMatch);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: forgotFullname,
          username: forgotUsername.toLowerCase().trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || c.forgotSuccess);
        setForgotFullname('');
        setForgotUsername('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setIsForgot(false);
      } else {
        setErrorMsg(data.error || c.forgotErrFailed);
      }
    } catch {
      setErrorMsg(c.errNetwork);
    } finally {
      setLoading(false);
    }
  };

  const resetAlerts = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] px-4 py-8 font-sans flex items-center justify-center md:py-12" id="login-container">
      <div
        className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e2e8f0] bg-white shadow-xl lg:grid-cols-[1.02fr_0.98fr]"
        id="login-card"
      >
        {/* Brand + install column */}
        <aside
          className="relative flex min-w-0 flex-col overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] p-7 text-white md:p-9"
          id="brand-header"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" aria-hidden="true" />

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2 break-words text-[10px] font-extrabold uppercase leading-snug tracking-[0.22em] text-indigo-200">
              <Train className="h-3.5 w-3.5" />
              {c.brandTag}
            </span>
            <div
              className="inline-flex shrink-0 items-center rounded-lg bg-white/10 p-0.5 text-[11px] font-bold ring-1 ring-white/15"
              id="login-lang-toggle"
            >
              <button
                type="button"
                onClick={() => {
                  if (language === 'bm') window.location.href = '/';
                }}
                className={`cursor-pointer rounded-md px-2.5 py-1 transition ${
                  language === 'en' ? 'bg-white text-[#4f46e5] shadow-sm' : 'text-indigo-100 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => {
                  if (language !== 'bm') window.location.href = '/bm';
                }}
                className={`cursor-pointer rounded-md px-2.5 py-1 transition ${
                  language === 'bm' ? 'bg-white text-[#4f46e5] shadow-sm' : 'text-indigo-100 hover:text-white'
                }`}
              >
                BM
              </button>
            </div>
          </div>

          <div className="relative mt-8 md:mt-10">
            <div
              className="mb-4 inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-3.5 shadow-sm"
              id="brand-icon-wrapper"
            >
              <Train className="h-7 w-7 text-white" id="brand-train-icon" />
            </div>
            <h1 className="break-words font-display text-[26px] font-extrabold leading-tight tracking-tight text-white" id="app-title">
              ETS Rider Predict System
            </h1>
            <p className="mt-2 max-w-sm text-xs font-medium leading-relaxed text-indigo-100/80" id="app-subtitle">
              {c.subtitle}
            </p>
          </div>

          <ul className="relative mt-7 hidden space-y-3 text-[11.5px] font-medium text-indigo-100/90 sm:block">
            {c.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="relative mt-auto pt-8">
            <InstallAppButton lang={language} appearance="panel" />
          </div>
        </aside>

        {/* Form column */}
        <section className="flex min-w-0 flex-col p-7 md:p-9" id="form-container">
          <div className="mb-5">
            <h2 className="font-display text-xl font-extrabold text-[#111827]" id="action-heading">
              {isRegister ? c.register : c.signIn}
            </h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#64748b]" id="action-subheading">
              {isRegister ? c.registerIntro : c.signInIntro}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-[#ef4444]" id="auth-error-alert">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-medium text-[#10b981]" id="auth-success-alert">
              {successMsg}
            </div>
          )}

          <div className="mb-4" id="google-auth-block">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#94a3b8]">{c.quickAccess}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <GoogleSignInButton
                label={c.googleLabel}
                loadingLabel={c.googleLoading}
                unavailableMessage={c.googleUnavailable}
                redirectPath={redirectPath}
                disabled={loading}
                onError={(message) => setErrorMsg(message)}
              />
              <button
                id="btn-continue-guest"
                type="button"
                onClick={() => {
                  resetAlerts();
                  setGuestPrompt(true);
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white py-2.5 text-xs font-bold text-[#475569] transition hover:border-[#c7d2fe] hover:bg-slate-50 hover:text-[#4f46e5]"
              >
                <UserRound className="h-4 w-4" />
                {c.guest}
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[#94a3b8]">{c.guestNote}</p>
            <div className="my-4 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">{c.divider}</span>
              <span className="h-px flex-1 bg-[#e2e8f0]" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5" id="auth-form">
            {isRegister && (
              <div id="field-fullname">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#64748b]" htmlFor="fullname">
                  {c.fullName}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                  <input
                    id="fullname"
                    type="text"
                    required
                    className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2 pl-10 pr-4 text-xs font-semibold text-[#1e293b] transition focus:border-[#4f46e5] focus:bg-white focus:outline-none"
                    placeholder={c.fullNamePlaceholder}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div id="field-username">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#64748b]" htmlFor="username">
                {c.username}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                <input
                  id="username"
                  type="text"
                  required
                  autoCapitalize="none"
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2 pl-10 pr-4 text-xs font-semibold text-[#1e293b] transition focus:border-[#4f46e5] focus:bg-white focus:outline-none"
                  placeholder={c.usernamePlaceholder}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div id="field-password">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#64748b]" htmlFor="password">
                {c.password}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                <input
                  id="password"
                  type="password"
                  required
                  className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-2 pl-10 pr-4 text-xs font-semibold text-[#1e293b] transition focus:border-[#4f46e5] focus:bg-white focus:outline-none"
                  placeholder={c.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isRegister && (
              <div id="field-usertype">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#64748b]">{c.roleLabel}</label>
                <div className="grid grid-cols-2 gap-2" id="role-grid">
                  {(['passenger', 'operator'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      id={`btn-role-${role}`}
                      className={`cursor-pointer break-words rounded-xl border px-1 py-2 text-center text-[10.5px] font-bold leading-tight transition sm:text-xs ${
                        userType === role
                          ? 'border-[#4f46e5] bg-[#e0e7ff]/40 text-[#4f46e5]'
                          : 'border-[#e2e8f0] bg-white text-[#64748b] hover:bg-slate-50'
                      }`}
                      onClick={() => setUserType(role)}
                    >
                      {role === 'operator' ? c.operator : c.passenger}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#4f46e5] py-2.5 text-xs font-bold text-white transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {c.pleaseWait}
                </>
              ) : (
                <>
                  {isRegister ? c.createAccount : c.signInNow}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {!isRegister && (
              <div className="mt-1 text-center">
                <button
                  id="btn-forgot-password"
                  type="button"
                  className="cursor-pointer text-xs font-medium text-[#64748b] transition hover:text-[#4f46e5]"
                  onClick={() => {
                    setIsForgot(true);
                    resetAlerts();
                  }}
                >
                  {c.forgot}
                </button>
              </div>
            )}
          </form>

          <div className="mt-5 border-t border-[#e2e8f0] pt-4 text-center" id="form-toggle-wrapper">
            <button
              id="btn-toggle-auth-mode"
              type="button"
              className="cursor-pointer text-xs font-bold text-[#4f46e5] transition hover:text-[#4338ca]"
              onClick={() => {
                setIsRegister(!isRegister);
                resetAlerts();
              }}
            >
              {isRegister ? c.toggleSignIn : c.toggleRegister}
            </button>
          </div>
        </section>
      </div>

      {/* Forgot Password Modal */}
      {isForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" id="forgot-password-modal">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 font-display text-base font-extrabold text-[#111827]">{c.forgotTitle}</h3>
            <p className="mb-4 text-xs text-slate-500">{c.forgotIntro}</p>

            {errorMsg && (
              <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-[#ef4444]">{errorMsg}</div>
            )}
            {successMsg && (
              <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-medium text-[#10b981]">{successMsg}</div>
            )}
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{c.fullName}</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#4f46e5] focus:outline-none"
                  placeholder={c.forgotFullNamePlaceholder}
                  value={forgotFullname}
                  onChange={(e) => setForgotFullname(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{c.forgotUsername}</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#4f46e5] focus:outline-none"
                  placeholder={c.forgotUsernamePlaceholder}
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{c.forgotNew}</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#4f46e5] focus:outline-none"
                  placeholder={c.forgotNewPlaceholder}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{c.forgotConfirm}</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#4f46e5] focus:outline-none"
                  placeholder={c.forgotConfirmPlaceholder}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 cursor-pointer rounded-xl bg-[#4f46e5] py-2.5 text-xs font-bold text-white transition hover:bg-[#4338ca] disabled:opacity-50"
                >
                  {loading ? c.forgotSubmitting : c.forgotSubmit}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgot(false);
                    resetAlerts();
                  }}
                  className="flex-1 cursor-pointer rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  {c.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest Tutorial Prompt */}
      {guestPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" id="guest-prompt">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 font-display text-base font-extrabold text-[#111827]">{c.guestTitle}</h3>
            <p className="mb-5 text-xs text-slate-500">{c.guestIntro}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => startGuestSession(true)}
                className="flex-1 cursor-pointer rounded-xl bg-[#4f46e5] py-2.5 text-xs font-bold text-white transition hover:bg-[#4338ca]"
                id="guest-start-tutorial"
              >
                {c.guestYes}
              </button>
              <button
                onClick={() => startGuestSession(false)}
                className="flex-1 cursor-pointer rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                id="guest-skip-tutorial"
              >
                {c.guestSkip}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
