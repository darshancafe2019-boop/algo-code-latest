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
  Sparkles,
  Check
} from "lucide-react";
import { StrategyIdeRule, RuleTimeframe } from "@/types/strategy-ide";

export type RuleTargetStage = "setup" | "confirmation" | "trigger";

export interface IndicatorDefinition {
  id: string;
  name: string;
  category: "FAVORITES" | "TREND" | "MOMENTUM" | "VOLUME" | "VOLATILITY" | "STRUCTURE";
  description: string;
  leftKey: string;
  leftLabel: string;
  defaultOp: string;
  defaultRight: string;
  defaultRightLabel: string;
  defaultTimeframe: RuleTimeframe;
}

const INDICATOR_CATALOG: IndicatorDefinition[] = [
  // Trend
  {
    id: "ema_cross",
    name: "EMA Crossover (9 / 21)",
    category: "TREND",
    description: "Fast momentum & trend alignment trigger",
    leftKey: "ema_9",
    leftLabel: "EMA 9",
    defaultOp: "crosses_above",
    defaultRight: "ema_21",
    defaultRightLabel: "EMA 21",
    defaultTimeframe: "15m",
  },
  {
    id: "ema_50",
    name: "EMA 50",
    category: "TREND",
    description: "Medium-term trend direction filter",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "ema_50",
    defaultRightLabel: "EMA 50",
    defaultTimeframe: "15m",
  },
  {
    id: "ema_200",
    name: "EMA 200 Macro",
    category: "TREND",
    description: "Macro bull/bear institutional baseline",
    leftKey: "close",
    leftLabel: "1H Close",
    defaultOp: ">",
    defaultRight: "ema_200",
    defaultRightLabel: "1H EMA 200",
    defaultTimeframe: "1h",
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
    defaultTimeframe: "15m",
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
    defaultTimeframe: "1d",
  },

  // Momentum
  {
    id: "rsi_14",
    name: "RSI (14)",
    category: "MOMENTUM",
    description: "Relative Strength Index momentum",
    leftKey: "rsi_14",
    leftLabel: "RSI (14)",
    defaultOp: ">",
    defaultRight: "55",
    defaultRightLabel: "55.0",
    defaultTimeframe: "15m",
  },
  {
    id: "macd_cross",
    name: "MACD Signal Cross",
    category: "MOMENTUM",
    description: "MACD line crossing 9-period signal line",
    leftKey: "macd_line",
    leftLabel: "MACD Line",
    defaultOp: "crosses_above",
    defaultRight: "macd_signal",
    defaultRightLabel: "MACD Signal",
    defaultTimeframe: "15m",
  },
  {
    id: "adx_trend",
    name: "ADX Trend Strength",
    category: "MOMENTUM",
    description: "Directional strength filter (> 25)",
    leftKey: "adx_14",
    leftLabel: "ADX (14)",
    defaultOp: ">",
    defaultRight: "25",
    defaultRightLabel: "25.0",
    defaultTimeframe: "15m",
  },

  // Volume
  {
    id: "session_vwap",
    name: "VWAP (Session)",
    category: "VOLUME",
    description: "Volume-weighted average benchmark",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "vwap",
    defaultRightLabel: "VWAP",
    defaultTimeframe: "15m",
  },
  {
    id: "volume_surge",
    name: "Volume Surge (1.5x)",
    category: "VOLUME",
    description: "Current volume exceeding 20-bar MA",
    leftKey: "volume",
    leftLabel: "Volume",
    defaultOp: ">",
    defaultRight: "volume_ma_20",
    defaultRightLabel: "1.5x Vol MA",
    defaultTimeframe: "15m",
  },
  {
    id: "vp_poc",
    name: "Volume Profile POC",
    category: "VOLUME",
    description: "Point of Control high volume node",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "vp_poc",
    defaultRightLabel: "VP POC",
    defaultTimeframe: "1h",
  },

  // Volatility
  {
    id: "atr_filter",
    name: "ATR (14)",
    category: "VOLATILITY",
    description: "Average True Range volatility sizing",
    leftKey: "atr_14",
    leftLabel: "ATR (14)",
    defaultOp: ">",
    defaultRight: "atr_ma_20",
    defaultRightLabel: "ATR Baseline",
    defaultTimeframe: "15m",
  },
  {
    id: "bollinger_upper",
    name: "Bollinger Bands",
    category: "VOLATILITY",
    description: "2-standard deviation envelope",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "bb_upper",
    defaultRightLabel: "BB Upper Band",
    defaultTimeframe: "15m",
  },

  // Structure & Price Action
  {
    id: "prev_high_break",
    name: "Previous High Breakout",
    category: "STRUCTURE",
    description: "Price exceeding prior period peak",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: "crosses_above",
    defaultRight: "prev_high",
    defaultRightLabel: "Prior Period High",
    defaultTimeframe: "15m",
  },
  {
    id: "support_bounce",
    name: "Support / Resistance",
    category: "STRUCTURE",
    description: "Key horizontal pivot level rebound",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "pivot_s1",
    defaultRightLabel: "Pivot Support",
    defaultTimeframe: "1h",
  },
];

interface StrategyBuildLibraryProps {
  onAddRule: (target: RuleTargetStage, rule: StrategyIdeRule) => void;
  baseTimeframe: RuleTimeframe;
}

export function StrategyBuildLibrary({ onAddRule, baseTimeframe }: StrategyBuildLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [favorites, setFavorites] = useState<string[]>(["ema_cross", "rsi_14", "session_vwap", "volume_surge"]);
  const [activePromptIndicator, setActivePromptIndicator] = useState<IndicatorDefinition | null>(null);

  // Load / Save Favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quant_fav_indicators");
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch {
      // Ignore fallback
    }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("quant_fav_indicators", JSON.stringify(updated));
      } catch {
        // Fallback
      }
      return updated;
    });
  };

  const handleSelectTarget = (target: RuleTargetStage) => {
    if (!activePromptIndicator) return;
    const rule: StrategyIdeRule = {
      id: `rule-${target}-${Date.now()}`,
      timeframe: activePromptIndicator.defaultTimeframe || baseTimeframe,
      left: activePromptIndicator.leftKey,
      leftLabel: activePromptIndicator.leftLabel,
      op: activePromptIndicator.defaultOp,
      right: activePromptIndicator.defaultRight,
      rightLabel: activePromptIndicator.defaultRightLabel,
      category: activePromptIndicator.category as any,
      enabled: true,
      description: activePromptIndicator.description,
    };
    onAddRule(target, rule);
    setActivePromptIndicator(null);
  };

  const filteredCatalog = useMemo(() => {
    return INDICATOR_CATALOG.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.leftKey.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedCategory === "FAVORITES") return favorites.includes(item.id);
      if (selectedCategory === "ALL") return true;
      return item.category === selectedCategory;
    });
  }, [searchQuery, selectedCategory, favorites]);

  const CATEGORIES = [
    { id: "ALL", label: "All" },
    { id: "FAVORITES", label: `★ Favorites (${favorites.length})` },
    { id: "TREND", label: "Trend" },
    { id: "MOMENTUM", label: "Momentum" },
    { id: "VOLUME", label: "Volume" },
    { id: "VOLATILITY", label: "Volatility" },
    { id: "STRUCTURE", label: "Structure" },
  ];

  return (
    <aside className="w-full lg:w-72 bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 flex flex-col gap-3 shadow-xl text-xs font-sans select-none">
      
      {/* Header & Search */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#55C98A]" />
            <span>Indicator Catalog</span>
          </span>
          <span className="text-[10px] text-[#607D6E] font-mono">{INDICATOR_CATALOG.length} items</span>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 text-[#607D6E] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search indicators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#607D6E] focus:outline-none focus:border-[#55C98A] transition-all"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1 border-b border-[#142B21] pb-2.5">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                isSelected
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-sm"
                  : "text-[#8BA596] hover:text-white hover:bg-[#0C1713]"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Indicator List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 max-h-[580px] pr-1">
        {filteredCatalog.length === 0 ? (
          <div className="text-center py-8 text-[#607D6E] space-y-1">
            <p className="font-semibold">No indicators found</p>
            <p className="text-[10px]">Try adjusting your search or category</p>
          </div>
        ) : (
          filteredCatalog.map((item) => {
            const isFav = favorites.includes(item.id);
            return (
              <div
                key={item.id}
                className="bg-[#0C1713] hover:bg-[#10221A] border border-[#1A3127] hover:border-[#275841] rounded-xl p-2.5 transition-all space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">{item.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#060D0A] text-[#607D6E] font-mono">
                        {item.defaultTimeframe}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#8BA596] mt-0.5 leading-snug">{item.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(item.id, e)}
                    className={`p-1 rounded transition-colors ${
                      isFav ? "text-yellow-400" : "text-[#42584C] hover:text-[#8BA596]"
                    }`}
                    title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Star className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Single Primary Action: + Add Button */}
                <div className="flex items-center justify-between pt-1 border-t border-[#14271F]">
                  <span className="text-[10px] text-[#607D6E] font-mono">
                    {item.leftKey} {item.defaultOp} {item.defaultRight}
                  </span>

                  <button
                    type="button"
                    onClick={() => setActivePromptIndicator(item)}
                    className="px-2.5 py-1 rounded-lg bg-[#123C2A] hover:bg-[#194E37] text-[#55C98A] hover:text-white font-bold transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Target Stage Modal Prompt (Setup vs Confirmation vs Trigger) */}
      {activePromptIndicator && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-scaleUp">
            <div>
              <span className="text-[10px] text-[#55C98A] font-bold uppercase tracking-wider">Add to Strategy</span>
              <h3 className="text-sm font-bold text-white mt-0.5">{activePromptIndicator.name}</h3>
              <p className="text-xs text-[#8BA596] font-mono mt-1">
                {activePromptIndicator.leftLabel} {activePromptIndicator.defaultOp} {activePromptIndicator.defaultRightLabel} ({activePromptIndicator.defaultTimeframe})
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-[#8BA596] font-semibold">Select Destination Stage:</label>
              
              <button
                type="button"
                onClick={() => handleSelectTarget("setup")}
                className="w-full p-3 rounded-xl bg-[#0C1713] hover:bg-[#123C2A] border border-[#1A3127] hover:border-[#39B978] text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-white group-hover:text-[#55C98A] text-xs">1. Setup</span>
                  <p className="text-[10px] text-[#8BA596]">Market condition filter before looking for a trade</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#607D6E] group-hover:text-[#55C98A]" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTarget("confirmation")}
                className="w-full p-3 rounded-xl bg-[#0C1713] hover:bg-[#123C2A] border border-[#1A3127] hover:border-[#39B978] text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-white group-hover:text-[#55C98A] text-xs">2. Confirmation</span>
                  <p className="text-[10px] text-[#8BA596]">Momentum & volume filter confirming setup strength</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#607D6E] group-hover:text-[#55C98A]" />
              </button>

              <button
                type="button"
                onClick={() => handleSelectTarget("trigger")}
                className="w-full p-3 rounded-xl bg-[#0C1713] hover:bg-[#123C2A] border border-[#1A3127] hover:border-[#39B978] text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="font-bold text-white group-hover:text-[#55C98A] text-xs">3. Trigger</span>
                  <p className="text-[10px] text-[#8BA596]">Exact price/indicator crossover timing event</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#607D6E] group-hover:text-[#55C98A]" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActivePromptIndicator(null)}
              className="w-full py-2 rounded-xl bg-[#0C1713] text-[#8BA596] hover:text-white font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </aside>
  );
}
