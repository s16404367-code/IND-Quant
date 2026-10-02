import { describe, expect, it } from 'vitest';
import {
  evaluateLiveTradeVerdict,
  runCostSensitivityStress,
  TradeLegOrder,
} from '../src/engine/costAndVerdictEngine';

describe('U25.4 Mandatory Test Vectors — Live Net Gain-or-Not Verdict & Cost Engine', () => {
  const baseLeg: TradeLegOrder = {
    legId: 'LEG-U25-1',
    symbol: 'NIFTY',
    strike: 24500,
    right: 'CE',
    side: 'BUY',
    quantity: 75, // Illustrative U25.4 quantity = 75
    entryPrice: 100,
    currentBid: 120,
    currentAsk: 120.5,
    currentLtp: 120,
    stopLossPrice: 80,
    targetPrice: 140,
  };

  it('passes U25.4 Mode 1 — FLAT ₹20 per order, both sides (Net P&L = ₹1,439.30, Net Breakeven ≈ ₹100.78)', () => {
    const res = evaluateLiveTradeVerdict({
      legs: [baseLeg],
      brokerageConfig: {
        mode: 'FLAT_PER_ORDER',
        flatRupeesPerOrder: 20,
        percentPerSide: 0,
        includeExchangeStampSebi: false, // U25.4 core vector: brokerage + STT (0.15%) + GST (18%)
      },
      isoDate: '2026-10-02',
      isDataStale: false,
      useExecutableBidAskExit: true,
    });

    expect(res.grossPnlNow).toBeCloseTo(1500.0, 2);
    expect(res.costBreakdown.totalBrokerage).toBeCloseTo(40.0, 2);
    expect(res.costBreakdown.gst).toBeCloseTo(7.2, 2);
    expect(res.costBreakdown.totalStt).toBeCloseTo(13.5, 2);
    expect(res.costBreakdown.totalRoundTripCharges).toBeCloseTo(60.7, 2);
    expect(res.netPnlNow).toBeCloseTo(1439.3, 2);
    expect(res.verdictBanner).toBe('NET GAIN');
    expect(res.netBreakevenExitPremiumFirstLeg).not.toBeNull();
    expect(res.netBreakevenExitPremiumFirstLeg!).toBeCloseTo(100.78, 2);
    expect(res.costBreakdown.sanityWarningBanner).toBeNull();
  });

  it('passes U25.4 Mode 2 — LITERAL 20% of order value, both sides (Net P&L = -₹2,407.50, Net Breakeven ≈ ₹162.1, Red Sanity Banner shown)', () => {
    const res = evaluateLiveTradeVerdict({
      legs: [baseLeg],
      brokerageConfig: {
        mode: 'PERCENT_OF_TURNOVER',
        flatRupeesPerOrder: 20,
        percentPerSide: 20,
        includeExchangeStampSebi: false,
      },
      isoDate: '2026-10-02',
      isDataStale: false,
      useExecutableBidAskExit: true,
    });

    expect(res.grossPnlNow).toBeCloseTo(1500.0, 2);
    expect(res.costBreakdown.entryBrokerage).toBeCloseTo(1500.0, 2);
    expect(res.costBreakdown.exitBrokerage).toBeCloseTo(1800.0, 2);
    expect(res.costBreakdown.totalBrokerage).toBeCloseTo(3300.0, 2);
    expect(res.costBreakdown.gst).toBeCloseTo(594.0, 2);
    expect(res.costBreakdown.totalStt).toBeCloseTo(13.5, 2);
    expect(res.costBreakdown.totalRoundTripCharges).toBeCloseTo(3907.5, 2);
    expect(res.netPnlNow).toBeCloseTo(-2407.5, 2);
    expect(res.verdictBanner).toBe('NET LOSS');
    expect(res.netBreakevenExitPremiumFirstLeg!).toBeCloseTo(162.1, 1);
    expect(res.costBreakdown.sanityWarningBanner).toContain('20% per side = 40% round-trip on premium');
  });

  it('tests multi-leg spread (4 orders round-trip), short options (STT on entry sale), and ITM exercise STT trap', () => {
    const spreadLegs: TradeLegOrder[] = [
      baseLeg,
      {
        legId: 'LEG-U25-2',
        symbol: 'NIFTY',
        strike: 24700,
        right: 'CE',
        side: 'SELL',
        quantity: 75,
        entryPrice: 50,
        currentBid: 54.5,
        currentAsk: 55.0,
        currentLtp: 55.0,
      },
    ];

    const res = evaluateLiveTradeVerdict({
      legs: spreadLegs,
      brokerageConfig: {
        mode: 'FLAT_PER_ORDER',
        flatRupeesPerOrder: 20,
        percentPerSide: 0,
        includeExchangeStampSebi: false,
      },
      isoDate: '2026-10-02',
    });

    // 2 legs * 2 sides = 4 orders => ₹80 total brokerage
    expect(res.costBreakdown.roundTripOrdersCount).toBe(4);
    expect(res.costBreakdown.totalBrokerage).toBeCloseTo(80.0, 2);
    // Short leg sold at 50 * 75 = 3,750 => entry STT = 0.15% * 3,750 = ₹5.625
    expect(res.costBreakdown.sttEntry).toBeCloseTo(5.625, 3);

    // ITM-at-expiry exercise STT trap test
    const exercisedRes = evaluateLiveTradeVerdict({
      legs: [
        {
          ...baseLeg,
          exercisedItmAtExpiry: true,
          expirySettlementSpot: 24650, // Intrinsic = 150
        },
      ],
      brokerageConfig: {
        mode: 'FLAT_PER_ORDER',
        flatRupeesPerOrder: 20,
        percentPerSide: 0,
        includeExchangeStampSebi: false,
      },
      isoDate: '2026-10-02',
    });
    // Intrinsic 150 * 75 = 11,250 * 0.15% = ₹16.875 exercise STT
    expect(exercisedRes.costBreakdown.sttExerciseTrap).toBeCloseTo(16.875, 3);
    expect(exercisedRes.itmExerciseSttWarning).toContain('ITM-AT-EXPIRY EXERCISE STT TRAP DETECTED');
  });

  it('tests zero-bid exit (NO EXECUTABLE EXIT PRICE), stale quote (PAUSED — DATA STALE), cap/floor, and 2x cost stress', () => {
    const zeroBidRes = evaluateLiveTradeVerdict({
      legs: [{ ...baseLeg, currentBid: 0 }],
      brokerageConfig: {
        mode: 'FLAT_PER_ORDER',
        flatRupeesPerOrder: 20,
        percentPerSide: 0,
        includeExchangeStampSebi: false,
      },
    });
    expect(zeroBidRes.verdictBanner).toBe('NO EXECUTABLE EXIT PRICE');

    const staleRes = evaluateLiveTradeVerdict({
      legs: [baseLeg],
      brokerageConfig: {
        mode: 'FLAT_PER_ORDER',
        flatRupeesPerOrder: 20,
        percentPerSide: 0,
        includeExchangeStampSebi: false,
      },
      isDataStale: true,
    });
    expect(staleRes.verdictBanner).toBe('PAUSED — DATA STALE');
    expect(staleRes.finalCandidateState).toBe('NO TRADE');

    // Cap/floor test
    const cappedRes = evaluateLiveTradeVerdict({
      legs: [baseLeg],
      brokerageConfig: {
        mode: 'PERCENT_OF_TURNOVER',
        flatRupeesPerOrder: 20,
        percentPerSide: 5,
        maxPerOrderRupees: 25,
        includeExchangeStampSebi: false,
      },
    });
    expect(cappedRes.costBreakdown.totalBrokerage).toBeCloseTo(50.0, 2);

    const stress = runCostSensitivityStress({
      grossExpectedPnl: 200,
      baseRoundTripCosts: 80,
      baseSlippage: 40,
    });
    expect(stress.fragileFlag).toBe(true);
  });
});
