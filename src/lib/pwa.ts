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

/**
 * Removes service workers and caches that do not belong to this app, so a
 * stale worker from another project (or an older hand-written /sw.js) cannot
 * keep serving a cached shell.
 *
 * The generated worker from vite-plugin-pwa is always served from `/sw.js`,
 * so anything else registered on this origin is treated as foreign.
 */
export async function cleanupForeignServiceWorkers(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
        const isOwnWorker = (() => {
          try {
            const url = new URL(scriptUrl);
            return url.origin === window.location.origin && url.pathname === '/sw.js';
          } catch {
            return false;
          }
        })();
        if (!isOwnWorker) await registration.unregister();
      }),
    );
  } catch {
    /* ignore */
  }

  if (typeof caches === 'undefined') return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        // Workbox manages its own precache/runtime caches; everything else is
        // a leftover from another app or an older version of this one.
        .filter((key) => !key.startsWith('workbox-') && !key.startsWith('ets-'))
        .map((key) => caches.delete(key)),
    );
  } catch {
    /* ignore */
  }
}

export function getPwaPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh/.test(ua)) return 'ios';
  return 'desktop';
}
