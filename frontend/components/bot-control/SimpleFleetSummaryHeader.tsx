"use client";

import React from "react";
import {
  Plus,
  Play,
  Shield,
  CheckCircle2,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Radio,
  Bot,
  AlertOctagon,
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
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 sm:p-5 font-sans select-none space-y-4">
      {/* Top Strip: Fleet Status, Telemetry & Global Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#122033] pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] text-[#22D3EE]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-[#F7FAFC] tracking-tight">
                Bot Fleet Command Center
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  isLive
                    ? "bg-[#FF3B5C]/15 border-[#FF3B5C]/40 text-[#FF3B5C] animate-pulse"
                    : "bg-[#19C5FF]/10 border-[#19C5FF]/30 text-[#19C5FF]"
                }`}
              >
                {environment} SIMULATION
              </span>
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0D1727] border border-[#1A2A3F] text-[10px] font-mono text-[#00E890]">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                <span>12ms Feed</span>
              </div>
            </div>

            {/* Invariant Count Strip */}
            <div className="flex items-center gap-2 text-xs text-[#7C8CA3] font-mono mt-1 flex-wrap">
              <span className="font-bold text-[#F7FAFC]">{metrics.total_bots} Total</span>
              <span>•</span>
              <span className="text-[#00E890] font-medium">{metrics.running} Running</span>
              <span>•</span>
              <span className="text-[#F59E0B] font-medium">{metrics.paused} Paused</span>
              <span>•</span>
              <span className="text-[#52627A] font-medium">{metrics.stopped} Stopped</span>
              {metrics.error > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#FF3B5C] font-medium">{metrics.error} Error</span>
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
            className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#3B82F6] text-[#F7FAFC] font-semibold text-xs transition-colors flex items-center gap-1.5 font-sans cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Bot</span>
          </button>

          {/* Start Eligible */}
          <button
            onClick={onStartEligible}
            className="h-9 px-3.5 rounded-lg bg-[#0D1727] border border-[#1A2A3F] hover:border-[#00E890]/40 text-[#00E890] font-semibold text-xs transition-colors flex items-center gap-1.5 font-sans cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Eligible</span>
          </button>

          {/* Emergency Halt Toggle */}
          <button
            onClick={onToggleEmergencyHalt}
            className={`h-9 px-3.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 border font-sans cursor-pointer ${
              isHaltActive
                ? "bg-[#FF3B5C] text-white border-[#FF3B5C] animate-pulse"
                : "bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C] hover:bg-[#FF3B5C]/20"
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>{isHaltActive ? "HALT ACTIVE" : "Emergency Halt"}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* 1. TODAY P&L */}
        <div className="p-3.5 bg-[#0D1727] border border-[#1A2A3F] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#7C8CA3] font-sans">
            <span className="font-semibold">Today P&L (Net)</span>
            <TrendingUp className={`w-3.5 h-3.5 ${isPnlPositive ? "text-[#00E890]" : "text-[#FF3B5C]"}`} />
          </div>
          <div className={`text-lg font-bold tabular-nums ${isPnlPositive ? "text-[#00E890]" : "text-[#FF3B5C]"}`}>
            {metrics.today_pnl >= 0 ? "+" : "-"}${Math.abs(metrics.today_pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#52627A] font-sans flex items-center justify-between">
            <span>Realized: {metrics.realized_pnl >= 0 ? "+" : "-"}${Math.abs(metrics.realized_pnl).toFixed(2)}</span>
            <span>Unrealized: {metrics.unrealized_pnl >= 0 ? "+" : "-"}${Math.abs(metrics.unrealized_pnl).toFixed(2)}</span>
          </div>
        </div>

        {/* 2. CURRENT EXPOSURE */}
        <div className="p-3.5 bg-[#0D1727] border border-[#1A2A3F] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#7C8CA3] font-sans">
            <span className="font-semibold">Market Exposure</span>
            <DollarSign className="w-3.5 h-3.5 text-[#19C5FF]" />
          </div>
          <div className="text-lg font-bold text-[#F7FAFC] tabular-nums">
            ${metrics.current_exposure.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#52627A] font-sans">
            Active in Open OMS Positions
          </div>
        </div>

        {/* 3. CAPITAL USED & UTILIZATION */}
        <div className="p-3.5 bg-[#0D1727] border border-[#1A2A3F] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#7C8CA3] font-sans">
            <span className="font-semibold">Capital Allocation</span>
            <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
          <div className="text-lg font-bold text-[#F7FAFC] flex items-baseline justify-between tabular-nums">
            <span>${metrics.capital_used.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            <span className="text-xs text-[#F59E0B]">{capUtilPct}%</span>
          </div>
          <div className="w-full h-1 bg-[#07101A] rounded-full overflow-hidden border border-[#122033]">
            <div
              className="h-full bg-[#F59E0B] transition-all duration-500 rounded-full"
              style={{ width: `${capUtilPct}%` }}
            />
          </div>
        </div>

        {/* 4. FLEET HEALTH */}
        <div className="p-3.5 bg-[#0D1727] border border-[#1A2A3F] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#7C8CA3] font-sans">
            <span className="font-semibold">Fleet Engine Health</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#00E890]" />
          </div>
          <div className="text-lg font-bold text-[#00E890]">
            {metrics.health_display}
          </div>
          <div className="text-[10px] text-[#52627A] font-sans flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#00E890] shrink-0" />
            <span>Workers & Subsystems Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
