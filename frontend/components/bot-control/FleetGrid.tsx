"use client";

import React from "react";
import {
  Play,
  Pause,
  Square,
  Trash2,
  Edit,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Activity,
  Layers,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BotConfig } from "@/types/bot";
import {
  formatSignedMoney,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
} from "@/lib/formatters";

interface FleetGridProps {
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
  onDeleteBot: (bot: BotConfig, e?: React.MouseEvent) => void;
  actionLoading: Record<string, boolean>;
  copiedId: string | null;
  onCopyId: (id: string, e?: React.MouseEvent) => void;
}

export function FleetGrid({
  bots,
  selectedBotIds,
  activeBotId,
  onToggleSelectBot,
  onSelectBot,
  onBotAction,
  onEditBot,
  onViewTerminal,
  onDeleteBot,
  actionLoading,
  copiedId,
  onCopyId,
}: FleetGridProps) {
  if (bots.length === 0) {
    return (
      <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-12 text-center text-[#91A7C1] font-mono text-xs">
        No algorithmic trading bots matched the selected filter criteria.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 select-none font-sans">
      {bots.map((bot) => {
        const isSelected = selectedBotIds.has(bot.id);
        const isActive = activeBotId === bot.id;
        const status = (bot.status || "STOPPED").toUpperCase();
        const isRunning = status === "RUNNING";
        const isPaused = status === "PAUSED";
        const isStopped = status === "STOPPED";
        const isReady = status === "READY" || status === "DRAFT";
        const isError = status === "ERROR";

        const symbol = bot.market?.symbol || "NIFTY";
        const exchange = (bot.market?.exchange || "NSE").toUpperCase();
        const mode = (bot.execution?.mode || "PAPER").toUpperCase();
        const isLive = mode === "LIVE";

        const strategyName = bot.strategy?.type || "Trend Pullback to EMA";
        const timeframe = bot.strategy?.timeframe || "1m";

        const netPnl = Number(bot.pnl?.net_pnl ?? 0);
        const currencySymbol =
          symbol.includes("NIFTY") || exchange === "NSE" || exchange === "MCX" || bot.currency === "INR"
            ? "₹"
            : "$";

        const positionsCount = Number(bot.positions_count ?? 0);
        const contractsCount = Number(bot.open_contracts ?? (positionsCount > 0 ? 1 : 0));
        const tradesCount = Number(bot.trades_count ?? (bot.pnl as any)?.trades_count ?? 0);
        const isLoadingAction = !!actionLoading[bot.id];

        return (
          <div
            key={bot.id}
            onClick={() => onSelectBot(bot)}
            className={cn(
              "rounded-[8px] bg-[#091426] border p-3 flex flex-col justify-between gap-3 transition-all cursor-pointer shadow-md",
              isActive
                ? "border-[#00C9E8] shadow-lg shadow-[#00C9E8]/10"
                : isSelected
                ? "border-[#0878FF] bg-[#0878FF]/5"
                : "border-[#1A2B43] hover:border-[#1A2B43]/80 hover:bg-[#0D1D35]/50"
            )}
          >
            {/* Top Row: Checkbox, Name, Status */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/60">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => onToggleSelectBot(bot.id, e)}
                    className="p-1 rounded hover:bg-[#050B16] text-[#91A7C1] hover:text-[#00C9E8] transition-colors cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckCircle2 className="h-4 w-4 text-[#00C9E8]" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded border border-[#1A2B43] bg-[#050B16]" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#EAF3FF] text-xs truncate max-w-[140px]" title={bot.name}>
                      {bot.name}
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-[#91A7C1]">
                      <span>{bot.id}</span>
                      <button
                        type="button"
                        onClick={(e) => onCopyId(bot.id, e)}
                        className="hover:text-white p-0.5"
                      >
                        {copiedId === bot.id ? <Check className="h-2.5 w-2.5 text-[#00D6A0]" /> : <Copy className="h-2.5 w-2.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                      isRunning
                        ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/40"
                        : isPaused
                        ? "bg-[#FFB020]/15 text-[#FFB020] border-[#FFB020]/40"
                        : isReady
                        ? "bg-[#0878FF]/15 text-[#0878FF] border-[#0878FF]/40"
                        : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43]"
                    )}
                  >
                    {status}
                  </span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border uppercase",
                      isLive
                        ? "bg-[#FF5268]/20 text-[#FF5268] border-[#FF5268]/40"
                        : "bg-[#050B16] text-[#00C9E8] border-[#00C9E8]/30"
                    )}
                  >
                    {mode}
                  </span>
                </div>
              </div>

              {/* Strategy & Instrument metadata */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono py-2 border-b border-[#1A2B43]/40">
                <div>
                  <span className="text-[#91A7C1] block text-[10px]">Instrument</span>
                  <span className="font-bold text-[#EAF3FF] truncate block">{symbol}</span>
                  <span className="text-[10px] text-[#00C9E8]">{exchange}</span>
                </div>
                <div>
                  <span className="text-[#91A7C1] block text-[10px]">Strategy</span>
                  <span className="font-bold text-[#EAF3FF] truncate block">{strategyName}</span>
                  <span className="text-[10px] text-[#8B5CF6]">{timeframe}</span>
                </div>
              </div>

              {/* Financial & Performance Stats */}
              <div className="grid grid-cols-3 gap-1 text-center py-2 text-xs font-mono">
                <div className="p-1 rounded bg-[#050B16] border border-[#1A2B43]/50">
                  <span className="text-[9px] text-[#91A7C1] block">Net P&amp;L</span>
                  <span className={cn("font-bold text-xs tabular-nums", netPnl >= 0 ? "text-[#00D6A0]" : "text-[#FF5268]")}>
                    {formatSignedMoney(netPnl, currencySymbol)}
                  </span>
                </div>
                <div className="p-1 rounded bg-[#050B16] border border-[#1A2B43]/50">
                  <span className="text-[9px] text-[#91A7C1] block">Positions</span>
                  <span className="font-bold text-xs text-[#EAF3FF] tabular-nums">
                    {positionsCount} ({contractsCount}L)
                  </span>
                </div>
                <div className="p-1 rounded bg-[#050B16] border border-[#1A2B43]/50">
                  <span className="text-[9px] text-[#91A7C1] block">Fills</span>
                  <span className="font-bold text-xs text-[#00C9E8] tabular-nums">
                    {formatNumber(tradesCount, 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1A2B43]/60 text-[10px] font-mono">
              <span className="text-[#91A7C1]">{formatRelativeTime(bot.updated_at || bot.created_at)}</span>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {isRunning ? (
                  <button
                    type="button"
                    onClick={(e) => onBotAction(bot.id, "pause", e)}
                    disabled={isLoadingAction}
                    className="p-1.5 rounded bg-[#FFB020]/15 text-[#FFB020] border border-[#FFB020]/30 hover:bg-[#FFB020]/25 transition-colors cursor-pointer"
                    title="Pause"
                  >
                    <Pause className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => onBotAction(bot.id, isPaused ? "resume" : "start", e)}
                    disabled={isLoadingAction}
                    className="p-1.5 rounded bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30 hover:bg-[#00D6A0]/25 transition-colors cursor-pointer"
                    title={isPaused ? "Resume" : "Start"}
                  >
                    <Play className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => onBotAction(bot.id, "stop", e)}
                  disabled={isLoadingAction || isStopped}
                  className="p-1.5 rounded bg-[#FF5268]/15 text-[#FF5268] border border-[#FF5268]/30 hover:bg-[#FF5268]/25 transition-colors cursor-pointer disabled:opacity-40"
                  title="Stop"
                >
                  <Square className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => onEditBot(bot, e)}
                  className="p-1.5 rounded bg-[#050B16] text-[#91A7C1] border border-[#1A2B43] hover:text-white transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => onViewTerminal(bot.id, e)}
                  className="p-1.5 rounded bg-[#050B16] text-[#91A7C1] border border-[#1A2B43] hover:text-[#00C9E8] transition-colors cursor-pointer"
                  title="Terminal"
                >
                  <Terminal className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => onDeleteBot(bot, e)}
                  className="p-1.5 rounded bg-[#050B16] text-[#91A7C1] border border-[#1A2B43] hover:text-[#FF5268] transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
