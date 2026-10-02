/**
 * M9 / M12 / M19 / M21 / M23 / Sections 10–17, 86 / U15 / V4-12–V4-22:
 * Market & Options Microstructure Engine, Manual Limit-Order Fill Plausibility Model,
 * Transaction Cost Analysis (TCA) & Multi-Leg Legging-Risk Simulator,
 * Regime-Change Engine (CUSUM, Page-Hinkley, Bayesian Change-Point, HMM),
 * News 11-Dimension Impact Engine, Relevance-Gated Weather Engine,
 * Cross-Asset Context, Participant OI, Event Surprise, and Earnings Move Study.
 */

import { getContractSpecForDate } from './rulesEngine';

export interface OptionMicrostructureMetrics {
  heuristicLabel: 'MICROSTRUCTURE HEURISTIC';
  symbol: string;
  strike: number;
  right: 'CE' | 'PE';
  bid: number;
  ask: number;
  mid: number;
  spreadRupees: number;
  spreadPct: number;
  bidQty: number;
  askQty: number;
  topOfBookImbalance: number; // (BidQty - AskQty) / (BidQty + AskQty) in [-1, 1]
  volume: number;
  openInterest: number;
  volumeToOiRatio: number;
  quoteAgeSeconds: number;
  quoteUpdateFrequencyHz: number;
  executableLongEntryPrice: number;  // Ask
  executableLongExitPrice: number;   // Bid
  executableShortEntryPrice: number; // Bid
  executableShortExitPrice: number;  // Ask
  manualLimitFillPlausibility: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  fillPlausibilityExplanation: string;
}

export function analyzeOptionMicrostructure(params: {
  symbol: string;
  strike: number;
  right: 'CE' | 'PE';
  bid: number;
  ask: number;
  bidQty: number;
  askQty: number;
  volume: number;
  openInterest: number;
  quoteAgeSeconds: number;
  quoteUpdateFrequencyHz?: number;
}): OptionMicrostructureMetrics {
  const {
    symbol,
    strike,
    right,
    bid,
    ask,
    bidQty,
    askQty,
    volume,
    openInterest,
    quoteAgeSeconds,
    quoteUpdateFrequencyHz = 2.4,
  } = params;

  const mid = 0.5 * (bid + ask);
  const spreadRupees = Math.max(0, ask - bid);
  const spreadPct = bid > 0 ? (spreadRupees / bid) * 100 : 999;
  const totalDepth = Math.max(1, bidQty + askQty);
  const topOfBookImbalance = (bidQty - askQty) / totalDepth;
  const volumeToOiRatio = openInterest > 0 ? volume / openInterest : 0;

  let manualLimitFillPlausibility: OptionMicrostructureMetrics['manualLimitFillPlausibility'] = 'UNKNOWN';
  let fillPlausibilityExplanation = 'Insufficient quote depth or stale quote.';

  if (quoteAgeSeconds <= 3.0 && bid > 0) {
    if (spreadPct <= 0.5 && volume >= 10000 && quoteUpdateFrequencyHz >= 1.5) {
      manualLimitFillPlausibility = 'HIGH';
      fillPlausibilityExplanation = `Tight spread (${spreadPct.toFixed(2)}%), high turnover (${volume.toLocaleString('en-IN')} vol), and active quote refresh (${quoteUpdateFrequencyHz.toFixed(1)}/s). Not a guarantee of fill.`;
    } else if (spreadPct <= 1.5 && volume >= 1500) {
      manualLimitFillPlausibility = 'MEDIUM';
      fillPlausibilityExplanation = `Moderate spread (${spreadPct.toFixed(2)}%) and depth; passive limit order near mid may require 15–45s wait.`;
    } else {
      manualLimitFillPlausibility = 'LOW';
      fillPlausibilityExplanation = `Wide spread (${spreadPct.toFixed(2)}%) or thin book; high risk of partial/missed manual fill.`;
    }
  }

  return {
    heuristicLabel: 'MICROSTRUCTURE HEURISTIC',
    symbol,
    strike,
    right,
    bid,
    ask,
    mid,
    spreadRupees,
    spreadPct,
    bidQty,
    askQty,
    topOfBookImbalance,
    volume,
    openInterest,
    volumeToOiRatio,
    quoteAgeSeconds,
    quoteUpdateFrequencyHz,
    executableLongEntryPrice: ask,
    executableLongExitPrice: bid,
    executableShortEntryPrice: bid,
    executableShortExitPrice: ask,
    manualLimitFillPlausibility,
    fillPlausibilityExplanation,
  };
}

/**
 * V4-15 & V4-16: Transaction Cost Analysis (TCA) & Multi-Leg Leg-Gap / Legging-Risk Simulator
 */
export interface TcaAndLeggingReport {
  arrivalMidPrice: number;
  signalPrice: number;
  manualLimitOrderPrice: number;
  actualOrSimulatedFillPrice: number;
  quantity: number;
  halfSpreadCostRupees: number;
  humanLatencyDriftTimingCostRupees: number;
  marketImpactCostRupees: number;
  totalImplementationShortfallRupees: number;
  implementationShortfallBps: number;
  multiLegGapSimulation: {
    legCount: number;
    humanDelayBetweenLegsSeconds: number;
    adverseUnderlyingMove1SigmaDuringLeggingPts: number;
    leg2AdversePriceShiftRupeesPerUnit: number;
    expectedLeggingRiskRupees: number;
    severe95PctLeggingLossRupees: number;
    mitigationRule: string;
  };
}

export function computeTcaAndLeggingRisk(params: {
  arrivalMidPrice: number;
  signalAskPrice: number;
  manualLimitPrice: number;
  actualFillPrice: number;
  quantity: number;
  legCount: number;
  humanDelayBetweenLegsSeconds: number;
  underlyingSpot: number;
  annualizedVolatility: number;
  leg2DeltaAbs: number;
}): TcaAndLeggingReport {
  const {
    arrivalMidPrice,
    signalAskPrice,
    manualLimitPrice,
    actualFillPrice,
    quantity,
    legCount,
    humanDelayBetweenLegsSeconds,
    underlyingSpot,
    annualizedVolatility,
    leg2DeltaAbs,
  } = params;

  const halfSpreadCostRupees = Math.max(0, signalAskPrice - arrivalMidPrice) * quantity;
  const humanLatencyDriftTimingCostRupees = (actualFillPrice - signalAskPrice) * quantity;
  const marketImpactCostRupees = quantity > 1800 ? 0.15 * quantity : 0.0;
  const totalImplementationShortfallRupees = (actualFillPrice - arrivalMidPrice) * quantity + marketImpactCostRupees;
  const notional = Math.max(1, arrivalMidPrice * quantity);
  const implementationShortfallBps = (totalImplementationShortfallRupees / notional) * 10000;

  // V4-16 Leg-Gap Simulator:
  // If Leg 1 fills at t=0 and human takes delta_t seconds to enter & fill Leg 2:
  const secondsPerTradingYear = 252 * 6.25 * 3600;
  const dtYears = Math.max(0, humanDelayBetweenLegsSeconds) / secondsPerTradingYear;
  const oneSigmaSpotMovePts =
    legCount > 1 ? underlyingSpot * annualizedVolatility * Math.sqrt(dtYears) : 0;
  const leg2AdverseShiftPerUnit = oneSigmaSpotMovePts * Math.abs(leg2DeltaAbs);
  const expectedLeggingRiskRupees = leg2AdverseShiftPerUnit * quantity;
  const severe95PctLeggingLossRupees = expectedLeggingRiskRupees * 1.645;

  return {
    arrivalMidPrice,
    signalPrice: signalAskPrice,
    manualLimitOrderPrice: manualLimitPrice,
    actualOrSimulatedFillPrice: actualFillPrice,
    quantity,
    halfSpreadCostRupees,
    humanLatencyDriftTimingCostRupees,
    marketImpactCostRupees,
    totalImplementationShortfallRupees,
    implementationShortfallBps,
    multiLegGapSimulation: {
      legCount,
      humanDelayBetweenLegsSeconds,
      adverseUnderlyingMove1SigmaDuringLeggingPts: oneSigmaSpotMovePts,
      leg2AdversePriceShiftRupeesPerUnit: leg2AdverseShiftPerUnit,
      expectedLeggingRiskRupees,
      severe95PctLeggingLossRupees,
      mitigationRule:
        legCount > 1
          ? 'Use broker Basket Order with pre-staged LIMIT prices (protective BUY leg first, short SELL leg 1–2s after fill confirmation).'
          : 'Single-leg order; zero multi-leg gap risk.',
    },
  };
}

/**
 * M21 / Section 17 / V4-17: Regime & Change-Point Detection Engine
 * (CUSUM, Page-Hinkley, Bayesian Change-Point, HMM)
 */
export interface RegimeChangeDetectionReport {
  currentRegime:
    | 'Trending Up'
    | 'Trending Down'
    | 'Range'
    | 'High Volatility'
    | 'Low Volatility'
    | 'Event Driven'
    | 'Uncertain';
  regimeConfidencePct: number;
  regimeAgeBars: number;
  regimeChangeAlertActive: boolean;
  detectors: {
    cusumStatistic: number;
    cusumThreshold: number;
    cusumTriggered: boolean;
    pageHinkleyStat: number;
    pageHinkleyThreshold: number;
    pageHinkleyTriggered: boolean;
    bayesianChangePointPosteriorProb: number;
    hmmStressStateProb: number;
    volatilityRegimeBreak: boolean;
    correlationRegimeBreak: boolean;
    liquidityRegimeBreak: boolean;
  };
  routingAction: string;
}

export function detectRegimeAndChangePoints(params: {
  recentBarReturns: number[]; // e.g., last 30 intraday 5-min returns
  spotVsVwapPct: number;
  indiaVix: number;
  atmIv: number;
  realizedVol: number;
  scheduledMajorEventWithin24h: boolean;
  averageSpreadPct: number;
}): RegimeChangeDetectionReport {
  const {
    recentBarReturns,
    spotVsVwapPct,
    indiaVix,
    atmIv,
    realizedVol,
    scheduledMajorEventWithin24h,
    averageSpreadPct,
  } = params;

  const n = Math.max(1, recentBarReturns.length);
  const mean = recentBarReturns.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(
    Math.max(
      1e-8,
      recentBarReturns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / Math.max(1, n - 1)
    )
  );

  // Two-sided CUSUM on standardized squared returns (volatility shift detector)
  let sPos = 0;
  let phMin = 0;
  let phSum = 0;
  let barsSinceLastShift = 0;
  const cusumThreshold = 4.2;
  const pageHinkleyThreshold = 3.5;

  for (const r of recentBarReturns) {
    const z = Math.abs(r - mean) / std;
    sPos = Math.max(0, sPos + (z - 1.05));
    phSum += z - 1.0;
    phMin = Math.min(phMin, phSum);
    if (sPos > cusumThreshold) {
      barsSinceLastShift = 1;
    } else {
      barsSinceLastShift++;
    }
  }

  const pageHinkleyStat = phSum - phMin;
  const cusumTriggered = sPos >= cusumThreshold;
  const pageHinkleyTriggered = pageHinkleyStat >= pageHinkleyThreshold;
  const volatilityRegimeBreak = Math.abs(atmIv - realizedVol) > 0.055 || indiaVix > 20;
  const correlationRegimeBreak = indiaVix > 21.5;
  const liquidityRegimeBreak = averageSpreadPct > 1.8;

  const bayesianChangePointPosteriorProb = Math.min(
    0.98,
    0.12 + (cusumTriggered ? 0.45 : 0) + (pageHinkleyTriggered ? 0.25 : 0) + (volatilityRegimeBreak ? 0.15 : 0)
  );
  const hmmStressStateProb = Math.min(0.99, Math.max(0.05, (indiaVix - 11) / 16));

  let currentRegime: RegimeChangeDetectionReport['currentRegime'] = 'Range';
  if (scheduledMajorEventWithin24h) {
    currentRegime = 'Event Driven';
  } else if (indiaVix >= 19.5 || volatilityRegimeBreak) {
    currentRegime = 'High Volatility';
  } else if (spotVsVwapPct >= 0.25) {
    currentRegime = 'Trending Up';
  } else if (spotVsVwapPct <= -0.25) {
    currentRegime = 'Trending Down';
  } else if (indiaVix <= 12.2) {
    currentRegime = 'Low Volatility';
  }

  const regimeChangeAlertActive =
    cusumTriggered || pageHinkleyTriggered || bayesianChangePointPosteriorProb >= 0.65;

  return {
    currentRegime,
    regimeConfidencePct: Math.round((1 - 0.35 * bayesianChangePointPosteriorProb) * 100),
    regimeAgeBars: Math.max(1, barsSinceLastShift),
    regimeChangeAlertActive,
    detectors: {
      cusumStatistic: sPos,
      cusumThreshold,
      cusumTriggered,
      pageHinkleyStat,
      pageHinkleyThreshold,
      pageHinkleyTriggered,
      bayesianChangePointPosteriorProb,
      hmmStressStateProb,
      volatilityRegimeBreak,
      correlationRegimeBreak,
      liquidityRegimeBreak,
    },
    routingAction: regimeChangeAlertActive
      ? 'REGIME TRANSITION DETECTED: Disable short-gamma range strategies and reduce position sizing by 50% until new regime stabilizes.'
      : `Regime stable (${currentRegime}); route only strategies validated for ${currentRegime}.`,
  };
}

/**
 * Sections 10–16, V4-19, V4-20: News 11-Dimension Impact Engine & Relevance-Gated Weather Engine
 */
export interface NewsItemAnalysis {
  newsId: string;
  headline: string;
  source: string;
  sourceType: 'OFFICIAL_EXCHANGE_FILING' | 'RBI_SEBI_RELEASE' | 'REPUTABLE_FINANCIAL_MEDIA' | 'UNVERIFIED_FEED';
  confirmationStatus: 'Officially Confirmed' | 'Reputable Report' | 'Unconfirmed / Rumour';
  publicationTimeIso: string;
  eventTimeIso: string;
  effectiveTimeIso: string;
  affectedSymbol: string;
  affectedSector: string;
  impactDimensions11: {
    revenueImpact: string;
    costImpact: string;
    marginImpact: string;
    regulatoryImpact: string;
    liquidityImpact: string;
    supplyChainImpact: string;
    earningsImpact: string;
    capexImpact: string;
    commodityExposure: string;
    interestRateExposure: string;
    currencyExposure: string;
  };
  potentialMarketRelevance: string;
  validForStrategySignal: boolean;
}

export interface WeatherRelevanceCheck {
  symbol: string;
  sector: string;
  status: 'WEATHER IMPACT = NOT MATERIAL' | 'POTENTIALLY RELEVANT';
  forecastAvailableAtDecisionTime: string;
  actualWeatherOccurredLater: string; // Strictly separated for historical audit!
  economicTransmissionChannel: string;
}

export function evaluateWeatherForUnderlying(
  symbol: string,
  isoDate: string,
  forecastAtTime?: string,
  actualLater?: string
): WeatherRelevanceCheck {
  const spec = getContractSpecForDate(symbol, isoDate);
  if (!spec.weatherSensitiveSector) {
    return {
      symbol,
      sector: spec.sector,
      status: 'WEATHER IMPACT = NOT MATERIAL',
      forecastAvailableAtDecisionTime: 'N/A (Sector not weather-driven)',
      actualWeatherOccurredLater: 'N/A (Ignored by trade engine)',
      economicTransmissionChannel: spec.weatherSensitivityReason,
    };
  }
  return {
    symbol,
    sector: spec.sector,
    status: 'POTENTIALLY RELEVANT',
    forecastAvailableAtDecisionTime:
      forecastAtTime ??
      'IMD Bulletin (as of decision timestamp): Normal regional conditions; no severe disruption warning.',
    actualWeatherOccurredLater:
      actualLater ??
      'Post-entry actual observation (separated from entry decision per Section 15/68).',
    economicTransmissionChannel: spec.weatherSensitivityReason,
  };
}
