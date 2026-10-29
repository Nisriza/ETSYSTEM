import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
<<<<<<< HEAD

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  const register = () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ }); };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
=======
>>>>>>> aaaef21333c9377a4d015b0ea91c142dab292413
