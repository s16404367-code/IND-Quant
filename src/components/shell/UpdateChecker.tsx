import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCw, Sparkles, X } from 'lucide-react';
import { clearDataCache, fetchLatestBuildId, fetchLatestDataStamp, fmtDateTime } from '../../data/marketData';

/** Build id of the running app = content hash in its own file name ('dev' in development and unit tests). */
export function buildIdFromUrl(url: string): string {
  return url.match(/ind-quant-([A-Za-z0-9_-]+)\.js/)?.[1] ?? url.match(/app\.js\?v=([A-Za-z0-9_-]+)/)?.[1] ?? 'dev';
}
export const CURRENT_BUILD_ID: string = buildIdFromUrl(import.meta.url);

const CHECK_EVERY_MS = 5 * 60 * 1000; // every 5 minutes
const FIRST_CHECK_AFTER_MS = 15 * 1000;
const AUTO_REFRESH_SECONDS = 30;

/**
 * Loads the newest version of the site, skipping every browser cache:
 * clears Cache Storage, unregisters any service worker, and reloads with a unique URL.
 */
export async function hardRefresh(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }
  clearDataCache();
  const url = new URL(window.location.href);
  url.searchParams.set('refresh', String(Date.now()));
  window.location.replace(url.toString());
}

/** Removes the ?refresh=… marker from the address bar after a refresh. */
export function cleanRefreshParam() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.has('refresh')) {
    url.searchParams.delete('refresh');
    window.history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
  }
}

export interface UpdateState {
  appUpdate: boolean;
  dataUpdateIso: string | null;
  lastCheckedIso: string | null;
  checking: boolean;
}

export function useUpdateChecker(loadedDataStamp: string | null) {
  const [state, setState] = useState<UpdateState>({ appUpdate: false, dataUpdateIso: null, lastCheckedIso: null, checking: false });
  const stampRef = useRef(loadedDataStamp);
  stampRef.current = loadedDataStamp;

  const check = useCallback(async () => {
    setState((s) => ({ ...s, checking: true }));
    const [buildId, dataStamp] = await Promise.all([fetchLatestBuildId(), fetchLatestDataStamp()]);
    const loaded = stampRef.current;
    setState({
      appUpdate: !!buildId && CURRENT_BUILD_ID !== 'dev' && buildId !== CURRENT_BUILD_ID,
      dataUpdateIso: dataStamp && loaded && dataStamp > loaded ? dataStamp : null,
      lastCheckedIso: new Date().toISOString(),
      checking: false,
    });
  }, []);

  useEffect(() => {
    const first = window.setTimeout(check, FIRST_CHECK_AFTER_MS);
    const every = window.setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, [check]);

  return { ...state, check };
}

/** Header button: always visible, reloads the newest site + data. */
export const RefreshButton: React.FC<{ hasUpdate?: boolean }> = ({ hasUpdate }) => {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={() => {
        setBusy(true);
        hardRefresh();
      }}
      className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold focus-ring transition ${
        hasUpdate
          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
          : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
      }`}
      title="Reload the newest version of the website and the latest data (skips the browser cache)"
      aria-label="Refresh page and data"
    >
      <RotateCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
      <span className="hidden xl:inline">{hasUpdate ? 'Update ready' : 'Refresh'}</span>
      {hasUpdate && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />}
    </button>
  );
};

/** Banner shown when a newer app build or newer market data has been published. */
export const UpdateBanner: React.FC<{
  appUpdate: boolean;
  dataUpdateIso: string | null;
  autoRefresh: boolean;
}> = ({ appUpdate, dataUpdateIso, autoRefresh }) => {
  const signature = `${appUpdate}|${dataUpdateIso}`;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(AUTO_REFRESH_SECONDS);
  const active = (appUpdate || !!dataUpdateIso) && dismissed !== signature;

  useEffect(() => {
    setSeconds(AUTO_REFRESH_SECONDS);
  }, [signature]);

  // Never auto-refresh twice for the same update (protects against CDN propagation delays causing loops).
  const alreadyAutoRefreshed = (() => {
    try {
      return sessionStorage.getItem('indquant.autoRefreshedFor') === signature;
    } catch {
      return false;
    }
  })();
  const countdown = active && autoRefresh && !alreadyAutoRefreshed;
  const autoGo = () => {
    try {
      sessionStorage.setItem('indquant.autoRefreshedFor', signature);
    } catch {
      /* ignore */
    }
    hardRefresh();
  };

  useEffect(() => {
    if (!countdown) return;
    // Tab not visible → refresh straight away, the user is not looking.
    if (document.visibilityState === 'hidden') {
      autoGo();
      return;
    }
    const t = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(t);
          autoGo();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [countdown, signature]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;
  const what = appUpdate && dataUpdateIso ? 'A new version and new market data are' : appUpdate ? 'A new version of IND-QUANT is' : 'New market data is';
  return (
    <div className="no-print fixed bottom-4 inset-x-0 z-[60] px-3 pointer-events-none" role="status" aria-live="polite">
      <div className="pointer-events-auto max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-500/50 bg-slate-900/95 backdrop-blur px-4 py-3 text-sm shadow-2xl">
        <div className="flex items-center gap-2 text-emerald-200">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>{what} available.</strong>
            {dataUpdateIso && <span className="text-emerald-300/80"> Data published {fmtDateTime(dataUpdateIso)}.</span>}
            {countdown && <span className="text-emerald-300/80"> Refreshing automatically in {seconds}s…</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => hardRefresh()} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5" /> Refresh now
          </button>
          <button
            onClick={() => setDismissed(signature)}
            className="px-2 py-1.5 rounded-lg text-xs text-emerald-200 hover:bg-emerald-500/20 flex items-center gap-1"
            aria-label="Not now"
          >
            <X className="w-3.5 h-3.5" /> Not now
          </button>
        </div>
      </div>
    </div>
  );
};
