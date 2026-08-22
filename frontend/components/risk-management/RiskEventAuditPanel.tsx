"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RiskDecision, RiskAnalytics } from "@/types/risk";
import { RiskStatusBar } from "./RiskStatusBar";
import { RiskKpiStrip } from "./RiskKpiStrip";
import { RiskTopBlockersBar } from "./RiskTopBlockersBar";
import { RiskFilterBar } from "./RiskFilterBar";
import { RiskDecisionTable } from "./RiskDecisionTable";
import { RiskForensicDrawer } from "./RiskForensicDrawer";
import { ErrorBoundary } from "../ErrorBoundary";

export function RiskEventAuditPanel() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDecision, setActiveDecision] = useState("ALL");
  const [activeSeverity, setActiveSeverity] = useState("ALL");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [accountMode, setAccountMode] = useState("ALL");
  const [selectedDecision, setSelectedDecision] = useState<RiskDecision | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 1. Fetch Risk Decisions Ledger (`GET /api/risk/decisions`)
  const {
    data: decisionsData,
    isLoading: isDecisionsLoading,
    refetch: refetchDecisions,
  } = useQuery<{ status: string; total: number; decisions: RiskDecision[] }>({
    queryKey: [
      "riskDecisionsMaster",
      searchQuery,
      activeDecision,
      activeSeverity,
      activeCategory,
      accountMode,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: searchQuery,
        decision: activeDecision,
        severity: activeSeverity,
        category: activeCategory,
        account_mode: accountMode,
        limit: "100",
      });
      const res = await fetch(`/api/risk/decisions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load risk decisions ledger.");
      return res.json();
    },
    refetchInterval: 5000,
  });

  // 2. Fetch Risk Analytics & KPI Strip (`GET /api/risk/analytics`)
  const { data: analyticsData } = useQuery<{ status: string; analytics: RiskAnalytics }>({
    queryKey: ["riskAnalyticsMaster"],
    queryFn: async () => {
      const res = await fetch("/api/risk/analytics");
      if (!res.ok) throw new Error("Failed to load risk analytics.");
      return res.json();
    },
    refetchInterval: 6000,
  });

  // 3. Acknowledge Risk Decision Mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/risk/decisions/${eventId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged_by: "Risk Operator" }),
      });
      if (!res.ok) throw new Error("Failed to acknowledge risk decision.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riskDecisionsMaster"] });
      queryClient.invalidateQueries({ queryKey: ["riskAnalyticsMaster"] });
    },
  });

  // 4. Add Operator Note Mutation
  const noteMutation = useMutation({
    mutationFn: async ({ eventId, note }: { eventId: string; note: string }) => {
      const res = await fetch(`/api/risk/decisions/${eventId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed to append note.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riskDecisionsMaster"] });
    },
  });

  // 5. Authorized Override Mutation
  const overrideMutation = useMutation({
    mutationFn: async ({
      eventId,
      overrideBy,
      reason,
    }: {
      eventId: string;
      overrideBy: string;
      reason: string;
    }) => {
      const res = await fetch(`/api/risk/decisions/${eventId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ override_by: overrideBy, reason }),
      });
      if (!res.ok) throw new Error("Failed to record override.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riskDecisionsMaster"] });
      queryClient.invalidateQueries({ queryKey: ["riskAnalyticsMaster"] });
    },
  });

  const handleExport = (format: "csv" | "json") => {
    window.open(`/api/risk/export?format=${format}&limit=500`, "_blank");
  };

  const handleSelectDecision = (d: RiskDecision) => {
    setSelectedDecision(d);
    setIsDrawerOpen(true);
  };

  const decisions = decisionsData?.decisions || [];

  return (
    <div className="space-y-4 font-sans select-none text-slate-100 pb-10">
      {/* 1. RISK LIVE STATUS BAR */}
      <ErrorBoundary title="Status Bar Error">
        <RiskStatusBar analytics={analyticsData?.analytics} isConnected={true} />
      </ErrorBoundary>

      {/* 2. KPI STRIP */}
      <ErrorBoundary title="KPI Strip Error">
        <RiskKpiStrip analytics={analyticsData?.analytics} />
      </ErrorBoundary>

      {/* 3. TOP BLOCKING SAFETY GATES */}
      <ErrorBoundary title="Top Blockers Error">
        <RiskTopBlockersBar
          analytics={analyticsData?.analytics}
          onFilterByGate={(gate) => setSearchQuery(gate)}
        />
      </ErrorBoundary>

      {/* 4. FILTER & SEARCH WORKBENCH */}
      <ErrorBoundary title="Filter Bar Error">
        <RiskFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeDecision={activeDecision}
          onDecisionChange={setActiveDecision}
          activeSeverity={activeSeverity}
          onSeverityChange={setActiveSeverity}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          accountMode={accountMode}
          onAccountModeChange={setAccountMode}
          onRefresh={() => {
            refetchDecisions();
            queryClient.invalidateQueries({ queryKey: ["riskAnalyticsMaster"] });
          }}
          onExport={handleExport}
        />
      </ErrorBoundary>

      {/* 5. IMMUTABLE RISK DECISION TABLE */}
      <ErrorBoundary title="Decision Table Error">
        <RiskDecisionTable
          decisions={decisions}
          selectedDecision={selectedDecision}
          onSelectDecision={handleSelectDecision}
          isLoading={isDecisionsLoading}
        />
      </ErrorBoundary>

      {/* 6. SLIDE-OUT FORENSIC INVESTIGATION DRAWER */}
      <RiskForensicDrawer
        decision={selectedDecision}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
        onAddNote={(id, note) => noteMutation.mutate({ eventId: id, note })}
        onOverride={(id, overrideBy, reason) =>
          overrideMutation.mutate({ eventId: id, overrideBy, reason })
        }
      />
    </div>
  );
}
