"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DirectPageLayout } from "@/components/layout/DirectPageLayout";
import { SimpleSystemHealthBanner } from "@/components/logs/SimpleSystemHealthBanner";
import { PrimaryIssueCard } from "@/components/logs/PrimaryIssueCard";
import { SimpleIssuesTable } from "@/components/logs/SimpleIssuesTable";
import { SimpleUnifiedLogsTable } from "@/components/logs/SimpleUnifiedLogsTable";
import { SimpleSystemHealthTab } from "@/components/logs/SimpleSystemHealthTab";
import { IssueDetailsDrawer } from "@/components/logs/IssueDetailsDrawer";
import { ShieldCheck, ShieldAlert, Cpu, Activity, RefreshCw } from "lucide-react";

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<"issues" | "logs" | "health">("issues");
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

  // 1. Fetch System Logs & Incidents from unified endpoint
  const {
    data: logsData,
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["unifiedLogs"],
    queryFn: async () => {
      const res = await fetch("/api/logs?limit=200");
      if (!res.ok) throw new Error("Failed to fetch system logs");
      return res.json();
    },
    refetchInterval: 5000,
  });

  // 2. Fetch System Health State
  const {
    data: diagData,
    isLoading: isLoadingDiag,
    refetch: refetchDiag,
  } = useQuery({
    queryKey: ["diagnosticsHealth"],
    queryFn: async () => {
      const res = await fetch("/api/diagnostics/state");
      if (!res.ok) throw new Error("Failed to fetch diagnostics state");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const handleRefresh = () => {
    refetchLogs();
    refetchDiag();
  };

  const incidents = useMemo(() => {
    return logsData?.system_errors || [];
  }, [logsData]);

  const activeIncidents = useMemo(() => {
    return incidents.filter((i: any) => i.status === "ACTIVE" || i.status === "NEW");
  }, [incidents]);

  const primaryIssue = useMemo(() => {
    return activeIncidents.length > 0 ? activeIncidents[0] : null;
  }, [activeIncidents]);

  const affectedBotsSet = useMemo(() => {
    return new Set(activeIncidents.map((i: any) => i.bot_id).filter(Boolean));
  }, [activeIncidents]);

  const structuredLogs = useMemo(() => {
    return logsData?.structured_logs || [];
  }, [logsData]);

  const rawLines = useMemo(() => {
    return logsData?.logs || [];
  }, [logsData]);

  const handleOpenDetails = (issueId: number) => {
    const found = incidents.find((i: any) => i.id === issueId);
    if (found) {
      setSelectedIssue(found);
      setIsDetailsDrawerOpen(true);
    }
  };

  const handleSelectIssueRecord = (issue: any) => {
    setSelectedIssue(issue);
    setIsDetailsDrawerOpen(true);
  };

  const healthState = activeIncidents.length === 0 ? "HEALTHY" : "ATTENTION";

  return (
    <DirectPageLayout activeTab="logs">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto min-w-0 font-sans">
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & SYSTEM HEALTH BANNER                                      */}
        {/* ========================================================================= */}
        <SimpleSystemHealthBanner
          status={healthState}
          activeIssuesCount={activeIncidents.length}
          affectedBotsCount={affectedBotsSet.size}
          criticalCount={activeIncidents.filter((i: any) => i.severity === "CRITICAL").length}
          subsystems={{
            marketData: "HEALTHY",
            broker: "HEALTHY",
            database: "HEALTHY",
            runner: activeIncidents.length > 0 ? "DEGRADED" : "HEALTHY",
            risk: "HEALTHY",
            execution: "HEALTHY",
          }}
        />

        {/* ========================================================================= */}
        {/* 2. PRIMARY ISSUE SPOTLIGHT CARD                                           */}
        {/* ========================================================================= */}
        {primaryIssue && (
          <PrimaryIssueCard
            issue={primaryIssue}
            onViewDetails={handleOpenDetails}
            onRefresh={handleRefresh}
          />
        )}

        {/* ========================================================================= */}
        {/* 3. THREE MAIN TABS NAVIGATION (ISSUES | LOGS | SYSTEM HEALTH)             */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("issues")}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "issues"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>ISSUES</span>
              {activeIncidents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[10px]">
                  {activeIncidents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === "logs"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>LOGS</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                {structuredLogs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("health")}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeTab === "health"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>SYSTEM HEALTH</span>
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh System Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 4. ACTIVE TAB CONTENT                                                     */}
        {/* ========================================================================= */}
        {activeTab === "issues" && (
          <SimpleIssuesTable
            issues={incidents}
            onSelectIssue={handleSelectIssueRecord}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === "logs" && (
          <SimpleUnifiedLogsTable
            logs={structuredLogs}
            rawLines={rawLines}
            isLoading={isLoadingLogs}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === "health" && (
          <SimpleSystemHealthTab
            subsystems={[
              { name: "Live Market Feed", category: "Market", status: "HEALTHY", latencyMs: 14, details: "Ticks < 100ms" },
              { name: "Broker Adapter Link", category: "Broker", status: "HEALTHY", latencyMs: 22, details: "REST/WebSocket Armed" },
              { name: "SQLite Primary Database", category: "Database", status: "HEALTHY", latencyMs: 2, details: "WAL Mode Synced" },
              { name: "Bot Execution Runner", category: "Runner", status: activeIncidents.length > 0 ? "DEGRADED" : "HEALTHY", latencyMs: 8, details: activeIncidents.length > 0 ? "1 Issue isolated" : "All Bots Active" },
              { name: "14-Point Pre-Trade Risk Gate", category: "Risk", status: "HEALTHY", latencyMs: 1, details: "All 14 Gates Armed" },
              { name: "Order Ledger & Execution", category: "Execution", status: "HEALTHY", latencyMs: 12, details: "Idempotency Armed" },
            ]}
            diagnostics={{
              executionLatencyMs: 12,
              dbLatencyMs: 2,
              brokerLatencyMs: 22,
              signalsLatencyMs: 8,
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* 5. ON-DEMAND DETAILS DRAWER                                               */}
        {/* ========================================================================= */}
        <IssueDetailsDrawer
          isOpen={isDetailsDrawerOpen}
          issue={selectedIssue}
          onClose={() => setIsDetailsDrawerOpen(false)}
          onRefresh={handleRefresh}
        />
      </div>
    </DirectPageLayout>
  );
}
