"use client";

import React from "react";

export interface EcoTabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ElementType;
}

interface EcoTabsProps {
  tabs: EcoTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function EcoTabs({ tabs, activeTab, onChange, className = "" }: EcoTabsProps) {
  return (
    <div
      className={`flex items-center gap-1.5 p-1 bg-[#07110D] border border-[#1B3328] rounded-xl font-mono text-xs select-none ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all duration-150 ${
              isSelected
                ? "bg-[#2E7D5B] text-[#07110D] shadow-sm shadow-[#2E7D5B]/30"
                : "text-[#A8BDB0] hover:text-[#E8F3EC] hover:bg-[#12221B]"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  isSelected
                    ? "bg-[#07110D] text-[#55C98A]"
                    : "bg-[#12221B] text-[#70877A]"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
