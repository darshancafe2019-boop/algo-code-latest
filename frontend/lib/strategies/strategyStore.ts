/**
 * QUANT.OS STRATEGY CENTER REACTIVE STATE STORE
 * ===============================================
 * Central store managing:
 * - Selected strategy, view mode, search, category filters, regime filters
 * - Signal evaluations for all 30 strategies
 * - Backtest execution results & history
 * - Active Paper trading instances & execution journal
 * - Signal clusters & exposure controller state
 * - Strategy versioning history snapshots
 */

import { create } from "zustand";
import {
  CRYPTO_30_STRATEGIES,
  ALL_QUANTOS_STRATEGIES,
  CryptoStrategyDefinition,
  StrategyCategory,
  StrategySignalState,
  MarketRegimeType,
} from "./crypto30Strategies";
import { SignalEvaluationReport, strategySignalEngine } from "./signalEngine";
import { BacktestResults, strategyBacktestEngine, BacktestRequestParams } from "./strategyBacktestEngine";
import { PaperStrategyInstance, JournalTradeRecord, paperTradingEngine } from "./paperTradingEngine";
import { centralExposureController, SignalCluster } from "./exposureController";
import { marketRegimeEngine, RegimeEvaluationResult } from "./regimeEngine";
import { strategyRiskEngine, RiskEvaluationResult, ProposedTradeOrder } from "./strategyRiskEngine";

export type StrategyViewTab =
  | "LIBRARY"
  | "DETAIL"
  | "BACKTEST"
  | "PAPER"
  | "PERFORMANCE"
  | "CLUSTERS"
  | "REGIME"
  | "JOURNAL"
  | "CONFIG";

export interface StrategyStoreState {
  // Navigation & Filtering
  strategies: CryptoStrategyDefinition[];
  selectedStrategyId: string | null;
  activeViewTab: StrategyViewTab;
  searchQuery: string;
  selectedCategory: StrategyCategory | "ALL";
  selectedTimeframe: string | "ALL";
  selectedMarket: string | "ALL";
  selectedSignalState: StrategySignalState | "ALL";
  selectedRegime: MarketRegimeType | "ALL";
  viewDisplayMode: "CARDS" | "TABLE";

  // Quantitative Engines State
  regimeState: RegimeEvaluationResult;
  signalReports: Record<string, SignalEvaluationReport>; // keyed by strategy.number
  signalClusters: SignalCluster[];
  paperInstances: PaperStrategyInstance[];
  journalRecords: JournalTradeRecord[];
  backtestResults: Record<string, BacktestResults>; // keyed by strategy.number
  activeBacktestRunning: boolean;

  // Selected Strategy Version State
  customParameters: Record<string, Record<string, any>>; // keyed by strategy.number

  // Actions
  setSelectedStrategyId: (id: string | null) => void;
  setActiveViewTab: (tab: StrategyViewTab) => void;
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: StrategyCategory | "ALL") => void;
  setSelectedTimeframe: (tf: string | "ALL") => void;
  setSelectedMarket: (mkt: string | "ALL") => void;
  setSelectedSignalState: (state: StrategySignalState | "ALL") => void;
  setSelectedRegime: (regime: MarketRegimeType | "ALL") => void;
  setViewDisplayMode: (mode: "CARDS" | "TABLE") => void;

  // Execution actions
  evaluateAllSignals: (instrument?: string) => void;
  runBacktestForStrategy: (strategyNumber: string, params: Partial<BacktestRequestParams>) => BacktestResults | null;
  activatePaperStrategy: (strategyNumber: string, instrument: string, timeframe: string, riskPct?: number) => PaperStrategyInstance | null;
  pausePaperStrategy: (instanceId: string) => void;
  closePaperTrade: (journalId: string, exitPrice: number, reason?: any) => void;
  updateStrategyParameters: (strategyNumber: string, params: Record<string, any>) => void;
  evaluateRiskForTrade: (proposed: ProposedTradeOrder) => RiskEvaluationResult;
}

export const useStrategyStore = create<StrategyStoreState>((set, get) => {
  // Initial regime evaluation
  const initialRegime = marketRegimeEngine.evaluateRegime({
    adx: 27.5,
    atrPercentile: 55,
    bandwidthPercentile: 65,
    rsi: 58.2,
    volumeTrend: "EXPANDING",
    emaSlope: 18.5,
    liquidityScore: 92,
  });

  // Evaluate initial signals for all strategies (30 Crypto Strategies + Pro Strategies)
  const initialReports: Record<string, SignalEvaluationReport> = {};
  for (const strat of ALL_QUANTOS_STRATEGIES) {
    initialReports[strat.number] = strategySignalEngine.evaluateStrategySignal(strat, "BTCUSDT", {
      currentPrice: 67450,
      high: 68100,
      low: 66900,
      open: 67100,
      close: 67450,
      volume: 18500,
      indicators: {
        trend_pass: true,
        c1: true,
        c2: true,
        c3: strat.number === "01" || strat.number === "06" || strat.number === "21" || strat.number === "27" || strat.number === "PRO-01",
        c4: strat.number === "01" || strat.number === "06" || strat.number === "21" || strat.number === "PRO-01",
        c5: true,
        c6: true,
      },
      availableFeeds: {
        OHLCV_PRICE: { available: true, latencyMs: 14, lastUpdated: Date.now() },
        VOLUME: { available: true, latencyMs: 14, lastUpdated: Date.now() },
        INDICATOR_EMA: { available: true, latencyMs: 16, lastUpdated: Date.now() },
        INDICATOR_RSI: { available: true, latencyMs: 16, lastUpdated: Date.now() },
        INDICATOR_BOLLINGER: { available: true, latencyMs: 16, lastUpdated: Date.now() },
        INDICATOR_VWAP: { available: true, latencyMs: 18, lastUpdated: Date.now() },
        INDICATOR_OBV: { available: true, latencyMs: 18, lastUpdated: Date.now() },
        INDICATOR_ATR: { available: true, latencyMs: 15, lastUpdated: Date.now() },
        INDICATOR_DONCHIAN: { available: true, latencyMs: 15, lastUpdated: Date.now() },
        SPOT_INDEX_FEED: { available: true, latencyMs: 22, lastUpdated: Date.now() },
        PERP_FUTURES_FEED: { available: true, latencyMs: 22, lastUpdated: Date.now() },
        FUNDING_RATE_FEED: { available: true, latencyMs: 24, lastUpdated: Date.now() },
        AGGREGATED_OPEN_INTEREST: { available: true, latencyMs: 28, lastUpdated: Date.now() },
        LIQUIDATION_FEED: { available: true, latencyMs: 31, lastUpdated: Date.now() },
        BTC_DOMINANCE_INDEX: { available: true, latencyMs: 35, lastUpdated: Date.now() },
        BTC_USDT_BENCHMARK: { available: true, latencyMs: 14, lastUpdated: Date.now() },
      },
    });
  }

  // Initial proposed trades for signal clusters demo
  const sampleProposedTrades: ProposedTradeOrder[] = [
    { strategyId: "crypto-strat-01", strategyNumber: "01", strategyName: "Trend Pullback to EMA", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG", entryPrice: 67450, stopPrice: 66100, targetPrice: 70150, requestedRiskPct: 0.5 },
    { strategyId: "crypto-strat-06", strategyNumber: "06", strategyName: "BandWidth Squeeze Breakout", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG", entryPrice: 67450, stopPrice: 65900, targetPrice: 70550, requestedRiskPct: 0.5 },
    { strategyId: "crypto-strat-21", strategyNumber: "21", strategyName: "Relative Volume Breakout", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG", entryPrice: 67450, stopPrice: 66200, targetPrice: 69950, requestedRiskPct: 0.5 },
    { strategyId: "crypto-strat-27", strategyNumber: "27", strategyName: "Open Interest Expansion", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG", entryPrice: 67450, stopPrice: 65800, targetPrice: 70750, requestedRiskPct: 0.5 },
    { strategyId: "liquidity-rejection-structure-pro", strategyNumber: "PRO-01", strategyName: "Liquidity Rejection Structure Pro", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG", entryPrice: 67450, stopPrice: 66300, targetPrice: 70200, requestedRiskPct: 0.5 },
  ];

  const initialClusters = centralExposureController.resolveSignalClusters(sampleProposedTrades, 100000);

  // Pre-seed default backtests for initial viewing without loading spinners
  const initialBacktests: Record<string, BacktestResults> = {};
  for (const strat of ALL_QUANTOS_STRATEGIES) {
    initialBacktests[strat.number] = strategyBacktestEngine.runBacktest(strat, {
      strategyId: strat.id,
      strategyNumber: strat.number,
      strategyVersion: strat.version,
      instrument: "BTCUSDT",
      timeframe: strat.primaryTimeframe,
      startDate: new Date(Date.now() - 180 * 86400000).toISOString(),
      endDate: new Date().toISOString(),
      initialCapital: 100000,
      riskPctPerTrade: 0.5,
      takerFeeRate: 0.0005,
      makerFeeRate: 0.0002,
      slippagePct: 0.0005,
      fundingRatePer8h: 0.0001,
      leverage: 1,
      directionFilter: "BOTH",
      strategyParameters: strat.defaultParameters,
    });
  }

  return {
    strategies: ALL_QUANTOS_STRATEGIES,
    selectedStrategyId: "crypto-strat-01",
    activeViewTab: "LIBRARY",
    searchQuery: "",
    selectedCategory: "ALL",
    selectedTimeframe: "ALL",
    selectedMarket: "ALL",
    selectedSignalState: "ALL",
    selectedRegime: "ALL",
    viewDisplayMode: "CARDS",

    regimeState: initialRegime,
    signalReports: initialReports,
    signalClusters: initialClusters,
    paperInstances: paperTradingEngine.getActiveInstances(),
    journalRecords: paperTradingEngine.getJournalRecords(),
    backtestResults: initialBacktests,
    activeBacktestRunning: false,
    customParameters: {},

    setSelectedStrategyId: (id) => set({ selectedStrategyId: id }),
    setActiveViewTab: (tab) => set({ activeViewTab: tab }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setSelectedCategory: (cat) => set({ selectedCategory: cat }),
    setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
    setSelectedMarket: (mkt) => set({ selectedMarket: mkt }),
    setSelectedSignalState: (state) => set({ selectedSignalState: state }),
    setSelectedRegime: (regime) => set({ selectedRegime: regime }),
    setViewDisplayMode: (mode) => set({ viewDisplayMode: mode }),

    evaluateAllSignals: (instrument = "BTCUSDT") => {
      const reports: Record<string, SignalEvaluationReport> = {};
      const { strategies, customParameters } = get();

      for (const strat of strategies) {
        reports[strat.number] = strategySignalEngine.evaluateStrategySignal(strat, instrument, {
          currentPrice: 67450,
          high: 68100,
          low: 66900,
          open: 67100,
          close: 67450,
          volume: 18500,
          indicators: {
            trend_pass: true,
            c1: true,
            c2: true,
            c3: true,
            c4: true,
            c5: true,
            c6: true,
          },
          availableFeeds: {
            OHLCV_PRICE: { available: true, latencyMs: 14, lastUpdated: Date.now() },
            VOLUME: { available: true, latencyMs: 14, lastUpdated: Date.now() },
            INDICATOR_EMA: { available: true, latencyMs: 16, lastUpdated: Date.now() },
            INDICATOR_RSI: { available: true, latencyMs: 16, lastUpdated: Date.now() },
            INDICATOR_BOLLINGER: { available: true, latencyMs: 16, lastUpdated: Date.now() },
            INDICATOR_VWAP: { available: true, latencyMs: 18, lastUpdated: Date.now() },
            INDICATOR_OBV: { available: true, latencyMs: 18, lastUpdated: Date.now() },
            INDICATOR_ATR: { available: true, latencyMs: 15, lastUpdated: Date.now() },
            INDICATOR_DONCHIAN: { available: true, latencyMs: 15, lastUpdated: Date.now() },
            SPOT_INDEX_FEED: { available: true, latencyMs: 22, lastUpdated: Date.now() },
            PERP_FUTURES_FEED: { available: true, latencyMs: 22, lastUpdated: Date.now() },
            FUNDING_RATE_FEED: { available: true, latencyMs: 24, lastUpdated: Date.now() },
            AGGREGATED_OPEN_INTEREST: { available: true, latencyMs: 28, lastUpdated: Date.now() },
            LIQUIDATION_FEED: { available: true, latencyMs: 31, lastUpdated: Date.now() },
            BTC_DOMINANCE_INDEX: { available: true, latencyMs: 35, lastUpdated: Date.now() },
            BTC_USDT_BENCHMARK: { available: true, latencyMs: 14, lastUpdated: Date.now() },
          },
        });
      }

      set({ signalReports: reports });
    },

    runBacktestForStrategy: (strategyNumber, customParams) => {
      const { strategies, customParameters } = get();
      const strat = strategies.find((s) => s.number === strategyNumber);
      if (!strat) return null;

      set({ activeBacktestRunning: true });

      const fullParams: BacktestRequestParams = {
        strategyId: strat.id,
        strategyNumber: strat.number,
        strategyVersion: strat.version,
        instrument: customParams.instrument || "BTCUSDT",
        timeframe: customParams.timeframe || strat.primaryTimeframe,
        startDate: customParams.startDate || new Date(Date.now() - 180 * 86400000).toISOString(),
        endDate: customParams.endDate || new Date().toISOString(),
        initialCapital: customParams.initialCapital || 100000,
        riskPctPerTrade: customParams.riskPctPerTrade || 0.5,
        takerFeeRate: customParams.takerFeeRate || 0.0005,
        makerFeeRate: customParams.makerFeeRate || 0.0002,
        slippagePct: customParams.slippagePct || 0.0005,
        fundingRatePer8h: customParams.fundingRatePer8h || 0.0001,
        leverage: customParams.leverage || 1,
        directionFilter: customParams.directionFilter || "BOTH",
        strategyParameters: { ...strat.defaultParameters, ...(customParameters[strategyNumber] || {}) },
      };

      const result = strategyBacktestEngine.runBacktest(strat, fullParams);

      set((state) => ({
        activeBacktestRunning: false,
        backtestResults: {
          ...state.backtestResults,
          [strategyNumber]: result,
        },
      }));

      return result;
    },

    activatePaperStrategy: (strategyNumber, instrument, timeframe, riskPct = 0.5) => {
      const { strategies } = get();
      const strat = strategies.find((s) => s.number === strategyNumber);
      if (!strat) return null;

      const instance = paperTradingEngine.activatePaperStrategy(strat, instrument, timeframe, riskPct);
      set({ paperInstances: paperTradingEngine.getActiveInstances() });
      return instance;
    },

    pausePaperStrategy: (instanceId) => {
      paperTradingEngine.pausePaperStrategy(instanceId);
      set({ paperInstances: paperTradingEngine.getActiveInstances() });
    },

    closePaperTrade: (journalId, exitPrice, reason = "TAKE_PROFIT") => {
      paperTradingEngine.closePaperTrade(journalId, exitPrice, reason);
      set({ journalRecords: paperTradingEngine.getJournalRecords() });
    },

    updateStrategyParameters: (strategyNumber, params) => {
      set((state) => ({
        customParameters: {
          ...state.customParameters,
          [strategyNumber]: {
            ...(state.customParameters[strategyNumber] || {}),
            ...params,
          },
        },
      }));
    },

    evaluateRiskForTrade: (proposed) => {
      return strategyRiskEngine.evaluateTradeRisk(proposed, 0);
    },
  };
});
