"use client";

import React, { memo } from "react";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import { MarketTickerItem, MarketCategoryFilter } from "@/types/portfolio-intelligence";

interface MarketTickerStripProps {
  tickers: MarketTickerItem[];
  activeCategory: MarketCategoryFilter;
  onSelectCategory: (cat: MarketCategoryFilter) => void;
  onSymbolClick?: (symbol: string) => void;
}

export const MarketTickerStrip = memo(function MarketTickerStrip({
  tickers,
  activeCategory,
  onSelectCategory,
  onSymbolClick,
}: MarketTickerStripProps) {
  const categories: MarketCategoryFilter[] = ["India", "US", "Global", "Crypto"];

  // Filter or show all with prioritized category
  const displayTickers = tickers.filter((t) =>
    activeCategory ? t.category === activeCategory || activeCategory === "India" : true
  );

  return (
    <div className="w-full h-11 bg-[#020B14] border-b border-[#0C1E30] px-4 flex items-center justify-between gap-3 select-none overflow-hidden">
      {/* Scrollable Ticker Strip */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {displayTickers.map((item, index) => {
          const isPos = item.changePct >= 0;

          return (
            <div
              key={index}
              onClick={() => onSymbolClick?.(item.symbol)}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 cursor-pointer shrink-0 transition-all duration-150 group"
            >
              <span className="text-[11px] font-bold text-[#E2E8F0] tracking-tight group-hover:text-[#16C6F4] transition-colors">
                {item.symbol}
              </span>
              <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                {item.price}
              </span>
              <div
                className={`flex items-center gap-0.5 text-[10px] font-mono font-semibold tabular-nums ${
                  isPos ? "text-[#00E890]" : "text-[#FF3B5C]"
                }`}
              >
                {isPos ? (
                  <TrendingUp className="h-2.5 w-2.5" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5" />
                )}
                <span>
                  {isPos ? "+" : ""}
                  {item.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs on Right */}
      <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-[#0D2438]">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                isActive
                  ? "bg-[#16C6F4] text-[#020B14] font-bold shadow-sm shadow-[#16C6F4]/30"
                  : "bg-[#061A2A] text-[#7D8EA5] hover:text-slate-200 hover:bg-[#0A243A]"
              }`}
            >
              {cat}
            </button>
          );
        })}
        <button
          type="button"
          className="p-1 rounded bg-[#061A2A] text-[#7D8EA5] hover:text-[#16C6F4] hover:bg-[#0A243A] border border-[#0F2D48] transition-colors"
          title="Add Custom Watchlist Symbol"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});
