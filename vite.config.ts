import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The API may live on a different host in production (Vercel frontend +
// separate Node/Python API). Only same-origin API calls are cached offline.
const apiBaseUrl = (process.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiCachePattern = apiBaseUrl
  ? new RegExp(`^${apiBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/`)
  : null;

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'icons/apple-touch-icon.png',
        'icons/favicon-32.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
      ],
      manifest: {
        id: '/',
        name: 'ETS Rider Predict System',
        short_name: 'ETS Rider',
        description:
          "Ridership prediction and travel planning for Malaysia's Electric Train Service (ETS).",
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        background_color: '#f8fafc',
        theme_color: '#4f46e5',
        categories: ['travel', 'navigation', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell: hashed assets, pages, icons, generated manifest.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        // The main bundle is intentionally large (charts + icons).
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        // Never serve the SPA shell for API traffic.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: apiCachePattern
          ? [
              {
                urlPattern: apiCachePattern,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'ets-api',
                  networkTimeoutSeconds: 10,
                  expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ]
          : [
              {
                urlPattern: /\/api\//,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'ets-api',
                  networkTimeoutSeconds: 10,
                  expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
      },
      devOptions: {
        // Keeps the Install button testable with `npm run dev`.
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch:
      process.env.DISABLE_HMR === 'true'
        ? null
        : {
            ignored: ['**/model.pkl', '**/model_cols.pkl', '**/model_metadata.json'],
          },
  },
}));
