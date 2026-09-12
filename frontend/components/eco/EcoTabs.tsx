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
      className={`flex items-center gap-1 p-1 bg-[#07101A] border border-[#1A2A3F] rounded-lg font-mono text-xs select-none ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isSelected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all duration-150 cursor-pointer ${
              isSelected
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-[#7C8CA3] hover:text-[#F7FAFC] hover:bg-[#101B2D]"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  isSelected
                    ? "bg-[#1E40AF] text-[#93C5FD]"
                    : "bg-[#101B2D] text-[#52627A]"
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
