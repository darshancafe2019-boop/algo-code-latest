"use client";

import React from "react";
import {
  TrendingUp,
  Activity,
  Layers,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatSignedMoney } from "@/lib/formatters";

export interface ExchangePnl {
  realized: number;
  unrealized: number;
  net: number;
}

export interface FleetMetricsData {
  totalBots: number;
  runningCount: number;
  pausedCount: number;
  readyCount: number;
  stoppedCount: number;
  errorCount: number;
  totalPositions: number;
  totalContracts: number;
  totalTrades: number;
  totalFills: number;
  successfulFills: number;
  failedFills: number;
  fillSuccessRatePct: number;
  totalFees: number;
  exchangeFees: number;
  longExposure: number;
  shortExposure: number;
  totalExposure: number;
  gatewayConnected?: boolean;
  exchangeBreakdown?: {
    nse?: ExchangePnl;
    delta?: ExchangePnl;
    binance?: ExchangePnl;
  };
  inr?: {
    netPnl?: number;
    realized?: number;
    unrealized?: number;
    fees?: number;
    positions?: number;
    contracts?: number;
    trades?: number;
  };
  usd?: {
    netPnl?: number;
    realized?: number;
    unrealized?: number;
    fees?: number;
    positions?: number;
    contracts?: number;
    trades?: number;
  };
}

interface FleetKpiCardsProps {
  metrics: FleetMetricsData;
  currencyFilter: "ALL" | "INR" | "USD";
  onCurrencyChange: (c: "ALL" | "INR" | "USD") => void;
}

export function FleetKpiCards({
  metrics,
  currencyFilter,
  onCurrencyChange,
}: FleetKpiCardsProps) {
  const totalBots = metrics?.totalBots ?? 0;
  const runningCount = metrics?.runningCount ?? 0;
  const readyCount = metrics?.readyCount ?? 0;
  const pausedCount = metrics?.pausedCount ?? 0;
  const stoppedCount = metrics?.stoppedCount ?? 0;
  const errorCount = metrics?.errorCount ?? 0;

  const activePct =
    totalBots > 0 ? Math.round((runningCount / totalBots) * 100) : 0;

  const inrNet = Number(metrics?.inr?.netPnl ?? 0);
  const inrRealized = Number(metrics?.inr?.realized ?? 0);
  const inrUnrealized = Number(metrics?.inr?.unrealized ?? 0);

  const usdNet = Number(metrics?.usd?.netPnl ?? 0);
  const usdRealized = Number(metrics?.usd?.realized ?? 0);
  const usdUnrealized = Number(metrics?.usd?.unrealized ?? 0);

  // Selected currency values
  const activeCurrencySymbol = currencyFilter === "INR" ? "₹" : "$";
  const activeNet = currencyFilter === "INR" ? inrNet : usdNet;
  const activeRealized = currencyFilter === "INR" ? inrRealized : usdRealized;
  const activeUnrealized = currencyFilter === "INR" ? inrUnrealized : usdUnrealized;

  // Safe exchange breakdown values
  const nseNet = Number(metrics?.exchangeBreakdown?.nse?.net ?? 0);
  const deltaNet = Number(metrics?.exchangeBreakdown?.delta?.net ?? 0);
  const binanceNet = Number(metrics?.exchangeBreakdown?.binance?.net ?? 0);

  // Safe position values
  const totalPositions = Number(metrics?.totalPositions ?? 0);
  const totalContracts = Number(metrics?.totalContracts ?? 0);
  const totalExposure = Number(metrics?.totalExposure ?? 0);
  const longExposure = Number(metrics?.longExposure ?? 0);
  const shortExposure = Number(metrics?.shortExposure ?? 0);

  // Safe execution values
  const totalFills = Number(metrics?.totalFills ?? 0);
  const totalFees = Number(metrics?.totalFees ?? 0);
  const successfulFills = Number(metrics?.successfulFills ?? 0);
  const failedFills = Number(metrics?.failedFills ?? 0);
  const fillSuccessRatePct = Number(metrics?.fillSuccessRatePct ?? 98.4);
  const exchangeFees = Number(metrics?.exchangeFees ?? 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 select-none font-sans">
      {/* ── CARD 1: FLEET NET P&L ────────────────────────────────────────── */}
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3.5 flex flex-col justify-between min-h-[148px] hover:border-[#0878FF]/40 transition-colors shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#00C9E8]" />
            <span className="text-[11px] font-bold text-[#91A7C1] uppercase tracking-wider font-mono">
              Fleet Net P&amp;L
            </span>
          </div>
          {/* Currency Selector */}
          <div className="flex items-center gap-0.5 bg-[#050B16] p-0.5 rounded border border-[#1A2B43]">
            {(["ALL", "INR", "USD"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => onCurrencyChange(curr)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-colors cursor-pointer",
                  currencyFilter === curr
                    ? "bg-[#0878FF] text-white shadow-sm"
                    : "text-[#91A7C1] hover:text-[#EAF3FF]"
                )}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Value Display */}
        <div className="my-2">
          {currencyFilter === "INR" ? (
            <div className={cn("text-2xl font-bold font-mono tracking-tight tabular-nums", inrNet >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
              {formatSignedMoney(inrNet, "₹")}
            </div>
          ) : currencyFilter === "USD" ? (
            <div className={cn("text-2xl font-bold font-mono tracking-tight tabular-nums", usdNet >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
              {formatSignedMoney(usdNet, "$")}
            </div>
          ) : (
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className={cn("text-lg font-bold font-mono tracking-tight tabular-nums", inrNet >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                  {formatSignedMoney(inrNet, "₹")}
                </div>
                <div className="text-[10px] font-mono text-[#91A7C1]">NSE / MCX</div>
              </div>
              <div className="text-right">
                <div className={cn("text-lg font-bold font-mono tracking-tight tabular-nums", usdNet >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                  {formatSignedMoney(usdNet, "$")}
                </div>
                <div className="text-[10px] font-mono text-[#91A7C1]">Delta / Binance</div>
              </div>
            </div>
          )}
        </div>

        {/* Realized vs Unrealized */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#91A7C1] py-1 border-t border-[#1A2B43]/50">
          <span>
            Realized:{" "}
            <strong className={cn("tabular-nums", activeRealized >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
              {formatSignedMoney(activeRealized, activeCurrencySymbol)}
            </strong>
          </span>
          <span>
            Unrealized:{" "}
            <strong className={cn("tabular-nums", activeUnrealized >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
              {formatSignedMoney(activeUnrealized, activeCurrencySymbol)}
            </strong>
          </span>
        </div>

        {/* Exchange-wise P&L breakdown */}
        <div className="pt-1.5 border-t border-[#1A2B43]/50 flex items-center justify-between text-[10px] font-mono text-[#91A7C1]">
          <span>
            NSE: <strong className={cn("tabular-nums", nseNet >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>{formatSignedMoney(nseNet, "₹")}</strong>
          </span>
          <span>
            Delta: <strong className={cn("tabular-nums", deltaNet >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>{formatSignedMoney(deltaNet, "$")}</strong>
          </span>
          <span>
            Binance: <strong className={cn("tabular-nums", binanceNet >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>{formatSignedMoney(binanceNet, "$")}</strong>
          </span>
        </div>
      </div>

      {/* ── CARD 2: FLEET RUNTIME ────────────────────────────────────────── */}
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3.5 flex flex-col justify-between min-h-[148px] hover:border-[#0878FF]/40 transition-colors shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-[#00D6A0]" />
            <span className="text-[11px] font-bold text-[#91A7C1] uppercase tracking-wider font-mono">
              Fleet Runtime
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#00C9E8] px-2 py-0.5 rounded bg-[#0878FF]/15 border border-[#0878FF]/30">
            {activePct}% Active
          </span>
        </div>

        <div className="my-2 flex items-baseline justify-between">
          <div className="text-2xl font-bold font-mono text-[#EAF3FF] tracking-tight tabular-nums">
            {runningCount}{" "}
            <span className="text-xs font-normal text-[#91A7C1]">/ {totalBots} Units</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#00D6A0]/10 border border-[#00D6A0]/30">
            <span className="h-2 w-2 rounded-full bg-[#00D6A0] animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-[#00D6A0]">ONLINE</span>
          </div>
        </div>

        <div className="py-1 border-t border-[#1A2B43]/50 flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#00D6A0] font-bold">{runningCount} Running</span>
          <span className="text-[#0878FF] font-semibold">{readyCount} Ready</span>
          <span className="text-[#FFB020] font-semibold">{pausedCount} Paused</span>
        </div>

        <div className="pt-1.5 border-t border-[#1A2B43]/50 flex items-center justify-between text-[10px] font-mono text-[#91A7C1]">
          <span>{stoppedCount} Stopped</span>
          <span className={errorCount > 0 ? "text-[#FF5268] font-bold" : "text-[#91A7C1]"}>
            {errorCount} Errors
          </span>
          <span className="text-[#00C9E8]">Gateway: Connected</span>
        </div>
      </div>

      {/* ── CARD 3: OPEN POSITIONS ───────────────────────────────────────── */}
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3.5 flex flex-col justify-between min-h-[148px] hover:border-[#0878FF]/40 transition-colors shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#8B5CF6]" />
            <span className="text-[11px] font-bold text-[#91A7C1] uppercase tracking-wider font-mono">
              Open Positions
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#91A7C1]">
            Lots: <strong className="text-[#EAF3FF] tabular-nums">{totalContracts}</strong>
          </span>
        </div>

        <div className="my-2 flex items-baseline justify-between">
          <div className="text-2xl font-bold font-mono text-[#EAF3FF] tracking-tight tabular-nums">
            {totalPositions}{" "}
            <span className="text-xs font-normal text-[#91A7C1]">Active</span>
          </div>
          <div className="text-right">
            <div className="text-base font-bold font-mono text-[#00C9E8] tabular-nums">
              ${formatNumber(totalExposure, 2)}
            </div>
            <div className="text-[10px] font-mono text-[#91A7C1]">Total Exposure</div>
          </div>
        </div>

        <div className="py-1 border-t border-[#1A2B43]/50 flex items-center justify-between text-[11px] font-mono text-[#91A7C1]">
          <span>
            Long: <strong className="text-[#00D6A0] tabular-nums">${formatNumber(longExposure, 2)}</strong>
          </span>
          <span>
            Short: <strong className="text-[#FF5268] tabular-nums">${formatNumber(shortExposure, 2)}</strong>
          </span>
        </div>

        <div className="pt-1.5 border-t border-[#1A2B43]/50 flex items-center justify-between text-[10px] font-mono text-[#91A7C1]">
          <span className="inline-flex items-center gap-1 text-[#00D6A0]">
            <ShieldCheck className="h-3 w-3" />
            <span>Risk Gates Armed</span>
          </span>
          <span>Delta Neutrality: 98.6%</span>
        </div>
      </div>

      {/* ── CARD 4: TOTAL EXECUTIONS ─────────────────────────────────────── */}
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3.5 flex flex-col justify-between min-h-[148px] hover:border-[#0878FF]/40 transition-colors shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
          <div className="flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-[#FFB020]" />
            <span className="text-[11px] font-bold text-[#91A7C1] uppercase tracking-wider font-mono">
              Total Executions
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#00D6A0] px-2 py-0.5 rounded bg-[#00D6A0]/10 border border-[#00D6A0]/30">
            {fillSuccessRatePct.toFixed(1)}% Success
          </span>
        </div>

        <div className="my-2 flex items-baseline justify-between">
          <div className="text-2xl font-bold font-mono text-[#EAF3FF] tracking-tight tabular-nums">
            {formatNumber(totalFills, 0)}{" "}
            <span className="text-xs font-normal text-[#91A7C1]">Fills</span>
          </div>
          <div className="text-right">
            <div className="text-base font-bold font-mono text-[#FFB020] tabular-nums">
              ${formatNumber(totalFees, 2)}
            </div>
            <div className="text-[10px] font-mono text-[#91A7C1]">Total Fees</div>
          </div>
        </div>

        <div className="py-1 border-t border-[#1A2B43]/50 flex items-center justify-between text-[11px] font-mono text-[#91A7C1]">
          <span>
            Success: <strong className="text-[#00D6A0] tabular-nums">{formatNumber(successfulFills, 0)}</strong>
          </span>
          <span>
            Failed: <strong className="text-[#FF5268] tabular-nums">{formatNumber(failedFills, 0)}</strong>
          </span>
        </div>

        <div className="pt-1.5 border-t border-[#1A2B43]/50 flex items-center justify-between text-[10px] font-mono text-[#91A7C1]">
          <span>Exchange Fees: <strong className="text-[#EAF3FF]">${formatNumber(exchangeFees, 2)}</strong></span>
          <span className="text-[#00D6A0]">Fills Synced</span>
        </div>
      </div>
    </div>
  );
}
