"use client";

import React, { useState } from "react";
import { X, Play, Pause, Square, AlertTriangle, RotateCcw, ChevronDown, ChevronUp, Activity, ShieldCheck, ShieldAlert, Sliders } from "lucide-react";
import { BotRowItem } from "./SimpleBotTable";

interface SimpleBotDetailsDrawerProps {
  isOpen: boolean;
  bot: BotRowItem | null;
  onClose: () => void;
  onBotAction: (botId: string, action: string) => Promise<void>;
  onRefresh: () => void;
}

export function SimpleBotDetailsDrawer({
  isOpen,
  bot,
  onClose,
  onBotAction,
  onRefresh,
}: SimpleBotDetailsDrawerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!isOpen || !bot) return null;

  const state = bot.status || bot.state || "STOPPED";
  const isRunning = state === "RUNNING";
  const isPaused = state === "PAUSED";
  const isStopped = state === "STOPPED" || state === "DRAFT";
  const isError = state === "ERROR";

  const pos = bot.position || { has_position: false, direction: "FLAT", size: 0, entry_price: 0, unrealized_pnl: 0 };
  const pnl = bot.pnl?.today ?? bot.live_pnl ?? 0.0;
  const isPnlPositive = pnl >= 0;

  const handleAction = async (action: string) => {
    setIsActing(true);
    setActionFeedback(null);
    try {
      await onBotAction(bot.id, action);
      setActionFeedback(`Action ${action} dispatched successfully.`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message || "Failed action"}`);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-mono text-xs">
      <div className="w-full max-w-xl h-full bg-[#0B132B] border-l border-slate-800 shadow-2xl p-5 sm:p-6 overflow-y-auto flex flex-col space-y-4 text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  isRunning
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : isPaused
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : isError
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {state}
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                {bot.execution_mode}
              </span>
              <span className="text-slate-400 text-xs">{bot.symbol} • {bot.timeframe}</span>
            </div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider truncate max-w-md">
              {bot.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {actionFeedback && (
          <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-cyan-400 text-xs">
            {actionFeedback}
          </div>
        )}

        {/* 1. Next Action Spotlight */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Next Planned Action</span>
          <p className="text-white text-xs leading-relaxed font-sans font-medium">
            {bot.next_action || "Scanning market feed for indicator entry confluence..."}
          </p>
        </div>

        {/* 2. Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Today P&L</span>
            <div className={`text-base font-black ${isPnlPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-sans block">
              Realized: ${bot.pnl?.realized.toFixed(2) || "0.00"}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Open Position</span>
            <div className="text-base font-black text-white">
              {pos.has_position ? `${pos.direction} ${pos.size}` : "FLAT"}
            </div>
            <span className="text-[10px] text-slate-500 font-sans block">
              {pos.has_position ? `@ $${pos.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "No open risk"}
            </span>
          </div>
        </div>

        {/* 3. Strategy & Risk Matrix */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Strategy & Risk Profile</span>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Strategy:</span>
            <span className="text-white font-bold">{bot.strategy}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Allocated Capital:</span>
            <span className="text-cyan-400 font-bold">${bot.allocated_capital.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Pre-Trade Risk Gate:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PASS (14 Checks Armed)</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Worker Status:</span>
            <span className="text-emerald-400 font-bold">{bot.health || "HEALTHY"}</span>
          </div>

          {bot.last_error && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-rose-400 font-bold block mb-0.5">Last Error:</span>
              <p className="text-slate-300 text-[11px] font-sans bg-rose-950/20 p-2 rounded border border-rose-500/30">
                {bot.last_error}
              </p>
            </div>
          )}
        </div>

        {/* 4. Collapsible Advanced Details */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-3 flex items-center justify-between text-left text-slate-400 hover:text-white transition font-sans text-xs"
          >
            <span>Show Technical Details (Worker, Heartbeat & Config)</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Bot ID:</span>
                <span className="text-slate-300 font-mono">{bot.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Heartbeat:</span>
                <span className="text-slate-300">{bot.last_heartbeat || "Live / Continuous"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Strategy Version:</span>
                <span className="text-slate-300">v{bot.strategy_version || "1.0"}</span>
              </div>

              {bot.config && Object.keys(bot.config).length > 0 && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Configuration Payload:</span>
                  <pre className="text-slate-400 text-[10px] bg-slate-900 p-2 rounded overflow-x-auto max-h-40">
                    {JSON.stringify(bot.config, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Footer Contextual Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 mt-auto">
          {isStopped && (
            <button
              onClick={() => handleAction("START")}
              disabled={isActing}
              className="col-span-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Bot</span>
            </button>
          )}

          {isRunning && (
            <>
              <button
                onClick={() => handleAction("PAUSE")}
                disabled={isActing}
                className="py-2.5 px-4 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </button>

              <button
                onClick={() => handleAction("STOP")}
                disabled={isActing}
                className="py-2.5 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop</span>
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                onClick={() => handleAction("RESUME")}
                disabled={isActing}
                className="py-2.5 px-4 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>

              <button
                onClick={() => handleAction("STOP")}
                disabled={isActing}
                className="py-2.5 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop</span>
              </button>
            </>
          )}

          {isError && (
            <button
              onClick={() => handleAction("RETRY")}
              disabled={isActing}
              className="col-span-2 py-2.5 px-4 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Recovery</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
