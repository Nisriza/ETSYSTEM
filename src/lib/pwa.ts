export type PwaPlatform = 'ios' | 'android' | 'desktop' | 'unknown';

export interface PwaStatus {
  state: 'checking' | 'installed' | 'available' | 'ios';
  canInstall: boolean;
  isIos: boolean;
}

interface BeforeInstallPromptEventLike extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome?: string }>;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  if (/Macintosh/.test(ua) && /AppleWebKit/.test(ua) && !/Chrome/.test(ua)) return true;
  return false;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const mqStandalone = window.matchMedia ? window.matchMedia('(display-mode: standalone)').matches : false;
    const mqFullscreen = window.matchMedia ? window.matchMedia('(display-mode: fullscreen)').matches : false;
    const mqMinimal = window.matchMedia ? window.matchMedia('(display-mode: minimal-ui)').matches : false;
    const navStandalone = (window.navigator as any)?.standalone === true;
    return Boolean(mqStandalone || mqFullscreen || mqMinimal || navStandalone);
  } catch { return false; }
}

async function getInstalledRelatedApps(): Promise<boolean> {
  try {
    const nav = navigator as any;
    if (typeof nav.getInstalledRelatedApps === 'function') {
      const res = await nav.getInstalledRelatedApps();
      if (Array.isArray(res)) return res.length > 0;
    }
  } catch { /* ignore */ }
  return false;
}

export async function detectPwaStatus(): Promise<PwaStatus> {
  const installed = isStandaloneDisplay() || (await getInstalledRelatedApps());
  if (installed) return { state: 'installed', canInstall: false, isIos: false };
  const isIos = isIosDevice();
  if (isIos) return { state: 'ios', canInstall: true, isIos: true };
  return { state: 'available', canInstall: true, isIos: false };
}

export async function registerPwa(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch { /* ignore */ }
}

export function getPwaPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh/.test(ua)) return 'ios';
  return 'desktop';
}
