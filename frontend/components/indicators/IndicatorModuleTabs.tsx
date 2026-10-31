"use client";

import React from "react";
import {
  Activity,
  Scan,
  Wrench,
  GitBranch,
  History,
  Bell,
  Bookmark,
  Gauge,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type IndicatorTabKey =
  | "ACTIVE_INDICATORS"
  | "SIGNAL_SCANNER"
  | "INDICATOR_BUILDER"
  | "STRATEGY_COMPOSER"
  | "BACKTEST"
  | "ALERTS"
  | "TEMPLATES"
  | "PERFORMANCE"
  | "SETTINGS";

interface TabItem {
  key: IndicatorTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

const TABS: TabItem[] = [
  { key: "ACTIVE_INDICATORS", label: "Active Indicators", icon: Activity },
  { key: "SIGNAL_SCANNER", label: "Signal Scanner", icon: Scan },
  { key: "INDICATOR_BUILDER", label: "Indicator Builder", icon: Wrench },
  { key: "STRATEGY_COMPOSER", label: "Strategy Composer", icon: GitBranch },
  { key: "BACKTEST", label: "Backtest", icon: History },
  { key: "ALERTS", label: "Alerts & Conditions", icon: Bell },
  { key: "TEMPLATES", label: "Templates", icon: Bookmark },
  { key: "PERFORMANCE", label: "Performance", icon: Gauge },
  { key: "SETTINGS", label: "Settings", icon: Settings },
];

interface IndicatorModuleTabsProps {
  activeTab: IndicatorTabKey;
  onTabChange: (tab: IndicatorTabKey) => void;
  activeCount?: number;
}

export function IndicatorModuleTabs({
  activeTab,
  onTabChange,
  activeCount = 14,
}: IndicatorModuleTabsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#10263A]">
      {TABS.map((tab) => {
        const isSelected = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-t-md text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all border-b-2 cursor-pointer",
              isSelected
                ? "bg-[#0A1422] text-[#00F0FF] border-[#00F0FF] font-bold shadow-xs"
                : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#06101B] border-transparent"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-[#00F0FF]" : "text-[#7D8EA5]")} />
            <span>{tab.label}</span>
            {tab.key === "ACTIVE_INDICATORS" && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] font-bold">
                {activeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

