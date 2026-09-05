"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Activity,
  DollarSign,
  Layers,
  Percent,
  TrendingDown,
  Lock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { CanonicalRiskSnapshot } from "@/types/risk";

interface UnifiedRiskTopBarProps {
  snapshot: CanonicalRiskSnapshot;
  onOpenEmergencyHalt: () => void;
  onSelectTab: (tabId: "overview" | "capital_exposure" | "limits" | "advanced") => void;
}

export function UnifiedRiskTopBar({
  snapshot,
  onOpenEmergencyHalt,
  onSelectTab,
}: UnifiedRiskTopBarProps) {
  const { permission, capital, exposure, margin, dailyRisk, tradeRisk, brokerHealth } = snapshot;

  const isHalted = permission.status === "EMERGENCY_HALT";
  const isBlocked = permission.status === "BLOCKED";
  const isCaution = permission.status === "CAUTION";
  const isUnavailable = permission.status === "UNAVAILABLE";
  const isReady = permission.status === "READY";

  // Status Styling
  const statusStyles = {
    READY: {
      bg: "bg-[var(--theme-profit)]/10 border-[var(--theme-profit)]/30 text-[var(--theme-profit)]",
      badge: "bg-[var(--theme-profit)]/20 text-[var(--theme-profit)] border-[var(--theme-profit)]/40",
      dot: "bg-[var(--theme-profit)]",
      icon: ShieldCheck,
      label: "READY",
      title: "All Risk Gates Cleared • Trading Authorized",
    },
    CAUTION: {
      bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      dot: "bg-amber-400",
      icon: AlertTriangle,
      label: "CAUTION",
      title: "Risk Parameters Elevated • Proceed with Caution",
    },
    BLOCKED: {
      bg: "bg-[var(--theme-loss)]/10 border-[var(--theme-loss)]/30 text-[var(--theme-loss)]",
      badge: "bg-[var(--theme-loss)]/20 text-[var(--theme-loss)] border-[var(--theme-loss)]/40",
      dot: "bg-[var(--theme-loss)] animate-pulse",
      icon: ShieldAlert,
      label: "BLOCKED",
      title: "Trading Blocked • Critical Risk Threshold Exceeded",
    },
    EMERGENCY_HALT: {
      bg: "bg-red-950/80 border-red-800/80 text-red-400",
      badge: "bg-red-900/60 text-red-300 border-red-700",
      dot: "bg-red-500 animate-ping",
      icon: AlertOctagon,
      label: "EMERGENCY HALT",
      title: "System Halted • Emergency Kill Switch Active",
    },
    UNAVAILABLE: {
      bg: "bg-slate-800/50 border-slate-700 text-slate-400",
      badge: "bg-slate-800 text-slate-300 border-slate-600",
      dot: "bg-slate-400",
      icon: Activity,
      label: "UNAVAILABLE",
      title: "Data Unavailable • Market Feed / Broker Disconnected",
    },
  }[permission.status];

  const StatusIcon = statusStyles.icon;

  return (
    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)]">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--theme-text-primary)]">
                Quant.OS Risk Center
              </h1>
              {snapshot.executionMode === "LIVE" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono bg-red-950/60 text-red-400 border border-red-700/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE EXECUTION
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-700/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  PAPER MODE
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)]">
              Authoritative trading permissions, margin utilization, and institutional defense gates.
            </p>
          </div>
        </div>

        {/* Separated Telemetry Status Matrix (Phase 5) */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--theme-text-muted)]">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
            Market Data: <span className={`font-bold ${brokerHealth.feedStatus === "LIVE" ? "text-[var(--theme-profit)]" : "text-amber-400"}`}>{brokerHealth.feedStatus || "LIVE"}</span>
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
            Execution: <span className="text-cyan-400 font-bold">{snapshot.executionMode || "PAPER"}</span>
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
            Live Orders: <span className={`font-bold ${snapshot.executionMode === "LIVE" ? "text-red-400" : "text-slate-400"}`}>{snapshot.executionMode === "LIVE" ? "ARMED" : "LOCKED"}</span>
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)]">
            Safety Gate: <span className={`font-bold ${permission.status === "EMERGENCY_HALT" ? "text-red-400" : "text-[var(--theme-profit)]"}`}>{permission.status === "EMERGENCY_HALT" ? "TRIGGERED" : "ARMED"}</span>
          </span>
        </div>
      </div>

      {/* 2. Authoritative Permission State Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${statusStyles.bg}`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-black/20 shrink-0 mt-0.5 sm:mt-0">
            <StatusIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">Trading Permission:</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border ${statusStyles.badge}`}>
                ● {statusStyles.label}
              </span>
            </div>
            <p className="text-xs mt-0.5 opacity-90 font-medium">
              {permission.primaryReason}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {(!isReady) && (
            <button
              onClick={() => onSelectTab("overview")}
              className="px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-xs font-bold font-mono transition flex items-center gap-1 border border-white/10"
            >
              <span>View Blocker</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={onOpenEmergencyHalt}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs font-mono flex items-center gap-1.5 transition shadow-sm ${
              isHalted
                ? "bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/50"
                : "bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40"
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5 fill-current" />
            <span>{isHalted ? "Review Halt" : "EMERGENCY HALT"}</span>
          </button>
        </div>
      </div>

      {/* 3. Top 5 Core Values Only */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs font-mono">
        {/* Metric 1: Available Capital */}
        <div
          onClick={() => onSelectTab("capital_exposure")}
          className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)]/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[var(--theme-text-muted)] text-[10px] uppercase font-bold">
            <span>Available Capital</span>
            <DollarSign className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold text-[var(--theme-text-primary)]">
            ${capital.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">
            of ${capital.accountEquity.toLocaleString()} Total Equity
          </div>
        </div>

        {/* Metric 2: Capital In Use / Gross Exposure */}
        <div
          onClick={() => onSelectTab("capital_exposure")}
          className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)]/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[var(--theme-text-muted)] text-[10px] uppercase font-bold">
            <span>Gross Exposure</span>
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold text-cyan-300">
            ${exposure.grossExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">
            Effective Leverage: <span className="font-bold text-[var(--theme-text-secondary)]">{exposure.effectiveLeverage.toFixed(2)}x</span>
          </div>
        </div>

        {/* Metric 3: Risk Per Trade */}
        <div
          onClick={() => onSelectTab("limits")}
          className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)]/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[var(--theme-text-muted)] text-[10px] uppercase font-bold">
            <span>Risk Per Trade</span>
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--theme-profit)]" />
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold text-[var(--theme-profit)]">
            ${tradeRisk.maxRiskAmount.toFixed(0)} <span className="text-xs font-normal">({tradeRisk.maxRiskPerTradePct.toFixed(1)}%)</span>
          </div>
          <div className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">
            Max Stop-Loss Budget
          </div>
        </div>

        {/* Metric 4: Daily Drawdown */}
        <div
          onClick={() => onSelectTab("limits")}
          className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)]/50 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-[var(--theme-text-muted)] text-[10px] uppercase font-bold">
            <span>Daily Drawdown</span>
            <TrendingDown className={`h-3.5 w-3.5 ${dailyRisk.dailyDrawdownPct >= dailyRisk.maxDailyLossPct ? "text-[var(--theme-loss)]" : "text-amber-400"}`} />
          </div>
          <div className={`mt-1 text-base sm:text-lg font-bold ${dailyRisk.dailyDrawdownPct >= dailyRisk.maxDailyLossPct ? "text-[var(--theme-loss)]" : "text-[var(--theme-text-primary)]"}`}>
            {dailyRisk.dailyDrawdownPct.toFixed(1)}% <span className="text-xs font-normal text-[var(--theme-text-muted)]">/ {dailyRisk.maxDailyLossPct.toFixed(1)}% Max</span>
          </div>
          <div className="text-[10px] text-[var(--theme-profit)] mt-0.5">
            {dailyRisk.remainingBufferPct.toFixed(1)}% Buffer Remaining
          </div>
        </div>

        {/* Metric 5: Margin Utilization */}
        <div
          onClick={() => onSelectTab("capital_exposure")}
          className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-accent)]/50 transition cursor-pointer col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-[var(--theme-text-muted)] text-[10px] uppercase font-bold">
            <span>Margin Utilization</span>
            <Percent className={`h-3.5 w-3.5 ${margin.marginUtilizationPct > margin.maxMarginLimitPct ? "text-[var(--theme-loss)]" : "text-purple-400"}`} />
          </div>
          <div className={`mt-1 text-base sm:text-lg font-bold ${margin.marginUtilizationPct > margin.maxMarginLimitPct ? "text-[var(--theme-loss)]" : "text-purple-300"}`}>
            {margin.marginUtilizationPct.toFixed(1)}% <span className="text-xs font-normal text-[var(--theme-text-muted)]">/ {margin.maxMarginLimitPct.toFixed(0)}% Cap</span>
          </div>
          <div className="text-[10px] text-[var(--theme-text-muted)] mt-0.5">
            ${margin.marginUsed.toLocaleString()} Locked Collateral
          </div>
        </div>
      </div>
    </div>
  );
}
