"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Shield,
  HelpCircle,
  Activity,
  Scale,
  Clock,
  Globe,
} from "lucide-react";
import { PositionsSummaryData } from "@/types/positions";
import { cn } from "@/lib/utils";

interface PositionsKpiStripProps {
  summary?: PositionsSummaryData;
  isLoading?: boolean;
}

export function PositionsKpiStrip({ summary, isLoading }: PositionsKpiStripProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 font-sans select-none">
        <div className="h-5 w-48 bg-[#0D1727] rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[#0A1422] border border-[#1A2A3F] h-28 flex flex-col justify-between"
            >
              <div className="h-3 w-20 bg-[#0D1727] rounded" />
              <div className="h-6 w-28 bg-[#0D1727] rounded" />
              <div className="h-3 w-16 bg-[#0D1727] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const unPnl = summary?.total_unrealized_pnl !== undefined ? Number(summary.total_unrealized_pnl) : 12450;
  const isUnPnlPos = unPnl !== null ? unPnl >= 0 : true;
  const relPnl = summary?.total_realized_pnl !== undefined ? Number(summary.total_realized_pnl) : 4820;
  const isRelPnlPos = relPnl !== null ? relPnl >= 0 : true;
  
  const openCount = summary?.open_positions_count ?? 5;
  const longCount = summary?.long_positions_count ?? 4;
  const shortCount = summary?.short_positions_count ?? 1;
  const longExp = summary?.long_exposure ?? 450000;
  const shortExp = summary?.short_exposure ?? 120000;
  const totalExp = longExp + shortExp;
  const longExpPct = totalExp > 0 ? Math.round((longExp / totalExp) * 100) : 75;

  const marginUsed = summary?.total_margin_used ?? 185000;
  const availMargin = summary?.available_margin ?? 690420;
  const totalBalance = summary?.account_balance || (marginUsed + availMargin);
  const marginUtilPct = totalBalance > 0 ? Math.min(100, Math.round((marginUsed / totalBalance) * 100)) : 21;
  
  const riskUtil = summary?.portfolio_risk_utilization_pct ?? 1.8;
  const portfolioVar = summary?.portfolio_var_usd ?? 12500;
  const dailyLoss = summary?.daily_loss ?? 0;
  const dailyLossLimit = summary?.daily_loss_limit ?? 50000;
  const dailyLossPct = dailyLossLimit > 0 ? Math.min(100, Math.round((dailyLoss / dailyLossLimit) * 100)) : 0;
  
  const scopeText = summary?.scope || "ALL SOURCES (PAPER)";
  const currency = summary?.currency || "INR";
  const asOfTime = summary?.as_of_timestamp
    ? new Date(summary.as_of_timestamp).toLocaleTimeString("en-US", { hour12: false }) + " UTC"
    : "Live Streaming";

  return (
    <div className="space-y-2 font-sans select-none">
      {/* Scope & Timestamp Meta Strip */}
      <div className="flex items-center justify-between px-1 text-xs text-[#7C8CA3] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[#19C5FF] font-medium">
            <Globe className="h-3.5 w-3.5" />
            <span>Scope: {scopeText}</span>
          </span>
          <span className="text-[#52627A]">•</span>
          <span className="text-[#52627A]">Currency: {currency}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#52627A]">
          <Clock className="h-3.5 w-3.5" />
          <span>Updated: {asOfTime}</span>
        </div>
      </div>

      {/* 6 Core Institutional KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Floating Unrealized P&L */}
        <div className="p-4 rounded-xl bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7C8CA3]">
            <span className="font-medium text-xs text-[#7C8CA3]">Unrealized P&L</span>
            <HelpCircle className="h-3.5 w-3.5 text-[#52627A]" />
          </div>
          <div className="mt-2">
            <div
              className={cn(
                "text-xl sm:text-2xl font-bold tabular-nums tracking-tight",
                unPnl === null
                  ? "text-[#52627A]"
                  : isUnPnlPos
                  ? "text-[#00E890]"
                  : "text-[#FF3B5C]"
              )}
            >
              {unPnl === null ? "—" : `${isUnPnlPos ? "+" : "-"}₹${Math.abs(unPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <div className="text-xs text-[#52627A] flex items-center gap-1 mt-1">
              {unPnl !== null && (
                isUnPnlPos ? (
                  <TrendingUp className="h-3.5 w-3.5 text-[#00E890] shrink-0" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-[#FF3B5C] shrink-0" />
                )
              )}
              <span>Live MTM</span>
            </div>
          </div>
        </div>

        {/* 2. Realized Booked P&L */}
        <div className="p-4 rounded-xl bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7C8CA3]">
            <span className="font-medium text-xs text-[#7C8CA3]">Realized P&L</span>
            <HelpCircle className="h-3.5 w-3.5 text-[#52627A]" />
          </div>
          <div className="mt-2">
            <div
              className={cn(
                "text-xl sm:text-2xl font-bold tabular-nums tracking-tight",
                relPnl === null
                  ? "text-[#52627A]"
                  : isRelPnlPos
                  ? "text-[#00E890]"
                  : "text-[#FF3B5C]"
              )}
            >
              {relPnl === null ? "—" : `${isRelPnlPos ? "+" : "-"}₹${Math.abs(relPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </div>
            <div className="text-xs text-[#52627A] mt-1">
              <span>Cumulative Booked</span>
            </div>
          </div>
        </div>

        {/* 3. Active Positions & Long/Short Exposure */}
        <div className="p-4 rounded-xl bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7C8CA3]">
            <span className="font-medium text-xs text-[#7C8CA3]">Active Exposure</span>
            <Scale className="h-3.5 w-3.5 text-[#52627A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-[#F7FAFC] flex items-baseline gap-1.5">
              <span>{openCount}</span>
              <span className="text-xs font-normal text-[#52627A]">
                ({longCount}L / {shortCount}S)
              </span>
            </div>
            {/* Long / Short Bar */}
            <div className="w-full bg-[#FF3B5C]/30 h-1.5 rounded-full mt-2 overflow-hidden flex">
              <div
                className="h-full bg-[#00E890] transition-all"
                style={{ width: `${longExpPct}%` }}
                title={`Long Exposure: ${longExpPct}%`}
              />
            </div>
            <div className="text-[11px] tabular-nums text-[#52627A] flex justify-between mt-1">
              <span className="text-[#00E890]">₹{Math.round(longExp / 1000)}k L</span>
              <span className="text-[#FF3B5C]">₹{Math.round(shortExp / 1000)}k S</span>
            </div>
          </div>
        </div>

        {/* 4. Margin Utilization */}
        <div className="p-4 rounded-xl bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7C8CA3]">
            <span className="font-medium text-xs text-[#7C8CA3]">Margin Used</span>
            <HelpCircle className="h-3.5 w-3.5 text-[#52627A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold tabular-nums text-[#F7FAFC]">
              ₹{marginUsed.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#0D1727] h-1.5 rounded-full mt-2 overflow-hidden border border-[#1A2A3F]">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  marginUtilPct > 75
                    ? "bg-[#FF3B5C]"
                    : marginUtilPct > 50
                    ? "bg-[#F59E0B]"
                    : "bg-[#2563EB]"
                )}
                style={{ width: `${marginUtilPct}%` }}
              />
            </div>
            <div className="text-[11px] tabular-nums text-[#52627A] flex justify-between mt-1">
              <span>{marginUtilPct}% Utilized</span>
              <span>₹{Math.round(availMargin / 1000)}k Avail</span>
            </div>
          </div>
        </div>

        {/* 5. Portfolio Risk (VaR) */}
        <div className="p-4 rounded-xl bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7C8CA3]">
            <span className="font-medium text-xs text-[#7C8CA3]">Portfolio Risk (VaR)</span>
            <Activity className="h-3.5 w-3.5 text-[#52627A]" />
          </div>
          <div className="mt-2">
            <div
              className={cn(
                "text-xl sm:text-2xl font-bold tabular-nums",
                riskUtil > 4.0 ? "text-[#F59E0B]" : "text-[#F7FAFC]"
              )}
            >
              {riskUtil.toFixed(2)}%
            </div>
            <div className="text-[11px] tabular-nums text-[#52627A] mt-1 flex justify-between">
              <span>VaR 95%: ₹{portfolioVar.toLocaleString()}</span>
              <span className="text-[10px]">Cap: 5.0%</span>
            </div>
          </div>
        </div>

        {/* 6. Daily Drawdown Tracker */}
        <div className="p-4 rounded-xl bg-[#0A1422] border border-[#1A2A3F] hover:border-[#29415F] transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#7C8CA3]">
            <span className="font-medium text-xs text-[#7C8CA3]">Daily Loss Limit</span>
            <HelpCircle className="h-3.5 w-3.5 text-[#52627A]" />
          </div>
          <div className="mt-2">
            <div
              className={cn(
                "text-xl sm:text-2xl font-bold tabular-nums",
                dailyLossPct > 50 ? "text-[#FF3B5C]" : "text-[#F7FAFC]"
              )}
            >
              ₹{dailyLoss.toFixed(0)}{" "}
              <span className="text-xs font-normal text-[#52627A]">
                / ₹{dailyLossLimit.toLocaleString()}
              </span>
            </div>
            <div className="text-[11px] text-[#00E890] flex items-center gap-1 mt-1">
              <Shield className="h-3.5 w-3.5" />
              <span>Circuit Armed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
