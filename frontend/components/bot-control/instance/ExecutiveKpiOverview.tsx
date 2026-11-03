"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  ListOrdered,
  Activity,
  Receipt,
  Percent,
  SlidersHorizontal,
  Clock,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatSignedMoney } from "@/lib/formatters";

export interface BotKpiData {
  netRealizedPnl: number;
  grossRealizedPnl: number;
  unrealizedPnl: number;
  totalNetPnl: number;
  totalTradingCapital: number;
  allocatedCapital: number;
  availableCapital: number;
  usedMargin: number;
  freeMargin: number;
  totalActivePositions: number;
  totalOpenOrders: number;
  totalExecutedTrades: number;
  winRatePct: number;
  profitFactor: number;
  totalFees: number;
  maxDrawdownPct: number;
  dailyReturnPct: number;
  lastUpdated: string;
}

interface ExecutiveKpiOverviewProps {
  data: BotKpiData;
  currencySymbol?: string;
}

type KpiCardKey =
  | "netRealizedPnl"
  | "unrealizedPnl"
  | "totalNetPnl"
  | "totalTradingCapital"
  | "allocatedCapital"
  | "availableCapital"
  | "usedMargin"
  | "freeMargin"
  | "totalActivePositions"
  | "totalOpenOrders"
  | "totalExecutedTrades"
  | "winRatePct"
  | "profitFactor"
  | "totalFees"
  | "maxDrawdownPct"
  | "dailyReturnPct";

interface KpiConfig {
  key: KpiCardKey;
  title: string;
  renderValue: (d: BotKpiData, curr: string) => React.ReactNode;
  subtitle: (d: BotKpiData, curr: string) => string;
  category: "pnl" | "capital" | "activity" | "performance";
}

export function ExecutiveKpiOverview({
  data,
  currencySymbol = "₹",
}: ExecutiveKpiOverviewProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [visibleCards, setVisibleCards] = useState<Record<KpiCardKey, boolean>>({
    netRealizedPnl: true,
    unrealizedPnl: true,
    totalNetPnl: true,
    totalTradingCapital: true,
    allocatedCapital: true,
    availableCapital: true,
    usedMargin: true,
    freeMargin: true,
    totalActivePositions: true,
    totalOpenOrders: true,
    totalExecutedTrades: true,
    winRatePct: true,
    profitFactor: true,
    totalFees: true,
    maxDrawdownPct: true,
    dailyReturnPct: true,
  });

  const KPI_DEFINITIONS: KpiConfig[] = [
    {
      key: "netRealizedPnl",
      title: "Net Realized P&L",
      renderValue: (d, curr) => (
        <span className={cn("text-xl font-bold font-mono tabular-nums tracking-tight", d.netRealizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
          {formatSignedMoney(d.netRealizedPnl, curr)}
        </span>
      ),
      subtitle: (d, curr) => `Gross: ${formatSignedMoney(d.grossRealizedPnl, curr)}`,
      category: "pnl",
    },
    {
      key: "unrealizedPnl",
      title: "Unrealized P&L",
      renderValue: (d, curr) => (
        <span className={cn("text-xl font-bold font-mono tabular-nums tracking-tight", d.unrealizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
          {formatSignedMoney(d.unrealizedPnl, curr)}
        </span>
      ),
      subtitle: () => "Floating Open MTM",
      category: "pnl",
    },
    {
      key: "totalNetPnl",
      title: "Total Net P&L",
      renderValue: (d, curr) => (
        <span className={cn("text-xl font-bold font-mono tabular-nums tracking-tight", d.totalNetPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
          {formatSignedMoney(d.totalNetPnl, curr)}
        </span>
      ),
      subtitle: (d, curr) => `Fees Deducted: ${curr}${formatNumber(d.totalFees, 2)}`,
      category: "pnl",
    },
    {
      key: "totalTradingCapital",
      title: "Total Trading Capital",
      renderValue: (d, curr) => (
        <span className="text-xl font-bold font-mono text-[#EAF3FF] tabular-nums tracking-tight">
          {curr}{formatNumber(d.totalTradingCapital, 0)}
        </span>
      ),
      subtitle: () => "Account Equity Base",
      category: "capital",
    },
    {
      key: "allocatedCapital",
      title: "Allocated Capital",
      renderValue: (d, curr) => (
        <span className="text-xl font-bold font-mono text-[#00C9E8] tabular-nums tracking-tight">
          {curr}{formatNumber(d.allocatedCapital, 0)}
        </span>
      ),
      subtitle: () => "Dedicated Unit Budget",
      category: "capital",
    },
    {
      key: "availableCapital",
      title: "Available Capital",
      renderValue: (d, curr) => (
        <span className="text-xl font-bold font-mono text-[#00D6A0] tabular-nums tracking-tight">
          {curr}{formatNumber(d.availableCapital, 0)}
        </span>
      ),
      subtitle: () => "Ready for Order Routing",
      category: "capital",
    },
    {
      key: "usedMargin",
      title: "Used Margin",
      renderValue: (d, curr) => (
        <span className="text-xl font-bold font-mono text-[#FFB020] tabular-nums tracking-tight">
          {curr}{formatNumber(d.usedMargin, 2)}
        </span>
      ),
      subtitle: (d) => `Util: ${d.allocatedCapital > 0 ? ((d.usedMargin / d.allocatedCapital) * 100).toFixed(1) : "0"}%`,
      category: "capital",
    },
    {
      key: "freeMargin",
      title: "Free Margin",
      renderValue: (d, curr) => (
        <span className="text-xl font-bold font-mono text-[#EAF3FF] tabular-nums tracking-tight">
          {curr}{formatNumber(d.freeMargin, 2)}
        </span>
      ),
      subtitle: () => "Safety Buffer",
      category: "capital",
    },
    {
      key: "totalActivePositions",
      title: "Active Positions",
      renderValue: (d) => (
        <span className="text-xl font-bold font-mono text-[#EAF3FF] tabular-nums tracking-tight">
          {d.totalActivePositions} <span className="text-xs text-[#91A7C1] font-normal">Active</span>
        </span>
      ),
      subtitle: () => "Live Contract Exposure",
      category: "activity",
    },
    {
      key: "totalOpenOrders",
      title: "Total Open Orders",
      renderValue: (d) => (
        <span className="text-xl font-bold font-mono text-[#EAF3FF] tabular-nums tracking-tight">
          {d.totalOpenOrders} <span className="text-xs text-[#91A7C1] font-normal">Resting</span>
        </span>
      ),
      subtitle: () => "Pending Book Fills",
      category: "activity",
    },
    {
      key: "totalExecutedTrades",
      title: "Total Executed Trades",
      renderValue: (d) => (
        <span className="text-xl font-bold font-mono text-[#00C9E8] tabular-nums tracking-tight">
          {formatNumber(d.totalExecutedTrades, 0)} <span className="text-xs text-[#91A7C1] font-normal">Fills</span>
        </span>
      ),
      subtitle: () => "Completed Lifecycle",
      category: "activity",
    },
    {
      key: "winRatePct",
      title: "Win Rate",
      renderValue: (d) => (
        <span className={cn("text-xl font-bold font-mono tabular-nums tracking-tight", d.winRatePct >= 50 ? "text-[#00D6A0]" : "text-[#FFB020]")}>
          {d.winRatePct.toFixed(1)}%
        </span>
      ),
      subtitle: () => "Trade Win Probability",
      category: "performance",
    },
    {
      key: "profitFactor",
      title: "Profit Factor",
      renderValue: (d) => (
        <span className={cn("text-xl font-bold font-mono tabular-nums tracking-tight", d.profitFactor >= 1.5 ? "text-[#00D6A0]" : d.profitFactor >= 1 ? "text-[#00C9E8]" : "text-[#FF5268]")}>
          {d.profitFactor > 0 ? d.profitFactor.toFixed(2) : "1.00"}
        </span>
      ),
      subtitle: () => "Gross Profit / Gross Loss",
      category: "performance",
    },
    {
      key: "totalFees",
      title: "Total Trading Fees",
      renderValue: (d, curr) => (
        <span className="text-xl font-bold font-mono text-[#FFB020] tabular-nums tracking-tight">
          {curr}{formatNumber(d.totalFees, 2)}
        </span>
      ),
      subtitle: () => "Brokerage & Exchange",
      category: "performance",
    },
    {
      key: "maxDrawdownPct",
      title: "Maximum Drawdown",
      renderValue: (d) => (
        <span className="text-xl font-bold font-mono text-[#FF5268] tabular-nums tracking-tight">
          {d.maxDrawdownPct.toFixed(2)}%
        </span>
      ),
      subtitle: () => "Peak-to-Trough Variance",
      category: "performance",
    },
    {
      key: "dailyReturnPct",
      title: "Daily Return",
      renderValue: (d) => (
        <span className={cn("text-xl font-bold font-mono tabular-nums tracking-tight", d.dailyReturnPct >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
          {d.dailyReturnPct >= 0 ? "+" : ""}{d.dailyReturnPct.toFixed(2)}%
        </span>
      ),
      subtitle: () => "Session Equity Delta",
      category: "performance",
    },
  ];

  const toggleCard = (key: KpiCardKey) => {
    setVisibleCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-3 font-sans select-none">
      {/* Header & Customize Visibility Bar */}
      <div className="flex items-center justify-between pb-1 border-b border-[#1A2B43]/70">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#00C9E8]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Executive Performance Overview
          </h2>
          <span className="text-[10px] font-mono text-[#91A7C1]">
            • Reconciled with Authoritative Ledger
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-[#1A2B43] bg-[#050B16] text-[11px] font-mono text-[#91A7C1] hover:text-[#EAF3FF] hover:border-[#00C9E8]/40 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="h-3 w-3" />
          <span>Customize Cards</span>
        </button>
      </div>

      {/* Visibility Configuration Tray */}
      {showConfig && (
        <div className="rounded-[8px] bg-[#050B16] border border-[#1A2B43] p-3 text-xs font-mono grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 animate-fadeIn">
          {KPI_DEFINITIONS.map((def) => {
            const isVis = visibleCards[def.key];
            return (
              <button
                key={def.key}
                type="button"
                onClick={() => toggleCard(def.key)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-[4px] border text-[10px] font-semibold transition-colors cursor-pointer text-left",
                  isVis
                    ? "bg-[#0878FF]/20 border-[#0878FF]/40 text-[#00C9E8]"
                    : "bg-[#091426] border-[#1A2B43] text-[#91A7C1] opacity-60"
                )}
              >
                <span className="truncate">{def.title}</span>
                {isVis && <Check className="h-3 w-3 shrink-0 ml-1 text-[#00C9E8]" />}
              </button>
            );
          })}
        </div>
      )}

      {/* 16 KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {KPI_DEFINITIONS.filter((def) => visibleCards[def.key]).map((def) => (
          <div
            key={def.key}
            className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-3 flex flex-col justify-between min-h-[96px] hover:border-[#0878FF]/40 transition-colors shadow-sm"
          >
            <div className="text-[10px] font-bold text-[#91A7C1] uppercase tracking-wider font-mono truncate" title={def.title}>
              {def.title}
            </div>

            <div className="my-1">
              {def.renderValue(data, currencySymbol)}
            </div>

            <div className="pt-1 border-t border-[#1A2B43]/50 text-[10px] font-mono text-[#91A7C1] truncate" title={def.subtitle(data, currencySymbol)}>
              {def.subtitle(data, currencySymbol)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

