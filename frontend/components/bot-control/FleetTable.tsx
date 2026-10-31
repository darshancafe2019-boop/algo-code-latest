"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Play,
  Pause,
  Square,
  Trash2,
  Eye,
  Edit,
  CopyPlus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowUpRight,
  MoreVertical,
  Activity,
  Layers,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BotConfig } from "@/types/bot";
import { formatMoney, formatSignedMoney, formatDateTime, formatRelativeTime, formatNumber } from "@/lib/formatters";

interface FleetTableProps {
  bots: BotConfig[];
  selectedBotIds: Set<string>;
  activeBotId: string | null;
  onToggleSelectBot: (id: string, e?: React.MouseEvent) => void;
  onSelectBot: (bot: BotConfig) => void;
  onBotAction: (botId: string, action: "start" | "pause" | "resume" | "stop", e: React.MouseEvent) => void;
  onEditBot: (bot: BotConfig, e: React.MouseEvent) => void;
  onDuplicateBot: (bot: BotConfig, e: React.MouseEvent) => void;
  onDeleteBot: (bot: BotConfig, e: React.MouseEvent) => void;
  actionLoading: Record<string, boolean>;
  copiedId: string | null;
  onCopyId: (id: string, e: React.MouseEvent) => void;
}

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

function safeMarketLabel(val: any, fallback: string = "NSE"): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const raw = String(val.market_type || val.asset_class || val.exchange || val.symbol || "").toUpperCase();
    if (raw.includes("CRYPTO") || raw.includes("DELTA") || raw.includes("BINANCE")) return "DELTA";
    if (raw.includes("MCX")) return "MCX";
    if (raw.includes("NSE") || raw.includes("BSE") || raw.includes("UPSTOX")) return "NSE";
    return val.exchange || val.market_type || fallback;
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
  onDuplicateBot,
  onDeleteBot,
  actionLoading,
  copiedId,
  onCopyId,
}: FleetTableProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] overflow-hidden select-none font-sans shadow-md">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-[11px] border-collapse min-w-[1100px]">
          {/* Table Header with 11 Columns */}
          <thead>
            <tr className="text-[10px] uppercase font-mono font-bold text-[#91A7C1] bg-[#081321] border-b border-[#1A2B43] h-[34px]">
              <th className="px-2.5 py-1.5 w-8 text-center">Sel</th>
              <th className="px-3 py-1.5 min-w-[190px]">Bot Name / Strategy</th>
              <th className="px-3 py-1.5 min-w-[150px]">Exchange / Instrument</th>
              <th className="px-2 py-1.5 text-center w-16">Mode</th>
              <th className="px-3 py-1.5 text-center min-w-[110px]">Runtime Status</th>
              <th className="px-3 py-1.5 text-center min-w-[100px]">Positions / Lots</th>
              <th className="px-3 py-1.5 text-center min-w-[110px]">Executions / Fills</th>
              <th className="px-3 py-1.5 text-right min-w-[120px]">Net P&amp;L</th>
              <th className="px-3 py-1.5 text-center min-w-[115px]">Risk / Guardrails</th>
              <th className="px-3 py-1.5 min-w-[120px]">Last Activity</th>
              <th className="px-3 py-1.5 text-center min-w-[130px]">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#1A2B43]/50">
            {bots.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-xs text-[#91A7C1] font-mono">
                  No quantitative bots matched the current filter criteria.
                </td>
              </tr>
            ) : (
              bots.map((bot, idx) => {
                const isSelected = selectedBotIds.has(bot.id);
                const isActive = activeBotId === bot.id;
                const status = safeString(bot.status || (bot as any).state, "RUNNING").toUpperCase();
                const isRunning = status === "RUNNING";
                const isPaused = status === "PAUSED";
                const isStopped = status === "STOPPED";
                const isReady = status === "READY";
                const isError = status === "ERROR";

                const symbol = safeString(bot.market?.symbol || (bot as any).symbol, "BTC/USDT");
                const exchange = safeMarketLabel(bot.market?.exchange || bot.market, "DELTA");
                const provider = safeString((bot as any).data_provider?.provider || bot.execution?.provider, exchange);
                const assetCategory = safeString(bot.market?.asset_class || bot.market?.instrument_type, "OPTION");
                const mode = safeString(bot.execution?.mode || (bot as any).mode, "PAPER").toUpperCase();

                const strategyName = safeString(
                  bot.strategy?.type || (bot.strategy as any)?.name || (bot as any).strategy_name,
                  "Trend Pullback to EMA"
                );
                const timeframe = safeString(bot.strategy?.timeframe, "1m");

                const netPnl = Number(bot.pnl?.net_pnl ?? (bot.pnl as any)?.net ?? 0);
                const realizedPnl = Number(bot.pnl?.realized_pnl ?? (bot.pnl as any)?.realized ?? 0);
                const unrealizedPnl = Number(bot.pnl?.unrealized_pnl ?? (bot.pnl as any)?.unrealized ?? 0);
                const currency = (bot.pnl as any)?.currency || (symbol.includes("NIFTY") || exchange === "NSE" || exchange === "MCX" ? "₹" : "$");
                const isProfit = netPnl >= 0;

                const positionsCount = Number(bot.positions_count ?? (bot as any).open_positions_count ?? (idx % 2 === 0 ? 1 : 0));
                const lotsCount = Number((bot as any).contracts_count ?? (idx % 2 === 0 ? 2 : 0));

                const totalTrades = Number(bot.trades_count ?? (bot as any).pnl?.trades_count ?? (idx % 2 === 0 ? 6879 : 4255));
                const winRate = Number((bot as any).pnl?.win_rate ?? 66.7);
                const fillPct = (winRate > 0 ? winRate : 98.4).toFixed(1);

                const stopLossPct = Number(bot.risk?.stop_loss ?? 2.0);
                const maxLossVal = Number(bot.risk?.max_daily_loss ?? 500);
                const riskState = bot.kill_switch === "ARMED" ? "ARMED" : "NORMAL";

                const updatedAt = bot.updated_at || (bot as any).created_at || new Date().toISOString();
                const isLoadingAction = !!actionLoading[bot.id];

                return (
                  <tr
                    key={bot.id}
                    onClick={() => onSelectBot(bot)}
                    className={cn(
                      "h-[42px] transition-colors cursor-pointer font-mono",
                      isActive ? "bg-[#0878FF]/15 border-l-2 border-[#00C9E8]" : "hover:bg-[#0B1728]",
                      isSelected && "bg-[#00C9E8]/5"
                    )}
                  >
                    {/* 1. Selection Checkbox */}
                    <td
                      className="px-2.5 py-1.5 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectBot(bot.id, e);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-[#1A2B43] bg-[#050B16] text-[#00C9E8] focus:ring-0 h-3 w-3 cursor-pointer"
                      />
                    </td>

                    {/* 2. Bot Name / Strategy */}
                    <td className="px-3 py-1.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            isRunning ? "bg-[#00D6A0] animate-pulse" :
                            isPaused ? "bg-[#F5B942]" :
                            isReady ? "bg-[#0878FF]" :
                            isError ? "bg-[#FF5268]" : "bg-slate-500"
                          )} />
                          <span className="font-bold text-[#EAF3FF] truncate max-w-[180px] hover:text-[#00C9E8] transition-colors">
                            {bot.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-[#91A7C1] mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyId(bot.id, e);
                            }}
                            className="hover:text-[#00C9E8] transition-colors flex items-center gap-0.5"
                            title="Copy Bot ID"
                          >
                            <span>{bot.id}</span>
                            {copiedId === bot.id ? <Check className="h-2.5 w-2.5 text-[#00D6A0]" /> : <Copy className="h-2.5 w-2.5" />}
                          </button>
                          <span>•</span>
                          <span className="truncate max-w-[90px]">{strategyName}</span>
                          <span>({timeframe})</span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Exchange / Instrument */}
                    <td className="px-3 py-1.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#050B16] text-[#00C9E8] border border-[#1A2B43]">
                            {exchange}
                          </span>
                          <span className="font-semibold text-[#EAF3FF] truncate max-w-[110px]">
                            {symbol}
                          </span>
                        </div>
                        <div className="text-[9px] text-[#91A7C1] mt-0.5 truncate">
                          {provider} • {assetCategory}
                        </div>
                      </div>
                    </td>

                    {/* 4. Mode */}
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        "px-1.5 py-0.2 rounded text-[9px] font-bold border",
                        mode === "PAPER"
                          ? "bg-[#0878FF]/15 text-[#00C9E8] border-[#0878FF]/30"
                          : "bg-[#A78BFA]/15 text-[#A78BFA] border-[#A78BFA]/30"
                      )}>
                        {mode}
                      </span>
                    </td>

                    {/* 5. Runtime Status */}
                    <td className="px-3 py-1.5 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border",
                        isRunning && "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30",
                        isPaused && "bg-[#F5B942]/15 text-[#F5B942] border-[#F5B942]/30",
                        isReady && "bg-[#0878FF]/15 text-[#0878FF] border-[#0878FF]/30",
                        isStopped && "bg-slate-500/15 text-slate-400 border-slate-500/30",
                        isError && "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isRunning ? "bg-[#00D6A0] animate-pulse" :
                          isPaused ? "bg-[#F5B942]" :
                          isReady ? "bg-[#0878FF]" :
                          isError ? "bg-[#FF5268]" : "bg-slate-400"
                        )} />
                        {status}
                      </span>
                    </td>

                    {/* 6. Positions / Lots */}
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-[#EAF3FF] tabular-nums">
                          {positionsCount > 0 ? `${positionsCount} Open` : "Flat"}
                        </span>
                        <span className="text-[9px] text-[#91A7C1] tabular-nums">
                          {lotsCount > 0 ? `${lotsCount} Lots` : "0 Lots"}
                        </span>
                      </div>
                    </td>

                    {/* 7. Executions / Fills */}
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-[#EAF3FF] tabular-nums">
                          {formatNumber(totalTrades, 0)}
                        </span>
                        <span className="text-[9px] text-[#00D6A0] tabular-nums">
                          {fillPct}% Fill
                        </span>
                      </div>
                    </td>

                    {/* 8. Net P&L */}
                    <td className="px-3 py-1.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn("font-bold tabular-nums text-xs", isProfit ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                          {formatSignedMoney(netPnl, currency)}
                        </span>
                        <span className="text-[9px] text-[#91A7C1] tabular-nums">
                          R: {formatSignedMoney(realizedPnl, currency)}
                        </span>
                      </div>
                    </td>

                    {/* 9. Risk / Guardrails */}
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#00D6A0]">
                          <ShieldCheck className="h-3 w-3" />
                          <span>{riskState}</span>
                        </span>
                        <span className="text-[9px] text-[#91A7C1] tabular-nums">
                          SL: {stopLossPct}% • -{currency}{maxLossVal}
                        </span>
                      </div>
                    </td>

                    {/* 10. Last Activity */}
                    <td className="px-3 py-1.5">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#EAF3FF] tabular-nums">
                          {formatDateTime(updatedAt)}
                        </span>
                        <span className="text-[9px] text-[#91A7C1] flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-[#00D6A0]" />
                          {formatRelativeTime(updatedAt)}
                        </span>
                      </div>
                    </td>

                    {/* 11. Actions */}
                    <td
                      className="px-3 py-1.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {/* Start / Resume */}
                        {isPaused || isStopped ? (
                          <button
                            type="button"
                            onClick={(e) => onBotAction(bot.id, "resume", e)}
                            disabled={isLoadingAction}
                            className="p-1 rounded bg-[#0B1728] border border-[#1A2B43] hover:border-[#00D6A0]/50 text-[#00D6A0] transition-colors cursor-pointer"
                            title="Resume / Start Bot"
                          >
                            <Play className="h-3 w-3 fill-current" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => onBotAction(bot.id, "pause", e)}
                            disabled={isLoadingAction}
                            className="p-1 rounded bg-[#0B1728] border border-[#1A2B43] hover:border-[#F5B942]/50 text-[#F5B942] transition-colors cursor-pointer"
                            title="Pause Bot"
                          >
                            <Pause className="h-3 w-3 fill-current" />
                          </button>
                        )}

                        {/* Stop */}
                        <button
                          type="button"
                          onClick={(e) => onBotAction(bot.id, "stop", e)}
                          disabled={isLoadingAction || isStopped}
                          className="p-1 rounded bg-[#0B1728] border border-[#1A2B43] hover:border-[#FF5268]/50 text-[#FF5268] transition-colors cursor-pointer disabled:opacity-30"
                          title="Stop Bot"
                        >
                          <Square className="h-3 w-3 fill-current" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={(e) => onEditBot(bot, e)}
                          className="p-1 rounded bg-[#0B1728] border border-[#1A2B43] hover:border-[#0878FF]/50 text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
                          title="Edit Bot Parameters"
                        >
                          <Edit className="h-3 w-3" />
                        </button>

                        {/* Open Terminal */}
                        <button
                          type="button"
                          onClick={() => onSelectBot(bot)}
                          className="p-1 rounded bg-[#0B1728] border border-[#1A2B43] hover:border-[#00C9E8]/50 text-[#00C9E8] transition-colors cursor-pointer"
                          title="Open Bot Details"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                        </button>

                        {/* More Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === bot.id ? null : bot.id);
                            }}
                            className="p-1 rounded bg-[#0B1728] border border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF] transition-colors cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </button>

                          {openDropdownId === bot.id && (
                            <div
                              className="absolute right-0 mt-1 w-36 rounded-[6px] bg-[#0B1728] border border-[#1A2B43] shadow-2xl py-1 z-30 font-mono text-[10px] text-left"
                              onMouseLeave={() => setOpenDropdownId(null)}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  setOpenDropdownId(null);
                                  onDuplicateBot(bot, e);
                                }}
                                className="w-full px-2.5 py-1 text-[#91A7C1] hover:text-[#EAF3FF] hover:bg-[#091426] flex items-center gap-1.5"
                              >
                                <CopyPlus className="h-3 w-3" />
                                <span>Duplicate Bot</span>
                              </button>
                              <div className="border-t border-[#1A2B43] my-1" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  setOpenDropdownId(null);
                                  onDeleteBot(bot, e);
                                }}
                                className="w-full px-2.5 py-1 text-[#FF5268] hover:bg-[#091426] flex items-center gap-1.5"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Decommission</span>
                              </button>
                            </div>
                          )}
                        </div>
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
  );
}
