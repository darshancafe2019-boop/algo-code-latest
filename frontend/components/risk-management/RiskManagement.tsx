"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Activity,
  DollarSign,
  Layers,
  Percent,
  Sliders,
  Calculator,
  Sparkles,
  History,
  AlertOctagon,
  Server,
  RefreshCw,
  Zap,
} from "lucide-react";

import { RiskOverviewResponse, ActiveRiskLimits, RiskProfile, RiskRule } from "@/types/risk";
import { TopGlobalRiskBar } from "./TopGlobalRiskBar";
import { EmergencyControlsModal } from "./EmergencyControlsModal";
import { RiskTelemetryDashboard } from "./RiskTelemetryDashboard";
import { CapitalControlCenter } from "./CapitalControlCenter";
import { ExposureControlPanel } from "./ExposureControlPanel";
import { PositionRiskTable } from "./PositionRiskTable";
import { MarginLeveragePanel } from "./MarginLeveragePanel";
import { OptionsFuturesRiskPanel } from "./OptionsFuturesRiskPanel";
import { RiskProfilesPanel } from "./RiskProfilesPanel";
import { SafetyGatesPanel } from "./SafetyGatesPanel";
import { PositionSizingEngine } from "./PositionSizingEngine";
import { WhatIfSimulator } from "./WhatIfSimulator";
import { RiskEventAuditPanel } from "./RiskEventAuditPanel";
import { SystemHealthPanel } from "./SystemHealthPanel";
import { RiskSkeleton } from "./RiskSkeleton";
import { RiskError } from "./RiskError";
import { ErrorBoundary } from "../ErrorBoundary";

export type RiskSectionTab =
  | "live_risk"
  | "capital"
  | "exposure"
  | "position_risk"
  | "margin_leverage"
  | "options_futures"
  | "risk_profiles"
  | "safety_gates"
  | "position_sizing"
  | "what_if"
  | "risk_audit"
  | "system_health";

export function RiskManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<RiskSectionTab>("live_risk");
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Query 1: Risk Overview & Portfolio Metrics (Polls every 3000ms)
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery<RiskOverviewResponse>({
    queryKey: ["riskOverview"],
    queryFn: async () => {
      const res = await fetch("/api/risk/overview");
      if (!res.ok) throw new Error("Failed to fetch risk overview from server.");
      return res.json();
    },
    refetchInterval: 3000,
  });

  // Query 2: Risk Profiles
  const { data: profilesData } = useQuery<{ status: string; profiles: RiskProfile[] }>({
    queryKey: ["riskProfiles"],
    queryFn: async () => {
      const res = await fetch("/api/risk/profiles");
      if (!res.ok) throw new Error("Failed to fetch risk profiles.");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["riskOverview"] });
    queryClient.invalidateQueries({ queryKey: ["riskProfiles"] });
    queryClient.invalidateQueries({ queryKey: ["riskLimits"] });
    queryClient.invalidateQueries({ queryKey: ["riskHistory"] });
  };

  if (!isMounted || isOverviewLoading) {
    return <RiskSkeleton />;
  }

  if (isOverviewError || !overviewData?.overview) {
    return (
      <RiskError
        message={
          overviewError instanceof Error
            ? overviewError.message
            : "Unable to reach authoritative risk subsystem API."
        }
        onRetry={refetchOverview}
      />
    );
  }

  const { overview, positions, heatmap } = overviewData;

  const navItems = [
    { id: "live_risk", label: "1. Live Risk", icon: Activity },
    { id: "capital", label: "2. Capital", icon: DollarSign },
    { id: "exposure", label: "3. Exposure", icon: Layers },
    { id: "position_risk", label: "4. Position Risk", icon: Shield },
    { id: "margin_leverage", label: "5. Margin & Leverage", icon: Percent },
    { id: "options_futures", label: "6. Options & Futures", icon: Zap },
    { id: "risk_profiles", label: "7. Risk Profiles", icon: Sliders },
    { id: "safety_gates", label: "8. Safety Gates", icon: Shield },
    { id: "position_sizing", label: "9. Position Sizing", icon: Calculator },
    { id: "what_if", label: "10. What-If Simulator", icon: Sparkles },
    { id: "risk_audit", label: "11. Event Audit", icon: History },
    { id: "system_health", label: "12. Data Health", icon: Server },
  ] as const;

  return (
    <div className="space-y-5 font-sans select-none text-[#E8F3EC]">
      {/* 1. TOP GLOBAL RISK BAR */}
      <ErrorBoundary title="Global Risk Bar Error">
        <TopGlobalRiskBar
          overview={overview}
          onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        />
      </ErrorBoundary>

      {/* 2. SECTION NAVIGATION BAR */}
      <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-2 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar shadow-lg">
        <div className="flex items-center gap-1.5 min-w-max text-xs font-mono">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as RiskSectionTab)}
                className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-md"
                    : "text-[#A8BDB0] hover:text-white hover:bg-[#07110D]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pr-2 shrink-0">
          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-400 border border-red-800 font-bold text-xs flex items-center gap-1 transition-all"
          >
            <AlertOctagon className="h-3.5 w-3.5 fill-current" />
            <span>Kill Switch</span>
          </button>

          <button
            onClick={handleRefreshAll}
            className="p-2 rounded-xl bg-[#07110D] hover:bg-[#123C2A] border border-[#1B3328] text-[#A8BDB0] hover:text-white transition-colors"
            title="Refresh All Risk Queries"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 3. ACTIVE SECTION CONTENT */}
      <div className="animate-fadeIn">
        {activeTab === "live_risk" && (
          <ErrorBoundary title="Live Risk Telemetry Error">
            <RiskTelemetryDashboard overview={overview} />
          </ErrorBoundary>
        )}

        {activeTab === "capital" && (
          <ErrorBoundary title="Capital Control Center Error">
            <CapitalControlCenter overview={overview} />
          </ErrorBoundary>
        )}

        {activeTab === "exposure" && (
          <ErrorBoundary title="Exposure Panel Error">
            <ExposureControlPanel overview={overview} heatmap={heatmap} />
          </ErrorBoundary>
        )}

        {activeTab === "position_risk" && (
          <ErrorBoundary title="Position Risk Table Error">
            <PositionRiskTable positions={positions} onRefresh={refetchOverview} />
          </ErrorBoundary>
        )}

        {activeTab === "margin_leverage" && (
          <ErrorBoundary title="Margin & Leverage Panel Error">
            <MarginLeveragePanel overview={overview} />
          </ErrorBoundary>
        )}

        {activeTab === "options_futures" && (
          <ErrorBoundary title="Options & Futures Risk Error">
            <OptionsFuturesRiskPanel />
          </ErrorBoundary>
        )}

        {activeTab === "risk_profiles" && (
          <ErrorBoundary title="Risk Profiles Error">
            <RiskProfilesPanel
              profiles={profilesData?.profiles || []}
              currentProfileId={overview.active_limits?.max_daily_loss_pct === 2.5 ? "conservative" : "balanced"}
            />
          </ErrorBoundary>
        )}

        {activeTab === "safety_gates" && (
          <ErrorBoundary title="Safety Gates Error">
            <SafetyGatesPanel />
          </ErrorBoundary>
        )}

        {activeTab === "position_sizing" && (
          <ErrorBoundary title="Position Sizing Engine Error">
            <PositionSizingEngine />
          </ErrorBoundary>
        )}

        {activeTab === "what_if" && (
          <ErrorBoundary title="What-If Simulator Error">
            <WhatIfSimulator />
          </ErrorBoundary>
        )}

        {activeTab === "risk_audit" && (
          <ErrorBoundary title="Risk Audit Log Error">
            <RiskEventAuditPanel />
          </ErrorBoundary>
        )}

        {activeTab === "system_health" && (
          <ErrorBoundary title="System Health Error">
            <SystemHealthPanel />
          </ErrorBoundary>
        )}
      </div>

      {/* 4. EMERGENCY CONTROLS MODAL */}
      <EmergencyControlsModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        isKillSwitchActive={overview.kill_switch_active}
      />
    </div>
  );
}
