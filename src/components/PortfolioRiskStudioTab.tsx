import React from 'react';
import {
  Shield,
  TrendingDown,
  Layers,
  AlertOctagon,
  BarChart3,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  decomposePnlByGreeks,
  PortfolioStateSummary,
} from '../engine/ledgerAndTaxEngine';
import {
  PortfolioRiskMetrics,
  PreTradeComplianceGateResult,
  PriceIvStressGridCell,
  HistoricalStressScenario,
  ReverseStressBreachResult,
} from '../engine/riskAndLimitsEngine';
import { formatINR } from '../engine/rulesEngine';

interface Props {
  portfolioState: PortfolioStateSummary;
  riskMetrics: PortfolioRiskMetrics;
  historicalCrises: HistoricalStressScenario[];
  priceIvGrid: PriceIvStressGridCell[];
  reverseStressResults: ReverseStressBreachResult[];
  complianceGate: PreTradeComplianceGateResult;
  numberFormatMode: 'LAKH_CRORE' | 'STANDARD';
}

export const PortfolioRiskStudioTab: React.FC<Props> = ({
  portfolioState,
  riskMetrics,
  historicalCrises,
  priceIvGrid,
  reverseStressResults,
  complianceGate,
  numberFormatMode,
}) => {
  const greeksExplain = decomposePnlByGreeks({
    observedTotalPnl: 1560,
    netQuantity: 65,
    deltaPerUnit: 0.48,
    gammaPerUnit: 0.0014,
    thetaPerUnitPerDay: -6.4,
    vegaPerUnitPer1Pct: 4.3,
    rhoPerUnitPer1Pct: 0.2,
    vannaPerUnit: 0.08,
    vommaPerUnit: 0.12,
    spotChangePoints: 52,
    ivChangePctPoints: 0.4,
    daysElapsed: 0.5,
  });

  const spotMoves = [-5, -3, -2, -1, 0, 1, 2, 3, 5];
  const ivMoves = [-10, -5, 0, 5, 10];

  return (
    <div className="space-y-6">
      {/* Institutional-Style Core Portfolio Risk Summary & VaR / ES / Kupiec Backtest */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Portfolio risk studio — VaR, Expected Shortfall &amp; limit checks (illustrative demo portfolio)
            </h2>
            <p className="text-xs text-slate-400">
              One common portfolio ledger (Equity + ETFs + Futures + Options + Cash) evaluated in a unified risk factor language.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded text-xs font-mono font-bold border ${
              riskMetrics.varBacktest.trafficLightZone === 'GREEN_ZONE'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            KUPIEC VaR BACKTEST: {riskMetrics.varBacktest.trafficLightZone} ({riskMetrics.varBacktest.exceptionsCount99}/250 Exceptions)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs mb-4">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Net Liquidation Value</span>
            <span className="text-white font-bold text-sm">
              {formatINR(portfolioState.netLiquidationValue, numberFormatMode)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">99% 1D Historical VaR</span>
            <span className="text-amber-300 font-bold text-sm">
              {formatINR(riskMetrics.historicalVarRupees, numberFormatMode)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">99% Expected Shortfall (ES)</span>
            <span className="text-rose-400 font-bold text-sm">
              {formatINR(riskMetrics.historicalEsRupees, numberFormatMode)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Full-Reval MC ES (99%)</span>
            <span className="text-rose-300 font-bold text-sm">
              {formatINR(riskMetrics.monteCarloFullRevalEsRupees, numberFormatMode)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Liquidity-Adj LVaR</span>
            <span className="text-amber-300 font-bold text-sm">
              {formatINR(riskMetrics.liquidityAdjustedLvarRupees, numberFormatMode)}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[11px] block">Effective # of Bets / HHI</span>
            <span className="text-emerald-300 font-bold text-sm">
              {portfolioState.effectiveNumberOfBets.toFixed(2)} ({portfolioState.concentrationHhi.toFixed(2)})
            </span>
          </div>
        </div>

        {/* Incremental Portfolio Impact Comparison: Current vs +Trade vs +Trade+Hedge (Section 59 & 73) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <div className="font-bold text-slate-300 mb-1">1. Current Standalone Portfolio</div>
            <div className="font-mono space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Net Delta (per 1% move):</span>
                <span className="text-white">{formatINR(portfolioState.portfolioGreeksRupees.netDeltaRupees, numberFormatMode)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">99% Expected Shortfall:</span>
                <span className="text-rose-300">{formatINR(riskMetrics.historicalEsRupees, numberFormatMode)}</span>
              </div>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-amber-500/30">
            <div className="font-bold text-amber-300 mb-1">2. Portfolio + Candidate Trade (Unhedged)</div>
            <div className="font-mono space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Incremental ES Change:</span>
                <span className="text-rose-400">+{formatINR(riskMetrics.incrementalEsWithCandidateRupees, numberFormatMode)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Post-Trade 99% ES:</span>
                <span className="text-amber-300">
                  {formatINR(riskMetrics.historicalEsRupees + riskMetrics.incrementalEsWithCandidateRupees, numberFormatMode)}
                </span>
              </div>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-emerald-500/30">
            <div className="font-bold text-emerald-300 mb-1">3. Portfolio + Candidate + Protective Hedge</div>
            <div className="font-mono space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Incremental ES w/ Hedge:</span>
                <span className="text-emerald-400">
                  {formatINR(riskMetrics.incrementalEsWithCandidateAndHedgeRupees, numberFormatMode)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Post-Hedge 99% ES:</span>
                <span className="text-emerald-300">
                  {formatINR(
                    Math.max(0, riskMetrics.historicalEsRupees + riskMetrics.incrementalEsWithCandidateAndHedgeRupees),
                    numberFormatMode
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Append-Only Portfolio Positions & U10.1 Greeks P&L Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-sky-400" />
            Positions in the demo portfolio (illustrative)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-2">Instrument</th>
                  <th className="py-2 px-2">Class</th>
                  <th className="py-2 px-2">Net Qty</th>
                  <th className="py-2 px-2">Avg Entry</th>
                  <th className="py-2 px-2">Mkt Price</th>
                  <th className="py-2 px-2">Unrealized P&L</th>
                  <th className="py-2 pl-2">Thesis / Invalidation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {portfolioState.positions.map((pos) => (
                  <tr key={pos.instrumentKey}>
                    <td className="py-2 pr-2 font-sans font-bold text-white">{pos.instrumentKey}</td>
                    <td className="py-2 px-2 text-amber-300">{pos.assetClass}</td>
                    <td className="py-2 px-2 text-white">{pos.netQuantity}</td>
                    <td className="py-2 px-2 text-slate-300">₹{pos.averageEntryPrice.toFixed(2)}</td>
                    <td className="py-2 px-2 text-white">₹{pos.currentMarketPrice.toFixed(2)}</td>
                    <td className={pos.unrealizedPnlRupees >= 0 ? 'py-2 px-2 text-emerald-400 font-bold' : 'py-2 px-2 text-rose-400 font-bold'}>
                      {pos.unrealizedPnlRupees >= 0 ? '+' : ''}
                      {formatINR(pos.unrealizedPnlRupees, numberFormatMode)}
                    </td>
                    <td className="py-2 pl-2 font-sans text-slate-400">
                      {pos.thesis} ({pos.invalidationLevel})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Where did the profit / loss come from? (Greeks breakdown)
          </h3>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Observed Open Option P&L:</span>
              <span className="text-emerald-400 font-bold">+₹{greeksExplain.observedTotalPnl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">1. Delta P&L (Δ · dS):</span>
              <span className="text-emerald-300">+₹{greeksExplain.deltaPnl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">2. Gamma P&L (½ Γ · dS²):</span>
              <span className="text-emerald-300">+₹{greeksExplain.gammaPnl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">3. Vega P&L (V · dσ):</span>
              <span className="text-emerald-300">+₹{greeksExplain.vegaPnl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">4. Theta Decay (Θ · dt):</span>
              <span className="text-rose-300">₹{greeksExplain.thetaPnl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">5. Vanna/Volga Cross:</span>
              <span className="text-slate-300">₹{greeksExplain.vannaVolgaCrossPnl.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 font-bold">
              <span className="text-amber-300">Unexplained Residual:</span>
              <span className="text-amber-300">
                ₹{greeksExplain.unexplainedResidualPnl.toFixed(2)} ({greeksExplain.residualSharePct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* U8.3 & V4-26: Reverse Stress Testing + Pre-Trade Compliance Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            Reverse stress test — the smallest shock that breaks a limit
          </h3>
          <div className="space-y-2.5 text-xs">
            {reverseStressResults.map((r) => (
              <div
                key={r.limitName}
                className={`p-3 rounded-lg border ${
                  r.isBindingVulnerability
                    ? 'bg-rose-950/30 border-rose-500/50'
                    : 'bg-slate-950/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white">{r.limitName}</span>
                  {r.isBindingVulnerability && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500 text-white font-bold">
                      BINDING VULNERABILITY
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 font-mono">{r.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Pre-trade limit checks
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold ${
                complianceGate.gatePassed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {complianceGate.gatePassed ? 'GATE PASSED' : `${complianceGate.hardBreachesCount} HARD BREACH(ES)`}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {complianceGate.checks.map((chk) => (
              <div key={chk.limitId} className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    {chk.status === 'PASS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {chk.limitName} ({chk.limitType})
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {chk.postTradeValue} / {chk.limitCapValue}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden">
                  <div
                    className={`h-full ${
                      chk.status === 'PASS'
                        ? 'bg-emerald-500'
                        : chk.status === 'SOFT_BREACH_WARNING'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, chk.postTradeUtilizationPct))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 76 & U8.3: Historical Crisis Replay & 45-Cell Combined Price × IV Stress Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <TrendingDown className="w-5 h-5 text-rose-400" />
            How past Indian market crashes would hit this portfolio
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-2">Historical Event</th>
                  <th className="py-2 px-2">Shock</th>
                  <th className="py-2 px-2">Unhedged P&L</th>
                  <th className="py-2 pl-2">With Hedge P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {historicalCrises.map((c) => (
                  <tr key={c.scenarioId}>
                    <td className="py-2 pr-2 font-sans text-white font-medium">{c.eventName}</td>
                    <td className="py-2 px-2 text-amber-300">
                      {c.niftyShockPct}% / +{c.vixShockPctPoints}VIX
                    </td>
                    <td className="py-2 px-2 text-rose-400">
                      {formatINR(c.unhedgedPortfolioPnlRupees, numberFormatMode)}
                    </td>
                    <td className="py-2 pl-2 text-emerald-300 font-bold">
                      {formatINR(c.hedgedPortfolioPnlRupees, numberFormatMode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white mb-3">
            Stress grid — price move × volatility change
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-[11px] font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1.5 px-1 text-left">Spot \ IV</th>
                  {ivMoves.map((iv) => (
                    <th key={iv} className="py-1.5 px-1">
                      {iv >= 0 ? `+${iv}%` : `${iv}%`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {spotMoves.map((s) => (
                  <tr key={s}>
                    <td className="py-1.5 px-1 text-left font-bold text-slate-300">
                      {s >= 0 ? `+${s}%` : `${s}%`}
                    </td>
                    {ivMoves.map((iv) => {
                      const cell = priceIvGrid.find(
                        (c) => c.underlyingShockPct === s && c.ivShockPctPoints === iv
                      );
                      const val = cell?.simulatedPnlRupees ?? 0;
                      return (
                        <td
                          key={iv}
                          className={`py-1.5 px-1 ${
                            val >= 0 ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-400 bg-rose-500/5'
                          }`}
                        >
                          {val >= 0 ? '+' : ''}
                          {Math.round(val).toLocaleString('en-IN')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
