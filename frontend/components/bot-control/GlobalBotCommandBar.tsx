"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  AlertOctagon,
  Plus,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Bot,
  Layers,
} from "lucide-react";
import { BotMetricsSummary, BotInstanceExtended } from "@/types/bot-control";

interface GlobalBotCommandBarProps {
  metrics: BotMetricsSummary;
  bots: BotInstanceExtended[];
  selectedBotIds: string[];
  onStartAll: () => void;
  isStartingAll: boolean;
  onPauseAll: () => void;
  isPausingAll: boolean;
  onResumeAll: () => void;
  isResumingAll: boolean;
  onStopAll: () => void;
  isStoppingAll: boolean;
  onKillSwitch: () => void;
  isKilling: boolean;
  onOpenCreateWizard: () => void;
}

export function GlobalBotCommandBar({
  metrics,
  bots,
  selectedBotIds,
  onStartAll,
  isStartingAll,
  onPauseAll,
  isPausingAll,
  onResumeAll,
  isResumingAll,
  onStopAll,
  isStoppingAll,
  onKillSwitch,
  isKilling,
  onOpenCreateWizard,
}: GlobalBotCommandBarProps) {
  const [isKillModalOpen, setIsKillModalOpen] = useState(false);
  const [killConfirmed, setKillConfirmed] = useState(false);
  const [bulkPreviewAction, setBulkPreviewAction] = useState<"START" | "PAUSE" | "RESUME" | "STOP" | null>(null);

  const eligibleStartBots = bots.filter((b) => b.status === "STOPPED" || b.status === "CREATED");
  const runningBots = bots.filter((b) => b.status === "RUNNING");
  const pausedBots = bots.filter((b) => b.status === "PAUSED");
  const activeBots = bots.filter((b) => b.status === "RUNNING" || b.status === "PAUSED");

  const handleConfirmKill = () => {
    if (!killConfirmed) return;
    onKillSwitch();
    setIsKillModalOpen(false);
    setKillConfirmed(false);
  };

  const handleExecuteBulkAction = () => {
    if (bulkPreviewAction === "START") {
      onStartAll();
    } else if (bulkPreviewAction === "PAUSE") {
      onPauseAll();
    } else if (bulkPreviewAction === "RESUME") {
      onResumeAll();
    } else if (bulkPreviewAction === "STOP") {
      onStopAll();
    }
    setBulkPreviewAction(null);
  };

  return (
    <>
      <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3 sm:p-4 shadow-xl select-none font-sans space-y-3">
        {/* Commands and Summary Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* START ELIGIBLE */}
            <button
              onClick={() => setBulkPreviewAction("START")}
              disabled={isStartingAll || eligibleStartBots.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-40"
              title="Preview and start eligible stopped bots"
            >
              {isStartingAll ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              <span>START ELIGIBLE ({eligibleStartBots.length})</span>
            </button>

            {/* PAUSE RUNNING */}
            <button
              onClick={() => setBulkPreviewAction("PAUSE")}
              disabled={isPausingAll || runningBots.length === 0}
              className="px-3 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
              title="Pause all running bot execution loops"
            >
              {isPausingAll ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pause className="h-3.5 w-3.5 fill-current" />
              )}
              <span>PAUSE RUNNING ({runningBots.length})</span>
            </button>

            {/* RESUME PAUSED */}
            <button
              onClick={() => setBulkPreviewAction("RESUME")}
              disabled={isResumingAll || pausedBots.length === 0}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-300 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
              title="Resume all paused bot instances"
            >
              {isResumingAll ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span>RESUME PAUSED ({pausedBots.length})</span>
            </button>

            {/* STOP ACTIVE */}
            <button
              onClick={() => setBulkPreviewAction("STOP")}
              disabled={isStoppingAll || activeBots.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
              title="Stop all active bot instances safely"
            >
              {isStoppingAll ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="h-3.5 w-3.5 fill-current" />
              )}
              <span>STOP ACTIVE ({activeBots.length})</span>
            </button>

            {/* EMERGENCY KILL SWITCH */}
            <button
              onClick={() => setIsKillModalOpen(true)}
              disabled={isKilling}
              className="px-3.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md shadow-rose-950/50"
              title="Emergency Kill Switch (Universal Trading Halt)"
            >
              <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
              <span>EMERGENCY KILL</span>
            </button>
          </div>

          {/* Right Action: Guided Create Bot */}
          <button
            onClick={onOpenCreateWizard}
            className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-900/30"
          >
            <Plus className="h-4 w-4" />
            <span>CREATE BOT</span>
          </button>
        </div>
      </div>

      {/* 1. Bulk Action Preview Modal */}
      {bulkPreviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0B131E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Bulk Command Preview: {bulkPreviewAction}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review impacted bots before broadcasting command.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkPreviewAction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Breakdown Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#1E293B]">
                <span className="text-[10px] text-slate-500 uppercase block">Total Fleet</span>
                <span className="text-sm font-bold text-slate-200">{bots.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070D14] border border-emerald-900/50">
                <span className="text-[10px] text-emerald-400 uppercase block">Targeted</span>
                <span className="text-sm font-bold text-emerald-300">
                  {bulkPreviewAction === "START"
                    ? eligibleStartBots.length
                    : bulkPreviewAction === "PAUSE"
                    ? runningBots.length
                    : bulkPreviewAction === "RESUME"
                    ? pausedBots.length
                    : activeBots.length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#1E293B]">
                <span className="text-[10px] text-slate-500 uppercase block">Skipped</span>
                <span className="text-sm font-bold text-slate-400">
                  {bots.length -
                    (bulkPreviewAction === "START"
                      ? eligibleStartBots.length
                      : bulkPreviewAction === "PAUSE"
                      ? runningBots.length
                      : bulkPreviewAction === "RESUME"
                      ? pausedBots.length
                      : activeBots.length)}
                </span>
              </div>
            </div>

            {/* Impacted Bot List */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Bots to be {bulkPreviewAction.toLowerCase()}ed:
              </span>
              {(bulkPreviewAction === "START"
                ? eligibleStartBots
                : bulkPreviewAction === "PAUSE"
                ? runningBots
                : bulkPreviewAction === "RESUME"
                ? pausedBots
                : activeBots
              ).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#070D14] border border-[#1E293B] text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="font-bold text-slate-200">{b.name}</span>
                    <span className="text-[10px] text-slate-500">({b.symbol} • {b.timeframe})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setBulkPreviewAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkAction}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow-lg shadow-cyan-900/30"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Confirm & Execute {bulkPreviewAction}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Emergency Kill Switch Modal */}
      {isKillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0B131E] border border-rose-800 rounded-2xl p-5 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-rose-900/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-950 text-rose-400 border border-rose-800">
                  <AlertOctagon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-300">
                    EMERGENCY KILL SWITCH
                  </h3>
                  <p className="text-xs text-rose-400/80 font-mono">
                    Universal Trading System Circuit Breaker
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsKillModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 space-y-2 text-xs text-rose-200">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
                Activating this kill switch will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[11px] font-mono">
                <li>Halt all running and scheduled bot evaluation cycles immediately.</li>
                <li>Block all incoming automated order placements.</li>
                <li>Set global trading state to 🔴 TRADING HALTED across server.</li>
              </ul>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none p-1">
              <input
                type="checkbox"
                checked={killConfirmed}
                onChange={(e) => setKillConfirmed(e.target.checked)}
                className="rounded border-rose-700 text-rose-600 focus:ring-rose-500 h-4 w-4 bg-[#070D14]"
              />
              <span className="font-bold text-rose-300">
                I understand this will halt all automated bot executions.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setIsKillModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmKill}
                disabled={!killConfirmed}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 text-white text-xs font-bold font-mono shadow-lg shadow-rose-950/50 flex items-center gap-1.5"
              >
                <AlertOctagon className="h-3.5 w-3.5" />
                <span>ENGAGE KILL SWITCH</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
