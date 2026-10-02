import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { getLegalDocuments } from '../src/legal/legalContent.js';
import { SITE_CONFIG } from '../src/config/siteConfig';
import { analyseChain, buildSnapshotFromChain, ChainFile, dailyReturns, realizedVolAnnualized } from '../src/data/marketData';
import { ControlRoomAndVerdictTab } from '../src/components/ControlRoomAndVerdictTab';
import { LegalCenter } from '../src/components/shell/Legal';
import { getContractSpecForDate, registerDynamicContractSpec } from '../src/engine/rulesEngine';
import { buildDynamicContractSpec } from '../src/data/marketData';

// Small synthetic chain in the exact on-disk format produced by scripts/fetch-market-data.mjs
const strikes = [21800, 21900, 22000, 22100, 22200, 22300, 22400, 22500, 22600, 22700, 22800, 22900, 23000];
const S = 22421.95;
const bs = (k: number, put: boolean) => {
  const intrinsic = Math.max(0, put ? k - S : S - k);
  return Number((intrinsic + 120 * Math.exp(-Math.abs(k - S) / 400)).toFixed(2));
};
const TEST_CHAIN: ChainFile = {
  symbol: 'TESTIDX',
  name: 'Test Index',
  type: 'INDEX',
  tradeDate: '2026-10-01',
  spot: S,
  prevClose: 22620,
  changePct: -0.88,
  lotSize: 65,
  lotSizeSource: 'test',
  inBanList: false,
  futures: [{ expiry: '2026-10-27', close: 22480, settle: 22480, prevClose: 22650, oi: 1000, chgOi: 10, volume: 100, lot: 65 }],
  expiries: ['2026-10-06'],
  chain: {
    '2026-10-06': strikes.map((k, i) => [k, bs(k, false), bs(k, false), 1000 + i * 100, 10, 500, bs(k, true), bs(k, true), 2000 - i * 100, 5, 400]),
  },
  history: Array.from({ length: 30 }, (_, i) => ({ d: `2026-08-${String(i + 1).padStart(2, '0')}`, c: 22000 + Math.sin(i) * 200 })),
  indexStats: null,
};

describe('V4.1 legal documents', () => {
  const docs = getLegalDocuments(SITE_CONFIG);
  const all = JSON.stringify(docs).toLowerCase();

  it('ships the five legal documents', () => {
    expect(docs.map((d) => d.id).sort()).toEqual(['disclaimer', 'privacy', 'risk', 'sources', 'terms'].sort());
  });

  it.each([
    ['not registered with sebi'],
    ['investment adviser'],
    ['research analyst'],
    ['as is'],
    ['limitation of liability'],
    ['indemn'],
    ['governing law'],
    ['18 years'],
    ['9 out of 10'],
    ['open-meteo'],
    ['national stock exchange'],
  ])('mentions "%s"', (needle) => {
    expect(all).toContain(needle);
  });

  it('renders the Legal Center without errors', () => {
    const html = renderToString(<LegalCenter asModal={false} />);
    expect(html).toContain('Important Disclaimer');
  });
});

describe('V4.1 public-data analytics', () => {
  it('analyses an NSE-format chain', () => {
    const a = analyseChain(TEST_CHAIN, '2026-10-06');
    expect(a.atmStrike).toBe(22400);
    expect(a.strikeStep).toBe(100);
    expect(a.daysToExpiry).toBe(5);
    expect(a.atmIv).not.toBeNull();
    expect(a.atmIv!).toBeGreaterThan(0.01);
    expect(a.atmIv!).toBeLessThan(2);
    expect(a.pcrOi).not.toBeNull();
  });

  it('builds an engine snapshot with no NaN values', () => {
    const { snapshot } = buildSnapshotFromChain(TEST_CHAIN, '2026-10-06', 14.46);
    expect(snapshot.spot).toBe(S);
    expect(snapshot.strikes.length).toBeGreaterThan(5);
    expect(JSON.stringify(snapshot)).not.toContain('null');
    for (const r of snapshot.strikes) {
      expect(Number.isFinite(r.callBid) && Number.isFinite(r.callAsk)).toBe(true);
      expect(r.callAsk).toBeGreaterThanOrEqual(r.callBid);
    }
  });

  it('computes returns and realised volatility from history', () => {
    expect(dailyReturns(TEST_CHAIN.history).length).toBe(29);
    const rv = realizedVolAnnualized(TEST_CHAIN.history, 20);
    expect(rv).not.toBeNull();
    expect(rv!).toBeGreaterThan(0);
  });

  it('uses the official lot size for current dates and flags unverified freeze quantity', () => {
    registerDynamicContractSpec(buildDynamicContractSpec(TEST_CHAIN, 100));
    const spec = getContractSpecForDate('TESTIDX', '2026-10-01');
    expect(spec.lotSize).toBe(65);
    expect(spec.freezeQuantityVerified).toBe(false);
  });
});

describe('V4.1 safety: end-of-day data can never produce a live TRADE CANDIDATE', () => {
  it('caps the Trade Check final state at WATCH in EOD research mode', () => {
    const html = renderToString(
      <ControlRoomAndVerdictTab
        selectedSymbol="NIFTY"
        spot={S}
        futures={22480}
        vwap={22400}
        atmIv={0.14}
        realizedVol={0.12}
        lotSize={65}
        capitalRupees={1000000}
        isDataStale={false}
        lockoutActive={false}
        qProbPct={45}
        pProbRangePct={[40, 50]}
        modelFairValueRange={[90, 110]}
        modelDispersionPct={1.5}
        es99Rupees={2000}
        marginReqRupees={6500}
        pipelineSteps={[]}
        numberFormatMode="LAKH_CRORE"
        onJournalConfirmManualExecution={() => {}}
        eodResearchMode
        defaultEntryPrice={100}
        defaultQuantity={65}
        strikeStep={50}
        expiryIso="2026-10-06"
      />
    );
    expect(html).not.toContain('FINAL STATE: <!-- -->TRADE CANDIDATE');
    expect(html).not.toContain('FINAL STATE: TRADE CANDIDATE');
    expect(html).toContain('not a recommendation');
  });
});
