"use client";

import React, { memo } from "react";
import { Calendar } from "lucide-react";
import { TimeframeFilter } from "@/types/portfolio-intelligence";

export type AnalyticsTabKey =
  | "overview"
  | "by_broker"
  | "by_board"
  | "by_asset"
  | "by_strategy"
  | "by_sector"
  | "by_instrument"
  | "by_expiry"
  | "by_risk"
  | "by_pnl"
  | "capital_allocation"
  | "performance_analytics";

interface AnalyticsNavTabsProps {
  activeTab: AnalyticsTabKey;
  onSelectTab: (tab: AnalyticsTabKey) => void;
  activeTimeframe: TimeframeFilter;
  onSelectTimeframe: (tf: TimeframeFilter) => void;
}

const TABS: { id: AnalyticsTabKey; label: string }[] = [
  { id: "overview", label: "Portfolio Overview" },
  { id: "by_broker", label: "By Broker" },
  { id: "by_board", label: "By Board" },
  { id: "by_asset", label: "By Asset Class" },
  { id: "by_strategy", label: "By Strategy" },
  { id: "by_sector", label: "By Sector" },
  { id: "by_instrument", label: "By Instrument" },
  { id: "by_expiry", label: "By Expiry" },
  { id: "by_risk", label: "By Risk" },
  { id: "by_pnl", label: "By P&L" },
  { id: "capital_allocation", label: "Capital Allocation" },
  { id: "performance_analytics", label: "Performance Analytics" },
];

const TIMEFRAMES: TimeframeFilter[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

export const AnalyticsNavTabs = memo(function AnalyticsNavTabs({
  activeTab,
  onSelectTab,
  activeTimeframe,
  onSelectTimeframe,
}: AnalyticsNavTabsProps) {
  return (
    <div className="w-full h-12 bg-[#020B14] border-b border-[#0C1E30] px-4 flex items-center justify-between gap-3 select-none overflow-hidden">
      {/* Scrollable Analytics Perspective Tabs */}
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? "bg-[#16C6F4] text-[#020B14] font-bold shadow-md shadow-[#16C6F4]/20 border border-[#16C6F4]"
                  : "bg-[#061A2A] text-[#8EA1B7] hover:text-white hover:bg-[#0A273F] border border-[#0D263D]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right Side: Timeframe Pill Switcher & Calendar */}
      <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-[#0C1E30]">
        <div className="flex items-center bg-[#061A2A] p-0.5 rounded-md border border-[#0D263D]">
          {TIMEFRAMES.map((tf) => {
            const isActive = activeTimeframe === tf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => onSelectTimeframe(tf)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition-all ${
                  isActive
                    ? "bg-[#16C6F4] text-[#020B14] font-bold shadow-sm"
                    : "text-[#7D8EA5] hover:text-white"
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Calendar Button */}
        <button
          type="button"
          className="p-1.5 rounded-md bg-[#061A2A] border border-[#0D263D] text-[#8EA1B7] hover:text-[#16C6F4] hover:border-[#16C6F4]/40 transition-colors"
          title="Select Custom Date Range"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
