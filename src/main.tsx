import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const setupServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
    return;
  }

  // Keep dev environment free of stale caches and workers that break HMR.
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    })
    .catch((error) => {
      console.log('SW unregister failed: ', error);
    });

  if ('caches' in window) {
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
