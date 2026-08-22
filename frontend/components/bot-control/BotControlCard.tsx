"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, Square, Trash2, Sliders, RefreshCw, Activity, Clock, Layers } from "lucide-react";

export interface BotInstance {
  id: string;
  name: string;
  symbol: string;
  strategy: string;
  timeframe: string;
  asset_class?: string;
  execution_mode: string;
  status: string;
  allocated_capital: number;
  live_pnl?: number;
  open_trades?: number;
  required_confidence?: number;
  last_heartbeat?: string;
  health?: {
    is_process_alive: boolean;
    uptime_formatted?: string;
    last_checked_seconds_ago?: number;
    error_count?: number;
  };
  indicators?: string[];
}

interface Props {
  bot: BotInstance;
  onOpenIndicators: (bot: BotInstance) => void;
}

export function BotControlCard({ bot, onOpenIndicators }: Props) {
  const queryClient = useQueryClient();

  // Ticking countdown state for "Last Checked"
  const [secondsAgo, setSecondsAgo] = useState<number>(
    bot.health?.last_checked_seconds_ago || 0
  );

  useEffect(() => {
    setSecondsAgo(bot.health?.last_checked_seconds_ago || 0);
    const interval = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [bot.health?.last_checked_seconds_ago]);

  const controlMutation = useMutation({
    mutationFn: async (action: string) => {
      const res = await fetch(`/api/bots/${bot.id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || `Failed to execute ${action}`);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Delete failed");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
    },
  });

  const status = bot.status.toUpperCase();
  const isRunning = status === "RUNNING";
  const isPaused = status === "PAUSED";
  const isStopped = status === "STOPPED" || status === "CREATED";
  const isError = status === "ERROR";
  const isStalled = status === "STALLED";
  const mode = (bot.execution_mode || "PAPER").toUpperCase();

  const pnl = bot.live_pnl || 0;
  const openTrades = bot.open_trades || 0;
  const isPending = controlMutation.isPending || deleteMutation.isPending;

  return (
    <div className="bg-[#0D1914] border border-[#294238] hover:border-[#2E7D5B]/60 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between select-none font-sans">
      {/* Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-bold text-[#E8F3EC] tracking-wide">{bot.name}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-[#A8BDB0] font-mono">
              <span className="text-[#55C98A] font-bold">{bot.symbol}</span>
              <span>•</span>
              <span>{bot.strategy}</span>
              <span>•</span>
              <span>{bot.timeframe}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            {/* Mode Badge */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${
                mode === "LIVE"
                  ? "bg-[#55C98A]/15 text-[#55C98A] border-[#55C98A]/40"
                  : "bg-[#6699A6]/15 text-[#6699A6] border-[#6699A6]/40"
              }`}
            >
              {mode}
            </span>

            {/* Status Pill */}
            <span
              className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold flex items-center gap-1.5 border ${
                isRunning
                  ? "bg-[#2E7D5B]/20 text-[#55C98A] border-[#2E7D5B]/50"
                  : isPaused
                  ? "bg-[#D9A441]/15 text-[#D9A441] border-[#D9A441]/40"
                  : isStalled
                  ? "bg-[#78A88A]/15 text-[#78A88A] border-[#78A88A]/40"
                  : isError
                  ? "bg-[#E26D6D]/15 text-[#E26D6D] border-[#E26D6D]/40"
                  : "bg-[#07110D] text-[#70877A] border-[#1B3328]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isRunning
                    ? "bg-[#55C98A] animate-pulse"
                    : isPaused
                    ? "bg-[#D9A441]"
                    : isError
                    ? "bg-[#E26D6D]"
                    : "bg-[#70877A]"
                }`}
              />
              {status}
            </span>
          </div>
        </div>

        {/* Health & Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 my-4 bg-[#07110D] p-3 rounded-xl border border-[#1B3328] text-xs font-mono">
          <div>
            <span className="text-[10px] text-[#70877A] uppercase block mb-0.5">Realized P&L</span>
            <span
              className={`font-bold ${
                pnl >= 0 ? "text-[#39B978]" : "text-[#E26D6D]"
              }`}
            >
              {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-[#70877A] uppercase block mb-0.5">Positions</span>
            <span className="font-bold text-[#E8F3EC]">{openTrades}</span>
          </div>

          <div>
            <span className="text-[10px] text-[#70877A] uppercase block mb-0.5">Uptime</span>
            <span className="text-[#A8BDB0]">
              {bot.health?.uptime_formatted || "0m 0s"}
            </span>
          </div>
        </div>

        {/* Last Checked Ticking Counter & Indicators */}
        <div className="flex items-center justify-between text-[11px] text-[#70877A] mb-4 px-1 font-mono">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-[#70877A]" />
            <span>Checked: {secondsAgo}s ago</span>
          </div>

          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3 text-[#55C98A]" />
            <span>{bot.indicators?.length || 0}/4 Indicators</span>
          </div>
        </div>
      </div>

      {/* Control Buttons Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1B3328] font-mono">
        <div className="flex items-center gap-2">
          {isStopped && (
            <button
              onClick={() => controlMutation.mutate("START")}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E7D5B] hover:bg-[#39B978] text-[#07110D] font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>START</span>
            </button>
          )}

          {isRunning && (
            <>
              <button
                onClick={() => controlMutation.mutate("PAUSE")}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#123C2A] hover:bg-[#1B4D36] text-[#D9A441] border border-[#D9A441]/40 font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>PAUSE</span>
              </button>

              <button
                onClick={() => controlMutation.mutate("STOP")}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#191010] hover:bg-[#2A1515] text-[#E26D6D] border border-[#E26D6D]/40 font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                <Square className="h-3.5 w-3.5" />
                <span>STOP</span>
              </button>
            </>
          )}

          {isPaused && (
            <button
              disabled={isPending}
              onClick={() => controlMutation.mutate("RESUME")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {controlMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <Play className="h-3.5 w-3.5" />
              <span>Resume</span>
            </button>
          )}

          {(isRunning || isPaused) && (
            <button
              disabled={isPending}
              onClick={() => controlMutation.mutate("STOP")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5" />
              <span>Stop</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={`/bots/${bot.id}/edit`}
            title="Edit Bot Configuration"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
          >
            <Sliders className="h-4 w-4" />
          </a>

          <button
            disabled={isPending || isRunning}
            onClick={() => {
              if (confirm(`Delete bot '${bot.name}'? Historical trade logs will be preserved.`)) {
                deleteMutation.mutate();
              }
            }}
            title={isRunning ? "Stop bot before deleting" : "Delete Bot"}
            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 transition-colors disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
