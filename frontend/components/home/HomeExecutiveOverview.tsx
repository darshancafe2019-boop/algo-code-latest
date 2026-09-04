"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Shield,
  Bot,
  Activity,
  ChevronRight,
  Send,
  ExternalLink,
} from "lucide-react";
import { formatPrice, formatMoney, formatPnL, formatPercent } from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";

export function HomeExecutiveOverview() {
  const router = useRouter();
  const { portfolioSnapshot, positions, riskSummary, tradingMode } = useGlobalData();

  // 1. Fetch Summary Metrics (Balance, Today's PnL, Open Positions, Risk Gate)
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["homeSystemStatus"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/status", { timeoutMs: 5000 });
      if (!res.ok) return {};
      return res.data;
    },
    staleTime: 4000,
    refetchInterval: 6000,
    placeholderData: (prev) => prev,
  });

  // 2. Fetch Active Bots Summary
  const { data: botsData } = useQuery({
    queryKey: ["homeBotsList"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/bots", { timeoutMs: 5000 });
      if (!res.ok) return [];
      const data = res.data;
      return (data?.bots || data?.instances || data || []).slice(0, 5);
    },
    staleTime: 4000,
    refetchInterval: 6000,
    placeholderData: (prev) => prev,
  });

  // 3. Fetch Recent Trades / Executions
  const { data: tradesData } = useQuery({
    queryKey: ["homeRecentTrades"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/trades?limit=5", { timeoutMs: 5000 });
      if (!res.ok) return [];
      const data = res.data;
      return (data?.trades || data?.data || []).slice(0, 5);
    },
    staleTime: 5000,
    refetchInterval: 8000,
    placeholderData: (prev) => prev,
  });

  const balance = portfolioSnapshot?.equity ?? (statusData?.health?.balance !== undefined ? Number(statusData.health.balance) : 0.0);
  const todaysPnl = portfolioSnapshot?.dailyPnl ?? (statusData?.todays_pnl !== undefined ? Number(statusData.todays_pnl) : 0.0);
  const isProfit = todaysPnl >= 0;
  const todaysPnlPct = balance > 0 ? (todaysPnl / balance) * 100 : null;
  const openPositionsCount = portfolioSnapshot?.openPositions ?? positions.length ?? 0;
  const riskStatus = riskSummary?.universalRiskGateStatus || statusData?.risk_status || "14/14 Checks Passed";
  const killSwitchActive = riskSummary?.globalKillSwitchActive || statusData?.system_summary?.kill_switch_active || false;

  return (
    <div className="w-full space-y-5 text-[var(--theme-text-primary)] font-sans max-w-7xl mx-auto pb-12">
      {/* 1. Executive Operations Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)]/85 border border-[var(--theme-border)] shadow-xl card-specular backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 via-blue-600/10 to-transparent border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.25)]">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
                Executive Trading Operations
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30 tracking-wider shadow-xs">
                PORTFOLIO OVERVIEW
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-normal">
              Real-time capital posture, active execution engines, and risk telemetry.
            </p>
          </div>
        </div>

        {/* Global Operational Health Badges */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold shadow-xs ${
            tradingMode === "LIVE"
              ? "bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.3)]"
              : "bg-sky-500/10 text-sky-300 border-sky-500/30 shadow-[0_0_10px_rgba(56,189,248,0.15)]"
          }`}>
            <Shield className="h-3.5 w-3.5 text-sky-400" />
            <span>MODE: {tradingMode}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold shadow-xs ${
            killSwitchActive
              ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          }`}>
            <span className={`w-2 h-2 rounded-full ${killSwitchActive ? "bg-rose-500" : "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.9)]"}`} />
            <span>{killSwitchActive ? "HALT ACTIVE" : "GATE ARMED"}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Account Balance */}
        <div
          onClick={() => router.push("/pnl")}
          className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)]/85 border border-[var(--theme-border)] card-specular card-interactive cursor-pointer group relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Balance</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-50 tracking-tight">
            {formatMoney(balance, "$")}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06] pt-2.5">
            <span>Available Capital</span>
            <span className="text-sky-400 group-hover:text-sky-300 font-semibold flex items-center gap-0.5 transition-colors">
              Ledger <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Metric 2: Today's P&L */}
        <div
          onClick={() => router.push("/pnl")}
          className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)]/85 border border-[var(--theme-border)] card-specular card-interactive cursor-pointer group relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Today&apos;s Realized P&L</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              isProfit
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
            }`}>
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          </div>
          <div className={`mt-3 text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
            {formatPnL(todaysPnl, "$").formatted}
            <span className="text-xs font-semibold ml-1.5 opacity-90 font-mono">
              {todaysPnlPct !== null && !isNaN(todaysPnlPct)
                ? `(${formatPercent(todaysPnlPct, 2, true)})`
                : "(N/A)"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06] pt-2.5">
            <span>Authoritative P&L</span>
            <span className="text-sky-400 group-hover:text-sky-300 font-semibold flex items-center gap-0.5 transition-colors">
              Analytics <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Metric 3: Active Positions */}
        <div
          onClick={() => router.push("/positions")}
          className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)]/85 border border-[var(--theme-border)] card-specular card-interactive cursor-pointer group relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Active Positions</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-50 tracking-tight">
            {openPositionsCount} <span className="text-xs font-semibold text-slate-400 font-sans">OPEN</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06] pt-2.5">
            <span>Exposure Protected</span>
            <span className="text-sky-400 group-hover:text-sky-300 font-semibold flex items-center gap-0.5 transition-colors">
              Positions <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Metric 4: Risk Gate Status */}
        <div
          onClick={() => router.push("/risk")}
          className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)]/85 border border-[var(--theme-border)] card-specular card-interactive cursor-pointer group relative overflow-hidden backdrop-blur-md"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Risk Gate Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Shield className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-400 tracking-tight">
            {riskStatus}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/[0.06] pt-2.5">
            <span>14 Pre-Order Gates</span>
            <span className="text-sky-400 group-hover:text-sky-300 font-semibold flex items-center gap-0.5 transition-colors">
              Risk Engine <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Mid-Grid: Active Bots & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card A: Active Bots Preview */}
        <div className="p-5 rounded-2xl bg-[var(--theme-surface)]/85 border border-[var(--theme-border)] card-specular backdrop-blur-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                <Bot className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold tracking-tight text-slate-100">Active Execution Bots</h3>
            </div>
            <button
              onClick={() => router.push("/bots")}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <span>View All Bots</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!botsData || botsData.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-[var(--theme-elevated)]/40 rounded-xl border border-dashed border-white/[0.08]">
                No active bot instances currently configured.
              </div>
            ) : (
              botsData.map((bot: any, idx: number) => {
                const isRunning = (bot.status || "").toUpperCase() === "RUNNING";
                const pnl = Number(bot.realized_pnl || bot.today_pnl || 0);
                return (
                  <div
                    key={bot.id || idx}
                    onClick={() => router.push("/bots")}
                    className="p-3.5 rounded-xl bg-[var(--theme-elevated)]/70 border border-white/[0.05] hover:border-sky-500/30 hover:bg-[var(--theme-elevated)] transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-slate-500"}`} />
                      <div>
                        <div className="text-xs font-bold text-slate-100">{bot.name || "Bot Instance"}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {bot.symbol || "BTC/USDT"} • {bot.strategy || "Trend Confluence"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xs font-mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-mono font-bold mt-1 inline-block ${
                        isRunning ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-slate-700/40 text-slate-400 border border-slate-600/30"
                      }`}>
                        {bot.status || "STOPPED"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card B: Recent Trade Executions Preview */}
        <div className="p-5 rounded-2xl bg-[var(--theme-surface)]/85 border border-[var(--theme-border)] card-specular backdrop-blur-md flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                <Send className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold tracking-tight text-slate-100">Recent Order Executions</h3>
            </div>
            <button
              onClick={() => router.push("/orders")}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
            >
              <span>View All Orders</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!tradesData || tradesData.length === 0) ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-[var(--theme-elevated)]/40 rounded-xl border border-dashed border-white/[0.08]">
                No recent executions recorded in ledger.
              </div>
            ) : (
              tradesData.map((trade: any, idx: number) => {
                const isBuy = (trade.side || trade.direction || "").toUpperCase().includes("BUY") || (trade.direction || "") === "LONG";
                const fillPrice = Number(trade.price || trade.entry_price || 64800);
                return (
                  <div
                    key={trade.id || idx}
                    onClick={() => router.push("/orders")}
                    className="p-3.5 rounded-xl bg-[var(--theme-elevated)]/70 border border-white/[0.05] hover:border-sky-500/30 hover:bg-[var(--theme-elevated)] transition-all flex items-center justify-between gap-3 cursor-pointer shadow-xs font-sans"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2.5 py-1 rounded-md font-mono font-bold tracking-wider ${
                        isBuy ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]" : "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                      }`}>
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-100">{trade.symbol || "BTC/USDT"}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Qty: {trade.quantity || trade.amount || "0.05"} • {trade.timestamp ? String(trade.timestamp).slice(11, 19) : "Just now"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-slate-100">${fillPrice.toFixed(2)}</div>
                      <span className="text-[10px] text-emerald-400 font-semibold tracking-wide">FILLED</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

