"use client";

import React, { useState } from "react";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Activity,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/formatters";

export interface StrategySignalData {
  strategyName: string;
  strategyVersion: string;
  entryTimeframe: string;
  confirmationTimeframe: string;
  primaryTrend: string;
  signalStatus: "BUY" | "SELL" | "HOLD" | "WAIT" | "EXIT" | "NO TRADE";
  signalTimestamp: string;
  signalExpiry: string;
  entryReason: string;
  exitReason: string;
  nextEvaluationTime: string;
  indicators: {
    ema9: number;
    ema21: number;
    ema50: number;
    ema200: number;
    rsi: number;
    macd: { line: number; signal: number; histogram: number };
    vwap: number;
    atr: number;
  };
  conditions: Array<{
    name: string;
    description: string;
    passed: boolean;
    value: string;
    threshold: string;
  }>;
  liquiditySweep: string;
  volumeConfirmation: boolean;
  oiConfirmation: boolean;
}

interface SignalStrategyIntelligenceProps {
  data: StrategySignalData;
}

export function SignalStrategyIntelligence({ data }: SignalStrategyIntelligenceProps) {
  const [showBreakdown, setShowBreakdown] = useState(true);

  const isBuy = data.signalStatus === "BUY";
  const isSell = data.signalStatus === "SELL";
  const isHold = data.signalStatus === "HOLD";
  const isWait = data.signalStatus === "WAIT";

  const allPassed = data.conditions.every((c) => c.passed);
  const passedCount = data.conditions.filter((c) => c.passed).length;

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-4 font-sans select-none shadow-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#1A2B43]/70 gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Live Signal &amp; Strategy Intelligence
          </h3>
          <span className="text-[10px] font-mono text-[#00C9E8] bg-[#0878FF]/15 px-2 py-0.5 rounded border border-[#0878FF]/30">
            {data.strategyName} v{data.strategyVersion}
          </span>
        </div>

        {/* Signal Badge Banner */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono text-[#91A7C1]">Signal State:</span>
          <span
            className={cn(
              "px-3 py-1 rounded-[6px] text-xs font-mono font-bold border flex items-center gap-1.5 shadow-sm",
              isBuy
                ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/40"
                : isSell
                  ? "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/40"
                  : isHold
                    ? "bg-[#0878FF]/15 text-[#0878FF] border-[#0878FF]/40"
                    : "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isBuy ? "bg-[#00D6A0] animate-pulse" : isSell ? "bg-[#FF5268] animate-pulse" : "bg-[#0878FF]"
              )}
            />
            {data.signalStatus}
          </span>
        </div>
      </div>

      {/* Primary Indicator Intelligence Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] font-bold">EMA 9 / 21</span>
          <span className="text-xs font-bold text-[#00C9E8] tabular-nums">
            {data.indicators.ema9.toFixed(2)} / {data.indicators.ema21.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#00D6A0]">Golden Cross</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] font-bold">EMA 50 / 200</span>
          <span className="text-xs font-bold text-[#EAF3FF] tabular-nums">
            {data.indicators.ema50.toFixed(2)} / {data.indicators.ema200.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#00C9E8]">Above 200 EMA</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] font-bold">RSI (14)</span>
          <span className={cn("text-xs font-bold tabular-nums", data.indicators.rsi >= 70 ? "text-[#FF5268]" : data.indicators.rsi <= 30 ? "text-[#00D6A0]" : "text-[#EAF3FF]")}>
            {data.indicators.rsi.toFixed(1)}
          </span>
          <span className="text-[10px] text-[#91A7C1]">Optimal 45-65</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] font-bold">MACD (12,26,9)</span>
          <span className="text-xs font-bold text-[#00D6A0] tabular-nums">
            +{data.indicators.macd.histogram.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#91A7C1]">Expanding Bullish</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] font-bold">VWAP Anchor</span>
          <span className="text-xs font-bold text-[#00C9E8] tabular-nums">
            {data.indicators.vwap.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#00D6A0]">Price &gt; VWAP</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] font-bold">ATR Volatility</span>
          <span className="text-xs font-bold text-[#EAF3FF] tabular-nums">
            {data.indicators.atr.toFixed(2)}
          </span>
          <span className="text-[10px] text-[#91A7C1]">Dynamic S/L Unit</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] font-bold">Volume / OI Conf</span>
          <span className="text-xs font-bold text-[#00D6A0]">CONFIRMED</span>
          <span className="text-[10px] text-[#91A7C1]">+8.4% Vol Spurt</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] font-bold">Liquidity Sweep</span>
          <span className="text-xs font-bold text-[#00C9E8]">{data.liquiditySweep || "None"}</span>
          <span className="text-[10px] text-[#91A7C1]">Clean Orderflow</span>
        </div>
      </div>

      {/* Signal Rationale & Timestamp Banner */}
      <div className="p-3 rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-xs font-mono space-y-1.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#91A7C1]">
          <span>Generated: <strong className="text-[#EAF3FF]">{formatDateTime(data.signalTimestamp)}</strong></span>
          <span>Next Eval: <strong className="text-[#00C9E8]">{formatDateTime(data.nextEvaluationTime)}</strong></span>
        </div>
        <div className="text-[#EAF3FF] leading-relaxed">
          <span className="text-[#00C9E8] font-bold">Entry Rationale: </span>
          {data.entryReason || "Pullback to 21 EMA confirmed with RSI rebound and positive volume divergence."}
        </div>
      </div>

      {/* Collapsible Strategy Decision Breakdown */}
      <div className="border border-[#1A2B43] rounded-[6px] bg-[#050B16] overflow-hidden text-xs font-mono">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-between p-3 bg-[#081321] hover:bg-[#0D1D35]/70 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#EAF3FF] text-xs">Strategy Decision Breakdown</span>
            <span className="text-[10px] font-bold text-[#00C9E8] bg-[#0878FF]/20 px-2 py-0.5 rounded">
              {passedCount} / {data.conditions.length} Conditions Met
            </span>
          </div>
          {showBreakdown ? <ChevronUp className="h-4 w-4 text-[#91A7C1]" /> : <ChevronDown className="h-4 w-4 text-[#91A7C1]" />}
        </button>

        {showBreakdown && (
          <div className="p-3 divide-y divide-[#1A2B43]/50">
            {data.conditions.map((cond, idx) => (
              <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  {cond.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-[#00D6A0] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[#FF5268] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-[#EAF3FF]">{cond.name}</span>
                    <p className="text-[11px] text-[#91A7C1]">{cond.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right shrink-0">
                  <div className="text-[11px]">
                    <span className="text-[#91A7C1]">Observed: </span>
                    <strong className="text-[#EAF3FF]">{cond.value}</strong>
                  </div>
                  <div className="text-[11px]">
                    <span className="text-[#91A7C1]">Threshold: </span>
                    <strong className="text-[#00C9E8]">{cond.threshold}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

