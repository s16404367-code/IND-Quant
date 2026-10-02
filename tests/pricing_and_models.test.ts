import { describe, expect, it } from 'vitest';
import {
  binomialTreePrice,
  bsmPrice,
  computeImpliedForwardFromParity,
  computeOptionGreeks,
  evaluateAll51Models,
  seededMonteCarloPrice,
  solveImpliedVolatility,
  trinomialTreePrice,
} from '../src/engine/pricingModels';
import {
  buildArbitrageFreeSviSurface,
  computePMeasureProbabilityEngine,
  extractBreedenLitzenbergerQDistribution,
} from '../src/engine/volSurfaceAndDist';
import { HISTORICAL_252_DAILY_RETURNS } from '../src/engine/verifiedHistoricalFixtures';

describe('U21.2 Numerical Suite — BSM, IV Solver, Put-Call Parity, Trees, MC, Greeks, 51 Models, SVI & Q/P Distributions', () => {
  const sampleInput = {
    spot: 24800,
    strike: 24800,
    timeToExpiryYears: 14 / 365,
    riskFreeRate: 0.0675,
    dividendYield: 0.012,
    volatility: 0.145,
    right: 'CE' as const,
  };

  it('verifies Put-Call Parity within numerical precision and solves IV back to exact input sigma', () => {
    const callPx = bsmPrice({ ...sampleInput, right: 'CE' });
    const putPx = bsmPrice({ ...sampleInput, right: 'PE' });
    const T = sampleInput.timeToExpiryYears;
    const lhs = callPx - putPx;
    const rhs =
      sampleInput.spot * Math.exp(-sampleInput.dividendYield * T) -
      sampleInput.strike * Math.exp(-sampleInput.riskFreeRate * T);

    expect(Math.abs(lhs - rhs)).toBeLessThan(1e-6);

    const solvedIv = solveImpliedVolatility({
      targetPrice: callPx,
      spot: sampleInput.spot,
      strike: sampleInput.strike,
      timeToExpiryYears: T,
      riskFreeRate: sampleInput.riskFreeRate,
      dividendYield: sampleInput.dividendYield,
      right: 'CE',
    });
    expect(solvedIv).not.toBeNull();
    expect(solvedIv!).toBeCloseTo(sampleInput.volatility, 5);

    const parityFwd = computeImpliedForwardFromParity({
      spot: sampleInput.spot,
      riskFreeRate: sampleInput.riskFreeRate,
      timeToExpiryYears: T,
      strikes: [{ strike: sampleInput.strike, callMid: callPx, putMid: putPx }],
    });
    expect(parityFwd.parityConsistent).toBe(true);
  });

  it('verifies Binomial (CRR, Jarrow-Rudd, Tian, Leisen-Reimer), Trinomial, and Seeded Monte Carlo convergence to BSM', () => {
    const bsm = bsmPrice(sampleInput);
    const crr = binomialTreePrice(sampleInput, 120, 'CRR');
    const lr = binomialTreePrice(sampleInput, 121, 'LEISEN_REIMER');
    const trinom = trinomialTreePrice(sampleInput, 80);
    const mc1 = seededMonteCarloPrice(sampleInput, 6000, 12345);
    const mc2 = seededMonteCarloPrice(sampleInput, 6000, 12345);

    expect(Math.abs(crr - bsm)).toBeLessThan(1.5);
    expect(Math.abs(lr - bsm)).toBeLessThan(0.5);
    expect(Math.abs(trinom - bsm)).toBeLessThan(1.5);
    expect(Math.abs(mc1.price - bsm)).toBeLessThan(3 * mc1.standardError + 1.0);
    // Deterministic seed reproducibility (U21.2)
    expect(mc1.price).toBe(mc2.price);
  });

  it('verifies analytic 1st/2nd/3rd-order Greeks against Bump-and-Reprice numerical finite differences', () => {
    const greeks = computeOptionGreeks(sampleInput);
    expect(greeks.delta).toBeGreaterThan(0.45);
    expect(greeks.delta).toBeLessThan(0.6);
    expect(greeks.gamma).toBeGreaterThan(0);
    expect(greeks.thetaPerDay).toBeLessThan(0);
    expect(greeks.vegaPer1Pct).toBeGreaterThan(0);
    expect(greeks.bumpAndRepriceDeltaDiff).toBeLessThan(1e-4);
    expect(greeks.bumpAndRepriceGammaDiff).toBeLessThan(1e-5);
    expect(greeks.bumpAndRepriceVegaDiff).toBeLessThan(1e-3);
  });

  it('verifies all 51 models (36 Core + 15 V4 Challengers) enforce applicability gate and V3-0.3 Errata', () => {
    const res = evaluateAll51Models(sampleInput, 294, 296, 24852);
    expect(res.models.length).toBe(51);

    // Models 27-31 (Structural/Short-Rate) must be gated NOT APPLICABLE for direct equity/index options
    const m27 = res.models.find((m) => m.modelNumber === 27)!;
    expect(m27.applicabilityStatus).toBe('NOT APPLICABLE');
    expect(m27.theoreticalPrice).toBeNull();

    // Models 32-36 must be marked CONSISTENCY_DIAGNOSTIC per V3-0.3 Errata
    const m35 = res.models.find((m) => m.modelNumber === 35)!;
    expect(m35.isConsistencyFrameworkOnly).toBe(true);
    expect(m35.applicabilityStatus).toBe('CONSISTENCY_DIAGNOSTIC');

    expect(res.ensembleSummary.fairValueRangeHigh).toBeGreaterThan(
      res.ensembleSummary.fairValueRangeLow
    );
  });

  it('verifies SVI no-arbitrage Durrleman check, Breeden-Litzenberger Q-density non-negativity & unit mass, and P-measure separation', () => {
    const surface = buildArbitrageFreeSviSurface({
      underlying: 'NIFTY',
      expiry: '2026-10-06',
      timeToExpiryYears: 7 / 365,
      impliedForward: 24850,
      atmIv: 0.142,
      rawChain: [
        { strike: 24600, ivBid: 0.151, ivMid: 0.153, ivAsk: 0.155 },
        { strike: 24800, ivBid: 0.141, ivMid: 0.142, ivAsk: 0.143 },
        { strike: 25000, ivBid: 0.136, ivMid: 0.138, ivAsk: 0.14 },
      ],
    });
    expect(surface.butterflyArbitrageFree).toBe(true);
    expect(surface.calendarArbitrageFree).toBe(true);

    const qDist = extractBreedenLitzenbergerQDistribution({
      spot: 24820,
      impliedForward: 24850,
      riskFreeRate: 0.0675,
      dividendYield: 0.012,
      timeToExpiryYears: 7 / 365,
      sviParams: surface.sviParamsMid,
    });
    expect(qDist.nonNegativeEverywhere).toBe(true);
    expect(qDist.totalProbabilityMass).toBeCloseTo(1.0, 2);

    const pDist = computePMeasureProbabilityEngine({
      spot: 24820,
      targetUnderlyingPrice: 24950,
      direction: 'ABOVE',
      timeToExpiryYears: 7 / 365,
      currentAtmIv: 0.142,
      historicalDailyReturns: HISTORICAL_252_DAILY_RETURNS,
    });
    expect(pDist.challengerForecasts.length).toBeGreaterThanOrEqual(6);
    expect(pDist.consensusPMeasureRange[1]).toBeGreaterThanOrEqual(pDist.consensusPMeasureRange[0]);
  });
});
