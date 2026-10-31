"use client";

import React from "react";
import {
  Activity,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorKpiCardsProps {
  activeCount: number;
  totalCount: number;
  healthyCount: number;
  buySignalsCount: number;
  sellSignalsCount: number;
  neutralSignalsCount: number;
  confluenceDecision: string;
  bullScore?: number;
  bearScore?: number;
  dataLatencyMs?: number;
  lastUpdateIso?: string;
  executionStatus?: string;
}

export function IndicatorKpiCards({
  activeCount = 14,
  totalCount = 20,
  healthyCount = 14,
  buySignalsCount = 9,
  sellSignalsCount = 4,
  neutralSignalsCount = 1,
  confluenceDecision = "HOLD",
  bullScore = 26.9,
  bearScore = 17.0,
  dataLatencyMs = 28,
  lastUpdateIso,
  executionStatus = "READY",
}: IndicatorKpiCardsProps) {
  const healthyPct = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100;
  const isBull = confluenceDecision.toUpperCase().includes("BULL") || confluenceDecision.toUpperCase().includes("BUY");
  const isBear = confluenceDecision.toUpperCase().includes("BEAR") || confluenceDecision.toUpperCase().includes("SELL");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
      {/* ── CARD 1: ACTIVE INDICATORS ── */}
      <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#7D8EA5]">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Active Indicators</span>
          <Activity className="h-3.5 w-3.5 text-[#00F0FF]" />
        </div>
        <div className="text-[19px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-tight font-mono">
          {activeCount} <span className="text-xs font-normal text-[#7D8EA5]">/ {totalCount}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#7D8EA5]">
          <span>Status:</span>
          <span className="text-[#00E89A] font-semibold">OPERATIONAL</span>
        </div>
      </div>

      {/* ── CARD 2: HEALTHY ── */}
      <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#7D8EA5]">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Healthy</span>
          <ShieldCheck className="h-3.5 w-3.5 text-[#00E89A]" />
        </div>
        <div className="text-[19px] font-bold tracking-tight text-[#00E89A] tabular-nums leading-tight font-mono">
          {healthyCount} <span className="text-xs font-normal text-[#7D8EA5]">({healthyPct}%)</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#7D8EA5]">
          <span>Integrity:</span>
          <span className="text-[#00E89A] font-semibold">OPTIMAL</span>
        </div>
      </div>

      {/* ── CARD 3: SIGNALS (LATEST) ── */}
      <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#7D8EA5]">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Signals (Latest)</span>
          <TrendingUp className="h-3.5 w-3.5 text-[#22D3EE]" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold leading-tight">
          <span className="px-1.5 py-0.5 rounded bg-[#00E89A]/15 text-[#00E89A] border border-[#00E89A]/30">
            {buySignalsCount} BUY
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30">
            {sellSignalsCount} SELL
          </span>
          <span className="px-1 py-0.5 rounded bg-slate-500/15 text-slate-400">
            {neutralSignalsCount} N
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#7D8EA5]">
          <span>Total Generated:</span>
          <span className="text-[#F8FAFC] font-bold">{buySignalsCount + sellSignalsCount + neutralSignalsCount}</span>
        </div>
      </div>

      {/* ── CARD 4: CONFLUENCE STATUS ── */}
      <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#7D8EA5]">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Confluence Status</span>
          <Zap className={cn("h-3.5 w-3.5", isBull ? "text-[#00E89A]" : isBear ? "text-[#FF3B5C]" : "text-amber-400")} />
        </div>
        <div className={cn(
          "text-[18px] font-bold tracking-tight leading-tight font-mono uppercase",
          isBull ? "text-[#00E89A]" : isBear ? "text-[#FF3B5C]" : "text-amber-400"
        )}>
          {confluenceDecision}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#7D8EA5] font-mono">
          <span className="text-[#00E89A]">{bullScore.toFixed(1)}% Bull</span>
          <span>/</span>
          <span className="text-[#FF3B5C]">{bearScore.toFixed(1)}% Bear</span>
        </div>
      </div>

      {/* ── CARD 5: DATA LATENCY ── */}
      <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#7D8EA5]">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Data Latency</span>
          <Clock className="h-3.5 w-3.5 text-[#00E89A]" />
        </div>
        <div className="text-[19px] font-bold tracking-tight text-[#F8FAFC] tabular-nums leading-tight font-mono">
          {dataLatencyMs} <span className="text-xs font-normal text-[#00E89A]">ms</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#7D8EA5]">
          <span>Feed:</span>
          <span className="text-[#00E89A] font-semibold">LIVE RECONCILED</span>
        </div>
      </div>

      {/* ── CARD 6: EXECUTION STATUS ── */}
      <div className="h-[92px] p-2.5 rounded-[8px] bg-[#0A1422] border border-[#122A42] hover:border-[#168BFF]/40 transition-colors flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#7D8EA5]">
          <span className="text-[10px] font-semibold tracking-wider uppercase">Execution Status</span>
          <PlayCircle className="h-3.5 w-3.5 text-[#00F0FF]" />
        </div>
        <div className="text-[19px] font-bold tracking-tight text-[#00F0FF] leading-tight font-mono">
          {executionStatus}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#7D8EA5]">
          <span>Pre-Trade Risk:</span>
          <span className="text-[#00E89A] font-semibold">ARMED</span>
        </div>
      </div>
    </div>
  );
}

