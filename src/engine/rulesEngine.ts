/**
 * M0 / M1 / U3 / Section 117: Time-Versioned Indian Market Structure & Rules Engine
 * Reference / Decision-Support System — Manual Broker Execution Only
 *
 * A historical strategy decision may use only information available at or before the decision timestamp.
 */

export interface TimeVersionedRule<T> {
  id: string;
  name: string;
  category: 'LOT_SIZE' | 'EXPIRY_SCHEDULE' | 'TAX_STT' | 'MARGIN_SEBI' | 'SETTLEMENT' | 'FREEZE_LIMIT';
  effectiveFrom: string; // ISO date YYYY-MM-DD
  effectiveTo: string | null; // null = currently active
  source: string;
  sourceUrl: string;
  lastVerified: string; // ISO date YYYY-MM-DD
  payload: T;
}

export interface ContractSpec {
  symbol: string;
  name: string;
  exchange: 'NSE' | 'BSE';
  instrumentType: 'INDEX' | 'STOCK';
  sector: string;
  lotSize: number;
  strikeInterval: number;
  tickSize: number;
  freezeQuantity: number;
  weeklyExpiryAvailable: boolean;
  expiryWeekday: 'TUESDAY' | 'THURSDAY';
  settlementType: 'CASH' | 'PHYSICAL';
  weatherSensitiveSector: boolean;
  weatherSensitivityReason: string;
  mwplUtilizationPct?: number; // For stock F&O ban monitoring
  inBanList?: boolean;
  freezeQuantityVerified?: boolean; // false => value is a placeholder, UI says "verify with broker"
}

export interface StatutoryChargeSchedule {
  scheduleName: string;
  sttOptionSellPremiumPct: number; // e.g., 0.15% = 0.0015 from 1 Apr 2026
  sttOptionExerciseIntrinsicPct: number; // e.g., 0.15% = 0.0015 from 1 Apr 2026
  sttFuturesSellPct: number; // e.g., 0.05% = 0.0005 from 1 Apr 2026
  exchangeTxnChargeNseOptionsPct: number; // ~0.03503% of premium
  exchangeTxnChargeNseFuturesPct: number; // ~0.00173%
  sebiTurnoverFeePct: number; // 0.0001% (₹10 per crore)
  stampDutyBuyOptionsPct: number; // 0.003% on buy side
  stampDutyBuyFuturesPct: number; // 0.002% on buy side
  gstPct: number; // 18% on (brokerage + exchange charges + SEBI fee)
}

export const TIME_VERSIONED_STATUTORY_SCHEDULES: TimeVersionedRule<StatutoryChargeSchedule>[] = [
  {
    id: 'TAX-STT-2026-APR',
    name: 'Union Budget 2026 F&O STT Revision (Effective 1 Apr 2026)',
    category: 'TAX_STT',
    effectiveFrom: '2026-04-01',
    effectiveTo: null,
    source: 'Union Budget 2026 / Finance Act 2026 & NSE Circular',
    sourceUrl: 'https://www.indiabudget.gov.in/',
    lastVerified: '2026-09-15',
    payload: {
      scheduleName: 'FY2026-27 Budget 2026 Schedule (Options STT 0.15%, Futures 0.05%)',
      sttOptionSellPremiumPct: 0.0015,        // 0.15% on sell premium
      sttOptionExerciseIntrinsicPct: 0.0015,  // 0.15% on intrinsic value if exercised ITM
      sttFuturesSellPct: 0.0005,              // 0.05% on futures sell value
      exchangeTxnChargeNseOptionsPct: 0.0003503,
      exchangeTxnChargeNseFuturesPct: 0.0000173,
      sebiTurnoverFeePct: 0.000001,           // ₹10 per crore
      stampDutyBuyOptionsPct: 0.00003,        // 0.003% on buy premium
      stampDutyBuyFuturesPct: 0.00002,
      gstPct: 0.18,
    },
  },
  {
    id: 'TAX-STT-2024-OCT',
    name: 'Finance Act (No. 2) 2024 F&O STT Schedule (1 Oct 2024 – 31 Mar 2026)',
    category: 'TAX_STT',
    effectiveFrom: '2024-10-01',
    effectiveTo: '2026-03-31',
    source: 'Finance Act 2024 / NSE Circular',
    sourceUrl: 'https://www.nseindia.com/',
    lastVerified: '2026-09-15',
    payload: {
      scheduleName: 'Oct 2024 – Mar 2026 Schedule (Options STT 0.10%, Exercise 0.125%, Futures 0.02%)',
      sttOptionSellPremiumPct: 0.001,         // 0.10%
      sttOptionExerciseIntrinsicPct: 0.00125, // 0.125%
      sttFuturesSellPct: 0.0002,              // 0.02%
      exchangeTxnChargeNseOptionsPct: 0.0003503,
      exchangeTxnChargeNseFuturesPct: 0.0000173,
      sebiTurnoverFeePct: 0.000001,
      stampDutyBuyOptionsPct: 0.00003,
      stampDutyBuyFuturesPct: 0.00002,
      gstPct: 0.18,
    },
  },
  {
    id: 'TAX-STT-2023-APR',
    name: 'Pre-Oct 2024 F&O STT Schedule (1 Apr 2023 – 30 Sep 2024)',
    category: 'TAX_STT',
    effectiveFrom: '2023-04-01',
    effectiveTo: '2024-09-30',
    source: 'Finance Act 2023 / NSE Circular',
    sourceUrl: 'https://www.nseindia.com/',
    lastVerified: '2026-09-15',
    payload: {
      scheduleName: 'Apr 2023 – Sep 2024 Schedule (Options STT 0.0625%, Futures 0.0125%)',
      sttOptionSellPremiumPct: 0.000625,
      sttOptionExerciseIntrinsicPct: 0.00125,
      sttFuturesSellPct: 0.000125,
      exchangeTxnChargeNseOptionsPct: 0.000495,
      exchangeTxnChargeNseFuturesPct: 0.0000188,
      sebiTurnoverFeePct: 0.000001,
      stampDutyBuyOptionsPct: 0.00003,
      stampDutyBuyFuturesPct: 0.00002,
      gstPct: 0.18,
    },
  },
];

export const TIME_VERSIONED_CONTRACT_RULES: TimeVersionedRule<Record<string, ContractSpec>>[] = [
  {
    id: 'NSE-CONTRACTS-2026-JAN',
    name: 'NSE Jan 2026 Index Lot Rebaseline & Tuesday Expiry Regime',
    category: 'LOT_SIZE',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    source: 'NSE F&O Circular Nov 28, 2025 & SEBI F&O Framework',
    sourceUrl: 'https://www.nseindia.com/resources/exchange-communication-circulars',
    lastVerified: '2026-09-20',
    payload: {
      NIFTY: {
        symbol: 'NIFTY',
        name: 'Nifty 50 Index',
        exchange: 'NSE',
        instrumentType: 'INDEX',
        sector: 'BROAD_INDEX',
        lotSize: 65,
        strikeInterval: 50,
        tickSize: 0.05,
        freezeQuantity: 1820, // 28 lots
        weeklyExpiryAvailable: true,
        expiryWeekday: 'TUESDAY',
        settlementType: 'CASH',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Broad diversified index; weather impact = NOT MATERIAL unless severe national monsoon/cyclone shock.',
      },
      BANKNIFTY: {
        symbol: 'BANKNIFTY',
        name: 'Nifty Bank Index',
        exchange: 'NSE',
        instrumentType: 'INDEX',
        sector: 'FINANCIALS',
        lotSize: 30,
        strikeInterval: 100,
        tickSize: 0.05,
        freezeQuantity: 900,
        weeklyExpiryAvailable: false, // Discontinued per SEBI single-weekly-benchmark rule
        expiryWeekday: 'TUESDAY',
        settlementType: 'CASH',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Banking index; direct weather impact = NOT MATERIAL.',
      },
      FINNIFTY: {
        symbol: 'FINNIFTY',
        name: 'Nifty Financial Services',
        exchange: 'NSE',
        instrumentType: 'INDEX',
        sector: 'FINANCIALS',
        lotSize: 60,
        strikeInterval: 50,
        tickSize: 0.05,
        freezeQuantity: 1800,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'CASH',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Financial services index; direct weather impact = NOT MATERIAL.',
      },
      MIDCPNIFTY: {
        symbol: 'MIDCPNIFTY',
        name: 'Nifty Midcap Select',
        exchange: 'NSE',
        instrumentType: 'INDEX',
        sector: 'MIDCAP_INDEX',
        lotSize: 120,
        strikeInterval: 25,
        tickSize: 0.05,
        freezeQuantity: 2760,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'CASH',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Midcap index; direct weather impact = NOT MATERIAL.',
      },
      RELIANCE: {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'ENERGY_CONGLOMERATE',
        lotSize: 500,
        strikeInterval: 20,
        tickSize: 0.05,
        freezeQuantity: 20000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: true,
        weatherSensitivityReason: 'Oil & Gas refining complex (Jamnagar) and petrochemical logistics sensitive to severe cyclones in Arabian Sea.',
        mwplUtilizationPct: 34.2,
        inBanList: false,
      },
      HDFCBANK: {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'FINANCIALS',
        lotSize: 550,
        strikeInterval: 10,
        tickSize: 0.05,
        freezeQuantity: 22000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Commercial banking; weather impact = NOT MATERIAL.',
        mwplUtilizationPct: 41.8,
        inBanList: false,
      },
      INFY: {
        symbol: 'INFY',
        name: 'Infosys Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'IT_SERVICES',
        lotSize: 400,
        strikeInterval: 20,
        tickSize: 0.05,
        freezeQuantity: 16000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Global IT services export; weather impact = NOT MATERIAL.',
        mwplUtilizationPct: 28.5,
        inBanList: false,
      },
      TCS: {
        symbol: 'TCS',
        name: 'Tata Consultancy Services Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'IT_SERVICES',
        lotSize: 175,
        strikeInterval: 50,
        tickSize: 0.05,
        freezeQuantity: 7000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Global IT services; weather impact = NOT MATERIAL.',
        mwplUtilizationPct: 22.1,
        inBanList: false,
      },
      ICICIBANK: {
        symbol: 'ICICIBANK',
        name: 'ICICI Bank Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'FINANCIALS',
        lotSize: 700,
        strikeInterval: 10,
        tickSize: 0.05,
        freezeQuantity: 28000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Banking; weather impact = NOT MATERIAL.',
        mwplUtilizationPct: 36.4,
        inBanList: false,
      },
      NTPC: {
        symbol: 'NTPC',
        name: 'NTPC Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'POWER_UTILITIES',
        lotSize: 1500,
        strikeInterval: 5,
        tickSize: 0.05,
        freezeQuantity: 60000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: true,
        weatherSensitivityReason: 'Power / Utilities: IMD heatwave warnings directly drive peak thermal electricity demand & coal dispatch load.',
        mwplUtilizationPct: 52.0,
        inBanList: false,
      },
      INDIGO: {
        symbol: 'INDIGO',
        name: 'InterGlobe Aviation Ltd (IndiGo)',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'AIRLINES_AVIATION',
        lotSize: 150,
        strikeInterval: 50,
        tickSize: 0.05,
        freezeQuantity: 6000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'TUESDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: true,
        weatherSensitivityReason: 'Airlines: Severe fog, cyclone, or airport disruption warnings directly affect flight cancellations & passenger yields.',
        mwplUtilizationPct: 89.4,
        inBanList: false,
      },
    },
  },
  {
    id: 'NSE-CONTRACTS-2024-NOV',
    name: 'SEBI Nov 2024 Contract Value Band Regime (Nov 2024 – Dec 2025)',
    category: 'LOT_SIZE',
    effectiveFrom: '2024-11-20',
    effectiveTo: '2025-12-31',
    source: 'SEBI Circular SEBI/HO/MRD/TPD-1/P/CIR/2024/132 & NSE Circular',
    sourceUrl: 'https://www.sebi.gov.in/',
    lastVerified: '2026-09-20',
    payload: {
      NIFTY: {
        symbol: 'NIFTY',
        name: 'Nifty 50 Index',
        exchange: 'NSE',
        instrumentType: 'INDEX',
        sector: 'BROAD_INDEX',
        lotSize: 75, // Historical lot size in Jul 2025!
        strikeInterval: 50,
        tickSize: 0.05,
        freezeQuantity: 1800, // 24 lots
        weeklyExpiryAvailable: true,
        expiryWeekday: 'THURSDAY',
        settlementType: 'CASH',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Broad diversified index; weather impact = NOT MATERIAL.',
      },
      BANKNIFTY: {
        symbol: 'BANKNIFTY',
        name: 'Nifty Bank Index',
        exchange: 'NSE',
        instrumentType: 'INDEX',
        sector: 'FINANCIALS',
        lotSize: 30,
        strikeInterval: 100,
        tickSize: 0.05,
        freezeQuantity: 900,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'CASH',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Banking index; direct weather impact = NOT MATERIAL.',
      },
      FINNIFTY: {
        symbol: 'FINNIFTY',
        name: 'Nifty Financial Services',
        exchange: 'NSE',
        instrumentType: 'INDEX',
        sector: 'FINANCIALS',
        lotSize: 65,
        strikeInterval: 50,
        tickSize: 0.05,
        freezeQuantity: 1800,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'CASH',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Financial services index; direct weather impact = NOT MATERIAL.',
      },
      RELIANCE: {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'ENERGY_CONGLOMERATE',
        lotSize: 500,
        strikeInterval: 20,
        tickSize: 0.05,
        freezeQuantity: 20000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: true,
        weatherSensitivityReason: 'Refining & petrochemicals; cyclone/monsoon disruption relevant.',
        mwplUtilizationPct: 31.0,
        inBanList: false,
      },
      HDFCBANK: {
        symbol: 'HDFCBANK',
        name: 'HDFC Bank Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'FINANCIALS',
        lotSize: 550,
        strikeInterval: 10,
        tickSize: 0.05,
        freezeQuantity: 22000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Banking; weather impact = NOT MATERIAL.',
        mwplUtilizationPct: 38.0,
        inBanList: false,
      },
      INFY: {
        symbol: 'INFY',
        name: 'Infosys Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'IT_SERVICES',
        lotSize: 400,
        strikeInterval: 20,
        tickSize: 0.05,
        freezeQuantity: 16000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'IT services; weather impact = NOT MATERIAL.',
        mwplUtilizationPct: 24.0,
        inBanList: false,
      },
      TCS: {
        symbol: 'TCS',
        name: 'Tata Consultancy Services Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'IT_SERVICES',
        lotSize: 175,
        strikeInterval: 50,
        tickSize: 0.05,
        freezeQuantity: 7000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'IT services; weather impact = NOT MATERIAL.',
        mwplUtilizationPct: 19.5,
        inBanList: false,
      },
      ICICIBANK: {
        symbol: 'ICICIBANK',
        name: 'ICICI Bank Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'FINANCIALS',
        lotSize: 700,
        strikeInterval: 10,
        tickSize: 0.05,
        freezeQuantity: 28000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: false,
        weatherSensitivityReason: 'Banking; weather impact = NOT MATERIAL.',
        mwplUtilizationPct: 33.1,
        inBanList: false,
      },
      NTPC: {
        symbol: 'NTPC',
        name: 'NTPC Ltd',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'POWER_UTILITIES',
        lotSize: 1500,
        strikeInterval: 5,
        tickSize: 0.05,
        freezeQuantity: 60000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: true,
        weatherSensitivityReason: 'Power / Utilities: temperature/heatwave & monsoon hydro effects.',
        mwplUtilizationPct: 48.0,
        inBanList: false,
      },
      INDIGO: {
        symbol: 'INDIGO',
        name: 'InterGlobe Aviation Ltd (IndiGo)',
        exchange: 'NSE',
        instrumentType: 'STOCK',
        sector: 'AIRLINES_AVIATION',
        lotSize: 150,
        strikeInterval: 50,
        tickSize: 0.05,
        freezeQuantity: 6000,
        weeklyExpiryAvailable: false,
        expiryWeekday: 'THURSDAY',
        settlementType: 'PHYSICAL',
        weatherSensitiveSector: true,
        weatherSensitivityReason: 'Airlines: airport disruption & severe weather risk.',
        mwplUtilizationPct: 79.0,
        inBanList: false,
      },
    },
  },
];

export function getStatutoryScheduleForDate(isoDate: string): TimeVersionedRule<StatutoryChargeSchedule> {
  const dateOnly = isoDate.slice(0, 10);
  for (const rule of TIME_VERSIONED_STATUTORY_SCHEDULES) {
    const afterStart = dateOnly >= rule.effectiveFrom;
    const beforeEnd = rule.effectiveTo === null || dateOnly <= rule.effectiveTo;
    if (afterStart && beforeEnd) {
      return rule;
    }
  }
  return TIME_VERSIONED_STATUTORY_SCHEDULES[0];
}

/**
 * Dynamic contract specs discovered at runtime from the official NSE EOD files
 * (lot size from fo_mktlots.csv / bhavcopy). Used for the ~200 F&O underlyings that are
 * not in the hand-maintained static table above. Static rules always win for historical dates.
 */
const DYNAMIC_CONTRACT_SPECS: Record<string, ContractSpec> = {};

export function registerDynamicContractSpec(spec: ContractSpec): void {
  DYNAMIC_CONTRACT_SPECS[spec.symbol] = spec;
}

export function getContractSpecForDate(symbol: string, isoDate: string): ContractSpec {
  const dateOnly = isoDate.slice(0, 10);
  const dynamic = DYNAMIC_CONTRACT_SPECS[symbol];
  const isCurrentDate = dateOnly >= '2026-01-01';
  if (dynamic && isCurrentDate) {
    const staticCurrent = TIME_VERSIONED_CONTRACT_RULES.find(
      (r) => r.effectiveTo === null && r.payload[symbol]
    )?.payload[symbol];
    // Keep curated metadata (sector, freeze qty, weather notes) but trust the official lot size from NSE files.
    return staticCurrent ? { ...staticCurrent, lotSize: dynamic.lotSize, inBanList: dynamic.inBanList } : dynamic;
  }
  for (const rule of TIME_VERSIONED_CONTRACT_RULES) {
    const afterStart = dateOnly >= rule.effectiveFrom;
    const beforeEnd = rule.effectiveTo === null || dateOnly <= rule.effectiveTo;
    if (afterStart && beforeEnd && rule.payload[symbol]) {
      return rule.payload[symbol];
    }
  }
  return TIME_VERSIONED_CONTRACT_RULES[0].payload[symbol] || TIME_VERSIONED_CONTRACT_RULES[0].payload.NIFTY;
}

export interface RuleFreshnessReport {
  id: string;
  name: string;
  category: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: string;
  sourceUrl: string;
  lastVerified: string;
  daysSinceVerification: number;
  status: 'VERIFIED_FRESH' | 'STALE — VERIFY';
}

export function auditRulesFreshness(referenceDateIso = '2026-10-02'): RuleFreshnessReport[] {
  const refMs = new Date(referenceDateIso).getTime();
  const allRules: TimeVersionedRule<unknown>[] = [
    ...TIME_VERSIONED_STATUTORY_SCHEDULES,
    ...TIME_VERSIONED_CONTRACT_RULES,
  ];
  return allRules.map((r) => {
    const verMs = new Date(r.lastVerified).getTime();
    const days = Math.max(0, Math.floor((refMs - verMs) / (1000 * 60 * 60 * 24)));
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      source: r.source,
      sourceUrl: r.sourceUrl,
      lastVerified: r.lastVerified,
      daysSinceVerification: days,
      status: days > 90 ? 'STALE — VERIFY' : 'VERIFIED_FRESH',
    };
  });
}

export function checkOrderSlicingAndFreeze(
  symbol: string,
  lots: number,
  isoDate: string
): {
  totalQuantity: number;
  freezeQuantity: number;
  requiresSlicing: boolean;
  sliceCount: number;
  slices: number[];
  guidance: string;
} {
  const spec = getContractSpecForDate(symbol, isoDate);
  const totalQuantity = lots * spec.lotSize;
  const maxLotsPerOrder = Math.max(1, Math.floor(spec.freezeQuantity / spec.lotSize));
  if (totalQuantity <= spec.freezeQuantity) {
    return {
      totalQuantity,
      freezeQuantity: spec.freezeQuantity,
      requiresSlicing: false,
      sliceCount: 1,
      slices: [totalQuantity],
      guidance: `Single limit order permitted (${totalQuantity} qty <= ${spec.freezeQuantity} freeze limit).`,
    };
  }
  const slices: number[] = [];
  let remainingLots = lots;
  while (remainingLots > 0) {
    const takeLots = Math.min(remainingLots, maxLotsPerOrder);
    slices.push(takeLots * spec.lotSize);
    remainingLots -= takeLots;
  }
  return {
    totalQuantity,
    freezeQuantity: spec.freezeQuantity,
    requiresSlicing: true,
    sliceCount: slices.length,
    slices,
    guidance: `Quantity (${totalQuantity}) exceeds NSE freeze limit (${spec.freezeQuantity}). Slice manually into ${slices.length} limit orders of max ${maxLotsPerOrder} lots (${maxLotsPerOrder * spec.lotSize} qty) each.`,
  };
}

export function formatINR(
  value: number,
  mode: 'LAKH_CRORE' | 'STANDARD' = 'LAKH_CRORE',
  decimals = 2
): string {
  if (!Number.isFinite(value)) return 'DATA UNAVAILABLE';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (mode === 'LAKH_CRORE') {
    if (abs >= 1e7) {
      return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
    }
    if (abs >= 1e5) {
      return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
    }
  }
  return `${sign}₹${abs.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
