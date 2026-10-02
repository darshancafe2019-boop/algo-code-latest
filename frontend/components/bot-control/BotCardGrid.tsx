"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Square,
  AlertTriangle,
  RotateCcw,
  Plus,
  Bot,
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  MoreVertical,
  Trash2,
  Eye,
  Check,
  Zap,
  Radio,
} from "lucide-react";
import { BotRowItem } from "@/types/bot-control";
import { formatMoney, formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";

function getBotTimestamp(bot: BotRowItem): { date: string; time: string; full: string } {
  const ts = bot.updated_at || bot.updatedAt || bot.created_at || bot.createdAt || bot.last_heartbeat || bot.last_signal_at;
  if (ts) {
    try {
      const d = typeof ts === "number" ? new Date(ts) : new Date(String(ts));
      if (!isNaN(d.getTime())) {
        const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const time = d.toLocaleTimeString("en-GB", { hour12: false });
        return { date, time, full: `${date} ${time}` };
      }
    } catch {
      // fallback
    }
  }
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  return { date, time, full: `${date} ${time}` };
}

interface BotCardGridProps {
  bots: BotRowItem[];
  isLoading: boolean;
  totalBotsCount?: number;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onSelectBot: (bot: BotRowItem) => void;
  onBotAction: (botId: string, action: string) => Promise<void> | void;
  onToggleMode?: (botId: string, targetMode?: "LIVE" | "PAPER") => void;
  onDeleteBot: (bot: BotRowItem) => void;
  onCreateBot: () => void;
  selectedMarket: string;
  selectedBotIds: string[];
  onToggleSelectBot: (botId: string) => void;
  currency?: string;
}

export function BotCardGrid({
  bots,
  isLoading,
  totalBotsCount,
  isError,
  errorMessage,
  onRetry,
  onSelectBot,
  onBotAction,
  onToggleMode,
  onDeleteBot,
  onCreateBot,
  selectedMarket,
  selectedBotIds,
  onToggleSelectBot,
  currency = "USD",
}: BotCardGridProps) {
  const [loadingActionBotId, setLoadingActionBotId] = useState<string | null>(null);
  const [togglingModeBotId, setTogglingModeBotId] = useState<string | null>(null);

  const handleAction = async (e: React.MouseEvent, botId: string, action: string) => {
    e.stopPropagation();
    setLoadingActionBotId(botId);
    try {
      await onBotAction(botId, action);
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

  if (isLoading && bots.length === 0 && !isError) {
    return (
      <div className="rounded-[12px] bg-[#0A1422] border border-[#12304A] p-12 text-center text-[#7D8EA5] font-mono text-xs sm:text-sm space-y-3 shadow-md">
        <div className="w-8 h-8 rounded-full border-3 border-[#168BFF] border-t-transparent animate-spin mx-auto" />
        <p className="font-semibold">Loading bot cards...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[12px] bg-[#0A1422] border border-[#FF3B5C]/40 p-12 text-center font-mono text-xs space-y-3 shadow-md">
        <div className="p-3.5 rounded-xl bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 w-fit mx-auto text-[#FF3B5C]">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <p className="text-[#FF3B5C] font-extrabold uppercase tracking-wider text-sm sm:text-base">BOT DATA UNAVAILABLE</p>
          <p className="text-[#7D8EA5] text-xs sm:text-sm font-sans">{errorMessage || "API or Database Connection Error"}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-[#FF3B5C]/20 hover:bg-[#FF3B5C]/30 text-[#FF3B5C] border border-[#FF3B5C]/40 font-bold text-xs sm:text-sm transition inline-flex items-center gap-2 font-sans cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RETRY</span>
          </button>
        )}
      </div>
    );
  }

  if (bots.length === 0) {
    const isTrueEmpty = totalBotsCount !== undefined && totalBotsCount === 0;
    const marketLabel = selectedMarket === "ALL" ? "" : `${selectedMarket} `;
    return (
      <div className="rounded-[12px] bg-[#0A1422] border border-[#12304A] p-12 text-center font-mono text-xs space-y-3 shadow-md">
        <div className="p-3.5 rounded-xl bg-[#05101A] border border-[#12304A] w-fit mx-auto text-[#7D8EA5]">
          <Bot className="w-7 h-7" />
        </div>
        <p className="text-[#7D8EA5] font-sans text-xs sm:text-sm max-w-md mx-auto">
          {isTrueEmpty
            ? "No bots deployed yet. Create a new automated trading bot to deploy strategies."
            : `No ${marketLabel}bots match your current filter.`}
        </p>
        <button
          onClick={onCreateBot}
          className="px-4 py-2 rounded-lg bg-[#168BFF] hover:bg-[#168BFF]/85 text-[#F8FAFC] font-bold text-xs sm:text-sm transition inline-flex items-center gap-2 shadow-md font-sans cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create a Bot</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 font-sans select-none">
      {bots.map((bot) => {
        const state = (bot.status || bot.state || "STOPPED").toUpperCase();
        const isRunning = state === "RUNNING";
        const isPaused = state === "PAUSED";
        const isStopped = state === "STOPPED" || state === "DRAFT";
        const isError = state === "ERROR";
        const isLive = (bot.execution_mode || "").toUpperCase() === "LIVE";
        const isSelected = selectedBotIds.includes(bot.id);
        const isActionLoading = loadingActionBotId === bot.id;
        const isTogglingMode = togglingModeBotId === bot.id;

        const pos = bot.position || { has_position: false, direction: "FLAT", size: 0, entry_price: 0, unrealized_pnl: 0 };
        const unrealizedPnl = Number(pos.unrealized_pnl ?? bot.unrealized_pnl ?? bot.pnl?.unrealized ?? 0);
        const rawTodayPnl = bot.today_pnl ?? bot.pnl?.today ?? bot.live_pnl;
        const pnl = rawTodayPnl !== undefined && Number(rawTodayPnl) !== 0
          ? Number(rawTodayPnl)
          : (Number(bot.pnl?.realized ?? bot.realized_pnl ?? 0) + unrealizedPnl);
        const isPnlPositive = pnl >= 0;

        const botCurrency = (bot.currency || currency || (bot.symbol.includes("NIFTY") || bot.symbol.includes("BANK") ? "INR" : "USD")).toUpperCase();
        const currSym = botCurrency === "INR" || botCurrency === "₹" ? "₹" : botCurrency === "USDT" ? "USDT " : "$";

        const signalInst = bot.signal_instrument || bot.signal_symbol || bot.underlying || bot.symbol;
        const execInst = bot.execution_instrument || bot.execution_symbol || bot.symbol;
        const botTs = getBotTimestamp(bot);

        return (
          <div
            key={bot.bot_id || bot.id}
            onClick={() => onSelectBot(bot)}
            className={cn(
              "p-4 rounded-[12px] bg-[#0A1422] border transition-all cursor-pointer flex flex-col justify-between space-y-3.5 hover:border-[#168BFF]/50 group shadow-md",
              isSelected
                ? "border-[#168BFF] ring-2 ring-[#168BFF]/40 shadow-lg"
                : "border-[#12304A]"
            )}
          >
            {/* Top Card Strip */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectBot(bot.id);
                  }}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#168BFF] border-[#168BFF] text-[#F8FAFC]"
                      : "border-[#12304A] bg-[#05101A] group-hover:border-[#168BFF]/40 text-transparent"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#F8FAFC] group-hover:text-[#22D3EE] transition-colors truncate">
                    {bot.name}
                  </h3>
                  <div className="text-xs font-mono text-[#7D8EA5] flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-bold text-[#F8FAFC]">{execInst}</span>
                    <span>•</span>
                    <span>{bot.timeframe}</span>
                    <span>•</span>
                    <span className="truncate">{bot.strategy}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#38bdf8] flex items-center gap-1.5 mt-0.5">
                    <span>{botTs.time}</span>
                    <span className="text-[#64748b]">·</span>
                    <span className="text-[#94a3b8]">{botTs.date}</span>
                  </div>
                </div>
              </div>

              {/* Mode Toggle Switch */}
              <button
                type="button"
                onClick={(e) => handleToggleModeClick(e, bot.id, bot.execution_mode)}
                disabled={isTogglingMode}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors border shrink-0 cursor-pointer",
                  isLive
                    ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/40 hover:bg-[#FF3B5C]/25"
                    : "bg-[#168BFF]/15 text-[#22D3EE] border-[#168BFF]/30 hover:bg-[#168BFF]/25"
                )}
                title={isLive ? "Click to switch to PAPER mode" : "Click to switch to LIVE mode"}
              >
                {isTogglingMode ? "..." : isLive ? "LIVE" : "PAPER"}
              </button>
            </div>

            {/* Middle Section: Status, Position & Today PnL */}
            <div className="p-3 bg-[#05101A] border border-[#12304A] rounded-xl space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#7D8EA5] font-sans">Lifecycle &amp; Health</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
                      isRunning
                        ? "bg-[#00E89A]/15 text-[#00E89A] border-[#00E89A]/30"
                        : isPaused
                        ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30"
                        : isError
                        ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30"
                        : "bg-[#0A1422] text-[#7D8EA5] border-[#12304A]"
                    )}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isRunning
                          ? "bg-[#00E89A] animate-pulse"
                          : isPaused
                          ? "bg-[#F59E0B]"
                          : isError
                          ? "bg-[#FF3B5C]"
                          : "bg-[#7D8EA5]"
                      }`}
                    />
                    <span>{state}</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#0A1422] border border-[#12304A] text-[10px] text-[#00E89A]">
                    {bot.health || "HEALTHY"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#7D8EA5] font-sans">Active Position</span>
                {pos.has_position ? (
                  <span
                    className={cn(
                      "font-bold text-xs sm:text-sm",
                      pos.direction === "LONG" ? "text-[#00E89A]" : "text-[#FF3B5C]"
                    )}
                  >
                    {pos.direction} {pos.size} @ {currSym}{formatNumber(pos.entry_price, 2)}
                  </span>
                ) : (
                  <span className="text-[#7D8EA5] font-sans text-xs">FLAT (Idle)</span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#10263A] pt-2">
                <span className="text-xs text-[#7D8EA5] font-sans">Today P&amp;L</span>
                <span
                  className={cn(
                    "font-extrabold text-sm sm:text-base tabular-nums",
                    isPnlPositive ? "text-[#00E89A]" : "text-[#FF3B5C]"
                  )}
                >
                  {isPnlPositive ? "+" : ""}{formatMoney(Math.abs(pnl), currSym)}
                </span>
              </div>
            </div>

            {/* Bottom Card Strip: Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1 font-mono">
              <div className="text-xs text-[#7D8EA5] truncate">
                Cap: {formatMoney(bot.allocated_capital, currSym)}
              </div>

              <div className="flex items-center gap-1.5">
                {isStopped && (
                  <button
                    type="button"
                    onClick={(e) => handleAction(e, bot.id, "START")}
                    disabled={isActionLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#00E89A]/15 border border-[#00E89A]/30 text-[#00E89A] hover:bg-[#00E89A]/25 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    type="button"
                    onClick={(e) => handleAction(e, bot.id, "PAUSE")}
                    disabled={isActionLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/25 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                {isPaused && (
                  <button
                    type="button"
                    onClick={(e) => handleAction(e, bot.id, "RESUME")}
                    disabled={isActionLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#168BFF]/15 border border-[#168BFF]/30 text-[#22D3EE] hover:bg-[#168BFF]/25 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBot(bot);
                  }}
                  className="p-1.5 rounded-lg bg-[#05101A] border border-[#12304A] hover:border-[#168BFF]/40 text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBot(bot);
                  }}
                  className="p-1.5 rounded-lg bg-[#05101A] border border-[#12304A] hover:border-[#FF3B5C]/40 text-[#7D8EA5] hover:text-[#FF3B5C] transition-colors cursor-pointer"
                  title="Delete Bot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
