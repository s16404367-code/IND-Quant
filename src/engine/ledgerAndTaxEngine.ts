/**
 * M3 / M14 / Sections 26, 58 / U7 / U10 / U18:
 * Unified Append-Only Portfolio Ledger, FIFO Tax Lots, Portfolio Greeks & Exposure Aggregator,
 * Greeks P&L Attribution (Delta/Gamma/Vega/Theta/Vanna/Residual), and
 * Indian F&O Tax & ICAI Turnover Engine (ITR-3 Non-Speculative Business Income — Information Only).
 */

export type AssetClass = 'EQUITY' | 'ETF' | 'INDEX_OPTION' | 'STOCK_OPTION' | 'INDEX_FUTURE' | 'STOCK_FUTURE' | 'GSEC_GOLD' | 'CASH';

export type LedgerTxType =
  | 'BUY'
  | 'SELL'
  | 'EXERCISE'
  | 'ASSIGN'
  | 'EXPIRE'
  | 'DIVIDEND'
  | 'FEE_TAX'
  | 'CASH_IN'
  | 'CASH_OUT';

export interface LedgerTransaction {
  txId: string;
  accountId: string;
  timestamp: string;
  txType: LedgerTxType;
  instrumentKey: string; // e.g., "NIFTY-2026-10-06-24800-CE" or "RELIANCE-EQ"
  underlying: string;
  assetClass: AssetClass;
  sector: string;
  quantity: number;      // Always positive for BUY/SELL
  price: number;
  chargesAndTaxes: number;
  sttPaid: number;
  strategyTag?: string;
  thesis?: string;
  invalidationLevel?: string;
  betaToNifty?: number;
  // Option metadata if applicable
  strike?: number;
  expiry?: string;
  right?: 'CE' | 'PE';
  perUnitDelta?: number;
  perUnitGamma?: number;
  perUnitTheta?: number;
  perUnitVega?: number;
  perUnitVanna?: number;
  perUnitVomma?: number;
}

export interface FifoTaxLot {
  lotId: string;
  txId: string;
  instrumentKey: string;
  underlying: string;
  assetClass: AssetClass;
  side: 'LONG' | 'SHORT';
  openTimestamp: string;
  remainingQty: number;
  entryPrice: number;
  entryChargesAllocated: number;
}

export interface DerivedPosition {
  instrumentKey: string;
  underlying: string;
  assetClass: AssetClass;
  sector: string;
  netQuantity: number; // + for long, - for short
  averageEntryPrice: number;
  currentMarketPrice: number;
  marketValueRupees: number;
  notionalExposureRupees: number;
  unrealizedPnlRupees: number;
  betaToNifty: number;
  strategyTag: string;
  thesis: string;
  invalidationLevel: string;
  // Position Greeks in Rupee terms
  deltaRupees: number;
  gammaRupees: number;
  thetaRupeesPerDay: number;
  vegaRupeesPer1PctIv: number;
  vannaRupees: number;
  vommaRupees: number;
}

export interface ClosedTradeRecord {
  closeTxId: string;
  instrumentKey: string;
  underlying: string;
  assetClass: AssetClass;
  openTimestamp: string;
  closeTimestamp: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  grossPnl: number;
  totalCharges: number;
  sttPaid: number;
  netPnl: number;
}

export interface PortfolioStateSummary {
  cashBalance: number;
  positions: DerivedPosition[];
  openTaxLots: FifoTaxLot[];
  closedTrades: ClosedTradeRecord[];
  realizedPnlTotal: number;
  unrealizedPnlTotal: number;
  totalChargesPaid: number;
  netLiquidationValue: number;
  grossExposureRupees: number;
  netExposureRupees: number;
  portfolioBetaToNifty: number;
  sectorExposuresPct: Record<string, number>;
  concentrationHhi: number;
  effectiveNumberOfBets: number;
  portfolioGreeksRupees: {
    netDeltaRupees: number;
    netGammaRupees: number;
    netThetaRupeesPerDay: number;
    netVegaRupeesPer1PctIv: number;
    netVannaRupees: number;
    netVommaRupees: number;
  };
}

/**
 * U7 Deterministic Rebuild from Append-Only Ledger (FIFO Tax Lots)
 */
export function rebuildPortfolioFromLedger(
  transactions: LedgerTransaction[],
  currentPrices: Record<string, { price: number; underlyingSpot: number }>,
  accountFilter?: string
): PortfolioStateSummary {
  const sorted = [...transactions]
    .filter((tx) => !accountFilter || tx.accountId === accountFilter)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let cashBalance = 0;
  let realizedPnlTotal = 0;
  let totalChargesPaid = 0;
  const lotsByInstrument = new Map<string, FifoTaxLot[]>();
  const metaByInstrument = new Map<string, LedgerTransaction>();
  const closedTrades: ClosedTradeRecord[] = [];

  for (const tx of sorted) {
    totalChargesPaid += tx.chargesAndTaxes;

    if (tx.txType === 'CASH_IN') {
      cashBalance += tx.price * tx.quantity;
      continue;
    }
    if (tx.txType === 'CASH_OUT') {
      cashBalance -= tx.price * tx.quantity;
      continue;
    }
    if (tx.txType === 'DIVIDEND') {
      cashBalance += tx.price * tx.quantity;
      realizedPnlTotal += tx.price * tx.quantity;
      continue;
    }
    if (tx.txType === 'FEE_TAX') {
      cashBalance -= tx.chargesAndTaxes;
      realizedPnlTotal -= tx.chargesAndTaxes;
      continue;
    }

    metaByInstrument.set(tx.instrumentKey, tx);
    const lots = lotsByInstrument.get(tx.instrumentKey) ?? [];

    if (tx.txType === 'BUY') {
      cashBalance -= tx.quantity * tx.price + tx.chargesAndTaxes;
      let qtyToProcess = tx.quantity;

      // Match against existing SHORT lots first (FIFO)
      while (qtyToProcess > 0 && lots.length > 0 && lots[0].side === 'SHORT') {
        const head = lots[0];
        const matched = Math.min(qtyToProcess, head.remainingQty);
        const gross = (head.entryPrice - tx.price) * matched;
        const allocCharge =
          (head.entryChargesAllocated * (matched / head.remainingQty)) +
          (tx.chargesAndTaxes * (matched / tx.quantity));
        const net = gross - allocCharge;
        realizedPnlTotal += net;

        closedTrades.push({
          closeTxId: tx.txId,
          instrumentKey: tx.instrumentKey,
          underlying: tx.underlying,
          assetClass: tx.assetClass,
          openTimestamp: head.openTimestamp,
          closeTimestamp: tx.timestamp,
          side: 'SHORT',
          quantity: matched,
          entryPrice: head.entryPrice,
          exitPrice: tx.price,
          grossPnl: gross,
          totalCharges: allocCharge,
          sttPaid: tx.sttPaid * (matched / tx.quantity),
          netPnl: net,
        });

        head.entryChargesAllocated -= head.entryChargesAllocated * (matched / head.remainingQty);
        head.remainingQty -= matched;
        qtyToProcess -= matched;
        if (head.remainingQty <= 1e-8) {
          lots.shift();
        }
      }

      if (qtyToProcess > 0) {
        lots.push({
          lotId: `${tx.txId}-LOT`,
          txId: tx.txId,
          instrumentKey: tx.instrumentKey,
          underlying: tx.underlying,
          assetClass: tx.assetClass,
          side: 'LONG',
          openTimestamp: tx.timestamp,
          remainingQty: qtyToProcess,
          entryPrice: tx.price,
          entryChargesAllocated: tx.chargesAndTaxes * (qtyToProcess / tx.quantity),
        });
      }
    } else if (tx.txType === 'SELL' || tx.txType === 'EXPIRE' || tx.txType === 'EXERCISE' || tx.txType === 'ASSIGN') {
      cashBalance += tx.quantity * tx.price - tx.chargesAndTaxes;
      let qtyToProcess = tx.quantity;

      // Match against existing LONG lots first (FIFO)
      while (qtyToProcess > 0 && lots.length > 0 && lots[0].side === 'LONG') {
        const head = lots[0];
        const matched = Math.min(qtyToProcess, head.remainingQty);
        const gross = (tx.price - head.entryPrice) * matched;
        const allocCharge =
          (head.entryChargesAllocated * (matched / head.remainingQty)) +
          (tx.chargesAndTaxes * (matched / tx.quantity));
        const net = gross - allocCharge;
        realizedPnlTotal += net;

        closedTrades.push({
          closeTxId: tx.txId,
          instrumentKey: tx.instrumentKey,
          underlying: tx.underlying,
          assetClass: tx.assetClass,
          openTimestamp: head.openTimestamp,
          closeTimestamp: tx.timestamp,
          side: 'LONG',
          quantity: matched,
          entryPrice: head.entryPrice,
          exitPrice: tx.price,
          grossPnl: gross,
          totalCharges: allocCharge,
          sttPaid: tx.sttPaid * (matched / tx.quantity),
          netPnl: net,
        });

        head.entryChargesAllocated -= head.entryChargesAllocated * (matched / head.remainingQty);
        head.remainingQty -= matched;
        qtyToProcess -= matched;
        if (head.remainingQty <= 1e-8) {
          lots.shift();
        }
      }

      if (qtyToProcess > 0 && tx.txType === 'SELL') {
        lots.push({
          lotId: `${tx.txId}-LOT`,
          txId: tx.txId,
          instrumentKey: tx.instrumentKey,
          underlying: tx.underlying,
          assetClass: tx.assetClass,
          side: 'SHORT',
          openTimestamp: tx.timestamp,
          remainingQty: qtyToProcess,
          entryPrice: tx.price,
          entryChargesAllocated: tx.chargesAndTaxes * (qtyToProcess / tx.quantity),
        });
      }
    }

    lotsByInstrument.set(tx.instrumentKey, lots);
  }

  const openTaxLots: FifoTaxLot[] = [];
  const positions: DerivedPosition[] = [];
  let unrealizedPnlTotal = 0;
  let grossExposureRupees = 0;
  let netExposureRupees = 0;

  let netDeltaRupees = 0;
  let netGammaRupees = 0;
  let netThetaRupeesPerDay = 0;
  let netVegaRupeesPer1PctIv = 0;
  let netVannaRupees = 0;
  let netVommaRupees = 0;

  const sectorBuckets: Record<string, number> = {};

  for (const [instrumentKey, lots] of lotsByInstrument.entries()) {
    if (lots.length === 0) continue;
    openTaxLots.push(...lots);
    const meta = metaByInstrument.get(instrumentKey)!;
    const totalQtyAbs = lots.reduce((a, l) => a + l.remainingQty, 0);
    const sign = lots[0].side === 'LONG' ? 1 : -1;
    const netQuantity = sign * totalQtyAbs;
    const weightedEntry =
      lots.reduce((a, l) => a + l.remainingQty * l.entryPrice, 0) / Math.max(1e-8, totalQtyAbs);

    const priceObj = currentPrices[instrumentKey] ?? {
      price: weightedEntry,
      underlyingSpot: meta.strike ?? weightedEntry,
    };
    const mktPx = priceObj.price;
    const spotPx = priceObj.underlyingSpot;

    const marketValueRupees = netQuantity * mktPx;
    const unrealizedPnlRupees =
      sign === 1
        ? (mktPx - weightedEntry) * totalQtyAbs
        : (weightedEntry - mktPx) * totalQtyAbs;
    unrealizedPnlTotal += unrealizedPnlRupees;

    const unitDelta =
      meta.assetClass === 'EQUITY' || meta.assetClass === 'ETF' || meta.assetClass === 'INDEX_FUTURE' || meta.assetClass === 'STOCK_FUTURE'
        ? 1.0
        : meta.perUnitDelta ?? 0.5;
    const unitGamma = meta.perUnitGamma ?? 0;
    const unitTheta = meta.perUnitTheta ?? 0;
    const unitVega = meta.perUnitVega ?? 0;
    const unitVanna = meta.perUnitVanna ?? 0;
    const unitVomma = meta.perUnitVomma ?? 0;

    const deltaRupees = netQuantity * unitDelta * spotPx * 0.01; // Per 1% move in underlying
    const notionalExposureRupees = netQuantity * unitDelta * spotPx;
    const gammaRupees = netQuantity * unitGamma * spotPx;
    const thetaRupeesPerDay = netQuantity * unitTheta;
    const vegaRupeesPer1PctIv = netQuantity * unitVega;
    const vannaRupees = netQuantity * unitVanna;
    const vommaRupees = netQuantity * unitVomma;

    grossExposureRupees += Math.abs(notionalExposureRupees);
    netExposureRupees += notionalExposureRupees;

    netDeltaRupees += deltaRupees;
    netGammaRupees += gammaRupees;
    netThetaRupeesPerDay += thetaRupeesPerDay;
    netVegaRupeesPer1PctIv += vegaRupeesPer1PctIv;
    netVannaRupees += vannaRupees;
    netVommaRupees += vommaRupees;

    sectorBuckets[meta.sector] = (sectorBuckets[meta.sector] ?? 0) + Math.abs(notionalExposureRupees);

    positions.push({
      instrumentKey,
      underlying: meta.underlying,
      assetClass: meta.assetClass,
      sector: meta.sector,
      netQuantity,
      averageEntryPrice: weightedEntry,
      currentMarketPrice: mktPx,
      marketValueRupees,
      notionalExposureRupees,
      unrealizedPnlRupees,
      betaToNifty: meta.betaToNifty ?? 1.0,
      strategyTag: meta.strategyTag ?? 'CORE_PORTFOLIO',
      thesis: meta.thesis ?? 'Manual holding',
      invalidationLevel: meta.invalidationLevel ?? 'Not specified',
      deltaRupees,
      gammaRupees,
      thetaRupeesPerDay,
      vegaRupeesPer1PctIv,
      vannaRupees,
      vommaRupees,
    });
  }

  const netLiquidationValue =
    cashBalance + positions.reduce((acc, p) => acc + p.marketValueRupees, 0);

  const sectorExposuresPct: Record<string, number> = {};
  for (const [sec, val] of Object.entries(sectorBuckets)) {
    sectorExposuresPct[sec] = grossExposureRupees > 0 ? (val / grossExposureRupees) * 100 : 0;
  }

  // Concentration HHI and Effective Number of Bets (U8.2)
  let hhi = 0;
  if (grossExposureRupees > 0) {
    for (const p of positions) {
      const weight = Math.abs(p.notionalExposureRupees) / grossExposureRupees;
      hhi += weight * weight;
    }
  }
  const effectiveNumberOfBets = hhi > 0 ? 1 / hhi : 0;

  const portfolioBetaToNifty =
    grossExposureRupees > 0
      ? positions.reduce((acc, p) => acc + p.notionalExposureRupees * p.betaToNifty, 0) /
        Math.max(1, netLiquidationValue)
      : 0;

  return {
    cashBalance,
    positions,
    openTaxLots,
    closedTrades,
    realizedPnlTotal,
    unrealizedPnlTotal,
    totalChargesPaid,
    netLiquidationValue,
    grossExposureRupees,
    netExposureRupees,
    portfolioBetaToNifty,
    sectorExposuresPct,
    concentrationHhi: hhi,
    effectiveNumberOfBets,
    portfolioGreeksRupees: {
      netDeltaRupees,
      netGammaRupees,
      netThetaRupeesPerDay,
      netVegaRupeesPer1PctIv,
      netVannaRupees,
      netVommaRupees,
    },
  };
}

/**
 * U10.1 Greeks-Based P&L Explain / Attribution Engine
 */
export interface GreeksPnlAttribution {
  observedTotalPnl: number;
  deltaPnl: number;
  gammaPnl: number;
  vegaPnl: number;
  thetaPnl: number;
  rhoCarryPnl: number;
  vannaVolgaCrossPnl: number;
  explainedTotalPnl: number;
  unexplainedResidualPnl: number;
  residualSharePct: number;
  largeResidualWarning: string | null;
}

export function decomposePnlByGreeks(params: {
  observedTotalPnl: number;
  netQuantity: number;
  deltaPerUnit: number;
  gammaPerUnit: number;
  thetaPerUnitPerDay: number;
  vegaPerUnitPer1Pct: number;
  rhoPerUnitPer1Pct: number;
  vannaPerUnit: number;
  vommaPerUnit: number;
  spotChangePoints: number;
  ivChangePctPoints: number; // e.g., +1.5 means IV rose by 1.5 vol points
  daysElapsed: number;
  rateChangePctPoints?: number;
}): GreeksPnlAttribution {
  const {
    observedTotalPnl,
    netQuantity: Q,
    deltaPerUnit,
    gammaPerUnit,
    thetaPerUnitPerDay,
    vegaPerUnitPer1Pct,
    rhoPerUnitPer1Pct,
    vannaPerUnit,
    vommaPerUnit,
    spotChangePoints: dS,
    ivChangePctPoints: dVolPct,
    daysElapsed: dt,
    rateChangePctPoints = 0,
  } = params;

  const deltaPnl = Q * deltaPerUnit * dS;
  const gammaPnl = Q * 0.5 * gammaPerUnit * dS * dS;
  const vegaPnl = Q * vegaPerUnitPer1Pct * dVolPct;
  const thetaPnl = Q * thetaPerUnitPerDay * dt;
  const rhoCarryPnl = Q * rhoPerUnitPer1Pct * rateChangePctPoints;
  const vannaVolgaCrossPnl =
    Q * (vannaPerUnit * dS * dVolPct * 0.01 + 0.5 * vommaPerUnit * dVolPct * dVolPct);

  const explainedTotalPnl =
    deltaPnl + gammaPnl + vegaPnl + thetaPnl + rhoCarryPnl + vannaVolgaCrossPnl;
  const unexplainedResidualPnl = observedTotalPnl - explainedTotalPnl;
  const denom = Math.max(1, Math.abs(observedTotalPnl), Math.abs(explainedTotalPnl));
  const residualSharePct = (Math.abs(unexplainedResidualPnl) / denom) * 100;

  return {
    observedTotalPnl,
    deltaPnl,
    gammaPnl,
    vegaPnl,
    thetaPnl,
    rhoCarryPnl,
    vannaVolgaCrossPnl,
    explainedTotalPnl,
    unexplainedResidualPnl,
    residualSharePct,
    largeResidualWarning:
      residualSharePct > 15
        ? `HIGH UNEXPLAINED RESIDUAL (${residualSharePct.toFixed(1)}%): Driven by higher-order skew shift, bid-ask spread change, or execution slippage.`
        : null,
  };
}

/**
 * M14 / U18: Indian F&O Tax, ICAI Turnover & Broker Reconciliation Engine
 * (INFORMATION ONLY — NOT TAX ADVICE)
 */
export interface FoTaxAndTurnoverReport {
  disclaimer: 'INFORMATION ONLY — NOT TAX ADVICE. CONSULT A CHARTERED ACCOUNTANT (CA) FOR ITR FILING.';
  incomeClassification: 'Non-Speculative Business Income u/s 43(5) Proviso (ITR-3 Schedule BP)';
  closedTradesCount: number;
  icaiTaxAuditTurnoverRupees: number; // Sum of |Gross Profit/Loss| per settled trade
  grossTradingPnlRupees: number;
  deductibleExpensesOtherThanStt: number;
  sttPaidRupees: number;
  netTaxableBusinessPnlRupees: number;
  taxAuditThreshold10CrDigitalBreached: boolean;
  taxAuditThreshold1CrStandardBreached: boolean;
  lossCarryForwardEligibleYears: number; // 8 Assessment Years for non-speculative business loss if filed before due date
  brokerStatementReconciliation: {
    ledgerNetPnl: number;
    brokerReportedNetPnl: number;
    differenceRupees: number;
    reconciledWithinTolerance: boolean;
    probableCausesOfDifference: string[];
  };
}

export function computeIndianFoTaxReport(
  closedTrades: ClosedTradeRecord[],
  brokerReportedNetPnl?: number
): FoTaxAndTurnoverReport {
  let icaiTurnover = 0;
  let grossPnl = 0;
  let totalCharges = 0;
  let totalStt = 0;

  for (const t of closedTrades) {
    if (
      t.assetClass === 'INDEX_OPTION' ||
      t.assetClass === 'STOCK_OPTION' ||
      t.assetClass === 'INDEX_FUTURE' ||
      t.assetClass === 'STOCK_FUTURE'
    ) {
      // Per ICAI Guidance Note (Rev. 2022/2026): F&O turnover = sum of absolute favourable & unfavourable differences
      icaiTurnover += Math.abs(t.grossPnl);
      grossPnl += t.grossPnl;
      totalCharges += t.totalCharges;
      totalStt += t.sttPaid;
    }
  }

  const netPnl = grossPnl - totalCharges;
  const brokerVal = brokerReportedNetPnl ?? netPnl;
  const diff = Math.abs(netPnl - brokerVal);

  return {
    disclaimer: 'INFORMATION ONLY — NOT TAX ADVICE. CONSULT A CHARTERED ACCOUNTANT (CA) FOR ITR FILING.',
    incomeClassification: 'Non-Speculative Business Income u/s 43(5) Proviso (ITR-3 Schedule BP)',
    closedTradesCount: closedTrades.length,
    icaiTaxAuditTurnoverRupees: icaiTurnover,
    grossTradingPnlRupees: grossPnl,
    deductibleExpensesOtherThanStt: Math.max(0, totalCharges - totalStt),
    sttPaidRupees: totalStt,
    netTaxableBusinessPnlRupees: netPnl,
    taxAuditThreshold10CrDigitalBreached: icaiTurnover >= 1e8, // ₹10 Crore
    taxAuditThreshold1CrStandardBreached: icaiTurnover >= 1e7, // ₹1 Crore
    lossCarryForwardEligibleYears: 8,
    brokerStatementReconciliation: {
      ledgerNetPnl: netPnl,
      brokerReportedNetPnl: brokerVal,
      differenceRupees: diff,
      reconciledWithinTolerance: diff <= 5.0,
      probableCausesOfDifference:
        diff > 5.0
          ? ['Stamp duty state rounding', 'DP / clearing member levy timing', 'Daily MTM settlement cut-off difference']
          : ['Exact match within ₹5 rounding tolerance'],
    },
  };
}
