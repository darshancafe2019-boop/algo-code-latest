"use client";

import React, { useState } from "react";
import { Search, Filter, ChevronDown, Check } from "lucide-react";

interface SimpleBotFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  selectedMarket: string;
  onSelectMarket: (market: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  envFilter: string;
  onEnvFilterChange: (env: string) => void;
  showingCount: number;
  totalCount: number;
}

const PRIMARY_MARKETS = [
  { id: "ALL", label: "All Markets" },
  { id: "CRYPTO", label: "Crypto" },
  { id: "INDIAN_STOCKS", label: "India" },
  { id: "FUTURES", label: "Futures" },
  { id: "OPTIONS", label: "Options" },
];

const MORE_MARKETS = [
  { id: "FOREX", label: "Forex" },
  { id: "COMMODITIES", label: "Commodities" },
  { id: "US_EQUITY", label: "US Stocks" },
];

export function SimpleBotFilterBar({
  search,
  onSearchChange,
  selectedMarket,
  onSelectMarket,
  statusFilter,
  onStatusFilterChange,
  envFilter,
  onEnvFilterChange,
  showingCount,
  totalCount,
}: SimpleBotFilterBarProps) {
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const isMoreSelected = MORE_MARKETS.some((m) => m.id === selectedMarket);
  const activeMoreLabel = MORE_MARKETS.find((m) => m.id === selectedMarket)?.label;

  return (
    <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-xl font-mono text-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search bot name, symbol, strategy..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-white text-xs focus:outline-none placeholder:text-slate-500 font-sans"
          />
        </div>

        {/* Market Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRIMARY_MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onSelectMarket(m.id);
                setShowMoreDropdown(false);
              }}
              className={`px-3 py-1 rounded-lg font-bold transition border text-[11px] ${
                selectedMarket === m.id && !isMoreSelected
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}

          {/* More Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreDropdown(!showMoreDropdown)}
              className={`px-2.5 py-1 rounded-lg font-bold transition border text-[11px] flex items-center gap-1 ${
                isMoreSelected
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <span>{isMoreSelected ? activeMoreLabel : "More"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showMoreDropdown && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 py-1 font-sans text-xs">
                {MORE_MARKETS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectMarket(m.id);
                      setShowMoreDropdown(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between"
                  >
                    <span>{m.label}</span>
                    {selectedMarket === m.id && <Check className="w-3 h-3 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`p-1.5 rounded-lg border transition ${
              showFilterDrawer || statusFilter !== "ALL" || envFilter !== "ALL"
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Fine-grained Filters"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Filter Drawer */}
      {showFilterDrawer && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] animate-in fade-in duration-150">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Status Pills */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-sans mr-1">Status:</span>
              {(["ALL", "RUNNING", "PAUSED", "STOPPED", "ERROR"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => onStatusFilterChange(st)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    statusFilter === st
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Environment Pills */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-sans mr-1">Mode:</span>
              {(["ALL", "PAPER", "LIVE"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => onEnvFilterChange(env)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    envFilter === env
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          <div className="text-slate-500 font-sans text-[11px]">
            Showing <strong className="text-white font-mono">{showingCount}</strong> of <strong className="text-white font-mono">{totalCount}</strong> bots
          </div>
        </div>
      )}
    </div>
  );
}
