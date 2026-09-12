"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Star,
  Plus,
  Sliders,
  Folder,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Activity,
  Zap,
  Layers,
  Percent,
  Coins,
  DollarSign,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { StrategyIdeRule, RuleTimeframe } from "@/types/strategy-ide";
import { STRATEGY_PALETTE_ITEMS } from "./paletteData";

export type RuleTargetStage = "setup" | "confirmation" | "trigger";

interface StrategyBuildLibraryProps {
  onAddRule: (target: RuleTargetStage, rule: StrategyIdeRule) => void;
  baseTimeframe?: RuleTimeframe;
}

const CATEGORY_TABS = [
  { id: "ALL", label: "ALL" },
  { id: "TREND", label: "TREND" },
  { id: "MOMENTUM", label: "MOMENTUM" },
  { id: "VOLATILITY", label: "VOLATILITY" },
  { id: "VOLUME", label: "VOLUME" },
  { id: "STRUCTURE", label: "PRICE ACTION" },
  { id: "DERIVATIVES", label: "OPEN INTEREST" },
  { id: "OPTIONS", label: "OPTIONS" },
  { id: "GREEKS", label: "GREEKS" },
  { id: "FUNDING", label: "FUNDING" },
  { id: "CUSTOM", label: "CUSTOM" },
];

const FOLDERS = [
  { id: "favs", name: "Favorites", icon: Star, color: "text-[#F59E0B]" },
  { id: "trend_f", name: "Trend Systems", icon: TrendingUp, color: "text-[#22D3EE]" },
  { id: "momentum_f", name: "Momentum", icon: Activity, color: "text-[#168BFF]" },
  { id: "options_f", name: "Options & Greeks", icon: Layers, color: "text-[#A78BFA]" },
  { id: "crypto_f", name: "Crypto Derivatives", icon: Coins, color: "text-[#00E89A]" },
  { id: "saved_rules", name: "Saved Rules", icon: Bookmark, color: "text-[#7D8EA5]" },
  { id: "templates_f", name: "My Templates", icon: Folder, color: "text-[#7D8EA5]" },
];

export function StrategyBuildLibrary({
  onAddRule,
  baseTimeframe = "15m",
}: StrategyBuildLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({
    price_vwap: true,
    ema_9_21: true,
    ema_200_trend: true,
    rsi_bullish_55: true,
    oi_rising: true,
  });
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [selectedItemForAdd, setSelectedItemForAdd] = useState<string | null>(null);
  const [customTimeframe, setCustomTimeframe] = useState<RuleTimeframe>(baseTimeframe);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredItems = useMemo(() => {
    return STRATEGY_PALETTE_ITEMS.filter((item) => {
      // Search match
      const matchesSearch =
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tooltip && item.tooltip.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Folder match
      if (activeFolder === "favs") {
        return !!favorites[item.id];
      }
      if (activeFolder === "trend_f") {
        return item.category === "TREND";
      }
      if (activeFolder === "momentum_f") {
        return item.category === "MOMENTUM";
      }
      if (activeFolder === "options_f") {
        return item.category === "OPTIONS" || item.category === "GREEKS";
      }
      if (activeFolder === "crypto_f") {
        return item.category === "DERIVATIVES" || item.category === "FUNDING";
      }

      // Tab match
      if (activeTab === "ALL") return true;
      if (activeTab === "PRICE ACTION") return item.category === "STRUCTURE";
      if (activeTab === "OPEN INTEREST") return item.category === "DERIVATIVES";
      return item.category === activeTab;
    });
  }, [searchQuery, activeTab, activeFolder, favorites]);

  const handleAddDirectly = (target: RuleTargetStage, item: (typeof STRATEGY_PALETTE_ITEMS)[0]) => {
    const newRule: StrategyIdeRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timeframe: customTimeframe || item.defaultTimeframe || baseTimeframe,
      left: item.defaultLeft,
      leftLabel: item.label,
      op: item.defaultOp,
      right: item.defaultRight,
      rightLabel: item.defaultRight,
      category: item.category as any,
      enabled: true,
      description: item.tooltip,
      logicConnector: "AND",
    };
    onAddRule(target, newRule);
    setSelectedItemForAdd(null);
  };

  return (
    <aside className="w-full lg:w-[240px] bg-[#0A1422] border border-[#12304A] rounded-xl flex flex-col shadow-sm text-xs font-sans select-none shrink-0 overflow-hidden h-[calc(100vh-140px)] sticky top-4">
      {/* 1. Header */}
      <div className="p-3 border-b border-[#12304A] bg-[#07111F] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-[#22D3EE]" />
            <h2 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">STRATEGY COMPONENTS</h2>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#12304A] text-[#7D8EA5] font-mono font-bold">
            {filteredItems.length}
          </span>
        </div>

        {/* Search Field */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-[#7D8EA5] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search indicators, greeks, rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-8 pr-2.5 bg-[#0A1422] border border-[#12304A] rounded-lg text-[11px] text-[#F8FAFC] placeholder:text-[#7D8EA5] focus:outline-none focus:border-[#22D3EE] transition-colors font-sans"
          />
        </div>
      </div>

      {/* 2. Folders / Favorites Strip */}
      <div className="px-2.5 py-2 border-b border-[#12304A] bg-[#07111F]/50">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
          <button
            type="button"
            onClick={() => setActiveFolder(null)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all whitespace-nowrap ${
              activeFolder === null
                ? "bg-[#168BFF] text-white"
                : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
            }`}
          >
            All Folders
          </button>
          {FOLDERS.map((f) => {
            const Icon = f.icon;
            const isSelected = activeFolder === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFolder(isSelected ? null : f.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 whitespace-nowrap ${
                  isSelected
                    ? "bg-[#168BFF] text-white"
                    : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
                }`}
              >
                <Icon className={`h-2.5 w-2.5 ${isSelected ? "text-white" : f.color}`} />
                <span>{f.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Category Tabs (Compact horizontal scroll) */}
      <div className="px-2.5 py-1.5 border-b border-[#12304A] bg-[#0A1422] overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveFolder(null);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/50"
                    : "bg-[#0C1727] text-[#7D8EA5] hover:text-[#F8FAFC] border border-[#12304A]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Component List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-[#7D8EA5] text-[11px] font-mono">
            No components match your search.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isFav = !!favorites[item.id];
            const isExpanded = selectedItemForAdd === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-lg border transition-all p-2 text-xs font-sans ${
                  isExpanded
                    ? "bg-[#0C1727] border-[#22D3EE]/50 shadow-sm"
                    : "bg-[#0C1727] border-[#12304A] hover:border-[#1A3E61] hover:bg-[#0F1C2F]"
                }`}
              >
                <div
                  className="flex items-start justify-between gap-1.5 cursor-pointer"
                  onClick={() => setSelectedItemForAdd(isExpanded ? null : item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#F8FAFC] text-[11px] leading-tight truncate">
                        {item.label}
                      </span>
                    </div>
                    {item.tooltip && (
                      <p className="text-[10px] text-[#7D8EA5] line-clamp-1 mt-0.5">
                        {item.tooltip}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className={`p-1 rounded transition-colors ${
                        isFav ? "text-[#F59E0B]" : "text-[#7D8EA5] hover:text-[#F8FAFC]"
                      }`}
                      title={isFav ? "Remove favorite" : "Add to favorites"}
                    >
                      <Star className={`h-3 w-3 ${isFav ? "fill-[#F59E0B]" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedItemForAdd(isExpanded ? null : item.id)}
                      className="p-1 rounded bg-[#0A1422] border border-[#12304A] text-[#22D3EE] hover:bg-[#22D3EE]/10"
                      title="Add rule to stage"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Quick Add Stage Target Selector */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-[#12304A] space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#7D8EA5]">
                      <span>Select Target Stage:</span>
                      <select
                        value={customTimeframe}
                        onChange={(e) => setCustomTimeframe(e.target.value as RuleTimeframe)}
                        className="bg-[#0A1422] border border-[#12304A] rounded px-1 text-[10px] text-[#22D3EE]"
                      >
                        <option value="1m">1m</option>
                        <option value="3m">3m</option>
                        <option value="5m">5m</option>
                        <option value="15m">15m</option>
                        <option value="30m">30m</option>
                        <option value="1h">1h</option>
                        <option value="4h">4h</option>
                        <option value="1d">1d</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono font-bold">
                      <button
                        type="button"
                        onClick={() => handleAddDirectly("setup", item)}
                        className="py-1 px-1.5 rounded bg-[#168BFF]/15 hover:bg-[#168BFF]/30 text-[#168BFF] border border-[#168BFF]/40 text-center transition-colors cursor-pointer"
                      >
                        + Setup
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDirectly("confirmation", item)}
                        className="py-1 px-1.5 rounded bg-[#22D3EE]/15 hover:bg-[#22D3EE]/30 text-[#22D3EE] border border-[#22D3EE]/40 text-center transition-colors cursor-pointer"
                      >
                        + Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDirectly("trigger", item)}
                        className="py-1 px-1.5 rounded bg-[#00E89A]/15 hover:bg-[#00E89A]/30 text-[#00E89A] border border-[#00E89A]/40 text-center transition-colors cursor-pointer"
                      >
                        + Trigger
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
