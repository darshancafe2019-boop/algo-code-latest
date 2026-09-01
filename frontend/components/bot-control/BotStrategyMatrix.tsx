"use client";

import React, { useMemo } from "react";
import {
  PieChart,
  TrendingUp,
  Activity,
  Layers,
  ShieldCheck,
  Bot,
  Play,
  Pause,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { BotRowItem } from "@/types/bot-control";

interface BotStrategyMatrixProps {
  bots: BotRowItem[];
  onSelectBot: (bot: BotRowItem) => void;
  onFilterByStrategy?: (strategy: string) => void;
}

interface StrategyGroup {
  strategy: string;
  botCount: number;
  runningCount: number;
  pausedCount: number;
  stoppedCount: number;
  errorCount: number;
  totalAllocated: number;
  totalExposure: number;
  todayPnl: number;
  realizedPnl: number;
  bots: BotRowItem[];
}

export function BotStrategyMatrix({
  bots,
  onSelectBot,
  onFilterByStrategy,
}: BotStrategyMatrixProps) {
  // Aggregate bots by strategy
  const { strategyGroups, totalFleetAllocated } = useMemo(() => {
    const groupMap: Record<string, StrategyGroup> = {};
    let totalCap = 0;

    for (const b of bots) {
      const strat = b.strategy || "DISCRETIONARY";
      const cap = Number(b.allocated_capital || 10000);
      const pos = b.position || { has_position: false, size: 0, entry_price: 0 };
      const exposure = pos.has_position ? Number(pos.size || 0) * Number(pos.entry_price || 0) : 0;
      const todayP = Number(b.pnl?.today ?? b.live_pnl ?? 0);
      const realizedP = Number(b.pnl?.realized ?? 0);
      const state = (b.status || b.state || "STOPPED").toUpperCase();

      totalCap += cap;

      if (!groupMap[strat]) {
        groupMap[strat] = {
          strategy: strat,
          botCount: 0,
          runningCount: 0,
          pausedCount: 0,
          stoppedCount: 0,
          errorCount: 0,
          totalAllocated: 0,
          totalExposure: 0,
          todayPnl: 0,
          realizedPnl: 0,
          bots: [],
        };
      }

      groupMap[strat].botCount += 1;
      groupMap[strat].totalAllocated += cap;
      groupMap[strat].totalExposure += exposure;
      groupMap[strat].todayPnl += todayP;
      groupMap[strat].realizedPnl += realizedP;
      groupMap[strat].bots.push(b);

      if (state === "RUNNING") groupMap[strat].runningCount += 1;
      else if (state === "PAUSED") groupMap[strat].pausedCount += 1;
      else if (state === "ERROR") groupMap[strat].errorCount += 1;
      else groupMap[strat].stoppedCount += 1;
    }

    const groups = Object.values(groupMap).sort((a, b) => b.totalAllocated - a.totalAllocated);
    return { strategyGroups: groups, totalFleetAllocated: totalCap };
  }, [bots]);

  if (bots.length === 0) {
    return (
      <div className="bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] rounded-3xl p-12 text-center text-[var(--theme-text-muted)] font-mono text-xs shadow-xl space-y-3">
        <PieChart className="w-8 h-8 mx-auto text-[var(--theme-accent)]" />
        <p>No bot instances available to compute strategy allocation matrix.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-extrabold text-[var(--theme-text-primary)]">
            Fleet Strategy Allocation & Risk Matrix
          </h2>
          <p className="text-xs text-[var(--theme-text-muted)]">
            Aggregate capital distribution, exposure, and net performance across active strategy engines.
          </p>
        </div>
        <div className="text-xs font-mono text-[var(--theme-text-secondary)]">
          Total Fleet Capital: <strong className="text-[var(--theme-text-primary)]">${(totalFleetAllocated / 1000).toFixed(1)}K</strong> across <strong className="text-[var(--theme-text-primary)]">{strategyGroups.length} strategies</strong>
        </div>
      </div>

      {/* Strategy Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        {strategyGroups.map((grp) => {
          const capPct = totalFleetAllocated > 0
            ? Math.round((grp.totalAllocated / totalFleetAllocated) * 100)
            : 0;
          const isPnlPositive = grp.todayPnl >= 0;

          return (
            <div
              key={grp.strategy}
              className="p-5 rounded-3xl bg-[var(--theme-surface)]/90 border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 transition-all backdrop-blur-md shadow-xl space-y-4"
            >
              {/* Top: Strategy Title & Allocation Progress */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[var(--theme-elevated)] text-[var(--theme-accent)] border border-[var(--theme-border-subtle)]">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[var(--theme-text-primary)]">
                        {grp.strategy}
                      </h3>
                      <span className="text-[11px] text-[var(--theme-text-muted)]">
                        {grp.botCount} {grp.botCount === 1 ? "bot instance" : "bot instances"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[var(--theme-accent)]">{capPct}%</span>
                    <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">
                      ${(grp.totalAllocated / 1000).toFixed(1)}K Allocated
                    </div>
                  </div>
                </div>

                {/* Capital Allocation Bar */}
                <div className="w-full h-1.5 bg-[var(--theme-elevated)] rounded-full overflow-hidden mt-3 border border-[var(--theme-border-subtle)]">
                  <div
                    className="h-full bg-[var(--theme-accent)] rounded-full transition-all duration-500"
                    style={{ width: `${capPct}%` }}
                  />
                </div>
              </div>

              {/* Status Breakdown & Today PnL Ribbon */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[var(--theme-elevated)]/60 border border-[var(--theme-border-subtle)] text-center text-xs">
                <div>
                  <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">State</div>
                  <div className="font-bold text-[var(--theme-text-primary)] mt-0.5">
                    <span className="text-[var(--theme-profit)]">{grp.runningCount}R</span> /{" "}
                    <span className="text-[var(--theme-warning)]">{grp.pausedCount}P</span> /{" "}
                    <span className="text-[var(--theme-text-muted)]">{grp.stoppedCount}S</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">Exposure</div>
                  <div className="font-bold text-[var(--theme-text-primary)] mt-0.5">
                    ${grp.totalExposure.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[var(--theme-text-muted)] font-sans">Today P&L</div>
                  <div className={`font-extrabold mt-0.5 ${isPnlPositive ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"}`}>
                    {isPnlPositive ? "+" : ""}${Math.abs(grp.todayPnl).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Bot Chips in this strategy */}
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--theme-text-muted)] tracking-wider block mb-2 font-sans">
                  Assigned Bots ({grp.bots.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {grp.bots.map((b) => {
                    const st = (b.status || b.state || "STOPPED").toUpperCase();
                    return (
                      <button
                        key={b.id}
                        onClick={() => onSelectBot(b)}
                        className="px-2.5 py-1 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-accent)] border border-[var(--theme-border-subtle)] text-[11px] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition flex items-center gap-1.5 shadow-sm"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            st === "RUNNING"
                              ? "bg-[var(--theme-profit)] animate-pulse"
                              : st === "PAUSED"
                              ? "bg-[var(--theme-warning)]"
                              : st === "ERROR"
                              ? "bg-[var(--theme-loss)]"
                              : "bg-[var(--theme-text-muted)]"
                          }`}
                        />
                        <span>{b.name}</span>
                        <span className="text-[10px] text-[var(--theme-text-muted)] font-mono">({b.symbol})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
