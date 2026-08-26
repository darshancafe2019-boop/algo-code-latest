"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Star,
  Plus,
  TrendingUp,
  Activity,
  BarChart2,
  Zap,
  Shield,
  Layers,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Check,
  X,
  Sliders,
  Clock,
} from "lucide-react";
import { StrategyIdeRule, RuleTimeframe } from "@/types/strategy-ide";

export type RuleTargetStage = "setup" | "confirmation" | "trigger";

export interface IndicatorDefinition {
  id: string;
  name: string;
  category: "TREND" | "MOMENTUM" | "VOLUME" | "VOLATILITY" | "STRUCTURE";
  description: string;
  leftKey: string;
  leftLabel: string;
  defaultOp: string;
  defaultRight: string;
  defaultRightLabel: string;
  defaultLength?: number;
  defaultTimeframe: RuleTimeframe;
}

const INDICATOR_CATALOG: IndicatorDefinition[] = [
  // Trend
  {
    id: "ema_9",
    name: "EMA 9",
    category: "TREND",
    description: "Fast momentum & timing line",
    leftKey: "ema_9",
    leftLabel: "EMA 9",
    defaultOp: "crosses_above",
    defaultRight: "ema_21",
    defaultRightLabel: "EMA 21",
    defaultLength: 9,
    defaultTimeframe: "15m",
  },
  {
    id: "ema_21",
    name: "EMA 21",
    category: "TREND",
    description: "Short-term trend baseline",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "ema_21",
    defaultRightLabel: "EMA 21",
    defaultLength: 21,
    defaultTimeframe: "15m",
  },
  {
    id: "ema_50",
    name: "EMA 50",
    category: "TREND",
    description: "Medium-term trend filter",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "ema_50",
    defaultRightLabel: "EMA 50",
    defaultLength: 50,
    defaultTimeframe: "15m",
  },
  {
    id: "ema_200",
    name: "EMA 200",
    category: "TREND",
    description: "Macro bull/bear institutional filter",
    leftKey: "close",
    leftLabel: "1H Close",
    defaultOp: ">",
    defaultRight: "ema_200",
    defaultRightLabel: "1H EMA 200",
    defaultLength: 200,
    defaultTimeframe: "1h",
  },
  {
    id: "sma_200",
    name: "SMA 200",
    category: "TREND",
    description: "Simple Moving Average benchmark",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "sma_200",
    defaultRightLabel: "SMA 200",
    defaultLength: 200,
    defaultTimeframe: "1d",
  },
  {
    id: "supertrend",
    name: "Supertrend",
    category: "TREND",
    description: "Adaptive ATR-based trend direction",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "supertrend",
    defaultRightLabel: "Supertrend (10, 3)",
    defaultLength: 10,
    defaultTimeframe: "15m",
  },

  // Momentum
  {
    id: "rsi_14",
    name: "RSI",
    category: "MOMENTUM",
    description: "Relative Strength Index momentum",
    leftKey: "rsi_14",
    leftLabel: "RSI (14)",
    defaultOp: ">",
    defaultRight: "55",
    defaultRightLabel: "55.0",
    defaultLength: 14,
    defaultTimeframe: "15m",
  },
  {
    id: "macd",
    name: "MACD",
    category: "MOMENTUM",
    description: "Moving Average Convergence Divergence",
    leftKey: "macd_line",
    leftLabel: "MACD Line",
    defaultOp: "crosses_above",
    defaultRight: "macd_signal",
    defaultRightLabel: "MACD Signal",
    defaultLength: 12,
    defaultTimeframe: "15m",
  },
  {
    id: "adx_14",
    name: "ADX",
    category: "MOMENTUM",
    description: "Directional trend strength filter",
    leftKey: "adx_14",
    leftLabel: "ADX (14)",
    defaultOp: ">",
    defaultRight: "25",
    defaultRightLabel: "25.0",
    defaultLength: 14,
    defaultTimeframe: "15m",
  },
  {
    id: "stoch",
    name: "Stochastic",
    category: "MOMENTUM",
    description: "Overbought / Oversold oscillator",
    leftKey: "stoch_k",
    leftLabel: "Stoch %K",
    defaultOp: "<",
    defaultRight: "20",
    defaultRightLabel: "20.0",
    defaultLength: 14,
    defaultTimeframe: "15m",
  },

  // Volume
  {
    id: "vwap",
    name: "VWAP",
    category: "VOLUME",
    description: "Volume-Weighted Average Price",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "vwap",
    defaultRightLabel: "VWAP (Session)",
    defaultTimeframe: "15m",
  },
  {
    id: "volume_surge",
    name: "Volume Surge",
    category: "VOLUME",
    description: "Current volume exceeding 20-bar average",
    leftKey: "volume",
    leftLabel: "Volume",
    defaultOp: ">",
    defaultRight: "volume_ma_20",
    defaultRightLabel: "20-bar Avg Volume",
    defaultTimeframe: "15m",
  },

  // Volatility
  {
    id: "atr_14",
    name: "ATR",
    category: "VOLATILITY",
    description: "Average True Range expansion filter",
    leftKey: "atr_14",
    leftLabel: "ATR (14)",
    defaultOp: ">",
    defaultRight: "atr_ma_20",
    defaultRightLabel: "20-bar Avg ATR",
    defaultLength: 14,
    defaultTimeframe: "15m",
  },
  {
    id: "bollinger",
    name: "Bollinger Bands",
    category: "VOLATILITY",
    description: "Statistical standard deviation bands",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: "<",
    defaultRight: "bb_lower",
    defaultRightLabel: "Lower Band (20, 2)",
    defaultLength: 20,
    defaultTimeframe: "15m",
  },

  // Structure
  {
    id: "swing_break",
    name: "Swing Breakout",
    category: "STRUCTURE",
    description: "Break of 20-bar swing high / low",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "swing_high_20",
    defaultRightLabel: "20-bar Swing High",
    defaultTimeframe: "15m",
  },
  {
    id: "bos",
    name: "Break of Structure",
    category: "STRUCTURE",
    description: "Market structure change confirmation",
    leftKey: "bos_bullish",
    leftLabel: "BOS Bullish",
    defaultOp: "==",
    defaultRight: "1",
    defaultRightLabel: "Confirmed (1)",
    defaultTimeframe: "15m",
  },
];

const CATEGORIES = [
  { id: "ALL", label: "All Indicators" },
  { id: "FAVORITES", label: "★ Favorites" },
  { id: "TREND", label: "Trend" },
  { id: "MOMENTUM", label: "Momentum" },
  { id: "VOLUME", label: "Volume" },
  { id: "VOLATILITY", label: "Volatility" },
  { id: "STRUCTURE", label: "Structure" },
];

const CONDITIONS = [
  { value: ">", label: "Greater Than (>)" },
  { value: "<", label: "Less Than (<)" },
  { value: ">=", label: "Greater or Equal (>=)" },
  { value: "<=", label: "Less or Equal (<=)" },
  { value: "==", label: "Equals (==)" },
  { value: "crosses_above", label: "Crosses Above" },
  { value: "crosses_below", label: "Crosses Below" },
];

const TIMEFRAMES: RuleTimeframe[] = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"];

interface Props {
  onAddRule: (target: RuleTargetStage, rule: StrategyIdeRule) => void;
  baseTimeframe: RuleTimeframe;
}

export function StrategyBuildLibrary({ onAddRule, baseTimeframe }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [favorites, setFavorites] = useState<string[]>(["ema_50", "rsi_14", "vwap", "volume_surge"]);

  // Add Rule Drawer / Modal State
  const [addModalIndicator, setAddModalIndicator] = useState<IndicatorDefinition | null>(null);
  const [addLength, setAddLength] = useState<number>(14);
  const [addCondition, setAddCondition] = useState<string>(">");
  const [addValue, setAddValue] = useState<string>("55");
  const [addTimeframe, setAddTimeframe] = useState<RuleTimeframe>(baseTimeframe || "15m");
  const [addTargetStage, setAddTargetStage] = useState<RuleTargetStage>("setup");
  const [addRequired, setAddRequired] = useState<boolean>(true);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quantos_strategy_favorites");
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("quantos_strategy_favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Open Unified Add Rule Modal
  const handleOpenAddModal = (ind: IndicatorDefinition) => {
    setAddModalIndicator(ind);
    setAddLength(ind.defaultLength || 14);
    setAddCondition(ind.defaultOp);
    setAddValue(ind.defaultRight);
    setAddTimeframe(ind.defaultTimeframe || baseTimeframe || "15m");
    setAddTargetStage("setup");
    setAddRequired(true);
  };

  // Submit Add Rule
  const handleSubmitAddRule = () => {
    if (!addModalIndicator) return;

    const newRule: StrategyIdeRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timeframe: addTimeframe,
      left: addModalIndicator.leftKey,
      leftLabel: addModalIndicator.leftLabel,
      op: addCondition,
      right: addValue,
      rightLabel: addValue,
      category: addModalIndicator.category,
      enabled: true,
      description: `${addTimeframe} ${addModalIndicator.name} ${addCondition} ${addValue}`,
    };

    onAddRule(addTargetStage, newRule);
    setAddModalIndicator(null);
  };

  // Filtered indicators
  const displayedIndicators = useMemo(() => {
    let list = INDICATOR_CATALOG;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    if (activeCategory === "FAVORITES") {
      list = list.filter((i) => favorites.includes(i.id));
    } else if (activeCategory !== "ALL") {
      list = list.filter((i) => i.category === activeCategory);
    }

    // Sort: Favorites first when in ALL view
    if (activeCategory === "ALL" && !search.trim()) {
      return [...list].sort((a, b) => {
        const aFav = favorites.includes(a.id) ? 1 : 0;
        const bFav = favorites.includes(b.id) ? 1 : 0;
        return bFav - aFav;
      });
    }

    return list;
  }, [search, activeCategory, favorites]);

  return (
    <aside className="w-full lg:w-60 bg-[#09110E] border border-[#1F392D] rounded-2xl p-3.5 flex flex-col gap-3 shadow-xl text-xs font-sans select-none shrink-0">
      
      {/* 1. Panel Header & Search Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-[#142B21] pb-2">
          <div className="flex items-center gap-1.5">
            <Sliders className="h-4 w-4 text-[#55C98A]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Indicators</h3>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0C1713] text-[#8BA596] font-mono">
            {displayedIndicators.length}
          </span>
        </div>

        {/* Search */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#060D0A] border border-[#14271F] rounded-xl text-xs">
          <Search className="h-3.5 w-3.5 text-[#8BA596] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search indicators..."
            className="bg-transparent text-white focus:outline-none w-full text-xs placeholder-[#4E6B5C]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#607D6E] hover:text-white">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Filters Pills */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 text-[11px] font-mono">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? "bg-[#123C2A] text-[#55C98A] font-bold border border-[#39B978]/40"
                : "text-[#8BA596] hover:text-white hover:bg-[#0C1713]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Indicators List */}
      <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-0.5 scrollbar-thin">
        {displayedIndicators.length === 0 ? (
          <div className="py-8 text-center text-[#607D6E] text-xs font-mono">
            No matching indicators found.
          </div>
        ) : (
          displayedIndicators.map((ind) => {
            const isFav = favorites.includes(ind.id);
            return (
              <div
                key={ind.id}
                className="group bg-[#060D0A] hover:bg-[#0C1713] border border-[#14271F] hover:border-[#1F392D] rounded-xl p-2.5 transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {/* Star Favorite Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(ind.id, e)}
                    className={`mt-0.5 transition-colors ${
                      isFav ? "text-amber-400" : "text-[#243E30] group-hover:text-[#4B705B]"
                    }`}
                    title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs truncate">{ind.name}</span>
                    </div>
                    <p className="text-[10px] text-[#8BA596] truncate">{ind.description}</p>
                  </div>
                </div>

                {/* [+ Add] Button */}
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(ind)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-mono font-bold text-[11px] transition-colors border border-[#39B978]/30 shrink-0"
                  title="Add rule to strategy"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 4. UNIFIED ADD RULE MODAL / DRAWER */}
      {addModalIndicator && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
          <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-2xl w-full max-w-md space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#142B21] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#123C2A] text-[#55C98A]">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase">ADD RULE</h3>
                  <span className="text-[10px] text-[#8BA596] font-mono">{addModalIndicator.name}</span>
                </div>
              </div>
              <button
                onClick={() => setAddModalIndicator(null)}
                className="text-[#8BA596] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Parameter Fields */}
            <div className="space-y-3 font-mono text-xs">
              
              {/* Target Stage (Use In: Setup / Confirm / Trigger) */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Use In Stage</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["setup", "confirmation", "trigger"] as RuleTargetStage[]).map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setAddTargetStage(stage)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                        addTargetStage === stage
                          ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                          : "bg-[#060D0A] text-[#8BA596] border border-[#14271F] hover:text-white"
                      }`}
                    >
                      {stage === "confirmation" ? "Confirm" : stage}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicator Length & Source (if applicable) */}
              {addModalIndicator.defaultLength && (
                <div className="space-y-1">
                  <span className="text-[11px] text-[#8BA596] uppercase font-bold">Length / Period</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={addLength}
                    onChange={(e) => setAddLength(parseInt(e.target.value) || 14)}
                    className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                  />
                </div>
              )}

              {/* Condition Dropdown */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Condition</span>
                <select
                  value={addCondition}
                  onChange={(e) => setAddCondition(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A] cursor-pointer"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#09110E] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Value */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Compare Value / Target</span>
                <input
                  type="text"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#14271F] rounded-lg px-3 py-1.5 text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              {/* Timeframe */}
              <div className="space-y-1">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Timeframe</span>
                <div className="grid grid-cols-4 gap-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setAddTimeframe(tf)}
                      className={`py-1 rounded text-[11px] font-bold transition-all ${
                        addTimeframe === tf
                          ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60"
                          : "bg-[#060D0A] text-[#8BA596] border border-[#14271F] hover:text-white"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-[#142B21]">
                <span className="text-[11px] text-[#8BA596] uppercase font-bold">Required Rule</span>
                <button
                  type="button"
                  onClick={() => setAddRequired(!addRequired)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    addRequired
                      ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60"
                      : "bg-[#060D0A] text-[#607D6E] border border-[#14271F]"
                  }`}
                >
                  {addRequired ? "ON" : "OFF"}
                </button>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#142B21]">
              <button
                type="button"
                onClick={() => setAddModalIndicator(null)}
                className="px-4 py-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white font-bold font-mono text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAddRule}
                className="px-5 py-2 rounded-xl bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-bold font-mono text-xs transition-all shadow-sm flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Add Rule</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </aside>
  );
}
