import React, { useMemo } from 'react';
import {
  CalendarClock,
  Layers,
  Gauge,
  Activity,
  Target,
  Ban,
  ArrowRight,
  BookOpen,
  Search,
  ShieldCheck,
  LineChart,
  Info,
} from 'lucide-react';
import {
  ChainAnalytics,
  ChainFile,
  fmtCompact,
  fmtDate,
  fmtNum,
  MarketFile,
  MetaFile,
  NewsFile,
  realizedVolAnnualized,
} from '../data/marketData';
import { OiByStrikeChart, PriceChart, Sparkline } from './shell/Charts';
import { NewsPanel, WeatherPanel } from './shell/NewsWeather';

interface Props {
  chain: ChainFile | null;
  chainError: string | null;
  analytics: ChainAnalytics | null;
  expiry: string | null;
  market: MarketFile | null;
  news: NewsFile | null;
  newsError: string | null;
  meta: MetaFile | null;
  onSelectSymbol: (s: string) => void;
  onNavigate: (tab: string) => void;
  onOpenPicker: () => void;
}

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string; icon?: React.ComponentType<{ className?: string }> }> = ({ label, value, hint, icon: Icon }) => (
  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800" title={hint}>
    <div className="text-[11px] text-slate-400 flex items-center gap-1">
      {Icon && <Icon className="w-3.5 h-3.5" />} {label}
    </div>
    <div className="text-base font-bold text-slate-100 font-mono mt-0.5">{value}</div>
    {hint && <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{hint}</div>}
  </div>
);

export const OverviewTab: React.FC<Props> = ({
  chain,
  chainError,
  analytics,
  expiry,
  market,
  news,
  newsError,
  meta,
  onSelectSymbol,
  onNavigate,
  onOpenPicker,
}) => {
  const rv = useMemo(() => (chain ? realizedVolAnnualized(chain.history, 20) : null), [chain]);
  const oiRows = useMemo(() => {
    if (!chain || !expiry || !analytics) return [];
    const rows = chain.chain[expiry] ?? [];
    const idx = rows.findIndex((r) => r[0] === analytics.atmStrike);
    const from = Math.max(0, idx - 12);
    return rows.slice(from, from + 25).map((r) => ({ k: r[0], ceOi: r[3] ?? 0, peOi: r[8] ?? 0 }));
  }, [chain, expiry, analytics]);

  const up = (chain?.changePct ?? 0) >= 0;
  const vix = market?.indices.find((i) => i.name === 'India VIX');

  return (
    <div className="space-y-6 animate-in">
      {/* Beginner guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" /> How to use this research lab
          </h2>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> No login · No API keys · No orders
          </span>
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { n: 1, t: 'Pick a stock or index', d: 'Use the big search box at the top (or press Ctrl+K). All ~200 NSE F&O names are listed.', a: onOpenPicker, cta: 'Open search', icon: Search },
            { n: 2, t: 'Study the chart & option chain', d: 'See price history, open interest, implied volatility and the full option chain.', a: () => onNavigate('CHAIN_SURFACE'), cta: 'Option chain', icon: LineChart },
            { n: 3, t: 'Test ideas with the models', d: 'Compare strategies, costs and risk. Everything is a calculation — not advice.', a: () => onNavigate('STRATEGY_PARETO'), cta: 'Strategies', icon: Layers },
            { n: 4, t: 'Decide yourself', d: 'If you ever trade, do it yourself through your own SEBI-registered broker, after your own checks.', a: () => onNavigate('LEGAL'), cta: 'Read the risks', icon: ShieldCheck },
          ].map((s) => (
            <li key={s.n} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-full brand-chip text-white flex items-center justify-center text-sm font-bold">{s.n}</span>
                <span className="font-semibold text-slate-100 text-sm">{s.t}</span>
              </div>
              <p className="text-xs text-slate-400 flex-1">{s.d}</p>
              <button onClick={s.a} className="mt-3 self-start text-xs font-semibold text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
                {s.cta} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* Selected underlying */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          {chainError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-200">
              Data for this symbol could not be loaded ({chainError}). Nothing is shown rather than showing made-up numbers.
            </div>
          )}
          {!chain && !chainError && <div className="text-sm text-slate-400 p-8 text-center">Loading market data…</div>}
          {chain && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-white">{chain.name}</h2>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-800 text-slate-300">{chain.symbol}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${chain.type === 'INDEX' ? 'bg-violet-500/15 text-violet-300' : 'bg-sky-500/15 text-sky-300'}`}>
                      {chain.type === 'INDEX' ? 'Index' : 'Stock'}
                    </span>
                    {chain.inBanList && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                        <Ban className="w-3 h-3" /> In F&amp;O ban period — no fresh positions allowed
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-3xl font-bold font-mono text-white">₹{fmtNum(chain.spot)}</span>
                    {chain.changePct != null && (
                      <span className={`text-base font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {up ? '▲' : '▼'} {fmtNum(Math.abs(chain.spot - (chain.prevClose ?? chain.spot)))} ({chain.changePct > 0 ? '+' : ''}
                        {chain.changePct.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    NSE closing price on {fmtDate(chain.tradeDate)} · end-of-day, not live
                  </div>
                </div>
                <button onClick={onOpenPicker} className="px-3 py-2 rounded-xl border border-slate-700 text-sm text-slate-200 hover:bg-slate-800 flex items-center gap-1.5">
                  <Search className="w-4 h-4" /> Change
                </button>
              </div>

              <div className="mt-4">
                <PriceChart points={chain.history.map((h) => ({ d: h.d, c: h.c }))} label={`Closing prices — last ${chain.history.length} trading days`} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                <Stat icon={Layers} label="Lot size" value={chain.lotSize} hint={chain.lotSizeSource} />
                <Stat icon={Target} label="1 lot value" value={`₹${fmtCompact(chain.spot * chain.lotSize)}`} hint="Spot × lot size" />
                <Stat icon={CalendarClock} label="Selected expiry" value={expiry ? fmtDate(expiry) : '—'} hint={analytics ? `${analytics.daysToExpiry} days from data date` : undefined} />
                <Stat icon={Gauge} label="ATM implied vol" value={analytics?.atmIv ? `${(analytics.atmIv * 100).toFixed(1)}%` : '—'} hint="Black-Scholes IV from ATM closing prices" />
                <Stat icon={Activity} label="20-day realised vol" value={rv ? `${(rv * 100).toFixed(1)}%` : '—'} hint="From daily closes, annualised" />
                <Stat label="Put/Call OI ratio" value={analytics?.pcrOi ? analytics.pcrOi.toFixed(2) : '—'} hint="Context only, not a signal" />
                <Stat label="Max-pain strike" value={analytics?.maxPain ?? '—'} hint="Strike with least payout to option buyers" />
                <Stat
                  label="Expected move (±1σ)"
                  value={analytics?.expectedMovePts ? `±${fmtNum(analytics.expectedMovePts, 0)}` : '—'}
                  hint="Spot × IV × √(days/365), market-implied, not a forecast"
                />
              </div>
            </>
          )}
        </div>

        {/* Market pulse */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center justify-between">
            Market pulse
            {market && <span className="text-[11px] font-normal text-slate-500">close of {fmtDate(market.tradeDate)}</span>}
          </h3>
          {!market && <div className="text-sm text-slate-400">Loading…</div>}
          {market && (
            <>
              <div className="space-y-1.5">
                {market.indices.slice(0, 6).map((i) => {
                  const u = (i.changePct ?? 0) >= 0;
                  const sym = i.name === 'Nifty 50' ? 'NIFTY' : i.name === 'Nifty Bank' ? 'BANKNIFTY' : i.name === 'Nifty Financial Services' ? 'FINNIFTY' : i.name === 'Nifty Midcap Select' ? 'MIDCPNIFTY' : i.name === 'Nifty Next 50' ? 'NIFTYNXT50' : null;
                  return (
                    <button
                      key={i.name}
                      disabled={!sym}
                      onClick={() => sym && onSelectSymbol(sym)}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-800/60 text-left disabled:cursor-default"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-100 truncate">{i.name}</span>
                        <span className="text-xs font-mono text-slate-400">{fmtNum(i.close)}</span>
                      </span>
                      <Sparkline values={i.history.slice(-30).map((h) => h[1])} width={80} height={28} />
                      <span className={`w-16 text-right text-xs font-bold ${i.name === 'India VIX' ? 'text-amber-300' : u ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {i.changePct != null ? `${i.changePct > 0 ? '+' : ''}${i.changePct.toFixed(2)}%` : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>F&amp;O stocks up: {market.advances}</span>
                  <span>down: {market.declines}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden bg-slate-800 flex">
                  <div className="bg-emerald-500" style={{ width: `${(market.advances / Math.max(1, market.advances + market.declines)) * 100}%` }} />
                  <div className="bg-rose-500 flex-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { t: 'Top gainers', list: market.gainers, c: 'text-emerald-400' },
                  { t: 'Top losers', list: market.losers, c: 'text-rose-400' },
                ].map((g) => (
                  <div key={g.t}>
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">{g.t}</div>
                    {g.list.slice(0, 5).map((s) => (
                      <button key={s.symbol} onClick={() => onSelectSymbol(s.symbol)} className="w-full flex justify-between text-xs py-1 px-1.5 rounded-md hover:bg-slate-800/60">
                        <span className="font-mono text-slate-200 truncate">{s.symbol}</span>
                        <span className={`font-semibold ${g.c}`}>{s.changePct > 0 ? '+' : ''}{s.changePct.toFixed(2)}%</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              {vix && (
                <div className="text-xs p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                  India VIX {fmtNum(vix.close)} — the market&rsquo;s own estimate of expected NIFTY volatility over the next 30 days.
                </div>
              )}
              {market.banList.length > 0 && (
                <div className="text-xs">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1 flex items-center gap-1">
                    <Ban className="w-3.5 h-3.5 text-rose-400" /> F&amp;O ban list {market.banForDate ? `(${market.banForDate})` : ''}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {market.banList.map((s) => (
                      <button key={s} onClick={() => onSelectSymbol(s)} className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 font-mono border border-rose-500/30">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {chain && expiry && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-base font-bold text-white">Where are option positions concentrated? (open interest by strike)</h3>
            <button onClick={() => onNavigate('CHAIN_SURFACE')} className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
              Full option chain <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <OiByStrikeChart rows={oiRows} spot={chain.spot} />
          {analytics && (
            <p className="text-xs text-slate-400 mt-2 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Highest call OI at {analytics.highestCeOiStrike ?? '—'} and highest put OI at {analytics.highestPeOiStrike ?? '—'} for the {fmtDate(expiry)} expiry.
              Open interest shows where contracts are outstanding; it does not tell you where the price will go.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <NewsPanel news={news} symbol={chain?.symbol ?? 'NIFTY'} symbolName={chain?.name} error={newsError} />
        <WeatherPanel symbol={chain?.symbol ?? 'NIFTY'} compact />
      </div>

      {meta && (
        <div className="text-[11px] text-slate-500 text-center">
          Data snapshot built {new Date(meta.generatedAtIso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST from official NSE archive files ·{' '}
          {meta.underlyings} F&amp;O underlyings · {meta.historyDays} trading days of history.
        </div>
      )}
    </div>
  );
};
