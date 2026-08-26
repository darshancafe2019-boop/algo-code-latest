"use client";

import React, { useState } from "react";
import {
  Sliders,
  Sparkles,
  Calculator,
  History,
  Zap,
  Activity,
  BarChart3,
  Server,
} from "lucide-react";
import { OptionsFuturesRiskPanel } from "./OptionsFuturesRiskPanel";
import { WhatIfSimulator } from "./WhatIfSimulator";
import { PositionSizingEngine } from "./PositionSizingEngine";
import { RiskProfilesPanel } from "./RiskProfilesPanel";
import { RiskEventAuditPanel } from "./RiskEventAuditPanel";
import { SystemHealthPanel } from "./SystemHealthPanel";
import { RiskProfile } from "@/types/risk";

interface RiskSectionAdvancedProps {
  profiles: RiskProfile[];
  currentProfileId: string;
}

export function RiskSectionAdvanced({
  profiles,
  currentProfileId,
}: RiskSectionAdvancedProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "position_sizing" | "stress_testing" | "options_futures" | "risk_profiles" | "risk_audit" | "system_health"
  >("position_sizing");

  const subTabs = [
    { id: "position_sizing", label: "Position Size Calculator", icon: Calculator },
    { id: "stress_testing", label: "Stress Testing Simulator", icon: Sparkles },
    { id: "options_futures", label: "Options & Futures Greeks", icon: Zap },
    { id: "risk_profiles", label: "Risk Profiles", icon: Sliders },
    { id: "risk_audit", label: "Risk Event Ledger", icon: History },
    { id: "system_health", label: "System Health & Diagnostics", icon: Server },
  ] as const;

  return (
    <div className="space-y-5 font-sans select-none">
      {/* Sub-Navigation Strip */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shadow-lg">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/40 shadow-sm"
                  : "text-[var(--theme-text-secondary)] hover:text-white hover:bg-[var(--theme-elevated)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content */}
      <div className="animate-fadeIn">
        {activeSubTab === "position_sizing" && <PositionSizingEngine />}
        {activeSubTab === "stress_testing" && <WhatIfSimulator />}
        {activeSubTab === "options_futures" && <OptionsFuturesRiskPanel />}
        {activeSubTab === "risk_profiles" && (
          <RiskProfilesPanel
            profiles={profiles}
            currentProfileId={currentProfileId}
          />
        )}
        {activeSubTab === "risk_audit" && <RiskEventAuditPanel />}
        {activeSubTab === "system_health" && <SystemHealthPanel />}
      </div>
    </div>
  );
}
