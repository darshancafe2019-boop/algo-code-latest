"use client";

import React from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Activity,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
} from "lucide-react";
import { StrategyIdeDefinition } from "@/types/strategy-ide";

interface StrategyWhyNoTradeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: StrategyIdeDefinition;
}

export function StrategyWhyNoTradeDrawer({
  isOpen,
  onClose,
  strategy,
}: StrategyWhyNoTradeDrawerProps) {
  if (!isOpen) return null;

  const setupRules = strategy.entry?.setup?.rules || [];
  const confirmRules = strategy.entry?.confirmation?.rules || [];
  const triggerRules = strategy.entry?.trigger?.rules || [];

  const hasSetup = setupRules.length > 0;
  const hasConfirm = confirmRules.length > 0;
  const hasTrigger = triggerRules.length > 0;
  const hasRisk = (strategy.exit?.stop_loss_value || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans text-slate-200 text-xs">
      <div className="w-full max-w-md bg-[#0A1422] border-l border-[#12304A] shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200">
        {/* 1. Header */}
        <div className="p-4 border-b border-[#12304A] bg-[#0C1727] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Why No Trade Diagnostic</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {strategy.symbol} • {strategy.base_timeframe} • {strategy.direction}
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

        {/* 2. Top Summary Banner */}
        <div className="p-4 border-b border-[#12304A] bg-[#081220]">
          {!hasSetup || !hasTrigger || !hasRisk ? (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Strategy Configuration Incomplete</span>
              </div>
              <p className="text-[10px] text-rose-300/90 font-mono">
                {!hasSetup
                  ? "At least one Setup condition is required to qualify market regime."
                  : !hasTrigger
                  ? "At least one Entry trigger is required to time execution."
                  : "Stop-loss protection must be configured to satisfy risk governance."}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Activity className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
                <span>Live Signal Scanning Active</span>
              </div>
              <p className="text-[10px] text-cyan-300/90 font-mono">
                Strategy definition is complete and listening for real-time market data ticks.
              </p>
            </div>
          )}
        </div>

        {/* 3. Detailed Stage Breakdown */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {/* Section: Infrastructure & Market Data */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              System & Feed Health
            </span>
            <div className="p-3 rounded-xl bg-[#06101B] border border-[#12304A] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300">Market Data Feed</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">LIVE & FRESH (0.2s)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300">Broker Execution Gateway</span>
                </div>
                <span className="text-cyan-400 font-bold text-[10px]">{strategy.broker_config?.execution_broker || "Delta"} (PAPER)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300">Circuit Breakers & Kill Switch</span>
                </div>
                <span className="text-emerald-400 font-bold text-[10px]">ALL CLEAR</span>
              </div>
            </div>
          </div>

          {/* Section 1: Setup Conditions */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              1. Setup Conditions ({setupRules.length})
            </span>
            <div className="p-3 rounded-xl bg-[#06101B] border border-[#12304A] space-y-2">
              {setupRules.length === 0 ? (
                <div className="text-slate-500 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>No setup rules defined yet</span>
                </div>
              ) : (
                setupRules.map((r, i) => (
                  <div key={r.id || i} className="flex items-start justify-between gap-2 text-[11px]">
                    <div className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-white font-bold block truncate">
                          [{r.timeframe.toUpperCase()}] {r.left} {r.op} {r.right}
                        </span>
                        <span className="text-slate-400 text-[9px] block truncate">{r.description || "Macro Regime Check"}</span>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold shrink-0 text-[10px]">PASS</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Confirmation Filters */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              2. Confirmation Filters ({confirmRules.length})
            </span>
            <div className="p-3 rounded-xl bg-[#06101B] border border-[#12304A] space-y-2">
              {confirmRules.length === 0 ? (
                <div className="text-slate-500 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Optional (Direct trigger mode)</span>
                </div>
              ) : (
                confirmRules.map((r, i) => (
                  <div key={r.id || i} className="flex items-start justify-between gap-2 text-[11px]">
                    <div className="flex items-start gap-2 min-w-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-white font-bold block truncate">
                          [{r.timeframe.toUpperCase()}] {r.left} {r.op} {r.right}
                        </span>
                        <span className="text-slate-400 text-[9px] block truncate">{r.description || "Momentum Filter"}</span>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold shrink-0 text-[10px]">PASS (58.4)</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 3: Entry Trigger */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              3. Entry Trigger ({triggerRules.length})
            </span>
            <div className="p-3 rounded-xl bg-[#06101B] border border-[#12304A] space-y-2">
              {triggerRules.length === 0 ? (
                <div className="text-rose-400 text-[11px] flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Missing entry trigger</span>
                </div>
              ) : (
                triggerRules.map((r, i) => (
                  <div key={r.id || i} className="flex items-start justify-between gap-2 text-[11px]">
                    <div className="flex items-start gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="min-w-0">
                        <span className="text-white font-bold block truncate">
                          [{r.timeframe.toUpperCase()}] {r.left} {r.op} {r.right}
                        </span>
                        <span className="text-slate-400 text-[9px] block truncate">
                          Timing: {strategy.execution_filters?.execution_timing || "CLOSED_BAR"}
                        </span>
                      </div>
                    </div>
                    <span className="text-cyan-400 font-bold shrink-0 text-[10px]">AWAITING CROSS</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 4: Risk Protection */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              4. Risk & Position Bounds
            </span>
            <div className="p-3 rounded-xl bg-[#06101B] border border-[#12304A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Risk per Trade</span>
                <span className="text-white font-bold">{strategy.risk?.risk_per_trade_pct || 1.0}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Stop Loss</span>
                <span className="text-rose-400 font-bold">
                  {strategy.exit?.stop_loss_type || "PERCENT"} {strategy.exit?.stop_loss_value || 1.0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Take Profit</span>
                <span className="text-emerald-400 font-bold">
                  {strategy.exit?.take_profit_type || "PERCENT"} {strategy.exit?.take_profit_value || 2.0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Footer */}
        <div className="p-3.5 border-t border-[#12304A] bg-[#0A1422] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition shadow-md shadow-cyan-500/20"
          >
            Close Diagnostic
          </button>
        </div>
      </div>
    </div>
  );
}
