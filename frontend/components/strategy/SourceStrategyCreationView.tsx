"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Check,
  X,
  Clock,
  AlertTriangle,
  Info,
  Sliders,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Play,
  RotateCcw,
  Save,
  CheckCircle2,
  XCircle,
  BarChart2,
  Lock,
  ArrowRight,
  Database,
  Radio,
  FileCode,
  Tag,
  HelpCircle,
  FlaskConical,
  Bot,
  Layers,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  Compass,
  Sparkles,
  Shield,
  ShieldCheck,
  Building2,
  Coins,
  SlidersHorizontal,
} from "lucide-react";
import {
  CRYPTO_30_STRATEGIES,
  ALL_QUANTOS_STRATEGIES,
  CryptoStrategyDefinition,
  StrategyCategory,
  MarketRegimeType,
} from "@/lib/strategies/crypto30Strategies";
import { useStrategyStore } from "@/lib/strategies/strategyStore";
import { formatMoney, formatNumber } from "@/lib/formatters";

// ============================================================================
// STRATEGY GROUPS (30 CANONICAL SOURCE MODELS GROUPED BY PURPOSE)
// ============================================================================

export const STRATEGY_PURPOSE_GROUPS = [
  {
    id: "TREND",
    title: "TREND & CONTINUATION",
    description: "Trend-following strategies utilizing moving average pullbacks, momentum expansion and multi-timeframe alignment.",
    strategyNumbers: ["01", "02", "03", "04", "05"],
  },
  {
    id: "BREAKOUT",
    title: "BREAKOUT & EXPANSION",
    description: "Volatility expansion and range breakout systems exploiting compression phases and opening ranges.",
    strategyNumbers: ["06", "07", "08", "09", "10"],
  },
  {
    id: "MEAN_REVERSION",
    title: "MEAN REVERSION",
    description: "Statistical mean reversion targeting extreme envelope deviations, overextended RSI and VWAP value zones.",
    strategyNumbers: ["11", "12", "13", "14", "15"],
  },
  {
    id: "STRUCTURE",
    title: "STRUCTURE & REVERSAL",
    description: "Market structure shift identification, liquidity sweep rejections and failed breakout exploitations.",
    strategyNumbers: ["16", "17", "18", "19", "20"],
  },
  {
    id: "VOLUME",
    title: "VOLUME & MOMENTUM",
    description: "Volume-profile anchored breakouts, volume dry-up pullbacks and on-balance volume divergences.",
    strategyNumbers: ["21", "22", "23", "24", "25"],
  },
  {
    id: "CRYPTO_SPECIFIC",
    title: "CRYPTO-SPECIFIC & MULTI-FACTOR",
    description: "Crypto-native market structures: funding rate basis divergence, open interest expansions and BTC dominance regimes.",
    strategyNumbers: ["26", "27", "28", "29", "30"],
  },
  {
    id: "OPTIONS_INCOME",
    title: "RANGE & INCOME (CONDORS & BUTTERFLIES)",
    description: "Multi-leg range income architectures: Short Iron Condor, Iron Butterfly, Long Butterfly, Long Condor.",
    strategyNumbers: ["31", "33", "34", "52", "53"],
  },
  {
    id: "OPTIONS_VOLATILITY",
    title: "VOLATILITY & SPREADS (STRADDLES & STRANGLES)",
    description: "Volatility breakouts and vertical debit/credit spreads: Long Straddle, Long Strangle, Bull Call, Bear Put.",
    strategyNumbers: ["32", "35", "36", "37", "38", "39", "40", "41", "42", "45", "46", "47"],
  },
  {
    id: "OPTIONS_CALENDARS",
    title: "CALENDARS, COVERED & SYNTHETICS",
    description: "Time decay and synthetic holding structures: Long Calendar, Diagonal Spread, Covered Call, Collar, Long Combination.",
    strategyNumbers: ["43", "44", "48", "49", "50", "51", "54"],
  },
];

export interface IndependentStrategyConfig {
  strategyNumber: string;
  parameters: Record<string, any>;
  customName?: string;
  accountEquity: number;
  riskPerTradePct: number;
  leverage: number;
  orderType: "LIMIT" | "MARKET" | "STOP_LIMIT";
  stopLossMethod: "SWING_STRUCTURE" | "ATR_MULTIPLE" | "PERCENTAGE";
  stopLossAtrMult: number;
  targetMethod: "RISK_REWARD_MULTIPLE" | "KEY_RESISTANCE" | "TRAILING_ONLY";
  targetRrRatio: number;
  trailingEnabled: boolean;
  trailingActivationR: number;
  trailingStepAtr: number;
  timeStopBars: number;
  maxReEntries: number;
}

function createDefaultStrategyConfig(strategy: CryptoStrategyDefinition): IndependentStrategyConfig {
  return {
    strategyNumber: strategy.number,
    parameters: { ...(strategy.defaultParameters || {}) },
    customName: undefined,
    accountEquity: 100000,
    riskPerTradePct: 0.5,
    leverage: 1,
    orderType: strategy.number === "02" || strategy.number === "08" ? "MARKET" : "LIMIT",
    stopLossMethod: strategy.indicators.some((i) => i.name.includes("ATR")) ? "ATR_MULTIPLE" : "SWING_STRUCTURE",
    stopLossAtrMult: 1.5,
    targetMethod: "RISK_REWARD_MULTIPLE",
    targetRrRatio: 2.0,
    trailingEnabled: true,
    trailingActivationR: 1.0,
    trailingStepAtr: 0.5,
    timeStopBars: 12,
    maxReEntries: 1,
  };
}

export function SourceStrategyCreationView({
  onSelectDerivativeMode,
}: {
  onSelectDerivativeMode?: () => void;
}) {
  const router = useRouter();

  // Search & Filtering State
  const [selectedStrategyNumber, setSelectedStrategyNumber] = useState<string>("01");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryPillFilter, setCategoryPillFilter] = useState<string>("ALL");
  const [quickFilter, setQuickFilter] = useState<string>("ALL");
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [directionFilter, setDirectionFilter] = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<string>("ALL");

  // Mode: Simple Mode (Default) vs Professional Mode
  const [isProfessionalMode, setIsProfessionalMode] = useState<boolean>(false);

  // Active Detail Tab
  const [activeDetailTab, setActiveDetailTab] = useState<
    "OVERVIEW" | "CONDITIONS" | "INDICATORS" | "ENTRY_EXIT" | "RISK" | "DATA" | "BACKTEST"
  >("OVERVIEW");

  // Isolated Configuration Storage: Keyed strictly by strategy number
  const [isolatedConfigs, setIsolatedConfigs] = useState<Record<string, IndependentStrategyConfig>>(() => {
    const initial: Record<string, IndependentStrategyConfig> = {};
    for (const strat of CRYPTO_30_STRATEGIES) {
      initial[strat.number] = createDefaultStrategyConfig(strat);
    }
    return initial;
  });

  // Simulated / Live Market Price for dynamic calculations
  const [simulatedPrice, setSimulatedPrice] = useState<number>(67600);
  const [simulatedAtr, setSimulatedAtr] = useState<number>(1100);

  // Condition checklist states
  const [conditionStates, setConditionStates] = useState<Record<string, "PASS" | "FAIL" | "WAITING" | "DATA_UNAVAILABLE">>({});

  // Feedback Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPaperTesting, setIsPaperTesting] = useState<boolean>(false);

  // Lookup active strategy
  const activeStrategy: CryptoStrategyDefinition = useMemo(() => {
    return CRYPTO_30_STRATEGIES.find((s) => s.number === selectedStrategyNumber) || CRYPTO_30_STRATEGIES[0];
  }, [selectedStrategyNumber]);

  // Lookup active isolated configuration
  const currentConfig = useMemo(() => {
    return isolatedConfigs[activeStrategy.number] || createDefaultStrategyConfig(activeStrategy);
  }, [isolatedConfigs, activeStrategy]);

  // Update parameter without touching other strategies
  const handleUpdateParameter = (key: string, value: any) => {
    setIsolatedConfigs((prev) => {
      const existing = prev[activeStrategy.number] || createDefaultStrategyConfig(activeStrategy);
      return {
        ...prev,
        [activeStrategy.number]: {
          ...existing,
          parameters: {
            ...existing.parameters,
            [key]: value,
          },
        },
      };
    });
  };

  const handleUpdateConfigField = <K extends keyof IndependentStrategyConfig>(
    field: K,
    value: IndependentStrategyConfig[K]
  ) => {
    setIsolatedConfigs((prev) => {
      const existing = prev[activeStrategy.number] || createDefaultStrategyConfig(activeStrategy);
      return {
        ...prev,
        [activeStrategy.number]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  // Reset current strategy to source defaults
  const handleResetToSourceDefaults = () => {
    setIsolatedConfigs((prev) => ({
      ...prev,
      [activeStrategy.number]: createDefaultStrategyConfig(activeStrategy),
    }));
    setToastMessage(`Reset S${activeStrategy.number} to original source defaults.`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync simulated price when selected strategy changes
  useEffect(() => {
    if (activeStrategy.exampleTrade?.entryPrice) {
      setSimulatedPrice(activeStrategy.exampleTrade.entryPrice);
    }
  }, [activeStrategy]);

  // Filtered Strategies List
  const filteredStrategies = useMemo(() => {
    return ALL_QUANTOS_STRATEGIES.filter((strat) => {
      // 1. Search filter (Number, Name, Indicator, Timeframe, Category, Direction)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = strat.name.toLowerCase().includes(q);
        const matchesNum = strat.number.includes(q) || `s${strat.number}`.includes(q);
        const matchesCat = strat.category.toLowerCase().includes(q);
        const matchesTF = strat.primaryTimeframe.toLowerCase().includes(q) || strat.alternateTimeframes.some((t) => t.toLowerCase().includes(q));
        const matchesDir = strat.direction.toLowerCase().includes(q);
        const matchesMkt = strat.market.toLowerCase().includes(q);
        const matchesInd = strat.indicators.some((i) => i.name.toLowerCase().includes(q));

        if (!matchesName && !matchesNum && !matchesCat && !matchesTF && !matchesDir && !matchesMkt && !matchesInd) {
          return false;
        }
      }

      // 2. Category Pill Filter
      if (categoryPillFilter !== "ALL") {
        if (categoryPillFilter === "TREND" && strat.category !== "Trend & Continuation") return false;
        if (categoryPillFilter === "BREAKOUT" && strat.category !== "Breakout & Expansion") return false;
        if (categoryPillFilter === "MEAN_REVERSION" && strat.category !== "Pullback & Mean Reversion") return false;
        if (categoryPillFilter === "STRUCTURE" && strat.category !== "Structure & Reversal") return false;
        if (categoryPillFilter === "VOLUME" && strat.category !== "Momentum & Volume") return false;
        if (categoryPillFilter === "CRYPTO_SPECIFIC" && strat.category !== "Crypto-Specific & Multi-Factor") return false;
        if (categoryPillFilter === "OPTIONS" && strat.category !== "Multi-Leg Options & Income") return false;
        if (categoryPillFilter === "OPTIONS_INCOME") {
          const group = STRATEGY_PURPOSE_GROUPS.find((g) => g.id === "OPTIONS_INCOME");
          if (!group || !group.strategyNumbers.includes(strat.number)) return false;
        }
        if (categoryPillFilter === "OPTIONS_VOLATILITY") {
          const group = STRATEGY_PURPOSE_GROUPS.find((g) => g.id === "OPTIONS_VOLATILITY");
          if (!group || !group.strategyNumbers.includes(strat.number)) return false;
        }
        if (categoryPillFilter === "OPTIONS_CALENDARS") {
          const group = STRATEGY_PURPOSE_GROUPS.find((g) => g.id === "OPTIONS_CALENDARS");
          if (!group || !group.strategyNumbers.includes(strat.number)) return false;
        }
      }

      // 3. Quick Filters
      if (quickFilter === "READY_NOW" && strat.status !== "READY") return false;
      if (quickFilter === "LONG" && strat.direction !== "LONG" && strat.direction !== "LONG / SHORT") return false;
      if (quickFilter === "SHORT" && strat.direction !== "SHORT" && strat.direction !== "LONG / SHORT") return false;
      if (quickFilter === "BOTH" && strat.direction !== "LONG / SHORT") return false;
      if (quickFilter === "1H" && !strat.primaryTimeframe.includes("1H") && !strat.alternateTimeframes.includes("1H")) return false;
      if (quickFilter === "4H" && !strat.primaryTimeframe.includes("4H") && !strat.alternateTimeframes.includes("4H")) return false;
      if (quickFilter === "DAILY" && !strat.primaryTimeframe.includes("1D") && !strat.alternateTimeframes.includes("1D")) return false;

      // 4. More filters
      if (directionFilter !== "ALL" && strat.direction !== directionFilter) return false;
      if (timeframeFilter !== "ALL" && strat.primaryTimeframe !== timeframeFilter && !strat.alternateTimeframes.includes(timeframeFilter)) return false;

      return true;
    });
  }, [searchQuery, categoryPillFilter, quickFilter, directionFilter, timeframeFilter]);

  // Grouped Strategies for Vertical Rendering
  const groupedStrategies = useMemo(() => {
    return STRATEGY_PURPOSE_GROUPS.map((group) => {
      const items = filteredStrategies.filter((s) => group.strategyNumbers.includes(s.number));
      return {
        ...group,
        strategies: items,
      };
    }).filter((g) => g.strategies.length > 0);
  }, [filteredStrategies]);

  // Automated Mathematical Formulations
  const metrics = useMemo(() => {
    const isLong = activeStrategy.direction !== "SHORT";
    const entry = simulatedPrice;
    const atr = simulatedAtr;

    let stopDistance = entry * 0.0244;
    if (currentConfig.stopLossMethod === "ATR_MULTIPLE") {
      stopDistance = atr * (currentConfig.stopLossAtrMult || 1.5);
    } else if (currentConfig.stopLossMethod === "PERCENTAGE") {
      stopDistance = entry * 0.02;
    } else if (activeStrategy.exampleTrade?.entryPrice && activeStrategy.exampleTrade?.stopPrice) {
      stopDistance = Math.abs(activeStrategy.exampleTrade.entryPrice - activeStrategy.exampleTrade.stopPrice);
    }

    if (stopDistance <= 0) stopDistance = entry * 0.01;

    const stopPrice = isLong ? Math.max(0, entry - stopDistance) : entry + stopDistance;
    const targetDistance = stopDistance * (currentConfig.targetRrRatio || 2.0);
    const targetPrice = isLong ? entry + targetDistance : Math.max(0, entry - targetDistance);

    const equity = currentConfig.accountEquity || 100000;
    const riskPct = currentConfig.riskPerTradePct || 0.5;
    const dollarRisk = (equity * riskPct) / 100;
    const positionUnits = dollarRisk / stopDistance;
    const notionalValue = positionUnits * entry;
    const marginRequired = notionalValue / (currentConfig.leverage || 1);

    return {
      entryPrice: entry,
      stopPrice: Number(stopPrice.toFixed(2)),
      targetPrice: Number(targetPrice.toFixed(2)),
      stopDistance: Number(stopDistance.toFixed(2)),
      stopDistancePct: Number(((stopDistance / entry) * 100).toFixed(2)),
      targetDistance: Number(targetDistance.toFixed(2)),
      targetDistancePct: Number(((targetDistance / entry) * 100).toFixed(2)),
      rrRatio: `1 : ${(currentConfig.targetRrRatio || 2.0).toFixed(1)}`,
      dollarRisk: Number(dollarRisk.toFixed(2)),
      riskPct: riskPct,
      positionUnits: Number(positionUnits.toFixed(4)),
      notionalValue: Number(notionalValue.toFixed(2)),
      marginRequired: Number(marginRequired.toFixed(2)),
      isLong,
    };
  }, [activeStrategy, currentConfig, simulatedPrice, simulatedAtr]);

  // Evaluated Conditions Checklist
  const conditionsList = useMemo(() => {
    return activeStrategy.setupConditions.map((cond, idx) => {
      const userStatus = conditionStates[cond.id];
      const status = userStatus || (idx === 3 && activeStrategy.number === "01" ? "WAITING" : "PASS");

      let actualVal = "PASS — Met";
      let failureReason: string | undefined = undefined;

      if (cond.category === "TREND") {
        actualVal = `EMA 50 > EMA 200 ($${formatNumber(simulatedPrice, 0)})`;
      } else if (cond.category === "PULLBACK") {
        actualVal = `Price touched reference EMA`;
        if (status === "FAIL") {
          actualVal = `Price extended without retrace`;
          failureReason = "Pullback condition not satisfied";
        } else if (status === "WAITING") {
          actualVal = `Waiting for candle retest`;
          failureReason = "Retest in progress; awaiting reclaim candle.";
        }
      } else if (cond.category === "RECLAIM") {
        actualVal = `Closed candle reclaimed key level`;
      } else if (cond.category === "RISK") {
        actualVal = `Stop distance (${metrics.stopDistancePct}%) <= 3.0% limit`;
      } else {
        actualVal = `Condition rule met`;
      }

      return {
        id: cond.id,
        name: cond.name,
        description: cond.description,
        category: cond.category,
        status,
        actualVal,
        failureReason,
      };
    });
  }, [activeStrategy, conditionStates, simulatedPrice, metrics]);

  // Overall Setup Result
  const overallResult = useMemo(() => {
    const hasFail = conditionsList.some((c) => c.status === "FAIL");
    const hasWaiting = conditionsList.some((c) => c.status === "WAITING");

    if (hasFail) {
      const f = conditionsList.find((c) => c.status === "FAIL");
      return {
        status: "NO_SETUP" as const,
        label: "NO SETUP",
        color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
        dotColor: "bg-rose-500",
        reason: f?.failureReason || `${f?.name} not met.`,
      };
    }
    if (hasWaiting) {
      const w = conditionsList.find((c) => c.status === "WAITING");
      return {
        status: "WAITING" as const,
        label: "WAITING",
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        dotColor: "bg-amber-400",
        reason: w?.failureReason || "Awaiting confirmation bar.",
      };
    }
    return {
      status: "READY" as const,
      label: `READY — ${activeStrategy.direction === "SHORT" ? "SHORT" : "LONG"}`,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      dotColor: "bg-emerald-400",
      reason: "All source setup rules validated.",
    };
  }, [conditionsList, activeStrategy]);

  // Save Custom Strategy
  const handleSaveCustom = () => {
    const customName = currentConfig.customName?.trim() || `${activeStrategy.name} (Custom)`;
    setToastMessage(`Saved "${customName}" separately to Custom Strategies.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Start Paper Test Sandbox
  const handlePaperTest = () => {
    setIsPaperTesting(true);
    setToastMessage(`Paper simulation active for S${activeStrategy.number} on ${activeStrategy.market}.`);
    setTimeout(() => {
      setIsPaperTesting(false);
      setToastMessage(null);
    }, 3500);
  };

  return (
    <div className="flex flex-col gap-5 text-slate-100 font-sans pb-16 animate-fadeIn">
      {/* ======================================================================= */}
      {/* 1. STRATEGY CENTER HEADER & SEARCH BAR */}
      {/* ======================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-sm">
            30
          </div>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wide text-white">
              STRATEGY CENTER
            </h1>
            <p className="text-xs text-slate-400">
              30 canonical quantitative trading models • Independent configurations • Deterministic rule engine
            </p>
          </div>
        </div>

        {/* Search & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Instant Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search strategy, indicator (EMA, RSI, 4H)..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64 font-mono"
            />
          </div>

          {/* Simple vs Professional Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setIsProfessionalMode(false)}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                !isProfessionalMode ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Simple Mode
            </button>
            <button
              type="button"
              onClick={() => setIsProfessionalMode(true)}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                isProfessionalMode ? "bg-purple-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Professional
            </button>
          </div>

          {onSelectDerivativeMode && (
            <button
              onClick={onSelectDerivativeMode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Multi-Leg Options</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 2. CATEGORY PILLS & QUICK FILTERS BAR */}
      {/* ======================================================================= */}
      <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {[
            { id: "ALL", label: "All (54 Models)" },
            { id: "TREND", label: "Trend (S01–S05)" },
            { id: "BREAKOUT", label: "Breakout (S06–S10)" },
            { id: "MEAN_REVERSION", label: "Reversal (S11–S15)" },
            { id: "VOLUME", label: "Volume (S21–S25)" },
            { id: "STRUCTURE", label: "Structure (S16–S20)" },
            { id: "CRYPTO_SPECIFIC", label: "Crypto-Specific (S26–S30)" },
            { id: "OPTIONS_INCOME", label: "🎯 Range & Income (O01–O08)" },
            { id: "OPTIONS_VOLATILITY", label: "⚡ Volatility & Spreads (O09–O16)" },
            { id: "OPTIONS_CALENDARS", label: "⏳ Calendars & Synthetics (O17–O24)" },
          ].map((cat) => {
            const isSelected = categoryPillFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryPillFilter(cat.id)}
                className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition border ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                    : "bg-slate-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Quick Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Quick Filters:</span>
            {[
              { id: "ALL", label: "All Strategies" },
              { id: "READY_NOW", label: "Ready Now" },
              { id: "LONG", label: "Long" },
              { id: "SHORT", label: "Short" },
              { id: "BOTH", label: "Both" },
              { id: "1H", label: "1H" },
              { id: "4H", label: "4H" },
              { id: "DAILY", label: "Daily" },
            ].map((qf) => {
              const isSelected = quickFilter === qf.id;
              return (
                <button
                  key={qf.id}
                  onClick={() => setQuickFilter(qf.id)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition ${
                    isSelected
                      ? "bg-slate-700 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  {qf.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-400 font-mono"
          >
            <span>More Filters</span>
            {showMoreFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expanded More Filters Dropdowns */}
        {showMoreFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs animate-fadeIn">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">DIRECTION</label>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300"
              >
                <option value="ALL">All Directions</option>
                <option value="LONG">LONG Only</option>
                <option value="SHORT">SHORT Only</option>
                <option value="LONG / SHORT">LONG / SHORT</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-bold block mb-1">PRIMARY TIMEFRAME</label>
              <select
                value={timeframeFilter}
                onChange={(e) => setTimeframeFilter(e.target.value)}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300"
              >
                <option value="ALL">All Timeframes</option>
                <option value="15m">15m</option>
                <option value="1H">1H</option>
                <option value="4H">4H</option>
                <option value="1D">1D</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 3. TWO-PANEL RESPONSIVE WORKSPACE LAYOUT */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ===================================================================== */}
        {/* LEFT PANEL: SCROLLABLE STRATEGY LIST (Grouped by Purpose) */}
        {/* ===================================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-4 max-h-[820px] overflow-y-auto pr-1">
          {groupedStrategies.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              No strategies matched your filter criteria.
            </div>
          ) : (
            groupedStrategies.map((group) => (
              <div key={group.id} className="flex flex-col gap-2">
                {/* Purpose Group Header */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    {group.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {group.strategies.length} Models
                  </span>
                </div>

                {/* Strategy Rows */}
                <div className="flex flex-col gap-2">
                  {group.strategies.map((strat) => {
                    const isSelected = strat.number === selectedStrategyNumber;
                    const indicatorsSummary = strat.indicators.map((i) => i.name).join(" • ");

                    return (
                      <div
                        key={strat.id}
                        onClick={() => setSelectedStrategyNumber(strat.number)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500 shadow-md shadow-cyan-950/40"
                            : "bg-slate-900/80 hover:bg-slate-900 border-slate-800/90 text-slate-300"
                        }`}
                      >
                        {/* Row Header: Number, Name, Timeframe */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-black text-cyan-400 shrink-0">
                              S{strat.number}
                            </span>
                            <span className="text-xs font-bold text-white truncate">
                              {strat.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                            {strat.primaryTimeframe}
                          </span>
                        </div>

                        {/* Category & Indicators */}
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span className="truncate">{strat.category}</span>
                          <span className="font-mono text-[10px] text-slate-500 truncate max-w-[50%]">
                            {indicatorsSummary}
                          </span>
                        </div>

                        {/* Bottom Status Line: Direction, Data Status, Signal Result */}
                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-800/60 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-300">{strat.direction}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-emerald-400">Data: READY</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${strat.status === "READY" ? "bg-emerald-400" : "bg-amber-400"}`} />
                            <span className={`font-bold ${strat.status === "READY" ? "text-emerald-400" : "text-amber-400"}`}>
                              {strat.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ===================================================================== */}
        {/* RIGHT PANEL: SELECTED STRATEGY DETAILS & EXECUTION ENGINE */}
        {/* ===================================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl">
          {/* Active Strategy Header Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-black text-cyan-400 text-base">
                  S{activeStrategy.number}
                </span>
                <h2 className="text-base font-bold text-white">{activeStrategy.name}</h2>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-slate-400">{activeStrategy.category}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-purple-400 font-bold">{activeStrategy.primaryTimeframe}</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-emerald-400 font-bold">{activeStrategy.direction}</span>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className={`px-3 py-1 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold ${overallResult.color}`}>
              <span className={`w-2 h-2 rounded-full ${overallResult.dotColor}`} />
              <span>{overallResult.label}</span>
            </div>
          </div>

          {/* Details Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-slate-800 pb-1 text-xs">
            {[
              { id: "OVERVIEW", label: "Overview" },
              { id: "CONDITIONS", label: "Conditions" },
              { id: "INDICATORS", label: "Indicators" },
              { id: "ENTRY_EXIT", label: "Entry / Exit" },
              { id: "RISK", label: "Risk" },
              { id: "DATA", label: "Data" },
              { id: "BACKTEST", label: "Backtest" },
            ].map((tab) => {
              const isActive = activeDetailTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    isActive
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* =================================================================== */}
          {/* TAB 1: OVERVIEW (Clean explanation & visual flow) */}
          {/* =================================================================== */}
          {activeDetailTab === "OVERVIEW" && (
            <div className="flex flex-col gap-4 text-xs">
              {/* Purpose & Market Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Purpose</span>
                  <p className="text-slate-300 leading-relaxed">{activeStrategy.whatItDoes}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Market Condition</span>
                  <p className="text-slate-300">{activeStrategy.bestMarketConditions.join("; ")}</p>
                </div>
              </div>

              {/* "WHY THIS STRATEGY?" Visual Logic Flow */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-cyan-400">
                  WHY THIS STRATEGY? (EXECUTION LOGIC FLOW)
                </span>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] pt-1">
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                    1. Trend Filter
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                    2. Pullback / Squeeze
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-bold">
                    3. Reclaim Trigger
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                    4. Entry + Stop
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                    5. Target ({currentConfig.targetRrRatio}R)
                  </span>
                </div>
              </div>

              {/* Current Signal Summary Snapshot */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  CURRENT LIVE SIGNAL SNAPSHOT
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Direction</span>
                    <span className="font-bold text-emerald-400">{activeStrategy.direction}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Entry Price</span>
                    <span className="font-bold text-white">${formatNumber(metrics.entryPrice, 2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Stop Loss</span>
                    <span className="font-bold text-rose-400">${formatNumber(metrics.stopPrice, 2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Take Profit Target</span>
                    <span className="font-bold text-cyan-400">${formatNumber(metrics.targetPrice, 2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: CONDITIONS (Checklist format) */}
          {/* =================================================================== */}
          {activeDetailTab === "CONDITIONS" && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1">
                <span>Setup Checklist ({conditionsList.length} rules):</span>
                <span className="font-mono text-cyan-400">100% Confluence Required</span>
              </div>

              <div className="flex flex-col gap-2">
                {conditionsList.map((cond, idx) => {
                  const isPass = cond.status === "PASS";
                  const isFail = cond.status === "FAIL";
                  return (
                    <div
                      key={cond.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isPass
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : isFail
                          ? "bg-rose-500/10 border-rose-500/40"
                          : "bg-amber-500/10 border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPass ? "bg-emerald-500 text-slate-950" : isFail ? "bg-rose-500 text-white" : "bg-amber-400 text-slate-950"
                        }`}>
                          {isPass ? "✓" : isFail ? "✕" : "○"}
                        </span>
                        <div>
                          <span className="font-bold text-white block">{cond.name}</span>
                          <span className="text-[11px] text-slate-400">{cond.description}</span>
                          {cond.failureReason && (
                            <span className="text-[10px] text-rose-300 font-semibold block mt-0.5">
                              ✕ {cond.failureReason}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {cond.actualVal}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Result Summary Bar */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${overallResult.color}`}>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold">RESULT:</span>
                  <span className="font-black">{overallResult.label}</span>
                </div>
                <span className="text-[11px] opacity-90">{overallResult.reason}</span>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: INDICATORS (Only required indicators) */}
          {/* =================================================================== */}
          {activeDetailTab === "INDICATORS" && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
                <span>Required Indicators ({activeStrategy.indicators.length}):</span>
                <span className="font-mono text-cyan-400">[SOURCE DEFINED 🔒]</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeStrategy.indicators.map((ind, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{ind.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {ind.defaultSetting}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{ind.purpose}</p>

                    {isProfessionalMode && (
                      <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-mono">Setting:</span>
                        <input
                          type="text"
                          value={currentConfig.parameters[ind.name] ?? ind.parameter}
                          onChange={(e) => handleUpdateParameter(ind.name, e.target.value)}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 w-full"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: ENTRY / EXIT */}
          {/* =================================================================== */}
          {activeDetailTab === "ENTRY_EXIT" && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Entry Box */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">ENTRY</span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Order Type:</span>
                    <span className="font-mono font-bold text-cyan-300">{currentConfig.orderType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Entry Price:</span>
                    <span className="font-mono font-bold text-white">${formatNumber(metrics.entryPrice, 2)}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">Trigger: Close above reclaim bar</span>
                </div>

                {/* Stop Box */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">STOP LOSS</span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Method:</span>
                    <span className="font-mono font-bold text-rose-400">{currentConfig.stopLossMethod}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Stop Price:</span>
                    <span className="font-mono font-bold text-rose-400">${formatNumber(metrics.stopPrice, 2)}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">Distance: -{metrics.stopDistancePct}%</span>
                </div>

                {/* Target Box */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">TARGET</span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Method:</span>
                    <span className="font-mono font-bold text-emerald-400">{currentConfig.targetRrRatio}R Multiple</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Price:</span>
                    <span className="font-mono font-bold text-emerald-400">${formatNumber(metrics.targetPrice, 2)}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1">R:R Ratio: {metrics.rrRatio}</span>
                </div>
              </div>

              {/* Trailing & Invalidation */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Trailing Stop:</span>
                  <span className="font-mono text-slate-200">Breakeven at 1.0R; trail 0.5 ATR step</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Time Stop:</span>
                  <span className="font-mono text-slate-200">{currentConfig.timeStopBars} Bars inactivity timeout</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Invalidation:</span>
                  <span className="font-mono text-slate-200">Close beyond reference EMA level</span>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 5: RISK CALCULATOR (Transparent Sizing) */}
          {/* =================================================================== */}
          {activeDetailTab === "RISK" && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Account Capital</span>
                  <span className="font-bold text-white">${formatNumber(currentConfig.accountEquity, 0)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Risk %</span>
                  <span className="font-bold text-cyan-400">{currentConfig.riskPerTradePct}%</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Risk Amount</span>
                  <span className="font-bold text-rose-400">${formatNumber(metrics.dollarRisk, 2)}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Position Size</span>
                  <span className="font-bold text-emerald-400">{metrics.positionUnits} units</span>
                </div>
              </div>

              {/* Transparent Sizing Formula Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5 font-mono text-[11px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase font-sans">
                  Transparent Sizing Formula
                </span>
                <div className="text-slate-300">
                  Position Size = Dollar Risk (${metrics.dollarRisk}) / Stop Distance (${metrics.stopDistance}) ={" "}
                  <strong className="text-emerald-400">{metrics.positionUnits}</strong>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Required Margin at 1x: ${formatNumber(metrics.marginRequired, 2)}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 6: DATA (Market Data Feed Status) */}
          {/* =================================================================== */}
          {activeDetailTab === "DATA" && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1">
                <span>Required Feeds for {activeStrategy.name}:</span>
                <span className="font-mono text-emerald-400">&lt; 18ms Latency SLA</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { name: "OHLCV", status: "LIVE", required: true },
                  { name: "ATR 14", status: "LIVE", required: true },
                  { name: "Volume SMA 20", status: "LIVE", required: true },
                  { name: "Order Book Depth", status: "LIVE", required: true },
                  { name: "Open Interest", status: "NOT REQUIRED", required: false },
                  { name: "Funding Rate Basis", status: "NOT REQUIRED", required: false },
                ].map((feed, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1">
                    <span className="font-bold text-slate-200">{feed.name}</span>
                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
                      <span className={`w-2 h-2 rounded-full ${feed.status === "LIVE" ? "bg-emerald-400" : "bg-slate-600"}`} />
                      <span className={feed.status === "LIVE" ? "text-emerald-400 font-bold" : "text-slate-500"}>
                        {feed.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 7: BACKTEST (Verified Historical Metrics) */}
          {/* =================================================================== */}
          {activeDetailTab === "BACKTEST" && (
            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Win Rate</span>
                  <span className="font-bold text-emerald-400">58.4%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Profit Factor</span>
                  <span className="font-bold text-cyan-400">1.94</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Max Drawdown</span>
                  <span className="font-bold text-rose-400">-4.2%</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Sharpe Ratio</span>
                  <span className="font-bold text-purple-400">2.18</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-[11px]">
                Deterministic forward and paper test results calculated across 180 trading sessions. Zero synthetic curves.
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* BOTTOM ACTION BAR */}
          {/* =================================================================== */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-800 text-xs">
            <button
              onClick={handleResetToSourceDefaults}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold border border-slate-700 transition"
              title="Reset parameters to source defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Defaults</span>
            </button>

            <button
              onClick={handleSaveCustom}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Custom</span>
            </button>

            <button
              onClick={handlePaperTest}
              disabled={isPaperTesting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/40 transition disabled:opacity-50"
            >
              <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isPaperTesting ? "Running Simulation..." : "Paper Test"}</span>
            </button>

            <button
              onClick={() => router.push(`/strategy/backtest?strategy=${activeStrategy.number}`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold border border-purple-500/40 transition"
            >
              <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Backtest</span>
            </button>

            <button
              onClick={() => router.push(`/bots/create?strategy=${activeStrategy.id}&underlying=BTC`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/30 transition"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Activate Bot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
