"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Lock, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";

export interface RiskGuardrailsData {
  maxDailyLoss: number;
  dailyLossUsed: number;
  remainingRiskBudget: number;
  maxLossPerTrade: number;
  maxOpenPositions: number;
  maxCapitalAllocation: number;
  maxLeverage: number;
  maxDrawdownPct: number;
  maxExposure: number;
  marginUtilizationPct: number;
  dailyProfitTarget: number;
  circuitBreakerStatus: "ARMED" | "TRIGGERED" | "DISABLED";
  circuitBreakerReason: string | null;
  guardrails: Array<{
    name: string;
    description: string;
    status: "ACTIVE" | "TRIGGERED" | "STANDBY";
    limit: string;
    current: string;
  }>;
}

interface RiskGuardrailsCenterProps {
  data: RiskGuardrailsData;
  currencySymbol?: string;
}

export function RiskGuardrailsCenter({
  data,
  currencySymbol = "₹",
}: RiskGuardrailsCenterProps) {
  const isArmed = data.circuitBreakerStatus === "ARMED";
  const isTriggered = data.circuitBreakerStatus === "TRIGGERED";

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-4 font-sans select-none shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Risk Management Center &amp; Protective Guardrails
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold border">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isArmed ? "bg-[#00D6A0] animate-pulse" : isTriggered ? "bg-[#FF5268] animate-ping" : "bg-[#FFB020]"
            )}
          />
          <span className={isArmed ? "text-[#00D6A0]" : isTriggered ? "text-[#FF5268]" : "text-[#FFB020]"}>
            CIRCUIT BREAKER: {data.circuitBreakerStatus}
          </span>
        </div>
      </div>

      {/* Trigger Warning Banner if applicable */}
      {isTriggered && data.circuitBreakerReason && (
        <div className="p-3 rounded-[6px] bg-[#FF5268]/15 border border-[#FF5268]/40 text-xs font-mono text-[#FF5268] flex items-center gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Circuit Breaker Active: {data.circuitBreakerReason}</span>
        </div>
      )}

      {/* 8 Primary Risk Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-mono text-xs">
        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Daily Loss Cap</span>
          <span className="text-sm font-bold text-[#FF5268] tabular-nums">
            -{currencySymbol}{formatNumber(data.maxDailyLoss, 0)}
          </span>
          <span className="text-[10px] text-[#91A7C1]">Budget: {currencySymbol}{formatNumber(data.remainingRiskBudget, 0)}</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Daily Loss Used</span>
          <span className="text-sm font-bold text-[#EAF3FF] tabular-nums">
            {currencySymbol}{formatNumber(data.dailyLossUsed, 2)}
          </span>
          <span className="text-[10px] text-[#00D6A0]">Within Limits</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Max Loss / Trade</span>
          <span className="text-sm font-bold text-[#FF5268] tabular-nums">
            -{currencySymbol}{formatNumber(data.maxLossPerTrade, 0)}
          </span>
          <span className="text-[10px] text-[#91A7C1]">Hard Gate</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Max Positions</span>
          <span className="text-sm font-bold text-[#EAF3FF] tabular-nums">
            {data.maxOpenPositions} Units
          </span>
          <span className="text-[10px] text-[#91A7C1]">Concurrency Cap</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Max Capital</span>
          <span className="text-sm font-bold text-[#00C9E8] tabular-nums">
            {currencySymbol}{formatNumber(data.maxCapitalAllocation, 0)}
          </span>
          <span className="text-[10px] text-[#91A7C1]">Allocation Base</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Max Exposure</span>
          <span className="text-sm font-bold text-[#EAF3FF] tabular-nums">
            {currencySymbol}{formatNumber(data.maxExposure, 0)}
          </span>
          <span className="text-[10px] text-[#91A7C1]">Notional Cap</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Margin Util</span>
          <span className="text-sm font-bold text-[#00C9E8] tabular-nums">
            {data.marginUtilizationPct.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#00D6A0]">Healthy Buffer</span>
        </div>

        <div className="p-2.5 rounded bg-[#050B16] border border-[#1A2B43] flex flex-col justify-between">
          <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Max Drawdown</span>
          <span className="text-sm font-bold text-[#FFB020] tabular-nums">
            {data.maxDrawdownPct.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#91A7C1]">Trailing Watermark</span>
        </div>
      </div>

      {/* Protective Guardrails Status List */}
      <div className="border border-[#1A2B43] rounded-[6px] bg-[#050B16] p-3 space-y-2 text-xs font-mono">
        <h4 className="text-[11px] font-bold text-[#00C9E8] uppercase tracking-wider pb-1.5 border-b border-[#1A2B43]/50">
          Deterministic Guardrails Evaluated on Every Intent
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
          {data.guardrails.map((g, idx) => (
            <div key={idx} className="p-2.5 rounded bg-[#091426] border border-[#1A2B43]/60 flex items-start justify-between gap-2">
              <div>
                <span className="font-bold text-[#EAF3FF] block">{g.name}</span>
                <span className="text-[11px] text-[#91A7C1] block">{g.description}</span>
                <div className="text-[10px] mt-1 text-[#91A7C1]">
                  Current: <strong className="text-[#EAF3FF]">{g.current}</strong> • Limit: <strong className="text-[#00C9E8]">{g.limit}</strong>
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30 shrink-0">
                {g.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

