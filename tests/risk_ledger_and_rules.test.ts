import { describe, expect, it } from 'vitest';
import {
  getContractSpecForDate,
  getStatutoryScheduleForDate,
} from '../src/engine/rulesEngine';
import {
  computeIndianFoTaxReport,
  decomposePnlByGreeks,
  rebuildPortfolioFromLedger,
} from '../src/engine/ledgerAndTaxEngine';
import {
  computePortfolioVarAndEs,
  evaluatePreTradeComplianceGate,
  runReverseStressSearch,
} from '../src/engine/riskAndLimitsEngine';
import {
  evaluateBehaviouralDiscipline,
  queryGuardRailedCopilot,
} from '../src/engine/disciplineAndCopilot';
import {
  DEFAULT_PORTFOLIO_LEDGER,
  HISTORICAL_252_DAILY_RETURNS,
} from '../src/engine/verifiedHistoricalFixtures';

describe('U3 Rules, U7 Ledger, U8 VaR/Reverse-Stress, U9 Limits, U13 Lockout, U16 Copilot, U18 Tax', () => {
  it('enforces time-versioned NSE NIFTY lot size (75 on 15-Jul-2025 vs 65 in Oct-2026) and Budget 2026 STT (0.15%)', () => {
    const specJul2025 = getContractSpecForDate('NIFTY', '2025-07-15');
    const specOct2026 = getContractSpecForDate('NIFTY', '2026-10-02');
    expect(specJul2025.lotSize).toBe(75);
    expect(specOct2026.lotSize).toBe(65);
    expect(specOct2026.expiryWeekday).toBe('TUESDAY');

    const sttJul2025 = getStatutoryScheduleForDate('2025-07-15').payload;
    const sttOct2026 = getStatutoryScheduleForDate('2026-10-02').payload;
    expect(sttJul2025.sttOptionSellPremiumPct).toBeCloseTo(0.001, 5);   // 0.10% in Jul 2025
    expect(sttOct2026.sttOptionSellPremiumPct).toBeCloseTo(0.0015, 5);  // 0.15% after 1 Apr 2026
  });

  it('rebuilds FIFO positions and computes ICAI F&O Tax-Audit Turnover accurately from append-only ledger', () => {
    const state = rebuildPortfolioFromLedger(DEFAULT_PORTFOLIO_LEDGER, {
      'RELIANCE-EQ': { price: 2985, underlyingSpot: 2985 },
      'HDFCBANK-EQ': { price: 1742, underlyingSpot: 1742 },
      'NIFTY-2026-10-06-24850-CE': { price: 118, underlyingSpot: 24820 },
    });

    expect(state.positions.length).toBe(3);
    expect(state.closedTrades.length).toBe(1);
    // Closed trade TX-004/TX-005: 65 qty bought at 112, sold at 144 => Gross P&L = 32 * 65 = ₹2,080
    expect(state.closedTrades[0].grossPnl).toBeCloseTo(2080, 2);

    const tax = computeIndianFoTaxReport(state.closedTrades, state.closedTrades[0].netPnl);
    expect(tax.icaiTaxAuditTurnoverRupees).toBeCloseTo(2080, 2);
    expect(tax.brokerStatementReconciliation.reconciledWithinTolerance).toBe(true);

    const attr = decomposePnlByGreeks({
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
    expect(attr.deltaPnl).toBeGreaterThan(1000);
  });

  it('computes VaR/ES, Reverse Stress binding breach, Pre-Trade Compliance Gate, and non-bypassable U13 Lockout', () => {
    const risk = computePortfolioVarAndEs({
      portfolioValueRupees: 250000,
      netDeltaRupeesPer1Pct: 2400,
      netGammaRupeesPer1PctSq: 110,
      netVegaRupeesPer1PctIv: 320,
      dailyHistoricalReturns: HISTORICAL_252_DAILY_RETURNS,
      confidenceLevel: 0.99,
      horizonDays: 1,
    });
    expect(risk.historicalEsRupees).toBeGreaterThanOrEqual(risk.historicalVarRupees);
    expect(risk.varBacktest.trafficLightZone).toBe('GREEN_ZONE');

    const revStress = runReverseStressSearch({
      maxLossLimitRupees: 5000,
      esLimitRupees: 8000,
      marginCallBufferRupees: 12000,
      drawdownLimitRupees: 15000,
      netDeltaRupeesPer1Pct: 2400,
      netGammaRupeesPer1PctSq: 110,
      netVegaRupeesPer1PctIv: 320,
    });
    expect(revStress.some((r) => r.isBindingVulnerability)).toBe(true);

    const gate = evaluatePreTradeComplianceGate({
      capitalRupees: 10000,
      currentDrawdownPct: 5.2, // Triggers Capital Preservation Mode
      indiaVix: 14.3,
      candidateMaxLossRupees: 2500, // Exceeds tightened limit
      postTradeMarginRupees: 6000,
      postTradeEsRupees: 1800,
      postTradeNetDeltaRupeesPer1Pct: 1200,
      postTradeThetaBleedPerDayRupees: -350,
      realizedDailyLossRupees: 500,
      tradesTakenToday: 1,
      consecutiveLosses: 1,
      limits: {
        maxRiskPerTradePctOfCapital: 2.0,
        maxMarginUtilizationPct: 75,
        maxPortfolioEsPctOfCapital: 15,
        maxNetDeltaPctOfCapital: 30,
        maxThetaBleedPerDayPctOfCapital: 4,
        maxDailyLossRupees: 1000,
        maxTradesPerDay: 4,
        maxConsecutiveLossesBeforeCoolOff: 2,
      },
    });
    expect(gate.capitalPreservationModeActive).toBe(true);
    expect(gate.gatePassed).toBe(false);

    const lockout = evaluateBehaviouralDiscipline({
      dailyLossLimitRupees: 1500,
      realizedLossTodayRupees: 1650,
      tradesCountToday: 2,
      maxTradesPerDay: 4,
      consecutiveLossesCount: 2,
      maxConsecutiveLossesAllowed: 2,
    });
    expect(lockout.lockoutActive).toBe(true);
    expect(lockout.canUserOverrideLockout).toBe(false);

    const copilotRefusal = queryGuardRailedCopilot(
      'Please place order and buy now or override lockout',
      {
        timestampIso: '2026-10-02T05:15:00Z',
        underlying: 'NIFTY',
        spot: 24820,
        netPnlNow: 1439.3,
        netBreakeven: 100.78,
        costHurdleRupees: 60.7,
        qProbPct: 44.2,
        pProbPct: 48.6,
        modelMedian: 119.4,
        modelDispersionPct: 2.1,
        es99Rupees: 4250,
        finalState: 'NO TRADE',
      }
    );
    expect(copilotRefusal.refusedOrderOrLimitBypass).toBe(true);
  });
});
