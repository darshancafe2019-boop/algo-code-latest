"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Table2,
  Flame,
  Radar,
  Layers,
  BookOpen,
  Newspaper,
  Calendar,
  Building2,
  Activity,
} from "lucide-react";

export type MarketWorkspaceTab =
  | "TABLE"
  | "TOP_MOVERS"
  | "SCANNERS"
  | "OPTIONS_CHAIN"
  | "ORDER_BOOK"
  | "NEWS"
  | "ECONOMIC_CALENDAR"
  | "CORPORATE_ACTIONS"
  | "GATEWAY_HEALTH";

interface TabMeta {
  id: MarketWorkspaceTab;
  label: string;
  icon: React.ElementType;
}

const TABS: TabMeta[] = [
  { id: "TABLE", label: "MARKET TABLE", icon: Table2 },
  { id: "TOP_MOVERS", label: "TOP MOVERS", icon: Flame },
  { id: "SCANNERS", label: "SCANNERS", icon: Radar },
  { id: "OPTIONS_CHAIN", label: "OPTIONS CHAIN", icon: Layers },
  { id: "ORDER_BOOK", label: "ORDER BOOK (L2)", icon: BookOpen },
  { id: "NEWS", label: "NEWS", icon: Newspaper },
  { id: "ECONOMIC_CALENDAR", label: "ECONOMIC CALENDAR", icon: Calendar },
  { id: "CORPORATE_ACTIONS", label: "CORPORATE ACTIONS", icon: Building2 },
  { id: "GATEWAY_HEALTH", label: "GATEWAY HEALTH", icon: Activity },
];

interface MarketWorkspaceTabsProps {
  activeTab: MarketWorkspaceTab;
  onSelectTab: (tab: MarketWorkspaceTab) => void;
}

export function MarketWorkspaceTabs({ activeTab, onSelectTab }: MarketWorkspaceTabsProps) {
  return (
    <div className="w-full flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-[#15304A] pb-1.5 pt-0.5">
      {TABS.map((tab) => {
        const isSelected = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150 shrink-0 border cursor-pointer",
              isSelected
                ? "bg-[#0878FF] border-[#0878FF] text-white shadow-sm shadow-[#0878FF]/30 font-bold"
                : "bg-[#071426] border-[#15304A] text-[#91A7C1] hover:text-[#EAF3FF] hover:border-[#1F4264] hover:bg-[#09182B]"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-white" : "text-[#00C9E8]")} />
            <span className="tracking-wide uppercase text-[10px]">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

