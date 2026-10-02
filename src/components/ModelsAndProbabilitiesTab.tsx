import React, { useState } from 'react';
import {
  Cpu,
  Sigma,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import {
  evaluateAll51Models,
  ModelCategory,
} from '../engine/pricingModels';
import {
  PMeasureDistributionReport,
  QMeasureDistributionReport,
} from '../engine/volSurfaceAndDist';

interface Props {
  selectedSymbol: string;
  spot: number;
  atmStrike: number;
  timeToExpiryYears: number;
  riskFreeRate: number;
  dividendYield: number;
  atmIv: number;
  marketBid: number;
  marketAsk: number;
  impliedForward: number;
  qDistribution: QMeasureDistributionReport;
  pDistribution: PMeasureDistributionReport;
  qProbPct: number;
}

export const ModelsAndProbabilitiesTab: React.FC<Props> = ({
  selectedSymbol,
  spot,
  atmStrike,
  timeToExpiryYears,
  riskFreeRate,
  dividendYield,
  atmIv,
  marketBid,
  marketAsk,
  impliedForward,
  qDistribution,
  pDistribution,
  qProbPct,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [labVolMultiplier, setLabVolMultiplier] = useState<number>(1.0);

  const evaluation = evaluateAll51Models(
    {
      spot,
      strike: atmStrike,
      timeToExpiryYears,
      riskFreeRate,
      dividendYield,
      volatility: atmIv * labVolMultiplier,
      right: 'CE',
    },
    marketBid,
    marketAsk,
    impliedForward
  );

  const filteredModels = evaluation.models.filter(
    (m) => categoryFilter === 'ALL' || m.category === (categoryFilter as ModelCategory)
  );

  const u = evaluation.ensembleSummary.uncertaintyBreakdown;

  return (
    <div className="space-y-6">
      {/* V4-2 & V4-3: Separate Risk-Neutral (Q-Measure) vs Real-World (P-Measure) Probability Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Q-Measure Panel */}
        <div className="bg-slate-900/90 border-2 border-sky-500/40 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
              {qDistribution.label}
            </span>
            <span className="font-mono text-xs text-emerald-400">
              Mass ∫q(K)dK = {qDistribution.totalProbabilityMass.toFixed(2)}
            </span>
          </div>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Sigma className="w-5 h-5 text-sky-400" />
            What option prices imply — market-implied distribution &amp; expected move
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Extracted from SVI arbitrage-free option prices ($q(K) = e^{'{rT}'} \partial^2 C / \partial K^2$). Embeds variance risk premium and crash aversion — never conflate with real-world physical probability.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs mb-4">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Q-Prob &gt; Net Breakeven</span>
              <span className="text-sky-300 font-bold text-sm">{qProbPct.toFixed(1)}%</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Implied 1σ Expected Move</span>
              <span className="text-white font-bold text-sm">
                ±₹{qDistribution.expectedMove1SigmaRupees.toFixed(0)} (±{qDistribution.expectedMove1SigmaPct.toFixed(2)}%)
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Q-Skewness</span>
              <span className="text-amber-300 font-bold text-sm">
                {qDistribution.impliedSkewness.toFixed(2)}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Q-Excess Kurtosis</span>
              <span className="text-amber-300 font-bold text-sm">
                {qDistribution.impliedExcessKurtosis.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-950/90 border border-slate-800 text-xs font-mono">
            <div className="text-slate-400 text-[11px] mb-1">
              Market-Implied Expected Range ({selectedSymbol}):
            </div>
            <div className="flex items-center justify-between text-white font-bold">
              <span className="text-rose-300">Lower 1σ: ₹{qDistribution.expectedRangeLow.toFixed(0)}</span>
              <span className="text-sky-300">Fwd Mean: ₹{qDistribution.impliedMean.toFixed(0)}</span>
              <span className="text-emerald-300">Upper 1σ: ₹{qDistribution.expectedRangeHigh.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* P-Measure Panel */}
        <div className="bg-slate-900/90 border-2 border-emerald-500/40 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {pDistribution.label}
            </span>
            <span className="font-mono text-xs text-amber-300">
              VRP Z-Score: {pDistribution.varianceRiskPremium.historicalVrpZScore.toFixed(2)}σ
            </span>
          </div>
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Statistical estimate from past price behaviour (real-world probability)
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs mb-3">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">P-Prob Consensus Range</span>
              <span className="text-emerald-400 font-bold text-sm">
                {(pDistribution.consensusPMeasureRange[0] * 100).toFixed(1)}%–{(pDistribution.consensusPMeasureRange[1] * 100).toFixed(1)}%
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">GJR-GARCH Forecast RV</span>
              <span className="text-white font-bold text-sm">
                {(pDistribution.realizedVolEstimators.gjrGarchAsymmetricAnnualized * 100).toFixed(2)}%
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">HAR-RV Cascade Forecast</span>
              <span className="text-white font-bold text-sm">
                {(pDistribution.realizedVolEstimators.harRvForecastAnnualized * 100).toFixed(2)}%
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] block">IV − Forecast RV Spread</span>
              <span className="text-amber-300 font-bold text-sm">
                {(pDistribution.varianceRiskPremium.ivMinusRvSpread * 100).toFixed(2)} vol pts
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1 pr-2">Physical P-Measure Model</th>
                  <th className="py-1 px-2">P-Prob (95% CI)</th>
                  <th className="py-1 px-2">Brier / Log</th>
                  <th className="py-1 pl-2">Calibration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {pDistribution.challengerForecasts.map((f) => (
                  <tr key={f.methodId}>
                    <td className="py-1.5 pr-2 font-sans text-white font-medium">{f.methodName}</td>
                    <td className="py-1.5 px-2 text-emerald-300">
                      {(f.probAboveBreakeven * 100).toFixed(1)}% [{(f.confidenceInterval95[0] * 100).toFixed(0)}%–{(f.confidenceInterval95[1] * 100).toFixed(0)}%]
                    </td>
                    <td className="py-1.5 px-2 text-slate-300">
                      {f.brierScoreOos.toFixed(3)} / {f.logLossOos.toFixed(3)}
                    </td>
                    <td className="py-1.5 pl-2">
                      <span className="text-[10px] text-emerald-400">{f.calibrationStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* V4-24 Model Uncertainty Decomposition & Ensemble Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              Fair value from many models — and how much they disagree ({selectedSymbol} {atmStrike} CE)
            </h3>
            <p className="text-xs text-slate-400">
              Never labels a market quote &ldquo;mispriced&rdquo; merely because a model differs. High model dispersion is treated as a risk input.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300">Research Vol Multiplier:</span>
            <input
              type="range"
              min="0.75"
              max="1.35"
              step="0.05"
              value={labVolMultiplier}
              onChange={(e) => setLabVolMultiplier(Number(e.target.value))}
              className="accent-amber-500"
            />
            <span className="font-mono text-amber-300 font-bold">{labVolMultiplier.toFixed(2)}x</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 font-mono text-xs">
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Market Bid / Ask / Mid</span>
            <span className="text-white font-bold">
              ₹{marketBid.toFixed(1)} / ₹{marketAsk.toFixed(1)} (₹{evaluation.ensembleSummary.marketMid.toFixed(2)})
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-emerald-500/40">
            <span className="text-slate-400 text-[10px] block">Fair Value Range (V4-24)</span>
            <span className="text-emerald-400 font-bold">
              ₹{evaluation.ensembleSummary.fairValueRangeLow.toFixed(2)} – ₹{evaluation.ensembleSummary.fairValueRangeHigh.toFixed(2)}
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Model Median (Point Est)</span>
            <span className="text-white font-bold">₹{u.pointEstimate.toFixed(2)}</span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Parameter Uncertainty</span>
            <span className="text-amber-300">±₹{u.parameterUncertainty.toFixed(2)}</span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Calibration + MC Error</span>
            <span className="text-amber-300">
              ±₹{(u.calibrationUncertainty + u.numericalError).toFixed(2)}
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Model Disagreement (σ)</span>
            <span className="text-amber-300">
              ±₹{u.modelDisagreement.toFixed(2)} ({evaluation.ensembleSummary.modelDispersionPct.toFixed(2)}%)
            </span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Dispersion Risk Level</span>
            <span
              className={`font-bold ${
                evaluation.ensembleSummary.dispersionLevel === 'LOW'
                  ? 'text-emerald-400'
                  : evaluation.ensembleSummary.dispersionLevel === 'MODERATE'
                  ? 'text-amber-300'
                  : 'text-rose-400'
              }`}
            >
              {evaluation.ensembleSummary.dispersionLevel} ({evaluation.ensembleSummary.applicableModelCount} Models)
            </span>
          </div>
        </div>
      </div>

      {/* Section 18 + V3-0.3 Errata + V4-4: All 51 Models with Applicability Gate */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            All 51 pricing models side by side
          </h3>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-white"
          >
            <option value="ALL">Show All 51 Models & Frameworks</option>
            <option value="PRIMARY_EQUITY_INDEX_OPTIONS">Primary Equity/Index Option Models (1–9)</option>
            <option value="ADVANCED_VOLATILITY_MODELS">Advanced Volatility & Lévy Models (10–17, 24–26)</option>
            <option value="NUMERICAL_METHODS">Numerical PDE / MC / Fourier / COS Methods (18–23)</option>
            <option value="STRUCTURAL_RESEARCH_MODELS">Structural Credit Models (27 — Gated)</option>
            <option value="INTEREST_RATE_MODELS">Interest-Rate Models (28–31 — Gated)</option>
            <option value="RISK_NEUTRAL_AND_ARBITRAGE_FRAMEWORKS">Consistency Frameworks (32–36 — V3-0.3 Errata)</option>
            <option value="V4_CHALLENGER_VOLATILITY_MODELS">V4 Advanced Volatility Challengers (37–51)</option>
          </select>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 sticky top-0 bg-slate-900">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 px-2">Model Name & Category</th>
                <th className="py-2 px-2">Compute Tier</th>
                <th className="py-2 px-2">Applicability Gate Status</th>
                <th className="py-2 px-2">Theoretical Value</th>
                <th className="py-2 px-2">Param / Num Error</th>
                <th className="py-2 pl-2">Assumptions, Limitations & Gate Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredModels.map((m) => (
                <tr key={m.modelId} className="hover:bg-slate-800/30">
                  <td className="py-2 pr-2 font-mono text-amber-400 font-bold">#{m.modelNumber}</td>
                  <td className="py-2 px-2">
                    <div className="font-bold text-white">{m.modelName}</div>
                    <div className="font-mono text-[10px] text-slate-400">{m.category}</div>
                  </td>
                  <td className="py-2 px-2 font-mono text-[11px] text-sky-300">{m.computeTier}</td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold inline-flex items-center gap-1 ${
                        m.applicabilityStatus === 'APPLICABLE'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : m.applicabilityStatus === 'CONSISTENCY_DIAGNOSTIC'
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {m.applicabilityStatus === 'APPLICABLE' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {m.applicabilityStatus}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-mono text-white font-bold">
                    {m.theoreticalPrice !== null ? `₹${m.theoreticalPrice.toFixed(2)}` : 'DIAGNOSTIC / GATED'}
                  </td>
                  <td className="py-2 px-2 font-mono text-[11px] text-slate-300">
                    {m.parameterUncertaintyRupees !== null
                      ? `±₹${m.parameterUncertaintyRupees.toFixed(2)} / ±₹${(m.numericalErrorRupees ?? 0).toFixed(2)}`
                      : m.calibrationQuality}
                  </td>
                  <td className="py-2 pl-2 text-[11px] text-slate-300">
                    <div>{m.applicabilityReason}</div>
                    <div className="text-slate-400">Limitation: {m.limitations}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
