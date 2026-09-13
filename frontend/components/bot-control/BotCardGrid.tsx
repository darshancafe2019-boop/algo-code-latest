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
  DollarSign,
  Layers,
  MoreVertical,
  Trash2,
  Eye,
  Check,
} from "lucide-react";
import { BotRowItem } from "@/types/bot-control";

interface BotCardGridProps {
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
}

export function BotCardGrid({
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

  if (isLoading && bots.length === 0) {
    return (
      <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-12 text-center text-[#7D8EA5] font-mono text-xs space-y-3">
        <div className="w-7 h-7 rounded-full border-2 border-[#168BFF] border-t-transparent animate-spin mx-auto" />
        <p>Synchronizing bot fleet cards...</p>
      </div>
    );
  }

  if (bots.length === 0) {
    const marketLabel = selectedMarket === "ALL" ? "" : `${selectedMarket} `;
    return (
      <div className="rounded-[10px] bg-[#0A1422] border border-[#12304A] p-12 text-center font-mono text-xs space-y-3">
        <div className="p-3 rounded-lg bg-[#05101A] border border-[#12304A] w-fit mx-auto text-[#7D8EA5]">
          <Bot className="w-6 h-6" />
        </div>
        <p className="text-[#7D8EA5] font-sans text-xs max-w-md mx-auto">
          No {marketLabel}bots match your current filter. Create a new automated trading bot to deploy strategies.
        </p>
        <button
          onClick={onCreateBot}
          className="px-3.5 py-1.5 rounded-lg bg-[#168BFF] hover:bg-[#168BFF]/85 text-[#F8FAFC] font-semibold text-[11px] transition inline-flex items-center gap-1.5 shadow-xs font-sans cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Create a Bot</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 font-sans select-none">
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
        const pnl = bot.pnl?.today ?? bot.live_pnl ?? 0.0;
        const isPnlPositive = pnl >= 0;

        return (
          <div
            key={bot.id}
            onClick={() => onSelectBot(bot)}
            className={`p-4 rounded-[10px] bg-[#0A1422] border transition-colors cursor-pointer flex flex-col justify-between space-y-3 hover:border-[#168BFF]/40 group ${
              isSelected
                ? "border-[#168BFF] shadow-md shadow-[#168BFF]/10"
                : "border-[#12304A]"
            }`}
          >
            {/* Top Card Strip */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectBot(bot.id);
                  }}
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#168BFF] border-[#168BFF] text-[#F8FAFC]"
                      : "border-[#12304A] bg-[#05101A] group-hover:border-[#168BFF]/40 text-transparent"
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>

                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#22D3EE] transition-colors truncate">
                    {bot.name}
                  </h3>
                  <div className="text-[10px] font-mono text-[#7D8EA5] flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-[#F8FAFC]">{bot.symbol}</span>
                    <span>•</span>
                    <span>{bot.timeframe}</span>
                    <span>•</span>
                    <span className="truncate">{bot.strategy}</span>
                  </div>
                </div>
              </div>

              {/* Mode Toggle Switch */}
              <button
                onClick={(e) => handleToggleModeClick(e, bot.id, bot.execution_mode)}
                disabled={isTogglingMode}
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold transition-colors border shrink-0 cursor-pointer ${
                  isLive
                    ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/40 hover:bg-[#FF3B5C]/25"
                    : "bg-[#168BFF]/15 text-[#22D3EE] border-[#168BFF]/30 hover:bg-[#168BFF]/25"
                }`}
                title={isLive ? "Click to switch to PAPER mode" : "Click to switch to LIVE mode"}
              >
                {isTogglingMode ? "..." : isLive ? "LIVE" : "PAPER"}
              </button>
            </div>

            {/* Middle Section: Status, Position & Today PnL */}
            <div className="p-2.5 bg-[#05101A] border border-[#12304A] rounded-lg space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#7D8EA5] font-sans">Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                    isRunning
                      ? "bg-[#00E89A]/10 text-[#00E89A] border-[#00E89A]/20"
                      : isPaused
                      ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20"
                      : isError
                      ? "bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/20"
                      : "bg-[#0A1422] text-[#7D8EA5] border-[#12304A]"
                  }`}
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
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#7D8EA5] font-sans">Active Position</span>
                {pos.has_position ? (
                  <span
                    className={`font-bold text-[11px] ${
                      pos.direction === "LONG" ? "text-[#00E89A]" : "text-[#FF3B5C]"
                    }`}
                  >
                    {pos.direction} {pos.size} @ ${pos.entry_price ? pos.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
                  </span>
                ) : (
                  <span className="text-[#7D8EA5] font-sans text-[11px]">FLAT</span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#10263A] pt-1.5">
                <span className="text-[10px] text-[#7D8EA5] font-sans">Today P&L</span>
                <span
                  className={`font-bold text-xs ${
                    isPnlPositive ? "text-[#00E89A]" : "text-[#FF3B5C]"
                  }`}
                >
                  {isPnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Bottom Card Strip: Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-0.5 font-mono">
              <div className="text-[10px] text-[#7D8EA5] truncate">
                Cap: ${(bot.allocated_capital / 1000).toFixed(1)}K
              </div>

              <div className="flex items-center gap-1">
                {/* 1-Click Contextual Action */}
                {isStopped && (
                  <button
                    onClick={(e) => handleAction(e, bot.id, "START")}
                    disabled={isActionLoading}
                    className="px-2.5 py-1 rounded-md bg-[#00E89A]/15 border border-[#00E89A]/30 text-[#00E89A] hover:bg-[#00E89A]/25 text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={(e) => handleAction(e, bot.id, "PAUSE")}
                    disabled={isActionLoading}
                    className="px-2.5 py-1 rounded-md bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/25 text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                {isPaused && (
                  <button
                    onClick={(e) => handleAction(e, bot.id, "RESUME")}
                    disabled={isActionLoading}
                    className="px-2.5 py-1 rounded-md bg-[#168BFF]/15 border border-[#168BFF]/30 text-[#22D3EE] hover:bg-[#168BFF]/25 text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                {isError && (
                  <button
                    onClick={(e) => handleAction(e, bot.id, "START")}
                    disabled={isActionLoading}
                    className="px-2.5 py-1 rounded-md bg-[#168BFF]/15 border border-[#168BFF]/30 text-[#22D3EE] hover:bg-[#168BFF]/25 text-[10px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBot(bot);
                  }}
                  className="p-1 rounded-md bg-[#05101A] border border-[#12304A] hover:border-[#168BFF]/40 text-[#7D8EA5] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                  title="View Details"
                >
                  <Eye className="w-3 h-3" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBot(bot);
                  }}
                  className="p-1 rounded-md bg-[#05101A] border border-[#12304A] hover:border-[#FF3B5C]/40 text-[#7D8EA5] hover:text-[#FF3B5C] transition-colors cursor-pointer"
                  title="Delete Bot"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
