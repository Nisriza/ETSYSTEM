import { isStandaloneDisplay } from './pwa';

/**
 * Global PWA install store.
 *
 * `beforeinstallprompt` fires very early on Chromium — often before React has
 * mounted. Capturing it in this module (initialised from `main.tsx`) means the
 * install button, including the one on the login page, never misses the event.
 */

export type InstallPlatform = 'ios' | 'mac-safari' | 'android' | 'desktop';

export interface PwaInstallState {
  /** Device/browser family, used to choose the right manual instructions. */
  platform: InstallPlatform;
  /** The native Chromium install prompt was captured and can be shown. */
  canPrompt: boolean;
  /** The app is installed, even if the current tab is a normal browser tab. */
  installed: boolean;
  /** The current window is running as the installed app. */
  standalone: boolean;
}

interface BeforeInstallPromptEventLike extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome?: 'accepted' | 'dismissed'; platform?: string }>;
}

const INSTALLED_KEY = 'ets_pwa_installed';

let deferredPrompt: BeforeInstallPromptEventLike | null = null;
let installedFlag = false;
let initialized = false;
const listeners = new Set<(state: PwaInstallState) => void>();

function readInstalledFlag(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeInstalledFlag(value: boolean): void {
  try {
    if (value) localStorage.setItem(INSTALLED_KEY, '1');
    else localStorage.removeItem(INSTALLED_KEY);
  } catch {
    /* private mode / storage disabled */
  }
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const touchPoints = Number((navigator as any).maxTouchPoints) || 0;

  if (/iPhone|iPod/i.test(ua)) return 'ios';
  if (/iPad/i.test(ua)) return 'ios';
  // iPadOS 13+ reports itself as desktop Safari.
  if (/Macintosh/i.test(ua) && touchPoints > 1) return 'ios';

  if (/Android/i.test(ua)) return 'android';

  // Desktop Safari installs via File > Add to Dock rather than a web prompt.
  if (/Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua)) {
    return 'mac-safari';
  }

  return 'desktop';
}

export function getPwaInstallSnapshot(): PwaInstallState {
  const standalone = isStandaloneDisplay();
  return {
    platform: detectPlatform(),
    canPrompt: Boolean(deferredPrompt) && !standalone,
    installed: standalone || installedFlag || readInstalledFlag(),
    standalone,
  };
}

function notify(): void {
  const state = getPwaInstallSnapshot();
  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      /* a broken subscriber must not break the others */
    }
  });
}

export function subscribePwaInstall(listener: (state: PwaInstallState) => void): () => void {
  listeners.add(listener);
  listener(getPwaInstallSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

/** Registers the global listeners as early as possible (before React mounts). */
export function initPwaInstall(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  installedFlag = readInstalledFlag();

  window.addEventListener('beforeinstallprompt', (event) => {
    // Prevent Chromium's own mini-infobar; the app shows its own button.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEventLike;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    installedFlag = true;
    writeInstalledFlag(true);
    deferredPrompt = null;
    notify();
  });

  // Switching between browser tab, installed window and back again.
  try {
    const media = window.matchMedia('(display-mode: standalone)');
    const onChange = () => notify();
    if (typeof media.addEventListener === 'function') media.addEventListener('change', onChange);
    else if (typeof (media as any).addListener === 'function') (media as any).addListener(onChange);
  } catch {
    /* matchMedia unsupported */
  }

  // Chromium can tell us about an already-installed app (Android, desktop).
  try {
    const nav = navigator as any;
    if (typeof nav.getInstalledRelatedApps === 'function') {
      nav
        .getInstalledRelatedApps()
        .then((apps: unknown) => {
          if (Array.isArray(apps) && apps.length > 0) {
            installedFlag = true;
            writeInstalledFlag(true);
            notify();
          }
        })
        .catch(() => {});
    }
  } catch {
    /* ignore */
  }

  notify();
}

export type PwaPromptResult = 'accepted' | 'dismissed' | 'unavailable';

/** Shows the native install prompt. Must be called from a user gesture. */
export async function promptPwaInstall(): Promise<PwaPromptResult> {
  const event = deferredPrompt;
  if (!event) return 'unavailable';

  try {
    await event.prompt();
    const choice = await event.userChoice;
    const accepted = choice?.outcome === 'accepted';

    deferredPrompt = null;
    if (accepted) {
      installedFlag = true;
      writeInstalledFlag(true);
    }
    notify();

    return accepted ? 'accepted' : 'dismissed';
  } catch {
    deferredPrompt = null;
    notify();
    return 'unavailable';
  }
}
