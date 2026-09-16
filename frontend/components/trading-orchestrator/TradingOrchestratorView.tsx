"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TopCommandBar } from "./TopCommandBar";
import { DailyWorkflowCards, CheckpointData } from "./DailyWorkflowCards";
import { LiveSystemStatus, BrokerStatusItem } from "./LiveSystemStatus";
import { AiDecisionPanel, DecisionRecord } from "./AiDecisionPanel";
import { RiskStatusPanel } from "./RiskStatusPanel";
import { ExecutionModePanel } from "./ExecutionModePanel";
import { JournalAndReportDrawer } from "./JournalAndReportDrawer";

export const TradingOrchestratorView: React.FC = () => {
  const [statusData, setStatusData] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointData[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/orchestrator/status");
      const data = await res.json();
      if (data.status === "success") {
        setStatusData(data);
        if (data.checkpoints) {
          setCheckpoints(data.checkpoints);
        }
      }
    } catch (err) {
      console.error("Failed fetching orchestrator status:", err);
    }
  }, []);

  const fetchDecisions = useCallback(async () => {
    try {
      const res = await fetch("/api/orchestrator/decisions?limit=20");
      const data = await res.json();
      if (data.status === "success") {
        setDecisions(data.decisions || []);
      }
    } catch (err) {
      console.error("Failed fetching decisions:", err);
    }
  }, []);

  const fetchJournalAndReport = useCallback(async () => {
    try {
      const [jRes, rRes] = await Promise.all([
        fetch("/api/orchestrator/journal?limit=20"),
        fetch("/api/orchestrator/report"),
      ]);
      const jData = await jRes.json();
      const rData = await rRes.json();
      if (jData.status === "success") setJournalEntries(jData.journal || []);
      if (rData.status === "success") setDailyReport(rData.report || null);
    } catch (err) {
      console.error("Failed fetching journal/report:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchDecisions();
    fetchJournalAndReport();

    const interval = setInterval(() => {
      fetchStatus();
      fetchDecisions();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchStatus, fetchDecisions, fetchJournalAndReport]);

  // Command handlers
  const handleStart = async () => {
    setIsLoading(true);
    await fetch("/api/orchestrator/start", { method: "POST" });
    await fetchStatus();
    setIsLoading(false);
  };

  const handlePause = async () => {
    setIsLoading(true);
    await fetch("/api/orchestrator/pause", { method: "POST" });
    await fetchStatus();
    setIsLoading(false);
  };

  const handleResume = async () => {
    setIsLoading(true);
    await fetch("/api/orchestrator/resume", { method: "POST" });
    await fetchStatus();
    setIsLoading(false);
  };

  const handleStop = async () => {
    setIsLoading(true);
    await fetch("/api/orchestrator/stop", { method: "POST" });
    await fetchStatus();
    setIsLoading(false);
  };

  const handleKill = async () => {
    setIsLoading(true);
    await fetch("/api/orchestrator/kill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "KILL", operator: "Web Operator" }),
    });
    await fetchStatus();
    setIsLoading(false);
  };

  const handleResetKill = async () => {
    setIsLoading(true);
    await fetch("/api/orchestrator/kill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESET", operator: "Web Operator" }),
    });
    await fetchStatus();
    setIsLoading(false);
  };

  const handleTriggerCheckpoint = async (checkpointId: string) => {
    setIsLoading(true);
    try {
      await fetch("/api/orchestrator/checkpoints/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoint_id: checkpointId }),
      });
      await fetchStatus();
      await fetchDecisions();
      await fetchJournalAndReport();
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCheckpoint = async (checkpointId: string, enabled: boolean) => {
    await fetch("/api/orchestrator/checkpoints/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkpoint_id: checkpointId, is_enabled: enabled }),
    });
    await fetchStatus();
  };

  const handleUpdateTime = async (checkpointId: string, time: string) => {
    await fetch("/api/orchestrator/checkpoints/configure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkpoint_id: checkpointId, scheduled_time: time }),
    });
    await fetchStatus();
  };

  const handleApproveDecision = async (decisionId: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/orchestrator/decisions/${decisionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "Web Operator" }),
      });
      await fetchDecisions();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectDecision = async (decisionId: string) => {
    setIsLoading(true);
    try {
      await fetch(`/api/orchestrator/decisions/${decisionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: "Web Operator" }),
      });
      await fetchDecisions();
    } finally {
      setIsLoading(false);
    }
  };

  // Construct Broker status items
  const brokers: BrokerStatusItem[] = [
    {
      id: "delta",
      name: "Delta Exchange India",
      status: "CONNECTED",
      marketData: "WS LIVE (PORT 5051)",
      latencyMs: 38,
      lastTick: "Live",
    },
    {
      id: "upstox",
      name: "Upstox V3 Feed",
      status: "CONNECTED",
      marketData: "Protobuf Live (PORT 5051)",
      latencyMs: 42,
      lastTick: "Live",
    },
    {
      id: "dhan",
      name: "Dhan HQ",
      status: "AUTH_REQUIRED",
      marketData: "Binary Ready",
      latencyMs: 0,
      lastTick: "Auth Pending",
    },
    {
      id: "fyers",
      name: "FYERS API v3",
      status: "NOT_CONFIGURED",
      marketData: "WS Ready",
      latencyMs: 0,
      lastTick: "Config Pending",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-slate-100">
      {/* Top Command Bar */}
      <TopCommandBar
        status={statusData?.current_state || "IDLE"}
        isPaused={Boolean(statusData?.is_paused)}
        isKilled={Boolean(statusData?.is_killed)}
        tradingMode={statusData?.trading_mode || "PAPER"}
        liveTradingEnabled={Boolean(statusData?.live_trading_enabled)}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onKill={handleKill}
        onResetKill={handleResetKill}
        isLoading={isLoading}
      />

      {/* 6 Daily Workflow Checkpoint Cards */}
      <DailyWorkflowCards
        checkpoints={checkpoints}
        onTriggerCheckpoint={handleTriggerCheckpoint}
        onToggleCheckpoint={handleToggleCheckpoint}
        onUpdateTime={handleUpdateTime}
        isLoading={isLoading}
      />

      {/* Live System & Broker Health */}
      <LiveSystemStatus brokers={brokers} gatewayStatus="LIVE" />

      {/* Grid: AI Decisions + Risk Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AiDecisionPanel
            decisions={decisions}
            onApprove={handleApproveDecision}
            onReject={handleRejectDecision}
            isLoading={isLoading}
          />
        </div>

        <div className="space-y-6">
          <RiskStatusPanel
            capital={1000000}
            availableMargin={850000}
            dailyLossLimit={statusData?.risk_summary?.daily_loss_limit || 25000}
            dailyPnl={0}
            openPositionsCount={0}
            killSwitchActive={Boolean(statusData?.is_killed)}
          />

          <ExecutionModePanel
            tradingMode={statusData?.trading_mode || "PAPER"}
            isLiveArmed={Boolean(statusData?.live_trading_enabled)}
          />
        </div>
      </div>

      {/* EOD Report & Checkpoint Journal */}
      <JournalAndReportDrawer
        journalEntries={journalEntries}
        dailyReport={dailyReport}
      />
    </div>
  );
};
