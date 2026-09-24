"use client";

import React, { useState, useEffect, memo } from "react";
import { Search, Bell, Settings, ChevronDown, Radio, Activity } from "lucide-react";

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLive?: boolean;
  onToggleLive?: () => void;
}

export const TopHeader = memo(function TopHeader({
  searchQuery,
  onSearchChange,
  isLive = true,
  onToggleLive,
}: TopHeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>("Tue, 16 Sep 2026   10:24:32 IST");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: "Tue, 16 Sep 2026   10:24:32 IST"
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCurrentTime(`${dateStr}   ${timeStr} IST`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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

      {/* RIGHT: Status, Time, Icons, User Profile */}
      <div className="flex items-center gap-3.5 shrink-0">
        {/* Date / Time */}
        <div className="hidden md:flex items-center text-[12px] font-mono text-[#8EA1B7] tracking-tight">
          {currentTime}
        </div>

        {/* Market Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#07241E] border border-[#00E890]/30 text-[11px] font-medium text-[#00E890]">
          <span className="h-2 w-2 rounded-full bg-[#00E890] animate-pulse" />
          <span className="tracking-tight">Markets Open</span>
        </div>

        {/* Live Indicator Button */}
        <button
          onClick={onToggleLive}
          type="button"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition-all border ${
            isLive
              ? "bg-[#062038] text-[#16C6F4] border-[#16C6F4]/40 shadow-sm shadow-[#16C6F4]/20"
              : "bg-[#071A29] text-slate-400 border-[#0E283E]"
          }`}
          title="Toggle Real-Time Stream"
        >
          <Radio className={`h-3 w-3 ${isLive ? "animate-pulse text-[#16C6F4]" : "text-slate-500"}`} />
          <span>LIVE</span>
        </button>

        {/* Notification Icon with Badge */}
        <button
          type="button"
          className="relative p-2 rounded-lg bg-[#071D2D] border border-[#10304C] text-[#8EA1B7] hover:text-[#16C6F4] hover:border-[#16C6F4]/40 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#16C6F4] animate-ping" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#16C6F4]" />
        </button>

        {/* Settings Icon */}
        <button
          type="button"
          className="p-2 rounded-lg bg-[#071D2D] border border-[#10304C] text-[#8EA1B7] hover:text-[#16C6F4] hover:border-[#16C6F4]/40 transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-[#0E283E]" />

        {/* User Avatar & Name */}
        <div className="flex items-center gap-2.5 cursor-pointer group pl-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#0F395A] to-[#16C6F4] border border-[#16C6F4]/50 flex items-center justify-center font-bold text-xs text-white shadow-sm shadow-[#16C6F4]/20">
            AP
          </div>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[12px] font-semibold text-slate-100 group-hover:text-[#16C6F4] transition-colors">
              Ashish Paradkar
            </span>
            <span className="text-[10px] text-[#7D8EA5] font-medium">Pro Trader</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[#7D8EA5] group-hover:text-slate-100 transition-colors" />
        </div>
      </div>
    </header>
  );
});
