"use client";

import React from "react";
import {
  Search,
  Sliders,
  Filter,
  Bookmark,
  Star,
  Flame,
  Globe,
  TrendingUp,
  Activity,
  Layers,
  X
} from "lucide-react";

interface MarketCategoryNavigationProps {
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function MarketCategoryNavigation({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}: MarketCategoryNavigationProps) {
  const categories = [
    { id: "ALL", label: "All Markets" },
    { id: "WATCHLISTS", label: "My Watchlists" },
    { id: "CRYPTO", label: "Crypto" },
    { id: "INDIA", label: "Indian Indices" },
    { id: "GLOBAL INDICES", label: "Global Indices" },
    { id: "STOCKS", label: "Equities" },
    { id: "FOREX", label: "Forex" },
    { id: "COMMODITIES", label: "Commodities" },
    { id: "OPTIONS", label: "Options Chains" },
    { id: "FUTURES", label: "Futures Hub" },
    { id: "TOP MOVERS", label: "Top Movers" },
    { id: "HEATMAP", label: "Heatmap" },
    { id: "SCANNER", label: "Scanners" },
  ];

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3.5 shadow-xl select-none font-sans space-y-3">
      {/* 1. Global Search Input Bar */}
      <div className="relative flex-1">
        <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Universal search: symbol, company, ISIN, strike, futures (e.g. BTC, RELIANCE, NIFTY 25000 CE, AAPL, XAUUSD)..."
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

      {/* 2. Category Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 text-xs font-mono">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
              activeCategory === cat.id
                ? "bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-md"
                : "text-slate-400 hover:text-slate-100 bg-[#070D14] border border-[#1E293B] hover:border-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
