"use client";

import React from "react";
import {
  Plus,
  Play,
  Shield,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  Activity,
  AlertOctagon,
  TrendingUp,
  Radio,
  Bot,
  Zap,
} from "lucide-react";
import { FleetMetrics } from "@/types/bot-control";

interface SimpleFleetSummaryHeaderProps {
  metrics: FleetMetrics;
  environment: "PAPER" | "LIVE";
  onEnvironmentChange: (env: "PAPER" | "LIVE") => void;
  onCreateBot: () => void;
  onStartEligible: () => void;
  onToggleEmergencyHalt: () => void;
}

export function SimpleFleetSummaryHeader({
  metrics,
  environment,
  onEnvironmentChange,
  onCreateBot,
  onStartEligible,
  onToggleEmergencyHalt,
}: SimpleFleetSummaryHeaderProps) {
  const isHaltActive = metrics.emergency_halt_active;
  const isPnlPositive = metrics.today_pnl >= 0;
  const isLive = environment === "LIVE";

  // Capital utilization calculation
  const capUtilPct = metrics.allocated_capital > 0
    ? Math.min(100, Math.round((metrics.capital_used / metrics.allocated_capital) * 100))
    : 0;

  return (
    <div className="card-specular bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] rounded-3xl p-4 sm:p-5 backdrop-blur-md shadow-xl font-sans select-none space-y-4">
      {/* Top Strip: Fleet Status, Telemetry & Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--theme-border-subtle)] pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-accent)] shadow-inner">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-extrabold text-[var(--theme-text-primary)] tracking-tight">
                Bot Fleet Command Center
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono border shadow-sm ${
                  isLive
                    ? "bg-[var(--theme-loss)]/15 border-[var(--theme-loss)] text-[var(--theme-loss)] animate-pulse"
                    : "bg-[var(--theme-accent)]/15 border-[var(--theme-accent)] text-[var(--theme-accent)]"
                }`}
              >
                {environment} SIMULATION
              </span>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[10px] font-mono text-[var(--theme-profit)]">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>12ms Feed</span>
              </div>
            </div>

            {/* Strict Mutually Exclusive Invariant Count Strip */}
            <div className="flex items-center gap-2 text-xs text-[var(--theme-text-secondary)] font-mono mt-1 flex-wrap">
              <span className="font-extrabold text-[var(--theme-text-primary)]">{metrics.total_bots} Total</span>
              <span>•</span>
              <span className="text-[var(--theme-profit)] font-bold">{metrics.running} Running</span>
              <span>•</span>
              <span className="text-[var(--theme-warning)] font-bold">{metrics.paused} Paused</span>
              <span>•</span>
              <span className="text-[var(--theme-text-muted)] font-bold">{metrics.stopped} Stopped</span>
              {metrics.error > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[var(--theme-loss)] font-bold">{metrics.error} Error</span>
                </>
              )}
              {metrics.draft > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[var(--theme-text-muted)]">{metrics.draft} Draft</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Primary Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Create Bot */}
          <button
            onClick={onCreateBot}
            className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-extrabold text-xs transition flex items-center gap-1.5 shadow-lg font-mono"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Create Bot</span>
          </button>

          {/* Start Eligible */}
          <button
            onClick={onStartEligible}
            className="px-3.5 py-2 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] hover:border-[var(--theme-profit)] text-[var(--theme-profit)] font-bold text-xs transition flex items-center gap-1.5 font-mono shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Eligible</span>
          </button>

          {/* Emergency Halt Toggle */}
          <button
            onClick={onToggleEmergencyHalt}
            className={`px-3.5 py-2 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 border font-mono shadow-sm ${
              isHaltActive
                ? "bg-[var(--theme-loss)] text-white border-[var(--theme-loss)] animate-pulse"
                : "bg-[var(--theme-loss)]/10 border-[var(--theme-loss)]/30 text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/20"
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>{isHaltActive ? "HALT ACTIVE" : "Emergency Halt"}</span>
          </button>
        </div>
      </div>

      {/* 4 Essential Institutional KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* 1. TODAY P&L */}
        <div className="card-specular card-interactive p-3.5 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] font-sans">
            <span className="font-semibold">Today P&L (Net)</span>
            <TrendingUp className={`w-3.5 h-3.5 ${isPnlPositive ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`} />
          </div>
          <div className={`text-base sm:text-lg font-extrabold ${isPnlPositive ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
            {metrics.today_pnl >= 0 ? "+" : "-"}${Math.abs(metrics.today_pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[var(--theme-text-secondary)] font-sans flex items-center justify-between">
            <span>Realized: {metrics.realized_pnl >= 0 ? "+" : "-"}${Math.abs(metrics.realized_pnl).toFixed(2)}</span>
            <span>Unrealized: {metrics.unrealized_pnl >= 0 ? "+" : "-"}${Math.abs(metrics.unrealized_pnl).toFixed(2)}</span>
          </div>
        </div>

        {/* 2. CURRENT EXPOSURE */}
        <div className="card-specular card-interactive p-3.5 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] font-sans">
            <span className="font-semibold">Market Exposure</span>
            <DollarSign className="w-3.5 h-3.5 text-[var(--theme-accent)]" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-[var(--theme-text-primary)]">
            ${metrics.current_exposure.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[var(--theme-text-secondary)] font-sans">
            Active in Open OMS Positions
          </div>
        </div>

        {/* 3. CAPITAL USED & UTILIZATION */}
        <div className="card-specular card-interactive p-3.5 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] font-sans">
            <span className="font-semibold">Capital Allocation</span>
            <Shield className="w-3.5 h-3.5 text-[var(--theme-warning)]" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-[var(--theme-text-primary)] flex items-baseline justify-between">
            <span>${metrics.capital_used.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            <span className="text-xs text-[var(--theme-warning)]">{capUtilPct}%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[var(--theme-surface)] rounded-full overflow-hidden border border-[var(--theme-border-subtle)]">
            <div
              className="h-full bg-[var(--theme-warning)] transition-all duration-500 rounded-full"
              style={{ width: `${capUtilPct}%` }}
            />
          </div>
          <div className="text-[10px] text-[var(--theme-text-secondary)] font-sans">
            Allocated: ${(metrics.allocated_capital / 1000).toFixed(1)}K Total
          </div>
        </div>

        {/* 4. FLEET HEALTH */}
        <div className="card-specular card-interactive p-3.5 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] font-sans">
            <span className="font-semibold">Fleet Engine Health</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--theme-profit)]" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-[var(--theme-profit)]">
            {metrics.health_display}
          </div>
          <div className="text-[10px] text-[var(--theme-text-secondary)] font-sans flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-[var(--theme-profit)] shrink-0" />
            <span>Workers & Subsystems Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
