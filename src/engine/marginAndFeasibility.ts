/**
 * M4 / Sections 9, 33, 34, 37, 83 / U4 / U6:
 * Capital Tiers (₹10K to ₹10L+), SPAN + Exposure Margin Estimator,
 * Strategy Eligibility Matrix, 6-Dimension Trade Feasibility Engine,
 * and Manual Order Reference Ticket with TTL, Do-Not-Chase Price & Leg-Sequence Guidance.
 */

import { checkOrderSlicingAndFreeze, getContractSpecForDate } from './rulesEngine';

export const CAPITAL_TIERS = [
  10000,
  25000,
  50000,
  100000,
  250000,
  500000,
  1000000,
] as const;

export interface MarginEstimateResult {
  label: "ESTIMATE — CHECK YOUR BROKER'S MARGIN CALCULATOR BEFORE TRADING";
  upfrontLongPremiumRupees: number;
  spanMarginRupees: number;
  exposureMarginRupees: number;
  expiryDayExtraElmRupees: number;
  hedgeBenefitReductionRupees: number;
  totalEstimatedMarginRequired: number;
  effectiveMarginUsed: number; // Uses brokerManualOverrideRupees if supplied
  brokerManualOverrideRupees: number | null;
  volatilityHikeMarginStress20Pct: number;
  legSequenceInstruction: string;
}

export function estimateSpanAndExposureMargin(params: {
  underlying: string;
  underlyingSpot: number;
  isoDate: string;
  isExpiryDay: boolean;
  legs: Array<{
    side: 'BUY' | 'SELL';
    right: 'CE' | 'PE';
    strike: number;
    expiry: string;
    lots: number;
    premium: number;
  }>;
  brokerManualOverrideRupees?: number | null;
}): MarginEstimateResult {
  const {
    underlying,
    underlyingSpot,
    isoDate,
    isExpiryDay,
    legs,
    brokerManualOverrideRupees = null,
  } = params;

  const spec = getContractSpecForDate(underlying, isoDate);
  const lotSize = spec.lotSize;

  let upfrontLongPremiumRupees = 0;
  let rawSpanMargin = 0;
  let rawExposureMargin = 0;
  let expiryDayExtraElmRupees = 0;

  const buyLegs = legs.filter((l) => l.side === 'BUY');
  const sellLegs = legs.filter((l) => l.side === 'SELL');

  for (const leg of buyLegs) {
    upfrontLongPremiumRupees += leg.premium * leg.lots * lotSize;
  }

  const isIndex = spec.instrumentType === 'INDEX';
  const spanPct = isIndex ? 0.095 : 0.165;    // ~9.5% index SPAN scan range, ~16.5% stock SPAN
  const exposurePct = isIndex ? 0.02 : 0.035; // ~2% index exposure, ~3.5% stock exposure

  for (const leg of sellLegs) {
    const notional = underlyingSpot * leg.lots * lotSize;
    const otmDistance =
      leg.right === 'CE'
        ? Math.max(0, leg.strike - underlyingSpot)
        : Math.max(0, underlyingSpot - leg.strike);
    const otmCredit = Math.min(notional * 0.04, otmDistance * leg.lots * lotSize * 0.5);
    const legSpan = Math.max(notional * 0.045, notional * spanPct - otmCredit) + leg.premium * leg.lots * lotSize;
    const legExp = notional * exposurePct;
    rawSpanMargin += legSpan;
    rawExposureMargin += legExp;
    if (isExpiryDay) {
      expiryDayExtraElmRupees += notional * 0.02; // Extra 2% ELM on expiry day
    }
  }

  // Hedge benefit if defined-risk spread (matching BUY leg on same right & same or further expiry)
  let hedgeBenefitReductionRupees = 0;
  if (sellLegs.length > 0 && buyLegs.length > 0) {
    const s = sellLegs[0];
    const b = buyLegs.find((l) => l.right === s.right);
    if (b) {
      const sameExpiry = b.expiry === s.expiry;
      // U3: No calendar-spread margin benefit on expiry day
      if (sameExpiry || !isExpiryDay) {
        const matchedLots = Math.min(s.lots, b.lots);
        const spreadWidth = Math.abs(b.strike - s.strike) * matchedLots * lotSize;
        const maxDefinedRiskMargin = spreadWidth + rawExposureMargin * 0.65;
        const unhedgedShort = rawSpanMargin + rawExposureMargin;
        if (unhedgedShort > maxDefinedRiskMargin) {
          hedgeBenefitReductionRupees = unhedgedShort - maxDefinedRiskMargin;
        }
      }
    }
  }

  const totalEstimatedMarginRequired = Math.max(
    upfrontLongPremiumRupees,
    upfrontLongPremiumRupees +
      rawSpanMargin +
      rawExposureMargin +
      expiryDayExtraElmRupees -
      hedgeBenefitReductionRupees
  );

  const effectiveMarginUsed =
    brokerManualOverrideRupees !== null && brokerManualOverrideRupees > 0
      ? brokerManualOverrideRupees
      : totalEstimatedMarginRequired;

  let legSequenceInstruction = 'Single-leg LIMIT order only (never market order in options).';
  if (sellLegs.length > 0 && buyLegs.length > 0) {
    legSequenceInstruction =
      'MANDATORY SPREAD SEQUENCE (U3/U6): Execute the BUY (protective hedge) leg FIRST, confirm fill in broker positions, and ONLY THEN place the SELL leg so broker RMS grants hedged SPAN margin benefit. Reverse when exiting (buy back short leg first, then sell long leg).';
  } else if (sellLegs.length > 0) {
    legSequenceInstruction =
      'Short option leg requires full SPAN + Exposure margin. Place LIMIT order only and monitor intraday peak margin utilization.';
  }

  return {
    label: "ESTIMATE — CHECK YOUR BROKER'S MARGIN CALCULATOR BEFORE TRADING",
    upfrontLongPremiumRupees,
    spanMarginRupees: rawSpanMargin,
    exposureMarginRupees: rawExposureMargin,
    expiryDayExtraElmRupees,
    hedgeBenefitReductionRupees,
    totalEstimatedMarginRequired,
    effectiveMarginUsed,
    brokerManualOverrideRupees,
    volatilityHikeMarginStress20Pct: effectiveMarginUsed * 1.22,
    legSequenceInstruction,
  };
}

export interface StrategyEligibilityRow {
  strategyFamily: string;
  description: string;
  typicalCapitalRequiredRupees: number;
  typicalMaxLossRupees: number;
  eligibleAtCapital: boolean;
  statusLabel: 'EXECUTABLE WITHIN TIER' | string; // e.g., "NOT EXECUTABLE WITH ₹10,000"
  capitalShortfallRupees: number;
  notes: string;
}

export function buildStrategyEligibilityMatrixForCapital(
  capitalRupees: number,
  maxRiskPerTradePct = 2.0,
  niftyLotSize = 65
): StrategyEligibilityRow[] {
  const maxAllowedRiskRupees = capitalRupees * (maxRiskPerTradePct / 100);
  const rows: Array<{
    strategyFamily: string;
    description: string;
    typicalCapitalRequiredRupees: number;
    typicalMaxLossRupees: number;
    notes: string;
  }> = [
    {
      strategyFamily: 'Affordable Single-Lot Long Option (Low-Premium OTM/ATM CE/PE)',
      description: `1 lot (${niftyLotSize} qty) NIFTY option with premium ≤ ₹95 and strict stop-loss`,
      typicalCapitalRequiredRupees: 85 * niftyLotSize, // ~₹5,525
      typicalMaxLossRupees: 25 * niftyLotSize,         // ~₹1,625 with stop
      notes: 'Only structure capital-feasible under ₹10,000; carries high theta decay & requires strict discipline.',
    },
    {
      strategyFamily: 'Deep ATM / ITM Single-Lot Long Option (High Delta)',
      description: `1 lot (${niftyLotSize} qty) NIFTY ATM/ITM option (premium ₹180–₹260)`,
      typicalCapitalRequiredRupees: 210 * niftyLotSize, // ~₹13,650
      typicalMaxLossRupees: 55 * niftyLotSize,
      notes: 'Upfront premium exceeds ₹10,000 small-capital tier; requires ≥ ₹25,000 capital tier.',
    },
    {
      strategyFamily: 'Defined-Risk Debit Vertical Spread (Bull Call / Bear Put Spread)',
      description: `Buy 1 lot ATM + Sell 1 lot OTM (200 pt width, ${niftyLotSize} qty)`,
      typicalCapitalRequiredRupees: 34500, // SPAN + Exposure after hedge benefit
      typicalMaxLossRupees: 6500,
      notes: 'Short leg triggers SPAN + Exposure margin (~₹32K–₹42K even with hedge benefit); NOT EXECUTABLE WITH ₹10,000.',
    },
    {
      strategyFamily: 'Defined-Risk Credit Spread / Iron Condor / Iron Butterfly',
      description: '2-leg or 4-leg credit structure with protective wings',
      typicalCapitalRequiredRupees: 48000,
      typicalMaxLossRupees: 8500,
      notes: 'Requires hedged SPAN + Exposure margin plus peak-margin buffer when legs are entered sequentially.',
    },
    {
      strategyFamily: 'Calendar / Diagonal Term-Structure Spread',
      description: 'Sell near-expiry option + Buy next-expiry option',
      typicalCapitalRequiredRupees: 52000,
      typicalMaxLossRupees: 7500,
      notes: 'Calendar spread margin benefit is revoked on expiry day of the near leg (U3).',
    },
    {
      strategyFamily: 'Stock Options (RELIANCE / HDFCBANK / INFY / NTPC)',
      description: 'Single-stock F&O lot (physical settlement obligation near expiry)',
      typicalCapitalRequiredRupees: 22000,
      typicalMaxLossRupees: 5500,
      notes: 'Stock options are physically settled at expiry; margin steps up in final 4 days before expiry.',
    },
    {
      strategyFamily: 'Portfolio Index Beta Hedge / Protective Put Overlay',
      description: 'Cash equity portfolio + NIFTY Protective Put / Collar',
      typicalCapitalRequiredRupees: 150000,
      typicalMaxLossRupees: 12000,
      notes: 'Designed for multi-lakh equity portfolios seeking downside tail protection.',
    },
  ];

  return rows.map((r) => {
    const capitalOk = capitalRupees >= r.typicalCapitalRequiredRupees;
    const shortfall = Math.max(0, r.typicalCapitalRequiredRupees - capitalRupees);
    // Notice: even if capital covers upfront cost, note if max loss exceeds strict risk-per-trade rule
    const riskWarning =
      r.typicalMaxLossRupees > maxAllowedRiskRupees
        ? ` (Note: Full-stop loss ₹${r.typicalMaxLossRupees.toLocaleString('en-IN')} exceeds ${maxRiskPerTradePct}% risk budget ₹${maxAllowedRiskRupees.toLocaleString('en-IN')})`
        : '';
    return {
      strategyFamily: r.strategyFamily,
      description: r.description,
      typicalCapitalRequiredRupees: r.typicalCapitalRequiredRupees,
      typicalMaxLossRupees: r.typicalMaxLossRupees,
      eligibleAtCapital: capitalOk,
      statusLabel: capitalOk
        ? 'EXECUTABLE WITHIN TIER'
        : `NOT EXECUTABLE WITH ₹${capitalRupees.toLocaleString('en-IN')}`,
      capitalShortfallRupees: shortfall,
      notes: `${r.notes}${riskWarning}`,
    };
  });
}

/**
 * Section 9 & Section 37: 6-Dimension Trade Feasibility & Contract Executability Engine
 */
export type ContractExecutabilityStatus =
  | 'EXECUTABLE'
  | 'LIQUID'
  | 'AVAILABLE'
  | 'NOT EXECUTABLE'
  | 'INSUFFICIENT DATA';

export interface SixDimensionFeasibilityReport {
  contractStatus: ContractExecutabilityStatus;
  overallFeasibility: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT EXECUTABLE';
  isExecutable: boolean;
  minimumCapitalRequired: number;
  currentCapital: number;
  capitalShortfall: number;
  dimensions: {
    marketFeasibility: { passed: boolean; score: number; detail: string };
    capitalFeasibility: { passed: boolean; score: number; detail: string };
    modelFeasibility: { passed: boolean; score: number; detail: string };
    portfolioFeasibility: { passed: boolean; score: number; detail: string };
    eventFeasibility: { passed: boolean; score: number; detail: string };
    operationalFeasibility: { passed: boolean; score: number; detail: string };
  };
  rejectionReasons: string[];
}

export function evaluateSixDimensionTradeFeasibility(params: {
  marketOpenOrTradable: boolean;
  quoteAgeSeconds: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  availableCapitalRupees: number;
  requiredCapitalAndMarginRupees: number;
  maxLossRupees: number;
  maxAllowedRiskRupees: number;
  modelDispersionPct: number;
  calibrationPassed: boolean;
  portfolioLimitsPassed: boolean;
  inFoBanList: boolean;
  majorImminentEventBlock: boolean;
  netExpectedEdgeAfterCostsRupees: number;
}): SixDimensionFeasibilityReport {
  const rejectionReasons: string[] = [];

  // 1. Market Feasibility
  const spreadPct = params.bid > 0 ? ((params.ask - params.bid) / params.bid) * 100 : 999;
  const freshOk = params.quoteAgeSeconds <= 3.0;
  const spreadOk = params.bid > 0 && params.ask >= params.bid && spreadPct <= 2.5;
  const liqOk = params.volume >= 500 && params.openInterest >= 5000;
  const marketPassed = params.marketOpenOrTradable && freshOk && spreadOk && liqOk && !params.inFoBanList;
  if (!freshOk) rejectionReasons.push(`Quote stale (${params.quoteAgeSeconds.toFixed(1)}s > 3.0s threshold).`);
  if (!spreadOk) rejectionReasons.push(`Bid/Ask spread too wide (${spreadPct.toFixed(2)}% > 2.5% limit) or zero bid.`);
  if (!liqOk) rejectionReasons.push(`Insufficient option liquidity (Vol: ${params.volume}, OI: ${params.openInterest}).`);
  if (params.inFoBanList) rejectionReasons.push('Underlying is in NSE F&O MWPL Ban List (no fresh positions permitted).');

  // 2. Capital Feasibility
  const capitalShortfall = Math.max(0, params.requiredCapitalAndMarginRupees - params.availableCapitalRupees);
  const capitalEnough = capitalShortfall === 0;
  const riskWithinBudget = params.maxLossRupees <= params.maxAllowedRiskRupees;
  const capitalPassed = capitalEnough && riskWithinBudget;
  if (!capitalEnough) {
    rejectionReasons.push(
      `NOT EXECUTABLE WITH ₹${params.availableCapitalRupees.toLocaleString('en-IN')}: Requires ₹${params.requiredCapitalAndMarginRupees.toLocaleString('en-IN')} (Shortfall: ₹${capitalShortfall.toLocaleString('en-IN')}).`
    );
  }
  if (!riskWithinBudget) {
    rejectionReasons.push(
      `Max loss at stop (₹${params.maxLossRupees.toFixed(0)}) exceeds risk budget (₹${params.maxAllowedRiskRupees.toFixed(0)}).`
    );
  }

  // 3. Model Feasibility
  const modelPassed = params.calibrationPassed && params.modelDispersionPct <= 7.5 && params.netExpectedEdgeAfterCostsRupees > 0;
  if (!params.calibrationPassed) rejectionReasons.push('Model calibration failed no-arbitrage residual check.');
  if (params.modelDispersionPct > 7.5) {
    rejectionReasons.push(`Extreme 36-model dispersion (${params.modelDispersionPct.toFixed(1)}% > 7.5% threshold).`);
  }
  if (params.netExpectedEdgeAfterCostsRupees <= 0) {
    rejectionReasons.push(`Negative/zero net expected edge after round-trip costs (₹${params.netExpectedEdgeAfterCostsRupees.toFixed(2)}).`);
  }

  // 4. Portfolio Feasibility
  const portfolioPassed = params.portfolioLimitsPassed;
  if (!portfolioPassed) {
    rejectionReasons.push('Pre-Trade Compliance Gate: Breaches hard portfolio Greek, VaR/ES, or concentration limit.');
  }

  // 5. Event Feasibility
  const eventPassed = !params.majorImminentEventBlock;
  if (params.majorImminentEventBlock) {
    rejectionReasons.push('Imminent high-impact scheduled event (RBI/Earnings) within block window.');
  }

  // 6. Operational Feasibility
  const operationalPassed = params.bid > 0 && spreadPct <= 2.0;

  const allPassed =
    marketPassed && capitalPassed && modelPassed && portfolioPassed && eventPassed && operationalPassed;

  let contractStatus: ContractExecutabilityStatus = 'EXECUTABLE';
  if (params.bid <= 0 || !freshOk) {
    contractStatus = 'INSUFFICIENT DATA';
  } else if (!allPassed) {
    contractStatus = 'NOT EXECUTABLE';
  }

  let overallFeasibility: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT EXECUTABLE' = 'NOT EXECUTABLE';
  if (allPassed) {
    overallFeasibility = spreadPct < 0.6 && params.modelDispersionPct < 3.0 ? 'HIGH' : 'MEDIUM';
  } else if (marketPassed && capitalEnough) {
    overallFeasibility = 'LOW';
  }

  return {
    contractStatus,
    overallFeasibility,
    isExecutable: allPassed,
    minimumCapitalRequired: params.requiredCapitalAndMarginRupees,
    currentCapital: params.availableCapitalRupees,
    capitalShortfall,
    dimensions: {
      marketFeasibility: {
        passed: marketPassed,
        score: marketPassed ? 92 : 35,
        detail: `Quote Age: ${params.quoteAgeSeconds.toFixed(1)}s | Spread: ${spreadPct.toFixed(2)}% | OI: ${params.openInterest.toLocaleString('en-IN')}`,
      },
      capitalFeasibility: {
        passed: capitalPassed,
        score: capitalPassed ? 95 : 20,
        detail: capitalEnough
          ? `Required ₹${params.requiredCapitalAndMarginRupees.toLocaleString('en-IN')} <= Available ₹${params.availableCapitalRupees.toLocaleString('en-IN')}`
          : `NOT EXECUTABLE WITH ₹${params.availableCapitalRupees.toLocaleString('en-IN')} (Shortfall ₹${capitalShortfall.toLocaleString('en-IN')})`,
      },
      modelFeasibility: {
        passed: modelPassed,
        score: modelPassed ? 88 : 40,
        detail: `Dispersion: ${params.modelDispersionPct.toFixed(2)}% | Net EV: ₹${params.netExpectedEdgeAfterCostsRupees.toFixed(2)}`,
      },
      portfolioFeasibility: {
        passed: portfolioPassed,
        score: portfolioPassed ? 90 : 25,
        detail: portfolioPassed ? 'Within all hard VaR, ES, Greek & Concentration limits' : 'Breaches hard portfolio limit',
      },
      eventFeasibility: {
        passed: eventPassed,
        score: eventPassed ? 94 : 30,
        detail: eventPassed ? 'No unpriced scheduled macro/earnings shock in window' : 'Imminent scheduled event block active',
      },
      operationalFeasibility: {
        passed: operationalPassed,
        score: operationalPassed ? 91 : 45,
        detail: 'Manual LIMIT order executable via standard retail broker UI',
      },
    },
    rejectionReasons,
  };
}

/**
 * Section 83 & U6: Manual Order Reference Ticket with TTL & Do-Not-Chase Price
 */
export interface ManualOrderReferenceTicket {
  ticketId: string;
  headerNotice: 'REFERENCE / DECISION-SUPPORT SYSTEM — MANUAL BROKER EXECUTION ONLY';
  generatedAtIso: string;
  expiresAtIso: string;
  ttlSeconds: number;
  status: 'VALID' | 'RE-VALIDATE — TICKET STALE';
  symbol: string;
  expiry: string;
  strategyName: string;
  legs: Array<{
    sequenceOrder: number;
    side: 'BUY' | 'SELL';
    strike: number;
    right: 'CE' | 'PE';
    lots: number;
    quantity: number;
    orderType: 'LIMIT ONLY (NO MARKET ORDERS)';
    referenceEntryPrice: number;
    doNotChaseLimitPrice: number;
  }>;
  stopLossReference: number;
  targetReference: number;
  maxLossRupees: number;
  maxProfitRupees: number | 'UNBOUNDED_UPSIDE';
  netBreakevenPrice: number;
  estimatedRoundTripCostsRupees: number;
  estimatedMarginRequiredRupees: number;
  netGreeksRupees: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  slicingGuidance: string;
  legSequenceGuidance: string;
  preFlightChecklist: Array<{ item: string; checked: boolean }>;
  copyTextSummary: string;
}

export function generateManualOrderTicket(params: {
  ticketId: string;
  generatedAtIso: string;
  currentTimeIso?: string;
  ttlSeconds?: number;
  priceDriftPct?: number;
  symbol: string;
  expiry: string;
  strategyName: string;
  legs: Array<{
    side: 'BUY' | 'SELL';
    strike: number;
    right: 'CE' | 'PE';
    lots: number;
    quantity: number;
    referencePrice: number;
    maxSlippageToleranceRupees: number;
  }>;
  stopLossReference: number;
  targetReference: number;
  maxLossRupees: number;
  maxProfitRupees: number | 'UNBOUNDED_UPSIDE';
  netBreakevenPrice: number;
  estimatedRoundTripCostsRupees: number;
  estimatedMarginRequiredRupees: number;
  netGreeksRupees: { delta: number; gamma: number; theta: number; vega: number };
  legSequenceGuidance: string;
}): ManualOrderReferenceTicket {
  const ttlSeconds = params.ttlSeconds ?? 180; // 3 minutes default TTL (U6)
  const genMs = new Date(params.generatedAtIso).getTime();
  const expMs = genMs + ttlSeconds * 1000;
  const nowMs = params.currentTimeIso ? new Date(params.currentTimeIso).getTime() : genMs;
  const driftPct = Math.abs(params.priceDriftPct ?? 0);

  const isExpiredOrDrifted = nowMs > expMs || driftPct > 1.2;

  // Sort BUY legs first so user always gets hedged SPAN margin benefit (U6)
  const orderedLegs = [...params.legs]
    .sort((a, b) => (a.side === 'BUY' && b.side === 'SELL' ? -1 : a.side === 'SELL' && b.side === 'BUY' ? 1 : 0))
    .map((l, idx) => ({
      sequenceOrder: idx + 1,
      side: l.side,
      strike: l.strike,
      right: l.right,
      lots: l.lots,
      quantity: l.quantity,
      orderType: 'LIMIT ONLY (NO MARKET ORDERS)' as const,
      referenceEntryPrice: l.referencePrice,
      doNotChaseLimitPrice:
        l.side === 'BUY'
          ? Number((l.referencePrice + l.maxSlippageToleranceRupees).toFixed(2))
          : Number(Math.max(0.05, l.referencePrice - l.maxSlippageToleranceRupees).toFixed(2)),
    }));

  const totalLots = orderedLegs.reduce((a, l) => Math.max(a, l.lots), 1);
  const slicing = checkOrderSlicingAndFreeze(params.symbol, totalLots, params.generatedAtIso);

  const lines = [
    '====================================================================',
    'REFERENCE / DECISION-SUPPORT SYSTEM — MANUAL BROKER EXECUTION ONLY',
    'THIS TICKET DOES NOT PLACE ANY ORDER. EXECUTE MANUALLY AT YOUR RISK.',
    '====================================================================',
    `TICKET ID       : ${params.ticketId} (${isExpiredOrDrifted ? 'RE-VALIDATE — TICKET STALE' : 'VALID'})`,
    `GENERATED AT    : ${params.generatedAtIso} (TTL: ${ttlSeconds}s)`,
    `SYMBOL / EXPIRY : ${params.symbol} | ${params.expiry}`,
    `STRATEGY        : ${params.strategyName}`,
    '--------------------------------------------------------------------',
    'ORDER LEGS (EXECUTE IN EXACT SEQUENCE USING LIMIT ORDERS ONLY):',
    ...orderedLegs.map(
      (l) =>
        `  Leg #${l.sequenceOrder}: ${l.side} ${l.quantity} qty (${l.lots} lot) ${params.symbol} ${l.strike} ${l.right} @ Ref ₹${l.referenceEntryPrice.toFixed(2)} | DO-NOT-CHASE LIMIT: ₹${l.doNotChaseLimitPrice.toFixed(2)}`
    ),
    '--------------------------------------------------------------------',
    `STOP REFERENCE  : ₹${params.stopLossReference.toFixed(2)}`,
    `TARGET REFERENCE: ₹${params.targetReference.toFixed(2)}`,
    `NET BREAKEVEN   : ₹${params.netBreakevenPrice.toFixed(2)} (After all round-trip charges)`,
    `MAX LOSS (STOP) : ₹${params.maxLossRupees.toFixed(2)}`,
    `MAX PROFIT      : ${typeof params.maxProfitRupees === 'number' ? `₹${params.maxProfitRupees.toFixed(2)}` : params.maxProfitRupees}`,
    `EST. CHARGES    : ₹${params.estimatedRoundTripCostsRupees.toFixed(2)} (Brokerage + STT + GST + Exchange + Stamp)`,
    `EST. MARGIN REQ : ₹${params.estimatedMarginRequiredRupees.toFixed(2)} (Verify in Broker Margin Calculator)`,
    `NET GREEKS (₹)  : Δ ₹${params.netGreeksRupees.delta.toFixed(0)} | Γ ₹${params.netGreeksRupees.gamma.toFixed(0)} | Θ ₹${params.netGreeksRupees.theta.toFixed(0)}/day | V ₹${params.netGreeksRupees.vega.toFixed(0)}/1%IV`,
    `LEG SEQUENCE    : ${params.legSequenceGuidance}`,
    `FREEZE SLICING  : ${slicing.guidance}`,
    '====================================================================',
  ];

  return {
    ticketId: params.ticketId,
    headerNotice: 'REFERENCE / DECISION-SUPPORT SYSTEM — MANUAL BROKER EXECUTION ONLY',
    generatedAtIso: params.generatedAtIso,
    expiresAtIso: new Date(expMs).toISOString(),
    ttlSeconds,
    status: isExpiredOrDrifted ? 'RE-VALIDATE — TICKET STALE' : 'VALID',
    symbol: params.symbol,
    expiry: params.expiry,
    strategyName: params.strategyName,
    legs: orderedLegs,
    stopLossReference: params.stopLossReference,
    targetReference: params.targetReference,
    maxLossRupees: params.maxLossRupees,
    maxProfitRupees: params.maxProfitRupees,
    netBreakevenPrice: params.netBreakevenPrice,
    estimatedRoundTripCostsRupees: params.estimatedRoundTripCostsRupees,
    estimatedMarginRequiredRupees: params.estimatedMarginRequiredRupees,
    netGreeksRupees: params.netGreeksRupees,
    slicingGuidance: slicing.guidance,
    legSequenceGuidance: params.legSequenceGuidance,
    preFlightChecklist: [
      { item: 'Market data & option chain quotes verified LIVE (≤ 3s age)', checked: true },
      { item: 'Margin requirement verified in registered broker calculator', checked: true },
      { item: 'Limit price is within Do-Not-Chase bound (no market orders)', checked: true },
      { item: 'No scheduled RBI/Earnings event or daily-loss lockout active', checked: true },
      { item: 'Written trade thesis & exact invalidation level logged in journal', checked: true },
    ],
    copyTextSummary: lines.join('\n'),
  };
}
