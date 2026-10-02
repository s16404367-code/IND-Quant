import React, { useEffect, useMemo, useState } from 'react';
import {
  Home,
  Gauge,
  Layers,
  Cpu,
  Activity,
  Shield,
  Play,
  Newspaper,
  Database,
  Scale,
  Sun,
  Moon,
  ShieldAlert,
  AlertTriangle,
  CalendarClock,
  Info,
  Loader2,
  FlaskConical,
  Wallet,
  CalendarDays,
} from 'lucide-react';
import {
  formatINR,
  getContractSpecForDate,
  getStatutoryScheduleForDate,
  registerDynamicContractSpec,
} from './engine/rulesEngine';
import {
  computeImpliedForwardFromParity,
  evaluateAll51Models,
  solveImpliedVolatility,
} from './engine/pricingModels';
import {
  buildArbitrageFreeSviSurface,
  computePMeasureProbabilityEngine,
  computeQMeasureTargetProbability,
  extractBreedenLitzenbergerQDistribution,
} from './engine/volSurfaceAndDist';
import {
  computePortfolioVarAndEs,
  evaluatePreTradeComplianceGate,
  runPortfolioStressSuite,
  runReverseStressSearch,
} from './engine/riskAndLimitsEngine';
import {
  LedgerTransaction,
  rebuildPortfolioFromLedger,
} from './engine/ledgerAndTaxEngine';
import {
  createImmutableDecisionSnapshot,
  evaluateBehaviouralDiscipline,
  runAll55PipelineSteps,
} from './engine/disciplineAndCopilot';
import {
  DEFAULT_PORTFOLIO_LEDGER,
  HISTORICAL_252_DAILY_RETURNS,
  MARKET_UNIVERSE_SNAPSHOTS,
} from './engine/verifiedHistoricalFixtures';
import {
  buildDynamicContractSpec,
  buildSnapshotFromChain,
  ChainFile,
  dailyReturns,
  fmtDate,
  fmtNum,
  loadChain,
  loadMarket,
  loadMeta,
  loadNews,
  loadUniverse,
  dataOrigin,
  fmtDateTime,
  isBranchMode,
  MarketFile,
  MetaFile,
  NewsFile,
  UniverseItem,
} from './data/marketData';
import { SITE_CONFIG } from './config/siteConfig';

import { ControlRoomAndVerdictTab } from './components/ControlRoomAndVerdictTab';
import { OptionChainAndSurfaceTab } from './components/OptionChainAndSurfaceTab';
import { ModelsAndProbabilitiesTab } from './components/ModelsAndProbabilitiesTab';
import { StrategyAndParetoTab } from './components/StrategyAndParetoTab';
import { PortfolioRiskStudioTab } from './components/PortfolioRiskStudioTab';
import { ReplayAndValidationTab } from './components/ReplayAndValidationTab';
import { ContextDisciplineTaxCopilotTab } from './components/ContextDisciplineTaxCopilotTab';
import { DataPrivacyAndAuditTab } from './components/DataPrivacyAndAuditTab';
import { OverviewTab } from './components/OverviewTab';
import { openStockPicker, StockPickerButton } from './components/shell/StockPicker';
import { ConsentGate, LegalCenter, getLegalDocs, LegalDocId, readConsent } from './components/shell/Legal';
import { NewsPanel, WeatherPanel } from './components/shell/NewsWeather';
import {
  cleanRefreshParam,
  CURRENT_BUILD_ID,
  hardRefresh,
  RefreshButton,
  UpdateBanner,
  useUpdateChecker,
} from './components/shell/UpdateChecker';

type TabId =
  | 'HOME'
  | 'CONTROL_ROOM'
  | 'CHAIN_SURFACE'
  | 'MODELS_PROB'
  | 'STRATEGY_PARETO'
  | 'PORTFOLIO_RISK'
  | 'REPLAY_VALIDATION'
  | 'CONTEXT_DISCIPLINE_TAX'
  | 'DATA_PRIVACY'
  | 'LEGAL';

const NAV: Array<{ id: TabId; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'HOME', label: 'Home', hint: 'Price, chart, key numbers & news', icon: Home },
  { id: 'CONTROL_ROOM', label: 'Trade Check', hint: 'Profit after all costs? Risks?', icon: Gauge },
  { id: 'CHAIN_SURFACE', label: 'Option Chain', hint: 'Strikes, OI, Greeks, volatility', icon: Layers },
  { id: 'MODELS_PROB', label: 'Pricing Models', hint: 'Fair value & probabilities', icon: Cpu },
  { id: 'STRATEGY_PARETO', label: 'Strategies', hint: 'Compare structures, sizing, hedges', icon: Activity },
  { id: 'PORTFOLIO_RISK', label: 'Portfolio Risk', hint: 'VaR, stress tests (demo portfolio)', icon: Shield },
  { id: 'REPLAY_VALIDATION', label: 'Practice & Backtest', hint: 'Test ideas on past prices, replay a day', icon: Play },
  { id: 'CONTEXT_DISCIPLINE_TAX', label: 'News, Weather & Journal', hint: 'Context, discipline, tax info', icon: Newspaper },
  { id: 'DATA_PRIVACY', label: 'Data Sources & Privacy', hint: 'Where data comes from, settings', icon: Database },
  { id: 'LEGAL', label: 'Legal Center', hint: 'Terms, risk, privacy, disclaimer', icon: Scale },
];

const PAGE_INTRO: Record<TabId, { title: string; subtitle: string; sample?: string }> = {
  HOME: { title: 'Home', subtitle: 'Pick a stock or index, then read its latest end-of-day picture in plain language.' },
  CONTROL_ROOM: {
    title: 'Trade Check',
    subtitle:
      'Type a hypothetical option trade and see whether it would be in profit after brokerage, STT, exchange fees, GST and stamp duty — plus every risk check the models run.',
  },
  CHAIN_SURFACE: {
    title: 'Option Chain & Volatility',
    subtitle: 'Every strike for the chosen expiry from the official NSE end-of-day file, with Greeks and the volatility smile.',
  },
  MODELS_PROB: {
    title: 'Pricing Models & Probabilities',
    subtitle: 'What is this option "worth" under 51 different maths models, and how likely is a price move? Ranges, never single answers.',
  },
  STRATEGY_PARETO: {
    title: 'Strategy Lab',
    subtitle: 'Compare option structures by risk, reward and capital needed. Educational comparisons — not recommendations.',
  },
  PORTFOLIO_RISK: {
    title: 'Portfolio Risk',
    subtitle: 'Value-at-Risk, Expected Shortfall and crash replays.',
    sample: 'Uses an ILLUSTRATIVE demo portfolio (sample positions, not yours).',
  },
  REPLAY_VALIDATION: {
    title: 'Practice & Backtest',
    subtitle: 'Learn without risking money: test simple ideas on real past prices, replay a day step by step, and check skill vs luck.',
    sample: 'Section 1 uses REAL NSE end-of-day prices of the selected stock. The replay day and the skill-or-luck trades are ILLUSTRATIVE sample data. All results are hypothetical — past results do not predict future results.',
  },
  CONTEXT_DISCIPLINE_TAX: {
    title: 'News, Weather & Journal',
    subtitle: 'Real headlines and live weather for context, plus discipline tools, a trade journal and F&O tax-turnover information.',
    sample: 'The news-impact template, global context and event calendar further down are ILLUSTRATIVE examples, clearly marked.',
  },
  DATA_PRIVACY: {
    title: 'Data Sources & Privacy',
    subtitle: 'Where every number comes from, what we cannot know, what is stored on your device — and the advanced settings.',
  },
  LEGAL: { title: 'Legal Center', subtitle: 'Disclaimer, Risk Disclosure, Terms of Use, Privacy Notice and Data-Source Notice.' },
};

function lsGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

const CAPITAL_OPTIONS = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];

export function App() {
  // ---------------- Shell state ----------------
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [consentOk, setConsentOk] = useState<boolean | null>(null); // null = not checked yet (SSR)
  const [legalModal, setLegalModal] = useState<LegalDocId | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('HOME');

  // ---------------- Analysis state ----------------
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NIFTY');
  const [expiry, setExpiry] = useState<string | null>(null);
  const [customSpotOverride, setCustomSpotOverride] = useState<number | null>(null);
  const [capitalRupees, setCapitalRupees] = useState<number>(25000);
  const [effectiveDateIso, setEffectiveDateIso] = useState<string>('2026-10-02');
  const [numberFormatMode, setNumberFormatMode] = useState<'LAKH_CRORE' | 'STANDARD'>('LAKH_CRORE');
  const [simulateStaleFeed, setSimulateStaleFeed] = useState<boolean>(false);
  const [simulateDailyLossLockout, setSimulateDailyLossLockout] = useState<boolean>(false);
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>(DEFAULT_PORTFOLIO_LEDGER);
  const [analysisTimeIso] = useState<string>(() => new Date().toISOString());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // ---------------- Public web data (keyless) ----------------
  const [meta, setMeta] = useState<MetaFile | null>(null);
  const [universe, setUniverse] = useState<UniverseItem[]>([]);
  const [market, setMarket] = useState<MarketFile | null>(null);
  const [news, setNews] = useState<NewsFile | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [chain, setChain] = useState<ChainFile | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [chainLoading, setChainLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Restore preferences + consent (client only, so server-side rendering in tests is unaffected)
  useEffect(() => {
    const t = lsGet('indquant.theme');
    if (t === 'dark' || t === 'light') setTheme(t);
    const s = lsGet('indquant.symbol');
    if (s) setSelectedSymbol(s);
    const c = Number(lsGet('indquant.capital'));
    if (CAPITAL_OPTIONS.includes(c)) setCapitalRupees(c);
    if (lsGet('indquant.autoRefresh') === 'off') setAutoRefresh(false);
    cleanRefreshParam();
    setConsentOk(readConsent() !== null);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('theme-light', theme === 'light');
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    document.documentElement.style.background = theme === 'light' ? '#f5f7fb' : '#080c1a';
  }, [theme]);

  // Load the shared snapshot files once
  useEffect(() => {
    let alive = true;
    loadMeta()
      .then((m) => {
        if (!alive) return;
        setMeta(m);
        setEffectiveDateIso(m.tradeDate);
      })
      .catch(() => alive && setDataError('Could not load the public-data snapshot (meta.json).'));
    loadUniverse()
      .then((u) => alive && setUniverse(u.items))
      .catch(() => alive && setDataError('Could not load the list of F&O stocks (universe.json).'));
    loadMarket()
      .then((m) => alive && setMarket(m))
      .catch(() => undefined);
    loadNews()
      .then((n) => alive && setNews(n))
      .catch(() => alive && setNewsError('Headlines are unavailable right now.'));
    // Headlines are collected every hour — pick up new ones while the page stays open.
    const newsTimer = window.setInterval(() => {
      loadNews(true)
        .then((n) => alive && setNews(n))
        .catch(() => undefined);
    }, 15 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(newsTimer);
    };
  }, []);

  // Load the option chain whenever the user picks another stock / index
  useEffect(() => {
    let alive = true;
    setChainLoading(true);
    setChainError(null);
    setCustomSpotOverride(null);
    loadChain(selectedSymbol)
      .then((c) => {
        if (!alive) return;
        setChain(c);
        const future = c.expiries.filter((e) => e > c.tradeDate && (c.chain[e]?.length ?? 0) > 0);
        setExpiry(future[0] ?? c.expiries[0] ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setChain(null);
        setExpiry(null);
        setChainError(`Option-chain data for ${selectedSymbol} could not be loaded.`);
      })
      .finally(() => alive && setChainLoading(false));
    return () => {
      alive = false;
    };
  }, [selectedSymbol]);

  const selectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    lsSet('indquant.symbol', sym);
  };

  const indiaVixFromData = useMemo(
    () => market?.indices.find((i) => /VIX/i.test(i.name))?.close ?? null,
    [market]
  );
  const indiaVixLevel = indiaVixFromData ?? 14.2;

  const live = useMemo(() => {
    if (!chain || !expiry || chain.symbol !== selectedSymbol || !(chain.chain[expiry]?.length > 0)) return null;
    try {
      return buildSnapshotFromChain(chain, expiry, indiaVixFromData);
    } catch {
      return null;
    }
  }, [chain, expiry, selectedSymbol, indiaVixFromData]);

  const dynamicSpecVersion = useMemo(() => {
    if (live && chain) {
      registerDynamicContractSpec(buildDynamicContractSpec(chain, live.analytics.strikeStep));
      return `${chain.symbol}:${chain.tradeDate}:${live.analytics.strikeStep}`;
    }
    return 'static';
  }, [live, chain]);

  const usingIllustrativeData = live === null;

  const baseSnapshot =
    live?.snapshot ?? MARKET_UNIVERSE_SNAPSHOTS[selectedSymbol] ?? MARKET_UNIVERSE_SNAPSHOTS.NIFTY;

  const snapshot = useMemo(() => {
    if (customSpotOverride === null) return baseSnapshot;
    return {
      ...baseSnapshot,
      spot: customSpotOverride,
      futures: Number((customSpotOverride * (baseSnapshot.futures / baseSnapshot.spot || 1)).toFixed(2)),
    };
  }, [baseSnapshot, customSpotOverride]);

  const dailyReturnSeries = useMemo(() => {
    const hist = chain && chain.symbol === selectedSymbol ? dailyReturns(chain.history) : [];
    return hist.length >= 120 ? hist : HISTORICAL_252_DAILY_RETURNS;
  }, [chain, selectedSymbol]);
  const usingRealReturns = dailyReturnSeries !== HISTORICAL_252_DAILY_RETURNS;

  const dataTradeDate = meta?.tradeDate ?? chain?.tradeDate ?? effectiveDateIso;
  const dataGeneratedIso = meta?.generatedAtIso ?? `${dataTradeDate}T12:30:00.000Z`;
  const updates = useUpdateChecker(meta?.generatedAtIso ?? null);

  const contractSpec = useMemo(
    () => getContractSpecForDate(selectedSymbol, effectiveDateIso),
    [selectedSymbol, effectiveDateIso, dynamicSpecVersion]
  );

  const statutoryRules = useMemo(
    () => getStatutoryScheduleForDate(effectiveDateIso).payload,
    [effectiveDateIso]
  );

  const T = Math.max(1 / 365, snapshot.daysToExpiry / 365);
  const atmRow = useMemo(
    () =>
      snapshot.strikes.reduce(
        (best, r) => (Math.abs(r.strike - snapshot.spot) < Math.abs(best.strike - snapshot.spot) ? r : best),
        snapshot.strikes[0]
      ),
    [snapshot]
  );

  const impliedForwardResult = useMemo(
    () =>
      computeImpliedForwardFromParity({
        spot: snapshot.spot,
        timeToExpiryYears: T,
        riskFreeRate: snapshot.riskFreeRate,
        strikes: snapshot.strikes.map((r) => ({
          strike: r.strike,
          callMid: (r.callBid + r.callAsk) / 2,
          putMid: (r.putBid + r.putAsk) / 2,
        })),
      }),
    [snapshot, T]
  );

  const sviSurface = useMemo(
    () =>
      buildArbitrageFreeSviSurface({
        underlying: snapshot.symbol,
        expiry: snapshot.currentExpiry,
        timeToExpiryYears: T,
        impliedForward: impliedForwardResult.impliedForward,
        atmIv: snapshot.atmIv,
        ivHistory52wLow: Math.max(0.08, snapshot.atmIv * 0.72),
        ivHistory52wHigh: snapshot.atmIv * 1.65,
        // V4.1: "observed" IVs are now solved from the actual (OTM-side) option prices of each strike,
        // instead of a synthetic smile formula.
        rawChain: snapshot.strikes.map((r) => {
          const otmPut = r.strike < snapshot.spot;
          const right = otmPut ? 'PE' : 'CE';
          const bid = otmPut ? r.putBid : r.callBid;
          const ask = otmPut ? r.putAsk : r.callAsk;
          const solve = (px: number) =>
            px > 0
              ? solveImpliedVolatility({
                  targetPrice: px,
                  spot: snapshot.spot,
                  strike: r.strike,
                  timeToExpiryYears: T,
                  riskFreeRate: snapshot.riskFreeRate,
                  dividendYield: impliedForwardResult.impliedDividendYield,
                  right,
                })
              : null;
          return {
            strike: r.strike,
            ivBid: solve(bid),
            ivMid: solve((bid + ask) / 2),
            ivAsk: solve(ask),
          };
        }),
      }),
    [snapshot, impliedForwardResult, T]
  );

  const netBreakevenUnderlying = atmRow.strike + atmRow.callAsk + 1.25;

  const qDistribution = useMemo(
    () =>
      extractBreedenLitzenbergerQDistribution({
        spot: snapshot.spot,
        impliedForward: impliedForwardResult.impliedForward,
        timeToExpiryYears: T,
        riskFreeRate: snapshot.riskFreeRate,
        dividendYield: impliedForwardResult.impliedDividendYield,
        sviParams: sviSurface.sviParamsMid,
      }),
    [snapshot, impliedForwardResult, T, sviSurface]
  );

  const qProbAboveBreakeven = useMemo(
    () =>
      computeQMeasureTargetProbability({
        spot: snapshot.spot,
        targetUnderlyingPrice: netBreakevenUnderlying,
        timeToExpiryYears: T,
        riskFreeRate: snapshot.riskFreeRate,
        dividendYield: impliedForwardResult.impliedDividendYield,
        volatility: snapshot.atmIv,
        direction: 'ABOVE',
      }),
    [snapshot, netBreakevenUnderlying, T, impliedForwardResult]
  );

  const pDistribution = useMemo(
    () =>
      computePMeasureProbabilityEngine({
        spot: snapshot.spot,
        targetUnderlyingPrice: netBreakevenUnderlying,
        direction: 'ABOVE',
        timeToExpiryYears: T,
        currentAtmIv: snapshot.atmIv,
        historicalDailyReturns: dailyReturnSeries,
      }),
    [snapshot, netBreakevenUnderlying, T, dailyReturnSeries]
  );

  const modelEnsemble = useMemo(
    () =>
      evaluateAll51Models(
        {
          spot: snapshot.spot,
          strike: atmRow.strike,
          timeToExpiryYears: T,
          riskFreeRate: snapshot.riskFreeRate,
          dividendYield: impliedForwardResult.impliedDividendYield,
          volatility: snapshot.atmIv,
          right: 'CE',
        },
        atmRow.callBid,
        atmRow.callAsk,
        impliedForwardResult.impliedForward
      ),
    [snapshot, atmRow, T, impliedForwardResult]
  );

  const portfolioState = useMemo(
    () =>
      rebuildPortfolioFromLedger(ledgerTransactions, {
        'NIFTY-2026-10-06-24850-CE': { price: 118, underlyingSpot: snapshot.spot },
        'HDFCBANK-EQ': { price: 1715, underlyingSpot: 1715 },
        'RELIANCE-EQ': { price: 2945, underlyingSpot: 2945 },
      }),
    [ledgerTransactions, snapshot.spot]
  );

  const riskMetrics = useMemo(
    () =>
      computePortfolioVarAndEs({
        portfolioValueRupees: Math.max(capitalRupees, portfolioState.netLiquidationValue),
        netDeltaRupeesPer1Pct: portfolioState.portfolioGreeksRupees.netDeltaRupees,
        netGammaRupeesPer1PctSq: portfolioState.portfolioGreeksRupees.netGammaRupees,
        netVegaRupeesPer1PctIv: portfolioState.portfolioGreeksRupees.netVegaRupeesPer1PctIv,
        dailyHistoricalReturns: dailyReturnSeries,
        liquiditySpreadAddOnRupees: contractSpec.lotSize * 0.55,
      }),
    [capitalRupees, portfolioState, contractSpec.lotSize, dailyReturnSeries]
  );

  const stressSuite = useMemo(
    () =>
      runPortfolioStressSuite({
        spot: snapshot.spot,
        baseIv: snapshot.atmIv,
        timeToExpiryYears: T,
        riskFreeRate: snapshot.riskFreeRate,
        dividendYield: 0.012,
        netDeltaRupeesPer1Pct: portfolioState.portfolioGreeksRupees.netDeltaRupees,
        netGammaRupeesPer1PctSq: portfolioState.portfolioGreeksRupees.netGammaRupees,
        netVegaRupeesPer1PctIv: portfolioState.portfolioGreeksRupees.netVegaRupeesPer1PctIv,
        hedgeDeltaRupeesPer1Pct: -portfolioState.portfolioGreeksRupees.netDeltaRupees * 0.65,
        hedgeGammaRupeesPer1PctSq: Math.abs(portfolioState.portfolioGreeksRupees.netGammaRupees) * 0.8,
        hedgeVegaRupeesPer1PctIv: Math.abs(portfolioState.portfolioGreeksRupees.netVegaRupeesPer1PctIv) * 0.5,
      }),
    [snapshot, T, portfolioState]
  );

  const reverseStressResults = useMemo(
    () =>
      runReverseStressSearch({
        maxLossLimitRupees: Math.max(3000, capitalRupees * 0.15),
        esLimitRupees: Math.max(4000, capitalRupees * 0.2),
        marginCallBufferRupees: Math.max(2500, capitalRupees * 0.12),
        drawdownLimitRupees: Math.max(5000, capitalRupees * 0.25),
        netDeltaRupeesPer1Pct: portfolioState.portfolioGreeksRupees.netDeltaRupees,
        netGammaRupeesPer1PctSq: portfolioState.portfolioGreeksRupees.netGammaRupees,
        netVegaRupeesPer1PctIv: portfolioState.portfolioGreeksRupees.netVegaRupeesPer1PctIv,
      }),
    [capitalRupees, portfolioState]
  );

  const lockoutState = useMemo(
    () =>
      evaluateBehaviouralDiscipline({
        dailyLossLimitRupees: Math.max(2000, Math.round(capitalRupees * 0.1)),
        realizedLossTodayRupees: simulateDailyLossLockout ? 3200 : 0,
        tradesCountToday: 2,
        maxTradesPerDay: 5,
        consecutiveLossesCount: simulateDailyLossLockout ? 3 : 0,
        maxConsecutiveLossesAllowed: 3,
      }),
    [simulateDailyLossLockout, capitalRupees]
  );

  const complianceGate = useMemo(
    () =>
      evaluatePreTradeComplianceGate({
        capitalRupees,
        currentDrawdownPct: simulateDailyLossLockout ? 12.5 : 1.8,
        indiaVix: indiaVixLevel,
        candidateMaxLossRupees: Math.min(2200, capitalRupees * 0.12),
        postTradeMarginRupees: Math.min(atmRow.callAsk * contractSpec.lotSize, capitalRupees * 0.65),
        postTradeEsRupees: riskMetrics.historicalEsRupees,
        postTradeNetDeltaRupeesPer1Pct: portfolioState.portfolioGreeksRupees.netDeltaRupees,
        postTradeThetaBleedPerDayRupees: portfolioState.portfolioGreeksRupees.netThetaRupeesPerDay,
        realizedDailyLossRupees: simulateDailyLossLockout ? 3200 : 0,
        tradesTakenToday: 2,
        consecutiveLosses: simulateDailyLossLockout ? 3 : 0,
        limits: {
          maxRiskPerTradePctOfCapital: 15,
          maxDailyLossRupees: Math.max(2000, Math.round(capitalRupees * 0.1)),
          maxMarginUtilizationPct: 80,
          maxPortfolioEsPctOfCapital: 25,
          maxNetDeltaPctOfCapital: 35,
          maxThetaBleedPerDayPctOfCapital: 5,
          maxTradesPerDay: 5,
          maxConsecutiveLossesBeforeCoolOff: 3,
        },
      }),
    [capitalRupees, simulateDailyLossLockout, atmRow, contractSpec.lotSize, riskMetrics, portfolioState, indiaVixLevel]
  );

  // V4.1 conservative decision state:
  // End-of-day public data can NEVER produce a live "TRADE CANDIDATE" (Section 112 / U24.2 —
  // stale quotes cannot feed a verdict). Best possible state on EOD data is WATCH (research only).
  const notAffordable = atmRow.callAsk * contractSpec.lotSize > capitalRupees;
  const finalDecisionState: 'TRADE CANDIDATE' | 'WATCH' | 'NO TRADE' =
    lockoutState.lockoutActive || simulateStaleFeed || usingIllustrativeData || contractSpec.inBanList || notAffordable
      ? 'NO TRADE'
      : 'WATCH';

  const pipelineSteps = useMemo(
    () =>
      runAll55PipelineSteps({
        underlying: selectedSymbol,
        spot: snapshot.spot,
        futures: snapshot.futures,
        atmIvPct: snapshot.atmIv * 100,
        rvPct: snapshot.realizedVol20d * 100,
        netPnlNow: 1439.3,
        netBreakeven: 100.81,
        costHurdlePct: 0.81,
        netRr: 1.56,
        qProbPct: qProbAboveBreakeven * 100,
        pProbPct:
          ((pDistribution.consensusPMeasureRange[0] + pDistribution.consensusPMeasureRange[1]) / 2) *
          100,
        es99Rupees: riskMetrics.historicalEsRupees,
        marginReqRupees: atmRow.callAsk * contractSpec.lotSize,
        capitalRupees,
        lockoutActive: lockoutState.lockoutActive,
        finalState: finalDecisionState,
      }),
    [
      selectedSymbol,
      snapshot,
      qProbAboveBreakeven,
      pDistribution,
      riskMetrics,
      atmRow,
      contractSpec.lotSize,
      capitalRupees,
      lockoutState.lockoutActive,
      finalDecisionState,
    ]
  );

  const decisionSnapshots = useMemo(() => {
    const s1 = createImmutableDecisionSnapshot({
      previousHash: 'GENESIS_ROOT_00000000',
      timestampIso: dataGeneratedIso,
      underlying: selectedSymbol,
      spotPrice: baseSnapshot.spot,
      atmIv: baseSnapshot.atmIv,
      capitalRupees,
      finalDecisionState: 'WATCH',
      summaryReason: `End-of-day data snapshot loaded (NSE close ${dataTradeDate}).`,
    });
    const s2 = createImmutableDecisionSnapshot({
      previousHash: s1.snapshotHash,
      timestampIso: analysisTimeIso,
      underlying: selectedSymbol,
      spotPrice: snapshot.spot,
      atmIv: snapshot.atmIv,
      capitalRupees,
      finalDecisionState,
      summaryReason:
        finalDecisionState === 'WATCH'
          ? 'Research only — EOD data cannot confirm a live trade.'
          : 'Blocked by a data-quality, affordability, ban-list or discipline guard.',
    });
    return [s1, s2];
  }, [selectedSymbol, snapshot.spot, baseSnapshot.spot, capitalRupees, modelEnsemble, finalDecisionState, dataTradeDate, dataGeneratedIso, analysisTimeIso]);


  // ---------------- Derived display values ----------------
  const universeForPicker: UniverseItem[] = useMemo(() => {
    if (universe.length > 0) return universe;
    return Object.values(MARKET_UNIVERSE_SNAPSHOTS).map((s) => ({
      symbol: s.symbol,
      name: `${s.name} (sample)`,
      type: ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'].includes(s.symbol) ? 'INDEX' : 'STOCK',
      spot: null,
      changePct: null,
      lotSize: null,
      nearExpiry: null,
      expiries: 0,
      pcr: null,
      futOi: 0,
      inBanList: false,
      contractValue: null,
    }));
  }, [universe]);

  const futureExpiries = useMemo(
    () => (chain && chain.symbol === selectedSymbol ? chain.expiries.filter((e) => e > chain.tradeDate && (chain.chain[e]?.length ?? 0) > 0) : []),
    [chain, selectedSymbol]
  );

  const intro = PAGE_INTRO[activeTab];
  const decisionExplain =
    finalDecisionState === 'WATCH'
      ? 'WATCH = research only. End-of-day data can never confirm a live trade.'
      : usingIllustrativeData
      ? 'NO TRADE — real data for this symbol is not loaded; numbers below are samples.'
      : contractSpec.inBanList
      ? 'NO TRADE — this stock is in the NSE F&O ban list (no new positions allowed).'
      : notAffordable
      ? 'NO TRADE — one lot of the at-the-money option costs more than your selected capital.'
      : 'NO TRADE — a discipline / data-quality guard is active.';

  const KeyNumbers = (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
      {[
        { l: 'Price (last close)', v: `₹${fmtNum(snapshot.spot)}`, s: customSpotOverride !== null ? 'WHAT-IF PRICE' : usingIllustrativeData ? 'SAMPLE' : `NSE close ${fmtDate(dataTradeDate)}` },
        { l: 'Day change', v: `${snapshot.dayChangePct >= 0 ? '+' : ''}${fmtNum(snapshot.dayChangePct)}%`, s: 'vs previous close' },
        { l: 'At-the-money IV', v: `${fmtNum(snapshot.atmIv * 100, 1)}%`, s: 'implied from option prices' },
        { l: 'India VIX', v: fmtNum(indiaVixLevel), s: indiaVixFromData !== null ? 'NSE close' : 'SAMPLE' },
        { l: 'Days to expiry', v: String(snapshot.daysToExpiry), s: fmtDate(snapshot.currentExpiry) },
        { l: 'Lot size', v: String(contractSpec.lotSize), s: contractSpec.freezeQuantityVerified === false ? 'freeze qty: verify with broker' : `freeze ${contractSpec.freezeQuantity}` },
        { l: 'Your capital', v: formatINR(capitalRupees, numberFormatMode), s: 'change at the top' },
        { l: 'Model state', v: finalDecisionState, s: 'not a recommendation' },
      ].map((k) => (
        <div key={k.l} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] text-slate-400">{k.l}</div>
          <div
            className={`font-mono font-bold text-sm ${
              k.l === 'Model state' ? (k.v === 'WATCH' ? 'text-amber-300' : 'text-rose-300') : k.l === 'Day change' ? (snapshot.dayChangePct >= 0 ? 'text-emerald-300' : 'text-rose-300') : 'text-slate-100'
            }`}
          >
            {k.v}
          </div>
          <div className="text-[10px] text-slate-500 truncate">{k.s}</div>
        </div>
      ))}
    </div>
  );

  const settingsPanel = (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-bold text-white">Settings &amp; advanced options</h3>
        <p className="text-xs text-slate-400">Saved only in this browser. None of these change the underlying data.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        <label className="space-y-1 block">
          <span className="text-slate-300 font-semibold">Colour theme</span>
          <select
            value={theme}
            onChange={(e) => {
              const t = e.target.value as 'light' | 'dark';
              setTheme(t);
              lsSet('indquant.theme', t);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100"
          >
            <option value="light">Daylight (light)</option>
            <option value="dark">Midnight (dark)</option>
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-slate-300 font-semibold">Number format</span>
          <select
            value={numberFormatMode}
            onChange={(e) => setNumberFormatMode(e.target.value as 'LAKH_CRORE' | 'STANDARD')}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100"
          >
            <option value="LAKH_CRORE">Indian (₹1,00,000 · lakh / crore)</option>
            <option value="STANDARD">International (₹100,000)</option>
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-slate-300 font-semibold">Rules as of date (lot sizes, taxes)</span>
          <input
            type="date"
            value={effectiveDateIso}
            onChange={(e) => e.target.value && setEffectiveDateIso(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100"
          />
        </label>
        <label className="flex items-start gap-2 p-3 rounded-lg bg-slate-950/60 border border-emerald-500/30">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => {
              setAutoRefresh(e.target.checked);
              lsSet('indquant.autoRefresh', e.target.checked ? 'on' : 'off');
            }}
            className="mt-0.5"
          />
          <span>
            <span className="font-semibold text-slate-200 block">Refresh automatically when an update is available</span>
            <span className="text-slate-400">Checks every 5 minutes and whenever you come back to this tab. A 30-second notice is shown first.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
          <input type="checkbox" checked={simulateStaleFeed} onChange={(e) => setSimulateStaleFeed(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-semibold text-slate-200 block">Simulate stale data</span>
            <span className="text-slate-400">See how the guards block every verdict when data is old.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
          <input type="checkbox" checked={simulateDailyLossLockout} onChange={(e) => setSimulateDailyLossLockout(e.target.checked)} className="mt-0.5" />
          <span>
            <span className="font-semibold text-slate-200 block">Simulate daily-loss lockout</span>
            <span className="text-slate-400">Practise the discipline rule that stops trading after a loss limit.</span>
          </span>
        </label>
      </div>
      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 text-slate-400">
          <div>
            <span className="text-slate-200 font-semibold">App version:</span> v4.1 · build <span className="font-mono">{CURRENT_BUILD_ID}</span>
          </div>
          <div>
            <span className="text-slate-200 font-semibold">Data:</span> NSE close {fmtDate(dataTradeDate)} · prepared {fmtDateTime(dataGeneratedIso)} · source: {dataOrigin}
            {isBranchMode() && ' · (site served in "Deploy from a branch" mode)'}
          </div>
          <div>
            <span className="text-slate-200 font-semibold">Last update check:</span>{' '}
            {updates.lastCheckedIso ? fmtDateTime(updates.lastCheckedIso) : 'not yet'}
            {updates.lastCheckedIso && !updates.appUpdate && !updates.dataUpdateIso && ' — you have the latest version ✓'}
            {(updates.appUpdate || updates.dataUpdateIso) && ' — an update is available'}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updates.check()}
            disabled={updates.checking}
            className="px-3 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold"
          >
            {updates.checking ? 'Checking…' : 'Check for updates now'}
          </button>
          <button onClick={() => hardRefresh()} className="btn-primary px-3 py-2 rounded-lg font-semibold">
            Refresh page &amp; data
          </button>
        </div>
      </div>
    </div>
  );

  const openLegal = (id: LegalDocId) => setLegalModal(id);

  return (
    <div className={`app-root ${theme === 'light' ? 'theme-light' : 'theme-dark'} text-slate-100 flex flex-col min-h-screen`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-indigo-600 text-white px-3 py-2 rounded-lg">
        Skip to content
      </a>

      {/* ============ 1. EDUCATION / RISK STRIP (always visible) ============ */}
      <div className="no-print border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[12px]">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-2 text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Education only — not investment advice.</strong> Not SEBI-registered. Never places orders.{' '}
              <span className="hidden md:inline">9 out of 10 individual F&amp;O traders made net losses (SEBI study).</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => openLegal('disclaimer')} className="underline underline-offset-2 text-amber-200 hover:text-amber-100 font-semibold">
              Disclaimer
            </button>
            <button onClick={() => openLegal('risk')} className="underline underline-offset-2 text-amber-200 hover:text-amber-100 font-semibold">
              Risk disclosure
            </button>
          </div>
        </div>
      </div>

      <UpdateBanner appUpdate={updates.appUpdate} dataUpdateIso={updates.dataUpdateIso} autoRefresh={autoRefresh} />

      {/* ============ 2. STICKY TOP BAR — the stock picker lives here ============ */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <button onClick={() => setActiveTab('HOME')} className="flex items-center gap-2.5 shrink-0 focus-ring rounded-lg" aria-label="Go to home">
            <span className="brand-chip w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-lg">IQ</span>
            <span className="text-left hidden sm:block">
              <span className="block text-base font-extrabold tracking-tight brand-gradient leading-tight">{SITE_CONFIG.siteName}</span>
              <span className="block text-[11px] text-slate-400 leading-tight">
                Options research lab · education only{' '}
                <span className="ml-1 px-1.5 py-px rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">v4.1</span>
              </span>
            </span>
          </button>

          <div className="flex-1 min-w-[240px] order-last sm:order-none w-full sm:w-auto">
            <StockPickerButton universe={universeForPicker} selected={selectedSymbol} onSelect={selectSymbol} loading={chainLoading} />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2" title="Option expiry date">
              <CalendarDays className="w-4 h-4 text-indigo-300" />
              <span className="sr-only">Expiry</span>
              <select
                value={expiry ?? ''}
                onChange={(e) => setExpiry(e.target.value)}
                disabled={futureExpiries.length === 0}
                className="bg-transparent text-slate-100 font-semibold outline-none"
              >
                {futureExpiries.length === 0 && <option value="">Expiry —</option>}
                {futureExpiries.map((e) => (
                  <option key={e} value={e}>
                    Expiry {fmtDate(e)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2" title="Capital you want to model with">
              <Wallet className="w-4 h-4 text-emerald-300" />
              <span className="sr-only">Capital</span>
              <select
                value={capitalRupees}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCapitalRupees(v);
                  lsSet('indquant.capital', String(v));
                }}
                className="bg-transparent text-slate-100 font-semibold outline-none"
              >
                {CAPITAL_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    Capital ₹{c.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </label>
            <span
              className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-2 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-200"
              title="Data comes from official NSE end-of-day files. It is not live / real-time."
            >
              <CalendarClock className="w-4 h-4" />
              NSE end-of-day · {fmtDate(dataTradeDate)}
            </span>
            <RefreshButton hasUpdate={updates.appUpdate || !!updates.dataUpdateIso} />
            <button
              onClick={() => {
                const t = theme === 'light' ? 'dark' : 'light';
                setTheme(t);
                lsSet('indquant.theme', t);
              }}
              className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 focus-ring"
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              title={theme === 'light' ? 'Midnight (dark) theme' : 'Daylight (light) theme'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile / tablet navigation */}
        <nav className="lg:hidden border-t border-slate-800 overflow-x-auto" aria-label="Sections">
          <div className="flex gap-1 px-3 py-2 min-w-max">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = activeTab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setActiveTab(n.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                    active ? 'btn-primary shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {n.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-5 flex gap-5">
        {/* ============ 3. SIDEBAR NAV (desktop) ============ */}
        <aside className="no-print hidden lg:block w-60 shrink-0">
          <nav className="sticky top-24 space-y-1" aria-label="Sections">
            {NAV.map((n, i) => {
              const Icon = n.icon;
              const active = activeTab === n.id;
              return (
                <React.Fragment key={n.id}>
                  {(i === 1 || i === 8) && <div className="h-px bg-slate-800 my-2" />}
                  <button
                    onClick={() => setActiveTab(n.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-2.5 transition focus-ring ${
                      active ? 'btn-primary shadow-lg' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold leading-tight">{n.label}</span>
                      <span className={`block text-[11px] leading-snug ${active ? 'opacity-90' : 'text-slate-500'}`}>{n.hint}</span>
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
            <div className="mt-4 p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-[11px] text-slate-400 leading-relaxed">
              <Info className="w-3.5 h-3.5 inline mr-1 text-indigo-300" />
              Data refreshes automatically after each NSE trading day. No sign-up, no API keys, no broker login.
            </div>
          </nav>
        </aside>

        {/* ============ 4. MAIN CONTENT ============ */}
        <main id="main" className="flex-1 min-w-0 space-y-4 animate-in" key={activeTab}>
          {activeTab !== 'HOME' && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">{intro.title}</h1>
                <p className="text-sm text-slate-400 max-w-3xl">{intro.subtitle}</p>
              </div>
              {activeTab !== 'LEGAL' && activeTab !== 'DATA_PRIVACY' && (
                <div className="text-xs text-slate-400 font-mono">
                  {selectedSymbol} · {usingIllustrativeData ? 'sample data' : `NSE EOD ${fmtDate(dataTradeDate)}`}
                </div>
              )}
            </div>
          )}

          {intro.sample && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-200 text-xs">
              <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{intro.sample}</span>
            </div>
          )}

          {dataError && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{dataError} The site will show clearly-labelled sample numbers until the data files are available.</span>
            </div>
          )}

          {usingIllustrativeData && activeTab !== 'HOME' && activeTab !== 'LEGAL' && activeTab !== 'DATA_PRIVACY' && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs">
              {chainLoading ? <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>
                {chainLoading
                  ? `Loading the NSE end-of-day option chain for ${selectedSymbol}…`
                  : `ILLUSTRATIVE SAMPLE DATA — ${chainError ?? 'real data for this symbol is not available'}. Numbers below are for demonstration only.`}
              </span>
            </div>
          )}

          {['CONTROL_ROOM', 'CHAIN_SURFACE', 'MODELS_PROB', 'STRATEGY_PARETO'].includes(activeTab) && (
            <>
              {KeyNumbers}
              <p className="text-[11px] text-slate-500">
                {decisionExplain} Bid/ask prices are ESTIMATED from the official closing price (NSE end-of-day files do not include the order book).{' '}
                {usingRealReturns ? `Risk statistics use ${dailyReturnSeries.length} real daily returns.` : 'Risk statistics use a sample return series.'}
              </p>
            </>
          )}

          {activeTab === 'HOME' && (
            <OverviewTab
              chain={chain && chain.symbol === selectedSymbol ? chain : null}
              chainError={chainError}
              analytics={live?.analytics ?? null}
              expiry={expiry}
              market={market}
              news={news}
              newsError={newsError}
              meta={meta}
              onSelectSymbol={selectSymbol}
              onNavigate={(t) => setActiveTab(t as TabId)}
              onOpenPicker={openStockPicker}
            />
          )}

          {activeTab === 'CONTROL_ROOM' && (
            <ControlRoomAndVerdictTab
              key={`${selectedSymbol}-${expiry}`}
              selectedSymbol={selectedSymbol}
              spot={snapshot.spot}
              futures={snapshot.futures}
              vwap={snapshot.vwap}
              atmIv={snapshot.atmIv}
              realizedVol={snapshot.realizedVol20d}
              lotSize={contractSpec.lotSize}
              capitalRupees={capitalRupees}
              isDataStale={simulateStaleFeed}
              lockoutActive={lockoutState.lockoutActive}
              qProbPct={qProbAboveBreakeven * 100}
              pProbRangePct={[pDistribution.consensusPMeasureRange[0] * 100, pDistribution.consensusPMeasureRange[1] * 100]}
              modelFairValueRange={[modelEnsemble.ensembleSummary.fairValueRangeLow, modelEnsemble.ensembleSummary.fairValueRangeHigh]}
              modelDispersionPct={modelEnsemble.ensembleSummary.modelDispersionPct}
              es99Rupees={riskMetrics.historicalEsRupees}
              marginReqRupees={atmRow.callAsk * contractSpec.lotSize}
              pipelineSteps={pipelineSteps}
              numberFormatMode={numberFormatMode}
              onJournalConfirmManualExecution={() => {}}
              eodResearchMode
              defaultEntryPrice={atmRow.callAsk > 0 ? Number(atmRow.callAsk.toFixed(2)) : undefined}
              defaultQuantity={contractSpec.lotSize}
              strikeStep={live?.analytics.strikeStep ?? 50}
              expiryIso={snapshot.currentExpiry}
            />
          )}

          {activeTab === 'CHAIN_SURFACE' && (
            <OptionChainAndSurfaceTab
              snapshot={snapshot}
              lotSize={contractSpec.lotSize}
              capitalRupees={capitalRupees}
              impliedForwardResult={impliedForwardResult}
              sviSurface={sviSurface}
            />
          )}

          {activeTab === 'MODELS_PROB' && (
            <ModelsAndProbabilitiesTab
              selectedSymbol={selectedSymbol}
              spot={snapshot.spot}
              atmStrike={atmRow.strike}
              timeToExpiryYears={T}
              riskFreeRate={snapshot.riskFreeRate}
              dividendYield={impliedForwardResult.impliedDividendYield}
              atmIv={snapshot.atmIv}
              marketBid={atmRow.callBid}
              marketAsk={atmRow.callAsk}
              impliedForward={impliedForwardResult.impliedForward}
              qDistribution={qDistribution}
              pDistribution={pDistribution}
              qProbPct={qProbAboveBreakeven * 100}
            />
          )}

          {activeTab === 'STRATEGY_PARETO' && (
            <StrategyAndParetoTab
              selectedSymbol={selectedSymbol}
              spot={snapshot.spot}
              lotSize={contractSpec.lotSize}
              capitalRupees={capitalRupees}
              atmIv={snapshot.atmIv}
              portfolioDeltaRupees={portfolioState.portfolioGreeksRupees.netDeltaRupees}
              portfolioEs99Rupees={riskMetrics.historicalEsRupees}
              numberFormatMode={numberFormatMode}
            />
          )}

          {activeTab === 'PORTFOLIO_RISK' && (
            <PortfolioRiskStudioTab
              portfolioState={portfolioState}
              riskMetrics={riskMetrics}
              historicalCrises={stressSuite.historicalCrises}
              priceIvGrid={stressSuite.priceIvGrid}
              reverseStressResults={reverseStressResults}
              complianceGate={complianceGate}
              numberFormatMode={numberFormatMode}
            />
          )}

          {activeTab === 'REPLAY_VALIDATION' && <ReplayAndValidationTab capitalRupees={capitalRupees} numberFormatMode={numberFormatMode} chain={chain} />}

          {activeTab === 'CONTEXT_DISCIPLINE_TAX' && (
            <>
              <div className="grid xl:grid-cols-5 gap-4">
                <div className="xl:col-span-3">
                  <NewsPanel news={news} symbol={selectedSymbol} symbolName={chain?.name} limit={10} error={newsError} />
                </div>
                <div className="xl:col-span-2">
                  <WeatherPanel symbol={selectedSymbol} />
                </div>
              </div>
              <ContextDisciplineTaxCopilotTab
                selectedSymbol={selectedSymbol}
                spot={snapshot.spot}
                vwap={snapshot.vwap}
                atmIv={snapshot.atmIv}
                realizedVol={snapshot.realizedVol20d}
                indiaVix={indiaVixLevel}
                netPnlNow={1439.3}
                netBreakeven={100.81}
                costHurdleRupees={60.7}
                qProbPct={qProbAboveBreakeven * 100}
                pProbPct={((pDistribution.consensusPMeasureRange[0] + pDistribution.consensusPMeasureRange[1]) / 2) * 100}
                modelMedian={modelEnsemble.ensembleSummary.uncertaintyBreakdown.pointEstimate}
                modelDispersionPct={modelEnsemble.ensembleSummary.modelDispersionPct}
                es99Rupees={riskMetrics.historicalEsRupees}
                finalState={finalDecisionState}
                closedTrades={portfolioState.closedTrades}
                onAddManualFillTx={(tx) => setLedgerTransactions((prev) => [...prev, tx])}
                numberFormatMode={numberFormatMode}
                simulateDailyLossLockout={simulateDailyLossLockout}
                setSimulateDailyLossLockout={setSimulateDailyLossLockout}
              />
            </>
          )}

          {activeTab === 'DATA_PRIVACY' && (
            <DataPrivacyAndAuditTab
              news={news}
              meta={meta}
              decisionSnapshots={decisionSnapshots}
              onCustomSpotOverride={(newSpot) => setCustomSpotOverride(newSpot)}
              customSpotActive={customSpotOverride !== null}
              currentSpot={snapshot.spot}
              settingsSlot={settingsPanel}
            />
          )}

          {activeTab === 'LEGAL' && <LegalCenter asModal={false} />}
        </main>
      </div>

      {/* ============ 5. FOOTER ============ */}
      <footer className="no-print border-t border-slate-800 bg-slate-950/70 px-4 py-6 text-xs text-slate-400 mt-6">
        <div className="max-w-[1600px] mx-auto grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Important
            </div>
            <p className="leading-relaxed">
              {SITE_CONFIG.siteName} is an educational research tool. It is <strong>not</strong> registered with SEBI as an Investment Adviser or
              Research Analyst, gives no buy/sell/hold advice, and never places orders. Derivatives trading can lose you more than you expect.
              You alone are responsible for your decisions. Consult a SEBI-registered adviser before investing.
            </p>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-slate-200">Legal</div>
            <ul className="space-y-1">
              {getLegalDocs().map((d) => (
                <li key={d.id}>
                  <button onClick={() => openLegal(d.id)} className="hover:text-slate-100 underline-offset-2 hover:underline">
                    {d.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-bold text-slate-200">Data &amp; credits</div>
            <p className="leading-relaxed">
              Market data: public end-of-day reports of National Stock Exchange of India Ltd (NSE), as of {fmtDate(dataTradeDate)}. Not real-time; may
              contain errors. NSE is not affiliated with and does not endorse this site. Weather data by{' '}
              <span className="text-slate-300">Open-Meteo.com</span> (CC BY 4.0). Headlines link to and belong to their publishers.
            </p>
            <p className="font-mono text-[11px]">
              App v4.1 ({CURRENT_BUILD_ID}) · Legal v{SITE_CONFIG.legalVersion} · © {new Date(analysisTimeIso).getFullYear()} {SITE_CONFIG.ownerDisplayName}
            </p>
          </div>
        </div>
      </footer>

      {legalModal && <LegalCenter initial={legalModal} onClose={() => setLegalModal(null)} asModal />}
      {consentOk === false && <ConsentGate onAccept={() => setConsentOk(true)} />}
    </div>
  );
}

export default App;
