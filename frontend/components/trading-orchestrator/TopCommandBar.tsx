"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  ShieldAlert,
  Radio,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface TopCommandBarProps {
  status: string;
  isPaused: boolean;
  isKilled: boolean;
  tradingMode: string;
  liveTradingEnabled: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onKill: () => void;
  onResetKill: () => void;
  isLoading: boolean;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  status,
  isPaused,
  isKilled,
  tradingMode,
  liveTradingEnabled,
  onStart,
  onPause,
  onResume,
  onStop,
  onKill,
  onResetKill,
  isLoading,
}) => {
  const [showKillConfirm, setShowKillConfirm] = useState(false);

  return (
    <div className="bg-[#0B0E17]/95 border border-[#1A2A3F] rounded-xl p-4 shadow-lg backdrop-blur mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Title and Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Radio className="h-5 w-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                TRADING ORCHESTRATOR
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  AI-ASSISTED
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Automated 6-Checkpoint Daily Scheduled Trading & Risk Supervisor
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Mode Pill */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span
              className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-bold ${
                tradingMode === "PAPER"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current animate-ping" />
              {tradingMode} MODE
            </span>

            <span
              className={`px-2.5 py-1 rounded-md border font-semibold ${
                liveTradingEnabled
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              LIVE {liveTradingEnabled ? "ARMED" : "DISABLED"}
            </span>

            {/* Workflow State Pill */}
            <span
              className={`px-2.5 py-1 rounded-md border font-bold ${
                isKilled
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                  : isPaused
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : status === "RUNNING" || status === "ANALYZING"
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                  : "bg-slate-800/80 border-slate-700 text-slate-300"
              }`}
            >
              STATE: {status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isKilled ? (
            <button
              onClick={onResetKill}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              RESET KILL SWITCH
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={onResume}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                >
                  <Play className="h-3.5 w-3.5" />
                  RESUME
                </button>
              ) : (
                <button
                  onClick={onPause}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
                >
                  <Pause className="h-3.5 w-3.5" />
                  PAUSE
                </button>
              )}

              <button
                onClick={onStart}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/10"
              >
                <Play className="h-3.5 w-3.5" />
                START SCHEDULER
              </button>

              <button
                onClick={onStop}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
              >
                <Square className="h-3.5 w-3.5" />
                STOP
              </button>

              {/* Emergency Kill Switch Button */}
              {showKillConfirm ? (
                <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-600 rounded-lg p-1">
                  <span className="text-[11px] text-rose-300 font-bold px-1.5">CONFIRM?</span>
                  <button
                    onClick={() => {
                      setShowKillConfirm(false);
                      onKill();
                    }}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded"
                  >
                    YES, HALT ALL
                  </button>
                  <button
                    onClick={() => setShowKillConfirm(false)}
                    className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowKillConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-extrabold tracking-wider transition-all shadow-lg shadow-rose-600/20"
                >
                  <ShieldAlert className="h-4 w-4 text-white animate-pulse" />
                  KILL SWITCH
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
