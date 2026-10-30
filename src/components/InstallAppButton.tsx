import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, Download, ExternalLink, X } from 'lucide-react';
import {
  getPwaInstallSnapshot,
  promptPwaInstall,
  subscribePwaInstall,
  type InstallPlatform,
  type PwaInstallState,
} from '../lib/pwaInstall';

type InstallLang = 'en' | 'bm';

interface Props {
  lang?: InstallLang;
  /** `compact` for the app header, `panel` for the login brand column. */
  appearance?: 'compact' | 'panel';
  className?: string;
}

const TEXT = {
  en: {
    install: 'Install Web App',
    open: 'Open in Web App',
    installed: 'Installed',
    installHint: 'Add ETS Rider Predict to this device',
    manualHint: 'See how to install on this device',
    openHint: 'You have installed this app',
    standaloneHint: 'You are using the installed app',
    close: 'Close install instructions',
    gotIt: 'Got it',
  },
  bm: {
    install: 'Pasang Aplikasi Web',
    open: 'Buka dalam Aplikasi Web',
    installed: 'Telah Dipasang',
    installHint: 'Tambah ETS Rider Predict pada peranti ini',
    manualHint: 'Lihat cara memasang pada peranti ini',
    openHint: 'Anda telah memasang aplikasi ini',
    standaloneHint: 'Anda sedang menggunakan aplikasi yang dipasang',
    close: 'Tutup panduan pemasangan',
    gotIt: 'Faham',
  },
};

interface Instructions {
  title: string;
  intro: string;
  steps: string[];
}

const INSTRUCTIONS: Record<InstallPlatform, Record<InstallLang, Instructions>> = {
  ios: {
    en: {
      title: 'Install on iPhone / iPad',
      intro: 'Safari installs web apps from the Share menu.',
      steps: [
        'Open this site in Safari. If you are using another browser, choose Open in Safari first.',
        'Tap the Share button in the toolbar.',
        'Scroll down and tap Add to Home Screen.',
        'Tap Add, then open ETS Rider Predict System from your Home Screen.',
      ],
    },
    bm: {
      title: 'Pasang di iPhone / iPad',
      intro: 'Safari memasang aplikasi web melalui menu Kongsi.',
      steps: [
        'Buka laman ini dalam Safari. Jika anda menggunakan pelayar lain, pilih Buka dalam Safari dahulu.',
        'Ketik butang Kongsi pada bar alat.',
        'Tatal ke bawah dan ketik Tambah ke Skrin Utama.',
        'Ketik Tambah, kemudian buka ETS Rider Predict System dari Skrin Utama anda.',
      ],
    },
  },
  'mac-safari': {
    en: {
      title: 'Add to Dock on Mac',
      intro: 'Safari on macOS installs web apps into the Dock.',
      steps: [
        'Open this site in Safari.',
        'Choose File > Add to Dock from the menu bar.',
        'Confirm by clicking Add.',
        'Open ETS Rider Predict System from your Dock or Applications folder.',
      ],
    },
    bm: {
      title: 'Tambah ke Dock pada Mac',
      intro: 'Safari pada macOS memasang aplikasi web ke dalam Dock.',
      steps: [
        'Buka laman ini dalam Safari.',
        'Pilih Fail > Tambah ke Dock pada bar menu.',
        'Sahkan dengan mengklik Tambah.',
        'Buka ETS Rider Predict System dari Dock atau folder Applications anda.',
      ],
    },
  },
  android: {
    en: {
      title: 'Install on Android',
      intro: 'Chrome can install this site as an app.',
      steps: [
        'Open this site in Chrome.',
        'Tap the three-dot menu in the top-right corner.',
        'Tap Install app or Add to Home screen.',
        'Confirm Install, then open the app from your Home Screen or app drawer.',
      ],
    },
    bm: {
      title: 'Pasang pada Android',
      intro: 'Chrome boleh memasang laman ini sebagai aplikasi.',
      steps: [
        'Buka laman ini dalam Chrome.',
        'Ketik menu tiga titik di penjuru kanan atas.',
        'Ketik Pasang aplikasi atau Tambah ke skrin utama.',
        'Sahkan Pasang, kemudian buka aplikasi dari Skrin Utama atau laci aplikasi anda.',
      ],
    },
  },
  desktop: {
    en: {
      title: 'Install on desktop',
      intro: 'Chrome and Edge can install this site as a desktop app.',
      steps: [
        'Open this site in Chrome or Edge.',
        'Click the install icon in the address bar, or open the browser menu.',
        'Choose Install ETS Rider Predict System.',
        'Launch it from your desktop, Start menu, or Applications folder.',
      ],
    },
    bm: {
      title: 'Pasang pada desktop',
      intro: 'Chrome dan Edge boleh memasang laman ini sebagai aplikasi desktop.',
      steps: [
        'Buka laman ini dalam Chrome atau Edge.',
        'Klik ikon pasang pada bar alamat, atau buka menu pelayar.',
        'Pilih Pasang ETS Rider Predict System.',
        'Lancarkan dari desktop, menu Mula, atau folder Applications anda.',
      ],
    },
  },
};

export default function InstallAppButton({ lang = 'en', appearance = 'compact', className }: Props) {
  const [state, setState] = useState<PwaInstallState>(getPwaInstallSnapshot);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => subscribePwaInstall(setState), []);

  const t = TEXT[lang] || TEXT.en;
  const instructions = INSTRUCTIONS[state.platform][lang] || INSTRUCTIONS[state.platform].en;

  const mode: 'install' | 'installed' | 'standalone' = state.standalone
    ? 'standalone'
    : state.installed
      ? 'installed'
      : 'install';

  const label = mode === 'install' ? t.install : mode === 'installed' ? t.open : t.installed;
  const hint =
    mode === 'install'
      ? state.canPrompt
        ? t.installHint
        : t.manualHint
      : mode === 'installed'
        ? t.openHint
        : t.standaloneHint;

  const Icon = mode === 'install' ? Download : mode === 'installed' ? ExternalLink : CheckCircle2;

  const handleInstall = async () => {
    if (!state.canPrompt) {
      setHelpOpen(true);
      return;
    }
    const result = await promptPwaInstall();
    if (result === 'unavailable') setHelpOpen(true);
  };

  const handleOpen = () => {
    const url = window.location.origin + window.location.pathname;
    try {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (opened) opened.focus();
      else window.location.href = url;
    } catch {
      window.location.href = url;
    }
  };

  const buttonId =
    mode === 'installed'
      ? 'install-open-btn'
      : mode === 'install' && !state.canPrompt && (state.platform === 'ios' || state.platform === 'mac-safari')
        ? 'install-ios-btn'
        : 'install-app-btn';

  const compactClass = [
    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold transition',
    mode === 'install' && 'cursor-pointer bg-[#4f46e5] text-white shadow-sm hover:bg-[#4338ca]',
    mode === 'installed' && 'cursor-pointer border border-[#c7d2fe] bg-white text-[#4f46e5] hover:bg-[#eef2ff]',
    mode === 'standalone' && 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const panelClass = [
    'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
    mode === 'install' && 'cursor-pointer border-white/20 bg-white/10 hover:bg-white/15',
    mode === 'installed' && 'cursor-pointer border-white/20 bg-white/10 hover:bg-white/15',
    mode === 'standalone' && 'border-emerald-300/30 bg-emerald-400/10',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const iconBoxClass =
    mode === 'standalone'
      ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-100'
      : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white';

  const content =
    appearance === 'panel' ? (
      <>
        <span className={iconBoxClass}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold">{label}</span>
          <span className="mt-0.5 block text-[10.5px] font-medium leading-snug opacity-75">{hint}</span>
        </span>
        {mode !== 'standalone' && <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />}
      </>
    ) : (
      <>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </>
    );

  return (
    <>
      {mode === 'standalone' ? (
        <div id="install-installed-badge" className={appearance === 'panel' ? panelClass : compactClass} role="status">
          {content}
        </div>
      ) : (
        <button
          type="button"
          id={buttonId}
          onClick={mode === 'installed' ? handleOpen : handleInstall}
          className={appearance === 'panel' ? panelClass : compactClass}
          aria-haspopup={mode === 'installed' ? undefined : 'dialog'}
          title={mode === 'installed' ? t.openHint : hint}
        >
          {content}
        </button>
      )}

      {helpOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4"
          id="install-help-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-help-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 id="install-help-title" className="font-display text-base font-extrabold text-slate-900">
                  {instructions.title}
                </h3>
                <p className="mt-1 text-[11.5px] text-slate-500">{instructions.intro}</p>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="cursor-pointer text-slate-400 transition hover:text-slate-700"
                aria-label={t.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="space-y-2.5">
              {instructions.steps.map((step, index) => (
                <li key={step} className="flex gap-2.5 text-xs leading-relaxed text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-extrabold text-indigo-600">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="mt-5 w-full cursor-pointer rounded-xl bg-[#4f46e5] py-2.5 text-xs font-bold text-white transition hover:bg-[#4338ca]"
              id="install-help-close"
            >
              {t.gotIt}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
