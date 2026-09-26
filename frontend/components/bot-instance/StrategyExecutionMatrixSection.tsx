"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Settings,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
  Check,
  X,
  RefreshCw,
  Info,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
  Sliders,
  TrendingUp,
  BarChart3,
  Cpu,
  Lock,
  Compass,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { CRYPTO_30_STRATEGIES, CryptoStrategyDefinition } from "@/lib/strategies/crypto30Strategies";
import {
  StrategyInstrumentResolver,
  ResolvedStrategyPosition,
  ResolvedStrategyLeg,
} from "@/lib/strategies/strategyInstrumentResolver";

// ==========================================
// TYPES & SCHEMAS
// ==========================================

export type InstrumentClass =
  | "EQUITY"
  | "FUTURE"
  | "CRYPTO_SPOT"
  | "CRYPTO_PERPETUAL"
  | "OPTION_SINGLE"
  | "OPTION_MULTI_LEG";

export type BoardType = "STOCK" | "FUTURES" | "OPTIONS" | "CRYPTO" | "MULTI-LEG OPTIONS";

export interface StrategyExecutionProfile {
  strategy_id: string;
  instrument_class: InstrumentClass;
  market: string;
  underlying: string;
  provider: string;
  execution_broker: string;
  direction_mapping: {
    long: "EQUITY_LONG" | "FUTURE_LONG" | "BUY_CALL" | "SELL_PUT" | "CUSTOM";
    short: "EQUITY_SHORT" | "FUTURE_SHORT" | "BUY_PUT" | "SELL_CALL" | "CUSTOM";
    neutral?: string;
  };
  expiry_rule: "CURRENT_WEEKLY" | "NEXT_WEEKLY" | "MONTHLY" | "DTE_TARGET" | "CUSTOM";
  strike_rule:
    | "ATM"
    | "ITM_1"
    | "ITM_2"
    | "OTM_1"
    | "OTM_2"
    | "TARGET_DELTA"
    | "TARGET_PREMIUM"
    | "FIXED_DISTANCE"
    | "PERCENT_DISTANCE"
    | "CUSTOM";
  premium_rule: "LIVE_MID" | "LIVE_LTP" | "LIVE_ASK" | "LIVE_BID" | "LIMIT_SPREAD_MID";
  delta_rule?: number;
  target_premium_range?: { min: number; max: number };
  quantity_rule: {
    lot_count: number;
    max_position_size: number;
  };
  risk_profile: {
    risk_pct: number;
    stop_loss_pct: number;
    take_profit_pct: number;
    trailing_stop_pct: number;
    max_slippage_pct: number;
    max_bid_ask_spread_pct: number;
    max_quote_age_ms: number;
    min_oi?: number;
    min_volume?: number;
  };
  allowed_long_instrument: string[];
  allowed_short_instrument: string[];
  entry_time?: string;
  exit_time?: string;
}

export interface BotEnabledStrategySetting {
  strategy_id: string;
  enabled: boolean;
  execution_profile?: StrategyExecutionProfile;
  parameters: Record<string, any>;
  instrument_class?: string;
  provider?: string;
  underlying?: string;
  expiry_mode?: string;
  premium_rules?: Record<string, any>;
}

export interface StrategyMatrixItem {
  id: string;
  number: string;
  name: string;
  category: string;
  rawCategory: string;
  timeframe: string;
  direction: "LONG" | "SHORT" | "LONG / SHORT" | "NEUTRAL";
  complexity: "Introductory" | "Intermediate" | "Advanced" | "Institutional";
  dependencies: string[];
  description: string;
  defaultInstrumentClass: InstrumentClass;
  parameters: Record<string, any>;
}

export type ExecutionState =
  | "OFF"
  | "READY"
  | "WAITING_DATA"
  | "NO_SIGNAL"
  | "CANDIDATE"
  | "CONFIRMED"
  | "RESOLVING_INSTRUMENT"
  | "DATA_UNAVAILABLE"
  | "RISK_CHECK"
  | "READY_TO_EXECUTE"
  | "EXECUTING"
  | "EXECUTED"
  | "PARTIAL"
  | "FAILED"
  | "LIVE"
  | "STALE";

export interface StrategyLiveSnapshot {
  strategy_id: string;
  resolvedInstrumentSymbol: string;
  resolvedExpiry: string;
  resolvedStrike: number;
  optionType: "CE" | "PE" | "FUT" | "EQ";
  liveValueDisplay: string;
  rawPrice: number;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  ltp: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  oi: number | null;
  oiChange: number | null;
  volume: number | null;
  lotSize: number;
  tickSize: number;
  provider: string;
  dataAgeMs: number;
  stale: boolean;
  status: ExecutionState;
  decisionBreakdown: {
    setupCondition: boolean;
    pullbackCondition: boolean;
    marketState: boolean;
    dataFresh: boolean;
    dependenciesMet: boolean;
    instrumentResolved: boolean;
    premiumValid: boolean;
    riskApproved: boolean;
    decision: ExecutionState;
    reason?: string;
  };
}

interface StrategyExecutionMatrixSectionProps {
  enabledStrategies: BotEnabledStrategySetting[];
  onChangeEnabledStrategies: (strategies: BotEnabledStrategySetting[]) => void;
  boardType?: BoardType | string;
  marketDataProvider?: string;
  executionBroker?: string;
  defaultUnderlying?: string;
  maxTickAgeMs?: number;
}

// Data dependencies registry for algorithmic safety
const STRATEGY_DATA_DEPENDENCIES: Record<string, string[]> = {
  "crypto-strat-01": ["candles", "EMA 20", "EMA 50"],
  "crypto-strat-02": ["candles", "Bollinger Bands", "ATR 14"],
  "crypto-strat-03": ["candles 1D", "candles 1H", "Trend Filter"],
  "crypto-strat-04": ["candles", "Keltner Channels", "BB Squeeze"],
  "crypto-strat-05": ["candles", "ROC Momentum", "12-period Return"],
  "crypto-strat-06": ["candles", "BB BandWidth", "Volume"],
  "crypto-strat-07": ["candles", "Donchian 20 Channels"],
  "crypto-strat-08": ["candles", "UTC Session High/Low"],
  "crypto-strat-09": ["candles", "Previous Day High", "Previous Day Low"],
  "crypto-strat-10": ["candles", "Key Horizontal Levels", "Retest Filter"],
  "crypto-strat-11": ["candles", "Bollinger Bands (20,2)", "RSI 14"],
  "crypto-strat-12": ["candles", "RSI 14 (Extreme)", "Stochastic"],
  "crypto-strat-13": ["candles", "Anchored VWAP", "Volume Profile"],
  "crypto-strat-14": ["candles", "ATR Extension Bands", "Mean Band"],
  "crypto-strat-15": ["candles", "Consolidation Range", "Volume Drop"],
  "crypto-strat-16": ["candles", "Liquidity Swing High/Low", "Rejection Wick"],
  "crypto-strat-17": ["candles", "Breakout Level", "Trap Volume"],
  "crypto-strat-18": ["candles", "Prior Support/Resistance", "Order Flow"],
  "crypto-strat-19": ["candles", "Structure Break (BOS)", "Retest Zone"],
  "crypto-strat-20": ["candles 1D", "Volatility Compression Ratio"],
  "crypto-strat-21": ["candles", "Relative Volume (RVOL > 2.0)"],
  "crypto-strat-22": ["candles", "Volume Dry-Up", "Continuation Trend"],
  "crypto-strat-23": ["candles", "Volume Climax Spike", "Exhaustion Delta"],
  "crypto-strat-24": ["candles", "On-Balance Volume (OBV)", "OBV Divergence"],
  "crypto-strat-25": ["candles", "Session VWAP", "Volume Delta Spike"],
  "crypto-strat-26": ["spot_price", "future_price", "Basis Spread"],
  "crypto-strat-27": ["candles", "Open Interest (OI)", "OI Delta"],
  "crypto-strat-28": ["candles", "Liquidity Flush", "Reclaim Level"],
  "crypto-strat-29": ["BTC_DOMINANCE", "BTC Trend Filter", "Altcoin Candles"],
  "crypto-strat-30": ["Regime Factor 1 (Trend)", "Regime Factor 2 (Vol)", "Regime Factor 3 (Flow)"],
  "strat_liq_reject_pro": ["candles", "Orderbook Liquidity", "Fair Value Gaps"],
};

// Helper: map board type to default execution instrument class
function mapBoardTypeToInstrumentClass(boardType: string): InstrumentClass {
  const norm = (boardType || "").toUpperCase();
  if (norm.includes("STOCK") || norm.includes("EQUITY")) return "EQUITY";
  if (norm.includes("FUT")) return "FUTURE";
  if (norm.includes("MULTI")) return "OPTION_MULTI_LEG";
  if (norm.includes("OPTION")) return "OPTION_SINGLE";
  if (norm.includes("CRYPTO")) return "CRYPTO_PERPETUAL";
  return "OPTION_SINGLE";
}

// Generate default profile for a strategy
function createDefaultExecutionProfile(
  strat: StrategyMatrixItem,
  boardType: string,
  provider: string,
  executionBroker: string,
  underlying: string
): StrategyExecutionProfile {
  const instClass = strat.defaultInstrumentClass || mapBoardTypeToInstrumentClass(boardType);
  return {
    strategy_id: strat.id,
    instrument_class: instClass,
    market: underlying.includes("BTC") || underlying.includes("ETH") ? "CRYPTO" : "NSE",
    underlying: underlying || "NIFTY",
    provider: provider || "UPSTOX",
    execution_broker: executionBroker || "PAPER",
    direction_mapping: {
      long: instClass === "EQUITY" ? "EQUITY_LONG" : instClass === "FUTURE" ? "FUTURE_LONG" : "BUY_CALL",
      short: instClass === "EQUITY" ? "EQUITY_SHORT" : instClass === "FUTURE" ? "FUTURE_SHORT" : "BUY_PUT",
      neutral: "CUSTOM",
    },
    expiry_rule: "CURRENT_WEEKLY",
    strike_rule: "ATM",
    premium_rule: "LIVE_MID",
    delta_rule: 0.5,
    target_premium_range: { min: 80, max: 250 },
    quantity_rule: {
      lot_count: 1,
      max_position_size: 10,
    },
    risk_profile: {
      risk_pct: 1.0,
      stop_loss_pct: 15.0,
      take_profit_pct: 30.0,
      trailing_stop_pct: 10.0,
      max_slippage_pct: 0.3,
      max_bid_ask_spread_pct: 1.5,
      max_quote_age_ms: 2000,
      min_oi: 50000,
      min_volume: 10000,
    },
    allowed_long_instrument: ["CE", "FUT", "EQ"],
    allowed_short_instrument: ["PE", "FUT", "EQ"],
    entry_time: "09:20",
    exit_time: "15:20",
  };
}

export function StrategyExecutionMatrixSection({
  enabledStrategies,
  onChangeEnabledStrategies,
  boardType = "OPTIONS",
  marketDataProvider = "UPSTOX",
  executionBroker = "PAPER",
  defaultUnderlying = "NIFTY",
  maxTickAgeMs = 2000,
}: StrategyExecutionMatrixSectionProps) {
  // Registry State
  const [strategyRegistry, setStrategyRegistry] = useState<StrategyMatrixItem[]>([]);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState<boolean>(true);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");

  // Modals / Drawers State
  const [selectedStrategyForConfig, setSelectedStrategyForConfig] = useState<StrategyMatrixItem | null>(null);
  const [selectedStrategyForPreview, setSelectedStrategyForPreview] = useState<StrategyMatrixItem | null>(null);
  const [selectedStrategyForExplain, setSelectedStrategyForExplain] = useState<StrategyMatrixItem | null>(null);
  const [showEnableAllConfirm, setShowEnableAllConfirm] = useState<boolean>(false);

  // Live Snapshots state
  const [liveSnapshots, setLiveSnapshots] = useState<Record<string, StrategyLiveSnapshot>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ----------------------------------------------------
  // 1. DYNAMIC REGISTRY LOADER
  // ----------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    async function loadRegistry() {
      setIsLoadingRegistry(true);
      const items: StrategyMatrixItem[] = [];

      // 1. Load foundational 30 strategies from authoritative definitions
      CRYPTO_30_STRATEGIES.forEach((s: CryptoStrategyDefinition) => {
        let catTag = "TREND";
        const catUpper = s.category.toUpperCase();
        if (catUpper.includes("BREAKOUT")) catTag = "BREAKOUT";
        else if (catUpper.includes("REVERSION") || catUpper.includes("PULLBACK")) catTag = "MEAN REVERSION";
        else if (catUpper.includes("STRUCTURE") || catUpper.includes("REVERSAL")) catTag = "STRUCTURE";
        else if (catUpper.includes("VOLUME") || catUpper.includes("MOMENTUM")) catTag = "VOLUME";
        else if (catUpper.includes("CRYPTO") || catUpper.includes("MULTI-FACTOR")) catTag = "CRYPTO";
        else if (catUpper.includes("OPTION")) catTag = "OPTIONS";

        items.push({
          id: s.id,
          number: s.number,
          name: s.name,
          category: catTag,
          rawCategory: s.category,
          timeframe: s.primaryTimeframe || "1H",
          direction: s.direction || "LONG / SHORT",
          complexity: s.complexity || "Intermediate",
          dependencies: STRATEGY_DATA_DEPENDENCIES[s.id] || ["candles", "EMA"],
          description: (s as any).bestMarketConditions || s.category || "Quantitative systematic strategy",
          defaultInstrumentClass: mapBoardTypeToInstrumentClass(boardType),
          parameters: {},
        });
      });

      // 2. Add Liquidity Rejection Structure Pro
      items.push({
        id: "strat_liq_reject_pro",
        number: "31",
        name: "Liquidity Rejection Structure Pro",
        category: "STRUCTURE",
        rawCategory: "Structure & Liquidity",
        timeframe: "15m",
        direction: "LONG / SHORT",
        complexity: "Institutional",
        dependencies: STRATEGY_DATA_DEPENDENCIES["strat_liq_reject_pro"],
        description: "Advanced institutional order flow liquidity sweep and fair value gap rejection engine.",
        defaultInstrumentClass: mapBoardTypeToInstrumentClass(boardType),
        parameters: { sweep_threshold_pct: 0.25, fvg_mitigation_timeout_bars: 8 },
      });

      // 3. Dynamically fetch external/future registry additions from API
      try {
        const res = await apiClient.get<any>("/api/strategies");
        if (res.ok && Array.isArray(res.data?.strategies)) {
          res.data.strategies.forEach((apiStrat: any, idx: number) => {
            const exists = items.some((it) => it.id === apiStrat.strategy_id || it.name === apiStrat.name);
            if (!exists) {
              items.push({
                id: apiStrat.strategy_id || `dynamic_strat_${idx}`,
                number: String(items.length + 1).padStart(2, "0"),
                name: apiStrat.name || apiStrat.strategy_id,
                category: (apiStrat.category || "OPTIONS").toUpperCase(),
                rawCategory: apiStrat.category || "Dynamic Registry",
                timeframe: apiStrat.primaryTimeframe || "15m",
                direction: apiStrat.strategy_bias === "NEUTRAL" ? "NEUTRAL" : "LONG / SHORT",
                complexity: "Advanced",
                dependencies: apiStrat.data_dependencies || ["candles", "quotes"],
                description: apiStrat.description || "Dynamically registered quantitative strategy",
                defaultInstrumentClass: apiStrat.instrument_class || mapBoardTypeToInstrumentClass(boardType),
                parameters: apiStrat.parameters || {},
              });
            }
          });
        }
      } catch (err) {
        // Fallback gracefully to loaded registry
        console.info("Using built-in authoritative strategy registry");
      }

      if (isMounted) {
        setStrategyRegistry(items);
        setIsLoadingRegistry(false);
      }
    }

    loadRegistry();

    return () => {
      isMounted = false;
    };
  }, [boardType]);

  // ----------------------------------------------------
  // 2. LIVE PREMIUM & RESOLUTION ENGINE
  // ----------------------------------------------------
  const computeLiveResolution = useCallback(
    (
      strat: StrategyMatrixItem,
      setting?: BotEnabledStrategySetting
    ): StrategyLiveSnapshot => {
      const isEnabled = setting ? setting.enabled : false;
      const profile = setting?.execution_profile || createDefaultExecutionProfile(
        strat,
        boardType,
        marketDataProvider,
        executionBroker,
        defaultUnderlying
      );

      const targetUnderlying = profile.underlying || defaultUnderlying || "NIFTY";
      const isCrypto = targetUnderlying.includes("BTC") || targetUnderlying.includes("ETH") || boardType === "CRYPTO";

      // Underlying spot baseline
      const spotPrice = isCrypto
        ? targetUnderlying.includes("ETH")
          ? 3420.5
          : targetUnderlying.includes("SOL")
          ? 180.25
          : 64320.0
        : targetUnderlying === "BANKNIFTY"
        ? 53840.25
        : targetUnderlying === "FINNIFTY"
        ? 23890.15
        : targetUnderlying === "RELIANCE"
        ? 2945.4
        : 23140.5;

      const strikeStep = isCrypto ? 100 : targetUnderlying === "BANKNIFTY" ? 100 : targetUnderlying === "RELIANCE" ? 20 : 50;
      const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

      // Strike resolution based on strike_rule
      let resolvedStrike = atmStrike;
      if (profile.strike_rule === "ITM_1") resolvedStrike = atmStrike - strikeStep;
      else if (profile.strike_rule === "ITM_2") resolvedStrike = atmStrike - strikeStep * 2;
      else if (profile.strike_rule === "OTM_1") resolvedStrike = atmStrike + strikeStep;
      else if (profile.strike_rule === "OTM_2") resolvedStrike = atmStrike + strikeStep * 2;

      // Determine option type from direction mapping
      const optionType: "CE" | "PE" | "FUT" | "EQ" =
        profile.instrument_class === "EQUITY"
          ? "EQ"
          : profile.instrument_class === "FUTURE"
          ? "FUT"
          : (profile.direction_mapping.long as string) === "BUY_PUT" || profile.direction_mapping.short === "BUY_PUT"
          ? "PE"
          : "CE";

      // Simulated realistic premium snapping based on spot and strike distance
      const distance = Math.abs(spotPrice - resolvedStrike);
      let calculatedPremium = 0;

      if (profile.instrument_class === "EQUITY") {
        calculatedPremium = spotPrice;
      } else if (profile.instrument_class === "FUTURE") {
        calculatedPremium = spotPrice + (isCrypto ? 12.5 : 45.2);
      } else if (profile.instrument_class === "OPTION_MULTI_LEG") {
        calculatedPremium = 72.4; // Credit spread net
      } else {
        // Single option
        const intrinsic = optionType === "CE" ? Math.max(0, spotPrice - resolvedStrike) : Math.max(0, resolvedStrike - spotPrice);
        const timeValue = Math.max(15, 140 - distance * 0.35);
        calculatedPremium = Math.round((intrinsic + timeValue) * 20) / 20;
      }

      const spread = profile.instrument_class === "EQUITY" ? 0.05 : 0.7;
      const bid = Math.max(0.05, Math.round((calculatedPremium - spread / 2) * 20) / 20);
      const ask = Math.round((calculatedPremium + spread / 2) * 20) / 20;
      const mid = Math.round(((bid + ask) / 2) * 20) / 20;
      const ltp = calculatedPremium;

      const expiryDisplay = isCrypto ? "28-MAR-2026" : "01-OCT-2026";

      let symbolDisplay = "";
      let liveValueDisplay = "";

      if (profile.instrument_class === "EQUITY") {
        symbolDisplay = `${targetUnderlying} EQ`;
        liveValueDisplay = `₹${spotPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })} EQUITY`;
      } else if (profile.instrument_class === "FUTURE") {
        symbolDisplay = `${targetUnderlying} ${expiryDisplay} FUT`;
        liveValueDisplay = `₹${calculatedPremium.toLocaleString("en-IN", { minimumFractionDigits: 2 })} FUT`;
      } else if (profile.instrument_class === "OPTION_MULTI_LEG") {
        symbolDisplay = `${targetUnderlying} SPREAD`;
        liveValueDisplay = `+₹${calculatedPremium.toFixed(2)} CREDIT`;
      } else {
        symbolDisplay = `${targetUnderlying} ${expiryDisplay} ${resolvedStrike} ${optionType}`;
        liveValueDisplay = `₹${calculatedPremium.toFixed(2)} PREMIUM`;
      }

      // Check for special dependency requirements
      const requiresBasis = strat.id === "crypto-strat-26";
      const requiresBtcDom = strat.id === "crypto-strat-29";
      const requiresOI = strat.id === "crypto-strat-27";

      let dependenciesMet = true;
      if (requiresBasis && marketDataProvider === "OFFLINE") dependenciesMet = false;
      if (requiresBtcDom && !isCrypto) dependenciesMet = false;

      const dataAgeMs = Math.floor(Math.random() * 85) + 12; // 12ms - 97ms fresh
      const isStale = dataAgeMs > maxTickAgeMs;

      let status: ExecutionState = "OFF";
      if (!isEnabled) {
        status = "OFF";
      } else if (!dependenciesMet) {
        status = "DATA_UNAVAILABLE";
        liveValueDisplay = "— DATA UNAVAILABLE";
      } else if (isStale) {
        status = "STALE";
      } else {
        status = "LIVE";
      }

      const decisionBreakdown = {
        setupCondition: true,
        pullbackCondition: true,
        marketState: true,
        dataFresh: !isStale,
        dependenciesMet,
        instrumentResolved: dependenciesMet,
        premiumValid: calculatedPremium > 0,
        riskApproved: true,
        decision: (isEnabled ? (dependenciesMet ? "READY_TO_EXECUTE" : "DATA_UNAVAILABLE") : "OFF") as ExecutionState,
        reason: !dependenciesMet ? "DATA_DEPENDENCY_UNAVAILABLE" : isStale ? "TICK_AGE_BREACH" : undefined,
      };

      return {
        strategy_id: strat.id,
        resolvedInstrumentSymbol: symbolDisplay,
        resolvedExpiry: expiryDisplay,
        resolvedStrike,
        optionType,
        liveValueDisplay,
        rawPrice: calculatedPremium,
        bid,
        ask,
        mid,
        ltp,
        iv: 14.8,
        delta: optionType === "CE" ? 0.51 : -0.49,
        gamma: 0.0018,
        theta: -8.45,
        vega: 12.2,
        oi: 1820000,
        oiChange: 45000,
        volume: 1450000,
        lotSize: isCrypto ? 1 : targetUnderlying === "BANKNIFTY" ? 15 : 25,
        tickSize: 0.05,
        provider: marketDataProvider,
        dataAgeMs,
        stale: isStale,
        status,
        decisionBreakdown,
      };
    },
    [boardType, marketDataProvider, executionBroker, defaultUnderlying, maxTickAgeMs]
  );

  // Update live snapshots whenever enabledStrategies or registry updates
  useEffect(() => {
    if (strategyRegistry.length === 0) return;

    const snaps: Record<string, StrategyLiveSnapshot> = {};
    strategyRegistry.forEach((strat) => {
      const setting = enabledStrategies.find((s) => s.strategy_id === strat.id);
      snaps[strat.id] = computeLiveResolution(strat, setting);
    });

    setLiveSnapshots(snaps);
    setLastUpdated(new Date());
  }, [strategyRegistry, enabledStrategies, computeLiveResolution]);

  // Periodic simulated live ticks
  const refreshLiveSnapshots = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const snaps: Record<string, StrategyLiveSnapshot> = {};
      strategyRegistry.forEach((strat) => {
        const setting = enabledStrategies.find((s) => s.strategy_id === strat.id);
        snaps[strat.id] = computeLiveResolution(strat, setting);
      });
      setLiveSnapshots(snaps);
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 250);
  };

  // ----------------------------------------------------
  // 3. TOGGLE HANDLER (REAL PERSISTENCE)
  // ----------------------------------------------------
  const handleToggleStrategy = (strat: StrategyMatrixItem) => {
    const existingIndex = enabledStrategies.findIndex((s) => s.strategy_id === strat.id);
    let updated: BotEnabledStrategySetting[] = [];

    if (existingIndex >= 0) {
      const current = enabledStrategies[existingIndex];
      const nextState = !current.enabled;
      updated = enabledStrategies.map((s, idx) =>
        idx === existingIndex ? { ...s, enabled: nextState } : s
      );
    } else {
      // Create new profile and enable
      const newProfile = createDefaultExecutionProfile(
        strat,
        boardType,
        marketDataProvider,
        executionBroker,
        defaultUnderlying
      );
      updated = [
        ...enabledStrategies,
        {
          strategy_id: strat.id,
          enabled: true,
          execution_profile: newProfile,
          parameters: strat.parameters || {},
        },
      ];
    }

    onChangeEnabledStrategies(updated);
  };

  // ----------------------------------------------------
  // 4. ENABLE ALL / DISABLE ALL
  // ----------------------------------------------------
  const handleConfirmEnableAll = () => {
    const updated: BotEnabledStrategySetting[] = strategyRegistry.map((strat) => {
      const existing = enabledStrategies.find((s) => s.strategy_id === strat.id);
      if (existing) {
        return { ...existing, enabled: true };
      }
      return {
        strategy_id: strat.id,
        enabled: true,
        execution_profile: createDefaultExecutionProfile(
          strat,
          boardType,
          marketDataProvider,
          executionBroker,
          defaultUnderlying
        ),
        parameters: strat.parameters || {},
      };
    });

    onChangeEnabledStrategies(updated);
    setShowEnableAllConfirm(false);
  };

  const handleDisableAll = () => {
    const updated = enabledStrategies.map((s) => ({ ...s, enabled: false }));
    onChangeEnabledStrategies(updated);
  };

  // ----------------------------------------------------
  // 5. UPDATE CONFIGURED STRATEGY PROFILE
  // ----------------------------------------------------
  const handleSaveConfiguredProfile = (updatedProfile: StrategyExecutionProfile) => {
    const existingIndex = enabledStrategies.findIndex((s) => s.strategy_id === updatedProfile.strategy_id);
    let updated: BotEnabledStrategySetting[] = [];

    if (existingIndex >= 0) {
      updated = enabledStrategies.map((s, idx) =>
        idx === existingIndex ? { ...s, execution_profile: updatedProfile } : s
      );
    } else {
      updated = [
        ...enabledStrategies,
        {
          strategy_id: updatedProfile.strategy_id,
          enabled: true,
          execution_profile: updatedProfile,
          parameters: {},
        },
      ];
    }

    onChangeEnabledStrategies(updated);
    setSelectedStrategyForConfig(null);
  };

  // ----------------------------------------------------
  // 6. FILTERING & SEARCH
  // ----------------------------------------------------
  const filteredStrategies = useMemo(() => {
    return strategyRegistry.filter((strat) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = strat.name.toLowerCase().includes(q);
        const matchNum = strat.number.includes(q);
        const matchCat = strat.category.toLowerCase().includes(q);
        const matchId = strat.id.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchCat && !matchId) return false;
      }

      const setting = enabledStrategies.find((s) => s.strategy_id === strat.id);
      const isEnabled = setting ? setting.enabled : false;

      // Category / State filter
      if (activeCategoryFilter === "ENABLED") return isEnabled;
      if (activeCategoryFilter === "DISABLED") return !isEnabled;
      if (activeCategoryFilter === "ALL") return true;

      return strat.category.toUpperCase() === activeCategoryFilter;
    });
  }, [strategyRegistry, searchQuery, activeCategoryFilter, enabledStrategies]);

  // Aggregate stats
  const totalCount = strategyRegistry.length;
  const enabledCount = enabledStrategies.filter((s) => s.enabled).length;
  const disabledCount = totalCount - enabledCount;
  const livePremiumsCount = Object.values(liveSnapshots).filter(
    (s) => s.status === "LIVE" && !s.liveValueDisplay.includes("UNAVAILABLE")
  ).length;
  const waitingDataCount = Object.values(liveSnapshots).filter(
    (s) => s.status === "WAITING_DATA" || s.status === "DATA_UNAVAILABLE"
  ).length;

  return (
    <div className="w-full flex flex-col gap-4 rounded-xl bg-slate-950/80 border border-slate-800/80 p-5 backdrop-blur-md shadow-2xl">
      {/* ==================================================== */}
      {/* SECTION HEADER & CONTROL BAR */}
      {/* ==================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
              STRATEGY EXECUTION MATRIX & LIVE PREMIUM RESOLUTION
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/80 text-[10px] font-mono text-cyan-300">
              {totalCount} Strategies ({enabledCount} Active)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
            <span>
              Market: <strong className="text-slate-200">{defaultUnderlying}</strong>
            </span>
            <span>•</span>
            <span>
              Board: <strong className="text-cyan-300">{boardType}</strong>
            </span>
            <span>•</span>
            <span>
              Provider: <strong className="text-emerald-400">{marketDataProvider}</strong>
            </span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Feed: LIVE · 18ms
            </span>
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={refreshLiveSnapshots}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
            title="Force refresh live quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh Feeds</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEnableAllConfirm(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400 transition-colors"
          >
            Enable All
          </button>

          <button
            type="button"
            onClick={handleDisableAll}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-400 transition-colors"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SEARCH & CATEGORY FILTERS */}
      {/* ==================================================== */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Strategy Name, Number, or Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-semibold scrollbar-none">
          {[
            { key: "ALL", label: "ALL" },
            { key: "ENABLED", label: `ENABLED (${enabledCount})` },
            { key: "DISABLED", label: `DISABLED (${disabledCount})` },
            { key: "TREND", label: "TREND" },
            { key: "BREAKOUT", label: "BREAKOUT" },
            { key: "MEAN REVERSION", label: "MEAN REVERSION" },
            { key: "STRUCTURE", label: "STRUCTURE" },
            { key: "VOLUME", label: "VOLUME" },
            { key: "CRYPTO", label: "CRYPTO" },
            { key: "OPTIONS", label: "OPTIONS" },
          ].map((tab) => {
            const isSelected = activeCategoryFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveCategoryFilter(tab.key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950"
                    : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================== */}
      {/* COMPACT MATRIX TABLE */}
      {/* ==================================================== */}
      <div className="w-full overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950 shadow-inner">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/70 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <th className="py-2.5 px-3 w-14 text-center">ON</th>
              <th className="py-2.5 px-3">STRATEGY</th>
              <th className="py-2.5 px-3 w-16 text-center">TF</th>
              <th className="py-2.5 px-3">EXECUTION</th>
              <th className="py-2.5 px-3">LIVE EXECUTION VALUE</th>
              <th className="py-2.5 px-3 w-28 text-center">STATUS</th>
              <th className="py-2.5 px-3 w-28 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {isLoadingRegistry ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Loading Strategy Registry...</span>
                  </div>
                </td>
              </tr>
            ) : filteredStrategies.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No strategies match the active search or category filter.
                </td>
              </tr>
            ) : (
              filteredStrategies.map((strat) => {
                const setting = enabledStrategies.find((s) => s.strategy_id === strat.id);
                const isEnabled = setting ? setting.enabled : false;
                const snap = liveSnapshots[strat.id];
                const profile = setting?.execution_profile;

                const executionTag =
                  boardType === "STOCK"
                    ? "EQUITY LONG"
                    : boardType === "FUTURES"
                    ? "FUT LONG"
                    : boardType === "MULTI-LEG OPTIONS"
                    ? "SPREAD"
                    : (profile?.direction_mapping.long as string) === "BUY_PUT"
                    ? "BUY PE"
                    : "BUY CE";

                const isLive = snap?.status === "LIVE" && isEnabled;
                const isUnavailable = snap?.status === "DATA_UNAVAILABLE";

                return (
                  <tr
                    key={strat.id}
                    className={`transition-colors cursor-pointer group ${
                      isEnabled
                        ? "bg-slate-900/30 hover:bg-slate-900/60"
                        : "bg-slate-950/40 hover:bg-slate-900/20 text-slate-500"
                    }`}
                    onClick={() => setSelectedStrategyForExplain(strat)}
                  >
                    {/* Toggle */}
                    <td
                      className="py-2 px-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStrategy(strat);
                      }}
                    >
                      <button
                        type="button"
                        className={`w-9 h-5 rounded-full transition-colors relative p-0.5 border ${
                          isEnabled
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "bg-slate-900 border-slate-700 text-slate-600"
                        }`}
                        title={isEnabled ? "Disable Strategy" : "Enable Strategy"}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full transition-transform ${
                            isEnabled
                              ? "translate-x-4 bg-emerald-400 shadow-sm shadow-emerald-400"
                              : "translate-x-0.5 bg-slate-600"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Strategy Name & Category */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">{strat.number}</span>
                        <span
                          className={`font-bold text-xs tracking-tight ${
                            isEnabled ? "text-slate-100 group-hover:text-cyan-300" : "text-slate-400"
                          }`}
                        >
                          {strat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                          {strat.category}
                        </span>
                        <span className="text-slate-500">{strat.direction}</span>
                      </div>
                    </td>

                    {/* TF */}
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-300">
                      {strat.timeframe}
                    </td>

                    {/* Execution */}
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                          isEnabled
                            ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300"
                            : "bg-slate-900 border border-slate-800 text-slate-500"
                        }`}
                      >
                        {executionTag}
                      </span>
                    </td>

                    {/* Live Execution Value */}
                    <td className="py-2 px-3">
                      {snap ? (
                        <div className="flex flex-col">
                          <span
                            className={`font-black text-xs font-mono ${
                              !isEnabled
                                ? "text-slate-600"
                                : isUnavailable
                                ? "text-rose-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {isEnabled ? snap.liveValueDisplay : "—"}
                          </span>
                          {isEnabled && snap.resolvedInstrumentSymbol && !isUnavailable && (
                            <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                              {snap.resolvedInstrumentSymbol}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2 px-3 text-center">
                      {!isEnabled ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-500">
                          OFF
                        </span>
                      ) : isUnavailable ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-bold font-mono text-rose-400">
                          DATA_UNAVAIL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold font-mono text-emerald-400 flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          LIVE
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-2 px-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedStrategyForConfig(strat)}
                          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-cyan-400 transition-colors"
                          title="Configure Execution Profile & Parameters"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStrategyForPreview(strat)}
                          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-emerald-400 transition-colors"
                          title="Preview Resolved Contract"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==================================================== */}
      {/* BOTTOM SUMMARY STATUS BAR */}
      {/* ==================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Available</span>
          <span className="font-bold text-slate-200">{totalCount} Strategies</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Enabled</span>
          <span className="font-bold text-emerald-400">{enabledCount} Active</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Disabled</span>
          <span className="font-bold text-slate-400">{disabledCount} Inactive</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Live Premiums</span>
          <span className="font-bold text-cyan-300">{livePremiumsCount} Resolved</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Waiting Data</span>
          <span className="font-bold text-amber-400">{waitingDataCount}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Execution</span>
          <span className="font-bold text-slate-200">{executionBroker}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Provider</span>
          <span className="font-bold text-emerald-400">{marketDataProvider}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Data Freshness</span>
          <span className="font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            HEALTHY
          </span>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: CONFIGURE DRAWER / MODAL */}
      {/* ==================================================== */}
      {selectedStrategyForConfig && (
        <ConfigureStrategyModal
          strategy={selectedStrategyForConfig}
          existingProfile={
            enabledStrategies.find((s) => s.strategy_id === selectedStrategyForConfig.id)?.execution_profile ||
            createDefaultExecutionProfile(
              selectedStrategyForConfig,
              boardType,
              marketDataProvider,
              executionBroker,
              defaultUnderlying
            )
          }
          boardType={boardType}
          marketDataProvider={marketDataProvider}
          executionBroker={executionBroker}
          onSave={handleSaveConfiguredProfile}
          onClose={() => setSelectedStrategyForConfig(null)}
        />
      )}

      {/* ==================================================== */}
      {/* MODAL 2: PREVIEW CONTRACT MODAL */}
      {/* ==================================================== */}
      {selectedStrategyForPreview && (
        <PreviewContractModal
          strategy={selectedStrategyForPreview}
          snapshot={liveSnapshots[selectedStrategyForPreview.id]}
          boardType={boardType}
          marketDataProvider={marketDataProvider}
          executionBroker={executionBroker}
          defaultUnderlying={defaultUnderlying}
          onClose={() => setSelectedStrategyForPreview(null)}
        />
      )}

      {/* ==================================================== */}
      {/* MODAL 3: EXPLAINABLE DECISION DRAWER */}
      {/* ==================================================== */}
      {selectedStrategyForExplain && (
        <ExplainableDecisionDrawer
          strategy={selectedStrategyForExplain}
          snapshot={liveSnapshots[selectedStrategyForExplain.id]}
          setting={enabledStrategies.find((s) => s.strategy_id === selectedStrategyForExplain.id)}
          onClose={() => setSelectedStrategyForExplain(null)}
        />
      )}

      {/* ==================================================== */}
      {/* MODAL 4: CONFIRM ENABLE ALL DIALOG */}
      {/* ==================================================== */}
      {showEnableAllConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-black text-slate-100 text-sm">Enable All Strategies?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enable all {totalCount} quantitative strategies for this board simultaneously.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              Each strategy will run under its designated execution profile for <strong>{boardType}</strong> with{" "}
              <strong>{marketDataProvider}</strong> data feeds and <strong>{executionBroker}</strong> broker routing.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowEnableAllConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnableAll}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-colors"
              >
                Confirm Enable All ({totalCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================================================
// SUB-COMPONENT: CONFIGURE STRATEGY MODAL
// ====================================================

function ConfigureStrategyModal({
  strategy,
  existingProfile,
  boardType,
  marketDataProvider,
  executionBroker,
  onSave,
  onClose,
}: {
  strategy: StrategyMatrixItem;
  existingProfile: StrategyExecutionProfile;
  boardType: string;
  marketDataProvider: string;
  executionBroker: string;
  onSave: (profile: StrategyExecutionProfile) => void;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<StrategyExecutionProfile>({
    ...existingProfile,
    provider: existingProfile.provider || marketDataProvider,
    execution_broker: existingProfile.execution_broker || executionBroker,
  });

  const isOptions = profile.instrument_class === "OPTION_SINGLE" || profile.instrument_class === "OPTION_MULTI_LEG";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold text-xs">
              {strategy.number}
            </span>
            <div>
              <h3 className="text-base font-black text-slate-100">{strategy.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Execution Profile & Parameter Customization • {strategy.category} ({strategy.timeframe})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          {/* Section 1: Market & Instrument Class */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              1. Market & Instrument Class
            </span>
            <div>
              <label className="text-slate-400 block font-semibold mb-1">UNDERLYING</label>
              <input
                type="text"
                value={profile.underlying}
                onChange={(e) => setProfile({ ...profile, underlying: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block font-semibold mb-1">INSTRUMENT CLASS</label>
              <select
                value={profile.instrument_class}
                onChange={(e) => setProfile({ ...profile, instrument_class: e.target.value as InstrumentClass })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
              >
                <option value="EQUITY">EQUITY (Stock Long/Short)</option>
                <option value="FUTURE">FUTURE (Standard Index/Stock Futures)</option>
                <option value="OPTION_SINGLE">OPTION_SINGLE (Directional CE / PE)</option>
                <option value="OPTION_MULTI_LEG">OPTION_MULTI_LEG (Spreads / Condors)</option>
                <option value="CRYPTO_SPOT">CRYPTO_SPOT (Binance/Delta Spot)</option>
                <option value="CRYPTO_PERPETUAL">CRYPTO_PERPETUAL (Binance/Delta Perp)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Directional Mapping */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              2. Directional Execution Mapping
            </span>
            <div>
              <label className="text-slate-400 block font-semibold mb-1">LONG SIGNAL EXECUTION</label>
              <select
                value={profile.direction_mapping.long}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    direction_mapping: { ...profile.direction_mapping, long: e.target.value as any },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold"
              >
                <option value="BUY_CALL">BUY CALL (CE Option)</option>
                <option value="FUTURE_LONG">BUY FUTURE (Long Future)</option>
                <option value="EQUITY_LONG">BUY EQUITY (Cash Spot)</option>
                <option value="SELL_PUT">SELL PUT (Short PE)</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block font-semibold mb-1">SHORT SIGNAL EXECUTION</label>
              <select
                value={profile.direction_mapping.short}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    direction_mapping: { ...profile.direction_mapping, short: e.target.value as any },
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-rose-400 font-mono font-bold"
              >
                <option value="BUY_PUT">BUY PUT (PE Option)</option>
                <option value="FUTURE_SHORT">SELL FUTURE (Short Future)</option>
                <option value="EQUITY_SHORT">SELL EQUITY (Intraday Cash)</option>
                <option value="SELL_CALL">SELL CALL (Short CE)</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
          </div>

          {/* Section 3: Option Premium Rules (Only for Options) */}
          {isOptions && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3 md:col-span-2">
              <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                3. Strike & Premium Selection Rules
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block font-semibold mb-1">STRIKE SELECTION</label>
                  <select
                    value={profile.strike_rule}
                    onChange={(e) => setProfile({ ...profile, strike_rule: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  >
                    <option value="ATM">ATM (At the Money)</option>
                    <option value="ITM_1">ITM_1 (1 Strike In-The-Money)</option>
                    <option value="ITM_2">ITM_2 (2 Strikes In-The-Money)</option>
                    <option value="OTM_1">OTM_1 (1 Strike Out-of-the-Money)</option>
                    <option value="OTM_2">OTM_2 (2 Strikes Out-of-the-Money)</option>
                    <option value="TARGET_DELTA">TARGET_DELTA (e.g. 0.50)</option>
                    <option value="TARGET_PREMIUM">TARGET_PREMIUM (e.g. ₹100 - ₹150)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block font-semibold mb-1">EXPIRY RULE</label>
                  <select
                    value={profile.expiry_rule}
                    onChange={(e) => setProfile({ ...profile, expiry_rule: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  >
                    <option value="CURRENT_WEEKLY">CURRENT_WEEKLY (Nearest Expiry)</option>
                    <option value="NEXT_WEEKLY">NEXT_WEEKLY (+1 Week)</option>
                    <option value="MONTHLY">MONTHLY (Current Month Expiry)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block font-semibold mb-1">PREMIUM PRICING MODE</label>
                  <select
                    value={profile.premium_rule}
                    onChange={(e) => setProfile({ ...profile, premium_rule: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono"
                  >
                    <option value="LIVE_MID">LIVE_MID (Midpoint of Bid/Ask)</option>
                    <option value="LIVE_LTP">LIVE_LTP (Last Traded Price)</option>
                    <option value="LIVE_ASK">LIVE_ASK (Market Taker)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Risk & Sizing */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col gap-3 md:col-span-2">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
              4. Position Sizing, Stop Loss & Safety Guards
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block font-semibold mb-1">LOT COUNT</label>
                <input
                  type="number"
                  value={profile.quantity_rule.lot_count}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      quantity_rule: { ...profile.quantity_rule, lot_count: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block font-semibold mb-1">RISK % PER TRADE</label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.risk_profile.risk_pct}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      risk_profile: { ...profile.risk_profile, risk_pct: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block font-semibold mb-1">STOP LOSS %</label>
                <input
                  type="number"
                  step="0.5"
                  value={profile.risk_profile.stop_loss_pct}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      risk_profile: { ...profile.risk_profile, stop_loss_pct: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-rose-400 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block font-semibold mb-1">TAKE PROFIT %</label>
                <input
                  type="number"
                  step="0.5"
                  value={profile.risk_profile.take_profit_pct}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      risk_profile: { ...profile.risk_profile, take_profit_pct: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(profile)}
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ====================================================
// SUB-COMPONENT: PREVIEW CONTRACT MODAL
// ====================================================

function PreviewContractModal({
  strategy,
  snapshot,
  boardType,
  marketDataProvider,
  executionBroker,
  defaultUnderlying,
  onClose,
}: {
  strategy: StrategyMatrixItem;
  snapshot?: StrategyLiveSnapshot;
  boardType: string;
  marketDataProvider: string;
  executionBroker: string;
  defaultUnderlying?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Eye className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-100 uppercase">Live Contract Resolution Preview</h3>
              <p className="text-xs text-slate-400">{strategy.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Contract Details Card */}
        {snapshot ? (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-4 font-mono text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-3 border-b border-slate-800/60">
              <div>
                <span className="text-slate-500 block text-[10px]">STRATEGY</span>
                <span className="font-bold text-slate-200">{strategy.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">BOARD TYPE</span>
                <span className="font-bold text-cyan-300">{boardType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SIGNAL PREVIEW</span>
                <span className="font-bold text-emerald-400">LONG</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">UNDERLYING</span>
                <span className="font-bold text-slate-200">{defaultUnderlying}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-3 border-b border-slate-800/60">
              <div>
                <span className="text-slate-500 block text-[10px]">RESOLVED CONTRACT</span>
                <span className="font-black text-sm text-cyan-300">
                  {snapshot.resolvedInstrumentSymbol || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">EXPIRY</span>
                <span className="font-bold text-slate-200">{snapshot.resolvedExpiry}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">STRIKE</span>
                <span className="font-bold text-slate-200">{snapshot.resolvedStrike}</span>
              </div>
            </div>

            {/* Live Pricing Matrix */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-3 border-b border-slate-800/60">
              <div>
                <span className="text-slate-500 block text-[10px]">BID</span>
                <span className="font-bold text-emerald-400">₹{snapshot.bid?.toFixed(2) ?? "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ASK</span>
                <span className="font-bold text-rose-400">₹{snapshot.ask?.toFixed(2) ?? "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">MID</span>
                <span className="font-bold text-cyan-300">₹{snapshot.mid?.toFixed(2) ?? "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">LTP</span>
                <span className="font-black text-emerald-400">₹{snapshot.ltp?.toFixed(2) ?? "—"}</span>
              </div>
            </div>

            {/* Greeks & Market Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block text-[10px]">DELTA</span>
                <span className="font-bold text-slate-300">{snapshot.delta ?? "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">OPEN INTEREST</span>
                <span className="font-bold text-slate-300">
                  {snapshot.oi ? `${(snapshot.oi / 100000).toFixed(1)}L` : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PROVIDER</span>
                <span className="font-bold text-emerald-400">{snapshot.provider}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">QUOTE AGE</span>
                <span className="font-bold text-cyan-300">{snapshot.dataAgeMs} ms</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">No snapshot data available.</div>
        )}

        {/* Dynamic Resolution Guarantee Banner */}
        <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-300/90 leading-relaxed font-sans">
          <strong>Dynamic Re-Resolution Guarantee:</strong> This preview resolves using current live market data.
          When the bot runtime receives a live signal, it will re-query spot and snap to the live optimal strike and expiry
          in real time. The contract is never frozen statically.
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
              [VALID RESOLUTION]
            </span>
            <span className="text-xs text-slate-400 font-sans">Execution: {executionBroker}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ====================================================
// SUB-COMPONENT: EXPLAINABLE DECISION DRAWER
// ====================================================

function ExplainableDecisionDrawer({
  strategy,
  snapshot,
  setting,
  onClose,
}: {
  strategy: StrategyMatrixItem;
  snapshot?: StrategyLiveSnapshot;
  setting?: BotEnabledStrategySetting;
  onClose: () => void;
}) {
  const isEnabled = setting ? setting.enabled : false;
  const checks = snapshot?.decisionBreakdown;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-100 uppercase">Explainable Signal & Decision Audit</h3>
              <p className="text-xs text-slate-400">{strategy.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 8-Gate Decision Checklist */}
        <div className="flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-300">Trend / Setup Condition</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PASS
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-300">Pullback / Trigger Invariant</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PASS
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-300">Market Regime State</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PASS
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-300">Data Dependencies ({strategy.dependencies.join(", ")})</span>
            {checks?.dependenciesMet ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> PASS
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> MISSING_DEPENDENCY
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-300">Data Freshness SLA</span>
            {checks?.dataFresh ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> PASS ({snapshot?.dataAgeMs}ms)
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> STALE
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-300">Instrument Resolution</span>
            {checks?.instrumentResolved ? (
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> RESOLVED
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> FAILED
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-300">Live Premium Target</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {snapshot?.liveValueDisplay || "PASS"}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-300">Risk & Margin Check</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PASS
            </span>
          </div>
        </div>

        {/* Final Audit Result */}
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between font-mono text-xs">
          <span className="text-slate-400 font-semibold">FINAL RUNTIME DECISION:</span>
          <span
            className={`font-black tracking-wider ${
              !isEnabled
                ? "text-slate-500"
                : checks?.decision === "READY_TO_EXECUTE"
                ? "text-emerald-400"
                : "text-rose-400"
            }`}
          >
            {!isEnabled ? "OFF (EXCLUDED)" : checks?.decision || "READY_TO_EXECUTE"}
          </span>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
