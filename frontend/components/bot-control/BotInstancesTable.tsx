"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  Trash2,
  Sliders,
  ChevronRight,
  Activity,
  ShieldAlert,
  Bot,
  Layers,
  ArrowUpDown,
  RefreshCw,
  Eye,
  Zap,
} from "lucide-react";
import { BotInstanceExtended, BotStatus } from "@/types/bot-control";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

interface BotInstancesTableProps {
  bots: BotInstanceExtended[];
  selectedBotIds: string[];
  onToggleSelectBot: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenBotDrawer: (bot: BotInstanceExtended) => void;
  onBotAction: (botId: string, action: "START" | "PAUSE" | "RESUME" | "STOP" | "RESTART") => void;
  onDuplicateBot: (botId: string) => void;
  onDeleteBot: (botId: string) => void;
  onEditBot: (botId: string) => void;
  activeActionBotId?: string | null;
}

export function BotInstancesTable({
  bots,
  selectedBotIds,
  onToggleSelectBot,
  onToggleSelectAll,
  onOpenBotDrawer,
  onBotAction,
  onDuplicateBot,
  onDeleteBot,
  onEditBot,
  activeActionBotId,
}: BotInstancesTableProps) {
  const [sortField, setSortField] = useState<string>("name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedBots = [...bots].sort((a, b) => {
    let valA: any = a[sortField as keyof BotInstanceExtended];
    let valB: any = b[sortField as keyof BotInstanceExtended];

    if (sortField === "pnl") {
      valA = a.live_pnl || 0;
      valB = b.live_pnl || 0;
    } else if (sortField === "capital") {
      valA = a.allocated_capital || 0;
      valB = b.allocated_capital || 0;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const allSelected = bots.length > 0 && selectedBotIds.length === bots.length;

  const renderStatusBadge = (status: BotStatus) => {
    const s = (status || "STOPPED").toUpperCase();
    if (s === "RUNNING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          RUNNING
        </span>
      );
    }
    if (s === "PAUSED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          PAUSED
        </span>
      );
    }
    if (s === "STARTING" || s === "RESUMING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse">
          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
          {s}
        </span>
      );
    }
    if (s === "ERROR") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          ERROR
        </span>
      );
    }
    if (s === "HALTED" || s === "TRADING HALTED" || s === "RISK_HALTED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
          <ShieldAlert className="h-2.5 w-2.5" />
          HALTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700">
        STOPPED
      </span>
    );
  };

  return (
    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden select-none font-sans flex flex-col">
      {/* Table Title Bar */}
      <div className="p-3.5 sm:p-4 border-b border-[var(--theme-border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--theme-elevated)]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[var(--theme-accent)]/15 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-[var(--theme-text-primary)] uppercase tracking-wider flex items-center gap-2">
              Bot Fleet Operations Console
              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--theme-surface)] text-[var(--theme-accent)] border border-[var(--theme-border)] font-mono">
                {bots.length} Active Instances
              </span>
            </h2>
            <p className="text-[11px] text-[var(--theme-text-secondary)]">
              Live deterministic execution status, signals, position risk, and quick lifecycle actions.
            </p>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[var(--theme-text-muted)] flex items-center gap-3">
          <span>Selected: <strong className="text-[var(--theme-accent)]">{selectedBotIds.length}</strong></span>
          <span>•</span>
          <span>Live P&L: <strong className="text-[var(--theme-profit)]">+$0.00</strong></span>
        </div>
      </div>

      {/* Desktop & Tablet Table (≥ 768px) */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--theme-text-muted)]">
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5 bg-[#0B131E]"
                />
              </th>
              <th
                onClick={() => handleSort("name")}
                className="p-3 cursor-pointer hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Bot Identity</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Mode</th>
              <th className="p-3">Market / Symbol</th>
              <th className="p-3">Strategy & TF</th>
              <th className="p-3 text-center">Signal / Confluence</th>
              <th className="p-3 text-center">Position</th>
              <th className="p-3 text-right">Risk %</th>
              <th
                onClick={() => handleSort("capital")}
                className="p-3 text-right cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Capital</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("pnl")}
                className="p-3 text-right cursor-pointer hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Today P&L</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="p-3 text-center">Health</th>
              <th className="p-3 text-center">Lifecycle Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--theme-border-subtle)]">
            {sortedBots.map((bot) => {
              const isSelected = selectedBotIds.includes(bot.id);
              const isActionLoading = activeActionBotId === bot.id;
              const isRunning = bot.status === "RUNNING";
              const isPaused = bot.status === "PAUSED";
              const isStopped = bot.status === "STOPPED" || bot.status === "CREATED";
              const isError = bot.status === "ERROR" || bot.status === "HALTED";
              const pnl = bot.live_pnl || 0.0;
              const isPosPnl = pnl >= 0;

              return (
                <tr
                  key={bot.id}
                  className={`hover:bg-[var(--theme-elevated)]/60 transition-colors ${
                    isSelected ? "bg-[var(--theme-accent)]/10" : ""
                  }`}
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectBot(bot.id)}
                      className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5 bg-[#0B131E]"
                    />
                  </td>
                  <td className="p-3 font-mono">
                    <div className="font-bold text-[var(--theme-text-primary)]">{bot.name}</div>
                    <div className="text-[10px] text-[var(--theme-text-muted)]">{bot.id}</div>
                  </td>
                  <td className="p-3 text-center">{renderStatusBadge(bot.status)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      (bot.execution_mode || "").toUpperCase() === "LIVE"
                        ? "bg-rose-950 text-rose-300 border-rose-800"
                        : "bg-cyan-950 text-cyan-300 border-cyan-800"
                    }`}>
                      {bot.execution_mode || "PAPER"}
                    </span>
                  </td>
                  <td className="p-3 font-mono">
                    <div className="font-bold text-[var(--theme-accent)]">{bot.symbol}</div>
                    <div className="text-[10px] text-[var(--theme-text-muted)]">{bot.exchange || "BINANCE"}</div>
                  </td>
                  <td className="p-3 font-mono">
                    <div className="text-[var(--theme-text-primary)]">{bot.strategy}</div>
                    <div className="text-[10px] text-[var(--theme-text-muted)]">{bot.timeframe || "15m"}</div>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <div className="text-[10px] text-[var(--theme-profit)] font-bold">
                      {isRunning ? "72 / 100" : "—"}
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono">
                    {(bot.open_trades || 0) > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        LONG (+$214)
                      </span>
                    ) : (
                      <span className="text-[var(--theme-text-muted)] text-[11px]">FLAT</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-[var(--theme-text-secondary)]">
                    {bot.risk?.risk_per_trade_pct ?? 1.5}%
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-[var(--theme-text-primary)]">
                    ${(bot.allocated_capital || 10000.0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">
                    <span className={isPosPnl ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}>
                      {isPosPnl ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-[10px]">
                    <div className="flex items-center justify-center gap-1 text-[var(--theme-profit)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--theme-profit)] animate-pulse" />
                      <span>{isRunning ? "HEALTHY" : "OFFLINE"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {isStopped && (
                        <button
                          onClick={() => onBotAction(bot.id, "START")}
                          disabled={isActionLoading}
                          className="min-w-[36px] min-h-[36px] px-2.5 py-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-xs font-bold font-mono flex items-center gap-1 transition-all"
                          title="Start Bot"
                          aria-label={`Start bot ${bot.name}`}
                        >
                          {isActionLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                          <span>Start</span>
                        </button>
                      )}
                      {isRunning && (
                        <button
                          onClick={() => onBotAction(bot.id, "PAUSE")}
                          disabled={isActionLoading}
                          className="min-w-[36px] min-h-[36px] px-2.5 py-1 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-bold font-mono flex items-center gap-1 transition-all"
                          title="Pause Bot"
                          aria-label={`Pause bot ${bot.name}`}
                        >
                          <Pause className="h-3 w-3 fill-current" />
                          <span>Pause</span>
                        </button>
                      )}
                      {isPaused && (
                        <button
                          onClick={() => onBotAction(bot.id, "RESUME")}
                          disabled={isActionLoading}
                          className="min-w-[36px] min-h-[36px] px-2.5 py-1 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-bold font-mono flex items-center gap-1 transition-all"
                          title="Resume Bot"
                          aria-label={`Resume bot ${bot.name}`}
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Resume</span>
                        </button>
                      )}
                      {(isRunning || isPaused) && (
                        <button
                          onClick={() => onBotAction(bot.id, "STOP")}
                          disabled={isActionLoading}
                          className="min-w-[36px] min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold font-mono flex items-center gap-1 transition-all"
                          title="Stop Bot"
                          aria-label={`Stop bot ${bot.name}`}
                        >
                          <Square className="h-3 w-3 fill-current" />
                          <span>Stop</span>
                        </button>
                      )}
                      <button
                        onClick={() => onOpenBotDrawer(bot)}
                        className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-accent)] transition-colors"
                        title="Inspect Details"
                        aria-label={`Inspect bot ${bot.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Structured Card List (< 768px) */}
      <div className="md:hidden p-3 space-y-3">
        {sortedBots.map((bot) => {
          const isActionLoading = activeActionBotId === bot.id;
          const isRunning = bot.status === "RUNNING";
          const isPaused = bot.status === "PAUSED";
          const isStopped = bot.status === "STOPPED" || bot.status === "CREATED";
          const pnl = bot.live_pnl || 0.0;
          const isPosPnl = pnl >= 0;

          return (
            <div
              key={bot.id}
              className="p-3.5 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] space-y-3 font-mono shadow-md"
            >
              {/* Header: Name, Status & Mode */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-[var(--theme-text-primary)]">{bot.name}</div>
                  <div className="text-xs text-[var(--theme-accent)] font-semibold">{bot.symbol} • {bot.timeframe || "15m"}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {renderStatusBadge(bot.status)}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    (bot.execution_mode || "").toUpperCase() === "LIVE"
                      ? "bg-rose-950 text-rose-300 border-rose-800"
                      : "bg-cyan-950 text-cyan-300 border-cyan-800"
                  }`}>
                    {bot.execution_mode || "PAPER"}
                  </span>
                </div>
              </div>

              {/* Strategy & Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs border-y border-[var(--theme-border-subtle)] py-2 text-[var(--theme-text-secondary)]">
                <div>
                  <span className="text-[10px] text-[var(--theme-text-muted)] block">Strategy</span>
                  <span className="font-semibold truncate text-[var(--theme-text-primary)]">{bot.strategy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--theme-text-muted)] block">Capital</span>
                  <span className="font-bold text-[var(--theme-text-primary)]">${(bot.allocated_capital || 10000).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--theme-text-muted)] block">Today P&L</span>
                  <span className={`font-bold ${isPosPnl ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                    {isPosPnl ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--theme-text-muted)] block">Position</span>
                  <span>{(bot.open_trades || 0) > 0 ? "LONG (OPEN)" : "FLAT"}</span>
                </div>
              </div>

              {/* Touch-Friendly Action Controls (≥ 44×44px) */}
              <div className="flex items-center gap-2 pt-1">
                {isStopped && (
                  <button
                    onClick={() => onBotAction(bot.id, "START")}
                    disabled={isActionLoading}
                    className="flex-1 min-h-[44px] rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    {isActionLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                    <span>Start Engine</span>
                  </button>
                )}
                {isRunning && (
                  <button
                    onClick={() => onBotAction(bot.id, "PAUSE")}
                    disabled={isActionLoading}
                    className="flex-1 min-h-[44px] rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Pause className="h-4 w-4 fill-current" />
                    <span>Pause</span>
                  </button>
                )}
                {isPaused && (
                  <button
                    onClick={() => onBotAction(bot.id, "RESUME")}
                    disabled={isActionLoading}
                    className="flex-1 min-h-[44px] rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Resume</span>
                  </button>
                )}
                {(isRunning || isPaused) && (
                  <button
                    onClick={() => onBotAction(bot.id, "STOP")}
                    disabled={isActionLoading}
                    className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center active:scale-95"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                )}
                <button
                  onClick={() => onOpenBotDrawer(bot)}
                  className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-accent)] flex items-center justify-center active:scale-95"
                  aria-label="Inspect bot telemetry"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
