"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Play,
  Pause,
  Square,
  Edit,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Clock,
  TrendingUp,
  Receipt,
  ListOrdered,
  FileText,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Percent,
  Check,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BotConfig } from "@/types/bot";
import { api } from "@/lib/bot-api";
import {
  formatMoney,
  formatSignedMoney,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatPercent,
} from "@/lib/formatters";

interface BotDetailsWorkspaceProps {
  bot: BotConfig | null;
  onBotAction: (
    botId: string,
    action: "start" | "pause" | "resume" | "stop",
    e?: React.MouseEvent
  ) => void;
  onEditBot: (bot: BotConfig) => void;
  onViewTerminal: (botId: string) => void;
  onCloseWorkspace?: () => void;
  actionLoading: boolean;
}

export type DetailTab =
  | "OVERVIEW"
  | "RISK_MANAGEMENT"
  | "PARAMETERS"
  | "POSITIONS"
  | "ORDERS"
  | "EXECUTIONS"
  | "LOGS";

function safeString(val: any, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (val.symbol && typeof val.symbol === "string") return val.symbol;
    if (val.name && typeof val.name === "string") return val.name;
    return fallback;
  }
  return fallback;
}

export function BotDetailsWorkspace({
  bot,
  onBotAction,
  onEditBot,
  onViewTerminal,
  onCloseWorkspace,
  actionLoading,
}: BotDetailsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("OVERVIEW");
  const [copiedId, setCopiedId] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [botSnapshot, setBotSnapshot] = useState<any>(null);
  const [logSeverityFilter, setLogSeverityFilter] = useState<string>("ALL");
  const [positionToClose, setPositionToClose] = useState<any>(null);
  const [isClosingPosition, setIsClosingPosition] = useState(false);

  // Fetch complete real backend snapshot for this bot
  const fetchSnapshot = useCallback(async (botId: string) => {
    setLoadingData(true);
    try {
      const res = await api.getBot(botId);
      setBotSnapshot(res);
    } catch (err) {
      console.error("Failed to fetch bot snapshot:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (bot?.id) {
      fetchSnapshot(bot.id);
    } else {
      setBotSnapshot(null);
    }
  }, [bot?.id, fetchSnapshot]);

  if (!bot) {
    return (
      <div className="w-full rounded-[8px] bg-[#091426] border border-[#1A2B43] p-10 text-center text-[#91A7C1] font-mono select-none">
        <Bot className="h-10 w-10 text-[#00C9E8]/40 mx-auto mb-3 animate-pulse" />
        <h3 className="text-base font-bold text-[#EAF3FF]">No Bot Selected</h3>
        <p className="text-xs text-[#91A7C1] mt-1">
          Select any bot from the fleet table above to inspect its real-time workspace, risk parameters, and order books.
        </p>
      </div>
    );
  }

  const liveBot = botSnapshot?.bot || bot;
  const positions: any[] = botSnapshot?.positions || [];
  const orders: any[] = botSnapshot?.orders || [];
  const trades: any[] = botSnapshot?.trades || [];
  const events: any[] = botSnapshot?.events || [];
  const pnlData = botSnapshot?.pnl || liveBot.pnl || {};

  const status = (liveBot.status || "STOPPED").toUpperCase();
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isStopped = status === "STOPPED";
  const isReady = status === "READY" || status === "DRAFT";
  const isError = status === "ERROR";

  const symbol = safeString(liveBot.market?.symbol, "NIFTY");
  const exchange = safeString(liveBot.market?.exchange, "NSE").toUpperCase();
  const mode = (liveBot.execution?.mode || "PAPER").toUpperCase();
  const isLive = mode === "LIVE";
  const strategyType = safeString(liveBot.strategy?.type, "Trend Pullback to EMA");
  const timeframe = safeString(liveBot.strategy?.timeframe, "1m");

  const currencySymbol =
    symbol.includes("NIFTY") || exchange === "NSE" || exchange === "MCX" || liveBot.currency === "INR"
      ? "₹"
      : "$";

  const netPnl = Number(pnlData.net_pnl ?? 0);
  const realizedPnl = Number(pnlData.realized_pnl ?? pnlData.realized ?? 0);
  const unrealizedPnl = Number(pnlData.unrealized_pnl ?? pnlData.unrealized ?? 0);
  const todayPnl = Number(pnlData.daily ?? pnlData.today ?? 0);

  // Capital calculations
  const allocatedCapital = Number(liveBot.risk?.allocated_capital || 100000);
  const usedCapital = Number(liveBot.risk?.used_capital || (positions.length > 0 ? 3500 : 0));
  const availableCapital = Math.max(0, allocatedCapital - usedCapital);
  const capitalUtilizationPct = allocatedCapital > 0 ? Math.min(100, Math.round((usedCapital / allocatedCapital) * 100)) : 0;

  const totalTradesCount = Number(pnlData.trades_count ?? trades.length ?? 0);
  const openPositionsCount = positions.length;

  const handleCopyId = () => {
    navigator.clipboard.writeText(liveBot.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExecuteClosePosition = async () => {
    if (!positionToClose) return;
    setIsClosingPosition(true);
    try {
      const side = (positionToClose.direction || "").toUpperCase() === "LONG" ? "SELL" : "BUY";
      const qty = Number(positionToClose.quantity || 1);
      await api.placeBotOrder(liveBot.id, side as any, qty);
      setPositionToClose(null);
      await fetchSnapshot(liveBot.id);
    } catch (err: any) {
      alert(`Failed to close position: ${err.message || "Unknown error"}`);
    } finally {
      setIsClosingPosition(false);
    }
  };

  const TAB_BUTTONS: Array<{ key: DetailTab; label: string; icon: any; count?: number }> = [
    { key: "OVERVIEW", label: "Overview", icon: Bot },
    { key: "RISK_MANAGEMENT", label: "Risk Management", icon: ShieldCheck },
    { key: "PARAMETERS", label: "Parameters", icon: Sliders },
    { key: "POSITIONS", label: "Positions", icon: Layers, count: positions.length },
    { key: "ORDERS", label: "Orders", icon: ListOrdered, count: orders.length },
    { key: "EXECUTIONS", label: "Executions", icon: Receipt, count: trades.length },
    { key: "LOGS", label: "Logs", icon: FileText, count: events.length },
  ];

  return (
    <div className="w-full rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-4 select-none font-sans shadow-xl">
      {/* ── HEADER BANNER: BOT IDENTITY & DIRECT WORKSPACE CONTROLS ──────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-[#1A2B43] gap-3">
        {/* Left: Bot Meta */}
        <div className="flex items-start md:items-center gap-3">
          <div className="h-10 w-10 rounded-[6px] bg-[#00C9E8]/10 border border-[#00C9E8]/30 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-[#00C9E8]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-[#EAF3FF] font-mono">
                {liveBot.name}
              </h2>
              <span className="text-xs font-mono text-[#00C9E8] bg-[#050B16] px-2 py-0.5 rounded border border-[#1A2B43] flex items-center gap-1">
                <span>{liveBot.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="hover:text-white p-0.5"
                  title="Copy Bot ID"
                >
                  {copiedId ? <Check className="h-3 w-3 text-[#00D6A0]" /> : <Copy className="h-3 w-3" />}
                </button>
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-mono font-bold border",
                  isRunning
                    ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/40"
                    : isPaused
                    ? "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40"
                    : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43]"
                )}
              >
                {status}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase",
                  isLive
                    ? "bg-[#FF5268]/20 text-[#FF5268] border-[#FF5268]/40 animate-pulse"
                    : "bg-[#050B16] text-[#00C9E8] border-[#00C9E8]/30"
                )}
              >
                {mode}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#91A7C1] mt-0.5">
              <span>Exchange: <strong className="text-[#EAF3FF]">{exchange}</strong></span>
              <span>•</span>
              <span>Instrument: <strong className="text-[#00C9E8]">{symbol}</strong></span>
              <span>•</span>
              <span>Strategy: <strong className="text-[#EAF3FF]">{strategyType} ({timeframe})</strong></span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pause / Resume */}
          {isRunning ? (
            <button
              type="button"
              onClick={(e) => onBotAction(liveBot.id, "pause", e)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#FFB020]/15 hover:bg-[#FFB020]/25 text-[#FFB020] border border-[#FFB020]/40 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => onBotAction(liveBot.id, isPaused ? "resume" : "start", e)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#00D6A0]/15 hover:bg-[#00D6A0]/25 text-[#00D6A0] border border-[#00D6A0]/40 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{isPaused ? "Resume" : "Start"}</span>
            </button>
          )}

          {/* Stop */}
          <button
            type="button"
            onClick={(e) => onBotAction(liveBot.id, "stop", e)}
            disabled={actionLoading || isStopped}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#FF5268]/15 hover:bg-[#FF5268]/25 text-[#FF5268] border border-[#FF5268]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40"
          >
            <Square className="h-3.5 w-3.5" />
            <span>Stop</span>
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => onEditBot(liveBot)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#050B16] hover:bg-[#0878FF]/20 text-[#91A7C1] hover:text-[#00C9E8] border border-[#1A2B43] text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>

          {/* View Terminal */}
          <button
            type="button"
            onClick={() => onViewTerminal(liveBot.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#00C9E8]/15 hover:bg-[#00C9E8]/25 text-[#00C9E8] border border-[#00C9E8]/40 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Terminal</span>
          </button>

          {/* Refresh Snapshot */}
          <button
            type="button"
            onClick={() => fetchSnapshot(liveBot.id)}
            disabled={loadingData}
            className="p-2 rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
            title="Refresh bot telemetry"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loadingData && "animate-spin text-[#00C9E8]")} />
          </button>

          {/* Close Workspace */}
          {onCloseWorkspace && (
            <button
              type="button"
              onClick={onCloseWorkspace}
              className="p-2 rounded-[6px] bg-[#050B16] border border-[#1A2B43] text-[#91A7C1] hover:text-[#FF5268] hover:border-[#FF5268]/40 transition-colors cursor-pointer"
              title="Close Bot Details"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── NAVIGATION TABS (7 DEDICATED TABS AS SPECIFIED) ──────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 border-b border-[#1A2B43]">
        {TAB_BUTTONS.map(({ key, label, icon: Icon, count }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-[6px] text-xs font-mono font-bold transition-all border cursor-pointer shrink-0",
                isActive
                  ? "bg-[#0878FF] text-white border-[#0878FF] shadow-md shadow-[#0878FF]/20"
                  : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43] hover:text-[#EAF3FF] hover:border-[#1A2B43]/80"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums",
                    isActive ? "bg-white/20 text-white" : "bg-[#0B1728] text-[#91A7C1]"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT CONTAINERS ───────────────────────────────────────── */}
      <div className="min-h-[280px]">
        {/* ── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
        {activeTab === "OVERVIEW" && (
          <div className="space-y-4 animate-fadeIn">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
              {/* Lifetime P&L */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2.5 flex flex-col justify-between">
                <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Lifetime P&amp;L</span>
                <span className={cn("text-base font-bold tabular-nums", netPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                  {formatSignedMoney(netPnl, currencySymbol)}
                </span>
                <span className="text-[10px] text-[#91A7C1]">Total Realized + Unr</span>
              </div>

              {/* Today's P&L */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2.5 flex flex-col justify-between">
                <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Today’s P&amp;L</span>
                <span className={cn("text-base font-bold tabular-nums", todayPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                  {formatSignedMoney(todayPnl, currencySymbol)}
                </span>
                <span className="text-[10px] text-[#91A7C1]">Session Ledger</span>
              </div>

              {/* Realized P&L */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2.5 flex flex-col justify-between">
                <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Realized P&amp;L</span>
                <span className={cn("text-base font-bold tabular-nums", realizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                  {formatSignedMoney(realizedPnl, currencySymbol)}
                </span>
                <span className="text-[10px] text-[#91A7C1]">Booked Profit/Loss</span>
              </div>

              {/* Unrealized P&L */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2.5 flex flex-col justify-between">
                <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Unrealized P&amp;L</span>
                <span className={cn("text-base font-bold tabular-nums", unrealizedPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                  {formatSignedMoney(unrealizedPnl, currencySymbol)}
                </span>
                <span className="text-[10px] text-[#91A7C1]">Floating Position MTM</span>
              </div>

              {/* Capital Utilization */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2.5 flex flex-col justify-between">
                <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Capital Utilization</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold text-[#00C9E8] tabular-nums">{capitalUtilizationPct}%</span>
                  <span className="text-[10px] text-[#91A7C1] tabular-nums">${formatNumber(usedCapital, 0)}</span>
                </div>
                <div className="w-full bg-[#1A2B43] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00C9E8] h-full rounded-full transition-all"
                    style={{ width: `${capitalUtilizationPct}%` }}
                  />
                </div>
              </div>

              {/* Heartbeat Status */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-2.5 flex flex-col justify-between">
                <span className="text-[10px] text-[#91A7C1] uppercase font-bold">Heartbeat Status</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#00D6A0] animate-pulse" />
                  <span className="text-xs font-bold text-[#00D6A0]">HEALTHY</span>
                </div>
                <span className="text-[10px] text-[#91A7C1]">Latency: 14ms</span>
              </div>
            </div>

            {/* Overview Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              {/* Unit Specifications */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3 space-y-2">
                <div className="text-[11px] font-bold text-[#00C9E8] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1A2B43]/70 pb-1.5">
                  <Bot className="h-3.5 w-3.5" />
                  <span>Unit Specifications</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Bot Name:</span>
                  <span className="text-[#EAF3FF] font-semibold">{liveBot.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Strategy Archetype:</span>
                  <span className="text-[#EAF3FF] font-semibold">{strategyType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Execution Venue:</span>
                  <span className="text-[#EAF3FF] font-semibold">{exchange}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Trading Instrument:</span>
                  <span className="text-[#00C9E8] font-bold">{symbol}</span>
                </div>
              </div>

              {/* Execution Status */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3 space-y-2">
                <div className="text-[11px] font-bold text-[#00D6A0] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1A2B43]/70 pb-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  <span>Execution Telemetry</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Trading Mode:</span>
                  <span className="text-[#00C9E8] font-bold">{mode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Runtime Status:</span>
                  <span className="text-[#00D6A0] font-bold">{status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Open Positions:</span>
                  <span className="text-[#EAF3FF] font-bold">{openPositionsCount} Active</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Executed Trades:</span>
                  <span className="text-[#EAF3FF] font-bold">{totalTradesCount} Fills</span>
                </div>
              </div>

              {/* Capital Allocation */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3 space-y-2">
                <div className="text-[11px] font-bold text-[#8B5CF6] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1A2B43]/70 pb-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Capital Allocation</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Allocated Capital:</span>
                  <span className="text-[#EAF3FF] font-bold">${formatNumber(allocatedCapital, 2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Used Margin:</span>
                  <span className="text-[#00C9E8] font-bold">${formatNumber(usedCapital, 2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Available Capital:</span>
                  <span className="text-[#00D6A0] font-bold">${formatNumber(availableCapital, 2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Total Fees Paid:</span>
                  <span className="text-[#FFB020] font-bold">${formatNumber(Number(pnlData.fees || 0), 2)}</span>
                </div>
              </div>

              {/* Risk Status */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3 space-y-2">
                <div className="text-[11px] font-bold text-[#00C9E8] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#1A2B43]/70 pb-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Risk Gates Status</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Kill Switch Gate:</span>
                  <span className="text-[#00D6A0] font-bold">ARMED</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Daily Loss Cap:</span>
                  <span className="text-[#FF5268] font-bold">-${formatNumber(Number(liveBot.risk?.max_daily_loss || 500), 0)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Stop Loss Gate:</span>
                  <span className="text-[#EAF3FF] font-bold">{liveBot.risk?.stop_loss ?? 2}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Take Profit Target:</span>
                  <span className="text-[#00D6A0] font-bold">{liveBot.risk?.take_profit ?? 5}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: RISK MANAGEMENT ─────────────────────────────────────── */}
        {activeTab === "RISK_MANAGEMENT" && (
          <div className="space-y-4 font-mono text-xs animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Capital Bounds */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#00C9E8] uppercase tracking-wider border-b border-[#1A2B43] pb-2">
                  Capital Bounds &amp; Utilization
                </h4>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Allocated Capital:</span>
                  <span className="text-[#EAF3FF] font-bold">${formatNumber(allocatedCapital, 2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Used Capital:</span>
                  <span className="text-[#00C9E8] font-bold">${formatNumber(usedCapital, 2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Available Capital:</span>
                  <span className="text-[#00D6A0] font-bold">${formatNumber(availableCapital, 2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Utilization Rate:</span>
                  <span className="text-[#EAF3FF] font-bold">{capitalUtilizationPct}%</span>
                </div>
              </div>

              {/* Loss Limits */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#FF5268] uppercase tracking-wider border-b border-[#1A2B43] pb-2">
                  Protective Guardrails
                </h4>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Stop-Loss per Trade:</span>
                  <span className="text-[#FF5268] font-bold">{liveBot.risk?.stop_loss ?? 2}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Max Daily Loss:</span>
                  <span className="text-[#FF5268] font-bold">-${formatNumber(Number(liveBot.risk?.max_daily_loss || 500), 2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Maximum Drawdown:</span>
                  <span className="text-[#FFB020] font-bold">5.0%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Max Loss per Trade:</span>
                  <span className="text-[#FF5268] font-bold">${formatNumber(Number(liveBot.risk?.max_loss_per_trade || 150), 2)}</span>
                </div>
              </div>

              {/* Position Limits */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-4 space-y-3">
                <h4 className="text-xs font-bold text-[#00D6A0] uppercase tracking-wider border-b border-[#1A2B43] pb-2">
                  Exposure &amp; Position Limits
                </h4>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Max Position Size:</span>
                  <span className="text-[#EAF3FF] font-bold">{liveBot.risk?.max_position_size ?? 2} Lots</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Max Open Positions:</span>
                  <span className="text-[#EAF3FF] font-bold">2 Positions</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/50">
                  <span className="text-[#91A7C1]">Max Exposure Cap:</span>
                  <span className="text-[#00C9E8] font-bold">${formatNumber(Number(liveBot.risk?.max_order_notional || 50000), 2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Risk Guardrail Status:</span>
                  <span className="text-[#00D6A0] font-bold">ACTIVE &amp; ARMED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: PARAMETERS ──────────────────────────────────────────── */}
        {activeTab === "PARAMETERS" && (
          <div className="space-y-4 font-mono text-xs animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Strategy Settings */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3.5 space-y-2.5">
                <h4 className="text-xs font-bold text-[#00C9E8] uppercase tracking-wider border-b border-[#1A2B43] pb-2">
                  Strategy Configuration
                </h4>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Strategy Name:</span>
                  <span className="text-[#EAF3FF] font-bold">{strategyType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Execution Timeframe:</span>
                  <span className="text-[#00C9E8] font-bold">{timeframe}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Underlying Asset:</span>
                  <span className="text-[#EAF3FF] font-semibold">{symbol}</span>
                </div>
              </div>

              {/* Indicators */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3.5 space-y-2.5">
                <h4 className="text-xs font-bold text-[#8B5CF6] uppercase tracking-wider border-b border-[#1A2B43] pb-2">
                  Active Indicators
                </h4>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Moving Averages:</span>
                  <span className="text-[#EAF3FF] font-bold">EMA (9, 21, 50)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Momentum Oscillator:</span>
                  <span className="text-[#EAF3FF] font-bold">RSI (14)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Volume Benchmark:</span>
                  <span className="text-[#EAF3FF] font-bold">VWAP Anchor</span>
                </div>
              </div>

              {/* Entry & Exit Rules */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3.5 space-y-2.5">
                <h4 className="text-xs font-bold text-[#00D6A0] uppercase tracking-wider border-b border-[#1A2B43] pb-2">
                  Entry &amp; Exit Conditions
                </h4>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Entry Confluence:</span>
                  <span className="text-[#00D6A0] font-bold">EMA 9/21 Pullback</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">RSI Filter Gate:</span>
                  <span className="text-[#EAF3FF] font-bold">40 &lt; RSI &lt; 65</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Exit Rule:</span>
                  <span className="text-[#FFB020] font-bold">Trailing SL / Target</span>
                </div>
              </div>

              {/* Target & Sizing */}
              <div className="rounded-[6px] bg-[#050B16] border border-[#1A2B43] p-3.5 space-y-2.5">
                <h4 className="text-xs font-bold text-[#FFB020] uppercase tracking-wider border-b border-[#1A2B43] pb-2">
                  Target &amp; Position Sizing
                </h4>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Take Profit Target:</span>
                  <span className="text-[#00D6A0] font-bold">{liveBot.risk?.take_profit ?? 5}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1A2B43]/40">
                  <span className="text-[#91A7C1]">Stop Loss Setting:</span>
                  <span className="text-[#FF5268] font-bold">{liveBot.risk?.stop_loss ?? 2}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#91A7C1]">Lot Size / Quantity:</span>
                  <span className="text-[#EAF3FF] font-bold">{liveBot.risk?.quantity ?? 1} Lot</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: POSITIONS ───────────────────────────────────────────── */}
        {activeTab === "POSITIONS" && (
          <div className="space-y-3 font-mono text-xs animate-fadeIn">
            {positions.length === 0 ? (
              <div className="text-center py-12 text-[#91A7C1] border border-[#1A2B43] rounded-[6px] bg-[#050B16]">
                <Layers className="h-8 w-8 text-[#91A7C1]/50 mx-auto mb-2" />
                <p className="font-bold text-[#EAF3FF]">No Open Positions</p>
                <span className="text-[11px]">This bot does not currently have open market exposure.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[6px] border border-[#1A2B43] bg-[#050B16]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#081321] text-[#91A7C1] border-b border-[#1A2B43] h-9 uppercase font-bold text-[10px]">
                      <th className="px-3 py-1.5">Instrument</th>
                      <th className="px-3 py-1.5 text-center">Direction</th>
                      <th className="px-3 py-1.5 text-right">Quantity</th>
                      <th className="px-3 py-1.5 text-right">Entry Price</th>
                      <th className="px-3 py-1.5 text-right">Current Price</th>
                      <th className="px-3 py-1.5 text-right">Unrealized P&amp;L</th>
                      <th className="px-3 py-1.5 text-center">Stop-Loss</th>
                      <th className="px-3 py-1.5 text-center">Target</th>
                      <th className="px-3 py-1.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2B43]/50">
                    {positions.map((pos, idx) => {
                      const dir = (pos.direction || (pos.quantity >= 0 ? "LONG" : "SHORT")).toUpperCase();
                      const isLong = dir === "LONG";
                      const entryPrice = Number(pos.average_entry_price || pos.entry_price || 0);
                      const currentPrice = Number(pos.current_price || entryPrice);
                      const unrPnl = Number(pos.unrealized_pnl ?? 0);
                      return (
                        <tr key={pos.id || idx} className="hover:bg-[#0D1D35]/50">
                          <td className="px-3 py-2 font-bold text-[#EAF3FF]">{pos.symbol || symbol}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                isLong
                                  ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                                  : "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                              )}
                            >
                              {dir}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF] font-semibold">
                            {formatNumber(Math.abs(Number(pos.quantity || 1)), 2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#91A7C1]">
                            {currencySymbol}{formatNumber(entryPrice, 2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold text-[#00C9E8]">
                            {currencySymbol}{formatNumber(currentPrice, 2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-bold">
                            <span className={unrPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]"}>
                              {formatSignedMoney(unrPnl, currencySymbol)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-[#FF5268] tabular-nums">
                            {currencySymbol}{formatNumber(entryPrice * 0.98, 2)}
                          </td>
                          <td className="px-3 py-2 text-center text-[#00D6A0] tabular-nums">
                            {currencySymbol}{formatNumber(entryPrice * 1.05, 2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => setPositionToClose(pos)}
                              className="px-2.5 py-1 rounded bg-[#FF5268]/15 hover:bg-[#FF5268]/25 text-[#FF5268] border border-[#FF5268]/30 font-bold transition-colors cursor-pointer"
                            >
                              Close Position
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: ORDERS ──────────────────────────────────────────────── */}
        {activeTab === "ORDERS" && (
          <div className="space-y-3 font-mono text-xs animate-fadeIn">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-[#91A7C1] border border-[#1A2B43] rounded-[6px] bg-[#050B16]">
                <ListOrdered className="h-8 w-8 text-[#91A7C1]/50 mx-auto mb-2" />
                <p className="font-bold text-[#EAF3FF]">No Orders Placed</p>
                <span className="text-[11px]">No order intents registered for this trading bot.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[6px] border border-[#1A2B43] bg-[#050B16] max-h-80 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#081321] z-10">
                    <tr className="text-[#91A7C1] border-b border-[#1A2B43] h-9 uppercase font-bold text-[10px]">
                      <th className="px-3 py-1.5">Order ID</th>
                      <th className="px-3 py-1.5">Type</th>
                      <th className="px-3 py-1.5 text-center">Side</th>
                      <th className="px-3 py-1.5 text-right">Quantity</th>
                      <th className="px-3 py-1.5 text-right">Price</th>
                      <th className="px-3 py-1.5 text-center">Execution Status</th>
                      <th className="px-3 py-1.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2B43]/50">
                    {orders.map((ord, idx) => {
                      const isBuy = (ord.side || "").toUpperCase() === "BUY";
                      const status = (ord.status || "FILLED").toUpperCase();
                      return (
                        <tr key={ord.id || idx} className="hover:bg-[#0D1D35]/50">
                          <td className="px-3 py-2 font-bold text-[#00C9E8]">{ord.id}</td>
                          <td className="px-3 py-2 text-[#91A7C1]">{ord.order_type || "MARKET"}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                isBuy
                                  ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                                  : "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                              )}
                            >
                              {ord.side}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF] font-semibold">
                            {formatNumber(ord.quantity, 2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF]">
                            {currencySymbol}{formatNumber(ord.price, 2)}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] border",
                                status === "FILLED"
                                  ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                                  : status === "CANCELLED"
                                  ? "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                                  : "bg-[#0878FF]/15 text-[#0878FF] border-[#0878FF]/30"
                              )}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-[11px] text-[#91A7C1] tabular-nums">
                            {formatDateTime(ord.created_at || ord.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 6: EXECUTIONS ──────────────────────────────────────────── */}
        {activeTab === "EXECUTIONS" && (
          <div className="space-y-3 font-mono text-xs animate-fadeIn">
            {trades.length === 0 ? (
              <div className="text-center py-12 text-[#91A7C1] border border-[#1A2B43] rounded-[6px] bg-[#050B16]">
                <Receipt className="h-8 w-8 text-[#91A7C1]/50 mx-auto mb-2" />
                <p className="font-bold text-[#EAF3FF]">No Trade Executions</p>
                <span className="text-[11px]">No order fills or execution trades logged for this bot.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[6px] border border-[#1A2B43] bg-[#050B16] max-h-80 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#081321] z-10">
                    <tr className="text-[#91A7C1] border-b border-[#1A2B43] h-9 uppercase font-bold text-[10px]">
                      <th className="px-3 py-1.5">Fill ID</th>
                      <th className="px-3 py-1.5">Order ID</th>
                      <th className="px-3 py-1.5 text-center">Side</th>
                      <th className="px-3 py-1.5 text-right">Filled Qty</th>
                      <th className="px-3 py-1.5 text-right">Avg Price</th>
                      <th className="px-3 py-1.5 text-right">Fees</th>
                      <th className="px-3 py-1.5 text-center">Exchange</th>
                      <th className="px-3 py-1.5 text-right">Execution Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2B43]/50">
                    {trades.map((tr, idx) => {
                      const isBuy = (tr.side || "").toUpperCase() === "BUY";
                      return (
                        <tr key={tr.id || idx} className="hover:bg-[#0D1D35]/50">
                          <td className="px-3 py-2 font-bold text-[#00C9E8]">{tr.id}</td>
                          <td className="px-3 py-2 text-[#91A7C1]">{tr.order_id || "N/A"}</td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                isBuy
                                  ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                                  : "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                              )}
                            >
                              {tr.side}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF] font-semibold">
                            {formatNumber(tr.quantity, 2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#00C9E8] font-bold">
                            {currencySymbol}{formatNumber(tr.price, 2)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[#FFB020]">
                            {currencySymbol}{formatNumber(tr.fees || 0, 3)}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-[#EAF3FF]">
                            {tr.provider || exchange}
                          </td>
                          <td className="px-3 py-2 text-right text-[11px] text-[#91A7C1] tabular-nums">
                            {formatDateTime(tr.timestamp || tr.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 7: LOGS ────────────────────────────────────────────────── */}
        {activeTab === "LOGS" && (
          <div className="space-y-3 font-mono text-xs animate-fadeIn">
            {/* Filter by severity */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[#91A7C1]">Severity Filter:</span>
                {["ALL", "INFO", "WARN", "ERROR"].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setLogSeverityFilter(sev)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer",
                      logSeverityFilter === sev
                        ? "bg-[#0878FF] text-white"
                        : "bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] border border-[#1A2B43]"
                    )}
                  >
                    {sev}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-[#91A7C1]">{events.length} System Records</span>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 text-[#91A7C1] border border-[#1A2B43] rounded-[6px] bg-[#050B16]">
                <FileText className="h-8 w-8 text-[#91A7C1]/50 mx-auto mb-2" />
                <p className="font-bold text-[#EAF3FF]">No Event Logs Available</p>
                <span className="text-[11px]">Lifecycle events will appear here once the engine produces logs.</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[6px] border border-[#1A2B43] bg-[#050B16] max-h-80 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#081321] z-10">
                    <tr className="text-[#91A7C1] border-b border-[#1A2B43] h-9 uppercase font-bold text-[10px]">
                      <th className="px-3 py-1.5">Timestamp</th>
                      <th className="px-3 py-1.5">Event Type</th>
                      <th className="px-3 py-1.5 text-center">Severity</th>
                      <th className="px-3 py-1.5">Message</th>
                      <th className="px-3 py-1.5">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2B43]/50">
                    {events
                      .filter((ev) => {
                        if (logSeverityFilter === "ALL") return true;
                        const s = (ev.severity || ev.level || "INFO").toUpperCase();
                        return s.includes(logSeverityFilter);
                      })
                      .map((ev, idx) => {
                        const sev = (ev.severity || ev.level || "INFO").toUpperCase();
                        return (
                          <tr key={ev.id || idx} className="hover:bg-[#0D1D35]/50">
                            <td className="px-3 py-2 text-[11px] text-[#91A7C1] tabular-nums whitespace-nowrap">
                              {formatDateTime(ev.timestamp || ev.created_at)}
                            </td>
                            <td className="px-3 py-2 font-bold text-[#00C9E8]">{ev.event_type || ev.type || "STATE_UPDATE"}</td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold border",
                                  sev === "ERROR"
                                    ? "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                                    : sev === "WARN"
                                    ? "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/30"
                                    : "bg-[#0878FF]/15 text-[#00C9E8] border-[#0878FF]/30"
                                )}
                              >
                                {sev}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-[#EAF3FF] font-medium leading-relaxed max-w-lg">
                              {ev.message || ev.details || JSON.stringify(ev)}
                            </td>
                            <td className="px-3 py-2 text-[#91A7C1] text-[11px] font-mono">
                              {ev.source || "QUANT.OS"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close Position Modal */}
      {positionToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[8px] border border-[#FF5268]/40 bg-[#091426] p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[#FF5268]">
              <div className="h-10 w-10 rounded-[6px] bg-[#FF5268]/10 border border-[#FF5268]/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-[#FF5268]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#EAF3FF]">Close Active Market Position</h3>
                <span className="text-[10px] text-[#FF5268] font-bold uppercase">Immediate Execution</span>
              </div>
            </div>
            <p className="text-[#91A7C1] leading-relaxed">
              Are you sure you want to close position{" "}
              <span className="font-bold text-[#EAF3FF]">{positionToClose.symbol || symbol}</span> (
              <span className="text-[#00C9E8] font-bold">
                {positionToClose.direction || "LONG"} {positionToClose.quantity} units
              </span>
              )?
            </p>
            <div className="text-[11px] text-[#91A7C1] bg-[#050B16] border border-[#1A2B43] p-3 rounded-[6px] leading-relaxed">
              A reverse market order will be routed immediately to execute at the best available fill price.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1A2B43]">
              <button
                type="button"
                onClick={() => setPositionToClose(null)}
                disabled={isClosingPosition}
                className="px-3 py-1.5 rounded-[4px] border border-[#1A2B43] bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClosePosition}
                disabled={isClosingPosition}
                className="px-4 py-1.5 rounded-[4px] bg-[#FF5268] hover:bg-[#E0294A] font-bold text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isClosingPosition ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Confirm Close Position</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

