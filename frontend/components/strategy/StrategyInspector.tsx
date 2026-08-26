"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  GitBranch,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeReadiness,
  StrategyIdePreflight,
  BacktestResultPayload,
} from "@/types/strategy-ide";

interface StrategyInspectorProps {
  strategy: StrategyIdeDefinition;
  readiness: StrategyIdeReadiness | null;
  preflight: StrategyIdePreflight | null;
  backtestResult: BacktestResultPayload | null;
  isBacktesting: boolean;
  isBacktestStale?: boolean;
  onOpenFullReport?: () => void;
  onOpenVersionsModal: () => void;
  onFixIssue?: (issueCategory: string) => void;
}

export function StrategyInspector({
  strategy,
  readiness,
  preflight,
  backtestResult,
  isBacktesting,
  isBacktestStale = false,
  onOpenFullReport,
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
    <aside className="w-full lg:w-72 bg-[#09110E] border border-[#1F392D] rounded-2xl p-4 flex flex-col gap-4 shadow-xl text-xs font-sans select-none shrink-0">
      
      {/* 1. STRATEGY STATUS CARD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#142B21] pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#55C98A]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">STRATEGY STATUS</h3>
          </div>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
              isReady
                ? "bg-[#142B21] text-[#55C98A] border border-[#275841]"
                : "bg-yellow-950/60 text-yellow-400 border border-yellow-800"
            }`}
          >
            {isReady ? "READY" : "INCOMPLETE"}
          </span>
        </div>

        {/* Status Checklist */}
        <div className="space-y-2 bg-[#060D0A] border border-[#14271F] rounded-xl p-3 font-mono text-xs">
          
          {/* 1. Setup */}
          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">Setup:</span>
            {hasSetup ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" /> ✓ Pass ({strategy.entry.setup.rules.length})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onFixIssue?.("setup")}
                className="text-yellow-400 font-bold flex items-center gap-1 hover:underline text-[11px]"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Missing [Fix]
              </button>
            )}
          </div>

          {/* 2. Confirm */}
          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">Confirm:</span>
            {hasConfirm ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" /> ✓ Pass ({strategy.entry.confirmation.rules.length})
              </span>
            ) : (
              <span className="text-[#607D6E] text-[11px]">Optional</span>
            )}
          </div>

          {/* 3. Trigger */}
          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">Trigger:</span>
            {hasTrigger ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" /> ✓ Pass ({strategy.entry.trigger.rules.length})
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onFixIssue?.("trigger")}
                className="text-yellow-400 font-bold flex items-center gap-1 hover:underline text-[11px]"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Missing [Fix]
              </button>
            )}
          </div>

          {/* 4. Exit */}
          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">Exit (SL):</span>
            {hasExit ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" /> ✓ Pass ({strategy.exit.stop_loss_value}%)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onFixIssue?.("exit")}
                className="text-red-400 font-bold flex items-center gap-1 hover:underline text-[11px]"
              >
                <XCircle className="h-3.5 w-3.5" /> Missing SL [Fix]
              </button>
            )}
          </div>

          {/* 5. Risk */}
          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">Risk:</span>
            {hasRisk ? (
              <span className="text-[#55C98A] font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5" /> ✓ Pass ({strategy.risk.risk_per_trade_pct}%)
              </span>
            ) : (
              <span className="text-red-400 font-bold text-[11px]">Missing</span>
            )}
          </div>

          {/* 6. Closed-Bar */}
          <div className="flex items-center justify-between">
            <span className="text-[#8BA596]">Closed-Bar:</span>
            <span className="text-cyan-400 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5" /> ✓ Guaranteed
            </span>
          </div>

        </div>

        {/* Readiness Verdict Banner */}
        <div
          className={`p-2.5 rounded-xl border text-center font-mono font-bold text-xs ${
            isReady
              ? "bg-[#123C2A] text-[#55C98A] border-[#39B978]/40"
              : "bg-yellow-950/40 text-yellow-400 border-yellow-800/60"
          }`}
        >
          {isReady ? "READY TO TEST" : "CONFIG INCOMPLETE"}
        </div>
      </div>

      {/* 2. BACKTEST RESULT (COMPACT 6-METRIC KPI) */}
      {isBacktesting ? (
        <div className="p-4 rounded-xl bg-[#060D0A] border border-[#14271F] text-center space-y-2 font-mono">
          <RefreshCw className="h-5 w-5 text-[#55C98A] animate-spin mx-auto" />
          <p className="text-xs text-[#8BA596]">Simulating backtest...</p>
        </div>
      ) : backtestResult && backtestResult.metrics ? (
        <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-3.5 space-y-2.5 animate-fadeIn font-mono text-xs">
          
          <div className="flex items-center justify-between border-b border-[#142B21] pb-2">
            <span className="text-xs font-black text-white uppercase flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-yellow-400" />
              <span>BACKTEST RESULT</span>
            </span>
            {isBacktestStale && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                STALE
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#8BA596]">Trades:</span>
              <span className="text-white font-bold">{backtestResult.metrics.total_trades}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8BA596]">Win Rate:</span>
              <span className="text-[#55C98A] font-bold">{backtestResult.metrics.win_rate_pct}%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8BA596]">Net Return:</span>
              <span
                className={`font-bold ${
                  backtestResult.metrics.return_pct >= 0 ? "text-[#55C98A]" : "text-red-400"
                }`}
              >
                {backtestResult.metrics.return_pct >= 0 ? "+" : ""}
                {backtestResult.metrics.return_pct}%
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8BA596]">Profit Factor:</span>
              <span className="text-cyan-400 font-bold">{backtestResult.metrics.profit_factor}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8BA596]">Max Drawdown:</span>
              <span className="text-red-400 font-bold">-{backtestResult.metrics.max_drawdown_pct}%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#8BA596]">Average R:</span>
              <span className="text-white font-bold">+{backtestResult.metrics.expectancy}R</span>
            </div>
          </div>

          {onOpenFullReport && (
            <button
              type="button"
              onClick={onOpenFullReport}
              className="w-full mt-2 py-2 rounded-lg bg-[#123C2A] hover:bg-[#1B4D36] text-[#55C98A] hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
              <span>View Full Report</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : null}

      {/* 3. DETAILS ▾ ACCORDION */}
      <div className="border-t border-[#142B21] pt-2">
        <button
          type="button"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full flex items-center justify-between text-xs font-bold text-[#8BA596] hover:text-white transition-colors"
        >
          <span>Details ▾</span>
          {isDetailsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {isDetailsOpen && (
          <div className="space-y-2 pt-2.5 animate-fadeIn text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-[#060D0A] border border-[#14271F] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Version:</span>
                <span className="text-white font-bold">{strategy.active_version || "v1.0.0"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Config Hash:</span>
                <span className="text-cyan-400 truncate max-w-[120px]" title={strategy.config_hash || "SHA256"}>
                  {strategy.config_hash ? strategy.config_hash.substring(0, 10) + "..." : "sha256:ready"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenVersionsModal}
              className="w-full py-1.5 rounded-lg bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <GitBranch className="h-3.5 w-3.5 text-[#55C98A]" />
              <span>Version History</span>
            </button>
          </div>
        )}
      </div>

    </aside>
  );
}
