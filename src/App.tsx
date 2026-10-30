import React, { useState, useEffect } from 'react';
import { User } from './types.ts';
import LoginView from './components/LoginView.tsx';
import PassengerView from './components/PassengerView.tsx';
import PassengerViewBM from './components/PassengerViewBM.tsx';
import OperatorView from './components/OperatorView.tsx';
import OperatorViewBM from './components/OperatorViewBM.tsx';
import AdminView from './components/AdminView.tsx';
import AdminViewBM from './components/AdminViewBM.tsx';
import { Train, LogOut, LogIn, Loader2, User as UserIcon, HelpCircle } from 'lucide-react';
import TutorialOverlay from './components/TutorialOverlay.tsx';
import InstallAppButton from './components/InstallAppButton.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import { getTutorialStepsForRole, markTutorialCompleted } from './lib/tutorial.ts';
import { apiFetch } from './lib/api.ts';
import { bridgeSupabaseSession } from './lib/supabaseAuth.ts';
import { clearOAuthParamsFromUrl, readOAuthErrorFromUrl, signOutOfSupabase } from './lib/supabaseClient.ts';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  // Shown on the login card when Google sign-in fails after the redirect back.
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const lang = window.location.pathname.startsWith('/bm') ? 'bm' : 'en';
  const isBM = lang === 'bm';

  // Keep the document language in sync for screen readers and translation tools.
  useEffect(() => {
    document.documentElement.lang = isBM ? 'ms' : 'en';
  }, [isBM]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const storedToken = localStorage.getItem('user_token');
      if (storedToken) {
        const restored = await verifySession(storedToken);
        if (cancelled) return;
        if (restored) {
          setInitializing(false);
          return;
        }
      }

      // No usable app session: this may be the redirect back from Google.
      const oauthError = readOAuthErrorFromUrl();
      if (oauthError) {
        if (!cancelled) setAuthNotice(oauthError);
        clearOAuthParamsFromUrl();
      }

      try {
        const bridged = await bridgeSupabaseSession();
        if (!cancelled && bridged) {
          handleLoginSuccess(bridged.user, bridged.token);
          clearOAuthParamsFromUrl();
        }
      } catch (e: any) {
        if (!cancelled) {
          setAuthNotice(e?.message || 'Google sign-in failed. Please try again.');
          clearOAuthParamsFromUrl();
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    boot();
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    if (!user || !token) { setTutorialOpen(false); return; }
    const isGuest = user.role === 'guest';
    if (isGuest) {
      if (window.localStorage.getItem('show_tutorial') === '1') {
        window.localStorage.removeItem('show_tutorial');
        const timer = window.setTimeout(() => setTutorialOpen(true), 600);
        return () => window.clearTimeout(timer);
      }
      setTutorialOpen(false);
      return;
    }
    if (user.tutorial_completed) { setTutorialOpen(false); return; }

    // Only the first successful login suggests the tutorial. `login_count` is
    // null when the phase-6 migration has not been applied, in which case we do
    // not interrupt an existing account.
    const loginCount = typeof user.login_count === 'number' ? user.login_count : null;
    if (loginCount !== 1) { setTutorialOpen(false); return; }

    // A refresh keeps `login_count` at 1 until the next sign-in. The session
    // guard stops the suggestion from reopening on every reload.
    const guardKey = `ets_tutorial_auto_${user.id}`;
    try {
      if (window.sessionStorage.getItem(guardKey) === '1') {
        setTutorialOpen(false);
        return;
      }
    } catch {
      /* storage disabled */
    }

    const timer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(guardKey, '1');
      } catch {
        /* storage disabled */
      }
      setTutorialOpen(true);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [user, token]);

  const closeTutorial = () => {
    setTutorialOpen(false);
    if (user && user.role !== 'guest' && !user.tutorial_completed) {
      markTutorialCompleted(true).catch(() => { /* ignore */ });
      setUser((prev) => (prev ? { ...prev, tutorial_completed: true } : prev));
    }
  };

  const verifySession = async (sessionToken: string): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(sessionToken);
        return true;
      }
      localStorage.removeItem('user_token');
      return false;
    } catch (e) {
      console.error('Session verify failed:', e);
      return false;
    }
  };

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    setAuthNotice(null);
    localStorage.setItem('user_token', sessionToken);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    // Also end the Supabase session so the next Google sign-in re-prompts.
    await signOutOfSupabase();
    setUser(null);
    setToken(null);
    localStorage.removeItem('user_token');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans" id="app-init">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" id="spinner" />
        <p className="text-xs text-slate-500 font-bold mt-3" id="loading-sub">{isBM ? 'Memuatkan...' : 'Loading...'}</p>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        initialError={authNotice}
        lang={isBM ? 'bm' : 'en'}
        redirectPath={isBM ? '/bm' : '/'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans" id="app-main">
      <header className="bg-white border-b border-[#e2e8f0] text-[#1e293b]" id="main-app-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-y-2.5" id="header-wrapper">
          <div className="flex items-center gap-3">
            <div className="bg-[#4f46e5] p-2.5 rounded-xl text-white shadow-sm">
              <Train className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-[#111827] text-base md:text-lg tracking-tight leading-none flex items-center gap-1.5">
                {'ETS Rider Predict System'}
                <span className="text-[10px] font-bold bg-[#e0e7ff] text-[#4f46e5] px-1.5 py-0.5 rounded-full uppercase tracking-wider">{isBM ? 'PRO' : 'PRO'}</span>
              </h1>
              <p className="text-[10.5px] text-[#64748b] font-medium mt-1">
                {isBM ? 'Sistem Ramalan Ridership Pengangkutan Awam & Perancangan Perjalanan' : 'Public Transport Ridership Prediction & Travel Planning System'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3" id="header-status">
            <InstallAppButton lang={isBM ? 'bm' : 'en'} />
            <button
              id="btn-help-tutorial"
              type="button"
              onClick={() => setTutorialOpen(true)}
              className="p-2 rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#4f46e5] hover:border-[#c7d2fe] transition cursor-pointer"
              title={isBM ? 'Tutorial / Cara Guna' : 'Tutorial / How to Use'}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg p-0.5 text-[11px] font-bold" id="header-lang-toggle">
              <button
                onClick={() => { if (isBM) window.location.href = '/'; }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${!isBM ? 'bg-white shadow-sm text-[#4f46e5]' : 'text-[#64748b] hover:text-[#4f46e5]'}`}
              >
                EN
              </button>
              <button
                onClick={() => { if (!isBM) window.location.href = '/bm'; }}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${isBM ? 'bg-white shadow-sm text-[#4f46e5]' : 'text-[#64748b] hover:text-[#4f46e5]'}`}
              >
                BM
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2.5 bg-[#f1f5f9] px-3.5 py-1.5 rounded-xl border border-[#e2e8f0] text-right">
              <div>
                <span className="text-xs font-bold block text-[#1e293b]">{user.role === 'guest' ? (isBM ? 'Tetamu' : 'Guest') : user.full_name}</span>
                <span className="text-[9px] text-[#4f46e5] font-extrabold uppercase tracking-wide leading-none">
                  {user.role === 'guest' ? (isBM ? 'Akses Terhad' : 'Limited Access') : `${user.role} ${isBM ? 'Keistimewaan' : 'Privilege'}`}
                </span>
              </div>
              <span className="p-1 bg-white border border-[#e2e8f0] rounded-lg text-[#64748b]">
                <UserIcon className="h-3.5 w-3.5" />
              </span>
            </div>

            {user.role === 'guest' ? (
              <button
                id="btn-guest-signin"
                onClick={handleLogout}
                className="sleek-btn-secondary border-[#c7d2fe] bg-white p-2 py-1.5 text-xs font-bold text-[#4f46e5] hover:bg-[#eef2ff] flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                {isBM ? 'Log Masuk / Daftar' : 'Sign In / Register'}
              </button>
            ) : (
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="p-2 py-1.5 sleek-btn-secondary border-red-100 hover:bg-red-50 hover:border-red-200 text-red-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isBM ? 'Log Keluar' : 'Logout'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1" id="main-content">
        {user.role === 'passenger' && (isBM ? <PassengerViewBM user={user} token={token} /> : <PassengerView user={user} token={token} />)}
        {user.role === 'guest' && (isBM ? <PassengerViewBM user={user} token={token} /> : <PassengerView user={user} token={token} />)}
        {user.role === 'operator' && (isBM ? <OperatorViewBM user={user} token={token} /> : <OperatorView user={user} token={token} />)}
        {user.role === 'admin' && (isBM ? <AdminViewBM user={user} token={token} /> : <AdminView user={user} token={token} />)}
      </main>
      <AIAssistant token={token} />

      <footer className="bg-white border-t border-[#e2e8f0] py-5 text-center text-[10.5px] font-medium text-[#64748b] mt-auto" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{isBM ? '© 2026 Perkhidmatan Kereta Api Elektrik Malaysia (ETS). Hak cipta terpelihara.' : '© 2026 Malaysia Electric Train Service (ETS). All rights reserved.'}</span>
          <span className="flex items-center gap-1 text-[#64748b]">
            {isBM ? 'Cap Sistem:' : 'System Stamped:'} <span className="bg-[#f1f5f9] text-[#1e293b] px-1.5 py-0.5 rounded font-mono border border-[#e2e8f0]">{'SQLite V3.4'}</span>
          </span>
        </div>
      </footer>
      {tutorialOpen && user && (
        <TutorialOverlay
          steps={getTutorialStepsForRole(user.role, isBM ? 'bm' : 'en')}
          onClose={closeTutorial}
          lang={isBM ? 'bm' : 'en'}
        />
      )}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
