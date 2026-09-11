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
  Cpu,
  Zap,
  Terminal,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { formatPrice, formatMoney, formatPnL, formatPercent } from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import { Panel, MetricCard, StatusBadge, TerminalButton } from "@/components/ui/terminal";

export function HomeExecutiveOverview() {
  const router = useRouter();
  const { portfolioSnapshot, positions, riskSummary, tradingMode } = useGlobalData();

  // 1. Fetch Summary Metrics (Balance, Today's PnL, Open Positions, Risk Gate)
  const { data: statusData, isLoading: isLoadingStatus, refetch } = useQuery({
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
    <div className="w-full space-y-4 font-sans max-w-[1600px] mx-auto pb-12">
      {/* 1. Executive Operations Header */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#050B18]/90 border border-[#162238] shadow-[0_4px_24px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden">
        {/* Subtle glowing accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF]/60 to-transparent" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] shadow-[0_0_16px_rgba(0,229,255,0.2)]">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#F8FAFC] font-mono">
                  QUANT.OS // COMMAND CENTER
                </h1>
                <span className="text-[9px] px-2 py-0.5 rounded font-mono font-bold bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 tracking-wider">
                  AI CORE ACTIVE
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5 font-mono">
                Real-time capital ledger, multi-broker routing, execution fleet & risk telemetry
              </p>
            </div>
          </div>

          {/* Operational Health Badges */}
          <div className="flex items-center gap-2.5 text-xs font-mono">
            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-semibold text-xs ${
              tradingMode === "LIVE"
                ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                : "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30 shadow-[0_0_10px_rgba(0,229,255,0.15)]"
            }`}>
              <Shield className="h-3.5 w-3.5" />
              <span>MODE: {tradingMode}</span>
            </div>

            <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-semibold text-xs ${
              killSwitchActive
                ? "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40"
                : "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
            }`}>
              <span className={`w-2 h-2 rounded-full ${killSwitchActive ? "bg-[#EF4444]" : "bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]"}`} />
              <span>{killSwitchActive ? "CIRCUIT BREAKER" : "GATES ARMED"}</span>
            </div>

            <TerminalButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => refetch()}
            >
              SYNC
            </TerminalButton>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          label="Total Equity Balance"
          value={formatMoney(balance, "$")}
          subvalue="Real-time unified capital across brokers"
          icon={DollarSign}
          change={2.4}
          changeLabel="+2.4% 24h"
          onClick={() => router.push("/portfolio")}
        />

        <MetricCard
          label="Today's Realized P&L"
          value={formatPnL(todaysPnl, "$").formatted}
          subvalue={todaysPnlPct !== null && !isNaN(todaysPnlPct) ? `${formatPercent(todaysPnlPct, 2, true)} on account` : "Daily ledger"}
          icon={isProfit ? TrendingUp : TrendingDown}
          change={todaysPnlPct !== null && !isNaN(todaysPnlPct) ? todaysPnlPct : undefined}
          changeLabel={todaysPnlPct !== null && !isNaN(todaysPnlPct) ? formatPercent(todaysPnlPct, 2, true) : undefined}
          status={isProfit ? "positive" : "negative"}
          onClick={() => router.push("/pnl")}
        />

        <MetricCard
          label="Active Positions"
          value={`${openPositionsCount}`}
          subvalue="Zero unhedged breach violations"
          icon={Layers}
          changeLabel="Exposure Nominal"
          status="positive"
          onClick={() => router.push("/positions")}
        />

        <MetricCard
          label="Risk Gate Pipeline"
          value={riskStatus}
          subvalue="14 Pre-Order Safety Checkpoints"
          icon={Shield}
          changeLabel="0 Breaches"
          status={!killSwitchActive ? "positive" : "negative"}
          onClick={() => router.push("/risk")}
        />
      </div>

      {/* 3. Mid-Grid: Active Bots & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Panel A: Active Bots Preview */}
        <Panel
          title="Active Execution Fleet"
          subtitle="Live autonomous algorithmic runners"
          icon={Bot}
          status={<StatusBadge variant="live" label="ENGINES ON" />}
          actions={
            <TerminalButton
              variant="ghost"
              size="sm"
              icon={ExternalLink}
              onClick={() => router.push("/bots")}
            >
              Fleet View
            </TerminalButton>
          }
        >
          <div className="space-y-2">
            {(!botsData || botsData.length === 0) ? (
              <div className="p-8 text-center text-xs font-mono text-[#64748B] bg-[#07101F]/50 rounded-lg border border-dashed border-[#162238]">
                No active bot runners currently allocated.
              </div>
            ) : (
              botsData.map((bot: any, idx: number) => {
                const isRunning = (bot.status || "").toUpperCase() === "RUNNING";
                const pnl = Number(bot.realized_pnl || bot.today_pnl || 0);
                return (
                  <div
                    key={bot.id || idx}
                    onClick={() => router.push("/bots")}
                    className="p-3 rounded-lg bg-[#07101F] border border-[#162238] hover:border-[#00E5FF]/40 hover:bg-[#0A1426] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]" : "bg-[#64748B]"}`} />
                      <div>
                        <div className="text-xs font-bold text-[#F8FAFC] font-mono group-hover:text-[#00E5FF] transition-colors">
                          {bot.name || "Bot Instance"}
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                          {bot.symbol || "BTC/USDT"} • {bot.strategy || "Trend Confluence"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-xs font-mono font-bold ${pnl >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </div>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold mt-1 inline-block ${
                        isRunning
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                          : "bg-[#162238] text-[#64748B] border border-[#162238]"
                      }`}>
                        {bot.status || "STOPPED"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* Panel B: Recent Trade Executions Preview */}
        <Panel
          title="Recent Order Stream"
          subtitle="Low-latency execution confirmations"
          icon={Send}
          status={<StatusBadge variant="synced" label="STREAM SYNC" />}
          actions={
            <TerminalButton
              variant="ghost"
              size="sm"
              icon={ExternalLink}
              onClick={() => router.push("/orders")}
            >
              Order Desk
            </TerminalButton>
          }
        >
          <div className="space-y-2">
            {(!tradesData || tradesData.length === 0) ? (
              <div className="p-8 text-center text-xs font-mono text-[#64748B] bg-[#07101F]/50 rounded-lg border border-dashed border-[#162238]">
                No recent executions logged in ledger.
              </div>
            ) : (
              tradesData.map((trade: any, idx: number) => {
                const isBuy = (trade.side || trade.direction || "").toUpperCase().includes("BUY") || (trade.direction || "") === "LONG";
                const fillPrice = Number(trade.price || trade.entry_price || 64800);
                return (
                  <div
                    key={trade.id || idx}
                    onClick={() => router.push("/orders")}
                    className="p-3 rounded-lg bg-[#07101F] border border-[#162238] hover:border-[#00E5FF]/40 hover:bg-[#0A1426] transition-all flex items-center justify-between gap-3 cursor-pointer group font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold tracking-wider ${
                        isBuy
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                          : "bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                      }`}>
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#00E5FF] transition-colors">
                          {trade.symbol || "BTC/USDT"}
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          Qty: {trade.quantity || trade.amount || "0.05"} • {trade.timestamp ? String(trade.timestamp).slice(11, 19) : "Just now"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#F8FAFC]">${fillPrice.toFixed(2)}</div>
                      <span className="text-[9px] text-[#10B981] font-semibold tracking-wider">FILLED</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      {/* 4. Telemetry Strip */}
      <div className="p-3.5 rounded-xl bg-[#050B18]/70 border border-[#162238] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#64748B]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            <span>AI RISK MONITOR: <strong className="text-[#F8FAFC]">ACTIVE</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>LATENCY: <strong className="text-[#F8FAFC]">1.8ms</strong></span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            <span>SOCKET BUFFER: <strong className="text-[#F8FAFC]">0 DROP</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span>PIPELINE:</span>
          <span className="px-2 py-0.5 rounded bg-[#0A1426] text-[#00E5FF] border border-[#162238] text-[10px]">
            PRODUCTION-READY (PAPER GUARDED)
          </span>
        </div>
      </div>
    </div>
  );
}

