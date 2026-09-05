"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import Link from "next/link";
import { Bot, Play, Pause, Square, Plus, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useUIStore } from "@/lib/store/useUIStore";
import { executeCommand } from "@/lib/commandClient";
import { useQueryClient } from "@tanstack/react-query";

export const HeaderBotControl = memo(function HeaderBotControl() {
  const queryClient = useQueryClient();
  const { activeBot, bots, activeStrategy } = useActiveBot();
  const { setCreateBotModalOpen } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const botStatus = activeBot?.status || (bots.some((b) => b.status === "RUNNING") ? "RUNNING" : "STOPPED");
  const runningCount = bots.filter((b) => b.status === "RUNNING").length;

  const handleAction = async (action: "START" | "PAUSE" | "STOP") => {
    if (!activeBot?.id) return;
    setIsMutating(true);
    try {
      const cmd = action === "START" ? "START_BOT" : action === "PAUSE" ? "PAUSE_BOT" : "STOP_BOT";
      await executeCommand(cmd as any, activeBot.id, {}, queryClient, ["botsList", "botsSummary"]);
    } finally {
      setIsMutating(false);
    }
  };

  const getStatusBadge = () => {
    if (botStatus === "RUNNING") {
      return (
        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Running
        </span>
      );
    }
    if (botStatus === "PAUSED") {
      return <span className="text-amber-400 text-[10px] font-bold">Paused</span>;
    }
    return <span className="text-slate-400 text-[10px] font-bold">Stopped</span>;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Bot fleet control: ${botStatus}`}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 hover:border-sky-500/50 font-bold font-mono text-xs transition-all cursor-pointer shadow-xs active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 select-none"
        title="Active Bot Fleet Controller (⌘B)"
      >
        <Bot className="h-3.5 w-3.5 text-sky-400" />
        <span className="text-[11px] tracking-wide">BOT</span>
        {runningCount > 0 && (
          <span className="px-1 py-0.2 bg-sky-500/20 text-sky-300 rounded text-[9px] font-bold">
            {runningCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3 shadow-2xl w-64 flex flex-col gap-2.5 text-xs font-mono backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--theme-border-subtle)]">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
              Bot Instance Control
            </span>
            {getStatusBadge()}
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span>Active Bot:</span>
              <span className="text-slate-200 font-bold truncate max-w-[130px]">
                {activeBot?.name || "BTC Scalper 01"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Strategy:</span>
              <span className="text-sky-400 font-bold truncate max-w-[130px]">
                {activeStrategy || activeBot?.strategy || "EMA_MACD_VP"}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Execution Mode:</span>
              <span className="text-slate-200 font-bold">
                {activeBot?.execution_mode || "PAPER"}
              </span>
            </div>
          </div>

          {/* Quick Bot Actions */}
          <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-[var(--theme-border-subtle)]">
            <button
              type="button"
              onClick={() => handleAction("START")}
              disabled={isMutating || botStatus === "RUNNING"}
              className="flex items-center justify-center gap-1 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              <Play className="h-2.5 w-2.5" />
              <span>Start</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction("PAUSE")}
              disabled={isMutating || botStatus !== "RUNNING"}
              className="flex items-center justify-center gap-1 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-[10px] font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              <Pause className="h-2.5 w-2.5" />
              <span>Pause</span>
            </button>
            <button
              type="button"
              onClick={() => handleAction("STOP")}
              disabled={isMutating || botStatus === "STOPPED"}
              className="flex items-center justify-center gap-1 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[10px] font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              <Square className="h-2.5 w-2.5" />
              <span>Stop</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--theme-border-subtle)] text-[10px]">
            <button
              type="button"
              onClick={() => {
                setCreateBotModalOpen(true);
                setIsOpen(false);
              }}
              className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Deploy New Bot</span>
            </button>
            <Link
              href="/bots"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-0.5"
            >
              <span>Fleet</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
});
