import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { parsePubDate, parseFeed, makeSymbolMatcher, istDay, NEWS_FEEDS } from '../scripts/news-archive.mjs';
import { runSimpleBacktest, PriceBar, IDEAS } from '../src/engine/simpleBacktest';
import { NewsPanel } from '../src/components/shell/NewsWeather';
import { ReplayAndValidationTab } from '../src/components/ReplayAndValidationTab';
import { buildIdFromUrl } from '../src/components/shell/UpdateChecker';
import type { ChainFile, NewsFile } from '../src/data/marketData';

// ---------- synthetic price history ----------
function makeHistory(n: number, f: (i: number) => number): PriceBar[] {
  const out: PriceBar[] = [];
  const d0 = Date.UTC(2025, 9, 1);
  for (let i = 0; i < n; i++) {
    const c = f(i);
    out.push({ d: new Date(d0 + i * 86400000).toISOString().slice(0, 10), c, o: c * 0.999 });
  }
  return out;
}
const wave = makeHistory(250, (i) => 1000 + 120 * Math.sin(i / 9) + i * 0.8);

describe('Simple backtest on real-format prices', () => {
  it('buy & hold: buys on day 1 open, whole shares, pays costs', () => {
    const r = runSimpleBacktest(wave, 'BUY_HOLD', 25000, false)!;
    expect(r.trades).toHaveLength(1);
    expect(Number.isInteger(r.trades[0].units)).toBe(true);
    expect(r.trades[0].entryPrice).toBeCloseTo(wave[0].o!, 6);
    expect(r.costsPaid).toBeGreaterThan(20);
    expect(r.equity).toHaveLength(250);
  });
  it('NO PEEKING: changing future prices never changes earlier account values', () => {
    for (const idea of IDEAS.map((i) => i.id)) {
      const base = runSimpleBacktest(wave, idea, 50000, false)!;
      const poisoned = wave.map((b, i) => (i > 150 ? { ...b, c: b.c * (i % 2 ? 3 : 0.2), o: b.c * 5 } : b));
      const p = runSimpleBacktest(poisoned, idea, 50000, false)!;
      expect(p.equity.slice(0, 151)).toEqual(base.equity.slice(0, 151));
    }
  });
  it('trades happen at the NEXT day open after the signal', () => {
    const r = runSimpleBacktest(wave, 'TREND_20', 50000, false)!;
    expect(r.trades.length).toBeGreaterThan(1);
    const t = r.trades[0];
    const idx = wave.findIndex((b) => b.d === t.entryDate);
    expect(t.entryPrice).toBeCloseTo(wave[idx].o!, 6);
  });
  it('reports when capital cannot buy a single share, and handles fractional mode', () => {
    const pricey = makeHistory(60, () => 90000);
    expect(runSimpleBacktest(pricey, 'BUY_HOLD', 10000, false)!.cannotAfford).toBe(true);
    expect(runSimpleBacktest(pricey, 'BUY_HOLD', 10000, true)!.trades).toHaveLength(1);
  });
  it('needs at least 30 days', () => {
    expect(runSimpleBacktest(wave.slice(0, 10), 'BUY_HOLD', 10000, false)).toBeNull();
  });
});

describe('Unlimited news archive', () => {
  it('parses NSE IST timestamps and RFC dates', () => {
    expect(parsePubDate('02-Oct-2026 22:15:57')).toBe('2026-10-02T16:45:57.000Z');
    expect(parsePubDate('Fri, 2 Oct 2026 21:17:47 +0530')).toBe('2026-10-02T15:47:47.000Z');
    expect(parsePubDate('garbage')).toBeNull();
    expect(istDay('2026-10-01T20:00:00.000Z')).toBe('2026-10-02');
  });
  it('turns an NSE filing into "Company: subject"', () => {
    const xml = `<rss><item><title>Mishra Dhatu Nigam Limited</title><link>https://nsearchives.nseindia.com/x.xml</link><description>Mishra Dhatu Nigam Limited has informed the Exchange about Change in Directors |SUBJECT: Change in Directors/KMP</description><pubDate>02-Oct-2026 22:14:18</pubDate></item></rss>`;
    const [it0] = parseFeed(xml, { source: 'NSE', category: 'FILINGS', kind: 'NSE_FILINGS' });
    expect(it0.title).toBe('Mishra Dhatu Nigam: Change in Directors/KMP');
    expect(it0.category).toBe('FILINGS');
  });
  it('matches stocks by whole words and common names, avoiding known false positives', () => {
    const m = makeSymbolMatcher([
      { symbol: 'LICI', name: 'Life Insura of' },
      { symbol: 'ICICIPRULI', name: 'Icici Pru Life Ins Co' },
      { symbol: 'SBIN', name: 'State Bank of' },
      { symbol: 'BANKINDIA', name: 'Bank of' },
      { symbol: 'RELIANCE', name: 'Reliance Industries' },
      { symbol: 'NIFTY', name: 'Nifty 50', type: 'INDEX' },
    ]);
    expect(m('ICICI Prudential Life Insurance appoints new CEO')).toEqual(['ICICIPRULI']);
    expect(m('LIC raises stake in a PSU bank')).toContain('LICI');
    expect(m('Reserve Bank of India keeps repo rate unchanged')).not.toContain('BANKINDIA');
    expect(m('State Bank of India Q2 profit jumps')).toEqual(['SBIN']);
    expect(m('Bank of India cuts lending rate')).toEqual(['BANKINDIA']);
    expect(m('RIL shares rise; Nifty ends higher')).toEqual(expect.arrayContaining(['RELIANCE', 'NIFTY']));
  });
  it('uses many feeds incl. official NSE, SEBI and RBI sources', () => {
    expect(NEWS_FEEDS.length).toBeGreaterThanOrEqual(30);
    expect(NEWS_FEEDS.some((f) => f.kind === 'NSE_FILINGS')).toBe(true);
    expect(NEWS_FEEDS.some((f) => f.source.startsWith('SEBI'))).toBe(true);
  });
  it('hourly workflow archives news; daily workflow leaves news to it', () => {
    const news = readFileSync('.github/workflows/news-refresh.yml', 'utf8');
    expect(news).toContain('cron: "7 * * * *"');
    expect(news).toContain('contents: write');
    expect(news).toContain('data-snapshot/news/');
    expect(readFileSync('.github/workflows/ci-and-pages.yml', 'utf8')).toContain('--no-news');
  });
  it('panel shows more than the first page (no fixed limit)', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({
      title: `Headline number ${i}`,
      link: `https://example.com/${i}`,
      source: 'Test',
      category: 'MARKETS' as const,
      publishedIso: '2026-10-02T10:00:00.000Z',
      symbols: ['NIFTY'],
    }));
    const news: NewsFile = { fetchedAtIso: '2026-10-02T10:00:00.000Z', note: '', items, archive: { total: 5000, days: 30, firstDay: '2026-09-01' } };
    const html = renderToString(<NewsPanel news={news} symbol="NIFTY" limit={10} />);
    expect(html).toContain('Show <!-- -->20<!-- --> more');
    expect(html).toContain('Show all');
    expect(html).toContain('saved in the archive');
    expect(html).toContain('no limit');
  });
});

describe('Practice & Backtest is plain-language', () => {
  const chain = {
    symbol: 'TESTCO', name: 'Test Co', type: 'STOCK', tradeDate: '2026-06-08', spot: 1100, prevClose: 1090, changePct: 0.9,
    lotSize: 100, lotSizeSource: 'test', inBanList: false, futures: [], expiries: [], chain: {}, history: wave, indexStats: null,
  } as unknown as ChainFile;
  it('renders the real-data backtest with a plain summary', () => {
    const html = renderToString(<ReplayAndValidationTab capitalRupees={25000} numberFormatMode="LAKH_CRORE" chain={chain} />);
    expect(html).toContain('learn without risking money');
    expect(html).toContain('real past prices');
    expect(html).toContain('Simply buying and holding would have given');
    expect(html).toContain('Skill or luck?');
    expect(html).toContain('Words used on this page');
    expect(html).toContain('15-Jul-2025');
    expect(html).not.toContain('Section 67');
    expect(html).not.toContain('Bitemporal');
  });
  it('still renders without price history', () => {
    const html = renderToString(<ReplayAndValidationTab capitalRupees={10000} numberFormatMode="STANDARD" />);
    expect(html).toContain('Loading price history');
  });
});

describe('Build id', () => {
  it('comes from the hashed bundle name (Actions) or ?v= (branch mode)', () => {
    expect(buildIdFromUrl('https://x.github.io/r/assets/ind-quant-g_zrAK0E.js')).toBe('g_zrAK0E');
    expect(buildIdFromUrl('https://x.github.io/r/site/app.js?v=Ab12_-x')).toBe('Ab12_-x');
    expect(buildIdFromUrl('file:///home/user/src/x.tsx')).toBe('dev');
  });
});
