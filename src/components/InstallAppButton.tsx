import React, { useEffect, useRef, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { detectPwaStatus, isStandaloneDisplay, type PwaStatus } from '../lib/pwa';

interface Props {
  className?: string;
}

export default function InstallAppButton({ className }: Props) {
  const [status, setStatus] = useState<PwaStatus>({ state: 'checking', canInstall: false, isIos: false });
  const [showIosHelp, setShowIosHelp] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const s = await detectPwaStatus();
      if (!cancelled) setStatus(s);
    };
    refresh();
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as any;
      if (!cancelled) setStatus({ state: 'available', canInstall: true, isIos: false });
    };
    const onInstalled = () => { if (!cancelled) setStatus({ state: 'installed', canInstall: false, isIos: false }); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { cancelled = true; window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const handleInstall = async () => {
    if (status.state === 'ios') { setShowIosHelp(true); return; }
    const p = deferredPrompt.current as any;
    if (!p || typeof p.prompt !== 'function') { setStatus({ state: 'checking', canInstall: false, isIos: false }); return; }
    try {
      const result = await p.prompt();
      const outcome = (result && result.outcome) || 'dismissed';
      if (outcome === 'accepted') {
        setStatus({ state: 'installed', canInstall: false, isIos: false });
      } else {
        deferredPrompt.current = null;
        setStatus({ state: 'checking', canInstall: false, isIos: false });
      }
    } catch {
      deferredPrompt.current = null;
      setStatus({ state: 'checking', canInstall: false, isIos: false });
    }
  };

  const handleOpen = () => {
    const url = window.location.origin + window.location.pathname;
    try { const w = window.open(url, '_blank', 'noopener,noreferrer'); if (w) { w.focus(); } else { window.location.href = url; } } catch { window.location.href = url; }
  };

  if (status.state === 'installed') {
    return (
      <button type="button" id="install-open-btn" onClick={handleOpen} className={className || 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#c7d2fe] bg-white text-[#4f46e5] hover:bg-[#eef2ff] text-[11px] font-bold transition cursor-pointer'}>
        <Smartphone className="h-3.5 w-3.5" />
        Open in Web App
      </button>
    );
  }

  if (status.state === 'available') {
    return (
      <button type="button" id="install-app-btn" onClick={handleInstall} className={className || 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[11px] font-bold transition cursor-pointer shadow-sm'}>
        <Download className="h-3.5 w-3.5" />
        Install App
      </button>
    );
  }

  if (status.state === 'ios') {
    return (
      <>
        <button type="button" id="install-ios-btn" onClick={handleInstall} className={className || 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-[11px] font-bold transition cursor-pointer shadow-sm'}>
          <Download className="h-3.5 w-3.5" />
          Install App
        </button>
        {showIosHelp && (
          <div className="fixed inset-0 z-[120] bg-slate-900/60 flex items-center justify-center p-4" id="ios-install-help">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800 text-sm">Install on iPhone / iPad</h3>
                <button type="button" onClick={() => setShowIosHelp(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                <li>Tap the Share button in Safari.</li>
                <li>Scroll and tap <span className="font-bold">Add to Home Screen</span>.</li>
                <li>Tap <span className="font-bold">Add</span>. The app will appear on your home screen.</li>
              </ol>
              <button type="button" onClick={() => setShowIosHelp(false)} className="mt-4 w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold py-2 rounded-xl cursor-pointer">Got it</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
