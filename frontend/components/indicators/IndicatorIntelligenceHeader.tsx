"use client";

import React from "react";
import { Cpu, ShieldCheck, Activity, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorIntelligenceHeaderProps {
  symbol: string;
  timeframe: string;
  decision?: string;
  tradingMode?: string;
  isLive?: boolean;
}

export function IndicatorIntelligenceHeader({
  symbol = "BTC/USDT",
  timeframe = "5m",
  decision = "HOLD",
  tradingMode = "PAPER",
  isLive = true,
}: IndicatorIntelligenceHeaderProps) {
  const isBull = decision.toUpperCase().includes("BULL") || decision.toUpperCase().includes("BUY");
  const isBear = decision.toUpperCase().includes("BEAR") || decision.toUpperCase().includes("SELL");

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#10263A] bg-[#06101B]/70 p-3.5 rounded-lg border">
      {/* ── Left Title + Badges ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
              <Cpu className="h-3.5 w-3.5" />
            </div>
            <h1 className="text-[17px] font-black tracking-tight text-[#F8FAFC] uppercase">
              INDICATOR INTELLIGENCE
            </h1>
          </div>

          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 tracking-wider">
            QUANT ENGINE
          </span>

          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#168BFF]/10 text-[#168BFF] border border-[#168BFF]/30 tracking-wider">
            ENTERPRISE v2.5
          </span>

          <span className="flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#00E89A]/10 text-[#00E89A] border border-[#00E89A]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E89A] animate-pulse" />
            LIVE
          </span>
        </div>

        <p className="text-[11px] text-[#7D8EA5] leading-none">
          Live technical analysis, signal confluence, diagnostics and quantitative intelligence.
        </p>
      </div>

      {/* ── Right Execution & Market Telemetry ── */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
        {/* Execution Mode */}
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#0A1422] border border-[#10263A] text-[#7D8EA5]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#00E89A]" />
          <span>Execution:</span>
          <span className="text-[#00E89A] font-bold">{tradingMode} SANDBOX</span>
        </div>

        {/* Selected Instrument */}
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#0A1422] border border-[#10263A] text-[#7D8EA5]">
          <Activity className="h-3.5 w-3.5 text-[#00F0FF]" />
          <span>Market:</span>
          <span className="text-[#F8FAFC] font-bold">{symbol}</span>
        </div>

        {/* Selected Timeframe */}
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#0A1422] border border-[#10263A] text-[#7D8EA5]">
          <span className="text-[#7D8EA5]">TF:</span>
          <span className="text-[#22D3EE] font-bold">{timeframe}</span>
        </div>

        {/* Confluence State Badge */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded font-bold uppercase tracking-wider border",
            isBull
              ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/40"
              : isBear
              ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/40"
              : "bg-amber-500/15 text-amber-400 border-amber-500/40"
          )}
        >
          <Zap className="h-3 w-3" />
          <span>{decision || "HOLD"}</span>
        </div>
      </div>
    </div>
  );
}
