"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Flame,
  Shield,
  Activity,
  Layers,
  FileText,
  Copy,
  Sliders,
  Send,
  XCircle,
  RefreshCw,
  Power
} from "lucide-react";

export interface CommandBarProps {
  onSaveDraft?: () => void;
  onValidate?: () => void;
  onBacktest?: () => void;
  onPaperTrade?: () => void;
  onActivate?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStopNewEntries?: () => void;
  onRecalculateHedge?: () => void;
  onRebalancePair?: () => void;
  onModifyExit?: () => void;
  onExitStrategy?: () => void;
  onCancelOrders?: () => void;
  onSquareOffSelected?: () => void;
  onSquareOffAll?: () => void;
  onEmergencyKillSwitch?: () => void;
  onDuplicate?: () => void;
  onViewLogs?: () => void;
  isExecuting?: boolean;
  activeTab?: string;
}

export function CommandBar({
  onSaveDraft,
  onValidate,
  onBacktest,
  onPaperTrade,
  onActivate,
  onPause,
  onResume,
  onStopNewEntries,
  onRecalculateHedge,
  onRebalancePair,
  onModifyExit,
  onExitStrategy,
  onCancelOrders,
  onSquareOffSelected,
  onSquareOffAll,
  onEmergencyKillSwitch,
  onDuplicate,
  onViewLogs,
  isExecuting = false,
  activeTab = "builder",
}: CommandBarProps) {
  const [showConfirmKill, setShowConfirmKill] = useState(false);

  return (
    <div className="w-full bg-[#080E1E] border border-slate-800 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left Primary Creation & Execution Actions */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={onValidate}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 hover:text-cyan-300 font-bold transition shadow-sm"
            title="Run 14-Point Pre-Flight Validation"
          >
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Validate (14-Point)</span>
          </button>

          <button
            onClick={onBacktest}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-indigo-300 hover:text-white font-bold transition shadow-sm"
            title="Run Walk-Forward Backtester"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>Backtest</span>
          </button>

          <button
            onClick={onPaperTrade}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold transition shadow-lg shadow-cyan-500/20"
            title="Deploy Paper Trade"
          >
            <Send className="w-3.5 h-3.5 fill-current" />
            <span>Run Paper Trade</span>
          </button>

          <button
            onClick={onActivate}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-bold transition"
            title="Activate Live Strategy (Server Lock Controlled)"
          >
            <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
            <span>Activate</span>
          </button>

          <button
            onClick={onSaveDraft}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
        </div>

        {/* Center Statistical & Strategy Adjustments */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={onRecalculateHedge}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition"
            title="Recalculate OLS Hedge Ratio & Beta"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>Recalc Hedge</span>
          </button>

          <button
            onClick={onRebalancePair}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-slate-700 transition"
            title="Rebalance Pair Leg Imbalance"
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Rebalance</span>
          </button>

          <button
            onClick={onPause}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 hover:bg-amber-500/10 transition"
          >
            <Pause className="w-3 h-3" />
            <span>Pause</span>
          </button>

          <button
            onClick={onResume}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-300 hover:bg-emerald-500/10 transition"
          >
            <Play className="w-3 h-3" />
            <span>Resume</span>
          </button>

          <button
            onClick={onStopNewEntries}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-purple-300 hover:bg-purple-500/10 transition"
            title="Allow existing trades to exit, block new entries"
          >
            <Shield className="w-3 h-3 text-purple-400" />
            <span>Stop Entries</span>
          </button>
        </div>

        {/* Right Risk & Emergency Actions */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={onSquareOffSelected}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-bold transition"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Square Off</span>
          </button>

          <button
            onClick={onSquareOffAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-bold transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Square Off All</span>
          </button>

          {!showConfirmKill ? (
            <button
              onClick={() => setShowConfirmKill(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold transition shadow-lg shadow-rose-600/30 animate-pulse"
              title="Immediate emergency kill switch for all strategies and positions"
            >
              <Power className="w-3.5 h-3.5" />
              <span>KILL SWITCH</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-rose-950 border border-rose-600 p-0.5 rounded-xl">
              <button
                onClick={() => {
                  onEmergencyKillSwitch?.();
                  setShowConfirmKill(false);
                }}
                className="px-2 py-1 rounded-lg bg-rose-600 text-white font-extrabold hover:bg-rose-500"
              >
                CONFIRM KILL!
              </button>
              <button
                onClick={() => setShowConfirmKill(false)}
                className="px-2 py-1 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
