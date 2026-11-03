"use client";

import React, { useState, useMemo } from "react";
import {
  Check,
  Copy,
  Play,
  Pause,
  Square,
  Trash2,
  Eye,
  Edit,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Terminal,
  FileText,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  Activity,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BotConfig } from "@/types/bot";
import {
  formatSignedMoney,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
} from "@/lib/formatters";

interface FleetTableProps {
  bots: BotConfig[];
  selectedBotIds: Set<string>;
  activeBotId: string | null;
  onToggleSelectBot: (id: string, e?: React.MouseEvent) => void;
  onSelectBot: (bot: BotConfig) => void;
  onBotAction: (
    botId: string,
    action: "start" | "pause" | "resume" | "stop",
    e?: React.MouseEvent
  ) => void;
  onEditBot: (bot: BotConfig, e?: React.MouseEvent) => void;
  onViewTerminal: (botId: string, e?: React.MouseEvent) => void;
  onViewLogs: (bot: BotConfig, e?: React.MouseEvent) => void;
  onDeleteBot: (bot: BotConfig, e?: React.MouseEvent) => void;
  actionLoading: Record<string, boolean>;
  copiedId: string | null;
  onCopyId: (id: string, e?: React.MouseEvent) => void;
}

type SortField =
  | "name"
  | "strategy"
  | "exchange"
  | "symbol"
  | "mode"
  | "status"
  | "positions"
  | "executions"
  | "netPnl"
  | "risk"
  | "lastActivity";

type SortDirection = "asc" | "desc";

function safeString(val: any, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (val.symbol && typeof val.symbol === "string") return val.symbol;
    if (val.name && typeof val.name === "string") return val.name;
    if (val.market_type && typeof val.market_type === "string") return val.market_type;
    return fallback;
  }
  return fallback;
}

export function FleetTable({
  bots,
  selectedBotIds,
  activeBotId,
  onToggleSelectBot,
  onSelectBot,
  onBotAction,
  onEditBot,
  onViewTerminal,
  onViewLogs,
  onDeleteBot,
  actionLoading,
  copiedId,
  onCopyId,
}: FleetTableProps) {
  const [sortField, setSortField] = useState<SortField>("lastActivity");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [stopConfirmBot, setStopConfirmBot] = useState<BotConfig | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedBots = useMemo(() => {
    return [...bots].sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;

      switch (sortField) {
        case "name":
          aVal = (a.name || "").toLowerCase();
          bVal = (b.name || "").toLowerCase();
          break;
        case "strategy":
          aVal = (a.strategy?.type || "").toLowerCase();
          bVal = (b.strategy?.type || "").toLowerCase();
          break;
        case "exchange":
          aVal = (a.market?.exchange || "").toLowerCase();
          bVal = (b.market?.exchange || "").toLowerCase();
          break;
        case "symbol":
          aVal = (a.market?.symbol || "").toLowerCase();
          bVal = (b.market?.symbol || "").toLowerCase();
          break;
        case "mode":
          aVal = (a.execution?.mode || "PAPER").toLowerCase();
          bVal = (b.execution?.mode || "PAPER").toLowerCase();
          break;
        case "status":
          aVal = (a.status || "").toLowerCase();
          bVal = (b.status || "").toLowerCase();
          break;
        case "positions":
          aVal = Number(a.positions_count ?? 0);
          bVal = Number(b.positions_count ?? 0);
          break;
        case "executions":
          aVal = Number(a.trades_count ?? (a.pnl as any)?.trades_count ?? 0);
          bVal = Number(b.trades_count ?? (b.pnl as any)?.trades_count ?? 0);
          break;
        case "netPnl":
          aVal = Number(a.pnl?.net_pnl ?? 0);
          bVal = Number(b.pnl?.net_pnl ?? 0);
          break;
        case "risk":
          aVal = a.kill_switch === "ARMED" ? 1 : 0;
          bVal = b.kill_switch === "ARMED" ? 1 : 0;
          break;
        case "lastActivity":
          aVal = new Date(a.updated_at || a.created_at || 0).getTime();
          bVal = new Date(b.updated_at || b.created_at || 0).getTime();
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [bots, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-[#91A7C1]/50 group-hover:text-[#EAF3FF]" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#00C9E8]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#00C9E8]" />
    );
  };

  return (
    <>
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] overflow-hidden select-none font-sans shadow-lg">
        <div className="overflow-x-auto max-h-[620px] custom-scrollbar">
          <table className="w-full text-left text-sm border-collapse min-w-[1380px]">
            {/* Sticky Header with 13 discrete columns in exact requested order */}
            <thead className="sticky top-0 bg-[#081321] z-20 shadow-md">
              <tr className="text-xs uppercase font-mono font-bold text-[#91A7C1] border-b border-[#1A2B43] h-10 tracking-wider">
                {/* 1. Selection */}
                <th className="px-3 py-2 w-10 text-center">Sel</th>

                {/* 2. Bot Name */}
                <th
                  onClick={() => handleSort("name")}
                  className="px-3 py-2 min-w-[210px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Bot Name</span>
                    {renderSortIcon("name")}
                  </div>
                </th>

                {/* 3. Strategy */}
                <th
                  onClick={() => handleSort("strategy")}
                  className="px-3 py-2 min-w-[170px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Strategy</span>
                    {renderSortIcon("strategy")}
                  </div>
                </th>

                {/* 4. Exchange */}
                <th
                  onClick={() => handleSort("exchange")}
                  className="px-3 py-2 min-w-[110px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Exchange</span>
                    {renderSortIcon("exchange")}
                  </div>
                </th>

                {/* 5. Trading Instrument */}
                <th
                  onClick={() => handleSort("symbol")}
                  className="px-3 py-2 min-w-[180px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Trading Instrument</span>
                    {renderSortIcon("symbol")}
                  </div>
                </th>

                {/* 6. Trading Mode */}
                <th
                  onClick={() => handleSort("mode")}
                  className="px-2 py-2 text-center w-20 cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Mode</span>
                    {renderSortIcon("mode")}
                  </div>
                </th>

                {/* 7. Runtime Status */}
                <th
                  onClick={() => handleSort("status")}
                  className="px-3 py-2 text-center min-w-[130px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Runtime Status</span>
                    {renderSortIcon("status")}
                  </div>
                </th>

                {/* 8. Open Positions */}
                <th
                  onClick={() => handleSort("positions")}
                  className="px-3 py-2 text-center min-w-[120px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Open Positions</span>
                    {renderSortIcon("positions")}
                  </div>
                </th>

                {/* 9. Executions */}
                <th
                  onClick={() => handleSort("executions")}
                  className="px-3 py-2 text-center min-w-[110px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Executions</span>
                    {renderSortIcon("executions")}
                  </div>
                </th>

                {/* 10. Net P&L */}
                <th
                  onClick={() => handleSort("netPnl")}
                  className="px-3 py-2 text-right min-w-[130px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Net P&amp;L</span>
                    {renderSortIcon("netPnl")}
                  </div>
                </th>

                {/* 11. Risk Status */}
                <th
                  onClick={() => handleSort("risk")}
                  className="px-3 py-2 text-center min-w-[120px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Risk Status</span>
                    {renderSortIcon("risk")}
                  </div>
                </th>

                {/* 12. Last Activity */}
                <th
                  onClick={() => handleSort("lastActivity")}
                  className="px-3 py-2 min-w-[130px] cursor-pointer hover:text-[#EAF3FF] group transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Last Activity</span>
                    {renderSortIcon("lastActivity")}
                  </div>
                </th>

                {/* 13. Actions */}
                <th className="px-3 py-2 text-center min-w-[160px]">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#1A2B43]/50">
              {sortedBots.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-16 text-sm text-[#91A7C1] font-mono">
                    No algorithmic trading bots matched the selected filter criteria.
                  </td>
                </tr>
              ) : (
                sortedBots.map((bot) => {
                  const isSelected = selectedBotIds.has(bot.id);
                  const isActive = activeBotId === bot.id;
                  const status = (bot.status || "STOPPED").toUpperCase();
                  const isRunning = status === "RUNNING";
                  const isPaused = status === "PAUSED";
                  const isStopped = status === "STOPPED";
                  const isReady = status === "READY" || status === "DRAFT";
                  const isError = status === "ERROR";

                  const symbol = safeString(bot.market?.symbol, "NIFTY");
                  const exchange = safeString(bot.market?.exchange, "NSE").toUpperCase();
                  const mode = (bot.execution?.mode || "PAPER").toUpperCase();
                  const isLive = mode === "LIVE";

                  const strategyName = safeString(
                    bot.strategy?.type,
                    "Trend Pullback EMA"
                  );
                  const timeframe = safeString(bot.strategy?.timeframe, "1m");

                  const netPnl = Number(bot.pnl?.net_pnl ?? 0);
                  const currencySymbol =
                    symbol.includes("NIFTY") || exchange === "NSE" || exchange === "MCX" || bot.currency === "INR"
                      ? "₹"
                      : "$";

                  const positionsCount = Number(bot.positions_count ?? 0);
                  const contractsCount = Number(bot.open_contracts ?? (positionsCount > 0 ? 1 : 0));
                  const tradesCount = Number(bot.trades_count ?? (bot.pnl as any)?.trades_count ?? 0);

                  const isArmed = bot.kill_switch === "ARMED" || !bot.kill_switch;
                  const isLoadingAction = !!actionLoading[bot.id];

                  return (
                    <tr
                      key={bot.id}
                      onClick={() => onSelectBot(bot)}
                      className={cn(
                        "transition-all cursor-pointer group text-[13px]",
                        isActive
                          ? "bg-[#0878FF]/15 border-l-4 border-l-[#00C9E8]"
                          : isSelected
                          ? "bg-[#0878FF]/10"
                          : "hover:bg-[#0D1D35]/60 bg-[#091426]"
                      )}
                    >
                      {/* 1. Selection Checkbox */}
                      <td
                        className="px-3 py-2.5 text-center"
                        onClick={(e) => onToggleSelectBot(bot.id, e)}
                      >
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-[#050B16] text-[#91A7C1] hover:text-[#00C9E8] transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-[#00C9E8]" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded border border-[#1A2B43] bg-[#050B16]" />
                          )}
                        </button>
                      </td>

                      {/* 2. Bot Name */}
                      <td className="px-3 py-2.5 font-medium">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-[#EAF3FF] group-hover:text-[#00C9E8] transition-colors line-clamp-1">
                            {bot.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#91A7C1]">
                            <span>{bot.id}</span>
                            <button
                              type="button"
                              onClick={(e) => onCopyId(bot.id, e)}
                              className="text-[#91A7C1] hover:text-[#00C9E8] p-0.5"
                              title="Copy Bot ID"
                            >
                              {copiedId === bot.id ? (
                                <Check className="h-3 w-3 text-[#00D6A0]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 3. Strategy */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-[#EAF3FF] text-xs">
                            {strategyName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#050B16] border border-[#1A2B43] text-[#00C9E8]">
                              {timeframe}
                            </span>
                            <span className="text-[10px] font-mono text-[#91A7C1]">
                              {bot.strategy?.parameters?.rsi_period ? `RSI(${bot.strategy.parameters.rsi_period})` : "EMA Confluence"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Exchange */}
                      <td className="px-3 py-2.5 font-mono">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-bold border",
                            exchange === "NSE" || exchange === "UPSTOX"
                              ? "bg-[#0878FF]/15 text-[#00C9E8] border-[#0878FF]/30"
                              : exchange === "DELTA"
                              ? "bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30"
                              : exchange === "BINANCE"
                              ? "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/30"
                              : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43]"
                          )}
                        >
                          {exchange}
                        </span>
                      </td>

                      {/* 5. Trading Instrument */}
                      <td className="px-3 py-2.5 font-mono">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-[#EAF3FF] text-xs">
                            {symbol}
                          </span>
                          <span className="text-[10px] text-[#91A7C1]">
                            {bot.market?.instrument_type || (symbol.includes("CE") || symbol.includes("PE") ? "OPTION" : "PERP")}
                          </span>
                        </div>
                      </td>

                      {/* 6. Trading Mode */}
                      <td className="px-2 py-2.5 text-center font-mono">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border uppercase",
                            isLive
                              ? "bg-[#FF5268]/20 text-[#FF5268] border-[#FF5268]/40 animate-pulse"
                              : "bg-[#050B16] text-[#00C9E8] border-[#00C9E8]/30"
                          )}
                        >
                          {mode}
                        </span>
                      </td>

                      {/* 7. Runtime Status */}
                      <td className="px-3 py-2.5 text-center font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              isRunning
                                ? "bg-[#00D6A0] animate-pulse"
                                : isPaused
                                ? "bg-[#FFB020]"
                                : isReady
                                ? "bg-[#0878FF]"
                                : isError
                                ? "bg-[#FF5268] animate-ping"
                                : "bg-[#91A7C1]"
                            )}
                          />
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-bold border",
                              isRunning
                                ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/40 shadow-sm"
                                : isPaused
                                ? "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40"
                                : isReady
                                ? "bg-[#0878FF]/15 text-[#0878FF] border-[#0878FF]/40"
                                : isError
                                ? "bg-[#FF5268]/20 text-[#FF5268] border-[#FF5268]/50"
                                : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43]"
                            )}
                          >
                            {status}
                          </span>
                        </div>
                      </td>

                      {/* 8. Open Positions */}
                      <td className="px-3 py-2.5 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className={cn("font-bold text-xs tabular-nums", positionsCount > 0 ? "text-[#EAF3FF]" : "text-[#91A7C1]")}>
                            {positionsCount} {positionsCount === 1 ? "Pos" : "Pos"}
                          </span>
                          <span className="text-[10px] text-[#91A7C1] tabular-nums">
                            {contractsCount} {contractsCount === 1 ? "Lot" : "Lots"}
                          </span>
                        </div>
                      </td>

                      {/* 9. Executions */}
                      <td className="px-3 py-2.5 text-center font-mono">
                        <span className="text-xs font-bold text-[#EAF3FF] tabular-nums">
                          {formatNumber(tradesCount, 0)}
                        </span>
                      </td>

                      {/* 10. Net P&L */}
                      <td className="px-3 py-2.5 text-right font-mono">
                        <span
                          className={cn(
                            "text-sm font-bold tracking-tight tabular-nums",
                            netPnl > 0
                              ? "text-[#00D6A0]"
                              : netPnl < 0
                              ? "text-[#FF5268]"
                              : "text-[#91A7C1]"
                          )}
                        >
                          {formatSignedMoney(netPnl, currencySymbol)}
                        </span>
                      </td>

                      {/* 11. Risk Status */}
                      <td className="px-3 py-2.5 text-center font-mono">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
                            isArmed
                              ? "bg-[#00D6A0]/10 text-[#00D6A0] border-[#00D6A0]/30"
                              : "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                          )}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          <span>{isArmed ? "ARMED" : "TRIGGERED"}</span>
                        </span>
                      </td>

                      {/* 12. Last Activity */}
                      <td className="px-3 py-2.5 font-mono text-[11px] text-[#91A7C1]">
                        <span title={formatDateTime(bot.updated_at || bot.created_at)}>
                          {formatRelativeTime(bot.updated_at || bot.created_at)}
                        </span>
                      </td>

                      {/* 13. Actions */}
                      <td
                        className="px-3 py-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {/* Pause / Resume Button */}
                          {isRunning ? (
                            <button
                              type="button"
                              onClick={(e) => onBotAction(bot.id, "pause", e)}
                              disabled={isLoadingAction}
                              className="p-1.5 rounded-[4px] bg-[#FFB020]/15 hover:bg-[#FFB020]/25 text-[#FFB020] border border-[#FFB020]/30 transition-colors cursor-pointer"
                              title="Pause Bot Execution"
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => onBotAction(bot.id, isPaused ? "resume" : "start", e)}
                              disabled={isLoadingAction}
                              className="p-1.5 rounded-[4px] bg-[#00D6A0]/15 hover:bg-[#00D6A0]/25 text-[#00D6A0] border border-[#00D6A0]/30 transition-colors cursor-pointer"
                              title={isPaused ? "Resume Bot" : "Start Bot"}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Stop Button (triggers confirmation) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStopConfirmBot(bot);
                            }}
                            disabled={isLoadingAction || isStopped}
                            className="p-1.5 rounded-[4px] bg-[#FF5268]/15 hover:bg-[#FF5268]/25 text-[#FF5268] border border-[#FF5268]/30 transition-colors cursor-pointer disabled:opacity-40"
                            title="Stop Bot"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit Bot */}
                          <button
                            type="button"
                            onClick={(e) => onEditBot(bot, e)}
                            className="p-1.5 rounded-[4px] bg-[#050B16] hover:bg-[#0878FF]/20 text-[#91A7C1] hover:text-[#00C9E8] border border-[#1A2B43] transition-colors cursor-pointer"
                            title="Edit Parameters"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* View Terminal */}
                          <button
                            type="button"
                            onClick={(e) => onViewTerminal(bot.id, e)}
                            className="p-1.5 rounded-[4px] bg-[#050B16] hover:bg-[#00C9E8]/20 text-[#91A7C1] hover:text-[#00C9E8] border border-[#1A2B43] transition-colors cursor-pointer"
                            title="Open Real-Time Terminal"
                          >
                            <Terminal className="h-3.5 w-3.5" />
                          </button>

                          {/* View Logs */}
                          <button
                            type="button"
                            onClick={(e) => {
                              onSelectBot(bot);
                              onViewLogs(bot, e);
                            }}
                            className="p-1.5 rounded-[4px] bg-[#050B16] hover:bg-[#8B5CF6]/20 text-[#91A7C1] hover:text-[#A78BFA] border border-[#1A2B43] transition-colors cursor-pointer"
                            title="View Strategy Logs"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete Bot */}
                          <button
                            type="button"
                            onClick={(e) => onDeleteBot(bot, e)}
                            className="p-1.5 rounded-[4px] bg-[#050B16] hover:bg-[#FF5268]/20 text-[#91A7C1] hover:text-[#FF5268] border border-[#1A2B43] transition-colors cursor-pointer"
                            title="Decommission Bot"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stop Confirmation Dialog */}
      {stopConfirmBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[8px] border border-[#FF5268]/40 bg-[#091426] p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-[#FF5268]">
              <div className="h-10 w-10 rounded-[6px] bg-[#FF5268]/10 border border-[#FF5268]/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-[#FF5268]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#EAF3FF]">Stop Algorithmic Trading Bot</h3>
                <span className="text-[10px] text-[#FF5268] font-bold uppercase">Halt Execution</span>
              </div>
            </div>
            <p className="text-[#91A7C1] leading-relaxed">
              Are you sure you want to stop bot{" "}
              <span className="font-bold text-[#EAF3FF]">{stopConfirmBot.name}</span> (ID:{" "}
              <span className="text-[#00C9E8] font-bold">{stopConfirmBot.id}</span>)?
            </p>
            <div className="text-[11px] text-[#91A7C1] bg-[#050B16] border border-[#1A2B43] p-3 rounded-[6px] leading-relaxed">
              All active quote listening and order placement loops will halt. Any existing open positions will remain open unless explicitly closed.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1A2B43]">
              <button
                type="button"
                onClick={() => setStopConfirmBot(null)}
                className="px-3 py-1.5 rounded-[4px] border border-[#1A2B43] bg-[#050B16] text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const bId = stopConfirmBot.id;
                  setStopConfirmBot(null);
                  onBotAction(bId, "stop");
                }}
                className="px-4 py-1.5 rounded-[4px] bg-[#FF5268] hover:bg-[#E0294A] font-bold text-white shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" />
                <span>Confirm Stop</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
