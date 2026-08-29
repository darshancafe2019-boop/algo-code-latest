"use client";

import React, { useState } from "react";
import { useOptionsMarketContext } from "@/context/OptionsMarketContext";
import {
  Play,
  Pause,
  StopCircle,
  Save,
  CheckCircle,
  AlertTriangle,
  Flame,
  Shield,
  Layers,
  XCircle,
  RefreshCw,
  Power,
  Lock,
  ArrowRight,
} from "lucide-react";

export function StateAwareCommandBar() {
  const {
    strategyWorkflowState,
    executionMode,
    activeStrategies,
    openPositions,
    draftLegs,
    isContractLocked,
    executePaperStrategy,
    executeLiveStrategy,
    squareOffPortfolio,
    triggerEmergencyKillSwitch,
    evaluateDraftStrategy,
    setIsContractLocked,
  } = useOptionsMarketContext();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmSquareOff, setShowConfirmSquareOff] = useState<boolean>(false);

  const handlePaperTradeClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await executePaperStrategy();
    setIsSubmitting(false);
  };

  const handleLiveTradeClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await executeLiveStrategy();
    setIsSubmitting(false);
  };

  const handleValidateClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await evaluateDraftStrategy();
    setIsSubmitting(false);
  };

  return (
    <div className="sticky bottom-3 z-30 bg-[#080E1E]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-2.5 shadow-2xl font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Strategy Workflow State Indicator & Active State Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400">STATE:</span>
            <span
              className={`font-black text-xs ${
                strategyWorkflowState === "ACTIVE"
                  ? "text-emerald-400"
                  : strategyWorkflowState === "READY"
                  ? "text-cyan-400"
                  : strategyWorkflowState === "PAUSED"
                  ? "text-amber-400"
                  : strategyWorkflowState === "ERROR"
                  ? "text-rose-400"
                  : "text-slate-300"
              }`}
            >
              {strategyWorkflowState}
            </span>
          </div>

          {/* DRAFT STATE COMMANDS */}
          {strategyWorkflowState === "DRAFT" && (
            <>
              <button
                onClick={handleValidateClick}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition"
              >
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Validate Strategy</span>
              </button>

              <button
                onClick={handlePaperTradeClick}
                disabled={isSubmitting || draftLegs.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold transition shadow-md shadow-cyan-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Paper Trade</span>
              </button>
            </>
          )}

          {/* READY STATE COMMANDS */}
          {strategyWorkflowState === "READY" && (
            <>
              <button
                onClick={handlePaperTradeClick}
                disabled={isSubmitting || draftLegs.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-extrabold transition shadow-md shadow-cyan-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Paper Trade</span>
              </button>

              {executionMode === "LIVE" && (
                <button
                  onClick={handleLiveTradeClick}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold transition shadow-lg shadow-rose-600/30"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Review Live Activation</span>
                </button>
              )}
            </>
          )}

          {/* ACTIVE STATE COMMANDS */}
          {strategyWorkflowState === "ACTIVE" && (
            <>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold transition">
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold hover:text-white transition">
                <StopCircle className="w-3.5 h-3.5" />
                <span>Stop New Entries</span>
              </button>
            </>
          )}

          {/* PAUSED STATE COMMANDS */}
          {strategyWorkflowState === "PAUSED" && (
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold transition">
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}

          {/* ERROR STATE COMMANDS */}
          {strategyWorkflowState === "ERROR" && (
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold transition">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Reconcile &amp; Exit Safely</span>
            </button>
          )}
        </div>

        {/* Right: Visually Separated Emergency & Portfolio Actions */}
        <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
          <button
            onClick={() => setShowConfirmSquareOff(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-bold transition text-[11px]"
            title="Exit all active positions gracefully"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Square Off Portfolio ({openPositions.length})</span>
          </button>

          <button
            onClick={triggerEmergencyKillSwitch}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/60 text-rose-300 font-extrabold transition shadow-lg shadow-rose-950/50 text-[11px]"
            title="Emergency halt all bots, cancel pending orders and initiate controlled reconciliation"
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>Kill Switch</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Square Off Portfolio */}
      {showConfirmSquareOff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B132B] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-950 border border-rose-500/40 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-white font-extrabold text-sm">
                  Confirm Portfolio Square-Off
                </h3>
                <p className="text-slate-400 text-[11px]">
                  This will exit all {openPositions.length} open position(s) across Indian, Global, and Crypto markets.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px] space-y-1">
              <div>• Total Affected Positions: <b className="text-white">{openPositions.length}</b></div>
              <div>• Total Active Strategies: <b className="text-white">{activeStrategies.length}</b></div>
              <div>• Order Routing: <b className="text-cyan-400">Conservative Limit Fills at Mid/Bid</b></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmSquareOff(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmSquareOff(false);
                  await squareOffPortfolio();
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold transition shadow-lg shadow-rose-600/30"
              >
                Confirm &amp; Exit All Positions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
