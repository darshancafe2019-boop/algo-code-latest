"use client";

import React, { useState } from "react";
import { X, Play, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { BotRowItem } from "./SimpleBotTable";

interface BulkStartConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bots: BotRowItem[];
  onConfirmStart: () => Promise<void>;
}

export function BulkStartConfirmationModal({
  isOpen,
  onClose,
  bots,
  onConfirmStart,
}: BulkStartConfirmationModalProps) {
  const [isStarting, setIsStarting] = useState(false);

  if (!isOpen) return null;

  const stoppedBots = bots.filter((b) => (b.status || b.state) === "STOPPED" || (b.status || b.state) === "DRAFT");
  const paperBots = stoppedBots.filter((b) => b.execution_mode === "PAPER");
  const liveBots = stoppedBots.filter((b) => b.execution_mode === "LIVE");
  const errorBots = bots.filter((b) => (b.status || b.state) === "ERROR");

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onConfirmStart();
      onClose();
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 font-mono text-xs">
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-slate-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              Start Eligible Bots
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breakdown Card */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Pre-Flight Fleet Analysis</span>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Paper Bots</span>
              <span className="text-sm font-bold text-cyan-400">{paperBots.length}</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Live Bots</span>
              <span className="text-sm font-bold text-amber-400">{liveBots.length}</span>
            </div>
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Blocked (Error)</span>
              <span className="text-sm font-bold text-rose-400">{errorBots.length}</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            Starting <strong>{stoppedBots.length}</strong> eligible bot instances. Each bot will be independently verified against 14 pre-trade risk gates, market feed subscriptions, and broker adapters.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:text-white text-slate-400 font-bold transition"
          >
            Cancel
          </button>

          <button
            onClick={handleStart}
            disabled={isStarting || stoppedBots.length === 0}
            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isStarting ? "animate-spin" : ""}`} />
            <span>{isStarting ? "Starting Fleet..." : `Start ${stoppedBots.length} Eligible`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
