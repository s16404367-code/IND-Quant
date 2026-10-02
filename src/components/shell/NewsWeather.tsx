import React, { useEffect, useMemo, useState } from 'react';
import { Newspaper, ExternalLink, CloudSun, RefreshCw, Wind, Droplets, Thermometer, Info, Search, ChevronDown, History } from 'lucide-react';
import {
  fmtDate,
  fmtDateTime,
  loadNewsDay,
  loadNewsIndex,
  NewsIndex,
  NewsItem,
  loadWeatherLive,
  loadWeatherSnapshot,
  NewsFile,
  timeAgo,
  WeatherFile,
  WEATHER_SENSITIVE_MAP,
} from '../../data/marketData';

const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers',
  81: 'Heavy showers', 82: 'Violent showers', 95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Severe thunderstorm',
};
const wmoIcon = (c?: number) => (c === undefined ? '•' : c === 0 ? '☀️' : c <= 2 ? '⛅' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌦️' : '⛈️');

function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : '#';
}

const CATEGORY_LABEL: Record<string, string> = {
  MARKETS: 'Markets',
  COMPANIES: 'Companies',
  ECONOMY: 'Economy',
  FILINGS: 'Company filings (NSE)',
  REGULATOR: 'SEBI / RBI',
  IPO: 'IPOs',
  COMMODITIES: 'Commodities',
};
const CATEGORY_STYLE: Record<string, string> = {
  FILINGS: 'bg-emerald-500/15 text-emerald-300',
  REGULATOR: 'bg-amber-500/15 text-amber-300',
  ECONOMY: 'bg-sky-500/15 text-sky-300',
  COMPANIES: 'bg-indigo-500/15 text-indigo-300',
  IPO: 'bg-fuchsia-500/15 text-fuchsia-300',
  COMMODITIES: 'bg-orange-500/15 text-orange-300',
  MARKETS: 'bg-slate-800 text-slate-300',
};
const PAGE = 20;

export const NewsPanel: React.FC<{
  news: NewsFile | null;
  symbol: string;
  symbolName?: string;
  limit?: number;
  error?: string | null;
}> = ({ news, symbol, symbolName, limit = 8, error }) => {
  const [tab, setTab] = useState<'STOCK' | 'MARKET'>('STOCK');
  const [category, setCategory] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(limit);
  const [older, setOlder] = useState<NewsItem[]>([]);
  const [loadedDays, setLoadedDays] = useState<string[]>([]);
  const [index, setIndex] = useState<NewsIndex | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  useEffect(() => {
    loadNewsIndex()
      .then(setIndex)
      .catch(() => setIndex(null));
  }, [news?.fetchedAtIso]);

  useEffect(() => setShown(limit), [tab, category, query, symbol, limit]);

  const all = useMemo(() => {
    const seen = new Set<string>();
    const out: NewsItem[] = [];
    for (const n of [...(news?.items ?? []), ...older]) {
      if (seen.has(n.link)) continue;
      seen.add(n.link);
      out.push(n);
    }
    return out;
  }, [news, older]);

  const stockAll = useMemo(() => all.filter((n) => n.symbols.includes(symbol)), [all, symbol]);
  const base = tab === 'STOCK' ? stockAll : all;
  const categoryCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of base) c[n.category ?? 'MARKETS'] = (c[n.category ?? 'MARKETS'] ?? 0) + 1;
    return c;
  }, [base]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      base.filter(
        (n) =>
          (category === 'ALL' || (n.category ?? 'MARKETS') === category) &&
          (!q || n.title.toLowerCase().includes(q) || n.source.toLowerCase().includes(q))
      ),
    [base, category, q]
  );
  const visible = filtered.slice(0, shown);

  const covered = new Set([...(news?.coversDays ?? []), ...loadedDays]);
  const nextDay = index?.days.find((d) => !covered.has(d.date)) ?? null;
  const remainingDays = index ? index.days.filter((d) => !covered.has(d.date)).length : 0;

  const loadOlder = async (howMany = 1) => {
    if (!index) return;
    setLoadingOlder(true);
    setOlderError(null);
    const todo = index.days.filter((d) => !covered.has(d.date)).slice(0, howMany);
    try {
      const files = await Promise.all(todo.map((d) => loadNewsDay(d.date)));
      setOlder((prev) => [...prev, ...files.flatMap((f) => f.items)]);
      setLoadedDays((prev) => [...prev, ...todo.map((d) => d.date)]);
      setShown((s) => s + PAGE);
    } catch (e) {
      setOlderError(e instanceof Error ? e.message : 'could not load');
    } finally {
      setLoadingOlder(false);
    }
  };

  const googleNewsUrl = `https://news.google.com/search?q=${encodeURIComponent(`${symbolName || symbol} share NSE`)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const totalArchive = index?.total ?? news?.archive?.total ?? null;
  const firstDay = index?.firstDay ?? news?.archive?.firstDay ?? null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-sky-400" /> Latest headlines
        </h3>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button onClick={() => setTab('STOCK')} className={`px-3 py-1 rounded-lg text-xs font-semibold ${tab === 'STOCK' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            {symbol} ({stockAll.length})
          </button>
          <button onClick={() => setTab('MARKET')} className={`px-3 py-1 rounded-lg text-xs font-semibold ${tab === 'MARKET' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            Whole market ({all.length})
          </button>
        </div>
      </div>
      {news && (
        <p className="text-[11px] text-slate-500 mb-3">
          {all.length.toLocaleString('en-IN')} headlines loaded
          {totalArchive != null && (
            <>
              {' '}· <strong className="text-slate-300">{totalArchive.toLocaleString('en-IN')} saved in the archive</strong>
              {firstDay && <> since {fmtDate(firstDay)}</>} — no limit, nothing is deleted
            </>
          )}
        </p>
      )}

      {news && all.length > 0 && (
        <div className="space-y-2 mb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search headlines (e.g. results, RBI, dividend)…"
              aria-label="Search headlines"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus-ring"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
            {['ALL', ...Object.keys(CATEGORY_LABEL)].map((c) => {
              const count = c === 'ALL' ? base.length : categoryCounts[c] ?? 0;
              if (c !== 'ALL' && count === 0) return null;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    category === c ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {c === 'ALL' ? 'All' : CATEGORY_LABEL[c]} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <div className="text-sm text-rose-300 mb-2">Headlines unavailable: {error}</div>}
      {!news && !error && <div className="text-sm text-slate-400">Loading headlines…</div>}
      {news && filtered.length === 0 && (
        <div className="text-sm text-slate-400 p-4 rounded-xl bg-slate-950 border border-slate-800">
          {q || category !== 'ALL' ? (
            <>No headline matches your filter.</>
          ) : (
            <>
              No headline in the loaded days mentions <strong className="text-slate-200">{symbolName || symbol}</strong>
              {nextDay ? ' — try "Load older headlines" below, or ' : '. '}
            </>
          )}
          <a href={googleNewsUrl} target="_blank" rel="noopener noreferrer nofollow" className="ml-1 text-indigo-300 underline inline-flex items-center gap-1">
            search Google News <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
      <ul className="divide-y divide-slate-800/70">
        {visible.map((n) => (
          <li key={n.link} className="py-2.5">
            <a href={safeHref(n.link)} target="_blank" rel="noopener noreferrer nofollow" className="group block">
              <span className="text-sm text-slate-100 group-hover:text-indigo-300 leading-snug">
                {n.title} <ExternalLink className="inline w-3 h-3 opacity-60" />
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 mt-0.5">
                {n.category && n.category !== 'MARKETS' && (
                  <span className={`px-1.5 rounded font-semibold ${CATEGORY_STYLE[n.category] ?? ''}`}>{CATEGORY_LABEL[n.category]}</span>
                )}
                <span>{n.source}</span>
                {n.publishedIso && <span>· {fmtDateTime(n.publishedIso)} ({timeAgo(n.publishedIso)})</span>}
                {n.symbols.slice(0, 4).map((s) => (
                  <span key={s} className="px-1.5 rounded bg-slate-800 text-slate-300 font-mono">{s}</span>
                ))}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* Unlimited: show more of what is loaded, then keep loading older days from the archive */}
      {news && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {filtered.length > shown && (
            <>
              <button onClick={() => setShown((s) => s + PAGE)} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1">
                <ChevronDown className="w-3.5 h-3.5" /> Show {Math.min(PAGE, filtered.length - shown)} more
              </button>
              <button onClick={() => setShown(filtered.length)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-semibold">
                Show all {filtered.length.toLocaleString('en-IN')}
              </button>
            </>
          )}
          {filtered.length <= shown && nextDay && (
            <>
              <button
                onClick={() => loadOlder(1)}
                disabled={loadingOlder}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                <History className="w-3.5 h-3.5" />
                {loadingOlder ? 'Loading…' : `Load older headlines — ${fmtDate(nextDay.date)} (${nextDay.count})`}
              </button>
              {remainingDays > 1 && (
                <button
                  onClick={() => loadOlder(7)}
                  disabled={loadingOlder}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                >
                  Load {Math.min(7, remainingDays)} more days
                </button>
              )}
            </>
          )}
          {filtered.length <= shown && !nextDay && index && <span className="text-[11px] text-slate-500">You have reached the start of the archive.</span>}
          {olderError && <span className="text-[11px] text-rose-300">Could not load older headlines ({olderError}).</span>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5" /> Headline + link only; © respective publishers. Matched to stocks by keyword — may be wrong. Not verified, not advice.
        </span>
        <a href={googleNewsUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-300 hover:underline inline-flex items-center gap-1">
          More on Google News <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      {news && (
        <div className="text-[11px] text-slate-500 mt-1">
          Feeds checked {fmtDateTime(news.fetchedAtIso)} ({timeAgo(news.fetchedAtIso)}) · checked again every hour.
        </div>
      )}
    </div>
  );
};

export const WeatherPanel: React.FC<{ symbol: string; compact?: boolean }> = ({ symbol, compact }) => {
  const [data, setData] = useState<WeatherFile | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'snapshot' | 'error'>('loading');

  const refresh = async (base?: WeatherFile | null) => {
    const snap = base ?? data;
    if (!snap) return;
    try {
      const live = await loadWeatherLive(snap.cities);
      const anyLive = live.cities.some((c, i) => c.data?.current?.time !== snap.cities[i]?.data?.current?.time);
      setData(live);
      setStatus(anyLive ? 'live' : 'snapshot');
    } catch {
      setStatus('snapshot');
    }
  };

  useEffect(() => {
    let alive = true;
    loadWeatherSnapshot()
      .then((s) => {
        if (!alive) return;
        setData(s);
        setStatus('snapshot');
        refresh(s);
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const relevance = WEATHER_SENSITIVE_MAP[symbol];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CloudSun className="w-5 h-5 text-cyan-400" /> Weather that can matter for markets
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${status === 'live' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>
            {status === 'live' ? 'LIVE · Open-Meteo' : status === 'loading' ? 'Loading…' : status === 'error' ? 'UNAVAILABLE' : 'SNAPSHOT'}
          </span>
          <button onClick={() => refresh()} className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300" title="Refresh weather">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className={`p-3 rounded-xl mb-3 text-sm border ${relevance ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
        <strong>{symbol}:</strong>{' '}
        {relevance ? `Weather is POTENTIALLY RELEVANT — ${relevance}.` : 'Weather impact = NOT MATERIAL for this underlying (unless there is an extreme national event).'}
        <span className="block text-[11px] text-slate-500 mt-0.5">Simple sector heuristic for education — not a signal.</span>
      </div>

      {data && (
        <div className={`grid gap-2.5 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {data.cities.map((c) => {
            const cur = c.data?.current;
            const d = c.data?.daily;
            const rain3 = d ? d.precipitation_sum.reduce((s, v) => s + (v || 0), 0) : null;
            const alert = (d && Math.max(...d.precipitation_sum) >= 50) || (d && Math.max(...d.wind_speed_10m_max) >= 50) || (d && Math.max(...d.temperature_2m_max) >= 43);
            return (
              <div key={c.city} className={`p-3 rounded-xl border ${alert ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-800 bg-slate-950/60'}`} title={c.why}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100 text-sm">{c.city}</span>
                  <span className="text-lg" aria-hidden>{wmoIcon(cur?.weather_code)}</span>
                </div>
                {cur ? (
                  <>
                    <div className="text-xs text-slate-400">{WMO[cur.weather_code] ?? '—'}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-300 mt-1 font-mono">
                      <span className="flex items-center gap-0.5"><Thermometer className="w-3 h-3" />{cur.temperature_2m}°C</span>
                      <span className="flex items-center gap-0.5"><Wind className="w-3 h-3" />{cur.wind_speed_10m} km/h</span>
                      {rain3 !== null && <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3" />{rain3.toFixed(0)} mm/3d</span>}
                    </div>
                    {alert && <div className="text-[11px] text-rose-300 font-semibold mt-1">Heavy rain / wind / heat in forecast</div>}
                  </>
                ) : (
                  <div className="text-xs text-slate-500">Unavailable</div>
                )}
                {!compact && <div className="text-[11px] text-slate-500 mt-1 leading-snug">{c.why}</div>}
              </div>
            );
          })}
        </div>
      )}
      <div className="text-[11px] text-slate-500 mt-3">
        Weather data by{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">Open-Meteo.com</a> (CC BY 4.0). No API key
        needed. Your location is never requested. {data && <>Updated {fmtDateTime(data.fetchedAtIso)}.</>}
      </div>
    </div>
  );
};
