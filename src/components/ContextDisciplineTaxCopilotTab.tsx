import React, { useState } from 'react';
import {
  Newspaper,
  CloudRain,
  Calendar,
  Activity,
  ShieldAlert,
  BookOpen,
  Calculator,
  Bot,
  Globe,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  detectRegimeAndChangePoints,
  evaluateWeatherForUnderlying,
} from '../engine/microstructureAndTca';
import {
  evaluateBehaviouralDiscipline,
  queryGuardRailedCopilot,
  SEBI_FO_REALITY_STUDY_BANNER,
} from '../engine/disciplineAndCopilot';
import {
  computeIndianFoTaxReport,
  ClosedTradeRecord,
  LedgerTransaction,
} from '../engine/ledgerAndTaxEngine';
import {
  CROSS_ASSET_AND_PARTICIPANT_CONTEXT,
  MACRO_AND_EARNINGS_CALENDAR,
  SAMPLE_NEWS_11D_ITEMS,
} from '../engine/verifiedHistoricalFixtures';
import { formatINR } from '../engine/rulesEngine';

interface Props {
  selectedSymbol: string;
  spot: number;
  vwap: number;
  atmIv: number;
  realizedVol: number;
  indiaVix: number;
  netPnlNow: number;
  netBreakeven: number;
  costHurdleRupees: number;
  qProbPct: number;
  pProbPct: number;
  modelMedian: number;
  modelDispersionPct: number;
  es99Rupees: number;
  finalState: string;
  closedTrades: ClosedTradeRecord[];
  onAddManualFillTx: (tx: LedgerTransaction) => void;
  numberFormatMode: 'LAKH_CRORE' | 'STANDARD';
  simulateDailyLossLockout: boolean;
  setSimulateDailyLossLockout: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ContextDisciplineTaxCopilotTab: React.FC<Props> = ({
  selectedSymbol,
  spot,
  vwap,
  atmIv,
  realizedVol,
  indiaVix,
  netPnlNow,
  netBreakeven,
  costHurdleRupees,
  qProbPct,
  pProbPct,
  modelMedian,
  modelDispersionPct,
  es99Rupees,
  finalState,
  closedTrades,
  onAddManualFillTx,
  numberFormatMode,
  simulateDailyLossLockout,
  setSimulateDailyLossLockout,
}) => {
  const [copilotPrompt, setCopilotPrompt] = useState<string>(
    'Explain the current Trade Decision Report, Q vs P probability, and cost hurdle using engine outputs.'
  );
  const [fillPriceInput, setFillPriceInput] = useState<string>('96.50');
  const [fillQtyInput, setFillQtyInput] = useState<string>('65');
  const [fillThesisInput, setFillThesisInput] = useState<string>(
    'VWAP momentum breakout confirmed; invalidation below ₹24,768 VWAP'
  );
  const [brokerReportedNetPnlInput, setBrokerReportedNetPnlInput] = useState<string>('2012.00');

  const weatherReport = evaluateWeatherForUnderlying(selectedSymbol, '2026-10-02');
  const regimeReport = detectRegimeAndChangePoints({
    recentBarReturns: [0.0012, 0.0008, -0.0004, 0.0019, 0.0011, 0.0006, 0.0014, -0.0003],
    spotVsVwapPct: ((spot - vwap) / Math.max(1, vwap)) * 100,
    indiaVix,
    atmIv,
    realizedVol,
    scheduledMajorEventWithin24h: false,
    averageSpreadPct: 0.45,
  });

  const disciplineState = evaluateBehaviouralDiscipline({
    dailyLossLimitRupees: 1500,
    realizedLossTodayRupees: simulateDailyLossLockout ? 1650 : 320,
    tradesCountToday: 1,
    maxTradesPerDay: 4,
    consecutiveLossesCount: simulateDailyLossLockout ? 2 : 0,
    maxConsecutiveLossesAllowed: 2,
  });

  const taxReport = computeIndianFoTaxReport(
    closedTrades,
    Number(brokerReportedNetPnlInput) || undefined
  );

  const copilotResponse = queryGuardRailedCopilot(copilotPrompt, {
    timestampIso: '2026-10-02T05:15:00.000Z',
    underlying: selectedSymbol,
    spot,
    netPnlNow,
    netBreakeven,
    costHurdleRupees,
    qProbPct,
    pProbPct,
    modelMedian,
    modelDispersionPct,
    es99Rupees,
    finalState,
  });

  return (
    <div className="space-y-6">
      {/* U13 SEBI Reality Banner & Behavioural Discipline Lockout Engine */}
      <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              {SEBI_FO_REALITY_STUDY_BANNER.title}
            </h2>
            <p className="text-xs text-slate-400">
              Verified Source: {SEBI_FO_REALITY_STUDY_BANNER.source}
            </p>
          </div>
          <button
            onClick={() => setSimulateDailyLossLockout((v) => !v)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition ${
              simulateDailyLossLockout
                ? 'bg-rose-600 text-white border-rose-400'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {simulateDailyLossLockout
              ? 'LOCKOUT SIMULATION: ACTIVE (Click to Reset Session)'
              : 'Test U13 Non-Bypassable Daily Loss Lockout'}
          </button>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-200 mb-4">
          {SEBI_FO_REALITY_STUDY_BANNER.keyFindings.map((finding, i) => (
            <li key={i} className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
              • {finding}
            </li>
          ))}
        </ul>

        {disciplineState.lockoutActive && (
          <div className="p-3.5 rounded-lg bg-rose-950/90 border-2 border-rose-500 text-xs text-rose-100 mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <div className="font-bold text-rose-300">{disciplineState.lockoutReason}</div>
                <div className="text-[11px] text-rose-200/80">
                  Unlocks at: {disciplineState.unlocksAtNextSessionIso} | Override Button Exists: FALSE (Non-Bypassable per U13)
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Plan-Adherent Trades P&L</span>
            <span className="text-emerald-400 font-bold">
              +{formatINR(disciplineState.journalAdherenceStats.planAdherentNetPnlRupees, numberFormatMode)} ({disciplineState.journalAdherenceStats.planAdherentTradesCount} trades)
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Plan-Deviation (FOMO) P&L</span>
            <span className="text-rose-400 font-bold">
              {formatINR(disciplineState.journalAdherenceStats.planDeviationNetPnlRupees, numberFormatMode)} ({disciplineState.journalAdherenceStats.planDeviationTradesCount} trades)
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Trades Today / Max Cap</span>
            <span className="text-white font-bold">
              {disciplineState.tradesCountToday} / {disciplineState.maxTradesPerDay}
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Daily Loss Used / Lockout</span>
            <span className={disciplineState.lockoutActive ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              ₹{disciplineState.realizedLossTodayRupees} / ₹{disciplineState.dailyLossLimitRupees}
            </span>
          </div>
        </div>
      </div>

      {/* Sections 10–15: 11-Dimension News Impact Engine & Relevance-Gated Weather Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <Newspaper className="w-5 h-5 text-sky-400" />
            News-impact template — ILLUSTRATIVE EXAMPLES (not real news)
          </h3>
          <div className="space-y-3">
            {SAMPLE_NEWS_11D_ITEMS.map((item) => (
              <div
                key={item.newsId}
                className={`p-3.5 rounded-lg border text-xs ${
                  item.validForStrategySignal
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-rose-950/25 border-rose-500/40'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="font-bold text-white">{item.headline}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                      item.confirmationStatus === 'Officially Confirmed'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {item.confirmationStatus.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mb-2">
                  Source: {item.source} | Pub: {item.publicationTimeIso} | Effective: {item.effectiveTimeIso} | Symbol: {item.affectedSymbol}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] bg-slate-900/90 p-2.5 rounded border border-slate-800/80 mb-2">
                  <div>
                    <strong className="text-slate-400">Revenue:</strong> {item.impactDimensions11.revenueImpact}
                  </div>
                  <div>
                    <strong className="text-slate-400">Margin:</strong> {item.impactDimensions11.marginImpact}
                  </div>
                  <div>
                    <strong className="text-slate-400">Regulatory:</strong> {item.impactDimensions11.regulatoryImpact}
                  </div>
                  <div>
                    <strong className="text-slate-400">Rates:</strong> {item.impactDimensions11.interestRateExposure}
                  </div>
                  <div>
                    <strong className="text-slate-400">Currency:</strong> {item.impactDimensions11.currencyExposure}
                  </div>
                  <div>
                    <strong className="text-slate-400">Earnings:</strong> {item.impactDimensions11.earningsImpact}
                  </div>
                </div>
                <p className="text-[11px] text-amber-200/90">{item.potentialMarketRelevance}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 14/15 Weather Relevance Gate & V4-17 Regime Change-Point Engine */}
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <CloudRain className="w-5 h-5 text-cyan-400" />
              Weather relevance rule ({selectedSymbol})
            </h3>
            <div
              className={`p-3 rounded-lg border mb-3 ${
                weatherReport.status === 'POTENTIALLY RELEVANT'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="font-mono font-bold text-sm mb-1">{weatherReport.status}</div>
              <p className="text-[11px]">{weatherReport.economicTransmissionChannel}</p>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div>
                <strong className="text-emerald-300">Forecast Available at Decision:</strong>{' '}
                {weatherReport.forecastAvailableAtDecisionTime}
              </div>
              <div>
                <strong className="text-slate-400">Actual Weather (Separated):</strong>{' '}
                {weatherReport.actualWeatherOccurredLater}
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Tip: Switch underlying to <strong>NTPC</strong> (Power), <strong>INDIGO</strong> (Airlines), or <strong>RELIANCE</strong> (Oil & Gas) in the top bar to see sector-relevant weather gating activate.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-emerald-400" />
              Market regime detector (illustrative inputs)
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] mb-2">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Current Regime:</span>
                <span className="text-emerald-300 font-bold">{regimeReport.currentRegime}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Confidence / Age:</span>
                <span className="text-white font-bold">
                  {regimeReport.regimeConfidencePct}% ({regimeReport.regimeAgeBars} bars)
                </span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">CUSUM Stat:</span>
                <span className="text-white">
                  {regimeReport.detectors.cusumStatistic.toFixed(2)} / {regimeReport.detectors.cusumThreshold}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block">Bayesian CP Prob:</span>
                <span className="text-amber-300">
                  {(regimeReport.detectors.bayesianChangePointPosteriorProb * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300">{regimeReport.routingAction}</p>
          </div>
        </div>
      </div>

      {/* U15 / V4-18 / V4-19 / V4-20: Global Pre-Market, Participant F&O OI & Event Surprise Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-indigo-400" />
            Global &amp; participant context — ILLUSTRATIVE SAMPLE (not live)
          </h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1.5 pr-2">Cross-Asset</th>
                  <th className="py-1.5 px-2">Level</th>
                  <th className="py-1.5 px-2">Chg</th>
                  <th className="py-1.5 px-2">Corr to NIFTY</th>
                  <th className="py-1.5 pl-2">Source / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {CROSS_ASSET_AND_PARTICIPANT_CONTEXT.globalPreMarket.map((g) => (
                  <tr key={g.asset}>
                    <td className="py-1.5 pr-2 font-sans text-white font-medium">{g.asset}</td>
                    <td className="py-1.5 px-2 text-slate-200">{g.price}</td>
                    <td className={g.changePct.startsWith('+') ? 'py-1.5 px-2 text-emerald-400' : 'py-1.5 px-2 text-rose-400'}>
                      {g.changePct}
                    </td>
                    <td className="py-1.5 px-2 text-amber-300">{g.leadLagCorrToNifty.toFixed(2)}</td>
                    <td className="py-1.5 pl-2 text-slate-400">
                      {g.source} ({g.timestamp})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs font-bold text-slate-300 mb-2">
            NSE Participant-Wise F&O Open Interest & Cash Flows (No Causal Claims)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            {CROSS_ASSET_AND_PARTICIPANT_CONTEXT.participantFnoOi.map((p) => (
              <div key={p.participant} className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="font-sans font-bold text-white block">{p.participant}</span>
                <span className="text-slate-400 block">Fut Long: {p.indexFuturesLongPct}%</span>
                <span className={p.indexFuturesNetContracts >= 0 ? 'text-emerald-400 block' : 'text-rose-400 block'}>
                  Net Fut: {p.indexFuturesNetContracts >= 0 ? '+' : ''}
                  {p.indexFuturesNetContracts.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-amber-400" />
            Event &amp; earnings calendar — ILLUSTRATIVE SAMPLE
          </h3>
          <div className="space-y-3">
            {MACRO_AND_EARNINGS_CALENDAR.map((ev) => (
              <div key={ev.eventId} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                <div className="font-bold text-white mb-1">{ev.eventName}</div>
                <div className="text-[11px] font-mono text-amber-300 mb-1.5">
                  Scheduled: {ev.scheduledTimeIso} | Affected: {ev.affectedArea}
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-slate-900 p-2 rounded mb-1.5">
                  <div>
                    <span className="text-slate-400 block">Previous:</span>
                    <span className="text-white">{ev.previousValue}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Point-in-Time Consensus:</span>
                    <span className="text-white">{ev.consensusEstimate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Actual / Surprise:</span>
                    <span className="text-emerald-300">{ev.actualValue}</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-300">
                  <strong>Implied vs Realized Move:</strong> {ev.historicalAvgNiftyMovePct} |{' '}
                  <strong>IV Crush:</strong> {ev.historicalIvCrushVolPts}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sections 84–86, 122 & M14/U18: Manual Fill Journal + Indian F&O ICAI Tax Turnover + U16 Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Your trade journal &amp; F&amp;O tax turnover (information only — not tax advice)
          </h3>
          <p className="text-xs text-slate-400">
            After you manually execute a trade in your registered broker, record your actual fill here to append to the FIFO Ledger, compare Model vs Actual TCA, and update ICAI Section 44AB F&O Tax-Audit Turnover.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Actual Fill Price (₹)</label>
              <input
                type="number"
                value={fillPriceInput}
                onChange={(e) => setFillPriceInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Quantity (Units)</label>
              <input
                type="number"
                value={fillQtyInput}
                onChange={(e) => setFillQtyInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  const px = Number(fillPriceInput) || 96.5;
                  const qty = Number(fillQtyInput) || 65;
                  onAddManualFillTx({
                    txId: `TX-MANUAL-${Date.now().toString().slice(-4)}`,
                    accountId: 'PRIMARY-RETAIL-ACCT',
                    timestamp: new Date().toISOString(),
                    txType: 'BUY',
                    instrumentKey: `${selectedSymbol}-2026-10-06-ATM-CE`,
                    underlying: selectedSymbol,
                    assetClass: 'INDEX_OPTION',
                    sector: 'BROAD_INDEX',
                    quantity: qty,
                    price: px,
                    chargesAndTaxes: 23.85,
                    sttPaid: 0,
                    strategyTag: 'MANUAL_JOURNAL_ENTRY',
                    thesis: fillThesisInput,
                    invalidationLevel: 'Below VWAP',
                    perUnitDelta: 0.5,
                  });
                }}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded transition"
              >
                Record Manual Fill in Journal
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Mandatory Pre-Trade Thesis & Invalidation Level (U13):
            </label>
            <input
              type="text"
              value={fillThesisInput}
              onChange={(e) => setFillThesisInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
            />
          </div>

          {/* U18 Indian F&O Tax & ICAI Turnover Box */}
          <div className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                U18 Indian F&O Tax-Audit Turnover & ITR-3 Summary
              </span>
              <span className="text-[10px] font-mono text-slate-400">INFORMATION ONLY — NOT TAX ADVICE</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] mb-2">
              <div>
                <span className="text-slate-400 block">ICAI Tax-Audit Turnover:</span>
                <span className="text-white font-bold">
                  {formatINR(taxReport.icaiTaxAuditTurnoverRupees, numberFormatMode)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Net Taxable F&O P&L (ITR-3 BP):</span>
                <span className="text-emerald-400 font-bold">
                  {formatINR(taxReport.netTaxableBusinessPnlRupees, numberFormatMode)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Sec 44AB ₹10Cr Digital Audit:</span>
                <span className="text-emerald-300">
                  {taxReport.taxAuditThreshold10CrDigitalBreached ? 'AUDIT REQUIRED' : 'BELOW ₹10Cr THRESHOLD'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Broker P&L Reconciliation:</span>
                <span className="text-emerald-300">
                  Diff ₹{taxReport.brokerStatementReconciliation.differenceRupees.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* M15 / U16: Guard-Railed AI Copilot */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-400" />
                Explain-it assistant (rule-based — uses only the numbers on screen)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                ZERO SELF-GENERATED NUMBERS
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Hard Rule (U16): Never invents numbers; every figure is cited directly from verified engine outputs. Try clicking the preset buttons below (including the Refusal Guardrail test).
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() =>
                  setCopilotPrompt(
                    'Explain the current Trade Decision Report, Q vs P probability, and cost hurdle using engine outputs.'
                  )
                }
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
              >
                Explain Trade Decision Report
              </button>
              <button
                onClick={() =>
                  setCopilotPrompt('Please place order and buy now or override lockout')
                }
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-xs text-rose-300 border border-rose-500/40"
              >
                Test Guardrail: &ldquo;Place Order / Override Lockout&rdquo;
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 mb-3">
              <div className="font-mono text-[10px] text-amber-300 mb-1">
                {copilotResponse.guardrailBanner}
              </div>
              <p className="leading-relaxed">{copilotResponse.answerText}</p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-[11px]">
            <div className="font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Retrieved Engine Lineage Citations (U16 / U17):
            </div>
            <div className="space-y-1 font-mono">
              {copilotResponse.retrievedEngineCitations.map((c, i) => (
                <div key={i} className="flex flex-wrap justify-between gap-2 text-slate-300 border-b border-slate-800/60 pb-1">
                  <span className="text-sky-300">[{c.panelName}]</span>
                  <span className="text-white">{c.exactEngineValue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
