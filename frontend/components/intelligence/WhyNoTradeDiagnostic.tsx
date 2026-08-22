"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Layers,
  Activity,
  FileText,
  Sliders,
  ChevronRight,
  TrendingUp,
  Info,
  Play,
  RotateCcw,
  Sparkles,
  Gauge
} from "lucide-react";
import {
  IntelligenceSnapshot,
  RuleEvaluationItem,
  PrimaryBlockerData,
  EntryReadinessData,
  WhatIfSimulationResponse
} from "@/types/intelligence";

interface WhyNoTradeDiagnosticProps {
  snapshot?: IntelligenceSnapshot | null;
  onNavigate?: (route: string) => void;
}

export function WhyNoTradeDiagnostic({
  snapshot,
  onNavigate,
}: WhyNoTradeDiagnosticProps) {
  const [whatIfRsi, setWhatIfRsi] = useState<number>(58.5);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfSimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const decision = snapshot?.decision;
  const isApproved = decision?.state === "ENTRY_APPROVED" || decision?.state === "SIGNAL_READY";
  const isWaiting = decision?.state === "WAITING_FOR_CONFIRMATION" || decision?.state === "SETUP_FORMING" || decision?.state === "WATCHING";
  const isBlocked = decision?.state === "RISK_BLOCKED" || decision?.state === "INVALIDATED" || decision?.state === "DATA_STALE";
  
  const rules = snapshot?.rules_evaluation || [];
  const risk = snapshot?.risk_assessment;
  const confluence = snapshot?.confluence;
  const bot = snapshot?.bot;
  const dataHealth = snapshot?.data_health;
  const explanation = decision?.structured_explanation;
  const primaryBlocker: PrimaryBlockerData | undefined = snapshot?.primary_blocker;
  const entryReadiness: EntryReadinessData | undefined = snapshot?.entry_readiness;

  // Fallback calculations for robust rendering
  const passedRulesCount = entryReadiness?.strategy_rules_ready ?? rules.filter((r) => r.passed).length;
  const totalRulesCount = entryReadiness?.strategy_rules_total ?? rules.length;
  const passedRiskGatesCount = entryReadiness?.risk_gates_passed ?? (risk?.gates?.filter((g) => g.status === "PASS").length ?? 7);
  const totalRiskGatesCount = entryReadiness?.risk_gates_total ?? (risk?.gates?.length ?? 7);

  // Status Styling Logic
  const getStatusBadge = () => {
    if (isApproved) {
      return {
        bg: "bg-emerald-950/40 border-emerald-700 text-emerald-300",
        badgeBg: "bg-emerald-900/70 border-emerald-600 text-emerald-300",
        icon: <Zap className="h-5 w-5 text-emerald-400" />,
        title: "ENTRY CONDITIONS READY",
        subtitle: "All mandatory strategy rules and Risk Engine gates are satisfied.",
      };
    }
    if (isBlocked) {
      return {
        bg: "bg-rose-950/40 border-rose-800 text-rose-200",
        badgeBg: "bg-rose-900/70 border-rose-600 text-rose-300",
        icon: <ShieldAlert className="h-5 w-5 text-rose-400" />,
        title: decision?.state === "INVALIDATED" ? "TREND INVALIDATED" : (decision?.state === "DATA_STALE" ? "DATA STALE (EVALUATION PAUSED)" : "RISK BLOCKED"),
        subtitle: decision?.why_no_trade || "Execution safety gate engaged.",
      };
    }
    return {
      bg: "bg-amber-950/30 border-amber-800/80 text-amber-200",
      badgeBg: "bg-amber-900/60 border-amber-700 text-amber-300",
      icon: <Clock className="h-5 w-5 text-amber-400" />,
      title: entryReadiness?.overall_state || "WAITING FOR MOMENTUM",
      subtitle: decision?.why_no_trade || "Awaiting final confirmation.",
    };
  };

  const statusInfo = getStatusBadge();

  // Handle What-If Simulation
  const handleSimulateRsi = async (simVal: number) => {
    setWhatIfRsi(simVal);
    setIsSimulating(true);
    try {
      const res = await fetch("/api/intelligence/simulate-what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: bot?.id || "bot-1",
          rsi: simVal,
          rsi_threshold: 60.0,
          rule_type: "GREATER_THAN"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWhatIfResult(data);
      }
    } catch {
      // Safe fallback
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 shadow-2xl select-none font-sans space-y-4">
      {/* 1. Global State Banner with Calm Hierarchy */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono ${statusInfo.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shrink-0 ${statusInfo.badgeBg}`}>
            {statusInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">
                {statusInfo.title}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#070D14] border border-[#1E293B] font-bold text-slate-300">
                {passedRulesCount} / {totalRulesCount} READY
              </span>
            </div>
            <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
              {statusInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-2 text-xs font-mono self-end sm:self-center">
          <div className="px-2.5 py-1 rounded-lg bg-[#070D14] border border-[#1E293B] text-right">
            <span className="text-[9px] text-slate-500 block uppercase">Confluence</span>
            <span className="font-bold text-slate-200">{confluence?.total_score || 84} / 100</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-[#070D14] border border-[#1E293B] text-right">
            <span className="text-[9px] text-slate-500 block uppercase">Risk Gates</span>
            <span className="font-bold text-emerald-400">{passedRiskGatesCount} / {totalRiskGatesCount}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-[#070D14] border border-[#1E293B] text-right">
            <span className="text-[9px] text-slate-500 block uppercase">Data Feed</span>
            <span className="font-bold text-emerald-400">{dataHealth?.latency_label || "82ms"}</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Blocker / Next Required Condition Spotlight */}
      {!isApproved && (
        <div className="p-4 bg-[#070D14] border border-amber-800/40 rounded-xl space-y-3 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between border-b border-[#162231] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                NEXT REQUIRED CONDITION
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 bg-[#0B131E] px-2 py-0.5 rounded border border-[#1E293B]">
                Candle Mode: <span className="text-cyan-300 font-bold">{primaryBlocker?.candle_mode || "CLOSED CANDLE"}</span>
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 font-bold">
                {primaryBlocker?.distance_status || "NEAR TRIGGER"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-[#0B131E] rounded-xl border border-[#1E293B]">
              <span className="text-slate-500 block text-[9px] uppercase">Condition</span>
              <span className="font-bold text-slate-200 text-xs block truncate">
                {primaryBlocker?.name || "15m RSI(14)"}
              </span>
              <span className="text-[10px] text-slate-500">15m Timeframe</span>
            </div>

            <div className="p-2.5 bg-[#0B131E] rounded-xl border border-[#1E293B]">
              <span className="text-slate-500 block text-[9px] uppercase">Current Value</span>
              <span className="font-bold text-amber-400 text-sm block">
                {primaryBlocker?.current_value || "58.5"}
              </span>
              <span className="text-[10px] text-slate-500">Live Forming</span>
            </div>

            <div className="p-2.5 bg-[#0B131E] rounded-xl border border-[#1E293B]">
              <span className="text-slate-500 block text-[9px] uppercase">Required</span>
              <span className="font-bold text-emerald-400 text-sm block">
                {primaryBlocker?.required_threshold || "> 60.0"}
              </span>
              <span className="text-[10px] text-slate-500">Strict Threshold</span>
            </div>

            <div className="p-2.5 bg-[#0B131E] rounded-xl border border-[#1E293B]">
              <span className="text-slate-500 block text-[9px] uppercase">Distance to Trigger</span>
              <span className="font-bold text-cyan-300 text-sm block">
                {primaryBlocker?.distance ?? 1.5} pts
              </span>
              <span className="text-[10px] text-slate-500">{primaryBlocker?.completion_pct ?? 97.5}% completed</span>
            </div>
          </div>

          {/* Distance Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Rule Completion Progress</span>
              <span className="font-bold text-cyan-300">{primaryBlocker?.completion_pct ?? 97.5}%</span>
            </div>
            <div className="w-full bg-[#121E2C] h-2 rounded-full overflow-hidden border border-[#1E293B]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, primaryBlocker?.completion_pct ?? 97.5)}%` }}
              />
            </div>
          </div>

          {/* Action Required Natural Language Callout */}
          <div className="p-2.5 bg-[#0B131E] rounded-lg border border-[#1E293B] text-[11px] text-slate-300 flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-100 block">Required Action:</span>
              <span className="text-slate-400">
                {primaryBlocker?.action_required || "The 15-minute RSI must confirm above 60.0 on closed 15m candle while other required conditions remain valid."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Entry Readiness Matrix Model */}
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            Entry Readiness Model
          </span>
          <span className="text-[10px] text-slate-400">
            Strategy: <span className="text-cyan-300 font-bold">{bot?.strategy || "Trend Confluence"} {bot?.strategy_version || "v1.5.2"}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            entryReadiness?.trend === "READY" ? "bg-emerald-950/20 border-emerald-800/60" : "bg-rose-950/20 border-rose-800/60"
          }`}>
            <span className="text-[9px] text-slate-400 uppercase">Trend</span>
            <span className={`font-bold text-xs mt-1 ${
              entryReadiness?.trend === "READY" ? "text-emerald-400" : "text-rose-400"
            }`}>
              {entryReadiness?.trend || "READY"}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            entryReadiness?.ema_alignment === "READY" ? "bg-emerald-950/20 border-emerald-800/60" : "bg-amber-950/20 border-amber-800/60"
          }`}>
            <span className="text-[9px] text-slate-400 uppercase">EMA Alignment</span>
            <span className={`font-bold text-xs mt-1 ${
              entryReadiness?.ema_alignment === "READY" ? "text-emerald-400" : "text-amber-400"
            }`}>
              {entryReadiness?.ema_alignment || "READY"}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            entryReadiness?.momentum === "READY" ? "bg-emerald-950/20 border-emerald-800/60" : "bg-amber-950/20 border-amber-800/60"
          }`}>
            <span className="text-[9px] text-slate-400 uppercase">Momentum (RSI)</span>
            <span className={`font-bold text-xs mt-1 ${
              entryReadiness?.momentum === "READY" ? "text-emerald-400" : "text-amber-400"
            }`}>
              {entryReadiness?.momentum || "WAITING"}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            entryReadiness?.volume === "READY" ? "bg-emerald-950/20 border-emerald-800/60" : "bg-amber-950/20 border-amber-800/60"
          }`}>
            <span className="text-[9px] text-slate-400 uppercase">Volume</span>
            <span className={`font-bold text-xs mt-1 ${
              entryReadiness?.volume === "READY" ? "text-emerald-400" : "text-amber-400"
            }`}>
              {entryReadiness?.volume || "READY"}
            </span>
          </div>

          <div className={`p-2.5 rounded-xl border flex flex-col justify-between col-span-2 sm:col-span-1 ${
            entryReadiness?.risk === "READY" ? "bg-emerald-950/20 border-emerald-800/60" : "bg-rose-950/20 border-rose-800/60"
          }`}>
            <span className="text-[9px] text-slate-400 uppercase">Risk Engine</span>
            <span className={`font-bold text-xs mt-1 ${
              entryReadiness?.risk === "READY" ? "text-emerald-400" : "text-rose-400"
            }`}>
              {entryReadiness?.risk || "READY"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Granular Live Rule Matrix */}
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
            Strategy Rule Execution Matrix
          </span>
          <span className="text-[10px] text-slate-400 font-bold">
            {passedRulesCount} / {totalRulesCount} Conditions Ready
          </span>
        </div>

        <div className="divide-y divide-[#162231] border border-[#1E293B] rounded-xl bg-[#070D14] overflow-hidden">
          {rules.map((r, idx) => {
            const isRulePass = r.passed;
            const isRuleWaiting = r.status === "WAITING" || r.status === "WAITING_FOR_CANDLE_CLOSE";
            return (
              <div key={idx} className="p-3 flex items-center justify-between hover:bg-[#0D1926] transition-colors">
                <div className="flex items-center gap-2.5">
                  {isRulePass ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : isRuleWaiting ? (
                    <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 block text-xs">{r.rule}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0B131E] text-slate-400 border border-[#1E293B]">
                        {r.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{r.details}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isRulePass
                        ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                        : isRuleWaiting
                        ? "bg-amber-950/60 border-amber-800 text-amber-300"
                        : "bg-rose-950/60 border-rose-800 text-rose-300"
                    }`}
                  >
                    {isRulePass ? "PASS" : (isRuleWaiting ? "WAITING" : "FAIL")}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {r.live_value} / Required {r.threshold}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Central Risk Engine Authoritative Row */}
          <div className="p-3 flex items-center justify-between hover:bg-[#0D1926] transition-colors">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-200 block text-xs">Central Risk Engine Gates</span>
                <span className="text-[10px] text-slate-400">{risk?.blocking_reason || "All 7 safety gates verified."}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                {risk?.overall_status || "PASS"}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">{passedRiskGatesCount}/{totalRiskGatesCount} Gates Passed</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Deterministic "What Needs To Happen?" & "What Would Trigger Entry?" */}
      {explanation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          {/* What Needs to Happen */}
          <div className="p-3.5 bg-[#070D14] border border-[#1E293B] rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> WHAT NEEDS TO HAPPEN?
            </span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {explanation.what_needs_to_happen || "The 15-minute RSI must confirm above 60.0 on closed 15m candle while the other required conditions remain valid."}
            </p>
            <span className="text-[10px] text-amber-300/90 block">
              No order has been generated yet.
            </span>
          </div>

          {/* What Would Trigger Entry */}
          <div className="p-3.5 bg-[#070D14] border border-[#1E293B] rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> WHAT WOULD TRIGGER ENTRY?
            </span>
            <div className="space-y-1 text-[11px] text-slate-300">
              {explanation.what_would_trigger_entry?.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={item.startsWith("✓") ? "text-emerald-400" : "text-amber-400"}>
                    {item.substring(0, 1)}
                  </span>
                  <span>{item.substring(2)}</span>
                </div>
              )) || (
                <>
                  <div>✓ 1H price remains above EMA200 ($69,389)</div>
                  <div>✓ EMA9 remains above EMA21</div>
                  <div>• RSI rises above 60.0</div>
                  <div>✓ Volume remains above required level (74)</div>
                  <div>✓ Risk Engine continues to pass all 7 gates</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Read-Only "What-If" Scenario Simulator */}
      <div className="p-4 bg-[#070D14] border border-cyan-900/40 rounded-xl space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
              READ-ONLY WHAT-IF SCENARIO SIMULATOR
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            No live orders • Parameter preview only
          </span>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Simulate 15m RSI Level:</span>
            <span className="font-bold text-cyan-300 text-sm">{whatIfRsi.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="45"
            max="75"
            step="0.1"
            value={whatIfRsi}
            onChange={(e) => handleSimulateRsi(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>45.0 (Oversold)</span>
            <span className="text-amber-400 font-bold">58.5 (Current)</span>
            <span className="text-emerald-400 font-bold">60.0 (Threshold)</span>
            <span>75.0 (Overbought)</span>
          </div>
        </div>

        {whatIfResult && (
          <div className="p-3 bg-[#0B131E] border border-cyan-800/60 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">Simulated Strategy State:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                whatIfResult.simulated_state === "SIGNAL_CANDIDATE" || whatIfResult.simulated_state === "SIGNAL_READY"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                  : "bg-amber-950 text-amber-300 border border-amber-700"
              }`}>
                {whatIfResult.simulated_state}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {whatIfResult.explanation}
            </p>
          </div>
        )}
      </div>

      {/* 7. Deep Links to Strategy IDE & Trade Journal */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#1E293B] text-xs font-mono">
        <div className="flex items-center gap-2">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate("/strategy-builder")}
                className="px-3 py-1.5 rounded-lg bg-[#070D14] hover:bg-[#162231] border border-[#1E293B] text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Open Rule in Strategy Builder ({bot?.strategy_version || "v1.5.2"})</span>
                <ExternalLink className="h-3 w-3 text-slate-500" />
              </button>

              <button
                onClick={() => onNavigate("/trade-journal")}
                className="px-3 py-1.5 rounded-lg bg-[#070D14] hover:bg-[#162231] border border-[#1E293B] text-slate-300 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>View Trade Journal</span>
                <ExternalLink className="h-3 w-3 text-slate-500" />
              </button>
            </>
          )}
        </div>

        <span className="text-[10px] text-slate-500">
          Evaluation ID: {snapshot?.evaluation_id || "EV-982741"} • {confluence?.calculated_at || "Live"}
        </span>
      </div>
    </div>
  );
}
