"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TerminalTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  variant?: "pill" | "underline" | "solid";
  size?: "sm" | "md";
}

export const TerminalTabs: React.FC<TerminalTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = "",
  variant = "pill",
  size = "sm",
}) => {
  return (
    <div
      className={`flex items-center gap-1.5 p-1 rounded-lg bg-[#050B18] border border-[#162238] overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            className={`flex items-center gap-1.5 rounded font-mono font-bold transition-all duration-150 flex-shrink-0 select-none ${
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"
            } ${
              isActive
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.2)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#0A1426]"
            } ${tab.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? "bg-slate-950/30 text-slate-950" : "bg-[#0A1426] text-cyan-300"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
