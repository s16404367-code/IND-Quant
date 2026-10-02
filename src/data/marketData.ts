/**
 * PUBLIC WEB-DATA LAYER (keyless)
 * --------------------------------
 * Loads the static JSON snapshot produced by `scripts/fetch-market-data.mjs`
 * (official NSE end-of-day archives + public RSS headlines + Open-Meteo weather).
 *
 * - No API keys, no tokens, no logins, no broker connection.
 * - Files are served from the same GitHub Pages origin, so there are no CORS problems.
 * - Nothing is invented: any field that the source does not provide is either omitted
 *   or explicitly marked as an ESTIMATE / ASSUMPTION in the UI.
 */

import { unzipSync } from 'fflate';
import { solveImpliedVolatility } from '../engine/pricingModels';
import type { UnderlyingMarketSnapshot } from '../engine/verifiedHistoricalFixtures';
import type { ContractSpec } from '../engine/rulesEngine';

export interface UniverseItem {
  symbol: string;
  name: string;
  type: 'INDEX' | 'STOCK';
  spot: number | null;
  changePct: number | null;
  lotSize: number | null;
  nearExpiry: string | null;
  expiries: number;
  pcr: number | null;
  futOi: number;
  inBanList: boolean;
  contractValue: number | null;
}

export interface UniverseFile {
  tradeDate: string;
  count: number;
  items: UniverseItem[];
}

export type ChainRow = [
  number, // strike
  number | null, // ceClose
  number | null, // ceSettle
  number | null, // ceOi
  number | null, // ceChgOi
  number | null, // ceVol
  number | null, // peClose
  number | null, // peSettle
  number | null, // peOi
  number | null, // peChgOi
  number | null // peVol
];

export interface HistoryBar {
  d: string;
  c: number;
  o?: number | null;
  h?: number | null;
  l?: number | null;
  v?: number | null;
}

export interface FuturesRow {
  expiry: string;
  close: number | null;
  settle: number | null;
  prevClose: number | null;
  oi: number | null;
  chgOi: number | null;
  volume: number | null;
  lot: number | null;
}

export interface ChainFile {
  symbol: string;
  name: string;
  type: 'INDEX' | 'STOCK';
  tradeDate: string;
  spot: number;
  prevClose: number | null;
  changePct: number | null;
  lotSize: number;
  lotSizeSource: string;
  inBanList: boolean;
  futures: FuturesRow[];
  expiries: string[];
  chain: Record<string, ChainRow[]>;
  history: HistoryBar[];
  indexStats: { pe: number | null; pb: number | null; divYield: number | null } | null;
}

export interface MarketFile {
  tradeDate: string;
  indices: Array<{ name: string; close: number; changePct: number | null; pe: number | null; history: Array<[string, number]> }>;
  gainers: Array<{ symbol: string; name: string; spot: number; changePct: number }>;
  losers: Array<{ symbol: string; name: string; spot: number; changePct: number }>;
  advances: number;
  declines: number;
  banList: string[];
  banForDate: string | null;
}

export type NewsCategory = 'MARKETS' | 'COMPANIES' | 'ECONOMY' | 'FILINGS' | 'REGULATOR' | 'IPO' | 'COMMODITIES';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  category?: NewsCategory;
  publishedIso: string | null;
  symbols: string[];
}

export interface NewsFile {
  fetchedAtIso: string;
  note: string;
  items: NewsItem[];
  /** IST days included in this file (latest.json holds the newest 2 days). */
  coversDays?: string[];
  archive?: { total: number; days: number; firstDay: string | null };
  sources?: Array<{ id: string; ok: boolean; items?: number; category?: string }>;
}

export interface NewsIndex {
  updatedAtIso: string;
  total: number;
  firstDay: string | null;
  days: Array<{ date: string; count: number }>;
}

export interface WeatherCity {
  city: string;
  lat: number;
  lon: number;
  why: string;
  data: {
    current?: { time: string; temperature_2m: number; precipitation: number; weather_code: number; wind_speed_10m: number };
    daily?: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      wind_speed_10m_max: number[];
    };
  };
}

export interface WeatherFile {
  fetchedAtIso: string;
  cities: WeatherCity[];
  live?: boolean;
}

export interface MetaFile {
  schemaVersion: number;
  tradeDate: string;
  generatedAtIso: string;
  historyDays: number;
  historyFrom: string | null;
  historyTo: string | null;
  underlyings: number;
  dataNature: string;
  sources: Array<{ id: string; ok: boolean; asOf?: string; items?: number; days?: number }>;
}

// ---------------------------------------------------------------------------------------------
// Loader — works in BOTH GitHub Pages modes:
//   • "GitHub Actions" mode: built site with ./data/*.json next to index.html
//   • "Deploy from a branch" mode: raw repository is served; data is unpacked in the browser from
//     data-snapshot/public-data.zip — preferring the newest copy committed by the daily workflow
//     (fetched from raw.githubusercontent.com, which allows cross-origin reads).
// ---------------------------------------------------------------------------------------------
const BASE_CANDIDATES = ['./data/', './dist/data/', './public/data/', '/data/'];
let resolvedBase: string | null = null;
const cache = new Map<string, Promise<unknown>>();

/** Where the currently displayed data came from (shown on the Data Sources page). */
export let dataOrigin: string = 'not loaded yet';

declare global {
  interface Window {
    __IQ_BRANCH_MODE__?: boolean;
  }
}

export function isBranchMode(): boolean {
  return typeof window !== 'undefined' && !!window.__IQ_BRANCH_MODE__;
}

/** For a site at https://OWNER.github.io/REPO/ returns raw.githubusercontent.com folders of data-snapshot/. */
export function rawRepoDataBases(): string[] {
  if (typeof window === 'undefined') return [];
  const m = window.location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
  if (!m) return [];
  const owner = m[1];
  const seg = window.location.pathname.split('/').filter(Boolean)[0];
  const repo = seg && !seg.includes('.') ? seg : `${owner}.github.io`;
  return ['main', 'master'].map((b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/data-snapshot/`);
}

async function fetchWithTimeout(url: string, ms: number, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

let zipFilesPromise: Promise<Record<string, Uint8Array>> | null = null;
function loadSnapshotZip(): Promise<Record<string, Uint8Array>> {
  if (!zipFilesPromise) {
    zipFilesPromise = (async () => {
      const bust = `?t=${Math.floor(Date.now() / 60000)}`;
      const urls = [...rawRepoDataBases().map((b) => `${b}public-data.zip`), './data-snapshot/public-data.zip'];
      let lastErr: unknown = null;
      for (const u of urls) {
        try {
          const res = await fetchWithTimeout(u + bust, 20000, { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
          const norm: Record<string, Uint8Array> = {};
          for (const [k, v] of Object.entries(files)) norm[k.replace(/^\.\//, '')] = v;
          if (!norm['meta.json']) throw new Error('meta.json missing in snapshot');
          dataOrigin = u.startsWith('http') ? 'latest snapshot committed to the GitHub repository' : 'snapshot bundled with this site';
          return norm;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr ?? new Error('Data snapshot unavailable');
    })();
    zipFilesPromise.catch(() => {
      zipFilesPromise = null;
    });
  }
  return zipFilesPromise;
}

async function fetchFromZip<T>(file: string): Promise<T> {
  const files = await loadSnapshotZip();
  const bytes = files[decodeURIComponent(file)];
  if (!bytes) throw new Error(`${file} not found in data snapshot`);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function fetchJson<T>(file: string): Promise<T> {
  const key = file;
  if (cache.has(key)) return cache.get(key) as Promise<T>;
  const p = (async () => {
    if (isBranchMode()) return fetchFromZip<T>(file);
    const bases = resolvedBase ? [resolvedBase] : BASE_CANDIDATES;
    let lastErr: unknown = null;
    for (const base of bases) {
      try {
        const res = await fetch(`${base}${file}`, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('text/html')) throw new Error('Got HTML instead of JSON');
        const json = (await res.json()) as T;
        resolvedBase = base;
        dataOrigin = 'data files published with this site';
        return json;
      } catch (e) {
        lastErr = e;
      }
    }
    // Last resort: the one-file snapshot
    try {
      return await fetchFromZip<T>(file);
    } catch {
      throw lastErr ?? new Error('Data unavailable');
    }
  })();
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}

/** Forget every cached file so the next load fetches fresh data (used by the Refresh button). */
export function clearDataCache() {
  cache.clear();
  newsCache.clear();
  zipFilesPromise = null;
  resolvedBase = null;
}

/** Cheap check: the generatedAtIso of the newest data available online (null if unknown). */
export async function fetchLatestDataStamp(): Promise<string | null> {
  const bust = `?t=${Date.now()}`;
  const urls = isBranchMode()
    ? [...rawRepoDataBases().map((b) => `${b}meta.json`), './data-snapshot/meta.json']
    : [`${resolvedBase ?? './data/'}meta.json`];
  for (const u of urls) {
    try {
      const res = await fetchWithTimeout(u + bust, 10000, { cache: 'no-store' });
      if (!res.ok) continue;
      const j = (await res.json()) as Partial<MetaFile>;
      if (j.generatedAtIso) return j.generatedAtIso;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** The build id of the newest app version published (null if unknown). */
export async function fetchLatestBuildId(): Promise<string | null> {
  const url = isBranchMode() ? './site/version.json' : './version.json';
  try {
    const res = await fetchWithTimeout(`${url}?t=${Date.now()}`, 10000, { cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as { buildId?: string };
    return j.buildId ?? null;
  } catch {
    return null;
  }
}

export const loadMeta = () => fetchJson<MetaFile>('meta.json');
export const loadUniverse = () => fetchJson<UniverseFile>('universe.json');
export const loadMarket = () => fetchJson<MarketFile>('market.json');

// ---- News: permanent archive in data-snapshot/news/ (updated hourly by the news workflow) ----------
const newsCache = new Map<string, Promise<unknown>>();

/** Reads a file of the news archive: newest copy in the GitHub repo first, then the copy shipped with the site. */
async function fetchNewsFile<T>(rel: string, fresh = false): Promise<T> {
  const cacheKey = rel;
  if (!fresh && newsCache.has(cacheKey)) return newsCache.get(cacheKey) as Promise<T>;
  const p = (async () => {
    const bust = `?t=${Math.floor(Date.now() / 60000)}`;
    const urls = [
      ...rawRepoDataBases().map((b) => `${b}news/${rel}`),
      isBranchMode() ? `./data-snapshot/news/${rel}` : `${resolvedBase ?? './data/'}news/${rel}`,
    ];
    let lastErr: unknown = null;
    for (const u of [...new Set(urls)]) {
      try {
        const res = await fetchWithTimeout(u + bust, 15000, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('text/html')) throw new Error('Got HTML instead of JSON');
        return (await res.json()) as T;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error('News unavailable');
  })();
  newsCache.set(cacheKey, p);
  p.catch(() => newsCache.delete(cacheKey));
  return p;
}

/** Newest headlines (last 2 days). Falls back to the news.json inside the data snapshot. */
export async function loadNews(fresh = false): Promise<NewsFile> {
  try {
    return await fetchNewsFile<NewsFile>('latest.json', fresh);
  } catch {
    return fetchJson<NewsFile>('news.json');
  }
}

/** List of every archived day (the archive is never trimmed). */
export const loadNewsIndex = (fresh = false) => fetchNewsFile<NewsIndex>('index.json', fresh);

/** All headlines of one IST day, e.g. '2026-09-30'. */
export const loadNewsDay = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? fetchNewsFile<{ date: string; items: NewsItem[] }>(`days/${date}.json`)
    : Promise.reject(new Error('bad date'));
export const loadWeatherSnapshot = () => fetchJson<WeatherFile>('weather.json');
export const loadChain = (symbol: string) =>
  fetchJson<ChainFile>(`chains/${encodeURIComponent(symbol)}.json`);

/** Weather is the one source that is truly live & keyless from the browser (Open-Meteo allows CORS). */
export async function loadWeatherLive(cities: WeatherCity[]): Promise<WeatherFile> {
  const out: WeatherCity[] = [];
  await Promise.all(
    cities.map(async (c) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FKolkata&forecast_days=3`;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error(String(res.status));
        out.push({ ...c, data: await res.json() });
      } catch {
        out.push(c); // keep snapshot copy
      }
    })
  );
  const order = cities.map((c) => c.city);
  out.sort((a, b) => order.indexOf(a.city) - order.indexOf(b.city));
  return { fetchedAtIso: new Date().toISOString(), cities: out, live: true };
}

// ---------------------------------------------------------------------------------------------
// Analytics helpers
// ---------------------------------------------------------------------------------------------
export const ASSUMED_RISK_FREE_RATE = 0.0675; // ASSUMPTION — 91-day T-bill proxy; verify
export const DAYS_PER_YEAR = 365;

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T15:30:00+05:30`).getTime();
  const b = new Date(`${toIso}T15:30:00+05:30`).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function realizedVolAnnualized(history: HistoryBar[], window = 20): number | null {
  if (history.length < window + 1) return null;
  const closes = history.slice(-(window + 1)).map((h) => h.c);
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, rets.length - 1);
  return Math.sqrt(variance * 252);
}

export function dailyReturns(history: HistoryBar[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < history.length; i++) out.push(history[i].c / history[i - 1].c - 1);
  return out;
}

export interface ChainAnalytics {
  expiry: string;
  daysToExpiry: number;
  atmStrike: number;
  atmIv: number | null;
  pcrOi: number | null;
  maxPain: number | null;
  totalCeOi: number;
  totalPeOi: number;
  highestCeOiStrike: number | null;
  highestPeOiStrike: number | null;
  expectedMovePts: number | null;
  strikeStep: number;
}

export function analyseChain(file: ChainFile, expiry: string): ChainAnalytics {
  const rows = file.chain[expiry] ?? [];
  const spot = file.spot;
  const dte = Math.max(1, daysBetween(file.tradeDate, expiry));
  const T = dte / DAYS_PER_YEAR;
  const strikes = rows.map((r) => r[0]);
  const diffs = strikes.slice(1).map((k, i) => k - strikes[i]).filter((d) => d > 0).sort((a, b) => a - b);
  const strikeStep = diffs.length ? diffs[Math.floor(diffs.length / 2)] : Math.max(1, Math.round(spot * 0.01));
  const atmRow = rows.reduce<ChainRow | null>(
    (best, r) => (!best || Math.abs(r[0] - spot) < Math.abs(best[0] - spot) ? r : best),
    null
  );
  let atmIv: number | null = null;
  if (atmRow) {
    const ivs: number[] = [];
    const ce = atmRow[1];
    const pe = atmRow[6];
    if (ce && ce > 0) {
      const v = solveImpliedVolatility({ targetPrice: ce, spot, strike: atmRow[0], timeToExpiryYears: T, riskFreeRate: ASSUMED_RISK_FREE_RATE, dividendYield: 0, right: 'CE' });
      if (v && v > 0.02 && v < 3) ivs.push(v);
    }
    if (pe && pe > 0) {
      const v = solveImpliedVolatility({ targetPrice: pe, spot, strike: atmRow[0], timeToExpiryYears: T, riskFreeRate: ASSUMED_RISK_FREE_RATE, dividendYield: 0, right: 'PE' });
      if (v && v > 0.02 && v < 3) ivs.push(v);
    }
    atmIv = ivs.length ? ivs.reduce((s, v) => s + v, 0) / ivs.length : null;
  }
  const totalCeOi = rows.reduce((s, r) => s + (r[3] ?? 0), 0);
  const totalPeOi = rows.reduce((s, r) => s + (r[8] ?? 0), 0);
  let maxPain: number | null = null;
  if (rows.length) {
    let best = Infinity;
    for (const k of strikes) {
      let pain = 0;
      for (const r of rows) {
        pain += Math.max(0, k - r[0]) * (r[3] ?? 0) + Math.max(0, r[0] - k) * (r[8] ?? 0);
      }
      if (pain < best) {
        best = pain;
        maxPain = k;
      }
    }
  }
  const maxBy = (idx: number) =>
    rows.reduce<ChainRow | null>((b, r) => ((r[idx] ?? 0) > ((b?.[idx] as number) ?? -1) ? r : b), null)?.[0] ?? null;
  return {
    expiry,
    daysToExpiry: dte,
    atmStrike: atmRow?.[0] ?? spot,
    atmIv,
    pcrOi: totalCeOi > 0 ? totalPeOi / totalCeOi : null,
    maxPain,
    totalCeOi,
    totalPeOi,
    highestCeOiStrike: maxBy(3),
    highestPeOiStrike: maxBy(8),
    expectedMovePts: atmIv ? spot * atmIv * Math.sqrt(T) : null,
    strikeStep,
  };
}

/** Estimated half-spread used ONLY for cost modelling — the NSE EOD file has no bid/ask. */
function estimatedSpreadPct(volume: number | null): number {
  if (!volume || volume <= 0) return 0.06; // untraded today — wide
  if (volume > 100000) return 0.006;
  if (volume > 10000) return 0.012;
  if (volume > 1000) return 0.025;
  return 0.04;
}

function roundTick(x: number, tick = 0.05) {
  return Math.max(tick, Math.round(x / tick) * tick);
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Converts a real NSE EOD chain into the engine's snapshot shape.
 * Bid/ask/quantities are NOT in the source; they are ESTIMATES (clearly labelled in UI).
 */
export function buildSnapshotFromChain(
  file: ChainFile,
  expiry: string,
  indiaVix: number | null
): { snapshot: UnderlyingMarketSnapshot; analytics: ChainAnalytics; realizedVol: number | null } {
  const analytics = analyseChain(file, expiry);
  const rows = (file.chain[expiry] ?? []).filter((r) => (r[1] ?? 0) > 0 && (r[6] ?? 0) > 0);
  const all = rows.length >= 3 ? rows : file.chain[expiry] ?? [];
  const atmIdx = all.reduce((bi, r, i) => (Math.abs(r[0] - file.spot) < Math.abs(all[bi][0] - file.spot) ? i : bi), 0);
  const start = Math.max(0, Math.min(atmIdx - 5, all.length - 11));
  const window = all.slice(start, start + 11);
  const lot = file.lotSize || 1;

  const strikes = window.map((r) => {
    const ceMid = r[1] ?? 0.05;
    const peMid = r[6] ?? 0.05;
    const ceHalf = Math.max(0.05, (ceMid * estimatedSpreadPct(r[5])) / 2);
    const peHalf = Math.max(0.05, (peMid * estimatedSpreadPct(r[10])) / 2);
    return {
      strike: r[0],
      callBid: roundTick(ceMid - ceHalf),
      callAsk: roundTick(ceMid + ceHalf),
      callLtp: ceMid,
      callOi: r[3] ?? 0,
      callChangeOi: r[4] ?? 0,
      callVolume: r[5] ?? 0,
      callBidQty: lot,
      callAskQty: lot,
      putBid: roundTick(peMid - peHalf),
      putAsk: roundTick(peMid + peHalf),
      putLtp: peMid,
      putOi: r[8] ?? 0,
      putChangeOi: r[9] ?? 0,
      putVolume: r[10] ?? 0,
      putBidQty: lot,
      putAskQty: lot,
    };
  });

  const rv = realizedVolAnnualized(file.history, 20);
  const fut = file.futures.find((f) => f.expiry === expiry) ?? file.futures[0];
  const last = file.history[file.history.length - 1];
  const typical = last && last.h && last.l ? (last.h + last.l + last.c) / 3 : file.spot;
  const nextExp = file.expiries[file.expiries.indexOf(expiry) + 1];
  const wd = (iso: string) => WEEKDAY[new Date(`${iso}T12:00:00+05:30`).getDay()];

  const snapshot: UnderlyingMarketSnapshot = {
    symbol: file.symbol,
    name: file.name,
    spot: file.spot,
    futures: fut?.close ?? file.spot,
    vwap: Number(typical.toFixed(2)),
    dayChangePct: file.changePct ?? 0,
    atmIv: analytics.atmIv ?? rv ?? 0.18,
    realizedVol20d: rv ?? analytics.atmIv ?? 0.18,
    indiaVix: indiaVix ?? 0,
    currentExpiry: `${expiry} (${wd(expiry)})`,
    nextExpiry: nextExp ? `${nextExp} (${wd(nextExp)})` : '—',
    daysToExpiry: analytics.daysToExpiry,
    riskFreeRate: ASSUMED_RISK_FREE_RATE,
    fundamentalContext: {
      marketCapCr: 'DATA UNAVAILABLE',
      peRatio: file.indexStats?.pe ?? 0,
      roePct: 0,
      debtToEquity: 0,
      dividendYieldPct: file.indexStats?.divYield ?? 0,
      beta: 1,
      earningsTrend: 'DATA UNAVAILABLE (no keyless licensed source)',
      shortSellSlbmFeasible: file.type === 'INDEX',
      shortSellNote: 'Verify SLBM availability with your broker.',
    },
    strikes,
  };
  return { snapshot, analytics, realizedVol: rv };
}

export function buildDynamicContractSpec(file: ChainFile, strikeStep: number): ContractSpec {
  return {
    symbol: file.symbol,
    name: file.name,
    exchange: 'NSE',
    instrumentType: file.type,
    sector: file.type === 'INDEX' ? 'BROAD_INDEX' : 'UNCLASSIFIED',
    lotSize: file.lotSize,
    strikeInterval: strikeStep,
    tickSize: 0.05,
    freezeQuantity: file.lotSize * 1000,
    freezeQuantityVerified: false,
    weeklyExpiryAvailable: file.symbol === 'NIFTY',
    expiryWeekday: 'TUESDAY',
    settlementType: file.type === 'INDEX' ? 'CASH' : 'PHYSICAL',
    weatherSensitiveSector: false,
    weatherSensitivityReason: 'Sector weather sensitivity not classified for this symbol (heuristic map in News & Weather page).',
    inBanList: file.inBanList,
  };
}

// ---------------------------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------------------------
export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtCompact(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
  return v.toFixed(0);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00+05:30` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/** NSE cash/F&O session status in IST (holidays are NOT checked — the data date is authoritative). */
export function nseSessionStatus(now = new Date()): { label: string; open: boolean } {
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  if (day === 0 || day === 6) return { label: 'Weekend — market closed', open: false };
  if (mins >= 9 * 60 && mins < 9 * 60 + 15) return { label: 'Pre-open session', open: false };
  if (mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30) return { label: 'Normal session hours (holidays not checked)', open: true };
  return { label: 'Outside market hours', open: false };
}

// Heuristic, transparent weather-sensitivity map (Section 14). Not exhaustive.
export const WEATHER_SENSITIVE_MAP: Record<string, string> = {
  INDIGO: 'Airlines — fog, cyclones and heavy rain disrupt flights',
  NTPC: 'Power — heatwaves lift demand; monsoon affects hydro & coal logistics',
  POWERGRID: 'Power transmission — cyclone/storm damage risk',
  TATAPOWER: 'Power — demand & renewable generation depend on weather',
  NHPC: 'Hydro power — rainfall/reservoir levels drive generation',
  JSWENERGY: 'Power — demand & hydro/wind generation depend on weather',
  ADANIGREEN: 'Renewables — solar/wind output depends on weather',
  ADANIPOWER: 'Power — heatwave-driven demand',
  TORNTPOWER: 'Power — heatwave-driven demand',
  RELIANCE: 'Oil & gas / refining — Gujarat-coast cyclones can disrupt operations',
  ONGC: 'Oil & gas — offshore operations exposed to cyclones',
  BPCL: 'Oil marketing — demand seasonality, coastal refinery risk',
  IOC: 'Oil marketing — demand seasonality',
  HINDPETRO: 'Oil marketing — demand seasonality',
  GAIL: 'Gas — demand seasonality',
  PETRONET: 'LNG terminal — coastal cyclone risk',
  OIL: 'Oil & gas — North-East monsoon/flood disruption',
  UPL: 'Agro-chemicals — monsoon drives crop protection demand',
  PIIND: 'Agro-chemicals — monsoon dependent',
  CHAMBLFERT: 'Fertilisers — monsoon & sowing dependent',
  COROMANDEL: 'Fertilisers — monsoon & sowing dependent',
  'M&M': 'Tractors / rural demand — monsoon dependent',
  ESCORTS: 'Tractors — monsoon dependent',
  HINDUNILVR: 'FMCG — rural demand linked to monsoon',
  DABUR: 'FMCG — rural demand & seasonal products',
  MARICO: 'FMCG — copra prices & rural demand',
  ITC: 'FMCG / agri-business — monsoon & crop output',
  TATACONSUM: 'Tea/coffee — weather affects crop costs',
  BRITANNIA: 'FMCG — wheat/sugar input costs',
  ULTRACEMCO: 'Cement — monsoon slows construction',
  AMBUJACEM: 'Cement — monsoon slows construction',
  SHREECEM: 'Cement — monsoon slows construction',
  DALBHARAT: 'Cement — monsoon slows construction',
  ACC: 'Cement — monsoon slows construction',
  LT: 'Construction — monsoon slows project execution',
  ADANIPORTS: 'Ports & logistics — cyclones disrupt operations',
  CONCOR: 'Rail logistics — floods disrupt movement',
  ICICIGI: 'General insurance — catastrophe claims (floods, cyclones)',
  VOLTAS: 'Air-conditioners — summer heat drives demand',
  BLUESTARCO: 'Air-conditioners — summer heat drives demand',
  HAVELLS: 'Fans/ACs — seasonal weather demand',
  CROMPTON: 'Fans/coolers — seasonal weather demand',
};
