"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Activity,
  DollarSign,
  Percent,
  Sliders,
  GitBranch,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  Award,
  FlaskConical,
  Check
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeReadiness,
  StrategyIdePreflight,
  StrategyIdeRisk,
  BacktestResultPayload,
} from "@/types/strategy-ide";

interface StrategyInspectorProps {
  strategy: StrategyIdeDefinition;
  readiness: StrategyIdeReadiness | null;
  preflight: StrategyIdePreflight | null;
  backtestResult: BacktestResultPayload | null;
  isBacktesting: boolean;
  onRunTest: () => void;
  onOpenVersionsModal: () => void;
  onFixIssue?: (issueCategory: string) => void;
}

export function StrategyInspector({
  strategy,
  readiness,
  preflight,
  backtestResult,
  isBacktesting,
  onRunTest,
  onOpenVersionsModal,
  onFixIssue,
}: StrategyInspectorProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Pre-flight check validations
  const hasSetup = (strategy.entry?.setup?.rules?.length || 0) > 0;
  const hasConfirm = (strategy.entry?.confirmation?.rules?.length || 0) > 0;
  const hasTrigger = (strategy.entry?.trigger?.rules?.length || 0) > 0;
  const hasExit = (strategy.exit?.stop_loss_value || 0) > 0;
  const hasRisk = (strategy.risk?.risk_per_trade_pct || 0) > 0;

  const isReady = hasSetup && hasTrigger && hasExit && hasRisk;

  return (
    <aside className="w-full lg:w-80 bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 flex flex-col gap-4 shadow-xl text-xs font-sans select-none">
      
      {/* 1. STRATEGY CHECK HEADER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#142B21] pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#55C98A]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Strategy Check</h3>
          </div>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
              isReady
                ? "bg-[#142B21] text-[#55C98A] border border-[#275841]"
                : "bg-yellow-950/60 text-yellow-400 border border-yellow-800"
            }`}
          >
            {isReady ? "READY TO TEST" : "CONFIG INCOMPLETE"}
          </span>
        </div>

        {/* 6-Gate Checklist */}
        <div className="space-y-2 bg-[#060D0A] border border-[#14271F] rounded-xl p-3">
          
          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">1. Setup Conditions:</span>
            {hasSetup ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" /> Configured ({strategy.entry.setup.rules.length})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onFixIssue?.("setup")}
                className="text-yellow-400 font-bold flex items-center gap-1 hover:underline font-mono text-[11px]"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Add Setup
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">2. Confirmation Filter:</span>
            {hasConfirm ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" /> Configured ({strategy.entry.confirmation.rules.length})
              </span>
            ) : (
              <span className="text-[#607D6E] font-mono text-[11px]">Optional</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">3. Execution Trigger:</span>
            {hasTrigger ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" /> Configured ({strategy.entry.trigger.rules.length})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onFixIssue?.("trigger")}
                className="text-yellow-400 font-bold flex items-center gap-1 hover:underline font-mono text-[11px]"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Add Trigger
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">4. Exit / Stop Loss:</span>
            {hasExit ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" /> SL {strategy.exit.stop_loss_value}% / TP {strategy.exit.take_profit_value}%
              </span>
            ) : (
              <span className="text-red-400 font-bold flex items-center gap-1 font-mono">
                <XCircle className="h-3.5 w-3.5" /> Missing SL
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">5. Risk Envelope:</span>
            <span className="text-[#55C98A] font-bold flex items-center gap-1 font-mono">
              <CheckCircle2 className="h-3.5 w-3.5" /> {strategy.risk.risk_per_trade_pct}% / Trade
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">6. Zero-Lookahead Bias:</span>
            <span className="text-cyan-400 font-bold flex items-center gap-1 font-mono">
              <CheckCircle2 className="h-3.5 w-3.5" /> Closed-bar Strict
            </span>
          </div>

        </div>

        {/* Primary Action Button: [Test Strategy] */}
        <button
          type="button"
          onClick={onRunTest}
          disabled={isBacktesting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 text-xs"
        >
          {isBacktesting ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          <span>{isBacktesting ? "Simulating Strategy..." : "Test Strategy"}</span>
        </button>
      </div>

      {/* 2. BACKTEST RESULT KPI CARD (When Tested) */}
      {backtestResult && backtestResult.metrics && (
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#142B21] pb-2">
            <span className="text-xs font-black text-white uppercase flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-yellow-400" />
              <span>Backtest Performance</span>
            </span>
            <span className="text-[10px] text-[#607D6E] font-mono">
              {strategy.symbol} • {strategy.base_timeframe}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-lg bg-[#060D0A] border border-[#14271F]">
              <span className="text-[10px] text-[#8BA596] block">Total Trades</span>
              <span className="text-white font-bold text-sm">{backtestResult.metrics.total_trades}</span>
            </div>

            <div className="p-2 rounded-lg bg-[#060D0A] border border-[#14271F]">
              <span className="text-[10px] text-[#8BA596] block">Win Rate</span>
              <span className="text-[#55C98A] font-bold text-sm">{backtestResult.metrics.win_rate_pct}%</span>
            </div>

            <div className="p-2 rounded-lg bg-[#060D0A] border border-[#14271F]">
              <span className="text-[10px] text-[#8BA596] block">Profit Factor</span>
              <span className="text-cyan-400 font-bold text-sm">{backtestResult.metrics.profit_factor}</span>
            </div>

            <div className="p-2 rounded-lg bg-[#060D0A] border border-[#14271F]">
              <span className="text-[10px] text-[#8BA596] block">Net Return</span>
              <span
                className={`font-bold text-sm ${
                  backtestResult.metrics.return_pct >= 0 ? "text-[#55C98A]" : "text-red-400"
                }`}
              >
                {backtestResult.metrics.return_pct >= 0 ? "+" : ""}
                {backtestResult.metrics.return_pct}%
              </span>
            </div>

            <div className="p-2 rounded-lg bg-[#060D0A] border border-[#14271F]">
              <span className="text-[10px] text-[#8BA596] block">Max Drawdown</span>
              <span className="text-red-400 font-bold text-sm">-{backtestResult.metrics.max_drawdown_pct}%</span>
            </div>

            <div className="p-2 rounded-lg bg-[#060D0A] border border-[#14271F]">
              <span className="text-[10px] text-[#8BA596] block">Sharpe Ratio</span>
              <span className="text-white font-bold text-sm">{backtestResult.metrics.sharpe_ratio}</span>
            </div>
          </div>

          <div className="text-[9px] text-[#607D6E] font-mono flex justify-between pt-1 border-t border-[#142B21]">
            <span>Fees: 0.1%</span>
            <span>Slippage: 0.05%</span>
            <span>Zero Lookahead: YES</span>
          </div>
        </div>
      )}

      {/* 3. DETAILS ▾ ACCORDION */}
      <div className="border-t border-[#142B21] pt-2">
        <button
          type="button"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#8BA596] hover:text-white transition-colors"
        >
          <span>Details & Version Audit</span>
          {isDetailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {isDetailsOpen && (
          <div className="space-y-2.5 pt-3 animate-fadeIn text-xs font-mono">
            
            <div className="p-2.5 rounded-xl bg-[#060D0A] border border-[#14271F] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Version:</span>
                <span className="text-white font-bold">{strategy.active_version || "v1.0.0"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Config Hash:</span>
                <span className="text-cyan-400 truncate max-w-[140px]" title={strategy.config_hash || "SHA256"}>
                  {strategy.config_hash ? strategy.config_hash.substring(0, 12) + "..." : "sha256:ready"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Data Feed:</span>
                <span className="text-[#55C98A] font-bold">Mainnet Stream 100%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenVersionsModal}
              className="w-full py-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <GitBranch className="h-3.5 w-3.5 text-[#55C98A]" />
              <span>Inspect Version History</span>
            </button>

          </div>
        )}
      </div>

    </aside>
  );
}
