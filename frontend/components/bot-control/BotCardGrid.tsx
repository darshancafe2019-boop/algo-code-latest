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
      <div className="bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] rounded-3xl p-12 text-center text-[var(--theme-text-muted)] font-mono text-xs shadow-xl space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--theme-accent)] border-t-transparent animate-spin mx-auto" />
        <p>Synchronizing bot fleet cards...</p>
      </div>
    );
  }

  if (bots.length === 0) {
    const marketLabel = selectedMarket === "ALL" ? "" : `${selectedMarket} `;
    return (
      <div className="bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] rounded-3xl p-12 text-center font-mono text-xs shadow-xl space-y-4">
        <div className="p-3.5 rounded-2xl bg-[var(--theme-elevated)] w-fit mx-auto text-[var(--theme-text-muted)]">
          <Bot className="w-8 h-8" />
        </div>
        <p className="text-[var(--theme-text-secondary)] font-sans text-sm max-w-md mx-auto">
          No {marketLabel}bots match your current filter. Create a new automated trading bot to deploy strategies.
        </p>
        <button
          onClick={onCreateBot}
          className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] hover:opacity-90 text-[var(--theme-bg)] font-extrabold text-xs transition inline-flex items-center gap-1.5 shadow-lg shadow-[var(--theme-accent)]/20 font-mono"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
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
        const pnl = bot.pnl?.today ?? bot.live_pnl ?? 0.0;
        const isPnlPositive = pnl >= 0;

        return (
          <div
            key={bot.id}
            onClick={() => onSelectBot(bot)}
            className={`p-5 rounded-3xl bg-[var(--theme-surface)]/90 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-xl hover:border-[var(--theme-accent)]/50 backdrop-blur-md group ${
              isSelected
                ? "border-[var(--theme-accent)] shadow-lg shadow-[var(--theme-accent)]/10"
                : "border-[var(--theme-border)]"
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
                  className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                    isSelected
                      ? "bg-[var(--theme-accent)] border-[var(--theme-accent)] text-[var(--theme-bg)]"
                      : "border-[var(--theme-border-subtle)] bg-[var(--theme-elevated)] group-hover:border-[var(--theme-border)] text-transparent"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>

                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-accent)] transition truncate">
                    {bot.name}
                  </h3>
                  <div className="text-[11px] font-mono text-[var(--theme-text-muted)] flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-[var(--theme-text-secondary)]">{bot.symbol}</span>
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
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold transition border shrink-0 ${
                  isLive
                    ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40 hover:bg-[var(--theme-loss)]/25"
                    : "bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border-[var(--theme-accent)]/40 hover:bg-[var(--theme-accent)]/25"
                }`}
                title={isLive ? "Click to switch to PAPER mode" : "Click to switch to LIVE mode"}
              >
                {isTogglingMode ? "..." : isLive ? "LIVE" : "PAPER"}
              </button>
            </div>

            {/* Middle Section: Status, Position & Today PnL */}
            <div className="p-3 bg-[var(--theme-elevated)]/70 border border-[var(--theme-border-subtle)] rounded-2xl space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--theme-text-muted)] font-sans">Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    isRunning
                      ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/40 animate-pulse"
                      : isPaused
                      ? "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border-[var(--theme-warning)]/40"
                      : isError
                      ? "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/40"
                      : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border-subtle)]"
                  }`}
                >
                  {state}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--theme-text-muted)] font-sans">Active Position</span>
                {pos.has_position ? (
                  <span
                    className={`font-black ${
                      pos.direction === "LONG" ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                    }`}
                  >
                    {pos.direction} {pos.size} @ ${pos.entry_price ? pos.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}
                  </span>
                ) : (
                  <span className="text-[var(--theme-text-muted)] font-sans">FLAT</span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[var(--theme-border-subtle)]/60 pt-2">
                <span className="text-[11px] text-[var(--theme-text-muted)] font-sans">Today P&L</span>
                <span
                  className={`font-extrabold text-sm ${
                    isPnlPositive ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                  }`}
                >
                  {isPnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Bottom Card Strip: Action Buttons */}
            <div className="flex items-center justify-between gap-2 pt-1 font-mono">
              <div className="text-[11px] text-[var(--theme-text-muted)] truncate">
                Cap: ${(bot.allocated_capital / 1000).toFixed(1)}K
              </div>

              <div className="flex items-center gap-1.5">
                {/* 1-Click Contextual Action */}
                {isStopped && (
                  <button
                    onClick={(e) => handleAction(e, bot.id, "START")}
                    disabled={isActionLoading}
                    className="px-3 py-1.5 rounded-xl bg-[var(--theme-profit)]/15 border border-[var(--theme-profit)]/40 text-[var(--theme-profit)] hover:bg-[var(--theme-profit)]/25 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    onClick={(e) => handleAction(e, bot.id, "PAUSE")}
                    disabled={isActionLoading}
                    className="px-3 py-1.5 rounded-xl bg-[var(--theme-warning)]/15 border border-[var(--theme-warning)]/40 text-[var(--theme-warning)] hover:bg-[var(--theme-warning)]/25 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                {isPaused && (
                  <button
                    onClick={(e) => handleAction(e, bot.id, "RESUME")}
                    disabled={isActionLoading}
                    className="px-3 py-1.5 rounded-xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/40 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/25 text-xs font-bold transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                {isError && (
                  <button
                    onClick={(e) => handleAction(e, bot.id, "START")}
                    disabled={isActionLoading}
                    className="px-3 py-1.5 rounded-xl bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/40 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/25 text-xs font-bold transition flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}

                {/* Inspect Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBot(bot);
                  }}
                  className="p-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:border-[var(--theme-border)] transition"
                  title="Inspect Details"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteBot(bot);
                  }}
                  className="p-1.5 rounded-xl bg-[var(--theme-loss)]/10 border border-[var(--theme-loss)]/30 text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/20 transition"
                  title="Delete Bot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
