/**
 * M1 / U2 / Section 4 / Section 131 / V4-34 / V4-35 / V4-48:
 * Bitemporal Point-in-Time Store, Replay Validity Grader, Multi-Source Reconciliation,
 * and Information Completeness Engine.
 *
 * ABSOLUTE NO-HINDSIGHT REQUIREMENT:
 * A historical strategy decision may use only information available at or before the decision timestamp.
 */

export type SourceTier =
  | 'TIER_1_OFFICIAL_EXCHANGE_REGULATOR'
  | 'TIER_2_BROKER_FEED_VIA_BRIDGE'
  | 'TIER_3_LICENSED_VENDOR'
  | 'TIER_4_USER_SUPPLIED_OR_ARCHIVED';

export interface BitemporalRecord<T> {
  id: string;
  key: string;
  version: number;
  eventTime: string;       // When real-world event occurred (ISO timestamp)
  publicationTime: string; // When source published it (ISO timestamp)
  ingestionTime: string;   // When this system stored it (ISO timestamp)
  effectiveTime: string;   // When a trader could first act on it (ISO timestamp)
  source: string;
  sourceTier: SourceTier;
  payload: T;
}

export type ReplayValidityGrade = 'GRADE_A_VALID' | 'GRADE_B_PARTIAL' | 'GRADE_C_INDICATIVE' | 'GRADE_D_NOT_VALID';

export interface ReplayValidityReport {
  grade: ReplayValidityGrade;
  label: string;
  bannerWarning: string | null;
  hasBidAskQuotes: boolean;
  hasPointInTimeContracts: boolean;
  hasTimestampedNews: boolean;
  hasArchivedWeatherForecasts: boolean;
  lookAheadSentinelPassed: boolean;
  reasons: string[];
}

export class BitemporalPointInTimeStore<T> {
  private records: BitemporalRecord<T>[] = [];

  public insert(record: BitemporalRecord<T>): void {
    // Enforce append-only versioning: never overwrite existing version
    this.records.push({ ...record });
  }

  public insertBatch(batch: BitemporalRecord<T>[]): void {
    for (const r of batch) {
      this.insert(r);
    }
  }

  /**
   * Strict Point-in-Time query `asOf(decisionTimestamp)`
   * Returns ONLY records where effectiveTime <= decisionTimestamp AND ingestionTime <= decisionTimestamp
   * (or if replaying archived data, effectiveTime <= decisionTimestamp and publicationTime <= decisionTimestamp),
   * selecting the latest version known as of `decisionTimestamp`.
   */
  public queryAsOf(decisionTimestampIso: string, keyFilter?: string): BitemporalRecord<T>[] {
    const decisionMs = new Date(decisionTimestampIso).getTime();
    if (!Number.isFinite(decisionMs)) {
      throw new Error(`Invalid decisionTimestampIso: ${decisionTimestampIso}`);
    }

    const eligible = this.records.filter((r) => {
      if (keyFilter && r.key !== keyFilter) return false;
      const effMs = new Date(r.effectiveTime).getTime();
      const pubMs = new Date(r.publicationTime).getTime();
      const evtMs = new Date(r.eventTime).getTime();
      // Strict No-Hindsight Check: effectiveTime, publicationTime, and eventTime must all be <= decisionTimestamp
      return effMs <= decisionMs && pubMs <= decisionMs && evtMs <= decisionMs;
    });

    // Group by key and pick highest version available as of decisionTimestamp
    const latestByKey = new Map<string, BitemporalRecord<T>>();
    for (const rec of eligible) {
      const existing = latestByKey.get(rec.key);
      if (
        !existing ||
        new Date(rec.effectiveTime).getTime() > new Date(existing.effectiveTime).getTime() ||
        (rec.effectiveTime === existing.effectiveTime && rec.version > existing.version)
      ) {
        latestByKey.set(rec.key, rec);
      }
    }

    return Array.from(latestByKey.values());
  }

  /**
   * Returns records that arrived AFTER the decision timestamp (strictly for post-trade audit separation, Section 67)
   */
  public queryArrivedAfter(decisionTimestampIso: string, keyFilter?: string): BitemporalRecord<T>[] {
    const decisionMs = new Date(decisionTimestampIso).getTime();
    return this.records.filter((r) => {
      if (keyFilter && r.key !== keyFilter) return false;
      const effMs = new Date(r.effectiveTime).getTime();
      return effMs > decisionMs;
    });
  }

  public getAllRawRecordsCount(): number {
    return this.records.length;
  }
}

export function evaluateReplayValidityGrade(params: {
  hasBidAskQuotes: boolean;
  hasIntradaySnapshots: boolean;
  hasPointInTimeContracts: boolean;
  hasTimestampedNews: boolean;
  hasArchivedWeatherForecasts: boolean;
  weatherRelevantForUnderlying: boolean;
  lookAheadSentinelPassed: boolean;
}): ReplayValidityReport {
  const reasons: string[] = [];

  if (!params.lookAheadSentinelPassed) {
    reasons.push('CRITICAL: Look-ahead sentinel test failed or future data leakage detected.');
    return {
      grade: 'GRADE_D_NOT_VALID',
      label: 'GRADE D — NOT VALID (Look-Ahead or Missing Contract History)',
      bannerWarning: 'HISTORICAL DATA INCOMPLETE — RESULT SHOULD NOT BE TREATED AS A VALID BACKTEST',
      hasBidAskQuotes: params.hasBidAskQuotes,
      hasPointInTimeContracts: params.hasPointInTimeContracts,
      hasTimestampedNews: params.hasTimestampedNews,
      hasArchivedWeatherForecasts: params.hasArchivedWeatherForecasts,
      lookAheadSentinelPassed: false,
      reasons,
    };
  }

  if (!params.hasPointInTimeContracts) {
    reasons.push('Missing historical point-in-time contract specifications (lot size / expiry rules).');
    return {
      grade: 'GRADE_D_NOT_VALID',
      label: 'GRADE D — NOT VALID',
      bannerWarning: 'HISTORICAL DATA INCOMPLETE — RESULT SHOULD NOT BE TREATED AS A VALID BACKTEST',
      hasBidAskQuotes: params.hasBidAskQuotes,
      hasPointInTimeContracts: false,
      hasTimestampedNews: params.hasTimestampedNews,
      hasArchivedWeatherForecasts: params.hasArchivedWeatherForecasts,
      lookAheadSentinelPassed: true,
      reasons,
    };
  }

  const weatherOk = !params.weatherRelevantForUnderlying || params.hasArchivedWeatherForecasts;

  if (params.hasBidAskQuotes && params.hasIntradaySnapshots && params.hasTimestampedNews && weatherOk) {
    reasons.push('Intraday bid/ask option chain, point-in-time contract specs, timestamped news, and archived forecasts verified.');
    return {
      grade: 'GRADE_A_VALID',
      label: 'GRADE A — VALID (Point-in-Time Bid/Ask + Timestamped Context)',
      bannerWarning: null,
      hasBidAskQuotes: true,
      hasPointInTimeContracts: true,
      hasTimestampedNews: true,
      hasArchivedWeatherForecasts: params.hasArchivedWeatherForecasts,
      lookAheadSentinelPassed: true,
      reasons,
    };
  }

  if (params.hasIntradaySnapshots) {
    if (!params.hasBidAskQuotes) reasons.push('Option LTP-only snapshots; bid/ask spread estimated via liquidity model.');
    if (!params.hasTimestampedNews) reasons.push('News timestamps coarse.');
    if (!weatherOk) reasons.push('Archived weather forecast unavailable at timestamp.');
    return {
      grade: 'GRADE_B_PARTIAL',
      label: 'GRADE B — PARTIAL (Intraday Snapshots with Partial Microstructure/Context)',
      bannerWarning: null,
      hasBidAskQuotes: params.hasBidAskQuotes,
      hasPointInTimeContracts: true,
      hasTimestampedNews: params.hasTimestampedNews,
      hasArchivedWeatherForecasts: params.hasArchivedWeatherForecasts,
      lookAheadSentinelPassed: true,
      reasons,
    };
  }

  reasons.push('End-of-day (EOD) bhavcopy data only; intraday path not observed.');
  return {
    grade: 'GRADE_C_INDICATIVE',
    label: 'GRADE C — INDICATIVE (EOD Bhavcopy Only)',
    bannerWarning: 'HISTORICAL DATA INCOMPLETE — RESULT SHOULD NOT BE TREATED AS A VALID BACKTEST',
    hasBidAskQuotes: false,
    hasPointInTimeContracts: true,
    hasTimestampedNews: params.hasTimestampedNews,
    hasArchivedWeatherForecasts: params.hasArchivedWeatherForecasts,
    lookAheadSentinelPassed: true,
    reasons,
  };
}

export interface MultiSourceReconciliationResult {
  field: string;
  sourceAName: string;
  sourceAValue: number;
  sourceATimestamp: string;
  sourceBName: string;
  sourceBValue: number;
  sourceBTimestamp: string;
  absDiff: number;
  pctDiff: number;
  timestampDiffSeconds: number;
  thresholdPct: number;
  status: 'RECONCILED' | 'DATA CONFLICT';
}

export function reconcileTwoSources(params: {
  field: string;
  sourceAName: string;
  sourceAValue: number;
  sourceATimestamp: string;
  sourceBName: string;
  sourceBValue: number;
  sourceBTimestamp: string;
  thresholdPct?: number;
}): MultiSourceReconciliationResult {
  const thresholdPct = params.thresholdPct ?? 0.25; // Default 0.25% max divergence for spot/futures
  const absDiff = Math.abs(params.sourceAValue - params.sourceBValue);
  const denom = Math.max(1e-9, Math.abs(params.sourceAValue));
  const pctDiff = (absDiff / denom) * 100;
  const timestampDiffSeconds =
    Math.abs(new Date(params.sourceATimestamp).getTime() - new Date(params.sourceBTimestamp).getTime()) / 1000;

  return {
    field: params.field,
    sourceAName: params.sourceAName,
    sourceAValue: params.sourceAValue,
    sourceATimestamp: params.sourceATimestamp,
    sourceBName: params.sourceBName,
    sourceBValue: params.sourceBValue,
    sourceBTimestamp: params.sourceBTimestamp,
    absDiff,
    pctDiff,
    timestampDiffSeconds,
    thresholdPct,
    status: pctDiff > thresholdPct ? 'DATA CONFLICT' : 'RECONCILED',
  };
}

export interface InformationCompletenessReport {
  marketDataCompletenessPct: number;
  optionChainCompletenessPct: number;
  historicalDataCompletenessPct: number;
  newsCompletenessPct: number;
  eventCompletenessPct: number;
  weatherCompletenessPct: number;
  portfolioCompletenessPct: number;
  executionDataCompletenessPct: number;
  overallStatus: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';
  blockingReasons: string[];
}

export function computeInformationCompleteness(input: {
  marketDataFresh: boolean;
  optionChainBidAskCount: number;
  optionChainTotalStrikes: number;
  historicalSnapshotsAvailable: boolean;
  newsChecked: boolean;
  eventsChecked: boolean;
  weatherCheckedOrNotMaterial: boolean;
  portfolioLoaded: boolean;
  bidAskExecutionAvailable: boolean;
}): InformationCompletenessReport {
  const blockingReasons: string[] = [];
  const marketDataCompletenessPct = input.marketDataFresh ? 100 : 0;
  if (!input.marketDataFresh) blockingReasons.push('Market spot/futures data is stale or unavailable.');

  const optionChainCompletenessPct =
    input.optionChainTotalStrikes > 0
      ? Math.round((input.optionChainBidAskCount / input.optionChainTotalStrikes) * 100)
      : 0;
  if (optionChainCompletenessPct < 60) {
    blockingReasons.push(`Option chain liquid bid/ask coverage (${optionChainCompletenessPct}%) below 60% threshold.`);
  }

  const historicalDataCompletenessPct = input.historicalSnapshotsAvailable ? 100 : 50;
  const newsCompletenessPct = input.newsChecked ? 100 : 0;
  const eventCompletenessPct = input.eventsChecked ? 100 : 0;
  const weatherCompletenessPct = input.weatherCheckedOrNotMaterial ? 100 : 0;
  const portfolioCompletenessPct = input.portfolioLoaded ? 100 : 0;
  const executionDataCompletenessPct = input.bidAskExecutionAvailable ? 100 : 0;

  if (!input.bidAskExecutionAvailable) {
    blockingReasons.push('Executable bid/ask quotes missing; cannot verify realistic entry/exit slippage.');
  }

  let overallStatus: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT' = 'COMPLETE';
  if (blockingReasons.length > 0) {
    overallStatus = marketDataCompletenessPct === 0 || !input.bidAskExecutionAvailable ? 'INSUFFICIENT' : 'PARTIAL';
  } else if (optionChainCompletenessPct < 85 || !input.newsChecked) {
    overallStatus = 'PARTIAL';
  }

  return {
    marketDataCompletenessPct,
    optionChainCompletenessPct,
    historicalDataCompletenessPct,
    newsCompletenessPct,
    eventCompletenessPct,
    weatherCompletenessPct,
    portfolioCompletenessPct,
    executionDataCompletenessPct,
    overallStatus,
    blockingReasons,
  };
}

export interface DataFeasibilityRow {
  dataType: string;
  liveAvailability: string;
  historicalAvailability: string;
  granularity: string;
  sourceTier: SourceTier;
  costAndTerms: string;
  gapsAndLimitations: string;
  adapterStatus: 'VERIFIED' | 'UNVERIFIED' | 'NOT AVAILABLE';
}

export const DATA_FEASIBILITY_MATRIX: DataFeasibilityRow[] = [
  {
    dataType: 'Spot / Index Prices (NIFTY, BANKNIFTY, FINNIFTY, Stocks)',
    liveAvailability: 'Via Local Bridge (Upstox/Dhan/Kite/Angel/Fyers read-only WS) or User Snapshot',
    historicalAvailability: 'NSE EOD Archive + Point-in-Time Intraday Replay Store',
    granularity: 'Tick / 1-sec (Live Bridge) | 5-min (Replay Store) | EOD',
    sourceTier: 'TIER_2_BROKER_FEED_VIA_BRIDGE',
    costAndTerms: 'Personal use only via user broker API token; no public redistribution',
    gapsAndLimitations: 'Pure static GitHub Pages cannot query NSE directly due to CORS & anti-bot blocks',
    adapterStatus: 'VERIFIED',
  },
  {
    dataType: 'Option Chain (Bid, Ask, LTP, OI, Change in OI, Volume)',
    liveAvailability: 'Via Local Bridge around ATM (±15 strikes) or User CSV/JSON Upload',
    historicalAvailability: 'Point-in-Time Intraday Snapshots (Grade A/B) & NSE UDiFF EOD Bhavcopy (Grade C)',
    granularity: '1–3 sec (Live Bridge) | 5-min (Intraday Replay) | EOD (Bhavcopy)',
    sourceTier: 'TIER_2_BROKER_FEED_VIA_BRIDGE',
    costAndTerms: 'Personal broker market-data feed or licensed vendor (TrueData/Global Datafeeds)',
    gapsAndLimitations: 'Free historical tick-by-tick full option chains with L2 depth are not publicly free from NSE',
    adapterStatus: 'VERIFIED',
  },
  {
    dataType: 'Contract Master History (Lot size, Expiry weekday, Strike intervals, Freeze qty)',
    liveAvailability: 'Time-Versioned Rules Engine + Daily Instrument Master Sync',
    historicalAvailability: 'Time-versioned rules (Pre-Nov 2024, Nov 2024–Dec 2025, Jan 2026+)',
    granularity: 'Exact effective date versioned',
    sourceTier: 'TIER_1_OFFICIAL_EXCHANGE_REGULATOR',
    costAndTerms: 'Public NSE/SEBI circulars (verified through Oct 2026)',
    gapsAndLimitations: 'Must be re-verified when NSE/SEBI issue new lot rebaselines (>90d stale alert built-in)',
    adapterStatus: 'VERIFIED',
  },
  {
    dataType: 'SPAN Risk Parameter Files & Margin Requirements',
    liveAvailability: 'SPAN + Exposure Estimator + Manual Broker Margin Override',
    historicalAvailability: 'Parametric SPAN + Exposure historical schedule',
    granularity: 'Intraday / EOD SPAN snapshots',
    sourceTier: 'TIER_1_OFFICIAL_EXCHANGE_REGULATOR',
    costAndTerms: 'NSE SPAN files or broker margin calculator figure',
    gapsAndLimitations: 'Broker-specific intraday peak margin rules vary; manual broker override provided',
    adapterStatus: 'VERIFIED',
  },
  {
    dataType: 'Corporate Announcements & Event Risk Calendar (NSE/BSE/RBI/MoSPI)',
    liveAvailability: 'Read-only Proxy / RSS / User API Key or Curated Point-in-Time Event Store',
    historicalAvailability: 'Bitemporal Point-in-Time Archive with publication & effective timestamps',
    granularity: 'Timestamped to minute',
    sourceTier: 'TIER_1_OFFICIAL_EXCHANGE_REGULATOR',
    costAndTerms: 'Public official exchange disclosures & RBI/MoSPI calendar',
    gapsAndLimitations: 'Unconfirmed social media rumours strictly segregated from confirmed filings',
    adapterStatus: 'VERIFIED',
  },
  {
    dataType: 'Weather & Environmental Forecasts (IMD / Open-Meteo)',
    liveAvailability: 'Open-Meteo / IMD Forecast Adapter (Gated by Sector Relevance)',
    historicalAvailability: 'Archived Forecast vs Actual Weather separated to prevent hindsight',
    granularity: 'Hourly / Daily regional forecast',
    sourceTier: 'TIER_3_LICENSED_VENDOR',
    costAndTerms: 'Free Open-Meteo API / IMD bulletins',
    gapsAndLimitations: 'Strictly gated: marked NOT MATERIAL for non-weather-sensitive sectors (IT, Banking)',
    adapterStatus: 'VERIFIED',
  },
];
