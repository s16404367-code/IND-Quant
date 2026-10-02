/**
 * Point-in-Time Historical Replay Snapshots (15-Jul-2025 Mandatory Section 3 Demo & 2026 Snapshots),
 * Multi-Underlying Option Chains, News 11-Dimension Records, Macro Event Calendar,
 * Earnings Studies, Cross-Asset Global Context, and Default Portfolio Ledger.
 *
 * All historical replay records carry strict Bitemporal Timestamps (event, publication, ingestion, effective).
 *
 * V4.1 NOTICE: everything in this file is ILLUSTRATIVE SAMPLE DATA used to demonstrate features and in tests.
 * It is NOT actual market data, NOT real company filings and NOT real news. Live screens use the real
 * NSE end-of-day snapshot from public/data (see src/data/marketData.ts) instead.
 */

import { BitemporalRecord } from './bitemporalStore';
import { HistoricalIntradayBar } from './backtestAndValidation';
import { LedgerTransaction } from './ledgerAndTaxEngine';
import { NewsItemAnalysis } from './microstructureAndTca';

export const HISTORICAL_REPLAY_15_JUL_2025_RECORDS: BitemporalRecord<HistoricalIntradayBar>[] = [
  {
    id: 'BAR-20250715-0915',
    key: 'BAR-09:15',
    version: 1,
    eventTime: '2025-07-15T03:45:00.000Z',       // 09:15 IST
    publicationTime: '2025-07-15T03:45:01.000Z',
    ingestionTime: '2025-07-15T03:45:01.200Z',
    effectiveTime: '2025-07-15T03:45:02.000Z',
    source: 'Illustrative sample replay dataset (not an actual NSE record)',
    sourceTier: 'TIER_4_USER_SUPPLIED_OR_ARCHIVED',
    payload: {
      barTimestampIso: '2025-07-15T03:45:02.000Z',
      underlying: 'NIFTY',
      spot: 24480.0,
      futures: 24512.0,
      vwap: 24482.0,
      atmStrike: 24500,
      atmCallBid: 148.0,
      atmCallAsk: 151.5, // 151.5 * 75 = ₹11,362.50 (> ₹10,000!)
      atmPutBid: 142.0,
      atmPutAsk: 145.5,
      affordableOtmCallStrike: 24650,
      affordableOtmCallBid: 74.0,
      affordableOtmCallAsk: 76.5, // 76.5 * 75 = ₹5,737.50 (<= ₹10,000)
      atmIv: 0.138,
      realizedVol: 0.124,
      indiaVix: 13.9,
      callOi: 4250000,
      putOi: 4180000,
      newsHeadlineAtBar: 'MoSPI CPI inflation print from prior evening within RBI comfort band at 4.6%.',
      newsConfirmedStatus: 'OFFICIALLY_CONFIRMED',
      weatherForecastAtBar: 'IMD 08:30 IST Bulletin: Normal monsoon progression across Western & Central India.',
      weatherActualLater: 'Normal rainfall observed; no industrial/grid disruption.',
    },
  },
  {
    id: 'BAR-20250715-0945',
    key: 'BAR-09:45',
    version: 1,
    eventTime: '2025-07-15T04:15:00.000Z',       // 09:45 IST
    publicationTime: '2025-07-15T04:15:01.000Z',
    ingestionTime: '2025-07-15T04:15:01.200Z',
    effectiveTime: '2025-07-15T04:15:02.000Z',
    source: 'Illustrative sample replay dataset (not an actual NSE record)',
    sourceTier: 'TIER_4_USER_SUPPLIED_OR_ARCHIVED',
    payload: {
      barTimestampIso: '2025-07-15T04:15:02.000Z',
      underlying: 'NIFTY',
      spot: 24488.0,
      futures: 24518.0,
      vwap: 24485.0,
      atmStrike: 24500,
      atmCallBid: 150.0,
      atmCallAsk: 151.0,
      atmPutBid: 139.0,
      atmPutAsk: 140.5,
      affordableOtmCallStrike: 24650,
      affordableOtmCallBid: 75.5,
      affordableOtmCallAsk: 76.5,
      atmIv: 0.137,
      realizedVol: 0.123,
      indiaVix: 13.8,
      callOi: 4410000,
      putOi: 4520000,
      newsHeadlineAtBar: null,
      newsConfirmedStatus: 'NONE',
      weatherForecastAtBar: 'IMD 08:30 IST Bulletin: Normal monsoon progression.',
      weatherActualLater: 'Normal rainfall observed.',
    },
  },
  {
    id: 'BAR-20250715-1030',
    key: 'BAR-10:30',
    version: 1,
    eventTime: '2025-07-15T05:00:00.000Z',       // 10:30 IST
    publicationTime: '2025-07-15T05:00:01.000Z',
    ingestionTime: '2025-07-15T05:00:01.200Z',
    effectiveTime: '2025-07-15T05:00:02.000Z',
    source: 'Illustrative sample replay dataset (not an actual NSE record)',
    sourceTier: 'TIER_4_USER_SUPPLIED_OR_ARCHIVED',
    payload: {
      barTimestampIso: '2025-07-15T05:00:02.000Z',
      underlying: 'NIFTY',
      spot: 24538.0,
      futures: 24569.0,
      vwap: 24494.0,
      atmStrike: 24500,
      atmCallBid: 176.0,
      atmCallAsk: 177.0,
      atmPutBid: 118.0,
      atmPutAsk: 119.0,
      affordableOtmCallStrike: 24650,
      affordableOtmCallBid: 89.0,
      affordableOtmCallAsk: 89.8,
      atmIv: 0.139,
      realizedVol: 0.128,
      indiaVix: 14.0,
      callOi: 4120000,
      putOi: 5190000,
      newsHeadlineAtBar: 'NSE Filing (10:22 IST): Major IT & Banking constituents report steady Q1 institutional deposit growth.',
      newsConfirmedStatus: 'OFFICIALLY_CONFIRMED',
      weatherForecastAtBar: 'IMD 10:00 IST Update: Normal regional forecast.',
      weatherActualLater: 'Normal rainfall observed.',
    },
  },
  {
    id: 'BAR-20250715-1115',
    key: 'BAR-11:15',
    version: 1,
    eventTime: '2025-07-15T05:45:00.000Z',       // 11:15 IST (Exact Section 3 Example Timestamp!)
    publicationTime: '2025-07-15T05:45:01.000Z',
    ingestionTime: '2025-07-15T05:45:01.200Z',
    effectiveTime: '2025-07-15T05:45:02.000Z',
    source: 'Illustrative sample replay dataset (not an actual NSE record)',
    sourceTier: 'TIER_4_USER_SUPPLIED_OR_ARCHIVED',
    payload: {
      barTimestampIso: '2025-07-15T05:45:02.000Z',
      underlying: 'NIFTY',
      spot: 24564.0,
      futures: 24596.0,
      vwap: 24508.0,
      atmStrike: 24550,
      atmCallBid: 162.0,
      atmCallAsk: 163.0, // ₹12,225 for 75 lot -> NOT EXECUTABLE WITH ₹10,000!
      atmPutBid: 121.0,
      atmPutAsk: 122.0,
      affordableOtmCallStrike: 24650,
      affordableOtmCallBid: 98.0,
      affordableOtmCallAsk: 99.0, // ₹7,425 for 75 lot -> EXECUTABLE WITH ₹10,000!
      atmIv: 0.141,
      realizedVol: 0.131,
      indiaVix: 14.1,
      callOi: 3980000,
      putOi: 5640000,
      newsHeadlineAtBar: 'RBI Liquidity Operations Announcement (11:05 IST): Comfortable banking system surplus maintained.',
      newsConfirmedStatus: 'OFFICIALLY_CONFIRMED',
      weatherForecastAtBar: 'IMD 11:00 IST Forecast: No adverse weather warning for financial/industrial corridors.',
      weatherActualLater: 'Afternoon coastal shower at 14:30 IST (unavailable at 11:15 IST entry!).',
    },
  },
  {
    id: 'BAR-20250715-1230',
    key: 'BAR-12:30',
    version: 1,
    eventTime: '2025-07-15T07:00:00.000Z',       // 12:30 IST
    publicationTime: '2025-07-15T07:00:01.000Z',
    ingestionTime: '2025-07-15T07:00:01.200Z',
    effectiveTime: '2025-07-15T07:00:02.000Z',
    source: 'Illustrative sample replay dataset (not an actual NSE record)',
    sourceTier: 'TIER_4_USER_SUPPLIED_OR_ARCHIVED',
    payload: {
      barTimestampIso: '2025-07-15T07:00:02.000Z',
      underlying: 'NIFTY',
      spot: 24598.0,
      futures: 24628.0,
      vwap: 24529.0,
      atmStrike: 24600,
      atmCallBid: 158.0,
      atmCallAsk: 159.0,
      atmPutBid: 124.0,
      atmPutAsk: 125.0,
      affordableOtmCallStrike: 24650,
      affordableOtmCallBid: 116.5,
      affordableOtmCallAsk: 117.5,
      atmIv: 0.142,
      realizedVol: 0.133,
      indiaVix: 14.2,
      callOi: 3750000,
      putOi: 6100000,
      newsHeadlineAtBar: 'POST-ENTRY DISCLOSURE (12:18 IST): European markets open higher; DXY softens 0.25%.',
      newsConfirmedStatus: 'REPUTABLE_REPORT',
      weatherForecastAtBar: 'IMD 12:00 IST Forecast: Normal conditions.',
      weatherActualLater: 'Afternoon coastal shower at 14:30 IST.',
    },
  },
  {
    id: 'BAR-20250715-1415',
    key: 'BAR-14:15',
    version: 1,
    eventTime: '2025-07-15T08:45:00.000Z',       // 14:15 IST
    publicationTime: '2025-07-15T08:45:01.000Z',
    ingestionTime: '2025-07-15T08:45:01.200Z',
    effectiveTime: '2025-07-15T08:45:02.000Z',
    source: 'Illustrative sample replay dataset (not an actual NSE record)',
    sourceTier: 'TIER_4_USER_SUPPLIED_OR_ARCHIVED',
    payload: {
      barTimestampIso: '2025-07-15T08:45:02.000Z',
      underlying: 'NIFTY',
      spot: 24542.0,
      futures: 24570.0,
      vwap: 24536.0,
      atmStrike: 24550,
      atmCallBid: 138.0,
      atmCallAsk: 139.5,
      atmPutBid: 134.0,
      atmPutAsk: 135.5,
      affordableOtmCallStrike: 24650,
      affordableOtmCallBid: 86.0,
      affordableOtmCallAsk: 87.0,
      atmIv: 0.139,
      realizedVol: 0.132,
      indiaVix: 14.0,
      callOi: 4300000,
      putOi: 5400000,
      newsHeadlineAtBar: 'POST-ENTRY NEWS (14:05 IST): Profit booking in IT ahead of US retail sales data.',
      newsConfirmedStatus: 'REPUTABLE_REPORT',
      weatherForecastAtBar: 'IMD 14:00 IST Update: Coastal rain squall reported.',
      weatherActualLater: 'Coastal rain squall occurred at 14:30 IST.',
    },
  },
  {
    id: 'BAR-20250715-1520',
    key: 'BAR-15:20',
    version: 1,
    eventTime: '2025-07-15T09:50:00.000Z',       // 15:20 IST
    publicationTime: '2025-07-15T09:50:01.000Z',
    ingestionTime: '2025-07-15T09:50:01.200Z',
    effectiveTime: '2025-07-15T09:50:02.000Z',
    source: 'Illustrative sample replay dataset (not an actual NSE record)',
    sourceTier: 'TIER_4_USER_SUPPLIED_OR_ARCHIVED',
    payload: {
      barTimestampIso: '2025-07-15T09:50:02.000Z',
      underlying: 'NIFTY',
      spot: 24576.0,
      futures: 24604.0,
      vwap: 24541.0,
      atmStrike: 24550,
      atmCallBid: 156.0,
      atmCallAsk: 157.0,
      atmPutBid: 112.0,
      atmPutAsk: 113.0,
      affordableOtmCallStrike: 24650,
      affordableOtmCallBid: 108.5,
      affordableOtmCallAsk: 109.5,
      atmIv: 0.138,
      realizedVol: 0.13,
      indiaVix: 13.85,
      callOi: 4050000,
      putOi: 5890000,
      newsHeadlineAtBar: 'NSE Closing Bell Prep (15:15 IST): Institutional VWAP buying in index heavyweights.',
      newsConfirmedStatus: 'OFFICIALLY_CONFIRMED',
      weatherForecastAtBar: 'IMD 15:00 IST Bulletin: Normal conditions.',
      weatherActualLater: 'Session closed without weather disruption.',
    },
  },
];

export interface UnderlyingMarketSnapshot {
  symbol: string;
  name: string;
  spot: number;
  futures: number;
  vwap: number;
  dayChangePct: number;
  atmIv: number;
  realizedVol20d: number;
  indiaVix: number;
  currentExpiry: string;
  nextExpiry: string;
  daysToExpiry: number;
  riskFreeRate: number;
  fundamentalContext: {
    marketCapCr: string;
    peRatio: number;
    roePct: number;
    debtToEquity: number;
    dividendYieldPct: number;
    beta: number;
    earningsTrend: string;
    shortSellSlbmFeasible: boolean;
    shortSellNote: string;
  };
  strikes: Array<{
    strike: number;
    callBid: number;
    callAsk: number;
    callLtp: number;
    callOi: number;
    callChangeOi: number;
    callVolume: number;
    callBidQty: number;
    callAskQty: number;
    putBid: number;
    putAsk: number;
    putLtp: number;
    putOi: number;
    putChangeOi: number;
    putVolume: number;
    putBidQty: number;
    putAskQty: number;
  }>;
}

function buildChainForSpot(
  spot: number,
  step: number,
  baseIv: number,
  dte: number,
  lotSize: number
): UnderlyingMarketSnapshot['strikes'] {
  const atm = Math.round(spot / step) * step;
  const T = Math.max(1 / 365, dte / 365);
  const rows: UnderlyingMarketSnapshot['strikes'] = [];

  for (let offset = -5; offset <= 5; offset++) {
    const K = atm + offset * step;
    const m = (K - spot) / spot;
    const localIv = baseIv * (1 - 0.85 * m + 3.2 * m * m);
    const stdPts = spot * localIv * Math.sqrt(T);
    const callIntrinsic = Math.max(0, spot - K);
    const putIntrinsic = Math.max(0, K - spot);
    const timeVal = 0.4 * stdPts * Math.exp(-Math.abs(K - spot) / (1.15 * stdPts));

    const callMid = Math.max(1.2, callIntrinsic + timeVal);
    const putMid = Math.max(1.2, putIntrinsic + timeVal * 0.96);

    const spreadC = Math.max(0.15, Number((callMid * (0.004 + Math.abs(offset) * 0.0015)).toFixed(2)));
    const spreadP = Math.max(0.15, Number((putMid * (0.004 + Math.abs(offset) * 0.0015)).toFixed(2)));

    rows.push({
      strike: K,
      callBid: Number((callMid - 0.5 * spreadC).toFixed(2)),
      callAsk: Number((callMid + 0.5 * spreadC).toFixed(2)),
      callLtp: Number(callMid.toFixed(2)),
      callOi: Math.round((65000 - Math.abs(offset) * 7500 + (offset > 0 ? 18000 : 0)) * (lotSize / 50)),
      callChangeOi: Math.round((offset >= 0 ? 6400 - offset * 800 : -2200) * (lotSize / 50)),
      callVolume: Math.round((140000 - Math.abs(offset) * 18000) * (lotSize / 50)),
      callBidQty: lotSize * (14 - Math.abs(offset)),
      callAskQty: lotSize * (12 - Math.abs(offset)),
      putBid: Number((putMid - 0.5 * spreadP).toFixed(2)),
      putAsk: Number((putMid + 0.5 * spreadP).toFixed(2)),
      putLtp: Number(putMid.toFixed(2)),
      putOi: Math.round((68000 - Math.abs(offset) * 7200 + (offset < 0 ? 22000 : 0)) * (lotSize / 50)),
      putChangeOi: Math.round((offset <= 0 ? 8900 + offset * 900 : -1400) * (lotSize / 50)),
      putVolume: Math.round((135000 - Math.abs(offset) * 17000) * (lotSize / 50)),
      putBidQty: lotSize * (15 - Math.abs(offset)),
      putAskQty: lotSize * (11 - Math.abs(offset)),
    });
  }

  return rows;
}

export const MARKET_UNIVERSE_SNAPSHOTS: Record<string, UnderlyingMarketSnapshot> = {
  NIFTY: {
    symbol: 'NIFTY',
    name: 'Nifty 50 Index (NSE)',
    spot: 24820.0,
    futures: 24858.5,
    vwap: 24768.0,
    dayChangePct: +0.64,
    atmIv: 0.142,
    realizedVol20d: 0.126,
    indiaVix: 14.35,
    currentExpiry: '2026-10-06 (Weekly Tuesday)',
    nextExpiry: '2026-10-13 (Next Tuesday)',
    daysToExpiry: 4,
    riskFreeRate: 0.0675,
    fundamentalContext: {
      marketCapCr: '₹2,14,50,000 Cr (50 Constituents)',
      peRatio: 22.4,
      roePct: 15.8,
      debtToEquity: 0.42,
      dividendYieldPct: 1.22,
      beta: 1.0,
      earningsTrend: 'FY27 Consensus EPS growth +13.4% YoY',
      shortSellSlbmFeasible: true,
      shortSellNote: 'Liquid index futures & options; no SLBM borrow constraint.',
    },
    strikes: buildChainForSpot(24820, 50, 0.142, 4, 65),
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    name: 'Nifty Bank Index (NSE Monthly)',
    spot: 52940.0,
    futures: 53065.0,
    vwap: 52810.0,
    dayChangePct: +0.52,
    atmIv: 0.156,
    realizedVol20d: 0.141,
    indiaVix: 14.35,
    currentExpiry: '2026-10-27 (Monthly Last Tuesday)',
    nextExpiry: '2026-11-24 (Next Monthly Tuesday)',
    daysToExpiry: 25,
    riskFreeRate: 0.0675,
    fundamentalContext: {
      marketCapCr: '₹44,20,000 Cr (12 Banking Constituents)',
      peRatio: 16.2,
      roePct: 16.4,
      debtToEquity: 0.0,
      dividendYieldPct: 0.95,
      beta: 1.18,
      earningsTrend: 'NIMs stable at 3.8%; credit growth 13.8% YoY',
      shortSellSlbmFeasible: true,
      shortSellNote: 'Liquid monthly index futures & options; weekly contracts discontinued per SEBI rule.',
    },
    strikes: buildChainForSpot(52940, 100, 0.156, 25, 30),
  },
  FINNIFTY: {
    symbol: 'FINNIFTY',
    name: 'Nifty Financial Services (NSE Monthly)',
    spot: 24410.0,
    futures: 24468.0,
    vwap: 24365.0,
    dayChangePct: +0.48,
    atmIv: 0.151,
    realizedVol20d: 0.136,
    indiaVix: 14.35,
    currentExpiry: '2026-10-27 (Monthly Last Tuesday)',
    nextExpiry: '2026-11-24 (Next Monthly Tuesday)',
    daysToExpiry: 25,
    riskFreeRate: 0.0675,
    fundamentalContext: {
      marketCapCr: '₹56,80,000 Cr (Banks + NBFCs + Insurers)',
      peRatio: 18.1,
      roePct: 16.1,
      debtToEquity: 0.0,
      dividendYieldPct: 1.02,
      beta: 1.14,
      earningsTrend: 'Strong NBFC & insurance AUM expansion',
      shortSellSlbmFeasible: true,
      shortSellNote: 'Monthly index futures & options executable.',
    },
    strikes: buildChainForSpot(24410, 50, 0.151, 25, 60),
  },
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd (NSE Stock F&O)',
    spot: 2985.0,
    futures: 2996.0,
    vwap: 2972.0,
    dayChangePct: +0.78,
    atmIv: 0.214,
    realizedVol20d: 0.192,
    indiaVix: 14.35,
    currentExpiry: '2026-10-27 (Monthly Physical Settlement)',
    nextExpiry: '2026-11-24 (Monthly Physical Settlement)',
    daysToExpiry: 25,
    riskFreeRate: 0.0675,
    fundamentalContext: {
      marketCapCr: '₹20,18,000 Cr',
      peRatio: 26.8,
      roePct: 9.8,
      debtToEquity: 0.41,
      dividendYieldPct: 0.34,
      beta: 1.08,
      earningsTrend: 'Jio ARPU expansion + O2C refining margins steady',
      shortSellSlbmFeasible: true,
      shortSellNote: 'Deep F&O futures & SLBM pool; note physical delivery obligation if held into expiry.',
    },
    strikes: buildChainForSpot(2985, 20, 0.214, 25, 500),
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd (NSE Stock F&O)',
    spot: 1742.0,
    futures: 1749.5,
    vwap: 1736.0,
    dayChangePct: +0.44,
    atmIv: 0.188,
    realizedVol20d: 0.165,
    indiaVix: 14.35,
    currentExpiry: '2026-10-27 (Monthly Physical Settlement)',
    nextExpiry: '2026-11-24 (Monthly Physical Settlement)',
    daysToExpiry: 25,
    riskFreeRate: 0.0675,
    fundamentalContext: {
      marketCapCr: '₹13,28,000 Cr',
      peRatio: 19.4,
      roePct: 16.2,
      debtToEquity: 0.0,
      dividendYieldPct: 1.12,
      beta: 1.05,
      earningsTrend: 'LDR normalization progressing; steady retail deposit inflow',
      shortSellSlbmFeasible: true,
      shortSellNote: 'Liquid monthly stock futures; overnight physical equity short requires SLBM borrow.',
    },
    strikes: buildChainForSpot(1742, 10, 0.188, 25, 550),
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Ltd (NSE Stock F&O)',
    spot: 1890.0,
    futures: 1897.0,
    vwap: 1882.0,
    dayChangePct: +0.91,
    atmIv: 0.238,
    realizedVol20d: 0.211,
    indiaVix: 14.35,
    currentExpiry: '2026-10-27 (Monthly Physical Settlement)',
    nextExpiry: '2026-11-24 (Monthly Physical Settlement)',
    daysToExpiry: 25,
    riskFreeRate: 0.0675,
    fundamentalContext: {
      marketCapCr: '₹7,84,000 Cr',
      peRatio: 27.9,
      roePct: 31.4,
      debtToEquity: 0.08,
      dividendYieldPct: 2.35,
      beta: 0.92,
      earningsTrend: 'Q2 FY27 constant-currency guidance 3.5%–4.5% YoY; high USD/INR sensitivity',
      shortSellSlbmFeasible: true,
      shortSellNote: 'Liquid monthly stock futures; watch quarterly earnings gap risk.',
    },
    strikes: buildChainForSpot(1890, 20, 0.238, 25, 400),
  },
  NTPC: {
    symbol: 'NTPC',
    name: 'NTPC Ltd (Power / Utilities — Weather Sensitive)',
    spot: 418.0,
    futures: 420.2,
    vwap: 414.5,
    dayChangePct: +1.15,
    atmIv: 0.252,
    realizedVol20d: 0.228,
    indiaVix: 14.35,
    currentExpiry: '2026-10-27 (Monthly Physical Settlement)',
    nextExpiry: '2026-11-24 (Monthly Physical Settlement)',
    daysToExpiry: 25,
    riskFreeRate: 0.0675,
    fundamentalContext: {
      marketCapCr: '₹4,05,000 Cr',
      peRatio: 18.8,
      roePct: 14.1,
      debtToEquity: 1.38,
      dividendYieldPct: 1.85,
      beta: 1.12,
      earningsTrend: 'Peak thermal PLF + renewable capacity additions on track',
      shortSellSlbmFeasible: false,
      shortSellNote: 'NOT EXECUTABLE AS CASH SHORT HEDGE (V4-22): Thin retail SLBM borrow; use defined-risk option spreads instead.',
    },
    strikes: buildChainForSpot(418, 5, 0.252, 25, 1500),
  },
  INDIGO: {
    symbol: 'INDIGO',
    name: 'InterGlobe Aviation Ltd (Airlines — Weather & Crude Sensitive)',
    spot: 4780.0,
    futures: 4802.0,
    vwap: 4755.0,
    dayChangePct: +0.68,
    atmIv: 0.268,
    realizedVol20d: 0.245,
    indiaVix: 14.35,
    currentExpiry: '2026-10-27 (Monthly Physical Settlement)',
    nextExpiry: '2026-11-24 (Monthly Physical Settlement)',
    daysToExpiry: 25,
    riskFreeRate: 0.0675,
    fundamentalContext: {
      marketCapCr: '₹1,84,500 Cr',
      peRatio: 24.1,
      roePct: 42.0,
      debtToEquity: 2.15,
      dividendYieldPct: 0.0,
      beta: 1.15,
      earningsTrend: 'Strong domestic load factor (87%); sensitive to ATF fuel & airport weather disruptions',
      shortSellSlbmFeasible: false,
      shortSellNote: 'MWPL at 89.4% (approaching 95% F&O ban threshold — U3 alert active).',
    },
    strikes: buildChainForSpot(4780, 50, 0.268, 25, 150),
  },
};

export const SAMPLE_NEWS_11D_ITEMS: NewsItemAnalysis[] = [
  {
    newsId: 'NEWS-2026-10-02-01',
    headline: '[ILLUSTRATIVE EXAMPLE — NOT REAL NEWS] NSE Corporate Disclosure: Reliance Industries announces commissioning of new solar gigafactory module line at Jamnagar',
    source: 'Illustrative template (modelled on an NSE corporate-announcement filing)',
    sourceType: 'OFFICIAL_EXCHANGE_FILING',
    confirmationStatus: 'Officially Confirmed',
    publicationTimeIso: '2026-10-02T04:12:00.000Z',
    eventTimeIso: '2026-10-02T04:10:00.000Z',
    effectiveTimeIso: '2026-10-02T04:12:05.000Z',
    affectedSymbol: 'RELIANCE',
    affectedSector: 'ENERGY_CONGLOMERATE',
    impactDimensions11: {
      revenueImpact: 'Positive medium-term new-energy revenue visibility (+2–3% FY28E)',
      costImpact: 'Captive green power lowers Jamnagar refining power cost',
      marginImpact: 'Accretive to consolidated EBITDA margin over 12–24m',
      regulatoryImpact: 'Qualifies under MNRE PLI Tranche-II incentives',
      liquidityImpact: 'High institutional cash & F&O turnover post-filing',
      supplyChainImpact: 'Reduces imported polysilicon/module dependency',
      earningsImpact: 'Neutral near-term Q2; positive FY27–28 EPS',
      capexImpact: 'Within existing guided ₹75,000 Cr new-energy capex envelope',
      commodityExposure: 'Lowers fossil-fuel energy intensity',
      interestRateExposure: 'Neutral (funded via internal accruals)',
      currencyExposure: 'Saves USD import outflow on solar modules',
    },
    potentialMarketRelevance: 'Officially confirmed exchange disclosure supporting positive institutional sentiment without unpriced short-term earnings shock.',
    validForStrategySignal: true,
  },
  {
    newsId: 'NEWS-2026-10-02-02',
    headline: '[ILLUSTRATIVE EXAMPLE — NOT REAL NEWS] RBI Monetary Policy & Liquidity Bulletin: WACR anchored near repo rate; comfortable system liquidity ahead of festive season',
    source: 'Illustrative template (modelled on an RBI press release)',
    sourceType: 'RBI_SEBI_RELEASE',
    confirmationStatus: 'Officially Confirmed',
    publicationTimeIso: '2026-10-02T04:30:00.000Z',
    eventTimeIso: '2026-10-02T04:30:00.000Z',
    effectiveTimeIso: '2026-10-02T04:30:10.000Z',
    affectedSymbol: 'NIFTY',
    affectedSector: 'FINANCIALS / BROAD_INDEX',
    impactDimensions11: {
      revenueImpact: 'Supports steady credit offtake for banks & NBFCs',
      costImpact: 'Stabilizes short-term wholesale borrowing cost (CP/CD rates)',
      marginImpact: 'Protects banking Net Interest Margins (NIMs)',
      regulatoryImpact: 'Consistent with RBI liquidity management framework',
      liquidityImpact: 'Positive systemic banking liquidity',
      supplyChainImpact: 'Not applicable',
      earningsImpact: 'Supportive for BANKNIFTY & FINNIFTY Q3 NIMs',
      capexImpact: 'Supports corporate working-capital borrowing',
      commodityExposure: 'Neutral',
      interestRateExposure: '10Y G-Sec yield steady at 6.75%',
      currencyExposure: 'USD/INR stable at 83.92',
    },
    potentialMarketRelevance: 'Confirms benign domestic macro rate backdrop; reduces tail rate-shock probability for NIFTY and BANKNIFTY.',
    validForStrategySignal: true,
  },
  {
    newsId: 'NEWS-2026-10-02-03',
    headline: '[ILLUSTRATIVE EXAMPLE — NOT REAL NEWS] Unverified Social Media Chatter: Speculation of sudden surprise IT client contract cancellation',
    source: 'Unverified Social Media Post',
    sourceType: 'UNVERIFIED_FEED',
    confirmationStatus: 'Unconfirmed / Rumour',
    publicationTimeIso: '2026-10-02T05:05:00.000Z',
    eventTimeIso: '2026-10-02T05:05:00.000Z',
    effectiveTimeIso: '2026-10-02T05:05:30.000Z',
    affectedSymbol: 'INFY',
    affectedSector: 'IT_SERVICES',
    impactDimensions11: {
      revenueImpact: 'UNVERIFIED — No exchange filing or company confirmation',
      costImpact: 'Unknown',
      marginImpact: 'Unknown',
      regulatoryImpact: 'None',
      liquidityImpact: 'Minor temporary widenings in OTM option spreads',
      supplyChainImpact: 'None',
      earningsImpact: 'Unsubstantiated',
      capexImpact: 'None',
      commodityExposure: 'None',
      interestRateExposure: 'None',
      currencyExposure: 'None',
    },
    potentialMarketRelevance: 'BLOCKED FROM STRATEGY SIGNALS (Section 13): Unconfirmed rumours are never treated as equivalent to official disclosures.',
    validForStrategySignal: false,
  },
];

export const MACRO_AND_EARNINGS_CALENDAR = [
  {
    eventId: 'EVT-01',
    eventName: 'RBI Bi-Monthly Monetary Policy Committee (MPC) Rate Decision',
    scheduledTimeIso: '2026-10-09T04:30:00Z (10:00 IST)',
    affectedArea: 'NIFTY, BANKNIFTY, FINNIFTY, 10Y G-Sec',
    previousValue: '6.25%',
    consensusEstimate: '6.25% (Hold)',
    actualValue: 'Pending (Future Scheduled Event)',
    surpriseStdDevs: 0.0,
    historicalAvgNiftyMovePct: '±1.18%',
    historicalIvCrushVolPts: '-2.4 vol pts post-announcement',
  },
  {
    eventId: 'EVT-02',
    eventName: 'Infosys (INFY) Q2 FY27 Board Meeting & Earnings Release',
    scheduledTimeIso: '2026-10-15T10:30:00Z (Post-Market 16:00 IST)',
    affectedArea: 'INFY, TCS, Nifty IT Index',
    previousValue: 'CC Revenue +3.8% YoY',
    consensusEstimate: 'CC Revenue +4.1% YoY',
    actualValue: 'Pending',
    surpriseStdDevs: 0.0,
    historicalAvgNiftyMovePct: 'Implied Move ±4.8% vs Historical Median Realized Move ±3.9%',
    historicalIvCrushVolPts: '-8.5 vol pts on day after results (V4-20)',
  },
  {
    eventId: 'EVT-03',
    eventName: 'MoSPI India CPI Inflation Print (Last Released)',
    scheduledTimeIso: '2026-09-12T12:00:00Z (17:30 IST)',
    affectedArea: 'NIFTY, BANKNIFTY, Consumer & Rate-Sensitives',
    previousValue: '4.42%',
    consensusEstimate: '4.50%',
    actualValue: '4.35%',
    surpriseStdDevs: -0.65, // Cooler inflation surprise
    historicalAvgNiftyMovePct: '+0.74% next-session reaction',
    historicalIvCrushVolPts: '-0.9 vol pts',
  },
];

export const CROSS_ASSET_AND_PARTICIPANT_CONTEXT = {
  globalPreMarket: [
    { asset: 'GIFT Nifty Futures (NSE IX)', price: '24,864.00', changePct: '+0.58%', leadLagCorrToNifty: +0.94, source: 'NSE IX Feed', timestamp: '10:42:18 IST' },
    { asset: 'S&P 500 E-Mini Futures', price: '5,942.50', changePct: '+0.32%', leadLagCorrToNifty: +0.62, source: 'CME Delayed', timestamp: '10:42:15 IST' },
    { asset: 'Nikkei 225 Index', price: '39,480.00', changePct: '+0.74%', leadLagCorrToNifty: +0.54, source: 'TSE Feed', timestamp: '10:42:10 IST' },
    { asset: 'US Dollar Index (DXY)', price: '101.42', changePct: '-0.18%', leadLagCorrToNifty: -0.48, source: 'ICE Delayed', timestamp: '10:42:12 IST' },
    { asset: 'USD / INR Spot', price: '83.9150', changePct: '-0.09%', leadLagCorrToNifty: -0.56, source: 'FBIL / Interbank', timestamp: '10:42:16 IST' },
    { asset: 'Brent Crude Oil ($/bbl)', price: '$74.60', changePct: '-0.85%', leadLagCorrToNifty: -0.41, source: 'ICE Brent', timestamp: '10:42:14 IST' },
    { asset: 'India 10Y G-Sec Yield', price: '6.748%', changePct: '-1.2 bps', leadLagCorrToNifty: -0.35, source: 'CCIL NDS-OM', timestamp: '10:42:05 IST' },
    { asset: 'US 10Y Treasury Yield', price: '3.824%', changePct: '-2.1 bps', leadLagCorrToNifty: -0.39, source: 'US Treasury', timestamp: '10:42:11 IST' },
  ],
  participantFnoOi: [
    { participant: 'FII / FPI', indexFuturesLongPct: 58.4, indexFuturesNetContracts: +42850, indexOptionsNetDeltaCr: +1840, cashMarketNetCr: +2145 },
    { participant: 'DII (Mutual Funds / Insurers)', indexFuturesLongPct: 46.2, indexFuturesNetContracts: -14200, indexOptionsNetDeltaCr: -920, cashMarketNetCr: +1680 },
    { participant: 'Proprietary Desks (Pro)', indexFuturesLongPct: 51.8, indexFuturesNetContracts: +8450, indexOptionsNetDeltaCr: +410, cashMarketNetCr: 0 },
    { participant: 'Retail / Client', indexFuturesLongPct: 47.1, indexFuturesNetContracts: -37100, indexOptionsNetDeltaCr: -1330, cashMarketNetCr: -3825 },
  ],
};

export const DEFAULT_PORTFOLIO_LEDGER: LedgerTransaction[] = [
  {
    txId: 'TX-001',
    accountId: 'PRIMARY-RETAIL-ACCT',
    timestamp: '2026-09-01T04:00:00.000Z',
    txType: 'CASH_IN',
    instrumentKey: 'INR-CASH',
    underlying: 'INR',
    assetClass: 'CASH',
    sector: 'CASH',
    quantity: 1,
    price: 250000,
    chargesAndTaxes: 0,
    sttPaid: 0,
    strategyTag: 'CAPITAL_DEPOSIT',
    thesis: 'Initial trading & portfolio capital',
  },
  {
    txId: 'TX-002',
    accountId: 'PRIMARY-RETAIL-ACCT',
    timestamp: '2026-09-10T05:15:00.000Z',
    txType: 'BUY',
    instrumentKey: 'RELIANCE-EQ',
    underlying: 'RELIANCE',
    assetClass: 'EQUITY',
    sector: 'ENERGY_CONGLOMERATE',
    quantity: 25,
    price: 2910.0,
    chargesAndTaxes: 92.5,
    sttPaid: 72.75,
    strategyTag: 'CORE_EQUITY',
    thesis: 'Core conglomerate holding; New Energy & Telecom expansion',
    invalidationLevel: 'Weekly close below ₹2,740',
    betaToNifty: 1.08,
    perUnitDelta: 1.0,
  },
  {
    txId: 'TX-003',
    accountId: 'PRIMARY-RETAIL-ACCT',
    timestamp: '2026-09-14T06:20:00.000Z',
    txType: 'BUY',
    instrumentKey: 'HDFCBANK-EQ',
    underlying: 'HDFCBANK',
    assetClass: 'EQUITY',
    sector: 'FINANCIALS',
    quantity: 40,
    price: 1695.0,
    chargesAndTaxes: 86.0,
    sttPaid: 67.8,
    strategyTag: 'CORE_EQUITY',
    thesis: 'Core private bank holding',
    invalidationLevel: 'Close below ₹1,610',
    betaToNifty: 1.05,
    perUnitDelta: 1.0,
  },
  {
    txId: 'TX-004',
    accountId: 'PRIMARY-RETAIL-ACCT',
    timestamp: '2026-09-24T05:00:00.000Z',
    txType: 'BUY',
    instrumentKey: 'NIFTY-2026-09-29-24600-CE',
    underlying: 'NIFTY',
    assetClass: 'INDEX_OPTION',
    sector: 'BROAD_INDEX',
    quantity: 65,
    price: 112.0,
    chargesAndTaxes: 26.8,
    sttPaid: 0,
    strategyTag: 'STRAT_LONG_CALL',
    thesis: 'VWAP momentum breakout',
  },
  {
    txId: 'TX-005',
    accountId: 'PRIMARY-RETAIL-ACCT',
    timestamp: '2026-09-24T08:30:00.000Z',
    txType: 'SELL',
    instrumentKey: 'NIFTY-2026-09-29-24600-CE',
    underlying: 'NIFTY',
    assetClass: 'INDEX_OPTION',
    sector: 'BROAD_INDEX',
    quantity: 65,
    price: 144.0,
    chargesAndTaxes: 41.2,
    sttPaid: 14.04,
    strategyTag: 'STRAT_LONG_CALL',
    thesis: 'Target reached prior to close',
  },
  {
    txId: 'TX-006',
    accountId: 'PRIMARY-RETAIL-ACCT',
    timestamp: '2026-10-02T04:20:00.000Z',
    txType: 'BUY',
    instrumentKey: 'NIFTY-2026-10-06-24850-CE',
    underlying: 'NIFTY',
    assetClass: 'INDEX_OPTION',
    sector: 'BROAD_INDEX',
    quantity: 65,
    price: 94.0,
    chargesAndTaxes: 25.8,
    sttPaid: 0,
    strategyTag: 'STRAT_LONG_CALL',
    thesis: 'Opening Range Breakout above VWAP ₹24,768 with positive futures basis',
    invalidationLevel: 'NIFTY 5m close below VWAP ₹24,768 or option premium <= ₹66',
    betaToNifty: 1.0,
    strike: 24850,
    expiry: '2026-10-06',
    right: 'CE',
    perUnitDelta: 0.48,
    perUnitGamma: 0.0014,
    perUnitTheta: -6.4,
    perUnitVega: 4.3,
    perUnitVanna: 0.08,
    perUnitVomma: 0.12,
  },
];

export const HISTORICAL_252_DAILY_RETURNS: number[] = Array.from({ length: 252 }, (_, i) => {
  // Deterministic realistic daily index return sequence (mean ~+0.045%/day, std ~1.05%/day, with occasional fat-tail days)
  const base = Math.sin(i * 1.732) * 0.0085 + Math.cos(i * 0.618) * 0.0055 + 0.00042;
  if (i === 42) return -0.038;
  if (i === 118) return -0.029;
  if (i === 195) return +0.031;
  if (i === 231) return -0.024;
  return base;
});
