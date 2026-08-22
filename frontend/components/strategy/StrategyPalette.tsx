"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  TrendingUp,
  Activity,
  BarChart3,
  Waves,
  Zap,
  Shield,
  Layers,
  Percent,
  Sparkles,
} from "lucide-react";
import { StrategyPaletteItem, VisualRule } from "@/types/strategy-builder";
import { STRATEGY_PALETTE_ITEMS } from "./paletteData";

interface StrategyPaletteProps {
  onAddRule: (rule: Partial<VisualRule>, targetSection: "entry" | "exit" | "confirmation") => void;
}

export function StrategyPalette({ onAddRule }: StrategyPaletteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    MARKET: true,
    TREND: true,
    MOMENTUM: true,
    VOLATILITY: false,
    VOLUME: false,
    "PRICE ACTION": false,
    "MARKET STRUCTURE": false,
    OPTIONS: false,
    FUTURES: false,
    RISK: false,
  });

  const categories = [
    { name: "MARKET", icon: BarChart3, color: "text-emerald-400" },
    { name: "TREND", icon: TrendingUp, color: "text-cyan-400" },
    { name: "MOMENTUM", icon: Activity, color: "text-purple-400" },
    { name: "VOLATILITY", icon: Waves, color: "text-blue-400" },
    { name: "VOLUME", icon: BarChart3, color: "text-amber-400" },
    { name: "PRICE ACTION", icon: Zap, color: "text-rose-400" },
    { name: "MARKET STRUCTURE", icon: Layers, color: "text-indigo-400" },
    { name: "OPTIONS", icon: Percent, color: "text-violet-400" },
    { name: "FUTURES", icon: Shield, color: "text-teal-400" },
    { name: "RISK", icon: Shield, color: "text-red-400" },
  ];

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return STRATEGY_PALETTE_ITEMS;
    const term = searchTerm.toLowerCase();
    return STRATEGY_PALETTE_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.defaultLeft.toLowerCase().includes(term) ||
        item.tooltip.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const handleQuickAdd = (item: StrategyPaletteItem, section: "entry" | "exit" | "confirmation") => {
    onAddRule(
      {
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        left: item.defaultLeft,
        leftLabel: item.label,
        timeframe: item.defaultTimeframe,
        op: item.defaultOp,
        right: item.defaultRight,
        rightLabel: item.defaultRight,
        enabled: true,
        category: item.category,
        description: item.tooltip,
      },
      section
    );
  };

  return (
    <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 flex flex-col h-full space-y-3 font-sans select-none shadow-xl">
      {/* Palette Header & Search */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Component Palette
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            {filteredItems.length} Rules
          </span>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search indicators, price, risk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#121927] border border-[#1E293B] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Accordion Categories List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[640px]">
        {categories.map((cat) => {
          const itemsInCat = filteredItems.filter((i) => i.category === cat.name);
          if (itemsInCat.length === 0) return null;

          const isExpanded = expandedCategories[cat.name] || searchTerm.trim().length > 0;
          const Icon = cat.icon;

          return (
            <div key={cat.name} className="border border-[#1E293B] rounded-xl overflow-hidden bg-[#121927]/60">
              <button
                onClick={() => toggleCategory(cat.name)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-300 hover:bg-[#162032] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${cat.color}`} />
                  <span>{cat.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-mono">({itemsInCat.length})</span>
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="p-2 space-y-1.5 border-t border-[#1E293B] bg-[#0A0E17]/40">
                  {itemsInCat.map((item) => (
                    <div
                      key={item.id}
                      className="group p-2 rounded-lg bg-[#121927] hover:bg-[#162032] border border-[#1E293B] hover:border-cyan-500/40 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-800 text-slate-400">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{item.tooltip}</p>
                        </div>
                      </div>

                      {/* Formula Preview & Add Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                        <span className="font-mono text-cyan-400/80">
                          {item.defaultLeft} {item.defaultOp} {item.defaultRight}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleQuickAdd(item, "entry")}
                            title="Add to Entry Conditions"
                            className="px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 text-[10px] font-bold font-mono transition-colors"
                          >
                            +Entry
                          </button>
                          <button
                            onClick={() => handleQuickAdd(item, "confirmation")}
                            title="Add to Confirmation Filter"
                            className="px-1.5 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 text-[10px] font-bold font-mono transition-colors"
                          >
                            +Confirm
                          </button>
                          <button
                            onClick={() => handleQuickAdd(item, "exit")}
                            title="Add to Exit Conditions"
                            className="px-1.5 py-0.5 rounded bg-red-950/80 hover:bg-red-900 text-red-400 border border-red-800 text-[10px] font-bold font-mono transition-colors"
                          >
                            +Exit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
