"use client";

import React, { useState } from "react";
import { Play, Pause, Square, AlertTriangle, RotateCcw, Plus, ArrowRight, Activity, ShieldCheck, ShieldAlert } from "lucide-react";

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
  onBotAction: (botId: string, action: string) => void;
  onCreateBot: () => void;
  selectedMarket: string;
}

export function SimpleBotTable({
  bots,
  isLoading,
  onSelectBot,
  onBotAction,
  onCreateBot,
  selectedMarket,
}: SimpleBotTableProps) {
  const [loadingActionBotId, setLoadingActionBotId] = useState<string | null>(null);

  const handleAction = async (e: React.MouseEvent, botId: string, action: string) => {
    e.stopPropagation();
    setLoadingActionBotId(botId);
    try {
      await onBotAction(botId, action);
    } finally {
      setLoadingActionBotId(null);
    }
  };

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
    <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl font-mono text-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
            <tr>
              <th className="py-3 px-4 font-semibold">BOT</th>
              <th className="py-3 px-4 font-semibold">MARKET</th>
              <th className="py-3 px-4 font-semibold">STATUS</th>
              <th className="py-3 px-4 font-semibold">POSITION</th>
              <th className="py-3 px-4 font-semibold text-right">TODAY P&L</th>
              <th className="py-3 px-4 font-semibold text-center">HEALTH</th>
              <th className="py-3 px-4 font-semibold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {bots.map((bot) => {
              const state = bot.status || bot.state || "STOPPED";
              const isRunning = state === "RUNNING";
              const isPaused = state === "PAUSED";
              const isStopped = state === "STOPPED" || state === "DRAFT";
              const isError = state === "ERROR";
              const isRecovering = state === "RECOVERING";

              const pos = bot.position || { has_position: false, direction: "FLAT", size: 0 };
              const pnl = bot.pnl?.today ?? bot.live_pnl ?? 0.0;
              const isPnlPositive = pnl >= 0;

              const isActionLoading = loadingActionBotId === bot.id;

              return (
                <tr
                  key={bot.id}
                  onClick={() => onSelectBot(bot)}
                  className="hover:bg-slate-800/30 transition cursor-pointer group"
                >
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
                      {bot.timeframe} • {bot.execution_mode}
                    </div>
                  </td>

                  {/* 3. STATUS */}
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

                  {/* 4. POSITION */}
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

                  {/* 5. TODAY P&L */}
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

                  {/* 6. HEALTH */}
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

                  {/* 7. CONTEXTUAL ACTION */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isStopped && (
                        <button
                          onClick={(e) => handleAction(e, bot.id, "START")}
                          disabled={isActionLoading}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start</span>
                        </button>
                      )}

                      {isRunning && (
                        <>
                          <button
                            onClick={(e) => handleAction(e, bot.id, "PAUSE")}
                            disabled={isActionLoading}
                            className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                            title="Pause Strategy"
                          >
                            <Pause className="w-3 h-3 fill-current" />
                            <span>Pause</span>
                          </button>

                          <button
                            onClick={(e) => handleAction(e, bot.id, "STOP")}
                            disabled={isActionLoading}
                            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-rose-400 text-rose-400 font-bold text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                            title="Stop Bot"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop</span>
                          </button>
                        </>
                      )}

                      {isPaused && (
                        <>
                          <button
                            onClick={(e) => handleAction(e, bot.id, "RESUME")}
                            disabled={isActionLoading}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Resume</span>
                          </button>

                          <button
                            onClick={(e) => handleAction(e, bot.id, "STOP")}
                            disabled={isActionLoading}
                            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-rose-400 text-rose-400 font-bold text-[11px] transition flex items-center gap-1 disabled:opacity-50"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop</span>
                          </button>
                        </>
                      )}

                      {isError && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBot(bot);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/50 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Review</span>
                        </button>
                      )}

                      {isRecovering && (
                        <span className="text-[10px] text-cyan-400 font-bold animate-pulse">
                          Recovering...
                        </span>
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
