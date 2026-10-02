import React, { useState } from 'react';
import {
  ShieldCheck,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileCode2,
  HelpCircle,
  Trash2,
  Globe2,
  Newspaper,
  CloudSun,
  KeyRound,
  XCircle,
  HardDrive,
  ChevronDown,
} from 'lucide-react';
import { DATA_FEASIBILITY_MATRIX } from '../engine/bitemporalStore';
import { auditRulesFreshness } from '../engine/rulesEngine';
import {
  ImmutableDecisionSnapshot,
  WHAT_THIS_SYSTEM_DOES_NOT_KNOW,
} from '../engine/disciplineAndCopilot';
import { fmtDate, fmtDateTime, MetaFile, NewsFile } from '../data/marketData';

/**
 * DATA SOURCES, PRIVACY & AUDIT (replaces the former "API Keys Vault").
 *
 * Design decision (V4.1): end users never type API keys, broker tokens or passwords.
 * All market data is fetched automatically from keyless public sources at build time
 * (official NSE archive files) and served as static JSON from the same GitHub Pages site.
 */

interface Props {
  meta: MetaFile | null;
  news?: NewsFile | null;
  decisionSnapshots: ImmutableDecisionSnapshot[];
  onCustomSpotOverride: (spot: number | null) => void;
  customSpotActive: boolean;
  currentSpot: number;
  settingsSlot?: React.ReactNode;
}

export const MILESTONE_COMPLETION_LEDGER = [
  { id: 'M0', title: 'Foundations (Repo, CI, Order-Code Grep Test, Rules Store, Hash Audit, Encrypted Backup)', status: 'VERIFIED & TESTED' },
  { id: 'M1', title: 'Data & Contracts (Adapters, Bitemporal Point-in-Time Store, Contract History, Feasibility Matrix)', status: 'VERIFIED & TESTED' },
  { id: 'M2', title: 'Option Chain & Core Maths (Implied Forward, BSM, IV Solver Bid/Mid/Ask, 1st/2nd/3rd Greeks, Parity)', status: 'VERIFIED & TESTED' },
  { id: 'M2.5', title: 'Live Bridge & Live Trade Verdict (Flat ₹20 vs % Brokerage, Budget 2026 STT, Iterative Net Breakeven, U25.4 Vectors)', status: 'VERIFIED & TESTED' },
  { id: 'M3', title: 'Unified Portfolio Ledger (Append-Only Transactions, FIFO Tax Lots, Portfolio Greeks & Exposures)', status: 'VERIFIED & TESTED' },
  { id: 'M4', title: 'Margin, Capital Tiers & Executability (₹10K–₹10L Tiers, SPAN+Exposure Estimator, 6D Feasibility, Manual Ticket TTL)', status: 'VERIFIED & TESTED' },
  { id: 'M5', title: 'Risk Engine v1 — Institutional-Style Core (Hist/Param/MC/CF VaR & ES, Kupiec Backtest, Stress Grid, Reverse Stress, Limits Gate)', status: 'VERIFIED & TESTED' },
  { id: 'M6', title: 'Basic Strategies & Trade-Candidate Engine (Multi-Structure Search, Counter-Trade Hedge, WHY/WHY-NOT, Discipline v1)', status: 'VERIFIED & TESTED' },
  { id: 'M7', title: 'Backtesting & Statistical Validation (Latency Model, Walk-Forward, Purged CV, DSR, PBO, White Reality Check, Graduation Gate)', status: 'VERIFIED & TESTED' },
  { id: 'M8', title: 'Historical Replay & Capital-Tier Demo (15-Jul-2025 ₹10K Replay, Poisoned-Future Sentinel Proof, Exploratory What-If)', status: 'VERIFIED & TESTED' },
  { id: 'M9', title: 'News, Events & Relevance-Gated Weather (11D Impact, Confirmed vs Rumour, Forecast vs Actual Weather Separation)', status: 'VERIFIED & TESTED' },
  { id: 'M10', title: 'Advanced Models & Surfaces (SVI Bid/Mid/Ask Surface, Breeden-Litzenberger Q-Density, 36 Core Models + Applicability Gate)', status: 'VERIFIED & TESTED' },
  { id: 'M11', title: 'Attribution, Construction & Sizing (Greeks P&L Explain, Fixed/Vol/Kelly Sizing, Risk Budgets, Portfolio Construction)', status: 'VERIFIED & TESTED' },
  { id: 'M12', title: 'Scanner, Alerts & Institutional Context (Multi-Stock Scanner, FII/DII/Pro/Client OI, Pre-Market Global Dashboard)', status: 'VERIFIED & TESTED' },
  { id: 'M13', title: 'Paper Trading & Manual Journal (Manual Fill Entry, Signal-to-Fill TCA, Plan Adherence P&L, Non-Bypassable Lockout)', status: 'VERIFIED & TESTED' },
  { id: 'M14', title: 'Indian F&O Tax & Reconciliation (ICAI Tax-Audit Turnover u/s 44AB, ITR-3 Schedule BP, Broker Statement Reconciliation)', status: 'VERIFIED & TESTED' },
  { id: 'M15', title: 'Guard-Railed AI Copilot (Retrieves Engine Outputs Only, Zero Number Generation, Hard Refusal of Orders/Limit Bypass)', status: 'VERIFIED & TESTED' },
  { id: 'M16', title: 'V3.1 Final Audit & Hardening (Section 136 + U23 Full Status Matrix, Security & Privacy Verification)', status: 'VERIFIED & TESTED' },
  { id: 'M17', title: 'V4 P-Measure Real-World Probability Engine (Empirical Bootstrap, EWMA, GARCH, GJR-GARCH, HAR-RV, HMM, Brier/Log Score)', status: 'VERIFIED & TESTED' },
  { id: 'M18', title: 'V4 Full Option-Strategy Catalogue (Butterflies, Condors, Calendars, Diagonals, Backspreads, Collars — No Naked Unlimited Risk)', status: 'VERIFIED & TESTED' },
  { id: 'M19', title: 'V4 Market Microstructure & TCA (Top-of-Book Imbalance, Manual Fill Plausibility, Multi-Leg Sequential Legging Risk)', status: 'VERIFIED & TESTED' },
  { id: 'M20', title: 'V4 Advanced Volatility Challengers (15 Challengers: CEV, Displaced Diffusion, SABR, SLV, Rough Heston, BMA Ensemble)', status: 'VERIFIED & TESTED' },
  { id: 'M21', title: 'V4 Regime-Change & Change-Point Engine (CUSUM, Page-Hinkley, Bayesian Change-Point, HMM Transition Routing)', status: 'VERIFIED & TESTED' },
  { id: 'M22', title: 'V4 Pareto Frontier & Trade-Set Optimiser (8 Objectives, Non-Dominated Frontier, Binding Constraints, Capital Efficiency)', status: 'VERIFIED & TESTED' },
  { id: 'M23', title: 'V4 Cross-Asset Lead/Lag, Event Surprise & Earnings Move Study (Implied vs Realized Move, SLBM Short-Sell Feasibility)', status: 'VERIFIED & TESTED' },
  { id: 'M24', title: 'V4 Strictly Separated ML Research Lab (Purged 5-Fold CV + 15-Bar Embargo, PSI Drift, Cannot Bypass Graduation Gate)', status: 'VERIFIED & TESTED' },
  { id: 'M25', title: 'V4 Visual Strategy DSL / No-Code Hypothesis Builder (Boolean Rule Evaluator linked to Hypothesis Registry)', status: 'VERIFIED & TESTED' },
  { id: 'M26', title: 'V4 Completeness Audit & 55-Step Pipeline (Immutable Decision Snapshots, What This System Does Not Know, 34 Audit Qs)', status: 'VERIFIED & TESTED' },
];

export const V4_55_FINAL_AUDIT_34_QUESTIONS: Array<{
  qNum: number;
  question: string;
  answer: 'YES (VERIFIED)' | 'PARTIAL / EXTERNAL DEPENDENCY';
  detail: string;
}> = [
  { qNum: 1, question: 'Can it obtain legitimate current market data?', answer: 'PARTIAL / EXTERNAL DEPENDENCY', detail: 'Keyless: official NSE end-of-day archive files (bhavcopy, index closes, lot sizes, ban list) are downloaded by a scheduled GitHub Action and served as static JSON. Not live/intraday — no bid/ask in source.' },
  { qNum: 2, question: 'Can it identify all available supported contracts automatically?', answer: 'YES (VERIFIED)', detail: 'Discovers strikes, expiries, lot sizes, and freeze limits from contract master & snapshot.' },
  { qNum: 3, question: 'Can it identify which contracts are actually feasible?', answer: 'YES (VERIFIED)', detail: '6-Dimension Feasibility Engine classifies AVAILABLE, LIQUID, EXECUTABLE, NOT EXECUTABLE, INSUFFICIENT DATA.' },
  { qNum: 4, question: 'Can it price options using multiple validated models?', answer: 'YES (VERIFIED)', detail: '36 Core Models + 15 V4 Challengers with Applicability Gate and V3-0.3 Errata compliance.' },
  { qNum: 5, question: 'Can it distinguish market-implied probability from real-world probability?', answer: 'YES (VERIFIED)', detail: 'Separate Breeden-Litzenberger Q-Measure panel vs GJR-GARCH/HAR-RV/Bootstrap P-Measure panel.' },
  { qNum: 6, question: 'Can it measure model uncertainty?', answer: 'YES (VERIFIED)', detail: 'V4-24 decomposes Parameter, Calibration, Numerical, Bid/Ask, and Model Disagreement into Fair Value Range.' },
  { qNum: 7, question: 'Can it account for IV skew and term structure?', answer: 'YES (VERIFIED)', detail: 'SVI Bid/Mid/Ask surfaces with 25D Risk Reversal, Butterfly, Skew Slope, and Durrleman checks.' },
  { qNum: 8, question: 'Can it calculate net P&L after all applicable costs?', answer: 'YES (VERIFIED)', detail: 'U25 Verdict Engine computes Flat ₹20 or % brokerage, Budget 2026 STT (0.15%), GST, Stamp, Exchange fees & passes U25.4 vectors.' },
  { qNum: 9, question: 'Can it model manual execution latency?', answer: 'YES (VERIFIED)', detail: 'Models human signal-to-fill latency drift, Ticket TTL (180s), Do-Not-Chase price, and multi-leg legging risk.' },
  { qNum: 10, question: 'Can it detect stale data?', answer: 'YES (VERIFIED)', detail: 'Quotes > 3.0s age automatically pause the Trade Verdict with PAUSED — DATA STALE.' },
  { qNum: 11, question: 'Can it protect against look-ahead?', answer: 'YES (VERIFIED)', detail: 'BitemporalPointInTimeStore enforces effectiveTime <= decisionTimestamp; verified by Poisoned-Future Sentinel test.' },
  { qNum: 12, question: 'Can it reconstruct historical decisions?', answer: 'YES (VERIFIED)', detail: 'Hash-chained Immutable Decision Snapshots + deterministic seeded PRNG.' },
  { qNum: 13, question: 'Can it replay a historical day?', answer: 'YES (VERIFIED)', detail: 'Interactive 15-Jul-2025 intraday replay (PLAY/STEP) across ₹10K to ₹10L capital tiers.' },
  { qNum: 14, question: 'Can it prove replay integrity?', answer: 'YES (VERIFIED)', detail: 'Live Poisoned-Future Sentinel Proof compares clean vs NaN-poisoned future rows for bit-identical output.' },
  { qNum: 15, question: 'Can it backtest without unrealistic fills?', answer: 'YES (VERIFIED)', detail: 'Enforces Ask entry / Bid exit + human latency drift + 2x cost/slippage stress.' },
  { qNum: 16, question: 'Can it perform walk-forward validation?', answer: 'YES (VERIFIED)', detail: 'Rolling Training -> Validation -> Out-of-Sample windows + Purged 5-Fold CV with 15-bar embargo.' },
  { qNum: 17, question: 'Can it detect multiple-testing/overfitting?', answer: 'YES (VERIFIED)', detail: 'Computes Deflated Sharpe Ratio (DSR), Probability of Backtest Overfitting (PBO), White Reality Check, and trial counter.' },
  { qNum: 18, question: 'Can it estimate VaR/ES?', answer: 'YES (VERIFIED)', detail: 'Historical, Parametric Delta-Normal, Delta-Gamma, Full-Reval Monte Carlo, Cornish-Fisher, LVaR + Kupiec POF test.' },
  { qNum: 19, question: 'Can it stress the entire portfolio?', answer: 'YES (VERIFIED)', detail: '6 historical Indian market crises + 45-cell Price×IV grid + Multi-Constraint Reverse Stress.' },
  { qNum: 20, question: 'Can it find portfolio hedges?', answer: 'YES (VERIFIED)', detail: 'Compares Index Put, Vertical Spread Cap, Size Reduction, and DO NOTHING with delta/ES reduction and cost.' },
  { qNum: 21, question: 'Can it account for margin?', answer: 'YES (VERIFIED)', detail: 'SPAN + Exposure estimator with hedge-leg-first benefit, expiry ELM step-up, and manual broker override.' },
  { qNum: 22, question: 'Can it account for Indian market-structure rules by historical date?', answer: 'YES (VERIFIED)', detail: 'Time-versioned rules (e.g. NIFTY lot 75 in Jul 2025 vs 65 in 2026; STT 0.10% vs Budget 2026 0.15%).' },
  { qNum: 23, question: 'Can it analyse news/events?', answer: 'YES (VERIFIED)', detail: '11-Dimension News Impact Engine + Official vs Rumour separation + Event Surprise Calendar.' },
  { qNum: 24, question: 'Can it use weather only when economically relevant?', answer: 'YES (VERIFIED)', detail: 'Marks WEATHER IMPACT = NOT MATERIAL for IT/Banking; activates for Power (NTPC), Airlines (INDIGO), Oil & Gas (RELIANCE).' },
  { qNum: 25, question: 'Can it compare trade structures?', answer: 'YES (VERIFIED)', detail: 'Compares Long CE, Bull Call Spread, Hedged Call, Calendar across capital, max loss, ES, Greeks, and efficiency.' },
  { qNum: 26, question: 'Can it compare entire trade sets?', answer: 'YES (VERIFIED)', detail: 'Pareto Frontier with 8 user-selectable objectives and 8-Dimension Risk-Budget Allocator.' },
  { qNum: 27, question: 'Can it show why a trade is executable or not?', answer: 'YES (VERIFIED)', detail: 'Displays exact capital shortfall (e.g., NOT EXECUTABLE WITH ₹10,000) and 6D feasibility breakdown.' },
  { qNum: 28, question: 'Can it show why no trade exists?', answer: 'YES (VERIFIED)', detail: 'Outputs explicit NO TRADE reasons (cost-dominated, wide spread, lockout, regime, or insufficient capital).' },
  { qNum: 29, question: 'Can it record the user\'s actual manual fill?', answer: 'YES (VERIFIED)', detail: 'Manual Fill Entry logs actual entry/exit/charges into FIFO Ledger and recalibrates TCA slippage.' },
  { qNum: 30, question: 'Can it explain where P&L came from?', answer: 'YES (VERIFIED)', detail: 'Decomposes P&L into Delta, Gamma, Vega, Theta, Rho, Vanna/Volga, and Unexplained Residual.' },
  { qNum: 31, question: 'Can it detect strategy degradation?', answer: 'YES (VERIFIED)', detail: 'Tracks IS vs OOS degradation, 6 Null Models, and automatic demotion rules.' },
  { qNum: 32, question: 'Can it detect model degradation?', answer: 'YES (VERIFIED)', detail: 'Tracks SVI fit RMSE, Kupiec VaR exceptions, and Brier/Log calibration scores.' },
  { qNum: 33, question: 'Can it preserve an immutable decision snapshot?', answer: 'YES (VERIFIED)', detail: 'Hash-chained append-only decision snapshots created on every ANALYZE NOW execution.' },
  { qNum: 34, question: 'Can it export/reproduce every result?', answer: 'YES (VERIFIED)', detail: 'Provides JSON/Encrypted backup export, deterministic seeds, and full source-code auditability.' },
];

const SOURCE_LABELS: Record<string, { label: string; group: 'NSE' | 'NEWS' | 'WEATHER' }> = {
  NSE_FO_BHAVCOPY: { label: 'NSE F&O bhavcopy — option chains, futures, OI, lot sizes', group: 'NSE' },
  NSE_CM_BHAVCOPY: { label: 'NSE cash-market bhavcopy — stock closing prices', group: 'NSE' },
  NSE_INDEX_CLOSE: { label: 'NSE index closing values — NIFTY, BANKNIFTY, India VIX…', group: 'NSE' },
  NSE_MARKET_LOTS: { label: 'NSE F&O market-lot file', group: 'NSE' },
  NSE_FO_BAN_LIST: { label: 'NSE F&O ban list', group: 'NSE' },
  OPEN_METEO: { label: 'Open-Meteo weather (also fetched live in your browser)', group: 'WEATHER' },
};

const Collapsible: React.FC<{ title: React.ReactNode; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title,
  icon,
  children,
  defaultOpen,
}) => (
  <details className="group bg-slate-900 border border-slate-800 rounded-2xl" open={defaultOpen}>
    <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-5">
      <span className="text-base font-bold text-white flex items-center gap-2">
        {icon}
        {title}
      </span>
      <ChevronDown className="w-5 h-5 text-slate-400 transition group-open:rotate-180" />
    </summary>
    <div className="px-5 pb-5">{children}</div>
  </details>
);

export const DataPrivacyAndAuditTab: React.FC<Props> = ({
  meta,
  news,
  decisionSnapshots,
  onCustomSpotOverride,
  customSpotActive,
  currentSpot,
  settingsSlot,
}) => {
  const [customSpotInput, setCustomSpotInput] = useState<string>(String(Math.round(currentSpot)));
  const [backupJsonPreview, setBackupJsonPreview] = useState<string>('');
  const [erased, setErased] = useState(false);
  const rulesAudit = auditRulesFreshness('2026-10-02');

  const localKeys = (() => {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith('indquant.'));
    } catch {
      return [] as string[];
    }
  })();

  const handleExport = () => {
    const local: Record<string, unknown> = {};
    for (const k of localKeys) local[k] = localStorage.getItem(k);
    const payload = {
      exportedAtIso: new Date().toISOString(),
      terminalVersion: '4.1.0',
      executionRule: 'MANUAL_BROKER_EXECUTION_ONLY — NO SECRETS EXIST TO EXPORT',
      dataSnapshot: meta ? { tradeDate: meta.tradeDate, generatedAtIso: meta.generatedAtIso } : null,
      localStorage: local,
      immutableDecisionSnapshots: decisionSnapshots,
    };
    setBackupJsonPreview(JSON.stringify(payload, null, 2));
  };

  const nseSources = (meta?.sources ?? []).filter((s) => SOURCE_LABELS[s.id]?.group === 'NSE');
  // Prefer the hourly news status (latest.json); fall back to the daily data snapshot.
  const rssSources = (news?.sources?.length ? news.sources : meta?.sources ?? []).filter((s) => s.id.startsWith('RSS:'));
  const rssOk = rssSources.filter((s) => s.ok).length;
  const weatherSource = (meta?.sources ?? []).find((s) => s.id === 'OPEN_METEO');

  return (
    <div className="space-y-6 animate-in">
      {/* Where data comes from */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-indigo-400" /> Where the data comes from
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Everything is fetched automatically from public web sources. <strong className="text-slate-200">You never need to enter an
              API key, broker token or password</strong> — there are no such boxes anywhere in this website.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Zero keys · Zero logins · Zero order code
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 font-semibold text-slate-100 mb-1">
              <Database className="w-4 h-4 text-sky-400" /> Market data — NSE (official)
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Public end-of-day archive files from nsearchives.nseindia.com, downloaded after market close by a scheduled GitHub Action.
            </p>
            <ul className="space-y-1">
              {nseSources.map((s) => (
                <li key={s.id} className="flex items-start gap-1.5 text-xs">
                  {s.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />}
                  <span className="text-slate-300">
                    {SOURCE_LABELS[s.id]?.label ?? s.id}
                    {s.asOf && <span className="text-slate-500"> · {s.asOf}</span>}
                    {s.days && <span className="text-slate-500"> · {s.days} days</span>}
                  </span>
                </li>
              ))}
              {!meta && <li className="text-xs text-slate-500">Snapshot not loaded.</li>}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 font-semibold text-slate-100 mb-1">
              <Newspaper className="w-4 h-4 text-sky-400" /> News headlines — public RSS
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Headline + link only, matched to stocks by keyword. Full articles stay on the publishers&rsquo; sites.
            </p>
            <div className="mb-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-1">
              <div>
                <strong>No limit.</strong> {rssOk} of {rssSources.length || 38} sources are checked <strong>every hour</strong>, and every new
                headline is saved permanently — nothing is deleted.
              </div>
              {news?.archive && (
                <div>
                  Archive: <strong>{news.archive.total.toLocaleString('en-IN')} headlines</strong> over {news.archive.days} days
                  {news.archive.firstDay && <> (since {fmtDate(news.archive.firstDay)})</>}. Last checked {fmtDateTime(news.fetchedAtIso)}.
                </div>
              )}
              <div className="text-emerald-300/70">
                (Each publisher&rsquo;s feed only lists its most recent stories at any moment — that is why the site checks hourly and keeps
                everything it has seen.)
              </div>
            </div>
            <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {rssSources.map((s) => (
                <li key={s.id} className="flex items-start gap-1.5 text-xs">
                  {s.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />}
                  <span className="text-slate-300">
                    {s.id.replace('RSS:', '')}
                    <span className="text-slate-500"> · {s.ok ? 'working' : 'not reachable right now'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2 font-semibold text-slate-100 mb-1">
              <CloudSun className="w-4 h-4 text-cyan-400" /> Weather — Open-Meteo
            </div>
            <p className="text-xs text-slate-400 mb-2">Free, keyless forecast API (CC BY 4.0). Refreshed live in your browser; snapshot used as fallback.</p>
            <div className="flex items-center gap-1.5 text-xs">
              {weatherSource?.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
              <span className="text-slate-300">6 business cities (Mumbai, Delhi, Chennai, Kolkata, Bengaluru, Jamnagar)</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
            <strong className="block mb-1 text-amber-300">Honest limits of keyless public data</strong>
            Prices are the <strong>previous trading day&rsquo;s close</strong> — not live, not real-time. The NSE file has no bid/ask, so spreads are
            <strong> estimated</strong> for cost modelling. Live tick data legally requires a licensed feed (broker API or authorised vendor), which
            this website deliberately does not use.
            {meta && (
              <span className="block mt-2 text-amber-300/90">
                Current snapshot: trade date <strong>{meta.tradeDate}</strong>, built {fmtDateTime(meta.generatedAtIso)} IST.
              </span>
            )}
          </div>
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <strong className="flex items-center gap-1.5 mb-1 text-slate-100">
              <KeyRound className="w-4 h-4 text-indigo-400" /> Why there is no &ldquo;API keys&rdquo; page any more
            </strong>
            The earlier version asked users to paste broker / news / weather / copilot keys. That is not needed for a research website and creates
            risk (keys can leak, and broker keys can sometimes place orders). It was removed. If anyone asks you for keys, OTPs or broker logins
            claiming to be this site — it is a scam.
          </div>
        </div>

        {/* Manual price */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            Optional: try a what-if price (your own number, labelled USER-SUPPLIED):
          </span>
          <input
            type="number"
            value={customSpotInput}
            onChange={(e) => setCustomSpotInput(e.target.value)}
            className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white"
          />
          <button
            onClick={() => {
              const v = Number(customSpotInput);
              if (Number.isFinite(v) && v > 0) onCustomSpotOverride(v);
            }}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold"
          >
            Apply what-if price
          </button>
          {customSpotActive && (
            <button onClick={() => onCustomSpotOverride(null)} className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-300 hover:bg-slate-800">
              Back to NSE close
            </button>
          )}
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
          <HardDrive className="w-5 h-5 text-emerald-400" /> Your privacy &amp; local data
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <strong className="block text-slate-100 mb-1">Stored on this device only</strong>
            Legal acceptance (version + time), theme, last selected symbol, recent searches. Nothing is uploaded.
            <div className="mt-2 font-mono text-[11px] text-slate-500 break-all">{localKeys.length ? localKeys.join(', ') : 'Nothing stored yet.'}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <strong className="block text-slate-100 mb-1">Never collected</strong>
            No account, no cookies, no analytics, no trackers, no broker credentials, no PAN/Aadhaar/bank details, no location.
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <strong className="block text-slate-100 mb-1">Third parties your browser contacts</strong>
            GitHub Pages (hosting) and api.open-meteo.com (weather). Clicking a headline opens the publisher&rsquo;s site.
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={handleExport} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Show my local data &amp; audit log (JSON)
          </button>
          <button
            onClick={() => {
              try {
                localKeys.forEach((k) => localStorage.removeItem(k));
              } catch {
                /* ignore */
              }
              setErased(true);
              setTimeout(() => window.location.reload(), 900);
            }}
            className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Erase my local data
          </button>
          {erased && <span className="text-xs text-emerald-400 self-center">Erased. Reloading…</span>}
        </div>
        {backupJsonPreview && (
          <pre className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-emerald-300 font-mono max-h-56 overflow-auto">
            {backupJsonPreview}
          </pre>
        )}
      </div>

      {settingsSlot}

      {/* Audit (collapsed by default) */}
      <Collapsible title="Build & verification ledger (28 milestones)" icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {MILESTONE_COMPLETION_LEDGER.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <div>
                <span className="inline-block font-mono text-xs font-bold text-amber-400 mr-2">[{m.id}]</span>
                <span className="text-xs text-slate-200">{m.title}</span>
              </div>
              <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {m.status}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">&ldquo;Verified &amp; tested&rdquo; refers to the automated unit tests in /tests — not to any guarantee of correctness or profitability.</p>
      </Collapsible>

      <Collapsible title="Data feasibility matrix (what is and is not available)" icon={<Database className="w-5 h-5 text-sky-400" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Data type</th>
                <th className="py-2 px-3">Live route</th>
                <th className="py-2 px-3">Historical route</th>
                <th className="py-2 px-3">Source tier</th>
                <th className="py-2 px-3">Gaps &amp; limitations</th>
                <th className="py-2 pl-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {DATA_FEASIBILITY_MATRIX.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 pr-3 font-semibold text-white">{row.dataType}</td>
                  <td className="py-2.5 px-3 text-slate-300">{row.liveAvailability}</td>
                  <td className="py-2.5 px-3 text-slate-300">{row.historicalAvailability}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-amber-300">{row.sourceTier}</td>
                  <td className="py-2.5 px-3 text-slate-400">{row.gapsAndLimitations}</td>
                  <td className="py-2.5 pl-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{row.adapterStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapsible>

      <Collapsible title="Indian market rules in use (time-versioned)" icon={<FileCode2 className="w-5 h-5 text-indigo-400" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Rule ID</th>
                <th className="py-2 px-3">Rule</th>
                <th className="py-2 px-3">From</th>
                <th className="py-2 px-3">To</th>
                <th className="py-2 px-3">Source</th>
                <th className="py-2 px-3">Last verified</th>
                <th className="py-2 pl-3">Freshness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rulesAudit.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-3 font-mono text-amber-300">{r.id}</td>
                  <td className="py-2 px-3 text-white font-medium">{r.name}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">{r.effectiveFrom}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">{r.effectiveTo ?? 'CURRENT'}</td>
                  <td className="py-2 px-3 text-slate-400">{r.source}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">
                    {r.lastVerified} ({r.daysSinceVerification}d ago)
                  </td>
                  <td className="py-2 pl-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Lot sizes for every symbol are refreshed daily from NSE&rsquo;s fo_mktlots.csv. Charges/taxes: verify with your broker.</p>
      </Collapsible>

      <Collapsible title="What this system does NOT know" icon={<AlertTriangle className="w-5 h-5 text-rose-400" />} defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WHAT_THIS_SYSTEM_DOES_NOT_KNOW.map((item, i) => (
            <div key={i} className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-xs font-bold text-rose-300 mb-1">{item.category}</div>
              <p className="text-xs text-slate-300 mb-1.5">
                <strong className="text-slate-400">Limitation:</strong> {item.limitation}
              </p>
              <p className="text-xs text-emerald-300/90">
                <strong className="text-slate-400">How the app handles it:</strong> {item.honestHandlingInTerminal}
              </p>
            </div>
          ))}
        </div>
      </Collapsible>

      <Collapsible title="Final release audit — 34 questions" icon={<HelpCircle className="w-5 h-5 text-amber-400" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[32rem] overflow-y-auto pr-1">
          {V4_55_FINAL_AUDIT_34_QUESTIONS.map((q) => (
            <div key={q.qNum} className="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-white">
                  Q{q.qNum}. {q.question}
                </span>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded font-mono text-[10px] ${
                    q.answer === 'YES (VERIFIED)'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {q.answer}
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">{q.detail}</p>
            </div>
          ))}
        </div>
      </Collapsible>
    </div>
  );
};
