import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const setupServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  // Register SW in both PROD and DEV (needed for push notifications)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });

  // In DEV: clear stale caches that can interfere with HMR
  if (!import.meta.env.PROD && 'caches' in window) {
    caches.keys()
      .then((keys) => {
        keys
          .filter((key) => key.startsWith('bnoads-'))
          .forEach((key) => {
            caches.delete(key);
          });
      })
      .catch((error) => {
        console.log('SW cache cleanup failed: ', error);
      });
  }
};

setupServiceWorker();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
