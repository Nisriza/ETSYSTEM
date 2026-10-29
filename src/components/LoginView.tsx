import React, { useState } from 'react';
import { User } from '../types.ts';
<<<<<<< HEAD
import { Train, Shield, User as UserIcon, Lock, Loader2, ArrowRight } from 'lucide-react';
=======
import { Train, Shield, User as UserIcon, Lock, Sparkles, Loader2, ArrowRight } from 'lucide-react';
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRegister, setIsRegister] = useState(false);
<<<<<<< HEAD
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

  const startGuestSession = async (withTutorial: boolean) => {
    setGuestPrompt(false);
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to start guest session.');
        setLoading(false);
        return;
      }
      if (withTutorial) localStorage.setItem('show_tutorial', '1');
      else localStorage.removeItem('show_tutorial');
      onLoginSuccess(data.user, data.token);
    } catch {
      setErrorMsg('Network error. Please try again.');
      setLoading(false);
    }
  };
=======
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'passenger' | 'operator' | 'admin'>('passenger');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413

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
<<<<<<< HEAD
=======
        // Register API Call
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        const response = await fetch('/api/auth/register', {
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

        setSuccessMsg('Registration successful! Logging you in...');
        
<<<<<<< HEAD
=======
        // Auto sign-in after register
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.toLowerCase().trim(),
<<<<<<< HEAD
            password,
            language: 'en'
=======
            password
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
          })
        });

        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
<<<<<<< HEAD
          setErrorMsg('Registration successful, but auto-login failed. Please sign in manually.');
=======
          setErrorMsg('Registration was successful, but auto-login failed. Please sign in manually.');
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
          setIsRegister(false);
          setLoading(false);
          return;
        }

        onLoginSuccess(loginData.user, loginData.token);
      } else {
<<<<<<< HEAD
=======
        // Login API Call
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.toLowerCase().trim(),
<<<<<<< HEAD
            password,
            language: 'en'
=======
            password
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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

<<<<<<< HEAD
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
      const res = await fetch('/api/auth/forgot-password', {
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
            <span className="px-3 py-1.5 bg-white rounded-md shadow-sm text-[#4f46e5] cursor-default">EN</span>
            <button onClick={() => window.location.href = '/bm'} className="px-3 py-1.5 text-slate-500 hover:text-[#4f46e5] cursor-pointer">BM</button>
          </div>
        </div>
=======
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-12 font-sans" id="login-container">
      <div className="w-full max-w-md bg-white border border-[#e2e8f0] shadow-md rounded-2xl overflow-hidden" id="login-card">
        {/* Card Header Banner in Sleek Interface Theme */}
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
        <div className="bg-white border-b border-[#e2e8f0] px-6 py-8 text-center" id="brand-header">
          <div className="inline-flex items-center justify-center p-3.5 bg-[#e0e7ff]/60 border border-[#c7d2fe] rounded-2xl mb-3.5 shadow-sm" id="brand-icon-wrapper">
            <Train className="h-7 w-7 text-[#4f46e5]" id="brand-train-icon" />
          </div>
<<<<<<< HEAD
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-[#111827]" id="app-title">{'ETS RiderPredict'}</h1>
          <p className="text-[#64748b] text-xs mt-1.5 font-medium" id="app-subtitle">{'Public Transport Ridership Prediction & Travel Planning System'}</p>
        </div>

        <div className="p-8 pt-2" id="form-container">
=======
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-[#111827]" id="app-title">ETS RiderPredict</h1>
          <p className="text-[#64748b] text-xs mt-1.5 font-medium" id="app-subtitle">Public Transport Ridership Prediction & Travel Planning System</p>
        </div>

        {/* Form area */}
        <div className="p-8" id="form-container">
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
          <h2 className="font-display text-base font-bold text-[#1e293b] mb-5" id="action-heading">
            {isRegister ? 'Register New Account' : 'Sign In'}
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

          <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
            {isRegister && (
              <div id="field-fullname">
<<<<<<< HEAD
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="fullname">{'Full Name'}</label>
=======
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="fullname">Full Name</label>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                  <input
                    id="fullname"
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
<<<<<<< HEAD
                    placeholder={'e.g. Mohd Amin'}
=======
                    placeholder="e.g. Mohd Amin"
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div id="field-username">
<<<<<<< HEAD
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="username">{'Username'}</label>
=======
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="username">Username</label>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                <input
                  id="username"
                  type="text"
                  required
                  autoCapitalize="none"
                  className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
<<<<<<< HEAD
                  placeholder={'Enter username'}
=======
                  placeholder="Choose username"
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div id="field-password">
<<<<<<< HEAD
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="password">{'Password'}</label>
=======
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="password">Password</label>
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
              <div className="relative">
                <Lock className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
<<<<<<< HEAD
                  placeholder={'Enter password'}
=======
                  placeholder="Enter password"
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isRegister && (
              <div id="field-usertype">
<<<<<<< HEAD
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">{'User Type / Role'}</label>
                <div className="grid grid-cols-2 gap-2" id="role-grid">
                  {(['passenger', 'operator'] as const).map((role) => (
=======
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">User Type / Role</label>
                <div className="grid grid-cols-3 gap-2" id="role-grid">
                  {(['passenger', 'operator', 'admin'] as const).map((role) => (
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
                      {role === 'operator' ? 'Operator' : 'Passenger/User'}
=======
                      {role === 'operator' ? 'ETS Operator' : role}
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
                  {'Please Wait...'}
=======
                  Please Wait...
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
                </>
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Sign In Now'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
<<<<<<< HEAD

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
                  {'Forgot Password?'}
                </button>
              </div>
            )}
          </form>

=======
          </form>

          {/* Toggle register view */}
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
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
<<<<<<< HEAD
              {isRegister ? 'Already have an account? Sign In' : 'Don\'t have an account? Register here'}
            </button>

            <div className="mt-4">
              <button
                id="btn-continue-guest"
                type="button"
                onClick={() => { setErrorMsg(null); setSuccessMsg(null); setGuestPrompt(true); }}
                className="w-full border border-[#e2e8f0] bg-white hover:bg-slate-50 text-[#64748b] hover:text-[#4f46e5] py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {'Continue as Guest'}
              </button>
              <p className="text-[10.5px] text-[#94a3b8] mt-2 leading-relaxed">{'Guests get limited access: search, prediction and holiday viewing.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">{'Reset Password'}</h3>
            <p className="text-xs text-slate-500 mb-4">{'Enter your registered full name and username to reset your password.'}</p>

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
                <label className="block text-xs font-semibold text-slate-500 mb-1">{'Full Name'}</label>
                <input
                  type="text"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4f46e5]"
                  placeholder={'e.g. Aminah binti Ali'}
                  value={forgotFullname}
                  onChange={(e) => setForgotFullname(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{'Username'}</label>
                <input
                  type="text"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4f46e5]"
                  placeholder={'Your username'}
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{'New Password'}</label>
                <input
                  type="password"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4f46e5]"
                  placeholder={'Min 8 chars, uppercase, lowercase, number, symbol'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">{'Confirm New Password'}</label>
                <input
                  type="password"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4f46e5]"
                  placeholder={'Re-enter new password'}
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
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setErrorMsg(null); setSuccessMsg(null); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {'Cancel'}
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
            <h3 className="font-display font-extrabold text-[#111827] text-base mb-1">{'Welcome, Guest!'}</h3>
            <p className="text-xs text-slate-500 mb-5">{'Would you like a quick step-by-step tutorial on how to predict ridership?'}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => startGuestSession(true)}
                className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca] text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                id="guest-start-tutorial"
              >
                {'Yes, start tutorial'}
              </button>
              <button
                onClick={() => startGuestSession(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                id="guest-skip-tutorial"
              >
                {'Skip for now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
=======
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
