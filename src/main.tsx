import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { loadRuntimeSiteConfig } from './config/siteConfig';

declare global {
  interface Window {
    __IQ_APP_STARTED__?: boolean;
  }
}
// Tells the branch-mode loader in index.html that the app has started (so it does nothing).
window.__IQ_APP_STARTED__ = true;

// Owner details come from /site-config.json (editable on GitHub without rebuilding).
loadRuntimeSiteConfig().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
