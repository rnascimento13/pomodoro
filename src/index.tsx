import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality with update handling
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('SW registered successfully');
    if ((window as any).__swUpdateCallbacks?.onOfflineReady) {
      (window as any).__swUpdateCallbacks.onOfflineReady();
    }
  },
  onUpdate: (registration) => {
    console.log('SW update available');
    if ((window as any).__swUpdateCallbacks?.onUpdate) {
      (window as any).__swUpdateCallbacks.onUpdate(registration);
    }
  },
  onWaiting: (registration) => {
    console.log('SW waiting');
    if ((window as any).__swUpdateCallbacks?.onWaiting) {
      (window as any).__swUpdateCallbacks.onWaiting(registration);
    }
  },
  onOfflineReady: () => {
    console.log('App ready for offline use');
    if ((window as any).__swUpdateCallbacks?.onOfflineReady) {
      (window as any).__swUpdateCallbacks.onOfflineReady();
    }
  },
  onNeedRefresh: () => {
    console.log('App needs refresh');
    if ((window as any).__swUpdateCallbacks?.onUpdate) {
      (window as any).__swUpdateCallbacks.onUpdate(null);
    }
  },
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();