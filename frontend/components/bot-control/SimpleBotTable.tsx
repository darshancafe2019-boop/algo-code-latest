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
  Minus,
} from "lucide-react";

export interface BotRowItem {
  id: string;
  bot_id: string;
  name: string;
  symbol: string;
  asset_class: string;
  timeframe: string;
  strategy: string;
  strategy_id: string;
  strategy_version: string;
  execution_mode: string;
  status: string;
  state: string;
  health: string;
  allocated_capital: number;
  position: {
    has_position: boolean;
    direction: string;
    size: number;
    entry_price: number;
    unrealized_pnl: number;
    stop_loss?: number | null;
    take_profit?: number | null;
  };
  pnl: {
    today: number;
    realized: number;
    unrealized: number;
    net: number;
  };
  live_pnl: number;
  next_action: string;
  last_heartbeat?: string;
  last_error?: string;
  updated_at: string;
  config: Record<string, any>;
  indicators: any[];
}

interface SimpleBotTableProps {
  bots: BotRowItem[];
  isLoading: boolean;
  onSelectBot: (bot: BotRowItem) => void;
  onBotAction: (botId: string, action: string) => Promise<void> | void;
  onToggleMode?: (botId: string, targetMode?: "LIVE" | "PAPER") => void;
  onDeleteBot: (bot: BotRowItem) => void;
  onCreateBot: () => void;
  selectedMarket: string;
  selectedBotIds: string[];
  onToggleSelectBot: (botId: string) => void;
  onToggleSelectAll: () => void;
}

export function SimpleBotTable({
  bots,
  isLoading,
  onSelectBot,
  onBotAction,
  onToggleMode,
  onDeleteBot,
  onCreateBot,
  selectedMarket,
  selectedBotIds,
  onToggleSelectBot,
  onToggleSelectAll,
}: SimpleBotTableProps) {
  const [loadingActionBotId, setLoadingActionBotId] = useState<string | null>(null);
  const [togglingModeBotId, setTogglingModeBotId] = useState<string | null>(null);
  const [activeMenuBotId, setActiveMenuBotId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
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

  const handleAction = async (e: React.MouseEvent, botId: string, action: string) => {
    e.stopPropagation();
    setActiveMenuBotId(null);
    setLoadingActionBotId(botId);
    try {
      await onBotAction(botId, action);
    } catch {
      // Handled and displayed via parent notification banner
    } finally {
      setLoadingActionBotId(null);
    }
  };

  const handleToggleModeClick = async (e: React.MouseEvent, botId: string, currentMode: string) => {
    e.stopPropagation();
    if (!onToggleMode) return;
    const targetMode = (currentMode || "").toUpperCase() === "LIVE" ? "PAPER" : "LIVE";
    setTogglingModeBotId(botId);
    try {
      await onToggleMode(botId, targetMode);
    } finally {
      setTogglingModeBotId(null);
    }
  };
  const handleDeleteClick = (e: React.MouseEvent, bot: BotRowItem) => {
    e.stopPropagation();
    setActiveMenuBotId(null);
    onDeleteBot(bot);
  };

  const handleDetailsClick = (e: React.MouseEvent, bot: BotRowItem) => {
    e.stopPropagation();
    setActiveMenuBotId(null);
    onSelectBot(bot);
  };

  const allFilteredSelected =
    bots.length > 0 && bots.every((b) => selectedBotIds.includes(b.id));
  const someFilteredSelected =
    bots.some((b) => selectedBotIds.includes(b.id)) && !allFilteredSelected;

  if (isLoading && bots.length === 0) {
    return (
      <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono text-xs shadow-xl">
        <Activity className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
        Loading fleet state...
      </div>
    );
  }

  if (bots.length === 0) {
    const marketLabel = selectedMarket === "ALL" ? "" : `${selectedMarket} `;
    return (
      <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl p-12 text-center font-mono text-xs shadow-xl space-y-3">
        <p className="text-slate-400 font-sans text-sm">
          No {marketLabel}bots match your current filter.
        </p>
        <button
          onClick={onCreateBot}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create a Bot</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl overflow-visible backdrop-blur-md shadow-xl font-mono text-xs">
      <div className="overflow-x-auto rounded-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] select-none">
            <tr>
              {/* Checkbox Column */}
              <th className="py-3 px-3 w-10 text-center">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                    allFilteredSelected
                      ? "bg-cyan-500 border-cyan-400 text-slate-950"
                      : someFilteredSelected
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "border-slate-700 bg-slate-800/80 hover:border-slate-500 text-transparent"
                  }`}
                  title={allFilteredSelected ? "Deselect All" : "Select All"}
                >
                  {allFilteredSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {someFilteredSelected && <Minus className="w-3 h-3 stroke-[3]" />}
                </button>
              </th>
              <th className="py-3 px-4 font-semibold">BOT</th>
              <th className="py-3 px-4 font-semibold">MARKET</th>
              <th className="py-3 px-4 font-semibold text-center">MODE</th>
              <th className="py-3 px-4 font-semibold">STATUS</th>
              <th className="py-3 px-4 font-semibold">POSITION</th>
              <th className="py-3 px-4 font-semibold text-right">TODAY P&L</th>
              <th className="py-3 px-4 font-semibold text-center">HEALTH</th>
              <th className="py-3 px-4 font-semibold text-right w-20">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {bots.map((bot) => {
              const state = (bot.status || bot.state || "STOPPED").toUpperCase();
              const isRunning = state === "RUNNING";
              const isPaused = state === "PAUSED";
              const isStopped = state === "STOPPED" || state === "DRAFT";
              const isError = state === "ERROR";
              const isRecovering = state === "RECOVERING";
              const isLive = (bot.execution_mode || "").toUpperCase() === "LIVE";
              const isTogglingMode = togglingModeBotId === bot.id;

              const pos = bot.position || { has_position: false, direction: "FLAT", size: 0 };
              const pnl = bot.pnl?.today ?? bot.live_pnl ?? 0.0;
              const isPnlPositive = pnl >= 0;

              const isActionLoading = loadingActionBotId === bot.id;
              const isSelected = selectedBotIds.includes(bot.id);
              const isMenuOpen = activeMenuBotId === bot.id;

              return (
                <tr
                  key={bot.id}
                  onClick={() => onSelectBot(bot)}
                  className={`transition cursor-pointer group ${
                    isSelected
                      ? "bg-cyan-500/10 hover:bg-cyan-500/15"
                      : "hover:bg-slate-800/30"
                  }`}
                >
                  {/* Checkbox */}
                  <td
                    className="py-3 px-3 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectBot(bot.id);
                    }}
                  >
                    <button
                      type="button"
                      className={`w-4 h-4 rounded border flex items-center justify-center transition mx-auto ${
                        isSelected
                          ? "bg-cyan-500 border-cyan-400 text-slate-950"
                          : "border-slate-700 bg-slate-800/60 group-hover:border-slate-500 text-transparent"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  </td>

                  {/* 1. BOT */}
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-white group-hover:text-cyan-300 transition text-xs">
                      {bot.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans truncate max-w-xs">
                      {bot.next_action || bot.strategy}
                    </div>
                  </td>

                  {/* 2. MARKET */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-200 text-xs">{bot.symbol}</div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      {bot.timeframe}
                    </div>
                  </td>

                  {/* 3. MODE (Interactive Live / Paper Switch) */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => handleToggleModeClick(e, bot.id, bot.execution_mode)}
                      disabled={isTogglingMode}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border shadow-sm ${
                        isLive
                          ? "bg-rose-950/90 text-rose-300 border-rose-600/80 hover:bg-rose-900/90 hover:border-rose-400"
                          : "bg-cyan-950/90 text-cyan-300 border-cyan-600/80 hover:bg-cyan-900/90 hover:border-cyan-400"
                      }`}
                      title={isLive ? "Currently executing LIVE orders. Click to switch to PAPER simulation." : "Currently in PAPER mode. Click to take LIVE (real order execution)."}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-rose-400 animate-pulse" : "bg-cyan-400"}`} />
                      <span>{isTogglingMode ? "SWITCHING..." : isLive ? "LIVE" : "PAPER"}</span>
                    </button>
                  </td>

                  {/* 4. STATUS */}
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isRunning
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
                          : isPaused
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : isError
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : isRecovering
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {state}
                    </span>
                  </td>

                  {/* 5. POSITION */}
                  <td className="py-3 px-4">
                    {pos.has_position ? (
                      <div>
                        <span
                          className={`font-black text-xs ${
                            pos.direction === "LONG" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {pos.direction} {pos.size}
                        </span>
                        <div className="text-[10px] text-slate-500 font-sans">
                          @ ${pos.entry_price ? pos.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-sans text-xs">—</span>
                    )}
                  </td>

                  {/* 6. TODAY P&L */}
                  <td className="py-3 px-4 text-right">
                    <div
                      className={`font-black text-xs ${
                        isPnlPositive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isPnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-500 font-sans">
                      Cap: ${(bot.allocated_capital / 1000).toFixed(1)}K
                    </div>
                  </td>

                  {/* 7. HEALTH */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        bot.health === "HEALTHY"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : bot.health === "ERROR"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {bot.health || "HEALTHY"}
                    </span>
                  </td>

                  {/* 7. COMPACT CONSOLIDATED KEBAB ACTION */}
                  <td className="py-3 px-4 text-right relative">
                    <div className="inline-flex items-center justify-end relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuBotId(isMenuOpen ? null : bot.id);
                        }}
                        disabled={isActionLoading}
                        className={`p-1.5 rounded-lg border transition flex items-center justify-center ${
                          isMenuOpen
                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10"
                            : "bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-500"
                        } disabled:opacity-50`}
                        title="Bot Actions"
                      >
                        {isActionLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MoreVertical className="w-4 h-4" />
                        )}
                      </button>

                      {/* Dropdown Menu Popup */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 z-40 w-44 bg-[#0B132B] border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-100"
                        >
                          {/* Contextual Execution Controls */}
                          {isStopped && (
                            <button
                              type="button"
                              onClick={(e) => handleAction(e, bot.id, "START")}
                              className="w-full px-3 py-2 text-emerald-400 hover:bg-emerald-500/15 flex items-center gap-2 font-bold transition"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Bot</span>
                            </button>
                          )}

                          {isRunning && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "PAUSE")}
                                className="w-full px-3 py-2 text-amber-400 hover:bg-amber-500/15 flex items-center gap-2 font-bold transition"
                              >
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Pause Bot</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "STOP")}
                                className="w-full px-3 py-2 text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 font-bold transition"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Stop Bot</span>
                              </button>
                            </>
                          )}

                          {isPaused && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "RESUME")}
                                className="w-full px-3 py-2 text-cyan-300 hover:bg-cyan-500/15 flex items-center gap-2 font-bold transition"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Resume Bot</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "STOP")}
                                className="w-full px-3 py-2 text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 font-bold transition"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                <span>Stop Bot</span>
                              </button>
                            </>
                          )}

                          {isError && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleDetailsClick(e, bot)}
                                className="w-full px-3 py-2 text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 font-bold transition"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Review Incident</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleAction(e, bot.id, "START")}
                                className="w-full px-3 py-2 text-cyan-300 hover:bg-cyan-500/15 flex items-center gap-2 font-bold transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Retry / Start</span>
                              </button>
                            </>
                          )}

                          {isRecovering && (
                            <button
                              type="button"
                              onClick={(e) => handleAction(e, bot.id, "STOP")}
                              className="w-full px-3 py-2 text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 font-bold transition"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop Bot</span>
                            </button>
                          )}

                          {/* View Details Option (available on all except error which has Review) */}
                          {!isError && (
                            <button
                              type="button"
                              onClick={(e) => handleDetailsClick(e, bot)}
                              className="w-full px-3 py-2 text-slate-300 hover:bg-slate-800 flex items-center gap-2 font-medium transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              <span>View Details</span>
                            </button>
                          )}

                          {/* Divider */}
                          <div className="h-px bg-slate-800 my-1" />

                          {/* Delete / Force Delete Bot Option (available on ALL bot states) */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, bot)}
                            className={`w-full px-3 py-2 flex items-center gap-2 font-bold transition ${
                              isError || isRecovering
                                ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 hover:text-rose-300"
                                : "text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>{isError || isRecovering ? "Force Delete Bot" : "Delete Bot"}</span>
                          </button>
                        </div>
                      )}
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
