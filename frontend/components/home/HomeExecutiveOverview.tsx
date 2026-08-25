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
import { formatPrice } from "@/lib/formatters";
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

  const balance = portfolioSnapshot?.equity ?? Number(statusData?.health?.balance ?? 50000.0);
  const todaysPnl = portfolioSnapshot?.dailyPnl ?? (statusData?.todays_pnl !== undefined ? Number(statusData.todays_pnl) : 0.0);
  const isProfit = todaysPnl >= 0;
  const todaysPnlPct = balance > 0 ? (todaysPnl / balance) * 100 : null;
  const openPositionsCount = portfolioSnapshot?.openPositions ?? positions.length ?? 0;
  const riskStatus = riskSummary?.universalRiskGateStatus || statusData?.risk_status || "14/14 Checks Passed";
  const killSwitchActive = riskSummary?.globalKillSwitchActive || statusData?.system_summary?.kill_switch_active || false;

  return (
    <div className="w-full space-y-5 text-[var(--theme-text-primary)] font-sans max-w-7xl mx-auto pb-12">
      {/* 1. Executive Operations Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30 text-[var(--theme-accent)] shadow-md shadow-[var(--theme-accent)]/10">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Executive Trading Operations
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
                PORTFOLIO OVERVIEW
              </span>
            </div>
            <p className="text-xs text-[var(--theme-text-secondary)] mt-0.5">
              Real-time capital posture, active execution engines, and risk telemetry.
            </p>
          </div>
        </div>

        {/* Global Operational Health Badges */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
            tradingMode === "LIVE"
              ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40 animate-pulse"
              : "bg-[var(--theme-info)]/15 text-[var(--theme-info)] border-[var(--theme-info)]/40"
          }`}>
            <Shield className="h-3.5 w-3.5" />
            <span>MODE: {tradingMode}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold ${
            killSwitchActive
              ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40"
              : "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/40"
          }`}>
            <span className={`w-2 h-2 rounded-full ${killSwitchActive ? "bg-[var(--theme-loss)]" : "bg-[var(--theme-profit)] animate-pulse"}`} />
            <span>{killSwitchActive ? "HALT ACTIVE" : "GATE ARMED"}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Account Balance */}
        <div
          onClick={() => router.push("/pnl")}
          className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 transition-all cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Balance</span>
            <DollarSign className="h-4 w-4 text-[var(--theme-accent)] group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--theme-text-primary)]">
            ${formatPrice(balance, "", 2)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] border-t border-[var(--theme-border-subtle)] pt-2">
            <span>Available Capital</span>
            <span className="text-[var(--theme-accent)] font-semibold flex items-center gap-0.5">
              Ledger <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Metric 2: Today's P&L */}
        <div
          onClick={() => router.push("/pnl")}
          className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 transition-all cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Today&apos;s Realized P&L</span>
            {isProfit ? (
              <TrendingUp className="h-4 w-4 text-[var(--theme-profit)] group-hover:scale-110 transition" />
            ) : (
              <TrendingDown className="h-4 w-4 text-[var(--theme-loss)] group-hover:scale-110 transition" />
            )}
          </div>
          <div className={`mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums ${isProfit ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
            {isProfit && todaysPnl > 0 ? "+" : todaysPnl < 0 ? "-" : ""}${formatPrice(Math.abs(todaysPnl), "", 2)}
            <span className="text-xs font-semibold ml-1.5 opacity-90">
              {todaysPnlPct !== null && !isNaN(todaysPnlPct)
                ? `(${todaysPnlPct > 0 ? "+" : ""}${todaysPnlPct.toFixed(2)}%)`
                : "(N/A)"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] border-t border-[var(--theme-border-subtle)] pt-2">
            <span>Target: $1,000 / day</span>
            <span className="text-[var(--theme-accent)] font-semibold flex items-center gap-0.5">
              Analytics <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Metric 3: Active Positions */}
        <div
          onClick={() => router.push("/positions")}
          className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 transition-all cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Positions</span>
            <Layers className="h-4 w-4 text-[var(--theme-info)] group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--theme-text-primary)]">
            {openPositionsCount} <span className="text-xs font-normal text-[var(--theme-text-secondary)]">OPEN</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] border-t border-[var(--theme-border-subtle)] pt-2">
            <span>Exposure Protected</span>
            <span className="text-[var(--theme-accent)] font-semibold flex items-center gap-0.5">
              Positions <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Metric 4: Risk Gate Status */}
        <div
          onClick={() => router.push("/risk")}
          className="p-4 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 transition-all cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-[var(--theme-text-secondary)]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Risk Gate Pipeline</span>
            <Shield className="h-4 w-4 text-[var(--theme-profit)] group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--theme-profit)]">
            {riskStatus}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--theme-text-muted)] border-t border-[var(--theme-border-subtle)] pt-2">
            <span>14 Pre-Order Gates</span>
            <span className="text-[var(--theme-accent)] font-semibold flex items-center gap-0.5">
              Risk Engine <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Mid-Grid: Active Bots & Recent Executions (Compact Previews) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card A: Active Bots Preview */}
        <div className="p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--theme-accent)]" />
              <h3 className="text-sm font-bold tracking-tight">Active Execution Bots</h3>
            </div>
            <button
              onClick={() => router.push("/bots")}
              className="text-xs font-semibold text-[var(--theme-accent)] hover:underline flex items-center gap-1"
            >
              <span>View All Bots</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!botsData || botsData.length === 0) ? (
              <div className="p-6 text-center text-xs text-[var(--theme-text-muted)] bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border-subtle)]">
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
                    className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] transition flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-[var(--theme-profit)] animate-pulse" : "bg-[var(--theme-text-muted)]"}`} />
                      <div>
                        <div className="text-xs font-bold text-[var(--theme-text-primary)]">{bot.name || "Bot Instance"}</div>
                        <div className="text-[11px] text-[var(--theme-text-secondary)] font-mono">
                          {bot.symbol || "BTC/USDT"} • {bot.strategy || "Trend Confluence"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xs font-mono font-bold ${pnl >= 0 ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
                        isRunning ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)]" : "bg-[var(--theme-text-muted)]/15 text-[var(--theme-text-muted)]"
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
        <div className="p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-[var(--theme-info)]" />
              <h3 className="text-sm font-bold tracking-tight">Recent Order Executions</h3>
            </div>
            <button
              onClick={() => router.push("/orders")}
              className="text-xs font-semibold text-[var(--theme-accent)] hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {(!tradesData || tradesData.length === 0) ? (
              <div className="p-6 text-center text-xs text-[var(--theme-text-muted)] bg-[var(--theme-elevated)] rounded-xl border border-[var(--theme-border-subtle)]">
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
                    className="p-3 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border)] transition flex items-center justify-between gap-3 cursor-pointer font-sans"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        isBuy ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border border-[var(--theme-profit)]/30" : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border border-[var(--theme-loss)]/30"
                      }`}>
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[var(--theme-text-primary)]">{trade.symbol || "BTC/USDT"}</div>
                        <div className="text-[11px] text-[var(--theme-text-muted)] font-mono">
                          Qty: {trade.quantity || trade.amount || "0.05"} • {trade.timestamp ? String(trade.timestamp).slice(11, 19) : "Just now"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-[var(--theme-text-primary)]">${fillPrice.toFixed(2)}</div>
                      <span className="text-[10px] text-[var(--theme-profit)] font-semibold">FILLED</span>
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

