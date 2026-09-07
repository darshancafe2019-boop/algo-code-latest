"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface WorkspaceTabItem {
  id: string;
  label: string;
  count?: number;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface WorkspaceTabsProps {
  tabs: (WorkspaceTabItem | string)[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function WorkspaceTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: WorkspaceTabsProps) {
  const normTabs: WorkspaceTabItem[] = tabs.map((t) =>
    typeof t === "string" ? { id: t, label: t } : t
  );

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-[#213047] pb-2 overflow-x-auto select-none no-scrollbar",
        className
      )}
    >
      {normTabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all duration-100 whitespace-nowrap cursor-pointer border",
              isActive
                ? "bg-[#121C2C] text-[#22C7E8] border-[#22C7E8]/40 shadow-xs"
                : "bg-transparent text-[#94A3B8] border-transparent hover:text-[#F4F7FA] hover:bg-[#0E1624]"
            )}
          >
            {Icon && <Icon className={cn("h-3.5 w-3.5", isActive ? "text-[#22C7E8]" : "text-[#64748B]")} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded text-[10px] tabular-nums font-semibold",
                  isActive
                    ? "bg-[#22C7E8]/20 text-[#22C7E8]"
                    : "bg-[#101827] text-[#64748B]"
                )}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span className="px-1 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
