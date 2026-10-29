const VERSION = 'ets-riderpredict-v1';
const CACHE = VERSION;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res; })
        .catch(() => caches.match(request).then((r) => (r ? r : new Response('{}', { status: 504, statusText: 'Offline' }))))
    );
    return;
  }

  event.respondWith(
    (async () => {
      const isNav = request.mode === 'navigate';
      const cached = isNav ? (await caches.match(request)) || (await caches.match('/index.html')) : await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      const copy = response.clone();
      const c = await caches.open(CACHE);
      c.put(request, copy);
      return response;
    })()
  );
});
