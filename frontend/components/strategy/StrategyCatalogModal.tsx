"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  FolderOpen,
  Plus,
  Copy,
  Bot,
  Play,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Percent,
  BarChart2,
} from "lucide-react";
import { FullVisualStrategy } from "@/types/strategy-builder";

interface StrategyCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: any[];
  onLoadStrategy: (strat: any) => void;
  onDuplicateStrategy: (strat: any) => void;
  onAssignToBot: (stratName: string) => void;
}

export function StrategyCatalogModal({
  isOpen,
  onClose,
  catalog,
  onLoadStrategy,
  onDuplicateStrategy,
  onAssignToBot,
}: StrategyCatalogModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");

  if (!isOpen) return null;

  const filters = ["ALL", "TREND", "MOMENTUM", "OPTIONS", "FUTURES", "BREAKOUT"];

  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedFilter === "ALL") return true;
    if (selectedFilter === "TREND") return item.name?.toLowerCase().includes("trend") || item.name?.toLowerCase().includes("ema");
    if (selectedFilter === "OPTIONS") return item.direction === "OPTIONS_MULTI_LEG" || item.name?.toLowerCase().includes("condor");
    if (selectedFilter === "FUTURES") return item.direction === "FUTURES" || item.name?.toLowerCase().includes("perp");
    if (selectedFilter === "MOMENTUM") return item.name?.toLowerCase().includes("rsi") || item.name?.toLowerCase().includes("momentum");
    if (selectedFilter === "BREAKOUT") return item.name?.toLowerCase().includes("breakout") || item.name?.toLowerCase().includes("bb");
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none font-sans">
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1A2333] flex items-center justify-between bg-[#121927]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Quantitative Strategy Catalog
              </h3>
              <p className="text-xs text-slate-400">
                Browse, load, duplicate, or assign proven quantitative strategy templates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-[#1A2333] bg-[#0A0E17] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search strategies by name, rule, or indicator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#121927] border border-[#1E293B] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#121927] p-1 rounded-xl border border-[#1E293B] text-xs">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  selectedFilter === f
                    ? "bg-cyan-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
          {filteredCatalog.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No strategies found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCatalog.map((strat, idx) => (
                <div
                  key={strat.id || idx}
                  className="bg-[#121927] border border-[#1E293B] hover:border-cyan-500/40 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-white">{strat.name}</h4>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                          strat.target_signal === "BUY" || strat.direction === "LONG"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : strat.direction === "OPTIONS_MULTI_LEG"
                            ? "bg-purple-950 text-purple-400 border border-purple-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {strat.target_signal || strat.direction || "BUY"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {strat.description || "Quantitative multi-condition algorithmic strategy."}
                    </p>

                    {strat.compiled_expression && (
                      <div className="p-2 bg-[#0A0E17] rounded-lg text-[10px] font-mono text-cyan-400 break-words line-clamp-2">
                        {strat.compiled_expression}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <button
                      onClick={() => {
                        onLoadStrategy(strat);
                        onClose();
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-sm"
                    >
                      Load into Editor
                    </button>

                    <button
                      onClick={() => onDuplicateStrategy(strat)}
                      title="Clone Strategy"
                      className="p-1.5 rounded-lg bg-[#162032] hover:bg-[#1E2D44] text-slate-300 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        onAssignToBot(strat.name);
                        onClose();
                      }}
                      title="Assign to Active Bot"
                      className="px-2.5 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 font-bold transition-colors flex items-center gap-1"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>Assign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
