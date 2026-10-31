"use client";

import React from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Calculator,
  Landmark,
  Layers,
  BookOpen,
  FileText,
  Send,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type TaxTabId =
  | "command-center"
  | "realized-pnl"
  | "tax-calculation"
  | "broker-analysis"
  | "asset-class"
  | "trade-book"
  | "statutory-reports"
  | "tax-filing"
  | "settings";

interface TaxNavBarProps {
  activeTab: TaxTabId;
  onTabChange: (tab: TaxTabId) => void;
}

const TAX_NAV_TABS: { id: TaxTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "command-center", label: "Command Center", icon: LayoutDashboard },
  { id: "realized-pnl", label: "Realized P&L", icon: TrendingUp },
  { id: "tax-calculation", label: "Tax Calculation", icon: Calculator },
  { id: "broker-analysis", label: "Broker Analysis", icon: Landmark },
  { id: "asset-class", label: "Asset Class", icon: Layers },
  { id: "trade-book", label: "Trade Book", icon: BookOpen },
  { id: "statutory-reports", label: "Statutory Reports", icon: FileText },
  { id: "tax-filing", label: "Tax Filing", icon: Send },
  { id: "settings", label: "Settings", icon: Settings },
];

export function TaxNavBar({ activeTab, onTabChange }: TaxNavBarProps) {
  return (
    <div className="rounded-[8px] bg-[#0A1422] border border-[#122A42] p-1.5 shadow-md overflow-x-auto select-none">
      <div className="flex items-center gap-1 min-w-max">
        {TAX_NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-[5px] text-xs font-semibold transition-all cursor-pointer",
                isActive
                  ? "bg-[#168BFF] text-white shadow-sm"
                  : "text-[#7D8EA5] hover:text-[#F8FAFC] hover:bg-[#10263A]"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-[#7D8EA5]")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

