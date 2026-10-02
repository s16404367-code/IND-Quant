import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Cpu,
  LineChart,
  Clock,
  Eye,
  EyeOff,
  Wallet,
  Lightbulb,
  BookOpen,
  Info,
  TrendingUp,
  TrendingDown,
  Lock,
} from 'lucide-react';
import { BitemporalPointInTimeStore, evaluateReplayValidityGrade } from '../engine/bitemporalStore';
import {
  computeStatisticalValidationSuite,
  evaluatePointInTimeReplayDecision,
  HistoricalIntradayBar,
  ML_RESEARCH_LAB_MODELS,
  runPoisonedFutureSentinelTest,
} from '../engine/backtestAndValidation';
import { HISTORICAL_REPLAY_15_JUL_2025_RECORDS } from '../engine/verifiedHistoricalFixtures';
import { formatINR } from '../engine/rulesEngine';
import { IDEAS, IdeaId, runSimpleBacktest, BtResult, COST_FLAT_RUPEES, COST_PCT } from '../engine/simpleBacktest';
import type { ChainFile } from '../data/marketData';
import { fmtDate } from '../data/marketData';

interface Props {
  capitalRupees: number;
  numberFormatMode: 'LAKH_CRORE' | 'STANDARD';
  /** Selected stock / index with its real NSE price history (optional — tests render without it). */
  chain?: ChainFile | null;
}

const RECORDS = HISTORICAL_REPLAY_15_JUL_2025_RECORDS;
const STEP_LABELS = [
  { time: '09:15', what: 'Market opens' },
  { time: '09:45', what: 'First half hour' },
  { time: '10:30', what: 'Mid-morning' },
  { time: '11:15', what: 'Entry moment' },
  { time: '12:30', what: 'Lunch time' },
  { time: '14:15', what: 'Afternoon dip' },
  { time: '15:20', what: 'Near the close' },
];
const ENTRY_STEP = 3;

const DECISION_TEXT: Record<string, { label: string; tone: string; explain: string }> = {
  'TRADE CANDIDATE': {
    label: 'Possible trade (sample day)',
    tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    explain: 'On this replayed sample day, every check passed with the information available at this moment.',
  },
  WATCH: {
    label: 'Watch only',
    tone: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    explain: 'Something is interesting, but not enough checks pass yet. Wait.',
  },
  'NO TRADE': {
    label: 'No trade',
    tone: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    explain: 'Not enough information or a safety check failed. Doing nothing is a valid decision.',
  },
};

const STAGES: Array<{ id: string; label: string }> = [
  { id: 'RESEARCH', label: 'Idea' },
  { id: 'BACKTESTED', label: 'Tested on past data' },
  { id: 'OUT-OF-SAMPLE', label: 'Tested on unseen data' },
  { id: 'PAPER', label: 'Paper trading (pretend money)' },
  { id: 'MANUAL-LIVE (SMALL CAPITAL)', label: 'Small real money' },
  { id: 'SCALED', label: 'Normal size' },
];

const WHAT_IF = [
  { id: 'AFFORDABLE_OTM_CE', name: 'Buy one cheaper call option', detail: 'NIFTY 24650 CE, 1 lot of 75, no protection', need: 7425, gross: 686.25, costs: 58.14, net: 628.11, worst: -1001.25 },
  { id: 'BULL_CALL_SPREAD', name: 'Call spread (buy one, sell one)', detail: 'Buy 24550 CE, sell 24700 CE — limits both profit and loss', need: 34500, gross: 810, costs: 116.4, net: 693.6, worst: -480 },
  { id: 'WITH_INDEX_PUT_HEDGE', name: 'Call option + protection', detail: '24650 CE plus a far-away put as insurance', need: 9300, gross: 412.5, costs: 112.8, net: 299.7, worst: -540 },
  { id: 'NO_TRADE_HOLD_CASH', name: 'Do nothing (keep cash)', detail: 'No trade at all', need: 0, gross: 0, costs: 0, net: 0, worst: 0 },
] as const;

const SAMPLE_TRADE_PNLS = [
  680, -410, 920, 540, -390, 1120, -450, 790, 610, -380, 840, -420, 950, 480, -360, 1040, 590, -410, 720, -390, 890, 530,
  -440, 910, 640, -370, 810, 490, -350, 760, 620, -400, 880, 510,
];

// --------------------------------------------------------------------------------------------------
// Small building blocks
// --------------------------------------------------------------------------------------------------
const SectionHeader: React.FC<{ n: number; icon: React.ReactNode; title: string; subtitle: string; badge?: React.ReactNode }> = ({
  n,
  icon,
  title,
  subtitle,
  badge,
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-9 h-9 rounded-xl btn-primary flex items-center justify-center text-sm font-extrabold">{n}</span>
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          {icon} {title}
        </h2>
        <p className="text-sm text-slate-400 mt-0.5 max-w-3xl">{subtitle}</p>
      </div>
    </div>
    {badge}
  </div>
);

const SampleBadge: React.FC<{ text?: string }> = ({ text = 'SAMPLE DATA — illustrative' }) => (
  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">{text}</span>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({ label, value, hint, tone }) => (
  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
    <div className="text-[11px] text-slate-400">{label}</div>
    <div className={`text-base font-bold font-mono ${tone ?? 'text-white'}`}>{value}</div>
    {hint && <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{hint}</div>}
  </div>
);

const EquityChart: React.FC<{ a: BtResult; b?: BtResult | null; aLabel: string; bLabel?: string }> = ({ a, b, aLabel, bLabel }) => {
  const W = 800;
  const H = 220;
  const pad = { l: 64, r: 12, t: 12, b: 26 };
  const all = [...a.equity, ...(b?.equity ?? [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (i / Math.max(1, a.equity.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const path = (eq: number[]) => eq.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const yStart = y(a.startCapital);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Account value over time">
        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-slate-800" strokeDasharray="3 4" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" className="fill-slate-500">
              ₹{Math.round(v).toLocaleString('en-IN')}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={yStart} y2={yStart} stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
        {b && <path d={path(b.equity)} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" />}
        <path d={path(a.equity)} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />
        <text x={pad.l} y={H - 6} fontSize="11" className="fill-slate-500">
          {fmtDate(a.startDate)}
        </text>
        <text x={W - pad.r} y={H - 6} fontSize="11" textAnchor="end" className="fill-slate-500">
          {fmtDate(a.endDate)}
        </text>
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-indigo-500 inline-block" /> {aLabel}
        </span>
        {b && bLabel && (
          <span className="flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-slate-400 inline-block" /> {bLabel}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-px bg-slate-400/50 inline-block" /> your starting money
        </span>
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------------------------------
// Main tab
// --------------------------------------------------------------------------------------------------
export const ReplayAndValidationTab: React.FC<Props> = ({ capitalRupees, numberFormatMode, chain }) => {
  const inr = (v: number) => formatINR(v, numberFormatMode);
  const signed = (v: number) => `${v >= 0 ? '+' : '−'}${formatINR(Math.abs(v), numberFormatMode)}`;
  const refs = { bt: useRef<HTMLDivElement>(null), replay: useRef<HTMLDivElement>(null), luck: useRef<HTMLDivElement>(null) };
  const go = (k: keyof typeof refs) => refs[k].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ---------------- 1) Real-data backtest ----------------
  const [idea, setIdea] = useState<IdeaId>('TREND_20');
  const [showTrades, setShowTrades] = useState(false);
  const history = chain?.history ?? [];
  const isIndex = chain?.type === 'INDEX';
  const firstPrice = history[0]?.c ?? 0;
  const fractional = isIndex || (firstPrice > 0 && firstPrice * (1 + COST_PCT) + COST_FLAT_RUPEES > capitalRupees);
  const results = useMemo(() => {
    const out: Partial<Record<IdeaId, BtResult | null>> = {};
    for (const i of IDEAS) out[i.id] = runSimpleBacktest(history, i.id, capitalRupees, fractional);
    return out;
  }, [history, capitalRupees, fractional]);
  const res = results[idea] ?? null;
  const hold = results.BUY_HOLD ?? null;
  const ideaInfo = IDEAS.find((i) => i.id === idea)!;
  const beatHold = res && hold ? res.finalValue > hold.finalValue : false;
  const ranking = IDEAS.map((i) => ({ info: i, r: results[i.id] })).filter((x) => x.r) as Array<{ info: (typeof IDEAS)[number]; r: BtResult }>;
  ranking.sort((p, q) => q.r.finalValue - p.r.finalValue);

  // ---------------- 2) Replay of a sample day ----------------
  const [stepIndex, setStepIndex] = useState<number>(ENTRY_STEP);
  const [isPlaying, setIsPlaying] = useState(false);
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= RECORDS.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const currentRecord = RECORDS[stepIndex];
  const decisionTimestampIso = currentRecord.effectiveTime;
  const store = new BitemporalPointInTimeStore<HistoricalIntradayBar>();
  store.insertBatch(RECORDS);
  // Historical 15-Jul-2025 NIFTY lot size = 75 (NSE rule Nov 2024 – Dec 2025)
  const replayDecision = evaluatePointInTimeReplayDecision(store, decisionTimestampIso, capitalRupees, 75);
  const arrivedLaterRecords = store.queryArrivedAfter(decisionTimestampIso);
  const sentinelProof = runPoisonedFutureSentinelTest(RECORDS, decisionTimestampIso, capitalRupees);
  const replayGrade = evaluateReplayValidityGrade({
    hasBidAskQuotes: true,
    hasIntradaySnapshots: true,
    hasPointInTimeContracts: true,
    hasTimestampedNews: true,
    hasArchivedWeatherForecasts: true,
    weatherRelevantForUnderlying: false,
    lookAheadSentinelPassed: sentinelProof.sentinelPassed,
  });
  const demoLot = 75;
  // The pretend trade follows what the lab decided at 11:15 with YOUR capital
  const entryDecision = evaluatePointInTimeReplayDecision(store, RECORDS[ENTRY_STEP].effectiveTime, capitalRupees, 75);
  const entryRec = RECORDS[ENTRY_STEP].payload;
  const demoTrades = entryDecision.decisionState === 'TRADE CANDIDATE' && !!entryDecision.selectedContract;
  const usesAtm = demoTrades && entryDecision.selectedContract!.includes(String(entryRec.atmStrike));
  const demoContract = demoTrades ? entryDecision.selectedContract! : null;
  // ask price + ₹0.35 delay while a human places the order
  const entryFill = entryDecision.executableAskPriceWithLatency ?? (usesAtm ? entryRec.atmCallAsk : entryRec.affordableOtmCallAsk) + 0.35;
  const inTrade = demoTrades && stepIndex >= ENTRY_STEP;
  const exitBid = usesAtm ? currentRecord.payload.atmCallBid : currentRecord.payload.affordableOtmCallBid;
  const grossDemoPnl = inTrade ? (exitBid - entryFill) * demoLot : 0;
  const demoCharges = inTrade ? 40 + 7.2 + 0.001 * (exitBid * demoLot) + 2.8 : 0;
  const netDemoPnl = grossDemoPnl - demoCharges;
  const decision = DECISION_TEXT[replayDecision.decisionState] ?? DECISION_TEXT['NO TRADE'];
  const laterNews = arrivedLaterRecords.map((r) => r.payload.newsHeadlineAtBar).filter(Boolean) as string[];

  // ---------------- 3) What-if ----------------
  const [whatIf, setWhatIf] = useState<(typeof WHAT_IF)[number]['id']>('AFFORDABLE_OTM_CE');
  const [tries, setTries] = useState<number>(1);

  // ---------------- 4) Skill or luck ----------------
  const stat = computeStatisticalValidationSuite({
    tradeNetPnlsRupees: SAMPLE_TRADE_PNLS,
    capitalRupees,
    totalTrialsTested: 13 + tries,
    inSampleSharpe: 1.92,
    outOfSampleSharpe: 1.54,
    survives2xCostStress: true,
    paperTradesCompleted: 18,
    manualLiveTradesCompleted: 12,
  });
  const checks = [
    {
      ok: stat.outOfSampleSharpe > 0 && stat.outOfSampleSharpe >= 0.5 * stat.inSampleSharpe,
      title: 'Still works on data it has never seen',
      value: `score ${stat.inSampleSharpe.toFixed(2)} → ${stat.outOfSampleSharpe.toFixed(2)}`,
      explain: 'The idea is tuned on older data, then tested on newer data it never saw. If the score collapses, it was only fitted to the past.',
      tech: 'In-sample vs out-of-sample Sharpe ratio',
    },
    {
      ok: stat.deflatedSharpeRatioProbability >= 0.95,
      title: 'Still looks real after counting every idea tried',
      value: `${(stat.deflatedSharpeRatioProbability * 100).toFixed(1)}% confident`,
      explain: `Try enough random ideas and a few will look great by pure luck. This check gets stricter the more ideas you try — your what-if clicks count too (${13 + tries} tries so far).`,
      tech: 'Deflated Sharpe Ratio (DSR)',
    },
    {
      ok: stat.pboOverfittingProbability < 0.2,
      title: 'Low chance of "overfitting"',
      value: `${(stat.pboOverfittingProbability * 100).toFixed(1)}% chance (needs < 20%)`,
      explain: 'Overfitting means the rules were bent to match old prices so closely that they will not work in future.',
      tech: 'Probability of Backtest Overfitting (CSCV)',
    },
    {
      ok: stat.whitesRealityCheckPValue < 0.05,
      title: 'Better than random trading',
      value: `${(stat.whitesRealityCheckPValue * 100).toFixed(1)}% chance it is luck (needs < 5%)`,
      explain: 'Compares the results with thousands of random strategies. A real edge should clearly beat them.',
      tech: "White's Reality Check p-value",
    },
    {
      ok: stat.expectancyPerTradeRupees > 0 && stat.expectancyBootstrap95Ci[0] > 0,
      title: 'Makes money per trade after all costs',
      value: `${inr(stat.expectancyPerTradeRupees)} per trade (likely range ${inr(stat.expectancyBootstrap95Ci[0])} to ${inr(stat.expectancyBootstrap95Ci[1])})`,
      explain: 'Average profit per trade after brokerage, taxes and slippage. Even the pessimistic end of the range should be above zero.',
      tech: 'After-cost expectancy, bootstrap 95% confidence interval',
    },
    {
      ok: stat.survives2xCostAndSlippageStress,
      title: 'Survives if costs double',
      value: stat.survives2xCostAndSlippageStress ? 'yes' : 'no',
      explain: 'Real trading is often more expensive than planned. A fragile idea stops working when costs rise a little.',
      tech: '2× cost and slippage stress test',
    },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const stageIdx = Math.max(0, STAGES.findIndex((s) => s.id === stat.currentGraduationStage));

  return (
    <div className="space-y-6 animate-in">
      {/* =================== INTRO =================== */}
      <div className="rounded-2xl p-5 border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-emerald-500/10">
        <h2 className="text-xl font-extrabold text-white">Practice &amp; Backtest — learn without risking money</h2>
        <p className="text-sm text-slate-300 mt-1 max-w-3xl">
          A <strong>backtest</strong> asks: &ldquo;what would have happened if I had followed this rule in the past?&rdquo; A <strong>replay</strong> lets you
          move through a trading day step by step, seeing only what was known at each moment. Pick where to start:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {[
            { k: 'bt' as const, n: 1, icon: <LineChart className="w-5 h-5 text-indigo-400" />, t: 'Test an idea on real prices', d: `Real NSE closing prices of ${chain?.symbol ?? 'the selected stock'} — about one year.` },
            { k: 'replay' as const, n: 2, icon: <Clock className="w-5 h-5 text-amber-400" />, t: 'Replay a trading day', d: 'Step through a sample day and see what you would have known.' },
            { k: 'luck' as const, n: 3, icon: <FlaskConical className="w-5 h-5 text-emerald-400" />, t: 'Skill or luck?', d: '6 plain checks that separate a real edge from a lucky streak.' },
          ].map((c) => (
            <button key={c.k} onClick={() => go(c.k)} className="text-left p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/60 transition focus-ring">
              <div className="flex items-center gap-2 font-bold text-white">
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-xs flex items-center justify-center">{c.n}</span>
                {c.icon} {c.t}
              </div>
              <div className="text-xs text-slate-400 mt-1">{c.d}</div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> Education only. Past or simulated results do not predict future results. Nothing here is a recommendation.
        </p>
      </div>

      {/* =================== 1. REAL-DATA BACKTEST =================== */}
      <div ref={refs.bt} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 scroll-mt-28">
        <SectionHeader
          n={1}
          icon={<LineChart className="w-5 h-5 text-indigo-400" />}
          title={`Test a simple idea on ${chain?.symbol ?? 'the selected stock'}'s real past prices`}
          subtitle="Choose an idea. The lab replays it on real NSE end-of-day prices, with costs, and compares it with simply buying and holding."
          badge={
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
              REAL NSE PRICES · end of day
            </span>
          }
        />

        {!res ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-400">
            {chain ? 'Not enough price history for this symbol yet (needs at least 30 trading days).' : 'Loading price history… pick a stock or index at the top of the page.'}
          </div>
        ) : (
          <>
            <div className="text-xs font-semibold text-slate-300 mb-2">Step 1 — choose an idea:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4" role="radiogroup" aria-label="Choose an idea to test">
              {IDEAS.map((i) => (
                <button
                  key={i.id}
                  role="radio"
                  aria-checked={idea === i.id}
                  onClick={() => setIdea(i.id)}
                  className={`text-left p-3 rounded-xl border transition focus-ring ${
                    idea === i.id ? 'border-indigo-500 bg-indigo-500/15' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-bold text-white">{i.name}</div>
                  <div className="text-[11px] text-slate-400">{i.short}</div>
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 mb-4 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">The rule:</strong> {ideaInfo.rule}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-300 mb-2">Step 2 — see what would have happened:</div>
            <div className={`p-4 rounded-xl border mb-4 ${beatHold || idea === 'BUY_HOLD' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
              <p className="text-sm text-slate-200 leading-relaxed">
                If you had followed <strong className="text-white">&ldquo;{ideaInfo.name}&rdquo;</strong> on <strong className="text-white">{chain?.symbol}</strong> from{' '}
                {fmtDate(res.startDate)} to {fmtDate(res.endDate)} with <strong>{inr(capitalRupees)}</strong>, you would now have{' '}
                <strong className={res.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {inr(res.finalValue)} ({res.totalReturnPct >= 0 ? '+' : ''}
                  {res.totalReturnPct.toFixed(1)}%)
                </strong>
                .
                {idea !== 'BUY_HOLD' && hold && (
                  <>
                    {' '}
                    Simply buying and holding would have given{' '}
                    <strong className={hold.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {inr(hold.finalValue)} ({hold.totalReturnPct >= 0 ? '+' : ''}
                      {hold.totalReturnPct.toFixed(1)}%)
                    </strong>
                    .{' '}
                    {beatHold ? (
                      <span className="text-emerald-300 font-semibold">This idea did better than holding — over this one period.</span>
                    ) : (
                      <span className="text-amber-300 font-semibold">This idea did worse than just holding.</span>
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <Stat
                label="Final value"
                value={inr(res.finalValue)}
                tone={res.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                hint={`Started with ${inr(capitalRupees)}`}
              />
              <Stat
                label="Trades: won / lost"
                value={`${res.wins} / ${res.losses}`}
                hint={res.trades.length ? `${res.trades.length} trade${res.trades.length > 1 ? 's' : ''} · in the market ${res.daysInvestedPct.toFixed(0)}% of days` : 'No trade was triggered'}
              />
              <Stat
                label="Worst drop along the way"
                value={`${res.maxDrawdownPct.toFixed(1)}%`}
                tone="text-rose-300"
                hint="The biggest fall from a high point. Could you sit through it calmly?"
              />
              <Stat label="Costs paid" value={inr(res.costsPaid)} tone="text-amber-300" hint={`₹${COST_FLAT_RUPEES} + ${(COST_PCT * 100).toFixed(2)}% per buy and per sell (estimate)`} />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 mb-3">
              <div className="text-xs font-semibold text-slate-300 mb-1">How your money would have moved</div>
              <EquityChart a={res} b={idea !== 'BUY_HOLD' ? hold : null} aLabel={ideaInfo.name} bLabel="Buy and hold" />
            </div>

            {(fractional || res.cannotAfford) && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 mb-3 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                {isIndex
                  ? 'An index cannot be bought directly, so this test pretends you could buy a fraction of the index level. It shows the price idea only.'
                  : `With ${inr(capitalRupees)} you cannot buy even one share at about ₹${Math.round(firstPrice).toLocaleString('en-IN')}. The test pretends fractional shares were possible.`}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setShowTrades((v) => !v)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-800">
                {showTrades ? 'Hide' : 'Show'} every trade ({res.trades.length})
              </button>
            </div>
            {showTrades && res.trades.length > 0 && (
              <div className="overflow-x-auto mb-4 max-h-72 overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Bought</th>
                      <th className="text-right p-2">at</th>
                      <th className="text-left p-2">Sold</th>
                      <th className="text-right p-2">at</th>
                      <th className="text-right p-2">Result after costs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 font-mono">
                    {res.trades.map((t, i) => (
                      <tr key={i}>
                        <td className="p-2 font-sans">{fmtDate(t.entryDate)}</td>
                        <td className="p-2 text-right">₹{t.entryPrice.toFixed(2)}</td>
                        <td className="p-2 font-sans">{t.open ? <span className="text-sky-300">still holding</span> : fmtDate(t.exitDate)}</td>
                        <td className="p-2 text-right">₹{(t.exitPrice ?? 0).toFixed(2)}</td>
                        <td className={`p-2 text-right font-bold ${t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {signed(t.netPnl)} ({t.returnPct >= 0 ? '+' : ''}
                          {t.returnPct.toFixed(1)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <details className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-slate-200">Compare all 4 ideas on {chain?.symbol} (and why that can fool you)</summary>
              <table className="w-full mt-2">
                <tbody className="divide-y divide-slate-800/70">
                  {ranking.map(({ info, r }, i) => (
                    <tr key={info.id}>
                      <td className="py-1.5 text-slate-400 w-6">{i + 1}.</td>
                      <td className="py-1.5 text-slate-200">{info.name}</td>
                      <td className={`py-1.5 text-right font-mono ${r.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.totalReturnPct >= 0 ? '+' : ''}
                        {r.totalReturnPct.toFixed(1)}%
                      </td>
                      <td className="py-1.5 text-right font-mono text-rose-300">worst drop {r.maxDrawdownPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-amber-200/90 mt-2">
                ⚠️ Picking the winner <em>after</em> seeing the results is the most common way people fool themselves. The best idea for one stock in one year
                is usually not the best next year. See section 3, &ldquo;Skill or luck?&rdquo;.
              </p>
            </details>

            <p className="text-[11px] text-slate-500 mt-3">
              How it is calculated: decisions use only the closing prices known on that day; the trade happens at the next day&rsquo;s opening price (no peeking
              into the future). Costs are estimates — check your broker&rsquo;s actual charges. This tests the share or index price, not options. Dividends are not
              included.
            </p>
          </>
        )}
      </div>

      {/* =================== 2. REPLAY A DAY =================== */}
      <div ref={refs.replay} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 scroll-mt-28">
        <SectionHeader
          n={2}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          title="Replay a trading day, step by step"
          subtitle="Practice day: NIFTY on 15-Jul-2025 (illustrative sample data). Move through the day. At each moment you see only what was known then — just like real life."
          badge={<SampleBadge text="REPLAY — NOT LIVE · sample data" />}
        />

        {/* controls */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => {
              setIsPlaying(false);
              setStepIndex((p) => Math.max(0, p - 1));
            }}
            disabled={stepIndex === 0}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold flex items-center gap-1 border border-slate-700 disabled:opacity-40"
            aria-label="Previous moment"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={() => {
              if (!isPlaying && stepIndex >= RECORDS.length - 1) setStepIndex(0);
              setIsPlaying((p) => !p);
            }}
            className="px-4 py-2 rounded-xl btn-primary text-sm font-bold flex items-center gap-1.5">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : stepIndex >= RECORDS.length - 1 ? 'Replay day' : 'Play the day'}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setStepIndex((p) => Math.min(RECORDS.length - 1, p + 1));
            }}
            disabled={stepIndex >= RECORDS.length - 1}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold flex items-center gap-1 border border-slate-700 disabled:opacity-40"
            aria-label="Next moment"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setStepIndex(0);
            }}
            className="px-3 py-2 rounded-xl text-slate-300 text-xs flex items-center gap-1 hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start of day
          </button>
        </div>

        {/* timeline */}
        <div className="grid grid-cols-7 gap-1 mb-4" role="tablist" aria-label="Moments of the day">
          {STEP_LABELS.map((s, idx) => (
            <button
              key={s.time}
              role="tab"
              aria-selected={idx === stepIndex}
              onClick={() => {
                setIsPlaying(false);
                setStepIndex(idx);
              }}
              className={`p-1.5 rounded-lg text-center transition border ${
                idx === stepIndex
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : idx < stepIndex
                  ? 'bg-indigo-500/15 text-indigo-200 border-indigo-500/30'
                  : 'bg-slate-950/70 text-slate-500 border-slate-800'
              }`}
            >
              <div className="text-xs font-mono">{s.time}</div>
              <div className="text-[10px] leading-tight hidden sm:block">{s.what}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          {/* what you know */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-xs font-bold text-sky-300 mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> What you know at {STEP_LABELS[stepIndex].time}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-[11px] text-slate-500">NIFTY level</div>
                <div className="font-mono font-bold text-white">{currentRecord.payload.spot.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Option price (24650 CE)</div>
                <div className="font-mono font-bold text-white">₹{currentRecord.payload.affordableOtmCallAsk.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Fear gauge (India VIX)</div>
                <div className="font-mono font-bold text-white">{currentRecord.payload.indiaVix.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Updates seen so far</div>
                <div className="font-mono font-bold text-white">
                  {replayDecision.barUsedCount} of {RECORDS.length}
                </div>
              </div>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1">News known so far:</div>
            <ul className="space-y-1 text-[12px] text-slate-300 list-disc pl-4">
              {replayDecision.newsAvailableAtEntry.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>

          {/* what the lab says */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" /> What the lab says
            </div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${decision.tone}`}>{decision.label}</span>
            <p className="text-xs text-slate-400 mt-2">{decision.explain}</p>
            <div className="mt-3 text-xs text-slate-300 space-y-1">
              {replayDecision.selectedContract && (
                <div>
                  <span className="text-slate-500">Option looked at:</span> {replayDecision.selectedContract}
                </div>
              )}
              <div>
                <span className="text-slate-500">Money needed:</span> {inr(replayDecision.capitalRequiredRupees)}{' '}
                {replayDecision.capitalRequiredRupees > 0 &&
                  (replayDecision.executableWithCapital ? (
                    <span className="text-emerald-400">— fits your {inr(capitalRupees)}</span>
                  ) : (
                    <span className="text-rose-400">— more than your {inr(capitalRupees)}</span>
                  ))}
              </div>
              {replayDecision.rejectionReason && (
                <div>
                  <span className="text-slate-500">Why not:</span> {replayDecision.rejectionReason.toLowerCase()}
                </div>
              )}
            </div>
          </div>

          {/* demo money */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" /> Your pretend money
            </div>
            {!demoTrades ? (
              <p className="text-sm text-slate-300">
                With <strong>{inr(capitalRupees)}</strong> the lab does <strong>not</strong> trade on this practice day
                {entryDecision.rejectionReason ? ` (${entryDecision.rejectionReason.split(':')[0].toLowerCase()})` : ''}. Your money stays{' '}
                <strong>{inr(capitalRupees)}</strong> — and that is fine. Try a different capital at the top of the page to compare.
              </p>
            ) : !inTrade ? (
              <p className="text-sm text-slate-300">
                No trade yet. With your {inr(capitalRupees)} the lab buys <strong>1 lot (75) of {demoContract}</strong> at <strong>11:15</strong>. Press{' '}
                <em>Next</em> to get there.
              </p>
            ) : (
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bought {demoContract} at 11:15</span>
                  <span className="font-mono">₹{entryFill.toFixed(2)} × 75</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Could sell now at</span>
                  <span className="font-mono">₹{exitBid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profit before costs</span>
                  <span className={`font-mono ${grossDemoPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{signed(grossDemoPnl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Charges &amp; taxes</span>
                  <span className="font-mono text-rose-300">−{inr(demoCharges)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold">
                  <span>Result if you sold now</span>
                  <span className={`font-mono ${netDemoPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{signed(netDemoPnl)}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Account: {inr(capitalRupees)} → {inr(capitalRupees + netDemoPnl)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* no peeking */}
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs text-emerald-200 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Fair test — no peeking.</strong> {arrivedLaterRecords.length} later update{arrivedLaterRecords.length === 1 ? ' is' : 's are'} hidden from the lab.
              {sentinelProof.sentinelPassed && ' Proven: filling the future with garbage numbers does not change the decision.'}
            </span>
          </span>
          <button
            onClick={() => setPeek((p) => !p)}
            className="px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/10"
          >
            {peek ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {peek ? 'Hide' : 'Peek at'} what happened later (for learning)
          </button>
        </div>
        {peek && (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-rose-500/30 text-xs mb-3">
            <div className="font-semibold text-rose-300 mb-1">Hidden from the lab at {STEP_LABELS[stepIndex].time}:</div>
            <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
              {laterNews.length ? laterNews.map((n, i) => <li key={i}>{n}</li>) : <li>Nothing more — this is the end of the day.</li>}
            </ul>
            <div className="mt-2 text-slate-400">
              <strong className="text-slate-300">Weather:</strong> forecast then — {currentRecord.payload.weatherForecastAtBar} · what really happened —{' '}
              {currentRecord.payload.weatherActualLater}
            </div>
          </div>
        )}

        <details className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-slate-300">Technical details (time-stamps, test proof, rejected trades)</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 font-mono text-[11px]">
            <div className="space-y-0.5 text-slate-400">
              <div>Event time: <span className="text-slate-200">{currentRecord.eventTime}</span></div>
              <div>Published: <span className="text-slate-200">{currentRecord.publicationTime}</span></div>
              <div>Received: <span className="text-slate-200">{currentRecord.ingestionTime}</span></div>
              <div>Usable from: <span className="text-emerald-300">{currentRecord.effectiveTime}</span></div>
              <div>Source: <span className="text-slate-200">{currentRecord.source}</span></div>
            </div>
            <div className="space-y-0.5 text-slate-400">
              <div>Replay quality: <span className="text-slate-200">{replayGrade.label}</span></div>
              <div>No-hindsight test: <span className="text-emerald-300">{sentinelProof.statusBanner}</span></div>
              <div>Market mood (regime): <span className="text-slate-200">{replayDecision.regimeClassification}</span></div>
            </div>
          </div>
          <div className="mt-2 font-sans text-slate-400">
            <strong className="text-slate-300">Trades rejected at 11:15 with ₹10,000 sample capital:</strong> NIFTY 24550 CE needs ₹12,225 (too much) · the
            24550/24700 call spread needs about ₹34,500 margin (too much) · 1 lot of 24650 CE at ₹99 needs ₹7,425 (fits).
          </div>
        </details>

        {/* what-if */}
        <div className="mt-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-amber-400" /> What if you had done something else that day?
          </h3>
          <p className="text-xs text-slate-400 mb-3">Same sample day, four different choices. Tap one to highlight it.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WHAT_IF.map((w) => {
              const fits = w.need <= capitalRupees;
              const sel = whatIf === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    setWhatIf(w.id);
                    setTries((t) => t + 1);
                  }}
                  className={`text-left p-3 rounded-xl border transition ${sel ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}
                >
                  <div className="text-sm font-bold text-white">{w.name}</div>
                  <div className="text-[11px] text-slate-500 mb-2">{w.detail}</div>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Money needed</span>
                      <span className="font-mono">{inr(w.need)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Possible with {inr(capitalRupees)}?</span>
                      <span className={fits ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>{fits ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Result after costs</span>
                      <span className={`font-mono font-bold ${w.net > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>{signed(w.net)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Worst moment</span>
                      <span className="font-mono text-rose-300">{w.worst === 0 ? '₹0' : signed(w.worst)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {tries > 7 && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              You have compared {tries} choices. Looking back and picking the best one is easy — it does not mean you would have picked it on the day.
            </div>
          )}
        </div>
      </div>

      {/* =================== 3. SKILL OR LUCK =================== */}
      <div ref={refs.luck} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 scroll-mt-28">
        <SectionHeader
          n={3}
          icon={<FlaskConical className="w-5 h-5 text-emerald-400" />}
          title="Skill or luck? 6 checks every strategy must pass"
          subtitle="Many strategies look brilliant on past data and then fail. These checks catch that. Shown here for a sample list of 34 trades."
          badge={<SampleBadge />}
        />
        <div className="flex items-center gap-3 mb-4">
          <div className={`text-3xl font-extrabold ${passed === checks.length ? 'text-emerald-400' : passed >= 4 ? 'text-amber-300' : 'text-rose-400'}`}>
            {passed}/{checks.length}
          </div>
          <div className="text-sm text-slate-300">
            checks passed.{' '}
            {passed === checks.length
              ? 'Good sign — but it still has to prove itself with pretend money first.'
              : 'At least one check failed — treat this strategy as unproven.'}
          </div>
        </div>
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.title} className={`p-3 rounded-xl border flex items-start gap-3 ${c.ok ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
              {c.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-bold text-white">{c.title}</span>
                  <span className={`text-xs font-mono ${c.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{c.value}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{c.explain}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">Technical name: {c.tech}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="text-sm font-bold text-white mb-1">The safe path from idea to real money — never skip a step</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STAGES.map((s, i) => (
              <React.Fragment key={s.id}>
                <span
                  className={`px-2.5 py-1.5 rounded-lg text-xs border ${
                    i === stageIdx
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                      : i < stageIdx
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}
                >
                  {i < stageIdx ? '✓ ' : ''}
                  {s.label}
                </span>
                {i < STAGES.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
              </React.Fragment>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">The sample strategy is at &ldquo;{STAGES[stageIdx].label}&rdquo;.</p>
        </div>

        <details className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-3 text-xs">
          <summary className="cursor-pointer font-semibold text-slate-300">More numbers for experts</summary>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 font-mono text-[11px]">
            <div>Profit factor: <span className="text-white">{stat.profitFactor.toFixed(2)}</span></div>
            <div>Sortino: <span className="text-white">{stat.sortinoRatio.toFixed(2)}</span></div>
            <div>Win rate: <span className="text-white">{stat.winRatePct.toFixed(0)}%</span></div>
            <div>
              Purged CV: <span className="text-white">{stat.purgedCvSplitsCount}-fold / {stat.embargoBarsCount} bars embargo</span>
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="font-semibold text-slate-300">Compared with 6 &ldquo;random&rdquo; strategies:</div>
            {stat.nullModelComparisons.map((nm) => (
              <div key={nm.nullModelName} className="flex justify-between border-b border-slate-800/60 py-0.5">
                <span className="text-slate-400">{nm.nullModelName}</span>
                <span className={nm.strategyBeatsNullSignificantly ? 'text-emerald-400' : 'text-rose-300'}>
                  {nm.strategyBeatsNullSignificantly ? 'beats it' : 'does not beat it'} (p = {nm.pValueVsNull.toFixed(3)})
                </span>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* =================== ADVANCED: ML =================== */}
      <details className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <summary className="cursor-pointer text-base font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" /> Advanced: machine-learning experiments (for researchers)
        </summary>
        <p className="text-xs text-slate-400 mt-2 mb-3">
          Computer models that try to predict market moves. They are kept completely separate: they can <strong>never</strong> create a trade by themselves and
          must pass the same 6 checks above. Sample results.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ML_RESEARCH_LAB_MODELS.map((ml) => (
            <div key={ml.modelId} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs">
              <div className="font-bold text-white mb-1">{ml.modelName}</div>
              <div className="text-[11px] text-slate-400">Trained on: {ml.trainingWindow}</div>
              <div className="text-[11px] text-slate-400">Tested on: {ml.holdoutWindow}</div>
              <div className="text-[11px] text-slate-300 mt-1">
                Accuracy score (AUC, 0.5 = coin flip): <strong>{ml.oosRocAuc.toFixed(3)}</strong>
              </div>
              <div className="text-[10px] text-slate-600 mt-1 font-mono">
                Brier {ml.oosBrierScore.toFixed(3)} · LogLoss {ml.oosLogLoss.toFixed(3)} · {ml.splitMethodology}
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* =================== GLOSSARY =================== */}
      <details className="bg-slate-900 border border-slate-800 rounded-2xl p-5" open>
        <summary className="cursor-pointer text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-400" /> Words used on this page
        </summary>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs">
          {[
            ['Backtest', 'Testing a rule on past prices to see how it would have done.'],
            ['Replay', 'Re-living a past day step by step, seeing only what was known at each moment.'],
            ['Buy and hold', 'Buy once and keep it. The simplest yardstick — many clever ideas fail to beat it.'],
            ['Moving average', 'The average closing price of the last N days. Smooths out daily noise.'],
            ['Worst drop (drawdown)', 'How far your money fell from its highest point before recovering.'],
            ['Costs', 'Brokerage, STT, exchange fees, GST and stamp duty. They add up with every trade.'],
            ['Overfitting', 'Bending rules to fit old data so closely that they fail on new data.'],
            ['Paper trading', 'Practising with pretend money in real time before risking real money.'],
            ['Call option (CE)', 'A contract that gains when the price rises. It can lose its entire value by expiry.'],
            ['Lot', 'The fixed number of units in one option contract (e.g. 75 NIFTY units in July 2025).'],
          ].map(([t, d]) => (
            <div key={t} className="flex gap-2">
              <dt className="font-semibold text-slate-200 min-w-[9rem] flex items-center gap-1">
                {t === 'Buy and hold' ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : t.startsWith('Worst') ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> : null}
                {t}
              </dt>
              <dd className="text-slate-400">{d}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
};
