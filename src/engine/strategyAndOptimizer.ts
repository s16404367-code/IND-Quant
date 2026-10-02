/**
 * M6 / M11 / M18 / M22 / M25 / Sections 25, 27–32, 47, 60, 128 / U11 / V4-7–V4-11 / V4-29 / V4-41 / V4-42:
 * Full Option-Strategy Library, Counter-Trade & "Protect Portfolio" Hedge Engine,
 * Pareto Frontier Multi-Objective Trade-Set Optimiser, 8-Dimension Risk-Budget Allocator,
 * Position Sizing (Fixed-Fractional / Vol-Target / Capped Kelly), and Strategy DSL Engine.
 */

export type StrategyFamilyCategory =
  | 'DIRECTIONAL'
  | 'VOLATILITY'
  | 'BUTTERFLIES_CONDORS'
  | 'CALENDAR_TERM_STRUCTURE'
  | 'SKEW_RISK_REVERSAL'
  | 'STOCK_PLUS_OPTION'
  | 'RELATIVE_VALUE'
  | 'PORTFOLIO_HEDGE';

export interface OptionStrategyTemplate {
  strategyId: string;
  strategyName: string;
  version: string;
  category: StrategyFamilyCategory;
  legCount: number;
  marginClass: 'UPFRONT_PREMIUM_ONLY' | 'HEDGED_DEFINED_RISK_SPAN' | 'PORTFOLIO_COVERED';
  hasUnlimitedShortRisk: false; // V4-7: Never silently introduce an unlimited-risk short leg
  thesisSupported: Array<'BULLISH' | 'BEARISH' | 'NEUTRAL_RANGE' | 'VOL_EXPANSION' | 'VOL_CRUSH' | 'RELATIVE_VALUE' | 'PORTFOLIO_PROTECTION'>;
  typicalCapitalRequiredNiftyRupees: number;
  typicalMaxLossNiftyRupees: number;
  typicalMaxProfitNiftyRupees: number | 'UNBOUNDED_UPSIDE';
  netDeltaSign: 'POSITIVE' | 'NEGATIVE' | 'NEAR_NEUTRAL';
  netGammaSign: 'POSITIVE' | 'NEGATIVE' | 'NEAR_NEUTRAL';
  netThetaSign: 'POSITIVE' | 'NEGATIVE' | 'NEAR_NEUTRAL';
  netVegaSign: 'POSITIVE' | 'NEGATIVE' | 'NEAR_NEUTRAL';
  executionComplexity: 'LOW (1 LEG)' | 'MEDIUM (2 LEGS)' | 'HIGH (3–4 LEGS)';
  settlementRiskNote: string;
  entryRule: string;
  confirmationRule: string;
  exitAndStopRule: string;
  noTradeCondition: string;
  graduationStatus: 'RESEARCH' | 'BACKTESTED' | 'OUT-OF-SAMPLE' | 'PAPER' | 'MANUAL-LIVE MONITORING';
}

export const FULL_OPTION_STRATEGY_CATALOGUE: OptionStrategyTemplate[] = [
  // DIRECTIONAL
  {
    strategyId: 'STRAT_LONG_CALL',
    strategyName: 'Long Call (Defined Premium Risk)',
    version: '4.0.0',
    category: 'DIRECTIONAL',
    legCount: 1,
    marginClass: 'UPFRONT_PREMIUM_ONLY',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['BULLISH', 'VOL_EXPANSION'],
    typicalCapitalRequiredNiftyRupees: 7800,
    typicalMaxLossNiftyRupees: 2340,
    typicalMaxProfitNiftyRupees: 'UNBOUNDED_UPSIDE',
    netDeltaSign: 'POSITIVE',
    netGammaSign: 'POSITIVE',
    netThetaSign: 'NEGATIVE',
    netVegaSign: 'POSITIVE',
    executionComplexity: 'LOW (1 LEG)',
    settlementRiskNote: 'Square off ITM options prior to expiry close to avoid 0.15% intrinsic exercise STT trap.',
    entryRule: 'Spot > VWAP + Opening Range High breakout + IV Rank < 55%',
    confirmationRule: 'Positive futures basis + Put OI addition at ATM strike',
    exitAndStopRule: 'Hard premium stop at -30% or VWAP breakdown; target +55% net after costs',
    noTradeCondition: 'Block if DTE <= 1 with IV Rank > 80% or spread > 1.5%',
    graduationStatus: 'MANUAL-LIVE MONITORING',
  },
  {
    strategyId: 'STRAT_LONG_PUT',
    strategyName: 'Long Put (Defined Premium Risk)',
    version: '4.0.0',
    category: 'DIRECTIONAL',
    legCount: 1,
    marginClass: 'UPFRONT_PREMIUM_ONLY',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['BEARISH', 'VOL_EXPANSION', 'PORTFOLIO_PROTECTION'],
    typicalCapitalRequiredNiftyRupees: 8100,
    typicalMaxLossNiftyRupees: 2430,
    typicalMaxProfitNiftyRupees: 'UNBOUNDED_UPSIDE',
    netDeltaSign: 'NEGATIVE',
    netGammaSign: 'POSITIVE',
    netThetaSign: 'NEGATIVE',
    netVegaSign: 'POSITIVE',
    executionComplexity: 'LOW (1 LEG)',
    settlementRiskNote: 'Square off ITM options prior to expiry close to avoid 0.15% intrinsic exercise STT trap.',
    entryRule: 'Spot < VWAP + Opening Range Low breakdown + breadth negative',
    confirmationRule: 'Call OI buildup at ATM strike + rising India VIX',
    exitAndStopRule: 'Hard stop at -30% premium; target 1.8x net risk',
    noTradeCondition: 'Block if put skew already > 95th percentile post-gap down',
    graduationStatus: 'MANUAL-LIVE MONITORING',
  },
  {
    strategyId: 'STRAT_BULL_CALL_SPREAD',
    strategyName: 'Bull Call Debit Spread (ATM Buy CE + OTM Sell CE)',
    version: '4.0.0',
    category: 'DIRECTIONAL',
    legCount: 2,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['BULLISH'],
    typicalCapitalRequiredNiftyRupees: 34000,
    typicalMaxLossNiftyRupees: 4800,
    typicalMaxProfitNiftyRupees: 8200,
    netDeltaSign: 'POSITIVE',
    netGammaSign: 'NEAR_NEUTRAL',
    netThetaSign: 'NEAR_NEUTRAL',
    netVegaSign: 'NEAR_NEUTRAL',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'Execute BUY Call leg first before SELL Call leg for hedged SPAN margin benefit.',
    entryRule: 'Moderately bullish regime + elevated IV Rank (>45%) where naked call theta is costly',
    confirmationRule: 'Implied forward premium positive + model dispersion Low/Moderate',
    exitAndStopRule: 'Exit at 70% of max spread profit or if underlying breaks support',
    noTradeCondition: 'Not executable under ₹10,000 capital tier due to short-leg SPAN margin',
    graduationStatus: 'MANUAL-LIVE MONITORING',
  },
  {
    strategyId: 'STRAT_BEAR_PUT_SPREAD',
    strategyName: 'Bear Put Debit Spread (ATM Buy PE + OTM Sell PE)',
    version: '4.0.0',
    category: 'DIRECTIONAL',
    legCount: 2,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['BEARISH', 'PORTFOLIO_PROTECTION'],
    typicalCapitalRequiredNiftyRupees: 35000,
    typicalMaxLossNiftyRupees: 4900,
    typicalMaxProfitNiftyRupees: 8100,
    netDeltaSign: 'NEGATIVE',
    netGammaSign: 'NEAR_NEUTRAL',
    netThetaSign: 'NEAR_NEUTRAL',
    netVegaSign: 'NEAR_NEUTRAL',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'Execute BUY Put leg first before SELL Put leg.',
    entryRule: 'Bearish trend pullback + steep put skew making OTM put sale attractive',
    confirmationRule: '25-delta risk reversal negative + sector breadth < 35%',
    exitAndStopRule: 'Exit at 70% max spread value or VWAP reclaim',
    noTradeCondition: 'Block if capital < ₹35,000',
    graduationStatus: 'OUT-OF-SAMPLE',
  },
  {
    strategyId: 'STRAT_BULL_PUT_SPREAD',
    strategyName: 'Bull Put Credit Spread (Defined-Risk OTM Put Spread)',
    version: '4.0.0',
    category: 'DIRECTIONAL',
    legCount: 2,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['BULLISH', 'NEUTRAL_RANGE', 'VOL_CRUSH'],
    typicalCapitalRequiredNiftyRupees: 42000,
    typicalMaxLossNiftyRupees: 7200,
    typicalMaxProfitNiftyRupees: 5800,
    netDeltaSign: 'POSITIVE',
    netGammaSign: 'NEGATIVE',
    netThetaSign: 'POSITIVE',
    netVegaSign: 'NEGATIVE',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'BUY further-OTM protective Put FIRST, then SELL nearer-OTM Put.',
    entryRule: 'Bullish/Range regime + VRP (IV - Forecast RV) > +2.5 vol pts',
    confirmationRule: 'Strong Put OI support cluster below short strike',
    exitAndStopRule: 'Close at 65% credit capture or if spot touches short strike',
    noTradeCondition: 'Block before major overnight event or if capital < ₹42,000',
    graduationStatus: 'PAPER',
  },
  {
    strategyId: 'STRAT_BEAR_CALL_SPREAD',
    strategyName: 'Bear Call Credit Spread (Defined-Risk OTM Call Spread)',
    version: '4.0.0',
    category: 'DIRECTIONAL',
    legCount: 2,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['BEARISH', 'NEUTRAL_RANGE', 'VOL_CRUSH'],
    typicalCapitalRequiredNiftyRupees: 42000,
    typicalMaxLossNiftyRupees: 7100,
    typicalMaxProfitNiftyRupees: 5900,
    netDeltaSign: 'NEGATIVE',
    netGammaSign: 'NEGATIVE',
    netThetaSign: 'POSITIVE',
    netVegaSign: 'NEGATIVE',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'BUY higher-strike protective Call FIRST, then SELL lower-strike Call.',
    entryRule: 'Range/Bearish regime + elevated IV percentile > 65%',
    confirmationRule: 'Heavy Call OI resistance above short strike',
    exitAndStopRule: 'Close at 65% credit capture or spot breach of short strike',
    noTradeCondition: 'Block if capital < ₹42,000',
    graduationStatus: 'PAPER',
  },
  // VOLATILITY
  {
    strategyId: 'STRAT_LONG_STRADDLE',
    strategyName: 'Long ATM Straddle (Buy ATM CE + Buy ATM PE)',
    version: '4.0.0',
    category: 'VOLATILITY',
    legCount: 2,
    marginClass: 'UPFRONT_PREMIUM_ONLY',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['VOL_EXPANSION'],
    typicalCapitalRequiredNiftyRupees: 16800,
    typicalMaxLossNiftyRupees: 5800,
    typicalMaxProfitNiftyRupees: 'UNBOUNDED_UPSIDE',
    netDeltaSign: 'NEAR_NEUTRAL',
    netGammaSign: 'POSITIVE',
    netThetaSign: 'NEGATIVE',
    netVegaSign: 'POSITIVE',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'Upfront premium only; high daily theta bleed requires catalyst or GARCH vol expansion.',
    entryRule: 'IV < Forecast RV (negative VRP) + compressed Bollinger/ATR regime break',
    confirmationRule: 'CUSUM volatility change-point alert active',
    exitAndStopRule: 'Time stop after 2 sessions if move < 0.6 sigma; profit target +35% net',
    noTradeCondition: 'Never enter when IV Rank > 70% ahead of known IV-crush event',
    graduationStatus: 'BACKTESTED',
  },
  {
    strategyId: 'STRAT_LONG_STRANGLE',
    strategyName: 'Long OTM Strangle (Buy OTM CE + Buy OTM PE)',
    version: '4.0.0',
    category: 'VOLATILITY',
    legCount: 2,
    marginClass: 'UPFRONT_PREMIUM_ONLY',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['VOL_EXPANSION'],
    typicalCapitalRequiredNiftyRupees: 9200,
    typicalMaxLossNiftyRupees: 3600,
    typicalMaxProfitNiftyRupees: 'UNBOUNDED_UPSIDE',
    netDeltaSign: 'NEAR_NEUTRAL',
    netGammaSign: 'POSITIVE',
    netThetaSign: 'NEGATIVE',
    netVegaSign: 'POSITIVE',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'Upfront premium only; requires large tail move beyond breakeven wings.',
    entryRule: 'Low IV cone (<20th percentile) + imminent macro breakout setup',
    confirmationRule: 'Both OTM legs pass <1.2% bid-ask spread filter',
    exitAndStopRule: 'Time stop at 50% DTE elapsed',
    noTradeCondition: 'Block on expiry day due to rapid OTM theta collapse',
    graduationStatus: 'BACKTESTED',
  },
  {
    strategyId: 'STRAT_CALL_BACKSPREAD',
    strategyName: 'Defined-Risk Call Ratio Backspread (Sell 1 ITM/ATM CE + Buy 2 OTM CE)',
    version: '4.0.0',
    category: 'VOLATILITY',
    legCount: 2,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['BULLISH', 'VOL_EXPANSION'],
    typicalCapitalRequiredNiftyRupees: 38000,
    typicalMaxLossNiftyRupees: 6500,
    typicalMaxProfitNiftyRupees: 'UNBOUNDED_UPSIDE',
    netDeltaSign: 'POSITIVE',
    netGammaSign: 'POSITIVE',
    netThetaSign: 'NEGATIVE',
    netVegaSign: 'POSITIVE',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'Execute 2x BUY Call legs first before 1x SELL Call leg.',
    entryRule: 'Strong bullish breakout + flat call skew',
    confirmationRule: 'Realized vol expanding above implied vol',
    exitAndStopRule: 'Exit if underlying stalls at upper strike pin',
    noTradeCondition: 'Block when call skew is already extreme',
    graduationStatus: 'RESEARCH',
  },
  // BUTTERFLIES / CONDORS
  {
    strategyId: 'STRAT_IRON_CONDOR',
    strategyName: 'Iron Condor (4-Leg Defined-Risk Range Credit Structure)',
    version: '4.0.0',
    category: 'BUTTERFLIES_CONDORS',
    legCount: 4,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['NEUTRAL_RANGE', 'VOL_CRUSH'],
    typicalCapitalRequiredNiftyRupees: 49500,
    typicalMaxLossNiftyRupees: 6800,
    typicalMaxProfitNiftyRupees: 6200,
    netDeltaSign: 'NEAR_NEUTRAL',
    netGammaSign: 'NEGATIVE',
    netThetaSign: 'POSITIVE',
    netVegaSign: 'NEGATIVE',
    executionComplexity: 'HIGH (3–4 LEGS)',
    settlementRiskNote: '8 orders round-trip (₹160 flat brokerage + STT/GST); buy both protective wings FIRST.',
    entryRule: 'Range regime + IV Percentile > 65% + VRP > +3 vol points',
    confirmationRule: 'Spot centered between max Call OI and max Put OI strikes',
    exitAndStopRule: 'Exit at 55% max net credit or if delta breaches ±0.28 on either short leg',
    noTradeCondition: 'Block if 8-order round-trip costs > 25% of max credit (Cost-Dominated check)',
    graduationStatus: 'OUT-OF-SAMPLE',
  },
  {
    strategyId: 'STRAT_IRON_BUTTERFLY',
    strategyName: 'Iron Butterfly (ATM Short Straddle + OTM Protective Wings)',
    version: '4.0.0',
    category: 'BUTTERFLIES_CONDORS',
    legCount: 4,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['NEUTRAL_RANGE', 'VOL_CRUSH'],
    typicalCapitalRequiredNiftyRupees: 46000,
    typicalMaxLossNiftyRupees: 5900,
    typicalMaxProfitNiftyRupees: 7100,
    netDeltaSign: 'NEAR_NEUTRAL',
    netGammaSign: 'NEGATIVE',
    netThetaSign: 'POSITIVE',
    netVegaSign: 'NEGATIVE',
    executionComplexity: 'HIGH (3–4 LEGS)',
    settlementRiskNote: 'High pin and legging risk; always execute long protective wings first.',
    entryRule: 'Post-event IV crush setup with strong mean-reverting VWAP pin',
    confirmationRule: 'Low realized volatility + high ATM IV',
    exitAndStopRule: 'Close at 45% max profit or if spot moves > 0.75x wing width',
    noTradeCondition: 'Block in trending regimes',
    graduationStatus: 'BACKTESTED',
  },
  {
    strategyId: 'STRAT_LONG_CALL_BUTTERFLY',
    strategyName: 'Long Call Butterfly (1-2-1 Defined-Debit Pin Structure)',
    version: '4.0.0',
    category: 'BUTTERFLIES_CONDORS',
    legCount: 3,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['BULLISH', 'NEUTRAL_RANGE'],
    typicalCapitalRequiredNiftyRupees: 39000,
    typicalMaxLossNiftyRupees: 2800,
    typicalMaxProfitNiftyRupees: 10200,
    netDeltaSign: 'NEAR_NEUTRAL',
    netGammaSign: 'NEGATIVE',
    netThetaSign: 'POSITIVE',
    netVegaSign: 'NEGATIVE',
    executionComplexity: 'HIGH (3–4 LEGS)',
    settlementRiskNote: 'Low debit outlay with high reward-to-risk near target pin strike.',
    entryRule: 'Target pin near Max Pain / high OI strike with 3–6 DTE',
    confirmationRule: 'Positive butterfly curvature on SVI surface',
    exitAndStopRule: 'Close before final 45 minutes on expiry day to avoid pin-exercise STT trap',
    noTradeCondition: 'Block if 6-order round-trip costs exceed 30% of net debit',
    graduationStatus: 'BACKTESTED',
  },
  // CALENDAR / TERM STRUCTURE
  {
    strategyId: 'STRAT_CALL_CALENDAR',
    strategyName: 'Horizontal Call Calendar Spread (Sell Near Expiry + Buy Next Expiry)',
    version: '4.0.0',
    category: 'CALENDAR_TERM_STRUCTURE',
    legCount: 2,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['NEUTRAL_RANGE', 'BULLISH'],
    typicalCapitalRequiredNiftyRupees: 51000,
    typicalMaxLossNiftyRupees: 5200,
    typicalMaxProfitNiftyRupees: 7400,
    netDeltaSign: 'NEAR_NEUTRAL',
    netGammaSign: 'NEGATIVE',
    netThetaSign: 'POSITIVE',
    netVegaSign: 'POSITIVE',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'SEBI Rule (U3): Calendar-spread margin benefit is REMOVED on expiry day of the near-month leg.',
    entryRule: 'Front-week IV > Back-week IV by >= 1.8 vol points (backwardated term structure)',
    confirmationRule: 'No scheduled jump event before near expiry',
    exitAndStopRule: 'Close at least 1 day prior to near-leg expiry to avoid expiry-day margin jump',
    noTradeCondition: 'Never hold into near-leg expiry day',
    graduationStatus: 'OUT-OF-SAMPLE',
  },
  // SKEW / STOCK + OPTION / RELATIVE VALUE / PORTFOLIO HEDGE
  {
    strategyId: 'STRAT_PROTECTIVE_PUT',
    strategyName: 'Portfolio Protective Put Overlay (Index / Stock Downside Floor)',
    version: '4.0.0',
    category: 'PORTFOLIO_HEDGE',
    legCount: 1,
    marginClass: 'UPFRONT_PREMIUM_ONLY',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['PORTFOLIO_PROTECTION'],
    typicalCapitalRequiredNiftyRupees: 6800,
    typicalMaxLossNiftyRupees: 6800,
    typicalMaxProfitNiftyRupees: 'UNBOUNDED_UPSIDE',
    netDeltaSign: 'NEGATIVE',
    netGammaSign: 'POSITIVE',
    netThetaSign: 'NEGATIVE',
    netVegaSign: 'POSITIVE',
    executionComplexity: 'LOW (1 LEG)',
    settlementRiskNote: 'Reduces portfolio 99% Expected Shortfall (ES) and caps tail drawdown.',
    entryRule: 'Portfolio Beta-weighted exposure > limit or pre-event protection trigger',
    confirmationRule: 'Put skew reasonable + liquid 5%-OTM or ATM put available',
    exitAndStopRule: 'Roll or monetize put when index drops > 3% or VIX spikes > 25',
    noTradeCondition: 'Compare against Collar if put IV > 90th percentile',
    graduationStatus: 'MANUAL-LIVE MONITORING',
  },
  {
    strategyId: 'STRAT_COLLAR_OVERLAY',
    strategyName: 'Zero/Low-Cost Portfolio Collar (Long Holdings + Buy OTM PE + Sell OTM CE)',
    version: '4.0.0',
    category: 'STOCK_PLUS_OPTION',
    legCount: 2,
    marginClass: 'PORTFOLIO_COVERED',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['PORTFOLIO_PROTECTION', 'NEUTRAL_RANGE'],
    typicalCapitalRequiredNiftyRupees: 44000,
    typicalMaxLossNiftyRupees: 4500,
    typicalMaxProfitNiftyRupees: 9500,
    netDeltaSign: 'NEGATIVE',
    netGammaSign: 'NEAR_NEUTRAL',
    netThetaSign: 'POSITIVE',
    netVegaSign: 'NEAR_NEUTRAL',
    executionComplexity: 'MEDIUM (2 LEGS)',
    settlementRiskNote: 'Finances downside put floor by capping upside above short call strike.',
    entryRule: 'Elevated overall IV where outright protective put is expensive',
    confirmationRule: 'Underlying equity/index holdings cover the short call leg',
    exitAndStopRule: 'Hold through event window or unwind both legs together',
    noTradeCondition: 'Do not sell call below desired portfolio exit target',
    graduationStatus: 'OUT-OF-SAMPLE',
  },
  {
    strategyId: 'STRAT_BOX_PARITY_RV',
    strategyName: 'Put-Call Parity / Box Spread Relative-Value Diagnostic',
    version: '4.0.0',
    category: 'RELATIVE_VALUE',
    legCount: 4,
    marginClass: 'HEDGED_DEFINED_RISK_SPAN',
    hasUnlimitedShortRisk: false,
    thesisSupported: ['RELATIVE_VALUE'],
    typicalCapitalRequiredNiftyRupees: 65000,
    typicalMaxLossNiftyRupees: 1200,
    typicalMaxProfitNiftyRupees: 1800,
    netDeltaSign: 'NEAR_NEUTRAL',
    netGammaSign: 'NEAR_NEUTRAL',
    netThetaSign: 'POSITIVE',
    netVegaSign: 'NEAR_NEUTRAL',
    executionComplexity: 'HIGH (3–4 LEGS)',
    settlementRiskNote: 'Retail 8-leg round-trip STT (0.15%) + bid-ask + legging risk almost always eliminates theoretical box arbitrage.',
    entryRule: 'Parity deviation > round-trip 8-order costs + 2x bid-ask spread + legging buffer',
    confirmationRule: 'All 4 strikes simultaneously deep & liquid',
    exitAndStopRule: 'Unwind on parity convergence',
    noTradeCondition: 'Almost always NO TRADE for manual retail due to STT & legging risk (V4-16)',
    graduationStatus: 'RESEARCH',
  },
];

/**
 * Sections 27–31, 60, V4-41: Counter-Trade / Hedge & "Protect Portfolio" Engine
 */
export interface HedgeProposal {
  hedgeId: string;
  hedgeName: string;
  hedgeType: 'SAME_UNDERLYING_SPREAD' | 'INDEX_BETA_HEDGE' | 'SECTOR_COUNTER_HEDGE' | 'CROSS_STOCK_RELATIVE' | 'SIZE_REDUCTION_ACTION' | 'DO_NOTHING';
  instrumentDescription: string;
  upfrontHedgeCostRupees: number;
  marginImpactRupees: number;
  deltaReductionPct: number;
  esTailRiskReductionPct: number;
  residualDownsideAt5PctCrashRupees: number;
  basisRiskLevel: 'NONE (EXACT PAYOFF)' | 'LOW' | 'MEDIUM (BETA/CORRELATION BASIS)' | 'HIGH';
  historicalCorrelation: number;
  tradeOffSummary: string;
}

export function generateCounterTradeAndProtectionOptions(params: {
  underlying: string;
  spot: number;
  lotSize: number;
  portfolioDeltaRupeesPer1Pct: number;
  portfolioEs99Rupees: number;
  candidateDeltaRupeesPer1Pct: number;
  availableCapitalRupees: number;
}): {
  withoutHedgeSummary: {
    netDeltaRupeesPer1Pct: number;
    estimatedEs99Rupees: number;
    stressLossAtMinus5PctRupees: number;
  };
  hedgeProposals: HedgeProposal[];
} {
  const {
    underlying,
    spot,
    lotSize,
    portfolioDeltaRupeesPer1Pct,
    portfolioEs99Rupees,
    candidateDeltaRupeesPer1Pct,
    availableCapitalRupees,
  } = params;

  const combinedDelta = portfolioDeltaRupeesPer1Pct + candidateDeltaRupeesPer1Pct;
  const stressLoss5Pct = Math.abs(Math.min(0, combinedDelta * -5)) + portfolioEs99Rupees * 0.4;

  const proposals: HedgeProposal[] = [
    {
      hedgeId: 'HEDGE_A_NIFTY_PUT',
      hedgeName: 'Hedge A: Buy 1 Lot NIFTY 2%-OTM Protective Put',
      hedgeType: 'INDEX_BETA_HEDGE',
      instrumentDescription: `BUY 1 Lot (65 qty) NIFTY ${Math.round((spot * 0.98) / 50) * 50} PE`,
      upfrontHedgeCostRupees: 5850,
      marginImpactRupees: 5850,
      deltaReductionPct: 68,
      esTailRiskReductionPct: 62,
      residualDownsideAt5PctCrashRupees: stressLoss5Pct * 0.38 + 5850,
      basisRiskLevel: underlying === 'NIFTY' ? 'NONE (EXACT PAYOFF)' : 'MEDIUM (BETA/CORRELATION BASIS)',
      historicalCorrelation: underlying === 'NIFTY' ? 1.0 : 0.78,
      tradeOffSummary:
        availableCapitalRupees >= 12000
          ? 'Convex downside protection during crash + VIX spike; costs ₹5,850 upfront premium.'
          : 'Upfront put cost consumes significant share of small ₹10K capital.',
    },
    {
      hedgeId: 'HEDGE_B_VERTICAL_SPREAD_CAP',
      hedgeName: 'Hedge B: Convert Naked Long Option into Vertical Spread (Sell OTM Leg)',
      hedgeType: 'SAME_UNDERLYING_SPREAD',
      instrumentDescription: `SELL 1 Lot (${lotSize} qty) ${underlying} +200pt OTM Option against Long Leg`,
      upfrontHedgeCostRupees: -2900, // Reduces net debit by ₹2,900
      marginImpactRupees: 28500,    // Requires hedged SPAN margin
      deltaReductionPct: 36,
      esTailRiskReductionPct: 41,
      residualDownsideAt5PctCrashRupees: stressLoss5Pct * 0.59,
      basisRiskLevel: 'NONE (EXACT PAYOFF)',
      historicalCorrelation: 1.0,
      tradeOffSummary:
        availableCapitalRupees >= 35000
          ? 'Reduces theta decay by 65% and lowers breakeven, but requires ~₹34.5K hedged SPAN margin and caps upside.'
          : 'NOT EXECUTABLE WITH ₹10,000 due to short-leg SPAN + Exposure margin requirement.',
    },
    {
      hedgeId: 'HEDGE_C_REDUCE_EXPOSURE',
      hedgeName: 'Hedge C: Risk-Reducing Action — Trim Correlated Exposure by 40% (V4-41)',
      hedgeType: 'SIZE_REDUCTION_ACTION',
      instrumentDescription: 'Reduce existing high-beta position size or skip adding correlated delta',
      upfrontHedgeCostRupees: 0,
      marginImpactRupees: -8000,
      deltaReductionPct: 40,
      esTailRiskReductionPct: 40,
      residualDownsideAt5PctCrashRupees: stressLoss5Pct * 0.6,
      basisRiskLevel: 'NONE (EXACT PAYOFF)',
      historicalCorrelation: 1.0,
      tradeOffSummary: 'Zero option premium decay and zero basis risk; directly lowers portfolio ES and frees margin.',
    },
    {
      hedgeId: 'HEDGE_D_DO_NOTHING',
      hedgeName: 'Hedge D: DO NOTHING / Hold Cash Buffer (V4-41)',
      hedgeType: 'DO_NOTHING',
      instrumentDescription: 'Maintain cash buffer without paying option premium drag',
      upfrontHedgeCostRupees: 0,
      marginImpactRupees: 0,
      deltaReductionPct: 0,
      esTailRiskReductionPct: 0,
      residualDownsideAt5PctCrashRupees: stressLoss5Pct,
      basisRiskLevel: 'NONE (EXACT PAYOFF)',
      historicalCorrelation: 1.0,
      tradeOffSummary: 'Valid choice when hedge cost exceeds expected tail reduction or portfolio risk is already within limits.',
    },
  ];

  return {
    withoutHedgeSummary: {
      netDeltaRupeesPer1Pct: combinedDelta,
      estimatedEs99Rupees: portfolioEs99Rupees,
      stressLossAtMinus5PctRupees: stressLoss5Pct,
    },
    hedgeProposals: proposals,
  };
}

/**
 * V4-9, V4-10, V4-11, V4-42: Pareto Frontier Trade-Set Comparison,
 * Multi-Objective Optimiser & 8-Dimension Risk-Budget Allocator
 */
export type ParetoOptimizationObjective =
  | 'MAXIMISE EXPECTED NET P&L'
  | 'MAXIMISE NET P&L / RISK'
  | 'MINIMISE EXPECTED DRAWDOWN'
  | 'MINIMISE TAIL RISK'
  | 'MINIMISE CAPITAL'
  | 'MINIMISE HEDGE COST'
  | 'MAXIMISE LIQUIDITY'
  | 'BALANCED OBJECTIVE';

export interface ParetoCandidateStructure {
  candidateId: string;
  structureName: string;
  underlying: string;
  legsDescription: string;
  lots: number;
  expectedNetPnlRupees: number;
  maxLossRupees: number;
  expectedShortfallRupees: number;
  capitalRequiredRupees: number;
  marginRequiredRupees: number;
  liquidityCostRupees: number;
  slippageRupees: number;
  netThetaPerDayRupees: number;
  netVegaPer1PctRupees: number;
  netGammaRupees: number;
  portfolioDeltaChangeRupees: number;
  portfolioEsChangeRupees: number;
  hedgeCostRupees: number;
  modelUncertaintyRupees: number;
  executionComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  // V4-42 Capital Efficiency Ratios
  efficiencyNetPnlOverCapital: number;
  efficiencyNetPnlOverMaxLoss: number;
  efficiencyNetPnlOverEs: number;
  isParetoNonDominated: boolean;
  feasibleAtCurrentCapital: boolean;
  objectiveScore: number;
}

export interface RiskBudgetDimension {
  dimensionName: string;
  budgetCapValue: number;
  currentConsumedValue: number;
  candidateAddedValue: number;
  unit: string;
  utilizationPctAfterCandidate: number;
  isBindingConstraint: boolean;
}

export function buildParetoFrontierAndRiskBudgets(params: {
  underlying: string;
  spot: number;
  availableCapitalRupees: number;
  selectedObjective: ParetoOptimizationObjective;
  lotSize: number;
}): {
  selectedObjective: ParetoOptimizationObjective;
  candidates: ParetoCandidateStructure[];
  riskBudgets: RiskBudgetDimension[];
  bindingConstraints: string[];
} {
  const { underlying, spot, availableCapitalRupees, selectedObjective, lotSize } = params;
  const atmStrike = Math.round(spot / 50) * 50;

  const rawStructures: Omit<
    ParetoCandidateStructure,
    | 'efficiencyNetPnlOverCapital'
    | 'efficiencyNetPnlOverMaxLoss'
    | 'efficiencyNetPnlOverEs'
    | 'isParetoNonDominated'
    | 'feasibleAtCurrentCapital'
    | 'objectiveScore'
  >[] = [
    {
      candidateId: 'CAND_A_AFFORDABLE_CE',
      structureName: `Candidate A: 1 Lot Affordable OTM Call (${atmStrike + 100} CE)`,
      underlying,
      legsDescription: `BUY 1 Lot (${lotSize} qty) ${atmStrike + 100} CE @ ₹84.00`,
      lots: 1,
      expectedNetPnlRupees: 890,
      maxLossRupees: 1690, // With hard stop at ₹58
      expectedShortfallRupees: 1850,
      capitalRequiredRupees: 84 * lotSize, // ₹5,460 for 65 lot
      marginRequiredRupees: 84 * lotSize,
      liquidityCostRupees: 48,
      slippageRupees: 32,
      netThetaPerDayRupees: -410,
      netVegaPer1PctRupees: +280,
      netGammaRupees: +95,
      portfolioDeltaChangeRupees: +2450,
      portfolioEsChangeRupees: +1200,
      hedgeCostRupees: 0,
      modelUncertaintyRupees: 95,
      executionComplexity: 'LOW',
    },
    {
      candidateId: 'CAND_B_BULL_CALL_SPREAD',
      structureName: `Candidate B: Bull Call Spread (Buy ${atmStrike} CE / Sell ${atmStrike + 200} CE)`,
      underlying,
      legsDescription: `BUY ${atmStrike} CE @ ₹142 + SELL ${atmStrike + 200} CE @ ₹64 (${lotSize} qty)`,
      lots: 1,
      expectedNetPnlRupees: 1420,
      maxLossRupees: 5070,
      expectedShortfallRupees: 4200,
      capitalRequiredRupees: 34200,
      marginRequiredRupees: 34200,
      liquidityCostRupees: 112,
      slippageRupees: 65,
      netThetaPerDayRupees: -115,
      netVegaPer1PctRupees: +85,
      netGammaRupees: +25,
      portfolioDeltaChangeRupees: +1650,
      portfolioEsChangeRupees: +680,
      hedgeCostRupees: 0,
      modelUncertaintyRupees: 68,
      executionComplexity: 'MEDIUM',
    },
    {
      candidateId: 'CAND_C_HEDGED_CALL_PLUS_PUT_WING',
      structureName: `Candidate C: Long ${atmStrike + 50} CE + Partial Index Put Hedge`,
      underlying,
      legsDescription: `BUY 1 Lot ${atmStrike + 50} CE + BUY 1 Lot Far-OTM Tail Put Hedge`,
      lots: 1,
      expectedNetPnlRupees: 710,
      maxLossRupees: 1450,
      expectedShortfallRupees: 1120,
      capitalRequiredRupees: 8950,
      marginRequiredRupees: 8950,
      liquidityCostRupees: 96,
      slippageRupees: 58,
      netThetaPerDayRupees: -520,
      netVegaPer1PctRupees: +390,
      netGammaRupees: +130,
      portfolioDeltaChangeRupees: +1720,
      portfolioEsChangeRupees: -420, // Reduces tail ES!
      hedgeCostRupees: 1650,
      modelUncertaintyRupees: 110,
      executionComplexity: 'MEDIUM',
    },
    {
      candidateId: 'CAND_D_CALL_CALENDAR',
      structureName: `Candidate D: Horizontal Call Calendar (${atmStrike + 100} CE Near/Next)`,
      underlying,
      legsDescription: `SELL Near ${atmStrike + 100} CE + BUY Next-Week ${atmStrike + 100} CE`,
      lots: 1,
      expectedNetPnlRupees: 1180,
      maxLossRupees: 3900,
      expectedShortfallRupees: 3400,
      capitalRequiredRupees: 49800,
      marginRequiredRupees: 49800,
      liquidityCostRupees: 128,
      slippageRupees: 78,
      netThetaPerDayRupees: +310,
      netVegaPer1PctRupees: +340,
      netGammaRupees: -65,
      portfolioDeltaChangeRupees: +320,
      portfolioEsChangeRupees: +490,
      hedgeCostRupees: 0,
      modelUncertaintyRupees: 125,
      executionComplexity: 'MEDIUM',
    },
  ];

  const scoreForObjective = (
    c: (typeof rawStructures)[number],
    obj: ParetoOptimizationObjective
  ): number => {
    switch (obj) {
      case 'MAXIMISE EXPECTED NET P&L':
        return c.expectedNetPnlRupees;
      case 'MAXIMISE NET P&L / RISK':
        return (c.expectedNetPnlRupees / Math.max(1, c.maxLossRupees)) * 100;
      case 'MINIMISE EXPECTED DRAWDOWN':
        return 10000 - c.maxLossRupees;
      case 'MINIMISE TAIL RISK':
        return 10000 - c.expectedShortfallRupees;
      case 'MINIMISE CAPITAL':
        return 100000 - c.capitalRequiredRupees;
      case 'MINIMISE HEDGE COST':
        return 5000 - c.hedgeCostRupees;
      case 'MAXIMISE LIQUIDITY':
        return 500 - c.liquidityCostRupees;
      case 'BALANCED OBJECTIVE':
      default:
        return (
          (c.expectedNetPnlRupees / Math.max(1, c.maxLossRupees)) * 50 +
          (c.expectedNetPnlRupees / Math.max(1, c.capitalRequiredRupees)) * 200 -
          c.liquidityCostRupees * 0.1
        );
    }
  };

  const candidates: ParetoCandidateStructure[] = rawStructures.map((c) => {
    // Check Pareto dominance: B dominates A if B has higher expectedNetPnl, lower maxLoss, AND lower capitalRequired
    const dominated = rawStructures.some(
      (other) =>
        other.candidateId !== c.candidateId &&
        other.expectedNetPnlRupees >= c.expectedNetPnlRupees &&
        other.maxLossRupees <= c.maxLossRupees &&
        other.capitalRequiredRupees <= c.capitalRequiredRupees &&
        (other.expectedNetPnlRupees > c.expectedNetPnlRupees ||
          other.maxLossRupees < c.maxLossRupees ||
          other.capitalRequiredRupees < c.capitalRequiredRupees)
    );

    return {
      ...c,
      efficiencyNetPnlOverCapital: (c.expectedNetPnlRupees / Math.max(1, c.capitalRequiredRupees)) * 100,
      efficiencyNetPnlOverMaxLoss: (c.expectedNetPnlRupees / Math.max(1, c.maxLossRupees)) * 100,
      efficiencyNetPnlOverEs: (c.expectedNetPnlRupees / Math.max(1, c.expectedShortfallRupees)) * 100,
      isParetoNonDominated: !dominated,
      feasibleAtCurrentCapital: c.capitalRequiredRupees <= availableCapitalRupees,
      objectiveScore: scoreForObjective(c, selectedObjective),
    };
  });

  candidates.sort((a, b) => b.objectiveScore - a.objectiveScore);

  // V4-11: 8-Dimension Risk-Budget Allocation
  const riskBudgets: RiskBudgetDimension[] = [
    {
      dimensionName: 'Delta Risk Budget (per 1% move)',
      budgetCapValue: Math.max(3000, availableCapitalRupees * 0.35),
      currentConsumedValue: availableCapitalRupees * 0.08,
      candidateAddedValue: 2450,
      unit: '₹',
      utilizationPctAfterCandidate:
        ((availableCapitalRupees * 0.08 + 2450) / Math.max(3000, availableCapitalRupees * 0.35)) * 100,
      isBindingConstraint: false,
    },
    {
      dimensionName: 'Gamma Convexity Budget',
      budgetCapValue: 1500,
      currentConsumedValue: 220,
      candidateAddedValue: 95,
      unit: '₹',
      utilizationPctAfterCandidate: ((220 + 95) / 1500) * 100,
      isBindingConstraint: false,
    },
    {
      dimensionName: 'Vega Volatility Budget (per 1% IV)',
      budgetCapValue: 2500,
      currentConsumedValue: 410,
      candidateAddedValue: 280,
      unit: '₹',
      utilizationPctAfterCandidate: ((410 + 280) / 2500) * 100,
      isBindingConstraint: false,
    },
    {
      dimensionName: 'Tail Expected Shortfall (ES 99%) Budget',
      budgetCapValue: Math.max(2200, availableCapitalRupees * 0.18),
      currentConsumedValue: availableCapitalRupees * 0.05,
      candidateAddedValue: 1200,
      unit: '₹',
      utilizationPctAfterCandidate:
        ((availableCapitalRupees * 0.05 + 1200) / Math.max(2200, availableCapitalRupees * 0.18)) * 100,
      isBindingConstraint: availableCapitalRupees <= 10000,
    },
    {
      dimensionName: 'Capital & SPAN Margin Budget',
      budgetCapValue: availableCapitalRupees * 0.85,
      currentConsumedValue: 0,
      candidateAddedValue: 84 * lotSize,
      unit: '₹',
      utilizationPctAfterCandidate: ((84 * lotSize) / Math.max(1, availableCapitalRupees * 0.85)) * 100,
      isBindingConstraint: availableCapitalRupees <= 10000,
    },
    {
      dimensionName: 'Liquidity & Spread Slippage Budget',
      budgetCapValue: 250,
      currentConsumedValue: 30,
      candidateAddedValue: 48,
      unit: '₹',
      utilizationPctAfterCandidate: ((30 + 48) / 250) * 100,
      isBindingConstraint: false,
    },
    {
      dimensionName: 'Event Variance Risk Budget',
      budgetCapValue: 100,
      currentConsumedValue: 15,
      candidateAddedValue: 20,
      unit: '%',
      utilizationPctAfterCandidate: 35,
      isBindingConstraint: false,
    },
    {
      dimensionName: 'Overnight Gap Exposure Budget',
      budgetCapValue: Math.max(1500, availableCapitalRupees * 0.12),
      currentConsumedValue: 0,
      candidateAddedValue: 0, // Intraday closed
      unit: '₹',
      utilizationPctAfterCandidate: 0,
      isBindingConstraint: false,
    },
  ];

  const bindingConstraints = riskBudgets
    .filter((b) => b.isBindingConstraint || b.utilizationPctAfterCandidate >= 75)
    .map((b) => `${b.dimensionName} (${b.utilizationPctAfterCandidate.toFixed(1)}% utilized)`);

  return {
    selectedObjective,
    candidates,
    riskBudgets,
    bindingConstraints,
  };
}

/**
 * U11.1 Position Sizing Engine (Fixed-Fractional, Volatility-Targeted, Capped Fractional Kelly)
 */
export interface PositionSizingComparison {
  capitalRupees: number;
  lotSize: number;
  optionPremium: number;
  stopLossPerUnitRupees: number;
  lossPerSingleLotAtStopRupees: number;
  methods: Array<{
    methodName: string;
    targetRiskRupees: number;
    rawUnroundedLots: number;
    integerLotsRecommended: number;
    status: 'EXECUTABLE' | 'NOT EXECUTABLE AT THIS RISK LIMIT';
    explanation: string;
  }>;
}

export function comparePositionSizingMethods(params: {
  capitalRupees: number;
  fixedRiskPct: number; // e.g., 1.0% or 2.0%
  lotSize: number;
  optionPremium: number;
  stopLossPrice: number;
  winProbPMeasure: number;
  netRewardToRiskRatio: number;
  currentAnnualizedVol: number;
  targetAnnualizedVol?: number;
}): PositionSizingComparison {
  const {
    capitalRupees,
    fixedRiskPct,
    lotSize,
    optionPremium,
    stopLossPrice,
    winProbPMeasure: p,
    netRewardToRiskRatio: b,
    currentAnnualizedVol,
    targetAnnualizedVol = 0.15,
  } = params;

  const stopLossPerUnitRupees = Math.max(1, optionPremium - stopLossPrice);
  const lossPerSingleLotAtStopRupees = stopLossPerUnitRupees * lotSize;

  // 1. Fixed-Fractional Risk
  const fixedRiskRupees = capitalRupees * (fixedRiskPct / 100);
  const rawFixedLots = fixedRiskRupees / lossPerSingleLotAtStopRupees;
  const intFixedLots = Math.floor(rawFixedLots);

  // 2. Volatility-Targeted Sizing
  const volScale = Math.min(1.5, targetAnnualizedVol / Math.max(0.05, currentAnnualizedVol));
  const volTargetRiskRupees = fixedRiskRupees * volScale;
  const rawVolLots = volTargetRiskRupees / lossPerSingleLotAtStopRupees;
  const intVolLots = Math.floor(rawVolLots);

  // 3. Capped Quarter-Kelly with 0.65 Parameter-Uncertainty Shrinkage (U11.1)
  const fullKelly = b > 0 ? Math.max(0, p - (1 - p) / b) : 0;
  const shrunkQuarterKelly = Math.min(0.025, fullKelly * 0.25 * 0.65); // Capped at 2.5% of capital
  const kellyRiskRupees = capitalRupees * shrunkQuarterKelly;
  const rawKellyLots = kellyRiskRupees / lossPerSingleLotAtStopRupees;
  const intKellyLots = Math.floor(rawKellyLots);

  return {
    capitalRupees,
    lotSize,
    optionPremium,
    stopLossPerUnitRupees,
    lossPerSingleLotAtStopRupees,
    methods: [
      {
        methodName: `Fixed-Fractional Risk (${fixedRiskPct.toFixed(1)}% of Capital)`,
        targetRiskRupees: fixedRiskRupees,
        rawUnroundedLots: rawFixedLots,
        integerLotsRecommended: intFixedLots,
        status: intFixedLots >= 1 ? 'EXECUTABLE' : 'NOT EXECUTABLE AT THIS RISK LIMIT',
        explanation:
          intFixedLots >= 1
            ? `${intFixedLots} lot(s) keeps stop-loss risk (₹${(intFixedLots * lossPerSingleLotAtStopRupees).toFixed(0)}) within ₹${fixedRiskRupees.toFixed(0)} budget.`
            : `NOT EXECUTABLE AT THIS RISK LIMIT (U11.1): 1 minimum lot stop-loss (₹${lossPerSingleLotAtStopRupees.toFixed(0)}) exceeds ${fixedRiskPct.toFixed(1)}% risk budget (₹${fixedRiskRupees.toFixed(0)}). Never round a lot up silently.`,
      },
      {
        methodName: `Volatility-Targeted Sizing (Target ${(targetAnnualizedVol * 100).toFixed(0)}% Vol)`,
        targetRiskRupees: volTargetRiskRupees,
        rawUnroundedLots: rawVolLots,
        integerLotsRecommended: intVolLots,
        status: intVolLots >= 1 ? 'EXECUTABLE' : 'NOT EXECUTABLE AT THIS RISK LIMIT',
        explanation: `Scales risk budget by ${volScale.toFixed(2)}x based on current annualized volatility (${(currentAnnualizedVol * 100).toFixed(1)}%).`,
      },
      {
        methodName: 'Capped Quarter-Kelly (with 35% Parameter-Uncertainty Shrinkage)',
        targetRiskRupees: kellyRiskRupees,
        rawUnroundedLots: rawKellyLots,
        integerLotsRecommended: intKellyLots,
        status: intKellyLots >= 1 ? 'EXECUTABLE' : 'NOT EXECUTABLE AT THIS RISK LIMIT',
        explanation: `Full Kelly = ${(fullKelly * 100).toFixed(1)}%; shrunk Quarter-Kelly cap allocates ${(shrunkQuarterKelly * 100).toFixed(2)}% (₹${kellyRiskRupees.toFixed(0)}).`,
      },
    ],
  };
}

/**
 * M25 / V4-29: Strategy DSL / Visual No-Code Hypothesis Rule Evaluator
 */
export interface StrategyDslCondition {
  variable: 'IV_PERCENTILE' | 'PRICE_VS_VWAP_PCT' | 'MARKET_BREADTH_PCT' | 'OPTION_SPREAD_PCT' | 'EVENT_ABSENT' | 'VRP_VOL_POINTS';
  operator: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
}

export interface StrategyDslDefinition {
  hypothesisId: string;
  hypothesisTitle: string;
  version: string;
  createdAtIso: string;
  targetStrategyId: string;
  conditions: StrategyDslCondition[];
  registeredInHypothesisRegistry: boolean;
}

export function evaluateStrategyDsl(
  dsl: StrategyDslDefinition,
  marketSnapshot: {
    ivPercentile: number;
    priceVsVwapPct: number;
    marketBreadthPct: number;
    optionSpreadPct: number;
    eventAbsent: number; // 1 = true, 0 = false
    vrpVolPoints: number;
  }
): {
  triggered: boolean;
  conditionResults: Array<{ conditionText: string; actualValue: number; passed: boolean }>;
} {
  const conditionResults = dsl.conditions.map((c) => {
    const valMap: Record<StrategyDslCondition['variable'], number> = {
      IV_PERCENTILE: marketSnapshot.ivPercentile,
      PRICE_VS_VWAP_PCT: marketSnapshot.priceVsVwapPct,
      MARKET_BREADTH_PCT: marketSnapshot.marketBreadthPct,
      OPTION_SPREAD_PCT: marketSnapshot.optionSpreadPct,
      EVENT_ABSENT: marketSnapshot.eventAbsent,
      VRP_VOL_POINTS: marketSnapshot.vrpVolPoints,
    };
    const actual = valMap[c.variable];
    let passed = false;
    if (c.operator === '>') passed = actual > c.threshold;
    else if (c.operator === '<') passed = actual < c.threshold;
    else if (c.operator === '>=') passed = actual >= c.threshold;
    else if (c.operator === '<=') passed = actual <= c.threshold;
    else passed = Math.abs(actual - c.threshold) < 1e-6;

    return {
      conditionText: `${c.variable} ${c.operator} ${c.threshold}`,
      actualValue: actual,
      passed,
    };
  });

  return {
    triggered: conditionResults.every((r) => r.passed),
    conditionResults,
  };
}
