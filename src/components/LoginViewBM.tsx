import React, { useEffect, useState } from 'react';
import { User } from '../types.ts';
import { Train, Shield, User as UserIcon, Lock, Loader2, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import GoogleSignInButton from './GoogleSignInButton.tsx';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  /** Message from a failed Google redirect (shown once, then cleared by the user). */
  initialError?: string | null;
  /** Route Supabase should return to after Google OAuth. */
  redirectPath?: string;
}

export default function LoginViewBM({ onLoginSuccess, initialError = null, redirectPath = '/bm' }: LoginViewProps) {
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
        setErrorMsg(data.error || 'Gagal memulakan sesi tetamu.');
        setLoading(false);
        return;
      }
      if (withTutorial) localStorage.setItem('show_tutorial', '1');
      else localStorage.removeItem('show_tutorial');
      onLoginSuccess(data.user, data.token);
    } catch {
      setErrorMsg('Ralat rangkaian. Sila cuba lagi.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username and password are required.');
      return;
    }

    if (isRegister && !fullName.trim()) {
      setErrorMsg('Please specify your Full Name.');
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
            role: userType
          })
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMsg(data.error || 'Failed to complete registration.');
          setLoading(false);
          return;
        }

        setSuccessMsg('Pendaftaran berjaya! Log masuk...');
        
        const loginResponse = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.toLowerCase().trim(),
            password,
            language: 'bm'
          })
        });

        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
          setErrorMsg('Pendaftaran berjaya, tetapi log masuk automatik gagal. Sila log masuk secara manual.');
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
            language: 'en'
          })
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMsg(data.error || 'Invalid credentials or user suspended.');
          setLoading(false);
          return;
        }

        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      console.error('Submit handling error:', err);
      setErrorMsg('Network error. Check connection or restart server.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!forgotFullname.trim() || !forgotUsername.trim() || !forgotNewPassword.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('Passwords do not match.');
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
          newPassword: forgotNewPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Password reset successfully!');
        setForgotFullname('');
        setForgotUsername('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setIsForgot(false);
      } else {
        setErrorMsg(data.error || 'Failed to reset password.');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-12 font-sans" id="login-container">
      <div className="w-full max-w-md bg-white border border-[#e2e8f0] shadow-md rounded-2xl overflow-hidden" id="login-card">
        <div className="flex justify-end px-6 pt-4">
          <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
            <button onClick={() => window.location.href = '/'} className="px-3 py-1.5 text-slate-500 hover:text-[#4f46e5] cursor-pointer">EN</button>
            <span className="px-3 py-1.5 bg-white rounded-md shadow-sm text-[#4f46e5] cursor-default">BM</span>
          </div>
        </div>
        <div className="bg-white border-b border-[#e2e8f0] px-6 py-8 text-center" id="brand-header">
          <div className="inline-flex items-center justify-center p-3.5 bg-[#e0e7ff]/60 border border-[#c7d2fe] rounded-2xl mb-3.5 shadow-sm" id="brand-icon-wrapper">
            <Train className="h-7 w-7 text-[#4f46e5]" id="brand-train-icon" />
          </div>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-[#111827]" id="app-title">{'ETS Rider Predict System'}</h1>
          <p className="text-[#64748b] text-xs mt-1.5 font-medium" id="app-subtitle">{'Sistem Ramalan Ridership Pengangkutan Awam & Perancangan Perjalanan'}</p>
        </div>

        <div className="p-8 pt-2" id="form-container">
          <h2 className="font-display text-base font-bold text-[#1e293b] mb-5" id="action-heading">
            {isRegister ? 'Daftar Akaun Baru' : 'Log Masuk'}
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-[#ef4444] border border-red-100 text-xs rounded-xl font-medium" id="auth-error-alert">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 text-[#10b981] border border-emerald-100 text-xs rounded-xl font-medium animate-bounce" id="auth-success-alert">
              {successMsg}
            </div>
          )}

          <div className="mb-4" id="google-auth-block">
            <GoogleSignInButton
              label="Log masuk dengan Google"
              loadingLabel="Mengalih ke Google..."
              redirectPath={redirectPath}
              disabled={loading}
              onError={(message) => setErrorMsg(message)}
            />
            <div className="flex items-center gap-3 my-4" aria-hidden="true">
              <span className="flex-1 h-px bg-[#e2e8f0]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">atau guna akaun anda</span>
              <span className="flex-1 h-px bg-[#e2e8f0]" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
            {isRegister && (
              <div id="field-fullname">
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="fullname">{'Nama Penuh'}</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                  <input
                    id="fullname"
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
                    placeholder={'cth. Mohd Amin'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div id="field-username">
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="username">{'Nama Pengguna'}</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                <input
                  id="username"
                  type="text"
                  required
                  autoCapitalize="none"
                  className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
                  placeholder={'Masukkan nama pengguna'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div id="field-password">
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="password">{'Kata Laluan'}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
                  placeholder={'Masukkan kata laluan'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isRegister && (
              <div id="field-usertype">
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">{'Jenis Pengguna / Peranan'}</label>
                <div className="grid grid-cols-2 gap-2" id="role-grid">
                  {(['passenger', 'operator'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      id={`btn-role-${role}`}
                      className={`py-2 px-1 border text-center text-xs font-bold rounded-xl capitalize transition cursor-pointer ${
                        userType === role
                          ? 'border-[#4f46e5] bg-[#e0e7ff]/40 text-[#4f46e5]'
                          : 'border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#64748b]'
                      }`}
                      onClick={() => setUserType(role)}
                    >
                      {role === 'operator' ? 'Pengendali' : 'Penumpang/Pengguna'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {'Sila Tunggu...'}
                </>
              ) : (
                <>
                  {isRegister ? 'Buat Akaun' : 'Log Masuk Sekarang'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {!isRegister && (
              <div className="mt-2 text-center">
                <button
                  id="btn-forgot-password"
                  type="button"
                  className="text-xs font-medium text-[#64748b] hover:text-[#4f46e5] cursor-pointer"
                  onClick={() => {
                    setIsForgot(true);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  {'Lupa Kata Laluan?'}
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center border-t border-[#e2e8f0] pt-4.5" id="form-toggle-wrapper">
            <button
              id="btn-toggle-auth-mode"
              className="text-xs font-bold text-[#4f46e5] hover:text-[#4338ca] cursor-pointer"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              {isRegister ? 'Sudah ada akaun? Log Masuk' : 'Tiada akaun? Daftar di sini'}
            </button>

            <div className="mt-4">
              <button
                id="btn-continue-guest"
                type="button"
                onClick={() => { setErrorMsg(null); setSuccessMsg(null); setGuestPrompt(true); }}
                className="w-full border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#64748b] hover:text-[#4f46e5] py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {'Teruskan sebagai Tetamu'}
              </button>
              <p className="text-[10.5px] text-[#94a3b8] mt-2 leading-relaxed">{'Tetamu mendapat akses terhad: carian, ramalan dan paparan cuti sahaja.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">{'Set Semula Kata Laluan'}</h3>
            <p className="text-xs text-slate-500 mb-4">{'Masukkan nama penuh dan nama pengguna berdaftar untuk menyet semula kata laluan anda.'}</p>

            {errorMsg && (
              <div className="mb-3 p-3 bg-red-50 text-[#ef4444] border border-red-100 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-3 p-3 bg-emerald-50 text-[#10b981] border border-emerald-100 text-xs rounded-xl font-medium">
                {successMsg}
              </div>
            )}
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{'Nama Penuh'}</label>
                <input
                  type="text"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4f46e5]"
                  placeholder={'cth. Aminah binti Ali'}
                  value={forgotFullname}
                  onChange={(e) => setForgotFullname(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{'Nama Pengguna'}</label>
                <input
                  type="text"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4f46e5]"
                  placeholder={'Nama pengguna anda'}
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{'Kata Laluan Baru'}</label>
                <input
                  type="password"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4f46e5]"
                  placeholder={'Minimum 8 aksara, huruf besar, huruf kecil, nombor, simbol'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{'Sahkan Kata Laluan Baru'}</label>
                <input
                  type="password"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4f46e5]"
                  placeholder={'Masukkan semula kata laluan baru'}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Menyet semula...' : 'Set Semula Kata Laluan'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setErrorMsg(null); setSuccessMsg(null); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {'Batal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Guest Tutorial Prompt */}
      {guestPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" id="guest-prompt">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">{'Selamat Datang, Tetamu!'}</h3>
            <p className="text-xs text-slate-500 mb-5">{'Adakah anda ingin melihat tutorial ringkas langkah demi langkah cara meramal jumlah penumpang?'}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => startGuestSession(true)}
                className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                id="guest-start-tutorial"
              >
                {'Ya, mula tutorial'}
              </button>
              <button
                onClick={() => startGuestSession(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                id="guest-skip-tutorial"
              >
                {'Langkau'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
