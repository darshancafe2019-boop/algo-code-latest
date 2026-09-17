"use client";

import React from "react";
import Link from "next/link";
import {
  Plus,
  Play,
  Bot,
  TrendingUp,
  TrendingDown,
  Layers,
  Wallet,
  ShieldCheck,
  AlertOctagon,
  Radio,
  Sliders,
} from "lucide-react";
import { FleetMetrics } from "@/types/bot-control";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, formatMoney } from "@/lib/formatters";

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
  const capUtilPct =
    metrics.allocated_capital > 0
      ? Math.min(100, Math.round((metrics.capital_used / metrics.allocated_capital) * 100))
      : 0;

  return (
    <div className="space-y-3.5 font-sans select-none">
      {/* ── Top Header Strip: Fleet Title & Primary Execution Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#168BFF]/10 border border-[#168BFF]/20 flex items-center justify-center text-[#22D3EE]">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#F8FAFC] tracking-tight uppercase">
                Bot Fleet Command Center
              </h1>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold font-mono border",
                  isLive
                    ? "bg-[#FF3B5C]/15 border-[#FF3B5C]/40 text-[#FF3B5C] animate-pulse"
                    : "bg-[#168BFF]/15 border-[#168BFF]/30 text-[#22D3EE]"
                )}
              >
                {environment} SIMULATION
              </span>
              <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#05101A] border border-[#12304A] text-[10px] font-mono text-[#00E89A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
                <span>Gateway 5051</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#7D8EA5] font-mono mt-0.5">
              <span className="font-semibold text-[#F8FAFC]">{metrics.total_bots} Total Fleet</span>
              <span>•</span>
              <span className="text-[#00E89A] font-medium">{metrics.running} Active</span>
              <span>•</span>
              <span className="text-[#F59E0B] font-medium">{metrics.paused} Paused</span>
              <span>•</span>
              <span className="text-[#7D8EA5] font-medium">{metrics.stopped} Stopped</span>
              {metrics.error > 0 && (
                <>
                  <span>•</span>
                  <span className="text-[#FF3B5C] font-semibold">{metrics.error} Error</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Create Bot */}
          <button
            onClick={onCreateBot}
            className="h-8 px-3.5 rounded-lg bg-[#168BFF] hover:bg-[#168BFF]/85 text-[#F8FAFC] font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Create Bot</span>
          </button>

          {/* Start Eligible */}
          <button
            onClick={onStartEligible}
            className="h-8 px-3 rounded-lg bg-[#05101A] border border-[#12304A] hover:border-[#00E89A]/40 text-[#00E89A] font-semibold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Start Eligible</span>
          </button>

          {/* Emergency Halt Toggle */}
          <button
            onClick={onToggleEmergencyHalt}
            className={cn(
              "h-8 px-3 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1.5 border cursor-pointer",
              isHaltActive
                ? "bg-[#FF3B5C] text-white border-[#FF3B5C] animate-pulse"
                : "bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#FF3B5C] hover:bg-[#FF3B5C]/20"
            )}
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>{isHaltActive ? "HALT ACTIVE" : "Emergency Halt"}</span>
          </button>
        </div>
      </div>

      {/* ── 5 TOP KPI CARDS (HEIGHT 112px, RADIUS 10px, MATCHING DASHBOARD) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: Total Fleet Bots */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between group">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Total Fleet Bots</span>
            <div className="h-6 w-6 rounded-md bg-[#168BFF]/10 flex items-center justify-center group-hover:bg-[#168BFF]/20 transition-colors">
              <Bot className="h-3.5 w-3.5 text-[#22D3EE]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none">
              {metrics.total_bots}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#00E89A] font-semibold">{metrics.running} running</span>
            <span>• {metrics.paused} paused</span>
          </div>
        </div>

        {/* Card 2: Running & Active */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between group">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Active Bots</span>
            <div className="h-6 w-6 rounded-md bg-[#00E89A]/10 flex items-center justify-center group-hover:bg-[#00E89A]/20 transition-colors">
              <Play className="h-3.5 w-3.5 text-[#00E89A] fill-current" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#00E89A] tabular-nums leading-none">
              {metrics.running}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#22D3EE] font-semibold">{formatMoney(metrics.current_exposure, "$")}</span>
            <span>market exposure</span>
          </div>
        </div>

        {/* Card 3: Today's P&L */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between group">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Today&apos;s Bot P&L</span>
            <div className={cn("h-6 w-6 rounded-md flex items-center justify-center transition-colors", isPnlPositive ? "bg-[#00E89A]/10" : "bg-[#FF3B5C]/10")}>
              {isPnlPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-[#00E89A]" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-[#FF3B5C]" />
              )}
            </div>
          </div>
          <div>
            <span
              className={cn(
                "text-[24px] font-bold tracking-tight tabular-nums leading-none",
                isPnlPositive ? "text-[#00E89A]" : "text-[#FF3B5C]"
              )}
            >
              {isPnlPositive ? `+${formatCurrency(metrics.today_pnl, "$", 2)}` : formatCurrency(metrics.today_pnl, "$", 2)}
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center justify-between font-medium">
            <span>R: {metrics.realized_pnl >= 0 ? "+" : ""}${Math.abs(metrics.realized_pnl).toFixed(0)}</span>
            <span>UR: {metrics.unrealized_pnl >= 0 ? "+" : ""}${Math.abs(metrics.unrealized_pnl).toFixed(0)}</span>
          </div>
        </div>

        {/* Card 4: Allocated Capital */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-[#0A1422] border border-[#12304A] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between group">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Allocated Capital</span>
            <div className="h-6 w-6 rounded-md bg-[#7C3AED]/10 flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5 text-[#7C3AED]" />
            </div>
          </div>
          <div>
            <span className="text-[24px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-none">
              ${(metrics.allocated_capital / 1000).toFixed(0)}K
            </span>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span className="text-[#F59E0B] font-semibold">{capUtilPct}%</span>
            <span>used (${(metrics.capital_used / 1000).toFixed(0)}K)</span>
          </div>
        </div>

        {/* Card 5: Fleet Engine Health */}
        <div className="h-[112px] p-3.5 rounded-[10px] bg-gradient-to-b from-[#00E89A]/5 to-[#0A1422] border border-[#00E89A]/30 hover:border-[#00E89A]/50 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7D8EA5]">
            <span className="text-[11px] font-medium tracking-tight">Fleet Engine Health</span>
            <div className="h-6 w-6 rounded-md bg-[#00E89A]/15 flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-[#00E89A]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00E89A] animate-pulse" />
              <span className="text-[22px] font-bold tracking-tight text-[#00E89A] leading-none">
                {metrics.healthy_count}/{Math.max(1, metrics.total_bots)} HEALTHY
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[#7D8EA5] flex items-center gap-1 font-medium">
            <span>Workers & OMS Synced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
