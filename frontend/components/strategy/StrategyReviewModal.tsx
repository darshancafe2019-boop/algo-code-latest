"use client";

import React from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Bot,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  Layers,
  Clock,
  DollarSign,
} from "lucide-react";
import { StrategyIdeDefinition } from "@/types/strategy-ide";

interface StrategyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyIdeDefinition;
  onSave: () => void;
  onRunBacktest: () => void;
  onAssignBot?: () => void;
  isSaving?: boolean;
}

export function StrategyReviewModal({
  isOpen,
  onClose,
  strategy,
  onSave,
  onRunBacktest,
  onAssignBot,
  isSaving = false,
}: StrategyReviewModalProps) {
  if (!isOpen) return null;

  const setupRules = strategy.entry?.setup?.rules || [];
  const confirmRules = strategy.entry?.confirmation?.rules || [];
  const triggerRules = strategy.entry?.trigger?.rules || [];

  const isReady =
    setupRules.length > 0 &&
    triggerRules.length > 0 &&
    (strategy.exit?.stop_loss_value || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 font-sans text-slate-200 text-xs">
      <div className="w-full max-w-2xl bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* 1. Header */}
        <div className="p-4 border-b border-[#12304A] bg-[#0C1727] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Strategy Architecture Summary</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                Verify institutional logic before saving or live deployment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {/* Top Meta Summary Strip */}
          <div className="p-3.5 bg-[#06101B] rounded-xl border border-[#12304A] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div>
              <span className="text-slate-500 block uppercase">Strategy Name</span>
              <strong className="text-white text-xs truncate block">{strategy.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">Market & Symbol</span>
              <strong className="text-cyan-300 text-xs truncate block">{strategy.symbol}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">Timeframe</span>
              <strong className="text-white text-xs truncate block">{strategy.base_timeframe}</strong>
            </div>
            <div>
              <span className="text-slate-500 block uppercase">Direction / Mode</span>
              <strong className="text-emerald-400 text-xs truncate block">
                {strategy.direction} • PAPER
              </strong>
            </div>
          </div>

          {/* 1. SETUP */}
          <div className="p-3.5 bg-[#081220] rounded-xl border border-[#12304A] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>1. SETUP CONDITIONS</span>
              </span>
              <span className="text-[10px] text-slate-400">{setupRules.length} active rule(s)</span>
            </div>
            {setupRules.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">No setup conditions configured</p>
            ) : (
              <div className="space-y-1.5">
                {setupRules.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="p-2 rounded-lg bg-[#06101B] border border-[#12304A] flex items-center justify-between text-[11px]"
                  >
                    <span className="font-bold text-slate-200">
                      [{r.timeframe.toUpperCase()}] {r.left} {r.op} {r.right}
                    </span>
                    <span className="text-[9px] text-slate-500">{r.description || "Macro Regime"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. CONFIRMATION */}
          <div className="p-3.5 bg-[#081220] rounded-xl border border-[#12304A] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. CONFIRMATION INDICATORS</span>
              </span>
              <span className="text-[10px] text-slate-400">{confirmRules.length} active rule(s)</span>
            </div>
            {confirmRules.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">None (Direct trigger mode enabled)</p>
            ) : (
              <div className="space-y-1.5">
                {confirmRules.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="p-2 rounded-lg bg-[#06101B] border border-[#12304A] flex items-center justify-between text-[11px]"
                  >
                    <span className="font-bold text-slate-200">
                      [{r.timeframe.toUpperCase()}] {r.left} {r.op} {r.right}
                    </span>
                    <span className="text-[9px] text-slate-500">{r.description || "Momentum Filter"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. ENTRY */}
          <div className="p-3.5 bg-[#081220] rounded-xl border border-[#12304A] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>3. ENTRY TRIGGERS</span>
              </span>
              <span className="text-[10px] text-slate-400">
                Timing: {strategy.execution_filters?.execution_timing || "CLOSED_BAR"}
              </span>
            </div>
            {triggerRules.length === 0 ? (
              <p className="text-[10px] text-rose-400 italic">Missing entry trigger</p>
            ) : (
              <div className="space-y-1.5">
                {triggerRules.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="p-2 rounded-lg bg-[#06101B] border border-[#12304A] flex items-center justify-between text-[11px]"
                  >
                    <span className="font-bold text-cyan-300">
                      [{r.timeframe.toUpperCase()}] {r.left} {r.op} {r.right}
                    </span>
                    <span className="text-[9px] text-slate-500">{r.description || "Execution Trigger"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. RISK */}
          <div className="p-3.5 bg-[#081220] rounded-xl border border-[#12304A] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>4. POSITION SIZING & RISK</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">1:2 R:R Ratio</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div className="p-2 rounded-lg bg-[#06101B] border border-[#12304A]">
                <span className="text-slate-500 block">Risk Per Trade</span>
                <strong className="text-white text-xs">{strategy.risk?.risk_per_trade_pct || 1.0}%</strong>
              </div>
              <div className="p-2 rounded-lg bg-[#06101B] border border-[#12304A]">
                <span className="text-slate-500 block">Stop Loss</span>
                <strong className="text-rose-400 text-xs">
                  {strategy.exit?.stop_loss_value || 1.0}% ({strategy.exit?.stop_loss_type || "PERCENT"})
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-[#06101B] border border-[#12304A]">
                <span className="text-slate-500 block">Take Profit</span>
                <strong className="text-emerald-400 text-xs">
                  {strategy.exit?.take_profit_value || 2.0}% ({strategy.exit?.take_profit_type || "PERCENT"})
                </strong>
              </div>
              <div className="p-2 rounded-lg bg-[#06101B] border border-[#12304A]">
                <span className="text-slate-500 block">Max Daily Loss</span>
                <strong className="text-amber-400 text-xs">${strategy.risk?.max_daily_loss || 500}</strong>
              </div>
            </div>
          </div>

          {/* Readiness State Card */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isReady
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
                : "bg-amber-950/80 border-amber-500/50 text-amber-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${isReady ? "text-emerald-400" : "text-amber-400"}`} />
              <span className="font-bold text-xs">
                {isReady ? "Strategy Status: READY FOR BACKTEST / EXECUTION" : "Strategy Status: INCOMPLETE CONFIGURATION"}
              </span>
            </div>
            <span className="text-[10px] font-bold font-mono">
              {isReady ? "100% Validated" : "Pending Requirements"}
            </span>
          </div>
        </div>

        {/* 3. Sticky Action Footer */}
        <div className="p-4 border-t border-[#12304A] bg-[#0C1727] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#12304A] text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs font-bold font-mono"
          >
            Back to Editor
          </button>

          <div className="flex items-center gap-2">
            {onAssignBot && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAssignBot();
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition text-xs font-bold font-mono flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Assign to Bot</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onRunBacktest();
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition text-xs font-bold font-mono flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Backtest Strategy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSave();
                onClose();
              }}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Strategy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
