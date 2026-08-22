"use client";

import React from "react";
import { Search, Filter, Download, X, RefreshCw, Layers } from "lucide-react";

interface RiskFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeDecision: string;
  onDecisionChange: (dec: string) => void;
  activeSeverity: string;
  onSeverityChange: (sev: string) => void;
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  accountMode: string;
  onAccountModeChange: (mode: string) => void;
  onRefresh: () => void;
  onExport: (format: "csv" | "json") => void;
}

export function RiskFilterBar({
  searchQuery,
  onSearchChange,
  activeDecision,
  onDecisionChange,
  activeSeverity,
  onSeverityChange,
  activeCategory,
  onCategoryChange,
  accountMode,
  onAccountModeChange,
  onRefresh,
  onExport,
}: RiskFilterBarProps) {
  const decisionFilters = [
    { id: "ALL", label: "All Decisions" },
    { id: "APPROVED", label: "Approved" },
    { id: "BLOCKED", label: "Blocked" },
    { id: "APPROVED_WITH_WARNING", label: "Warnings" },
    { id: "OVERRIDDEN", label: "Overrides" },
  ];

  const categories = [
    "ALL",
    "PRE_TRADE",
    "CONCENTRATION",
    "POSITION_SIZE",
    "MARGIN",
    "LEVERAGE",
    "DAILY_LOSS",
    "MARKET_DATA",
    "KILL_SWITCH",
    "PORTFOLIO",
  ];

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3.5 shadow-xl select-none font-sans space-y-3">
      {/* 1. Top Search Bar & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search risk event ID, symbol, bot, gate, explanation, or policy (e.g. RISK-10942, BTC, CONCENTRATION)..."
            className="w-full bg-[#070D14] border border-[#1E293B] rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => onExport("csv")}
            className="px-3 py-2 rounded-xl bg-[#070D14] border border-[#1E293B] hover:border-cyan-700 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
            title="Download Risk Decision Ledger as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => onExport("json")}
            className="px-3 py-2 rounded-xl bg-[#070D14] border border-[#1E293B] hover:border-purple-700 text-slate-300 hover:text-purple-300 transition-colors flex items-center gap-1.5"
            title="Download Risk Decision Ledger as JSON"
          >
            <Download className="h-3.5 w-3.5" />
            <span>JSON</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-[#070D14] border border-[#1E293B] hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Decision Pills & Category / Mode Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#1E293B]/60 text-xs font-mono">
        {/* Decision Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {decisionFilters.map((df) => (
            <button
              key={df.id}
              onClick={() => onDecisionChange(df.id)}
              className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeDecision === df.id
                  ? df.id === "BLOCKED"
                    ? "bg-rose-950 text-rose-300 border border-rose-800 shadow-md"
                    : df.id === "APPROVED"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-md"
                    : df.id === "APPROVED_WITH_WARNING"
                    ? "bg-amber-950 text-amber-300 border border-amber-800 shadow-md"
                    : "bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-md"
                  : "text-slate-400 hover:text-slate-100 bg-[#070D14] border border-[#1E293B] hover:border-slate-700"
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Category & Account Mode Controls */}
        <div className="flex items-center gap-2">
          {/* Account Mode */}
          <div className="flex items-center gap-1 bg-[#070D14] border border-[#1E293B] rounded-xl p-1">
            {["ALL", "PAPER", "LIVE"].map((mode) => (
              <button
                key={mode}
                onClick={() => onAccountModeChange(mode)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                  accountMode === mode
                    ? mode === "LIVE"
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={activeCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-[#070D14] border border-[#1E293B] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All Categories" : c.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
