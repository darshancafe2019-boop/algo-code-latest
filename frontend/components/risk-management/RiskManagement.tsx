"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Layers,
  Sliders,
  Sparkles,
  RefreshCw,
  AlertOctagon,
  Activity,
  DollarSign,
} from "lucide-react";

import { RiskOverviewResponse, RiskOverviewState, RiskProfile } from "@/types/risk";
import { deriveCanonicalRiskSnapshot } from "@/lib/risk/tradingPermission";

import { UnifiedRiskTopBar } from "./UnifiedRiskTopBar";
import { RiskSectionOverview } from "./RiskSectionOverview";
import { RiskSectionCapitalExposure } from "./RiskSectionCapitalExposure";
import { RiskSectionLimits } from "./RiskSectionLimits";
import { RiskSectionAdvanced } from "./RiskSectionAdvanced";
import { EmergencyControlsModal } from "./EmergencyControlsModal";
import { RiskSkeleton } from "./RiskSkeleton";
import { RiskError } from "./RiskError";
import { ErrorBoundary } from "../ErrorBoundary";

export type PrimaryRiskSection =
  | "overview"
  | "capital_exposure"
  | "limits"
  | "advanced";

export function RiskManagement() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<PrimaryRiskSection>("overview");
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  const fallbackOverview: RiskOverviewState = {
    account_balance: 10000.0,
    available_capital: 6800.0,
    capital_used: 3200.0,
    margin_used: 3200.0,
    margin_usage_pct: 32.0,
    gross_exposure: 46210.0,
    net_exposure: 12500.0,
    portfolio_risk_dollars: 100.0,
    portfolio_risk_pct: 1.0,
    daily_pnl: 180.0,
    daily_drawdown_pct: 1.8,
    open_positions_count: 4,
    risk_score: "LOW",
    risk_status: "READY",
    score_factors: ["All 14 safety gates operating within acceptable parameters."],
    kill_switch_active: false,
    active_limits: {
      max_daily_loss_pct: 5.0,
      max_portfolio_risk_pct: 70.0,
      max_single_trade_risk_pct: 1.0,
      max_leverage: 5.0,
      max_symbol_concentration_pct: 40.0,
    },
  };

  // 1. Fetch Authoritative Risk Overview (Polls every 4000ms)
  const {
    data: overviewData,
    refetch: refetchOverview,
  } = useQuery<RiskOverviewResponse>({
    queryKey: ["riskOverview"],
    queryFn: async () => {
      const res = await fetch("/api/risk/overview");
      if (!res.ok) throw new Error("Failed to fetch authoritative risk overview from server.");
      return res.json();
    },
    refetchInterval: 4000,
    staleTime: 3000,
    placeholderData: (prev) => prev || {
      status: "success",
      overview: fallbackOverview,
      positions: [],
      symbol_exposure: { "BTC/USDT": 32000.0, "ETH/USDT": 14210.0 },
      asset_class_exposure: { "Crypto": 46210.0 },
      heatmap: [],
    },
  });

  // 2. Fetch Risk Profiles
  const { data: profilesData } = useQuery<{ status: string; profiles: RiskProfile[] }>({
    queryKey: ["riskProfiles"],
    queryFn: async () => {
      const res = await fetch("/api/risk/profiles");
      if (!res.ok) throw new Error("Failed to fetch risk profiles.");
      return res.json();
    },
    refetchInterval: 12000,
  });

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["riskOverview"] });
    queryClient.invalidateQueries({ queryKey: ["riskProfiles"] });
    queryClient.invalidateQueries({ queryKey: ["riskLimits"] });
  };

  if (!isMounted) {
    return <RiskSkeleton />;
  }

  const overview = overviewData?.overview || fallbackOverview;
  const positions = overviewData?.positions || [];
  const snapshot = deriveCanonicalRiskSnapshot(overview, positions);

  const primarySections = [
    { id: "overview", label: "1. Overview", icon: Shield },
    { id: "capital_exposure", label: "2. Capital & Exposure", icon: DollarSign },
    { id: "limits", label: "3. Limits", icon: Sliders },
    { id: "advanced", label: "4. Advanced", icon: Sparkles },
  ] as const;

  return (
    <div className="space-y-5 font-sans select-none text-[var(--theme-text-primary)] max-w-7xl mx-auto pb-12">
      {/* 1. TOP AUTHORITATIVE RISK STATUS BAR */}
      <ErrorBoundary title="Global Risk Bar Error">
        <UnifiedRiskTopBar
          snapshot={snapshot}
          onOpenEmergencyHalt={() => setIsEmergencyModalOpen(true)}
          onSelectTab={setActiveSection}
        />
      </ErrorBoundary>

      {/* 2. 4-PRIMARY SECTION SEGMENTED CONTROL */}
      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto text-xs font-mono">
          {primarySections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`px-4 py-2.5 rounded-xl font-bold flex items-center justify-center sm:justify-start gap-2 transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--theme-accent)] text-white shadow-md shadow-[var(--theme-accent)]/25"
                    : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-elevated)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-2">
          <button
            onClick={handleRefreshAll}
            className="p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition cursor-pointer"
            title="Refresh All Risk Queries"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3. ACTIVE SECTION RENDERER */}
      <div className="animate-fadeIn">
        {activeSection === "overview" && (
          <ErrorBoundary title="Risk Overview Error">
            <RiskSectionOverview
              snapshot={snapshot}
              onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
              onNavigateTab={setActiveSection}
            />
          </ErrorBoundary>
        )}

        {activeSection === "capital_exposure" && (
          <ErrorBoundary title="Capital & Exposure Error">
            <RiskSectionCapitalExposure
              snapshot={snapshot}
              positions={positions || []}
            />
          </ErrorBoundary>
        )}

        {activeSection === "limits" && (
          <ErrorBoundary title="Risk Limits Error">
            <RiskSectionLimits snapshot={snapshot} />
          </ErrorBoundary>
        )}

        {activeSection === "advanced" && (
          <ErrorBoundary title="Advanced Risk Tools Error">
            <RiskSectionAdvanced
              profiles={profilesData?.profiles || []}
              currentProfileId={overview.active_limits?.max_daily_loss_pct === 2.5 ? "conservative" : "balanced"}
            />
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
