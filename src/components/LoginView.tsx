import React, { useState } from 'react';
import { User } from '../types.ts';
import { Train, Shield, User as UserIcon, Lock, Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'passenger' | 'operator' | 'admin'>('passenger');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        // Register API Call
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
        
        // Auto sign-in after register
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.toLowerCase().trim(),
            password
          })
        });

        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok) {
          setErrorMsg('Registration was successful, but auto-login failed. Please sign in manually.');
          setIsRegister(false);
          setLoading(false);
          return;
        }

        onLoginSuccess(loginData.user, loginData.token);
      } else {
        // Login API Call
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.toLowerCase().trim(),
            password
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-12 font-sans" id="login-container">
      <div className="w-full max-w-md bg-white border border-[#e2e8f0] shadow-md rounded-2xl overflow-hidden" id="login-card">
        {/* Card Header Banner in Sleek Interface Theme */}
        <div className="bg-white border-b border-[#e2e8f0] px-6 py-8 text-center" id="brand-header">
          <div className="inline-flex items-center justify-center p-3.5 bg-[#e0e7ff]/60 border border-[#c7d2fe] rounded-2xl mb-3.5 shadow-sm" id="brand-icon-wrapper">
            <Train className="h-7 w-7 text-[#4f46e5]" id="brand-train-icon" />
          </div>
          <h1 className="font-display text-[22px] font-extrabold tracking-tight text-[#111827]" id="app-title">ETS RiderPredict</h1>
          <p className="text-[#64748b] text-xs mt-1.5 font-medium" id="app-subtitle">Public Transport Ridership Prediction & Travel Planning System</p>
        </div>

        {/* Form area */}
        <div className="p-8" id="form-container">
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
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="fullname">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                  <input
                    id="fullname"
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
                    placeholder="e.g. Mohd Amin"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div id="field-username">
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="username">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                <input
                  id="username"
                  type="text"
                  required
                  autoCapitalize="none"
                  className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
                  placeholder="Choose username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div id="field-password">
              <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-[11px] h-4 w-4 text-[#64748b]" />
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-[#e2e8f0] rounded-xl text-xs focus:outline-none focus:border-[#4f46e5] bg-[#f8fafc] focus:bg-white transition h-10 font-semibold text-[#1e293b]"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {isRegister && (
              <div id="field-usertype">
                <label className="block text-xs font-bold text-[#64748b] uppercase tracking-wider mb-2">User Type / Role</label>
                <div className="grid grid-cols-3 gap-2" id="role-grid">
                  {(['passenger', 'operator', 'admin'] as const).map((role) => (
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
                      {role === 'operator' ? 'ETS Operator' : role}
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
                  Please Wait...
                </>
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Sign In Now'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle register view */}
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
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
