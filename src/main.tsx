import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { cleanupForeignServiceWorkers } from './lib/pwa.ts';

// Remove service workers/caches registered by other projects on this origin
// (for example an old hand-written /sw.js) before the generated one takes over.
cleanupForeignServiceWorkers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
