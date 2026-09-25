"use client";

import React, { memo } from "react";
import { Search } from "lucide-react";

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLive?: boolean;
  onToggleLive?: () => void;
}

export const TopHeader = memo(function TopHeader({
  searchQuery,
  onSearchChange,
}: TopHeaderProps) {
  return (
    <header className="w-full h-14 bg-[#04111C] border-b border-[#0D2438] px-4 flex items-center justify-between gap-4 select-none shrink-0">
      {/* LEFT: Search Field */}
      <div className="flex-1 max-w-[540px]">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-[#7D8EA5] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search symbols, strategies, or insights (e.g. NIFTY, BTC, Options, EMA, RSI...)"
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#071D2D]/80 border border-[#10304C] text-[12px] text-slate-100 placeholder-[#566B82] focus:outline-none focus:border-[#16C6F4] focus:ring-1 focus:ring-[#16C6F4]/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 text-[10px] text-[#7D8EA5] hover:text-white"
            >
              ESC
            </button>
          )}
        </div>
      </div>
    </header>
  );
});
