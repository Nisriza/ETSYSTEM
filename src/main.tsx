import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { cleanupForeignServiceWorkers } from './lib/pwa.ts';
import { initPwaInstall } from './lib/pwaInstall.ts';

/**
 * Registers the generated worker with an explicit version and
 * `updateViaCache: 'none'`.
 *
 * Why not rely on the plugin's injected one-liner? The previous version of this
 * app shipped a hand-written `/sw.js` that cached the shell. A browser still
 * controlled by it could serve the old English `/` while `/bm` (not in that
 * worker's precache) loaded the new build — which looks exactly like "the
 * feature only exists in BM". A versioned URL plus a network-only update check
 * replaces that worker instead of reusing it.
 */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const isDev = import.meta.env.DEV;
  const swUrl = isDev ? '/dev-sw.js?dev-sw' : '/sw.js?v=3';
  const options: RegistrationOptions = { scope: '/', updateViaCache: 'none' };
  if (isDev) options.type = 'module';

  // Remember whether this page was already controlled, so the first install
  // does not trigger a pointless reload.
  if (navigator.serviceWorker.controller) {
    sessionStorage.setItem('ets-sw-controlled', '1');
  }

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !navigator.serviceWorker.controller) return;
    const hadController = sessionStorage.getItem('ets-sw-controlled') === '1';
    sessionStorage.setItem('ets-sw-controlled', '1');
    if (!hadController) return;

    reloading = true;
    window.location.reload();
  });

  const register = () => {
    navigator.serviceWorker
      .register(swUrl, options)
      .then((registration) => {
        // Check immediately (and hourly) so a new deploy is picked up even if
        // the user keeps the tab/PWA open for a long time.
        registration.update().catch(() => {});
        window.setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch(() => {
        /* Registration is best-effort; the app still works without offline support. */
      });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

// Capture `beforeinstallprompt` before React mounts so the login page and the
// header can both offer installation without missing the event.
initPwaInstall();

// Drop workers/caches left by other projects or the old hand-written worker
// before registering the current one.
cleanupForeignServiceWorkers().finally(registerServiceWorker);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
