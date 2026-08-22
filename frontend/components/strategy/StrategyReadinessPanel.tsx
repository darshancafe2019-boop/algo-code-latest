"use client";

import React, { useMemo } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Activity,
  BarChart2,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import { FullVisualStrategy, ReadinessCheckItem } from "@/types/strategy-builder";

interface StrategyReadinessPanelProps {
  strategy: FullVisualStrategy;
}

export function StrategyReadinessPanel({ strategy }: StrategyReadinessPanelProps) {
  // Compute Realtime Sanity & Readiness Checks
  const checks: ReadinessCheckItem[] = useMemo(() => {
    const list: ReadinessCheckItem[] = [];

    // 1. Data Connection
    list.push({
      id: "data-symbol",
      category: "Data",
      label: "Symbol Asset Verification",
      status: strategy.symbol ? "PASSED" : "FAILED",
      message: strategy.symbol ? `${strategy.symbol} active on ${strategy.market_type.toUpperCase()}` : "No symbol specified",
      critical: true,
    });

    list.push({
      id: "data-timeframe",
      category: "Data",
      label: "Base Timeframe Alignment",
      status: "PASSED",
      message: `${strategy.timeframe.toUpperCase()} closed candle stream mapped`,
    });

    // 2. Conditions
    const enabledEntryRules = strategy.entry_rules.filter((r) => r.enabled);
    if (enabledEntryRules.length === 0) {
      list.push({
        id: "cond-entry",
        category: "Conditions",
        label: "Entry Trigger Logic",
        status: "FAILED",
        message: "At least 1 active entry condition is required",
        critical: true,
      });
    } else {
      list.push({
        id: "cond-entry",
        category: "Conditions",
        label: "Entry Trigger Logic",
        status: "PASSED",
        message: `${enabledEntryRules.length} conditions configured (${strategy.entry_conjunction})`,
      });
    }

    // 3. Risk Controls
    const hasSL = strategy.risk.stop_loss_value > 0;
    list.push({
      id: "risk-sl",
      category: "Risk",
      label: "Stop Loss Protection",
      status: hasSL ? "PASSED" : "FAILED",
      message: hasSL ? `${strategy.risk.stop_loss_value}x ${strategy.risk.stop_loss_type} stop active` : "Stop Loss is missing!",
      critical: true,
    });

    const hasTP = strategy.risk.take_profit_value > 0;
    list.push({
      id: "risk-tp",
      category: "Risk",
      label: "Profit Target",
      status: hasTP ? "PASSED" : "WARNING",
      message: hasTP ? `${strategy.risk.take_profit_value}x ${strategy.risk.take_profit_type} target` : "No take profit target specified",
    });

    const hasCapital = strategy.risk.capital > 0;
    list.push({
      id: "risk-cap",
      category: "Risk",
      label: "Capital Allocation",
      status: hasCapital ? "PASSED" : "FAILED",
      message: hasCapital ? `$${strategy.risk.capital.toLocaleString()} allocated` : "Capital cannot be 0",
      critical: true,
    });

    // 4. Exit Rules
    list.push({
      id: "exit-rules",
      category: "Exit",
      label: "Exit Strategy",
      status: strategy.exit_rules.length > 0 || hasSL ? "PASSED" : "WARNING",
      message: strategy.exit_rules.length > 0 ? `${strategy.exit_rules.length} custom exit conditions` : "Using standard SL/TP exits",
    });

    // 5. Derivatives specifics
    if (strategy.direction === "OPTIONS_MULTI_LEG") {
      const legCount = strategy.options_config?.legs.length || 0;
      list.push({
        id: "opt-legs",
        category: "Conditions",
        label: "Options Multi-Leg Structure",
        status: legCount > 0 ? "PASSED" : "FAILED",
        message: legCount > 0 ? `${legCount} option legs configured (${strategy.options_config?.preset})` : "No option legs configured",
        critical: true,
      });
    }

    return list;
  }, [strategy]);

  // Compute Overall Score (0-100)
  const passedCount = checks.filter((c) => c.status === "PASSED").length;
  const warningCount = checks.filter((c) => c.status === "WARNING").length;
  const readinessScore = Math.round(((passedCount + warningCount * 0.5) / checks.length) * 100);

  const isReady = checks.every((c) => !c.critical || c.status === "PASSED");

  return (
    <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 flex flex-col space-y-4 font-sans select-none shadow-xl">
      {/* Score Header */}
      <div className="flex items-center justify-between border-b border-[#1A2333] pb-3">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
            Readiness & Safety Score
          </span>
          <h3 className="text-xs font-bold text-white">Strategy Health Gauge</h3>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`text-base font-bold font-mono px-3 py-1 rounded-xl border ${
              readinessScore >= 85
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                : readinessScore >= 60
                ? "bg-amber-950/80 text-amber-400 border-amber-800"
                : "bg-red-950/80 text-red-400 border-red-800"
            }`}
          >
            {readinessScore}/100
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-[#121927] rounded-full h-2 overflow-hidden border border-[#1E293B]">
          <div
            className={`h-full transition-all duration-500 ${
              readinessScore >= 85
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : readinessScore >= 60
                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                : "bg-gradient-to-r from-red-500 to-rose-400"
            }`}
            style={{ width: `${readinessScore}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>Incomplete</span>
          <span>Ready for Paper</span>
          <span>Deployable</span>
        </div>
      </div>

      {/* Live Strategy Summary Card */}
      <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3 space-y-2 text-xs">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Live Strategy Summary</span>
          <span className="font-mono text-cyan-400">{strategy.direction}</span>
        </h4>

        <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-500">Market:</span>
            <span className="text-white font-bold">{strategy.symbol} ({strategy.timeframe})</span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-500">Entry:</span>
            <span className="text-cyan-300 text-right truncate max-w-[180px]">
              {strategy.entry_rules.filter((r) => r.enabled).length > 0
                ? strategy.entry_rules
                    .filter((r) => r.enabled)
                    .map((r) => `${r.left} ${r.op} ${r.right}`)
                    .join(` ${strategy.entry_conjunction} `)
                : "No active rules"}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-500">Stop Loss:</span>
            <span className="text-red-400 font-bold">
              {strategy.risk.stop_loss_value}x {strategy.risk.stop_loss_type}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-500">Take Profit:</span>
            <span className="text-emerald-400 font-bold">
              {strategy.risk.take_profit_value}x {strategy.risk.take_profit_type}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-500">Risk Allocation:</span>
            <span className="text-purple-400 font-bold">{strategy.risk.risk_per_trade_pct}% per trade</span>
          </div>
        </div>
      </div>

      {/* Checklist Breakdown */}
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[260px] pr-1 custom-scrollbar">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Pre-Flight Verification Checklist
        </h4>

        {checks.map((item) => (
          <div
            key={item.id}
            className="p-2 rounded-lg bg-[#121927]/60 border border-[#1E293B] flex items-start gap-2 text-xs"
          >
            {item.status === "PASSED" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : item.status === "WARNING" ? (
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px] truncate">{item.label}</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">[{item.category}]</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{item.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
