import React, { useState, useEffect } from 'react';
import { User } from './types.ts';
import LoginView from './components/LoginView.tsx';
import PassengerView from './components/PassengerView.tsx';
import OperatorView from './components/OperatorView.tsx';
import AdminView from './components/AdminView.tsx';
import { Train, LogOut, Loader2, Sparkles, User as UserIcon } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Attempt session restore
    const storedToken = localStorage.getItem('user_token');
    if (storedToken) {
      verifySession(storedToken);
    } else {
      setInitializing(false);
    }
  }, []);

  const verifySession = async (sessionToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(sessionToken);
      } else {
        localStorage.removeItem('user_token');
      }
    } catch (e) {
      console.error('Session verify failed:', e);
    } finally {
      setInitializing(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: User, sessionToken: string) => {
    setUser(loggedInUser);
    setToken(sessionToken);
    localStorage.setItem('user_token', sessionToken);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('user_token');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans" id="app-init">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" id="spinner" />
        <p className="text-xs text-slate-500 font-bold mt-3" id="loading-sub">Synchronizing secure terminal databases...</p>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans" id="app-main">
      {/* Top Main Application Banner Header in Sleek Interface Theme */}
      <header className="bg-white border-b border-[#e2e8f0] text-[#1e293b]" id="main-app-header">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between" id="header-wrapper">
          <div className="flex items-center gap-3">
            <div className="bg-[#4f46e5] p-2.5 rounded-xl text-white shadow-sm">
              <Train className="h-5.5 w-5.5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-[#111827] text-base md:text-lg tracking-tight leading-none flex items-center gap-1.5">
                ETS RiderPredict
                <span className="text-[10px] font-bold bg-[#e0e7ff] text-[#4f46e5] px-1.5 py-0.5 rounded-full uppercase tracking-wider">PRO</span>
              </h1>
              <p className="text-[10.5px] text-[#64748b] font-medium mt-1">
                Ridership Prediction and Travel Decision Support System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3" id="header-status">
            <div className="hidden sm:flex items-center gap-2.5 bg-[#f1f5f9] px-3.5 py-1.5 rounded-xl border border-[#e2e8f0] text-right">
              <div>
                <span className="text-xs font-bold block text-[#1e293b]">{user.full_name}</span>
                <span className="text-[9px] text-[#4f46e5] font-extrabold uppercase tracking-wide leading-none">{user.role} Privilege</span>
              </div>
              <span className="p-1 bg-white border border-[#e2e8f0] rounded-lg text-[#64748b]">
                <UserIcon className="h-3.5 w-3.5" />
              </span>
            </div>

            <button
              id="btn-logout"
              onClick={handleLogout}
              className="p-2 py-1.5 sleek-btn-secondary border-red-100 hover:bg-red-50 hover:border-red-200 text-red-650 text-red-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Role router page */}
      <main className="flex-1" id="main-content">
        {user.role === 'passenger' && <PassengerView user={user} token={token} />}
        {user.role === 'operator' && <OperatorView user={user} token={token} />}
        {user.role === 'admin' && <AdminView user={user} token={token} />}
      </main>

      {/* Footer credits */}
      <footer className="bg-white border-t border-[#e2e8f0] py-5 text-center text-[10.5px] font-medium text-[#64748b] mt-auto" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Malaysia Electric Train Service (ETS). All rights reserved.</span>
          <span className="flex items-center gap-1 text-[#64748b]">
            System Stamped: <span className="bg-[#f1f5f9] text-[#1e293b] px-1.5 py-0.5 rounded font-mono border border-[#e2e8f0]">SQLite V3.4</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
