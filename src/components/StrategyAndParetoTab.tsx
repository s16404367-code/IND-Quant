import React, { useState } from 'react';
import {
  Compass,
  ShieldCheck,
  Scale,
  Code2,
  CheckCircle2,
  XCircle,
  GitBranch,
} from 'lucide-react';
import { buildStrategyEligibilityMatrixForCapital } from '../engine/marginAndFeasibility';
import {
  buildParetoFrontierAndRiskBudgets,
  comparePositionSizingMethods,
  evaluateStrategyDsl,
  FULL_OPTION_STRATEGY_CATALOGUE,
  generateCounterTradeAndProtectionOptions,
  ParetoOptimizationObjective,
  StrategyDslCondition,
} from '../engine/strategyAndOptimizer';
import { formatINR } from '../engine/rulesEngine';

interface Props {
  selectedSymbol: string;
  spot: number;
  lotSize: number;
  capitalRupees: number;
  atmIv: number;
  portfolioDeltaRupees: number;
  portfolioEs99Rupees: number;
  numberFormatMode: 'LAKH_CRORE' | 'STANDARD';
}

const PARETO_OBJECTIVES: ParetoOptimizationObjective[] = [
  'BALANCED OBJECTIVE',
  'MAXIMISE EXPECTED NET P&L',
  'MAXIMISE NET P&L / RISK',
  'MINIMISE EXPECTED DRAWDOWN',
  'MINIMISE TAIL RISK',
  'MINIMISE CAPITAL',
  'MINIMISE HEDGE COST',
  'MAXIMISE LIQUIDITY',
];

export const StrategyAndParetoTab: React.FC<Props> = ({
  selectedSymbol,
  spot,
  lotSize,
  capitalRupees,
  atmIv,
  portfolioDeltaRupees,
  portfolioEs99Rupees,
  numberFormatMode,
}) => {
  const [selectedObjective, setSelectedObjective] =
    useState<ParetoOptimizationObjective>('BALANCED OBJECTIVE');
  const [dslIvThreshold, setDslIvThreshold] = useState<number>(35);
  const [dslSpreadMax, setDslSpreadMax] = useState<number>(1.2);

  const eligibilityMatrix = buildStrategyEligibilityMatrixForCapital(
    capitalRupees,
    2.0,
    lotSize
  );

  const paretoResult = buildParetoFrontierAndRiskBudgets({
    underlying: selectedSymbol,
    spot,
    availableCapitalRupees: capitalRupees,
    selectedObjective,
    lotSize,
  });

  const hedgeResult = generateCounterTradeAndProtectionOptions({
    underlying: selectedSymbol,
    spot,
    lotSize,
    portfolioDeltaRupeesPer1Pct: portfolioDeltaRupees,
    portfolioEs99Rupees,
    candidateDeltaRupeesPer1Pct: 2450,
    availableCapitalRupees: capitalRupees,
  });

  const sizingResult = comparePositionSizingMethods({
    capitalRupees,
    fixedRiskPct: 2.0,
    lotSize,
    optionPremium: 84,
    stopLossPrice: 58,
    winProbPMeasure: 0.48,
    netRewardToRiskRatio: 1.65,
    currentAnnualizedVol: atmIv,
  });

  const dslConditions: StrategyDslCondition[] = [
    { variable: 'IV_PERCENTILE', operator: '>', threshold: dslIvThreshold },
    { variable: 'PRICE_VS_VWAP_PCT', operator: '>', threshold: 0.1 },
    { variable: 'MARKET_BREADTH_PCT', operator: '>', threshold: 52 },
    { variable: 'EVENT_ABSENT', operator: '==', threshold: 1 },
    { variable: 'OPTION_SPREAD_PCT', operator: '<', threshold: dslSpreadMax },
  ];

  const dslEval = evaluateStrategyDsl(
    {
      hypothesisId: 'HYP-2026-019',
      hypothesisTitle: 'VWAP Momentum + Moderate IV Rank + Tight Spread Filter',
      version: '1.0.0',
      createdAtIso: '2026-10-02T04:00:00Z',
      targetStrategyId: 'STRAT_LONG_CALL',
      conditions: dslConditions,
      registeredInHypothesisRegistry: true,
    },
    {
      ivPercentile: 44.5,
      priceVsVwapPct: +0.21,
      marketBreadthPct: 61.0,
      optionSpreadPct: 0.42,
      eventAbsent: 1,
      vrpVolPoints: 1.6,
    }
  );

  return (
    <div className="space-y-6">
      {/* U4.1 Capital-Tier Strategy Eligibility Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-400" />
              Which strategies fit your capital: {formatINR(capitalRupees, numberFormatMode)}
            </h2>
            <p className="text-xs text-slate-400">
              Honest capital & SPAN margin feasibility (Section 33 / U4.1): Never pretends a short leg or spread is executable when SPAN + Exposure margin exceeds your capital.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Strategy Family</th>
                <th className="py-2 px-3">Structure Description</th>
                <th className="py-2 px-3">Capital / SPAN Required</th>
                <th className="py-2 px-3">Shortfall</th>
                <th className="py-2 px-3">Executability Status</th>
                <th className="py-2 pl-3">Margin & Decay Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {eligibilityMatrix.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/25">
                  <td className="py-2.5 pr-3 font-bold text-white">{row.strategyFamily}</td>
                  <td className="py-2.5 px-3 text-slate-300">{row.description}</td>
                  <td className="py-2.5 px-3 font-mono text-white">
                    {formatINR(row.typicalCapitalRequiredRupees, numberFormatMode)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-rose-300">
                    {row.capitalShortfallRupees > 0
                      ? formatINR(row.capitalShortfallRupees, numberFormatMode)
                      : '₹0'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        row.eligibleAtCapital
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 text-slate-400 text-[11px]">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* V4-9, V4-10, V4-11: Pareto Frontier Trade-Set Optimiser & 8-Dimension Risk-Budget Allocator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              Compare strategy structures — the best trade-offs (Pareto frontier)
            </h3>
            <p className="text-xs text-slate-400">
              Selected Objective: <strong className="text-amber-300 font-mono">{selectedObjective}</strong> | Binding Constraints:{' '}
              <strong className="text-rose-300 font-mono">
                {paretoResult.bindingConstraints.join(' • ') || 'None Binding'}
              </strong>
            </p>
          </div>

          <select
            value={selectedObjective}
            onChange={(e) => setSelectedObjective(e.target.value as ParetoOptimizationObjective)}
            className="bg-slate-950 border border-amber-500/40 rounded px-3 py-1.5 text-xs font-mono text-amber-300"
          >
            {PARETO_OBJECTIVES.map((obj) => (
              <option key={obj} value={obj}>
                Objective: {obj}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto mb-5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-2">Candidate Structure</th>
                <th className="py-2 px-2">Exp Net P&L</th>
                <th className="py-2 px-2">Max Loss</th>
                <th className="py-2 px-2">Capital / Margin</th>
                <th className="py-2 px-2">Net Θ / V</th>
                <th className="py-2 px-2">Portfolio Δ / ES Impact</th>
                <th className="py-2 px-2">Net P&L / Cap (V4-42)</th>
                <th className="py-2 pl-2">Pareto & Capital Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {paretoResult.candidates.map((c) => (
                <tr key={c.candidateId} className="hover:bg-slate-800/30">
                  <td className="py-2.5 pr-2 font-sans">
                    <div className="font-bold text-white">{c.structureName}</div>
                    <div className="text-[11px] text-slate-400">{c.legsDescription}</div>
                  </td>
                  <td className="py-2.5 px-2 text-emerald-400 font-bold">
                    +{formatINR(c.expectedNetPnlRupees, numberFormatMode)}
                  </td>
                  <td className="py-2.5 px-2 text-rose-300">
                    -{formatINR(c.maxLossRupees, numberFormatMode)}
                  </td>
                  <td className="py-2.5 px-2 text-white">
                    {formatINR(c.capitalRequiredRupees, numberFormatMode)}
                  </td>
                  <td className="py-2.5 px-2 text-slate-300">
                    Θ ₹{c.netThetaPerDayRupees} | V ₹{c.netVegaPer1PctRupees}
                  </td>
                  <td className="py-2.5 px-2 text-slate-300">
                    Δ ₹{c.portfolioDeltaChangeRupees} | ES {c.portfolioEsChangeRupees >= 0 ? '+' : ''}₹{c.portfolioEsChangeRupees}
                  </td>
                  <td className="py-2.5 px-2 text-amber-300">
                    {c.efficiencyNetPnlOverCapital.toFixed(1)}%
                  </td>
                  <td className="py-2.5 pl-2">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] w-fit ${
                          c.isParetoNonDominated
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.isParetoNonDominated ? 'PARETO FRONTIER' : 'DOMINATED'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] w-fit ${
                          c.feasibleAtCurrentCapital
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {c.feasibleAtCurrentCapital ? 'EXECUTABLE' : 'INSUFFICIENT CAPITAL'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* V4-11: 8-Dimension Risk-Budget Allocation Bars */}
        <div className="text-xs font-bold text-slate-300 mb-2">
          V4-11 8-Dimension Risk-Budget Allocation (Candidate Consumption vs Portfolio Cap)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {paretoResult.riskBudgets.map((rb) => (
            <div
              key={rb.dimensionName}
              className={`p-2.5 rounded-lg border text-xs ${
                rb.isBindingConstraint
                  ? 'bg-amber-950/25 border-amber-500/50'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-white text-[11px]">{rb.dimensionName}</span>
                <span className="font-mono text-[10px] text-amber-300">
                  {rb.utilizationPctAfterCandidate.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded overflow-hidden mb-1">
                <div
                  className={rb.utilizationPctAfterCandidate > 80 ? 'h-full bg-amber-500' : 'h-full bg-emerald-500'}
                  style={{ width: `${Math.min(100, Math.max(4, rb.utilizationPctAfterCandidate))}%` }}
                />
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                Used: {rb.unit}
                {Math.round(rb.currentConsumedValue + rb.candidateAddedValue).toLocaleString('en-IN')} / Cap:{' '}
                {rb.unit}
                {Math.round(rb.budgetCapValue).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections 27–31, 60 & V4-41: Counter-Trade / "Protect Portfolio" Hedge Engine & U11.1 Position Sizing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Hedging ideas — how a portfolio could be protected
          </h3>
          <div className="space-y-2.5 text-xs">
            {hedgeResult.hedgeProposals.map((h) => (
              <div key={h.hedgeId} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-white">{h.hedgeName}</span>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    Δ -{h.deltaReductionPct}% | ES -{h.esTailRiskReductionPct}%
                  </span>
                </div>
                <div className="font-mono text-[11px] text-amber-300 mb-1">
                  {h.instrumentDescription} | Cost: ₹{h.upfrontHedgeCostRupees} | Basis Risk: {h.basisRiskLevel}
                </div>
                <p className="text-[11px] text-slate-300">{h.tradeOffSummary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* U11.1 Position Sizing Comparison */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <GitBranch className="w-5 h-5 text-sky-400" />
              Position sizing (whole lots only)
            </h3>
            <div className="space-y-2.5 text-xs">
              {sizingResult.methods.map((m) => (
                <div key={m.methodName} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{m.methodName}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        m.status === 'EXECUTABLE'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {m.integerLotsRecommended} LOT(S) — {m.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">{m.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* M25 / V4-29 Visual Strategy DSL Rule Builder */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-400" />
                No-code rule builder
              </h3>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                  dslEval.triggered ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {dslEval.triggered ? 'ALL CONDITIONS MET' : 'RULE BLOCKED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-slate-400 text-[11px] block">Min IV Percentile (&gt; X%)</label>
                <input
                  type="number"
                  value={dslIvThreshold}
                  onChange={(e) => setDslIvThreshold(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[11px] block">Max Option Spread (&lt; Y%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={dslSpreadMax}
                  onChange={(e) => setDslSpreadMax(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1 font-mono text-[11px] bg-slate-950 p-2.5 rounded border border-slate-800">
              {dslEval.conditionResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-300">
                    {i > 0 ? 'AND ' : ''}
                    {r.conditionText}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400">(Obs: {r.actualValue})</span>
                    {r.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* V4-7 Full Option-Strategy Catalogue */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h3 className="text-base font-bold text-white mb-3">
          Option-strategy library (educational)
        </h3>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 sticky top-0 bg-slate-900">
                <th className="py-2 pr-2">Strategy</th>
                <th className="py-2 px-2">Category / Legs</th>
                <th className="py-2 px-2">Margin Class</th>
                <th className="py-2 px-2">Entry & Confirmation Rule</th>
                <th className="py-2 px-2">No-Trade Condition</th>
                <th className="py-2 pl-2">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {FULL_OPTION_STRATEGY_CATALOGUE.map((s) => (
                <tr key={s.strategyId} className="hover:bg-slate-800/30">
                  <td className="py-2 pr-2 font-bold text-white">{s.strategyName}</td>
                  <td className="py-2 px-2 font-mono text-[11px] text-amber-300">
                    {s.category} ({s.legCount}L)
                  </td>
                  <td className="py-2 px-2 font-mono text-[11px] text-slate-300">{s.marginClass}</td>
                  <td className="py-2 px-2 text-slate-300 text-[11px]">
                    {s.entryRule} | {s.confirmationRule}
                  </td>
                  <td className="py-2 px-2 text-rose-300/90 text-[11px]">{s.noTradeCondition}</td>
                  <td className="py-2 pl-2 font-mono text-[10px] text-emerald-300">{s.graduationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
