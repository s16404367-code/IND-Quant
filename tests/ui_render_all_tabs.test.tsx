import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { ControlRoomAndVerdictTab } from '../src/components/ControlRoomAndVerdictTab';
import { OptionChainAndSurfaceTab } from '../src/components/OptionChainAndSurfaceTab';
import { ModelsAndProbabilitiesTab } from '../src/components/ModelsAndProbabilitiesTab';
import { StrategyAndParetoTab } from '../src/components/StrategyAndParetoTab';
import { PortfolioRiskStudioTab } from '../src/components/PortfolioRiskStudioTab';
import { ReplayAndValidationTab } from '../src/components/ReplayAndValidationTab';
import { ContextDisciplineTaxCopilotTab } from '../src/components/ContextDisciplineTaxCopilotTab';
import { DataPrivacyAndAuditTab } from '../src/components/DataPrivacyAndAuditTab';
import {
  DEFAULT_PORTFOLIO_LEDGER,
  HISTORICAL_252_DAILY_RETURNS,
  MARKET_UNIVERSE_SNAPSHOTS,
} from '../src/engine/verifiedHistoricalFixtures';
import {
  computeImpliedForwardFromParity,
  evaluateAll51Models,
} from '../src/engine/pricingModels';
import {
  buildArbitrageFreeSviSurface,
  computePMeasureProbabilityEngine,
  extractBreedenLitzenbergerQDistribution,
} from '../src/engine/volSurfaceAndDist';
import {
  computePortfolioVarAndEs,
  evaluatePreTradeComplianceGate,
  runPortfolioStressSuite,
  runReverseStressSearch,
} from '../src/engine/riskAndLimitsEngine';
import { rebuildPortfolioFromLedger } from '../src/engine/ledgerAndTaxEngine';
import {
  createImmutableDecisionSnapshot,
  runAll55PipelineSteps,
} from '../src/engine/disciplineAndCopilot';

describe('Full UI Component Rendering Verification (All 8 Tabs + Root App)', () => {
  const snap = MARKET_UNIVERSE_SNAPSHOTS.NIFTY;
  const T = snap.daysToExpiry / 365;
  const atmRow = snap.strikes[5];
  const fwd = computeImpliedForwardFromParity({
    spot: snap.spot,
    timeToExpiryYears: T,
    riskFreeRate: snap.riskFreeRate,
    strikes: snap.strikes.map((r) => ({
      strike: r.strike,
      callMid: (r.callBid + r.callAsk) / 2,
      putMid: (r.putBid + r.putAsk) / 2,
    })),
  });
  const svi = buildArbitrageFreeSviSurface({
    underlying: snap.symbol,
    expiry: snap.currentExpiry,
    timeToExpiryYears: T,
    impliedForward: fwd.impliedForward,
    atmIv: snap.atmIv,
    ivHistory52wLow: 0.1,
    ivHistory52wHigh: 0.22,
    rawChain: snap.strikes.map((r) => ({
      strike: r.strike,
      ivBid: snap.atmIv - 0.003,
      ivMid: snap.atmIv,
      ivAsk: snap.atmIv + 0.003,
    })),
  });
  const qDist = extractBreedenLitzenbergerQDistribution({
    spot: snap.spot,
    impliedForward: fwd.impliedForward,
    timeToExpiryYears: T,
    riskFreeRate: snap.riskFreeRate,
    dividendYield: fwd.impliedDividendYield,
    sviParams: svi.sviParamsMid,
  });
  const pDist = computePMeasureProbabilityEngine({
    spot: snap.spot,
    targetUnderlyingPrice: snap.spot + 100,
    direction: 'ABOVE',
    timeToExpiryYears: T,
    currentAtmIv: snap.atmIv,
    historicalDailyReturns: HISTORICAL_252_DAILY_RETURNS,
  });

  it('renders the root <App /> without runtime errors', () => {
    const html = renderToString(<App />);
    expect(html).toContain('IND-QUANT');
    expect(html).toContain('Education only — not investment advice.');
    expect(html).toContain('Not SEBI-registered');
    expect(html).toContain('v4.1');
    expect(html).toContain('aria-label="Select stock or index"');
    // V4.1: there must be no credential / API-key entry anywhere in the root shell
    expect(html).not.toMatch(/type="password"/);
    expect(html).not.toContain('API Keys Vault');
  });

  it('renders Tab 1 (ControlRoomAndVerdictTab) without runtime errors', () => {
    const steps = runAll55PipelineSteps({
      underlying: 'NIFTY',
      spot: snap.spot,
      futures: snap.futures,
      atmIvPct: 13.4,
      rvPct: 11.8,
      netPnlNow: 1439.3,
      netBreakeven: 100.81,
      costHurdlePct: 0.81,
      netRr: 1.5,
      qProbPct: 44,
      pProbPct: 48,
      es99Rupees: 2100,
      marginReqRupees: 7500,
      capitalRupees: 25000,
      lockoutActive: false,
      finalState: 'TRADE CANDIDATE',
    });
    const html = renderToString(
      <ControlRoomAndVerdictTab
        selectedSymbol="NIFTY"
        spot={snap.spot}
        futures={snap.futures}
        vwap={snap.vwap}
        atmIv={snap.atmIv}
        realizedVol={snap.realizedVol20d}
        lotSize={65}
        capitalRupees={25000}
        isDataStale={false}
        lockoutActive={false}
        qProbPct={44.2}
        pProbRangePct={[45.1, 51.3]}
        modelFairValueRange={[94.2, 99.8]}
        modelDispersionPct={1.8}
        es99Rupees={2100}
        marginReqRupees={7500}
        pipelineSteps={steps}
        numberFormatMode="LAKH_CRORE"
        onJournalConfirmManualExecution={() => {}}
      />
    );
    expect(html).toContain('PROFIT-AFTER-ALL-COSTS');
  });

  it('renders Tab 2 (OptionChainAndSurfaceTab) without runtime errors', () => {
    const html = renderToString(
      <OptionChainAndSurfaceTab
        snapshot={snap}
        lotSize={65}
        capitalRupees={25000}
        impliedForwardResult={fwd}
        sviSurface={svi}
      />
    );
    expect(html).toContain('Option chain');
  });

  it('renders Tab 3 (ModelsAndProbabilitiesTab) without runtime errors', () => {
    const html = renderToString(
      <ModelsAndProbabilitiesTab
        selectedSymbol="NIFTY"
        spot={snap.spot}
        atmStrike={atmRow.strike}
        timeToExpiryYears={T}
        riskFreeRate={snap.riskFreeRate}
        dividendYield={fwd.impliedDividendYield}
        atmIv={snap.atmIv}
        marketBid={atmRow.callBid}
        marketAsk={atmRow.callAsk}
        impliedForward={fwd.impliedForward}
        qDistribution={qDist}
        pDistribution={pDist}
        qProbPct={44.2}
      />
    );
    expect(html).toContain('All 51 pricing models');
  });

  it('renders Tab 4 (StrategyAndParetoTab) without runtime errors', () => {
    const html = renderToString(
      <StrategyAndParetoTab
        selectedSymbol="NIFTY"
        spot={snap.spot}
        lotSize={65}
        capitalRupees={25000}
        atmIv={snap.atmIv}
        portfolioDeltaRupees={1200}
        portfolioEs99Rupees={3400}
        numberFormatMode="LAKH_CRORE"
      />
    );
    expect(html).toContain('Pareto frontier');
  });

  it('renders Tab 5 (PortfolioRiskStudioTab) without runtime errors', () => {
    const pState = rebuildPortfolioFromLedger(DEFAULT_PORTFOLIO_LEDGER, {
      'NIFTY-2026-10-06-24850-CE': { price: 118, underlyingSpot: snap.spot },
    });
    const rMetrics = computePortfolioVarAndEs({
      portfolioValueRupees: 100000,
      netDeltaRupeesPer1Pct: pState.portfolioGreeksRupees.netDeltaRupees,
      netGammaRupeesPer1PctSq: pState.portfolioGreeksRupees.netGammaRupees,
      netVegaRupeesPer1PctIv: pState.portfolioGreeksRupees.netVegaRupeesPer1PctIv,
      dailyHistoricalReturns: HISTORICAL_252_DAILY_RETURNS,
    });
    const stress = runPortfolioStressSuite({
      spot: snap.spot,
      baseIv: snap.atmIv,
      timeToExpiryYears: T,
      riskFreeRate: snap.riskFreeRate,
      dividendYield: 0.012,
      netDeltaRupeesPer1Pct: pState.portfolioGreeksRupees.netDeltaRupees,
      netGammaRupeesPer1PctSq: pState.portfolioGreeksRupees.netGammaRupees,
      netVegaRupeesPer1PctIv: pState.portfolioGreeksRupees.netVegaRupeesPer1PctIv,
      hedgeDeltaRupeesPer1Pct: -500,
      hedgeGammaRupeesPer1PctSq: 100,
      hedgeVegaRupeesPer1PctIv: 80,
    });
    const rev = runReverseStressSearch({
      maxLossLimitRupees: 15000,
      esLimitRupees: 20000,
      marginCallBufferRupees: 12000,
      drawdownLimitRupees: 25000,
      netDeltaRupeesPer1Pct: pState.portfolioGreeksRupees.netDeltaRupees,
      netGammaRupeesPer1PctSq: pState.portfolioGreeksRupees.netGammaRupees,
      netVegaRupeesPer1PctIv: pState.portfolioGreeksRupees.netVegaRupeesPer1PctIv,
    });
    const gate = evaluatePreTradeComplianceGate({
      capitalRupees: 100000,
      currentDrawdownPct: 1.5,
      indiaVix: 14.2,
      candidateMaxLossRupees: 2000,
      postTradeMarginRupees: 15000,
      postTradeEsRupees: rMetrics.historicalEsRupees,
      postTradeNetDeltaRupeesPer1Pct: pState.portfolioGreeksRupees.netDeltaRupees,
      postTradeThetaBleedPerDayRupees: pState.portfolioGreeksRupees.netThetaRupeesPerDay,
      realizedDailyLossRupees: 0,
      tradesTakenToday: 1,
      consecutiveLosses: 0,
      limits: {
        maxRiskPerTradePctOfCapital: 15,
        maxDailyLossRupees: 5000,
        maxMarginUtilizationPct: 80,
        maxPortfolioEsPctOfCapital: 25,
        maxNetDeltaPctOfCapital: 35,
        maxThetaBleedPerDayPctOfCapital: 5,
        maxTradesPerDay: 5,
        maxConsecutiveLossesBeforeCoolOff: 3,
      },
    });
    const html = renderToString(
      <PortfolioRiskStudioTab
        portfolioState={pState}
        riskMetrics={rMetrics}
        historicalCrises={stress.historicalCrises}
        priceIvGrid={stress.priceIvGrid}
        reverseStressResults={rev}
        complianceGate={gate}
        numberFormatMode="LAKH_CRORE"
      />
    );
    expect(html).toContain('Portfolio risk studio');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });

  it('renders Tab 6 (ReplayAndValidationTab) without runtime errors', () => {
    const html = renderToString(
      <ReplayAndValidationTab capitalRupees={10000} numberFormatMode="LAKH_CRORE" />
    );
    expect(html).toContain('15-Jul-2025');
  });

  it('renders Tab 7 (ContextDisciplineTaxCopilotTab) without runtime errors', () => {
    const pState = rebuildPortfolioFromLedger(DEFAULT_PORTFOLIO_LEDGER, {});
    const html = renderToString(
      <ContextDisciplineTaxCopilotTab
        selectedSymbol="NIFTY"
        spot={snap.spot}
        vwap={snap.vwap}
        atmIv={snap.atmIv}
        realizedVol={snap.realizedVol20d}
        indiaVix={14.2}
        netPnlNow={1439.3}
        netBreakeven={100.81}
        costHurdleRupees={60.7}
        qProbPct={44.2}
        pProbPct={48.5}
        modelMedian={96.5}
        modelDispersionPct={1.8}
        es99Rupees={2100}
        finalState="TRADE CANDIDATE"
        closedTrades={pState.closedTrades}
        onAddManualFillTx={() => {}}
        numberFormatMode="LAKH_CRORE"
        simulateDailyLossLockout={false}
        setSimulateDailyLossLockout={() => {}}
      />
    );
    expect(html).toContain('93%');
  });

  it('renders Tab 8 (DataPrivacyAndAuditTab) without any key-entry fields', () => {
    const snap1 = createImmutableDecisionSnapshot({
      previousHash: 'GENESIS',
      timestampIso: '2026-10-01T12:30:00.000Z',
      underlying: 'NIFTY',
      spotPrice: 22421.95,
      atmIv: 0.14,
      capitalRupees: 25000,
      finalDecisionState: 'WATCH',
      summaryReason: 'test',
    });
    const html = renderToString(
      <DataPrivacyAndAuditTab
        meta={null}
        decisionSnapshots={[snap1]}
        onCustomSpotOverride={() => {}}
        customSpotActive={false}
        currentSpot={22421.95}
      />
    );
    expect(html).toContain('API key, broker token or password');
    expect(html).not.toMatch(/type="password"/);
    expect(html).not.toMatch(/placeholder="[^"]*(api|token|key)[^"]*"/i);
  });
});
