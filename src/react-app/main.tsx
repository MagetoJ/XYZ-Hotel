// src/react-app/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App'; // Corrected path
import './index.css';
import { AuthProvider } from './contexts/AuthContext'; // Corrected path
import { POSProvider } from './contexts/POSContext'; // Corrected path
import { registerSW } from 'virtual:pwa-register';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <POSProvider>
          <App />
        </POSProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// Register service worker with auto-update
registerSW({
  onNeedRefresh() {
    if (import.meta.env.DEV) {
      console.log('PWA update available');
    }
    // You could show a toast notification here
  },
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.log('PWA ready for offline use');
    }
    // You could show a toast notification here
  },
  immediate: true
});
