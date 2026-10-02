/**
 * M2.5 / U25 / Sections 39, 40, 101 / V4-44:
 * Live Net Gain-or-Not Engine ("Trade Verdict"), Time-Versioned Transaction Cost Engine,
 * Slippage Engine, Iterative Net Breakeven Solver, Cost Hurdle, Net R:R, and Cost Sensitivity Stress.
 */

import { getStatutoryScheduleForDate } from './rulesEngine';

export type BrokerageMode = 'FLAT_PER_ORDER' | 'PERCENT_OF_TURNOVER';

export interface BrokerageConfig {
  mode: BrokerageMode;
  flatRupeesPerOrder: number; // Default ₹20 per order (both buy and sell, per leg)
  percentPerSide: number;     // e.g., 20 means 20% literal if selected, or 0.05 means 0.05%
  minPerOrderRupees?: number; // Optional floor per order
  maxPerOrderRupees?: number; // Optional cap per order
  includeExchangeStampSebi: boolean; // False for isolated U25.4 core vector, True for full live statutory stack
}

export interface TradeLegOrder {
  legId: string;
  symbol: string;
  strike: number;
  right: 'CE' | 'PE';
  side: 'BUY' | 'SELL'; // Initial entry side
  quantity: number;     // Total units (lots * lotSize)
  entryPrice: number;
  currentBid: number;
  currentAsk: number;
  currentLtp: number;
  stopLossPrice?: number;
  targetPrice?: number;
  exercisedItmAtExpiry?: boolean;
  expirySettlementSpot?: number;
}

export interface CostBreakdown {
  entryBrokerage: number;
  exitBrokerage: number;
  totalBrokerage: number;
  sttEntry: number;
  sttExit: number;
  sttExerciseTrap: number;
  totalStt: number;
  exchangeCharges: number;
  sebiTurnoverFees: number;
  stampDuty: number;
  gst: number;
  slippageCost: number;
  totalRoundTripCharges: number; // Excludes slippage
  totalAllInDrag: number;        // Includes slippage
  roundTripOrdersCount: number;
  brokeragePctOfTurnover: number;
  sanityWarningBanner: string | null;
}

export type LiveVerdictBanner =
  | 'NET GAIN'
  | 'NET LOSS'
  | '≈ BREAKEVEN'
  | 'NO EXECUTABLE EXIT PRICE'
  | 'PAUSED — DATA STALE';

export interface LiveTradeVerdictResult {
  verdictBanner: LiveVerdictBanner;
  grossPnlNow: number;
  netPnlNow: number;
  costBreakdown: CostBreakdown;
  netBreakevenExitPremiumFirstLeg: number | null;
  netBreakevenMovePctOnPremium: number | null;
  requiredUnderlyingMoveRupees: number;
  requiredUnderlyingMovePct: number;
  costHurdleRupees: number;
  costHurdlePctOfPremium: number;
  costHurdlePctOfTargetProfit: number | null;
  isCostDominatedTrade: boolean;
  netProfitAtTarget: number | null;
  netLossAtStop: number | null;
  grossRiskRewardRatio: number | null;
  netRiskRewardRatio: number | null;
  entryCostDragImmediatelyAfterEntry: number;
  itmExerciseSttWarning: string | null;
  finalCandidateState: 'TRADE CANDIDATE' | 'WATCH' | 'NO TRADE';
  finalCandidateReason: string;
}

function computeSingleOrderBrokerage(orderTurnover: number, config: BrokerageConfig): number {
  let raw =
    config.mode === 'FLAT_PER_ORDER'
      ? config.flatRupeesPerOrder
      : (config.percentPerSide / 100) * orderTurnover;

  if (config.minPerOrderRupees !== undefined) {
    raw = Math.max(config.minPerOrderRupees, raw);
  }
  if (config.maxPerOrderRupees !== undefined) {
    raw = Math.min(config.maxPerOrderRupees, raw);
  }
  return raw;
}

export function evaluateLiveTradeVerdict(params: {
  legs: TradeLegOrder[];
  brokerageConfig: BrokerageConfig;
  isoDate?: string;
  isDataStale?: boolean;
  useExecutableBidAskExit?: boolean; // True by default: long exits at bid, short exits at ask
  breakevenBandRupees?: number;
  underlyingSpot?: number;
  netDeltaPerUnit?: number;
}): LiveTradeVerdictResult {
  const {
    legs,
    brokerageConfig,
    isoDate = '2026-10-02',
    isDataStale = false,
    useExecutableBidAskExit = true,
    breakevenBandRupees = 5.0,
    underlyingSpot = 24800,
    netDeltaPerUnit = 0.5,
  } = params;

  const schedule = getStatutoryScheduleForDate(isoDate).payload;

  // Check zero-bid / unexecutable exit first
  for (const leg of legs) {
    if (leg.side === 'BUY' && useExecutableBidAskExit && leg.currentBid <= 0) {
      return {
        verdictBanner: 'NO EXECUTABLE EXIT PRICE',
        grossPnlNow: 0,
        netPnlNow: 0,
        costBreakdown: {
          entryBrokerage: 0,
          exitBrokerage: 0,
          totalBrokerage: 0,
          sttEntry: 0,
          sttExit: 0,
          sttExerciseTrap: 0,
          totalStt: 0,
          exchangeCharges: 0,
          sebiTurnoverFees: 0,
          stampDuty: 0,
          gst: 0,
          slippageCost: 0,
          totalRoundTripCharges: 0,
          totalAllInDrag: 0,
          roundTripOrdersCount: legs.length * 2,
          brokeragePctOfTurnover: 0,
          sanityWarningBanner: null,
        },
        netBreakevenExitPremiumFirstLeg: null,
        netBreakevenMovePctOnPremium: null,
        requiredUnderlyingMoveRupees: 0,
        requiredUnderlyingMovePct: 0,
        costHurdleRupees: 0,
        costHurdlePctOfPremium: 0,
        costHurdlePctOfTargetProfit: null,
        isCostDominatedTrade: true,
        netProfitAtTarget: null,
        netLossAtStop: null,
        grossRiskRewardRatio: null,
        netRiskRewardRatio: null,
        entryCostDragImmediatelyAfterEntry: 0,
        itmExerciseSttWarning: null,
        finalCandidateState: 'NO TRADE',
        finalCandidateReason: 'Zero bid on open long leg; no executable exit price available.',
      };
    }
  }

  const computeTotalsForExitPrices = (exitPrices: number[]) => {
    let grossPnl = 0;
    let entryBrokerage = 0;
    let exitBrokerage = 0;
    let sttEntry = 0;
    let sttExit = 0;
    let sttExerciseTrap = 0;
    let exchangeCharges = 0;
    let sebiTurnoverFees = 0;
    let stampDuty = 0;
    let slippageCost = 0;
    let totalEntryPremiumValue = 0;
    let totalTurnover = 0;

    legs.forEach((leg, idx) => {
      const exitPx = exitPrices[idx];
      const entryVal = leg.entryPrice * leg.quantity;
      const exitVal = exitPx * leg.quantity;
      totalEntryPremiumValue += entryVal;
      totalTurnover += entryVal + exitVal;

      const legGross =
        leg.side === 'BUY'
          ? (exitPx - leg.entryPrice) * leg.quantity
          : (leg.entryPrice - exitPx) * leg.quantity;
      grossPnl += legGross;

      const eBrok = computeSingleOrderBrokerage(entryVal, brokerageConfig);
      const xBrok = computeSingleOrderBrokerage(exitVal, brokerageConfig);
      entryBrokerage += eBrok;
      exitBrokerage += xBrok;

      // STT on options is charged on SELL side premium
      if (leg.side === 'SELL') {
        sttEntry += schedule.sttOptionSellPremiumPct * entryVal;
      } else {
        sttExit += schedule.sttOptionSellPremiumPct * exitVal;
      }

      // ITM-at-expiry exercise STT trap (U3 / U25.1)
      if (leg.exercisedItmAtExpiry && leg.expirySettlementSpot !== undefined && leg.side === 'BUY') {
        const intrinsic =
          leg.right === 'CE'
            ? Math.max(0, leg.expirySettlementSpot - leg.strike)
            : Math.max(0, leg.strike - leg.expirySettlementSpot);
        if (intrinsic > 0) {
          // Budget 2026: 0.15% on intrinsic / settlement exercise value
          sttExerciseTrap += schedule.sttOptionExerciseIntrinsicPct * (intrinsic * leg.quantity);
        }
      }

      if (brokerageConfig.includeExchangeStampSebi) {
        exchangeCharges += schedule.exchangeTxnChargeNseOptionsPct * (entryVal + exitVal);
        sebiTurnoverFees += schedule.sebiTurnoverFeePct * (entryVal + exitVal);
        // Stamp duty on BUY side only
        if (leg.side === 'BUY') {
          stampDuty += schedule.stampDutyBuyOptionsPct * entryVal;
        } else {
          stampDuty += schedule.stampDutyBuyOptionsPct * exitVal;
        }
      }

      // Half-spread slippage diagnostic
      if (leg.currentAsk > leg.currentBid && leg.currentBid > 0) {
        const halfSpread = 0.5 * (leg.currentAsk - leg.currentBid) * leg.quantity;
        slippageCost += halfSpread;
      }
    });

    const totalBrokerage = entryBrokerage + exitBrokerage;
    const gst = schedule.gstPct * (totalBrokerage + exchangeCharges + sebiTurnoverFees);
    const totalStt = sttEntry + sttExit + sttExerciseTrap;
    const totalRoundTripCharges =
      totalBrokerage + totalStt + exchangeCharges + sebiTurnoverFees + stampDuty + gst;
    const netPnl = grossPnl - totalRoundTripCharges;

    return {
      grossPnl,
      netPnl,
      entryBrokerage,
      exitBrokerage,
      totalBrokerage,
      sttEntry,
      sttExit,
      sttExerciseTrap,
      totalStt,
      exchangeCharges,
      sebiTurnoverFees,
      stampDuty,
      gst,
      slippageCost,
      totalRoundTripCharges,
      totalAllInDrag: totalRoundTripCharges + slippageCost,
      totalEntryPremiumValue,
      totalTurnover,
    };
  };

  // Current executable exit prices (long exits at Bid, short exits at Ask unless overridden)
  const liveExitPrices = legs.map((leg) => {
    if (!useExecutableBidAskExit) return leg.currentLtp;
    return leg.side === 'BUY' ? leg.currentBid : leg.currentAsk;
  });

  const nowEval = computeTotalsForExitPrices(liveExitPrices);

  // Check Immediate Entry Cost Drag (if exited immediately after entry)
  const immediateExitPrices = legs.map((leg) => {
    if (!useExecutableBidAskExit) return leg.entryPrice;
    const spread = Math.max(0, leg.currentAsk - leg.currentBid);
    return leg.side === 'BUY' ? Math.max(0.05, leg.entryPrice - spread) : leg.entryPrice + spread;
  });
  const immediateEval = computeTotalsForExitPrices(immediateExitPrices);

  // Sanity Warning Banner (U25.1: if percentage brokerage > 1% per side)
  let sanityWarningBanner: string | null = null;
  if (brokerageConfig.mode === 'PERCENT_OF_TURNOVER' && brokerageConfig.percentPerSide > 1.0) {
    const p = brokerageConfig.percentPerSide;
    sanityWarningBanner = `${p}% per side = ${2 * p}% round-trip on premium. Confirm this is intended — most brokers charge a flat ₹ amount per order.`;
  }

  const brokeragePctOfTurnover =
    nowEval.totalTurnover > 0 ? (nowEval.totalBrokerage / nowEval.totalTurnover) * 100 : 0;

  // Iterative Solver for Net Breakeven Exit Premium on Single/First Leg (U25.2 B)
  let netBreakevenExitPremiumFirstLeg: number | null = null;
  let netBreakevenMovePctOnPremium: number | null = null;

  if (legs.length >= 1) {
    const firstLeg = legs[0];
    let low = 0.05;
    let high = Math.max(firstLeg.entryPrice * 10, 5000);
    for (let iter = 0; iter < 65; iter++) {
      const mid = 0.5 * (low + high);
      const testPrices = liveExitPrices.map((px, i) => (i === 0 ? mid : px));
      const res = computeTotalsForExitPrices(testPrices);
      if (Math.abs(res.netPnl) < 1e-5) {
        low = mid;
        high = mid;
        break;
      }
      if (firstLeg.side === 'BUY') {
        if (res.netPnl < 0) low = mid;
        else high = mid;
      } else {
        if (res.netPnl < 0) high = mid;
        else low = mid;
      }
    }
    netBreakevenExitPremiumFirstLeg = 0.5 * (low + high);
    netBreakevenMovePctOnPremium =
      firstLeg.entryPrice > 0
        ? ((netBreakevenExitPremiumFirstLeg - firstLeg.entryPrice) / firstLeg.entryPrice) * 100
        : 0;
  }

  // Target and Stop Net R:R evaluation (U25.2 D)
  let netProfitAtTarget: number | null = null;
  let netLossAtStop: number | null = null;
  let grossRiskRewardRatio: number | null = null;
  let netRiskRewardRatio: number | null = null;
  let costHurdlePctOfTargetProfit: number | null = null;

  const allHaveTargetAndStop = legs.every(
    (l) => l.targetPrice !== undefined && l.stopLossPrice !== undefined
  );

  if (allHaveTargetAndStop) {
    const targetPrices = legs.map((l) => l.targetPrice as number);
    const stopPrices = legs.map((l) => l.stopLossPrice as number);
    const targetEval = computeTotalsForExitPrices(targetPrices);
    const stopEval = computeTotalsForExitPrices(stopPrices);
    netProfitAtTarget = targetEval.netPnl;
    netLossAtStop = stopEval.netPnl;

    if (stopEval.grossPnl < 0 && targetEval.grossPnl > 0) {
      grossRiskRewardRatio = targetEval.grossPnl / Math.abs(stopEval.grossPnl);
    }
    if (netLossAtStop < 0) {
      netRiskRewardRatio = netProfitAtTarget / Math.abs(netLossAtStop);
    }
    if (targetEval.grossPnl > 0) {
      costHurdlePctOfTargetProfit = (targetEval.totalRoundTripCharges / targetEval.grossPnl) * 100;
    }
  }

  const costHurdleRupees = nowEval.totalRoundTripCharges;
  const costHurdlePctOfPremium =
    nowEval.totalEntryPremiumValue > 0
      ? (costHurdleRupees / nowEval.totalEntryPremiumValue) * 100
      : 0;

  const isCostDominatedTrade =
    costHurdlePctOfPremium > 12.0 ||
    (costHurdlePctOfTargetProfit !== null && costHurdlePctOfTargetProfit > 35.0);

  // Required underlying move to reach net breakeven
  const firstLeg = legs[0];
  const premiumGap =
    netBreakevenExitPremiumFirstLeg !== null && firstLeg
      ? Math.max(0, netBreakevenExitPremiumFirstLeg - firstLeg.entryPrice)
      : 0;
  const effDelta = Math.max(0.05, Math.abs(netDeltaPerUnit));
  const requiredUnderlyingMoveRupees = premiumGap / effDelta;
  const requiredUnderlyingMovePct =
    underlyingSpot > 0 ? (requiredUnderlyingMoveRupees / underlyingSpot) * 100 : 0;

  let verdictBanner: LiveVerdictBanner = '≈ BREAKEVEN';
  if (isDataStale) {
    verdictBanner = 'PAUSED — DATA STALE';
  } else if (nowEval.netPnl > breakevenBandRupees) {
    verdictBanner = 'NET GAIN';
  } else if (nowEval.netPnl < -breakevenBandRupees) {
    verdictBanner = 'NET LOSS';
  } else {
    verdictBanner = '≈ BREAKEVEN';
  }

  const itmExerciseSttWarning =
    nowEval.sttExerciseTrap > 0
      ? `ITM-AT-EXPIRY EXERCISE STT TRAP DETECTED: ₹${nowEval.sttExerciseTrap.toFixed(2)} charged at 0.15% on intrinsic value. Square off prior to expiry close to pay 0.15% on premium instead of intrinsic exercise value.`
      : null;

  let finalCandidateState: 'TRADE CANDIDATE' | 'WATCH' | 'NO TRADE' = 'TRADE CANDIDATE';
  let finalCandidateReason = 'Positive net expected edge after round-trip brokerage, STT, GST, and bid/ask spread.';
  if (isDataStale) {
    finalCandidateState = 'NO TRADE';
    finalCandidateReason = 'Data is stale (>3s threshold); live verdict paused.';
  } else if (isCostDominatedTrade) {
    finalCandidateState = 'NO TRADE';
    finalCandidateReason = `COST-DOMINATED TRADE: Round-trip costs (${costHurdlePctOfPremium.toFixed(2)}% of premium) consume excessive edge.`;
  } else if (netRiskRewardRatio !== null && netRiskRewardRatio < 1.15) {
    finalCandidateState = 'WATCH';
    finalCandidateReason = `Marginal Net R:R (${netRiskRewardRatio.toFixed(2)}x after all costs); watch for better entry limit price.`;
  }

  return {
    verdictBanner,
    grossPnlNow: nowEval.grossPnl,
    netPnlNow: nowEval.netPnl,
    costBreakdown: {
      entryBrokerage: nowEval.entryBrokerage,
      exitBrokerage: nowEval.exitBrokerage,
      totalBrokerage: nowEval.totalBrokerage,
      sttEntry: nowEval.sttEntry,
      sttExit: nowEval.sttExit,
      sttExerciseTrap: nowEval.sttExerciseTrap,
      totalStt: nowEval.totalStt,
      exchangeCharges: nowEval.exchangeCharges,
      sebiTurnoverFees: nowEval.sebiTurnoverFees,
      stampDuty: nowEval.stampDuty,
      gst: nowEval.gst,
      slippageCost: nowEval.slippageCost,
      totalRoundTripCharges: nowEval.totalRoundTripCharges,
      totalAllInDrag: nowEval.totalAllInDrag,
      roundTripOrdersCount: legs.length * 2,
      brokeragePctOfTurnover,
      sanityWarningBanner,
    },
    netBreakevenExitPremiumFirstLeg,
    netBreakevenMovePctOnPremium,
    requiredUnderlyingMoveRupees,
    requiredUnderlyingMovePct,
    costHurdleRupees,
    costHurdlePctOfPremium,
    costHurdlePctOfTargetProfit,
    isCostDominatedTrade,
    netProfitAtTarget,
    netLossAtStop,
    grossRiskRewardRatio,
    netRiskRewardRatio,
    entryCostDragImmediatelyAfterEntry: immediateEval.netPnl,
    itmExerciseSttWarning,
    finalCandidateState,
    finalCandidateReason,
  };
}

/**
 * V4-44 Cost & Slippage Sensitivity Grid (1x, 1.5x, 2x, 3x)
 */
export interface CostSensitivityMatrix {
  multipliers: number[];
  cells: Array<{
    costMultiplier: number;
    slippageMultiplier: number;
    netPnl: number;
    remainsProfitable: boolean;
  }>;
  fragileFlag: boolean;
  fragilityReason: string;
}

export function runCostSensitivityStress(params: {
  grossExpectedPnl: number;
  baseRoundTripCosts: number;
  baseSlippage: number;
}): CostSensitivityMatrix {
  const { grossExpectedPnl, baseRoundTripCosts, baseSlippage } = params;
  const multipliers = [1.0, 1.5, 2.0, 3.0];
  const cells: CostSensitivityMatrix['cells'] = [];

  for (const cMult of multipliers) {
    for (const sMult of multipliers) {
      const netPnl = grossExpectedPnl - cMult * baseRoundTripCosts - sMult * baseSlippage;
      cells.push({
        costMultiplier: cMult,
        slippageMultiplier: sMult,
        netPnl,
        remainsProfitable: netPnl > 0,
      });
    }
  }

  const twoXCell = cells.find((c) => c.costMultiplier === 2.0 && c.slippageMultiplier === 2.0);
  const fragileFlag = !twoXCell || !twoXCell.remainsProfitable;

  return {
    multipliers,
    cells,
    fragileFlag,
    fragilityReason: fragileFlag
      ? 'FLAGGED AS FRAGILE (U12 / V4-44): Strategy net expectancy turns negative under 2× transaction costs + 2× slippage stress.'
      : 'ROBUST TO COST STRESS: Strategy remains net-positive under 2× transaction costs and 2× slippage.',
  };
}
