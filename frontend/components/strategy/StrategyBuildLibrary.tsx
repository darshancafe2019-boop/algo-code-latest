"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  BarChart2,
  Zap,
  Shield,
  Layers,
  Plus,
  Sparkles,
  Target,
  Clock,
} from "lucide-react";
import { StrategyIdeRule, RuleTimeframe } from "@/types/strategy-ide";

interface LibraryItem {
  id: string;
  name: string;
  category: "PRICE" | "TREND" | "MOMENTUM" | "VOLATILITY" | "VOLUME" | "STRUCTURE" | "RISK";
  leftKey: string;
  leftLabel: string;
  defaultOp: string;
  defaultRight: string;
  defaultRightLabel: string;
  defaultTimeframe: RuleTimeframe;
  description: string;
  favorite?: boolean;
}

const LIBRARY_CATALOG: LibraryItem[] = [
  // Price
  {
    id: "lib-close-price",
    name: "Close Price",
    category: "PRICE",
    leftKey: "close",
    leftLabel: "Close Price",
    defaultOp: ">",
    defaultRight: "ema_200",
    defaultRightLabel: "EMA 200",
    defaultTimeframe: "15m",
    description: "Current candle closing price against moving benchmark",
    favorite: true,
  },
  {
    id: "lib-session-vwap",
    name: "Session VWAP",
    category: "PRICE",
    leftKey: "close",
    leftLabel: "Close Price",
    defaultOp: ">",
    defaultRight: "vwap",
    defaultRightLabel: "VWAP",
    defaultTimeframe: "15m",
    description: "Volume-weighted average price benchmark",
    favorite: true,
  },

  // Trend
  {
    id: "lib-ema-9-21",
    name: "EMA 9 / 21 Crossover",
    category: "TREND",
    leftKey: "ema_9",
    leftLabel: "EMA 9",
    defaultOp: "crosses_above",
    defaultRight: "ema_21",
    defaultRightLabel: "EMA 21",
    defaultTimeframe: "15m",
    description: "Fast momentum timing trend trigger",
    favorite: true,
  },
  {
    id: "lib-ema-50",
    name: "EMA 50 Intermediate",
    category: "TREND",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "ema_50",
    defaultRightLabel: "EMA 50",
    defaultTimeframe: "1h",
    description: "Medium-term trend direction filter",
  },
  {
    id: "lib-ema-200",
    name: "EMA 200 Macro Baseline",
    category: "TREND",
    leftKey: "close",
    leftLabel: "1H Close",
    defaultOp: ">",
    defaultRight: "ema_200",
    defaultRightLabel: "1H EMA 200",
    defaultTimeframe: "1h",
    description: "Macro bull/bear institutional regime baseline",
    favorite: true,
  },
  {
    id: "lib-supertrend",
    name: "Supertrend (10, 3)",
    category: "TREND",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "supertrend",
    defaultRightLabel: "Supertrend",
    defaultTimeframe: "15m",
    description: "ATR-based dynamic trailing trend boundary",
    favorite: true,
  },

  // Momentum
  {
    id: "lib-rsi-14",
    name: "RSI Momentum (14)",
    category: "MOMENTUM",
    leftKey: "rsi_14",
    leftLabel: "RSI (14)",
    defaultOp: ">",
    defaultRight: "50",
    defaultRightLabel: "50.0",
    defaultTimeframe: "15m",
    description: "Relative Strength Index momentum center line (>50 bull)",
    favorite: true,
  },
  {
    id: "lib-rsi-oversold",
    name: "RSI Oversold Bounce",
    category: "MOMENTUM",
    leftKey: "rsi_14",
    leftLabel: "RSI (14)",
    defaultOp: "<",
    defaultRight: "30",
    defaultRightLabel: "30.0",
    defaultTimeframe: "5m",
    description: "Mean reversion oversold dip condition",
  },
  {
    id: "lib-macd-cross",
    name: "MACD Signal Line Cross",
    category: "MOMENTUM",
    leftKey: "macd_line",
    leftLabel: "MACD Line",
    defaultOp: ">",
    defaultRight: "macd_signal",
    defaultRightLabel: "MACD Signal",
    defaultTimeframe: "15m",
    description: "MACD 12/26/9 line crossover confirmation",
    favorite: true,
  },
  {
    id: "lib-adx-strength",
    name: "ADX Trend Strength (14)",
    category: "MOMENTUM",
    leftKey: "adx_14",
    leftLabel: "ADX (14)",
    defaultOp: ">=",
    defaultRight: "25",
    defaultRightLabel: "25.0",
    defaultTimeframe: "15m",
    description: "Trend velocity and strength filter (>25 trending)",
  },

  // Volatility
  {
    id: "lib-bb-lower",
    name: "Bollinger Lower Band",
    category: "VOLATILITY",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: "<=",
    defaultRight: "bb_lower",
    defaultRightLabel: "BB Lower",
    defaultTimeframe: "15m",
    description: "2.0 standard deviation oversold mean-reversion boundary",
  },
  {
    id: "lib-bb-upper",
    name: "Bollinger Upper Band",
    category: "VOLATILITY",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">=",
    defaultRight: "bb_upper",
    defaultRightLabel: "BB Upper",
    defaultTimeframe: "15m",
    description: "Upper volatility envelope breakout / target",
  },
  {
    id: "lib-atr-expansion",
    name: "ATR Volatility Buffer",
    category: "VOLATILITY",
    leftKey: "atr_14",
    leftLabel: "ATR (14)",
    defaultOp: ">",
    defaultRight: "atr_sma",
    defaultRightLabel: "ATR SMA",
    defaultTimeframe: "15m",
    description: "Detects explosive volatility expansion",
  },

  // Volume & Structure
  {
    id: "lib-vp-vah",
    name: "Volume Profile VAH",
    category: "VOLUME",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: ">",
    defaultRight: "vah",
    defaultRightLabel: "VAH (70%)",
    defaultTimeframe: "1h",
    description: "Value Area High breakout confirmation",
  },
  {
    id: "lib-vp-val",
    name: "Volume Profile VAL",
    category: "VOLUME",
    leftKey: "close",
    leftLabel: "Close",
    defaultOp: "<",
    defaultRight: "val",
    defaultRightLabel: "VAL (70%)",
    defaultTimeframe: "1h",
    description: "Value Area Low rejection support condition",
  },
  {
    id: "lib-volume-surge",
    name: "Volume 1.5x Spike",
    category: "VOLUME",
    leftKey: "volume",
    leftLabel: "Volume",
    defaultOp: ">",
    defaultRight: "vol_sma_20",
    defaultRightLabel: "1.5x Vol Avg",
    defaultTimeframe: "15m",
    description: "Institutional volume participation confirmation",
  },
];

interface StrategyBuildLibraryProps {
  onAddRuleToGroup: (
    targetGroup: "setup" | "confirmation" | "trigger",
    rule: StrategyIdeRule
  ) => void;
  baseTimeframe: RuleTimeframe;
}

export function StrategyBuildLibrary({
  onAddRuleToGroup,
  baseTimeframe,
}: StrategyBuildLibraryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = ["ALL", "PRICE", "TREND", "MOMENTUM", "VOLATILITY", "VOLUME"];

  const filteredItems = useMemo(() => {
    return LIBRARY_CATALOG.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.leftKey.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const handleAdd = (item: LibraryItem, group: "setup" | "confirmation" | "trigger") => {
    const newRule: StrategyIdeRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timeframe: group === "setup" ? "1h" : baseTimeframe,
      left: item.leftKey,
      leftLabel: item.leftLabel,
      op: item.defaultOp,
      right: item.defaultRight,
      rightLabel: item.defaultRightLabel,
      category: item.category,
      enabled: true,
      description: item.description,
    };
    onAddRuleToGroup(group, newRule);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[#0B131E] border border-[#1E293B] rounded-2xl flex flex-col items-center py-4 gap-4 transition-all shadow-xl">
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Component Library"
          className="p-2 rounded-xl bg-[#111C2E] text-slate-300 hover:text-cyan-400 hover:bg-[#18263E] transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="writing-vertical text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" />
          <span>Library</span>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-full lg:w-80 bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-2xl transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#172234] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Indicator & Rule Palette
            </h3>
            <p className="text-[10px] text-slate-400">Add to Setup, Confirm or Trigger</p>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          title="Collapse Sidebar"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#111C2E] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search indicators, EMAs, RSI..."
          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#070D14] border border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-0.5 rounded-md font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-cyan-600 text-white shadow-sm"
                : "bg-[#070D14] text-slate-400 hover:text-slate-200 hover:bg-[#111C2E]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List of Library Items */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px] scrollbar-thin scrollbar-thumb-slate-800">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group p-2.5 rounded-xl bg-[#070D14] hover:bg-[#0D1826] border border-[#172234] hover:border-cyan-800/60 transition-all space-y-1.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-200">{item.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                    {item.category}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{item.description}</p>
              </div>
            </div>

            {/* Quick Add Buttons to Groups */}
            <div className="flex items-center justify-between pt-1 border-t border-[#131E2E] gap-1">
              <span className="text-[9px] text-slate-500 font-mono">
                {item.leftKey} {item.defaultOp} {item.defaultRight}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAdd(item, "setup")}
                  title="Add to Macro Setup"
                  className="px-1.5 py-0.5 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 text-[9px] font-bold border border-blue-800 transition-colors"
                >
                  + Setup
                </button>
                <button
                  onClick={() => handleAdd(item, "confirmation")}
                  title="Add to Confirmation"
                  className="px-1.5 py-0.5 rounded bg-amber-950 hover:bg-amber-900 text-amber-300 text-[9px] font-bold border border-amber-800 transition-colors"
                >
                  + Confirm
                </button>
                <button
                  onClick={() => handleAdd(item, "trigger")}
                  title="Add to Timing Trigger"
                  className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[9px] font-bold border border-emerald-800 transition-colors"
                >
                  + Trigger
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="p-4 text-center text-slate-500 text-xs">
            No indicators match &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </aside>
  );
}
