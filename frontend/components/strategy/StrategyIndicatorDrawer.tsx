"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Star,
  Plus,
  X,
  TrendingUp,
  Activity,
  Zap,
  Layers,
  Percent,
  Coins,
  DollarSign,
  Sparkles,
  Shield,
  BarChart2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { StrategyIdeRule, RuleTimeframe } from "@/types/strategy-ide";
import { STRATEGY_PALETTE_ITEMS } from "./paletteData";
import { RuleTargetStage } from "./StrategyBuildLibrary";

interface StrategyIndicatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetStage: RuleTargetStage;
  baseTimeframe: RuleTimeframe;
  onAddRule: (target: RuleTargetStage, rule: StrategyIdeRule) => void;
}

const CATEGORY_TABS = [
  { id: "FAVORITES", label: "Favorites", icon: Star },
  { id: "ALL", label: "All Indicators", icon: Sparkles },
  { id: "TREND", label: "Trend", icon: TrendingUp },
  { id: "MOMENTUM", label: "Momentum", icon: Activity },
  { id: "VOLATILITY", label: "Volatility", icon: Shield },
  { id: "VOLUME", label: "Volume", icon: BarChart2 },
  { id: "MARKET", label: "Price Action", icon: Zap },
  { id: "OPTIONS", label: "Options & Greeks", icon: Layers },
];

export function StrategyIndicatorDrawer({
  isOpen,
  onClose,
  targetStage,
  baseTimeframe = "15m",
  onAddRule,
}: StrategyIndicatorDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedTimeframe, setSelectedTimeframe] = useState<RuleTimeframe>(baseTimeframe);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    price_vwap: true,
    ema_9_21: true,
    ema_200_trend: true,
    rsi_bullish_55: true,
    supertrend_bullish: true,
    atr_vol_filter: true,
    bb_lower_bounce: true,
    volume_surge: true,
    oi_rising: true,
  });

  const stageLabel =
    targetStage === "setup"
      ? "1. Setup Condition"
      : targetStage === "confirmation"
      ? "2. Confirmation Indicator"
      : "3. Entry Trigger";

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = useMemo(() => {
    return STRATEGY_PALETTE_ITEMS.filter((item) => {
      const matchesSearch =
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tooltip && item.tooltip.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.defaultLeft.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.defaultRight.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === "FAVORITES") {
        return !!favorites[item.id];
      }
      if (activeCategory === "ALL") {
        return true;
      }
      if (activeCategory === "OPTIONS") {
        return item.category === "OPTIONS" || item.category === "GREEKS";
      }
      return item.category === activeCategory;
    });
  }, [searchQuery, activeCategory, favorites]);

  const handleSelectItem = (item: (typeof STRATEGY_PALETTE_ITEMS)[0]) => {
    const tf = selectedTimeframe || item.defaultTimeframe || baseTimeframe;
    const rule: StrategyIdeRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timeframe: tf as RuleTimeframe,
      left: item.defaultLeft,
      leftLabel: `${tf.toUpperCase()} ${item.label}`,
      op: item.defaultOp as any,
      right: item.defaultRight,
      rightLabel: item.defaultRight,
      category: (item.category as any) || "TREND",
      enabled: true,
      description: item.tooltip || item.label,
    };
    onAddRule(targetStage, rule);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans text-slate-200 text-xs">
      <div className="w-full max-w-lg bg-[#0A1422] border-l border-[#12304A] shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
        {/* 1. Header Bar */}
        <div className="p-4 border-b border-[#12304A] bg-[#0C1727] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {stageLabel}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Select to Add</span>
            </div>
            <h3 className="font-bold text-sm text-white mt-1">Indicator & Condition Library</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Search & Timeframe Bar */}
        <div className="p-3.5 border-b border-[#12304A] bg-[#081220] space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search indicators, oscillators, volume, levels (e.g. RSI, EMA, VWAP)..."
              className="w-full bg-[#06101B] border border-[#12304A] focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-white font-mono text-xs outline-none placeholder:text-slate-600 transition"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Timeframe Presets */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Rule Timeframe:</span>
            <div className="flex items-center gap-1">
              {(["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"] as RuleTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                    selectedTimeframe === tf
                      ? "bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-sm"
                      : "bg-[#06101B] text-slate-400 border-[#12304A] hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_TABS.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono whitespace-nowrap transition flex items-center gap-1.5 border ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                      : "bg-[#06101B] text-slate-400 border-[#12304A] hover:text-slate-200 hover:bg-[#0C1727]"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${cat.id === "FAVORITES" ? "text-amber-400" : ""}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Filtered Indicator List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 font-mono">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <p>No indicators match &quot;{searchQuery}&quot;</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("ALL");
                }}
                className="text-cyan-400 hover:underline text-[11px]"
              >
                Clear search filters
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isFav = !!favorites[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="group p-3 rounded-xl bg-[#06101B] hover:bg-[#0C1727] border border-[#12304A] hover:border-cyan-500/50 transition flex items-center justify-between gap-3 cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-cyan-300 transition text-xs truncate">
                        {item.label}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        {item.category}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      <span className="text-cyan-400 font-semibold">{item.defaultLeft}</span>{" "}
                      <span className="text-slate-500 font-bold">{item.defaultOp}</span>{" "}
                      <span className="text-amber-400 font-semibold">{item.defaultRight}</span>
                    </div>
                    {item.tooltip && (
                      <p className="text-[9px] text-slate-500 font-sans truncate">{item.tooltip}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className={`p-1.5 rounded-lg transition ${
                        isFav ? "text-amber-400 hover:text-amber-300" : "text-slate-600 hover:text-slate-400"
                      }`}
                      title={isFav ? "Remove favorite" : "Add to favorites"}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? "fill-amber-400" : ""}`} />
                    </button>
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500 group-hover:text-slate-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center transition shadow-sm">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Footer info */}
        <div className="p-3 border-t border-[#12304A] bg-[#0A1422] flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>{filteredItems.length} available items</span>
          <span>Click any card to add instantly</span>
        </div>
      </div>
    </div>
  );
}
