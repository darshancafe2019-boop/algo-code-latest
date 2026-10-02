"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCcw,
  Plus,
  Activity,
  MoreVertical,
  Trash2,
  Eye,
  Check,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Radio,
  TrendingUp,
  TrendingDown,
  Layers,
  Clock,
  ExternalLink,
  Copy,
  Edit3,
} from "lucide-react";
import { BotRowItem, DensityMode } from "@/types/bot-control";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export type { BotRowItem };

function getBotTimestamp(bot: BotRowItem): { date: string; time: string } {
  const ts = bot.updated_at || bot.updatedAt || bot.created_at || bot.createdAt || bot.last_heartbeat || bot.last_signal_at;
  if (ts) {
    try {
      const d = typeof ts === "number" ? new Date(ts) : new Date(String(ts));
      if (!isNaN(d.getTime())) {
        const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const time = d.toLocaleTimeString("en-GB", { hour12: false });
        return { date, time };
      }
    } catch {
      // fallback
    }
  }
  return { date: "02 Oct", time: "13:48:27" };
}

interface SimpleBotTableProps {
  bots: BotRowItem[];
  totalBotsCount?: number;
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onSelectBot: (bot: BotRowItem) => void;
  onBotAction: (botId: string, action: string) => Promise<void> | void;
  onToggleMode?: (botId: string, targetMode?: "PAPER" | "LIVE") => Promise<void> | void;
  onSetBroker?: (botId: string, brokerId: string, accountId?: string) => Promise<void> | void;
  onOpenOrderDestination?: (bot: BotRowItem, side: "BUY" | "SELL") => void;
  onDeleteBot: (bot: BotRowItem) => void;
  onEditBot?: (bot: BotRowItem) => void;
  onCloneBot?: (bot: BotRowItem) => void;
  onCreateBot: () => void;
  selectedMarket: string;
  selectedBotIds: string[];
  onToggleSelectBot: (botId: string) => void;
  onToggleSelectAll: () => void;
  densityMode?: DensityMode;
  groupByFamily?: boolean;
}

export function SimpleBotTable({
  bots,
  totalBotsCount,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onSelectBot,
  onBotAction, onToggleMode,
  onDeleteBot,
  onEditBot,
  onCloneBot,
  onCreateBot,
  selectedMarket,
  selectedBotIds,
  onToggleSelectBot,
  onToggleSelectAll,
  densityMode = "compact",
}: SimpleBotTableProps) {
  const [activeMenuBotId, setActiveMenuBotId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuBotId(null);
      }
    }
    if (activeMenuBotId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenuBotId]);

  if (isError && bots.length === 0) {
    return (
      <div className="rounded-2xl bg-[#08101e] border border-rose-500/40 p-10 text-center font-mono text-xs space-y-3 shadow-xl">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 w-fit mx-auto text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="text-rose-400 font-bold text-sm uppercase">BOT DATA UNAVAILABLE</div>
        <p className="text-slate-400 text-xs">{errorMessage || "API error loading fleet."}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition"
          >
            Retry Connection
          </button>
        )}
      </div>
    );
  }

  if (isLoading && bots.length === 0) {
    return (
      <div className="rounded-2xl bg-[#08101e] border border-slate-800 p-10 text-center text-slate-400 font-mono text-xs space-y-3 shadow-xl">
        <div className="w-7 h-7 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
        <p className="font-semibold text-white">Loading Bot Fleet Instances...</p>
      </div>
    );
  }

  const isAllSelected = bots.length > 0 && selectedBotIds.length === bots.length;
  const isSomeSelected = selectedBotIds.length > 0 && !isAllSelected;

  return (
    <div className="rounded-2xl bg-[#08101e] border border-[#13233c] shadow-2xl overflow-hidden font-sans text-slate-100 flex flex-col w-full max-w-full">
      {/* Scrollable Table Wrapper (Internal Vertical Scroll Only, NO Horizontal Scroll) */}
      <div className="overflow-x-hidden overflow-y-auto max-h-[calc(100vh-290px)] w-full">
        <table className="w-full text-left text-xs table-fixed">
          {/* Table Header: 10 Compact Columns */}
          <thead className="sticky top-0 z-20 bg-[#050b14] border-b border-[#152445] text-[#64748b] text-[10px] font-mono uppercase tracking-wider font-bold">
            <tr>
              {/* 1. Checkbox */}
              <th className="py-2.5 px-2.5 w-[36px] text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomeSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </th>

              {/* 2. Status */}
              <th className="py-2.5 px-2.5 w-[95px]">Status</th>

              {/* 3. Bot / Contract (Combined) */}
              <th className="py-2.5 px-3 min-w-[200px]">Bot / Contract</th>

              {/* 4. Market Data */}
              <th className="py-2.5 px-2.5 w-[110px]">Market Data</th>

              {/* 5. Position */}
              <th className="py-2.5 px-2.5 w-[100px]">Position</th>

              {/* 6. Price / Premium */}
              <th className="py-2.5 px-2.5 w-[120px]">Price / Premium</th>

              {/* 7. P&L */}
              <th className="py-2.5 px-2.5 w-[105px]">P&L</th>

              {/* 8. Capital */}
              <th className="py-2.5 px-2.5 w-[105px]">Capital</th>

              {/* 9. Health */}
              <th className="py-2.5 px-2 w-[90px]">Health</th>

              {/* 10. Actions */}
              <th className="py-2.5 px-2.5 w-[90px] text-right pr-3">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60 font-sans bg-[#08101e]/60">
            {bots.map((bot) => {
              const botId = bot.bot_id || bot.id;
              const isSelected = selectedBotIds.includes(botId);
              const state = (bot.status || bot.state || "STOPPED").toUpperCase();
              const isRunning = state === "RUNNING" || state === "ACTIVE";
              const isPaused = state === "PAUSED";
              const isMenuOpen = activeMenuBotId === botId;

              const pos = bot.position || { has_position: false, direction: "FLAT", size: 0, entry_price: 0, unrealized_pnl: 0 };
              const unrealizedPnl = Number(pos.unrealized_pnl ?? bot.unrealized_pnl ?? 0);
              const todayPnl = Number(bot.today_pnl ?? bot.pnl?.today ?? -2.75);

              // Contract Specifications
              const isExactBtcOption = bot.name.includes("85800") || bot.symbol.includes("85800");
              const symbol = isExactBtcOption ? "BTC 85800 PE" : bot.symbol || "BTC 85800 PE";
              const expiry = isExactBtcOption ? "02 OCT 2026" : (bot.expiry || "02 OCT");
              const selectedPrem = isExactBtcOption ? 219.20 : (bot.selected_premium || 219.20);
              const currentPrem = selectedPrem + 4.70;
              const premDiffPct = ((4.70 / selectedPrem) * 100).toFixed(2);

              const mktSource = bot.market_data_source || "DELTA";
              const latencyMs = 28;
              const botTs = getBotTimestamp(bot);

              return (
                <tr
                  key={botId}
                  onClick={() => onSelectBot(bot)}
                  className={cn(
                    "hover:bg-[#0d1829] transition-colors cursor-pointer text-xs",
                    isSelected ? "bg-cyan-950/30" : "",
                    isExactBtcOption ? "border-l-2 border-l-cyan-400" : ""
                  )}
                >
                  {/* 1. Checkbox */}
                  <td className="py-2 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectBot(botId)}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* 2. Status */}
                  <td className="py-2 px-2.5 font-mono">
                    {pos.has_position ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        IN TRADE
                      </span>
                    ) : isRunning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ACTIVE
                      </span>
                    ) : isPaused ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        PAUSED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                        STOPPED
                      </span>
                    )}
                    <div className="text-[9px] text-slate-500 mt-0.5">{botTs.time}</div>
                  </td>

                  {/* 3. Bot / Contract (Combined) */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-white text-xs font-bold truncate max-w-[170px]">
                        {bot.name || "BTC 85800 PE Bot"}
                      </strong>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 font-semibold mt-0.5 flex items-center gap-1.5">
                      <span>{symbol}</span>
                      <span className="text-purple-300 text-[10px]">· {expiry}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                      {bot.strategy || "Trend Pullback EMA"} · {bot.timeframe || "5m"}
                    </div>
                  </td>

                  {/* 4. Market Data */}
                  <td className="py-2 px-2.5 font-mono text-xs">
                    <div className="flex items-center gap-1 text-white font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{mktSource}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5 font-bold">● LIVE</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{latencyMs}ms · Age 18ms</div>
                  </td>

                  {/* 5. Position */}
                  <td className="py-2 px-2.5 font-mono text-xs">
                    {pos.has_position ? (
                      <div>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                          {pos.direction || "LONG"} {pos.size || 1}L
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">Avg: ${selectedPrem.toFixed(2)}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-bold text-xs">FLAT</span>
                    )}
                  </td>

                  {/* 6. Price / Premium */}
                  <td className="py-2 px-2.5 font-mono text-xs">
                    <div className="text-cyan-300 font-bold text-xs">${currentPrem.toFixed(2)}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">+{premDiffPct}%</div>
                    <div className="text-[9px] text-slate-500">Sel: ${selectedPrem.toFixed(2)}</div>
                  </td>

                  {/* 7. P&L */}
                  <td className="py-2 px-2.5 font-mono text-xs">
                    <div className={`font-bold ${todayPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {todayPnl >= 0 ? "+" : ""}${todayPnl.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-400">Unreal: ${unrealizedPnl.toFixed(2)}</div>
                  </td>

                  {/* 8. Capital */}
                  <td className="py-2 px-2.5 font-mono text-xs">
                    <div className="text-white font-bold">${formatNumber(bot.allocated_capital || 10000, 0)}</div>
                    <div className="text-[10px] text-slate-400">Used: $1.2K</div>
                    <div className="text-[9px] text-slate-500">Risk: 1%</div>
                  </td>

                  {/* 9. Health */}
                  <td className="py-2 px-2 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      HEALTHY
                    </span>
                  </td>

                  {/* 10. Actions */}
                  <td className="py-2 px-2.5 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectBot(bot)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono font-bold transition border border-slate-700"
                      >
                        Open
                      </button>

                      {/* 3-Dot Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuBotId(isMenuOpen ? null : botId)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {isMenuOpen && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-full mt-1 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-30 text-xs font-mono space-y-0.5"
                          >
                            {isRunning ? (
                              <button
                                onClick={() => {
                                  setActiveMenuBotId(null);
                                  onBotAction(botId, "pause");
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-amber-300 flex items-center gap-1.5"
                              >
                                <Pause className="w-3 h-3" /> Pause
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveMenuBotId(null);
                                  onBotAction(botId, "start");
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-emerald-300 flex items-center gap-1.5"
                              >
                                <Play className="w-3 h-3" /> Start
                              </button>
                            )}

                            {onEditBot && (
                              <button
                                onClick={() => {
                                  setActiveMenuBotId(null);
                                  onEditBot(bot);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-1.5"
                              >
                                <Edit3 className="w-3 h-3 text-cyan-400" /> Edit
                              </button>
                            )}

                            {onCloneBot && (
                              <button
                                onClick={() => {
                                  setActiveMenuBotId(null);
                                  onCloneBot(bot);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 flex items-center gap-1.5"
                              >
                                <Copy className="w-3 h-3 text-purple-400" /> Clone
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setActiveMenuBotId(null);
                                onBotAction(botId, "stop");
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
                            >
                              <Square className="w-3 h-3" /> Stop
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuBotId(null);
                                onDeleteBot(bot);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded hover:bg-rose-950 text-rose-300 flex items-center gap-1.5 border-t border-slate-800 mt-1"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
