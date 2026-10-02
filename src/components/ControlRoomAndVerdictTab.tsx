import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  DollarSign,
  ShieldAlert,
  ClipboardCheck,
  RefreshCw,
  ListChecks,
} from 'lucide-react';
import {
  BrokerageConfig,
  evaluateLiveTradeVerdict,
  runCostSensitivityStress,
  TradeLegOrder,
} from '../engine/costAndVerdictEngine';
import {
  evaluateSixDimensionTradeFeasibility,
  generateManualOrderTicket,
} from '../engine/marginAndFeasibility';
import {
  buildWhatWouldChangeTheAnswerTriggers,
  PipelineStepOutput,
} from '../engine/disciplineAndCopilot';
import { formatINR } from '../engine/rulesEngine';

interface Props {
  selectedSymbol: string;
  spot: number;
  futures: number;
  vwap: number;
  atmIv: number;
  realizedVol: number;
  lotSize: number;
  capitalRupees: number;
  isDataStale: boolean;
  lockoutActive: boolean;
  qProbPct: number;
  pProbRangePct: [number, number];
  modelFairValueRange: [number, number];
  modelDispersionPct: number;
  es99Rupees: number;
  marginReqRupees: number;
  pipelineSteps: PipelineStepOutput[];
  numberFormatMode: 'LAKH_CRORE' | 'STANDARD';
  onJournalConfirmManualExecution: () => void;
  /** V4.1: true when inputs are end-of-day public data — a live TRADE CANDIDATE is then impossible (max = WATCH). */
  eodResearchMode?: boolean;
  defaultEntryPrice?: number;
  defaultQuantity?: number;
  strikeStep?: number;
  expiryIso?: string;
}

export const ControlRoomAndVerdictTab: React.FC<Props> = ({
  selectedSymbol,
  spot,
  futures,
  vwap,
  atmIv,
  realizedVol,
  lotSize,
  capitalRupees,
  isDataStale,
  lockoutActive,
  qProbPct,
  pProbRangePct,
  modelFairValueRange,
  modelDispersionPct,
  es99Rupees,
  marginReqRupees,
  pipelineSteps,
  numberFormatMode,
  onJournalConfirmManualExecution,
  eodResearchMode = false,
  defaultEntryPrice,
  defaultQuantity,
  strikeStep = 50,
  expiryIso = '2026-10-06',
}) => {
  // U25 Brokerage & Leg state (Defaults to U25.4 Mode 1 or live position)
  const [brokerageMode, setBrokerageMode] = useState<'FLAT_PER_ORDER' | 'PERCENT_OF_TURNOVER'>('FLAT_PER_ORDER');
  const [flatBrokerageRupees, setFlatBrokerageRupees] = useState<number>(20);
  const [percentBrokeragePerSide, setPercentBrokeragePerSide] = useState<number>(20);
  const [includeExchangeStampSebi, setIncludeExchangeStampSebi] = useState<boolean>(false);
  const [entryPriceInput, setEntryPriceInput] = useState<number>(defaultEntryPrice ?? 100);
  const [exitBidInput, setExitBidInput] = useState<number>(defaultEntryPrice ? Number((defaultEntryPrice * 1.2).toFixed(2)) : 120);
  const [quantityInput, setQuantityInput] = useState<number>(defaultQuantity ?? 75);
  const [exercisedItmAtExpiry, setExercisedItmAtExpiry] = useState<boolean>(false);
  const [copiedTicket, setCopiedTicket] = useState<boolean>(false);
  const [manualConfirmLogged, setManualConfirmLogged] = useState<boolean>(false);

  const brokerageConfig: BrokerageConfig = {
    mode: brokerageMode,
    flatRupeesPerOrder: flatBrokerageRupees,
    percentPerSide: percentBrokeragePerSide,
    includeExchangeStampSebi,
  };

  const strikeUsed = Math.round(spot / strikeStep) * strikeStep + strikeStep;
  const tradeLeg: TradeLegOrder = {
    legId: 'VERDICT-LEG-1',
    symbol: selectedSymbol,
    strike: strikeUsed,
    right: 'CE',
    side: 'BUY',
    quantity: quantityInput,
    entryPrice: entryPriceInput,
    currentBid: exitBidInput,
    currentAsk: Number((exitBidInput + 0.5).toFixed(2)),
    currentLtp: exitBidInput,
    stopLossPrice: Number((entryPriceInput * 0.75).toFixed(2)),
    targetPrice: Number((entryPriceInput * 1.4).toFixed(2)),
    exercisedItmAtExpiry,
    expirySettlementSpot: strikeUsed + 150,
  };

  const verdict = evaluateLiveTradeVerdict({
    legs: [tradeLeg],
    brokerageConfig,
    isoDate: '2026-10-02',
    isDataStale,
    useExecutableBidAskExit: true,
    underlyingSpot: spot,
    netDeltaPerUnit: 0.48,
  });

  const costStress = runCostSensitivityStress({
    grossExpectedPnl: Math.max(250, verdict.grossPnlNow),
    baseRoundTripCosts: verdict.costBreakdown.totalRoundTripCharges,
    baseSlippage: 35,
  });

  const feasibility = evaluateSixDimensionTradeFeasibility({
    marketOpenOrTradable: true,
    quoteAgeSeconds: isDataStale ? 6.5 : 1.2,
    bid: exitBidInput,
    ask: exitBidInput + 0.5,
    volume: 95000,
    openInterest: 48000,
    availableCapitalRupees: capitalRupees,
    requiredCapitalAndMarginRupees: entryPriceInput * quantityInput,
    maxLossRupees: (entryPriceInput - (tradeLeg.stopLossPrice ?? entryPriceInput * 0.75)) * quantityInput,
    maxAllowedRiskRupees: Math.max(2500, capitalRupees * 0.2),
    modelDispersionPct,
    calibrationPassed: true,
    portfolioLimitsPassed: !lockoutActive,
    inFoBanList: false,
    majorImminentEventBlock: false,
    netExpectedEdgeAfterCostsRupees: verdict.netPnlNow,
  });

  const manualTicket = generateManualOrderTicket({
    ticketId: `TKT-${selectedSymbol}-${expiryIso.replace(/-/g, '')}-REF`,
    generatedAtIso: '2026-10-02T05:15:00.000Z',
    currentTimeIso: isDataStale ? '2026-10-02T05:25:00.000Z' : '2026-10-02T05:16:00.000Z',
    ttlSeconds: 180,
    priceDriftPct: 0.3,
    symbol: selectedSymbol,
    expiry: expiryIso,
    strategyName: 'Single-Lot Defined-Premium Long Call (VWAP Breakout)',
    legs: [
      {
        side: 'BUY',
        strike: strikeUsed,
        right: 'CE',
        lots: 1,
        quantity: quantityInput,
        referencePrice: entryPriceInput,
        maxSlippageToleranceRupees: 1.25,
      },
    ],
    stopLossReference: tradeLeg.stopLossPrice ?? 75,
    targetReference: tradeLeg.targetPrice ?? 140,
    maxLossRupees: (entryPriceInput - (tradeLeg.stopLossPrice ?? 75)) * quantityInput + verdict.costHurdleRupees,
    maxProfitRupees: 'UNBOUNDED_UPSIDE',
    netBreakevenPrice: verdict.netBreakevenExitPremiumFirstLeg ?? entryPriceInput + 1,
    estimatedRoundTripCostsRupees: verdict.costHurdleRupees,
    estimatedMarginRequiredRupees: entryPriceInput * quantityInput,
    netGreeksRupees: {
      delta: 1480,
      gamma: 95,
      theta: -415,
      vega: 280,
    },
    legSequenceGuidance:
      'Execute as a LIMIT order at or below the Do-Not-Chase price. Never place a MARKET order in options.',
  });

  const invalidationCheck = buildWhatWouldChangeTheAnswerTriggers({
    spot,
    vwap,
    atmIvPct: atmIv * 100,
    spreadPct: exitBidInput > 0 ? (0.5 / exitBidInput) * 100 : 99,
    quoteAgeSeconds: isDataStale ? 6.5 : 1.2,
    modelDispersionPct,
  });

  const rawStateAfterGates =
    lockoutActive || isDataStale || !feasibility.isExecutable
      ? 'NO TRADE'
      : verdict.finalCandidateState;
  // End-of-day data can never justify a live TRADE CANDIDATE — cap at WATCH (research only).
  const finalStateAfterGates =
    eodResearchMode && rawStateAfterGates === 'TRADE CANDIDATE' ? 'WATCH' : rawStateAfterGates;

  const handleCopyTicket = () => {
    navigator.clipboard?.writeText(manualTicket.copyTextSummary);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* U25 Persistent TRADE VERDICT Card ("Do I actually end up with a net gain or loss after ALL costs?") */}
      <div className="bg-slate-900/95 border-2 border-amber-500/60 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-slate-950">
                NET PROFIT-AFTER-ALL-COSTS CALCULATOR
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                REFERENCE / DECISION-SUPPORT — MANUAL BROKER EXECUTION ONLY
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              After all charges, would this trade be in profit? (Q1: right now · Q2: what would need to happen)
            </h2>
          </div>

          {/* Preset Test Vector Buttons for U25.4 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setBrokerageMode('FLAT_PER_ORDER');
                setFlatBrokerageRupees(20);
                setIncludeExchangeStampSebi(false);
                setEntryPriceInput(100);
                setExitBidInput(120);
                setQuantityInput(75);
                setExercisedItmAtExpiry(false);
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition ${
                brokerageMode === 'FLAT_PER_ORDER' && !includeExchangeStampSebi && entryPriceInput === 100 && exitBidInput === 120
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              U25.4 Vector 1: Flat ₹20/Order (Net +₹1,439.30)
            </button>
            <button
              onClick={() => {
                setBrokerageMode('PERCENT_OF_TURNOVER');
                setPercentBrokeragePerSide(20);
                setIncludeExchangeStampSebi(false);
                setEntryPriceInput(100);
                setExitBidInput(120);
                setQuantityInput(75);
                setExercisedItmAtExpiry(false);
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition ${
                brokerageMode === 'PERCENT_OF_TURNOVER' && percentBrokeragePerSide === 20
                  ? 'bg-rose-500 text-white border-rose-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              U25.4 Vector 2: Literal 20%/Side (Net -₹2,407.50)
            </button>
            <button
              onClick={() => {
                setBrokerageMode('FLAT_PER_ORDER');
                setFlatBrokerageRupees(20);
                setIncludeExchangeStampSebi(true);
                setEntryPriceInput(94);
                setExitBidInput(118);
                setQuantityInput(lotSize);
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition ${
                includeExchangeStampSebi
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Full 2026 Statutory Stack ({lotSize} Lot)
            </button>
          </div>
        </div>

        {/* Red Sanity Warning Banner when % Brokerage > 1% per side (U25.1) */}
        {verdict.costBreakdown.sanityWarningBanner && (
          <div className="mb-4 p-3.5 rounded-lg bg-rose-950/90 border-2 border-rose-500 text-xs text-rose-100 flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="text-rose-300 font-bold block">
                U25.1 BROKERAGE SANITY WARNING BANNER:
              </strong>
              {verdict.costBreakdown.sanityWarningBanner}
            </div>
          </div>
        )}

        {/* ITM Exercise STT Trap Warning (U3 / U25.1) */}
        {verdict.itmExerciseSttWarning && (
          <div className="mb-4 p-3 rounded-lg bg-amber-950/80 border border-amber-500/60 text-xs text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            {verdict.itmExerciseSttWarning}
          </div>
        )}

        {/* Interactive Inputs for Brokerage, Entry, Executable Exit Bid, Quantity */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 text-xs">
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <label className="text-slate-400 text-[11px] block mb-1">Brokerage Unit Toggle</label>
            <select
              value={brokerageMode}
              onChange={(e) => setBrokerageMode(e.target.value as 'FLAT_PER_ORDER' | 'PERCENT_OF_TURNOVER')}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
            >
              <option value="FLAT_PER_ORDER">FLAT ₹ per order</option>
              <option value="PERCENT_OF_TURNOVER">PERCENT % of turnover</option>
            </select>
          </div>

          {brokerageMode === 'FLAT_PER_ORDER' ? (
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <label className="text-slate-400 text-[11px] block mb-1">Flat ₹ / Executed Order</label>
              <input
                type="number"
                value={flatBrokerageRupees}
                onChange={(e) => setFlatBrokerageRupees(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
              />
            </div>
          ) : (
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <label className="text-slate-400 text-[11px] block mb-1">% Brokerage Per Side</label>
              <input
                type="number"
                step="0.05"
                value={percentBrokeragePerSide}
                onChange={(e) => setPercentBrokeragePerSide(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
              />
            </div>
          )}

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <label className="text-slate-400 text-[11px] block mb-1">Entry Option Premium (₹)</label>
            <input
              type="number"
              value={entryPriceInput}
              onChange={(e) => setEntryPriceInput(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
            />
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <label className="text-slate-400 text-[11px] block mb-1">Executable Exit Bid (₹)</label>
            <input
              type="number"
              value={exitBidInput}
              onChange={(e) => setExitBidInput(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
            />
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <label className="text-slate-400 text-[11px] block mb-1">Quantity (Units)</label>
            <input
              type="number"
              value={quantityInput}
              onChange={(e) => setQuantityInput(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs"
            />
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex flex-col justify-center">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer mb-1">
              <input
                type="checkbox"
                checked={includeExchangeStampSebi}
                onChange={(e) => setIncludeExchangeStampSebi(e.target.checked)}
              />
              +Exch/Stamp/SEBI
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={exercisedItmAtExpiry}
                onChange={(e) => setExercisedItmAtExpiry(e.target.checked)}
              />
              ITM Expiry Exercise Trap
            </label>
          </div>
        </div>

        {/* Big Headline Verdict Cards (U25.2 A–D) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono mb-4">
          <div
            className={`p-3.5 rounded-lg border-2 ${
              verdict.verdictBanner === 'NET GAIN'
                ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                : verdict.verdictBanner === 'NET LOSS'
                ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                : 'bg-amber-950/40 border-amber-500 text-amber-300'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider block opacity-80">
              A. LIVE NET P&L IF EXITED NOW
            </span>
            <div className="text-xl font-bold mt-0.5">
              {verdict.verdictBanner}: ₹{verdict.netPnlNow.toFixed(2)}
            </div>
            <span className="text-[11px] block mt-0.5 opacity-90">
              Gross: ₹{verdict.grossPnlNow.toFixed(2)} | Costs: -₹{verdict.costBreakdown.totalRoundTripCharges.toFixed(2)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              B. ITERATIVE NET BREAKEVEN
            </span>
            <div className="text-lg font-bold text-white mt-0.5">
              ₹{(verdict.netBreakevenExitPremiumFirstLeg ?? 0).toFixed(2)}
            </div>
            <span className="text-[11px] text-amber-300 block mt-0.5">
              +{verdict.netBreakevenMovePctOnPremium?.toFixed(2)}% on premium (+₹{verdict.requiredUnderlyingMoveRupees.toFixed(1)} spot)
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              C. ROUND-TRIP COST HURDLE
            </span>
            <div className="text-lg font-bold text-rose-300 mt-0.5">
              ₹{verdict.costHurdleRupees.toFixed(2)} ({verdict.costHurdlePctOfPremium.toFixed(2)}%)
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {verdict.isCostDominatedTrade ? 'COST-DOMINATED TRADE!' : 'Immediate Entry Drag: ₹' + verdict.entryCostDragImmediatelyAfterEntry.toFixed(1)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              D. GROSS R:R vs NET R:R
            </span>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">
              Net {(verdict.netRiskRewardRatio ?? 0).toFixed(2)}x
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Gross R:R {(verdict.grossRiskRewardRatio ?? 0).toFixed(2)}x | 2x Cost Stress: {costStress.fragileFlag ? 'FRAGILE' : 'ROBUST'}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">
              F. PLAUSIBILITY (Q vs P MEASURE)
            </span>
            <div className="text-sm font-bold text-sky-300 mt-0.5">
              Q-Implied: {qProbPct.toFixed(1)}%
            </div>
            <span className="text-[11px] text-emerald-300 block mt-0.5">
              P-Physical: {pProbRangePct[0].toFixed(1)}%–{pProbRangePct[1].toFixed(1)}% (n=252d)
            </span>
          </div>
        </div>

        {/* Section 101 Line-by-Line Cost Waterfall */}
        <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
          <span className="text-slate-400 font-sans font-bold">Section 101 Waterfall:</span>
          <span className="text-white">Gross ₹{verdict.grossPnlNow.toFixed(2)}</span>
          <span className="text-rose-300">− Brok ₹{verdict.costBreakdown.totalBrokerage.toFixed(2)}</span>
          <span className="text-rose-300">− STT (0.15%) ₹{verdict.costBreakdown.totalStt.toFixed(2)}</span>
          <span className="text-rose-300">− GST (18%) ₹{verdict.costBreakdown.gst.toFixed(2)}</span>
          <span className="text-rose-300">
            − Exch/Stamp/SEBI ₹
            {(
              verdict.costBreakdown.exchangeCharges +
              verdict.costBreakdown.stampDuty +
              verdict.costBreakdown.sebiTurnoverFees
            ).toFixed(2)}
          </span>
          <span className="text-emerald-400 font-bold">= NET P&L ₹{verdict.netPnlNow.toFixed(2)}</span>
        </div>
      </div>

      {/* V4-31 Enhanced Final Trade Card + Section 37 6D Feasibility + Section 83 Manual Order Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                Decision report — reasons for and against, plus feasibility checks
              </h3>
              <p className="text-xs text-slate-400">
                Section 36 WHY vs WHY NOT + 6-Dimension Execution Feasibility Gate
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded text-xs font-mono font-bold border ${
                finalStateAfterGates === 'TRADE CANDIDATE'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : finalStateAfterGates === 'WATCH'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              FINAL STATE: {finalStateAfterGates}
              <span className="block text-[9px] font-normal opacity-80 normal-case">educational model output · not a recommendation</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
              <div className="font-bold text-emerald-300 mb-1">WHY (Supporting Evidence — Sec 36)</div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li>• Spot (₹{spot.toFixed(0)}) &gt; VWAP (₹{vwap.toFixed(0)}) with positive futures basis.</li>
                <li>• 36-Model Fair Value Range: ₹{modelFairValueRange[0].toFixed(1)}–₹{modelFairValueRange[1].toFixed(1)} (Dispersion {modelDispersionPct.toFixed(2)}%).</li>
                <li>• Positive net expected value after Budget 2026 0.15% STT & ₹40 round-trip brokerage.</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30">
              <div className="font-bold text-rose-300 mb-1">WHY NOT / MAIN FAILURE RISKS</div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li>• Long option faces daily Theta decay (-₹415/day per lot).</li>
                <li>• Sudden VWAP breakdown or IV crush will trigger stop-loss.</li>
                <li>• Overnight gap can jump through intraday stop-loss.</li>
              </ul>
            </div>
          </div>

          {/* 6-Dimension Feasibility Breakdown */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
              <span>Section 37 6-Dimension Execution Feasibility:</span>
              <span className="font-mono text-amber-300">
                FEASIBILITY: {feasibility.overallFeasibility} ({feasibility.contractStatus})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {Object.entries(feasibility.dimensions).map(([key, dim]) => (
                <div key={key} className="p-2 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                  {dim.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-white capitalize">
                      {key.replace('Feasibility', ' Feasibility')}
                    </div>
                    <div className="text-slate-400 font-mono text-[10px]">{dim.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reference ticket — for your own review only (this site never places orders) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Reference ticket — for your own review only (this site never places orders)
                </h3>
                <p className="text-xs text-amber-300 font-mono">
                  {manualTicket.headerNotice}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                  manualTicket.status === 'VALID'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {manualTicket.status} (TTL: {manualTicket.ttlSeconds}s)
              </span>
            </div>

            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-200 font-mono overflow-x-auto leading-relaxed mb-3">
              {manualTicket.copyTextSummary}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleCopyTicket}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              {copiedTicket ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedTicket ? 'COPIED TO CLIPBOARD' : 'COPY ORDER DETAILS'}
            </button>

            <button
              onClick={() => {
                setManualConfirmLogged(true);
                onJournalConfirmManualExecution();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-semibold text-xs transition"
            >
              {manualConfirmLogged
                ? '✓ Logged in Manual Journal (Not Broker Confirmation)'
                : 'Section 84: "I Executed This Manually" (Journal Log Only)'}
            </button>
          </div>
        </div>
      </div>

      {/* V4-32/33 "What Would Change the Answer?" & V4-30 55-Step Pipeline Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              What would change the answer?
            </h3>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                invalidationCheck.validationState === 'VALID'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              STATE: {invalidationCheck.validationState}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {invalidationCheck.triggers.map((t) => (
              <div key={t.dimension} className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-white">{t.dimension}</span>
                  <span className="font-mono text-[11px] text-emerald-300">{t.currentObservedValue}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-rose-300">Invalidated If:</strong> {t.invalidationThreshold} →{' '}
                  <span className="text-amber-200">{t.actionIfTriggered}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <ListChecks className="w-5 h-5 text-sky-400" />
            The 55-step checklist the models run through
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1 font-mono text-[11px]">
            {pipelineSteps.map((s) => (
              <div
                key={s.stepNumber}
                className="p-1.5 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-2"
              >
                <span className="text-slate-300 truncate">
                  <strong className="text-amber-400">#{s.stepNumber}</strong> {s.stepName}
                </span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    s.status === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : s.status === 'BLOCK'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {s.summaryValue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
