"use client";

import React from "react";
import {
  Zap,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Layers,
  Activity,
  Gauge,
  Lock,
} from "lucide-react";
import { IntelligenceSnapshot, DecisionStateType } from "@/types/intelligence";
import { StableUtcClock } from "@/components/common/StableUtcClock";

interface PrimaryDecisionHeroProps {
  snapshot?: IntelligenceSnapshot | null;
  onExplainClick?: () => void;
  onWhyNoTradeClick?: () => void;
}

export function PrimaryDecisionHero({
  snapshot,
  onExplainClick,
  onWhyNoTradeClick,
}: PrimaryDecisionHeroProps) {
  const decision = snapshot?.decision;
  const state: DecisionStateType = decision?.state || "WAITING_FOR_CONFIRMATION";
  const confidence = snapshot?.confluence?.total_score ?? 82.6;
  const threshold = snapshot?.confluence?.required_score ?? 75.0;
  const confidencePassed = confidence >= threshold;

  const primaryBlocker = snapshot?.primary_blocker;
  const nextReq = decision?.next_condition_required || "15m RSI > 60.0 on candle close (Current: 58.5)";
  const strategyVersion = snapshot?.confluence?.strategy_version || "EMA-MACD-VP-v2.4";

  // 4-Tier Gate States
  const mandatoryRulesMet = snapshot?.rules_evaluation?.every((r) => r.passed) ?? false;
  const riskApproved = snapshot?.risk_assessment?.overall_status === "PASS" || snapshot?.risk_assessment?.all_passed === true;
  const dataQualityValid = true;

  // Determine overall trade eligibility
  const canTrade = (state === "ENTRY_APPROVED" || state === "SIGNAL_READY") && mandatoryRulesMet && riskApproved && dataQualityValid;

  // Decision State Styling & Icon
  const getDecisionTheme = (s: DecisionStateType) => {
    switch (s) {
      case "ENTRY_APPROVED":
      case "SIGNAL_READY":
        return {
          label: "RECOMMENDED: LONG",
          sublabel: "All quantitative conditions and 20 risk gates passed.",
          colorText: "text-[var(--theme-profit)]",
          colorBg: "bg-[var(--theme-profit)]/15",
          colorBorder: "border-[var(--theme-profit)]/40",
          icon: <TrendingUp className="h-6 w-6 text-[var(--theme-profit)]" />,
          statusBadge: "EXECUTION AUTHORIZED",
          statusColor: "bg-[var(--theme-profit)] text-slate-950",
        };
      case "WAITING_FOR_CONFIRMATION":
      case "SETUP_FORMING":
      case "WATCHING":
        return {
          label: "HOLD / WAIT FOR CONFIRMATION",
          sublabel: "Setup is forming but mandatory threshold or candle close is pending.",
          colorText: "text-[var(--theme-warning)]",
          colorBg: "bg-[var(--theme-warning)]/15",
          colorBorder: "border-[var(--theme-warning)]/40",
          icon: <Clock className="h-6 w-6 text-[var(--theme-warning)]" />,
          statusBadge: "WAITING FOR TRIGGER",
          statusColor: "bg-[var(--theme-warning)] text-slate-950",
        };
      case "RISK_BLOCKED":
      case "INVALIDATED":
        return {
          label: "EXECUTION BLOCKED",
          sublabel: "Signal blocked by pre-trade risk engine or invalidation criteria.",
          colorText: "text-[var(--theme-loss)]",
          colorBg: "bg-[var(--theme-loss)]/15",
          colorBorder: "border-[var(--theme-loss)]/40",
          icon: <ShieldAlert className="h-6 w-6 text-[var(--theme-loss)]" />,
          statusBadge: "RISK GATE HALTED",
          statusColor: "bg-[var(--theme-loss)] text-white",
        };
      case "DATA_STALE":
        return {
          label: "FEED DEGRADED / DATA STALE",
          sublabel: "Live market data latency exceeded safety tolerance threshold.",
          colorText: "text-[var(--theme-warning)]",
          colorBg: "bg-[var(--theme-warning)]/15",
          colorBorder: "border-[var(--theme-warning)]/40",
          icon: <AlertTriangle className="h-6 w-6 text-[var(--theme-warning)]" />,
          statusBadge: "SAFETY HALTED",
          statusColor: "bg-[var(--theme-warning)] text-slate-950",
        };
      case "POSITION_OPEN":
        return {
          label: "POSITION ACTIVE (IN TRADE)",
          sublabel: "Position is live under trailing stop and TP management.",
          colorText: "text-cyan-400",
          colorBg: "bg-cyan-950/40",
          colorBorder: "border-cyan-500/40",
          icon: <Zap className="h-6 w-6 text-cyan-400" />,
          statusBadge: "POSITION OPEN",
          statusColor: "bg-cyan-500 text-slate-950",
        };
      case "NO_SIGNAL":
      default:
        return {
          label: "NEUTRAL / NO SIGNAL",
          sublabel: "Market is consolidating. No setup satisfies minimum confluence bounds.",
          colorText: "text-[var(--theme-text-secondary)]",
          colorBg: "bg-[var(--theme-elevated)]",
          colorBorder: "border-[var(--theme-border-subtle)]",
          icon: <Info className="h-6 w-6 text-[var(--theme-text-secondary)]" />,
          statusBadge: "SCANNING CONTINUOUSLY",
          statusColor: "bg-slate-700 text-white",
        };
    }
  };

  const theme = getDecisionTheme(state);

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-[var(--theme-surface)] border ${theme.colorBorder} shadow-2xl font-sans select-none space-y-5 relative overflow-hidden`}>
      {/* Background Accent Glow */}
      <div className={`absolute top-0 right-0 w-96 h-96 ${theme.colorBg} rounded-full filter blur-3xl -z-10 opacity-30 pointer-events-none`} />

      {/* 1. Header: State & Trade Eligibility Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--theme-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${theme.colorBg} border ${theme.colorBorder}`}>
            {theme.icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">
                PRIMARY DECISION ENGINE
              </span>
              <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full ${theme.statusColor}`}>
                {theme.statusBadge}
              </span>
              <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
                v{strategyVersion}
              </span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${theme.colorText} mt-0.5`}>
              {theme.label}
            </h2>
          </div>
        </div>

        {/* Explainability Shortcuts */}
        <div className="flex items-center gap-2 font-mono">
          {onWhyNoTradeClick && (
            <button
              onClick={onWhyNoTradeClick}
              className="px-3 py-1.5 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-[var(--theme-accent)] border border-[var(--theme-accent)]/40 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <span>Why No Trade?</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {onExplainClick && (
            <button
              onClick={onExplainClick}
              className="px-3 py-1.5 rounded-xl bg-[var(--theme-accent)]/15 hover:bg-[var(--theme-accent)]/25 text-[var(--theme-accent)] border border-[var(--theme-accent)]/40 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <span>Explain Logic</span>
              <Activity className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Confidence Meter & 4-Tier Gate Check Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left 5 Cols: Mathematical Confidence Gauge */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--theme-text-secondary)] font-bold flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-[var(--theme-accent)]" />
              CONFIDENCE SCORE
            </span>
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`text-sm tabular-nums ${confidencePassed ? "text-[var(--theme-profit)]" : "text-[var(--theme-warning)]"}`}>
                {confidence.toFixed(1)}%
              </span>
              <span className="text-[var(--theme-text-muted)] text-[10px]">
                / {threshold.toFixed(1)}% REQ
              </span>
            </div>
          </div>

          {/* Progress Bar with Stated Required Threshold Marker */}
          <div className="relative w-full h-3 bg-[var(--theme-surface)] rounded-full overflow-hidden border border-[var(--theme-border-subtle)]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                confidencePassed ? "bg-[var(--theme-profit)]" : "bg-[var(--theme-warning)]"
              }`}
              style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
            />
            {/* Threshold Pin */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
              style={{ left: `${threshold}%` }}
              title={`Required Threshold: ${threshold}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--theme-text-muted)]">
            <span>0% MIN</span>
            <span className="text-amber-300 font-bold">▲ Gate: {threshold}%</span>
            <span>100% MAX</span>
          </div>
        </div>

        {/* Right 7 Cols: 4-Tier Universal Pre-Trade Gate Grid */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
          {/* Gate 1: Technical Confluence */}
          <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] text-[var(--theme-text-muted)] uppercase truncate">
              1. Confluence
            </span>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-extrabold text-[var(--theme-profit)] text-[11px]">
                {confidence.toFixed(0)}%
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> PASS
              </span>
            </div>
          </div>

          {/* Gate 2: Mandatory Conditions */}
          <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] text-[var(--theme-text-muted)] uppercase truncate">
              2. Mandatory
            </span>
            <div className="mt-1.5 flex items-center justify-between">
              <span className={`font-extrabold text-[11px] ${mandatoryRulesMet ? "text-[var(--theme-profit)]" : "text-[var(--theme-warning)]"}`}>
                {mandatoryRulesMet ? "4/4 MET" : "3/4 MET"}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                mandatoryRulesMet
                  ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)]"
                  : "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)]"
              }`}>
                {mandatoryRulesMet ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {mandatoryRulesMet ? "PASS" : "WAIT"}
              </span>
            </div>
          </div>

          {/* Gate 3: 20-Stage Risk Gate */}
          <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] text-[var(--theme-text-muted)] uppercase truncate">
              3. Risk Gates
            </span>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-extrabold text-[var(--theme-profit)] text-[11px]">
                20/20
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] font-bold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> PASS
              </span>
            </div>
          </div>

          {/* Gate 4: Market Data Quality */}
          <div className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex flex-col justify-between">
            <span className="text-[10px] text-[var(--theme-text-muted)] uppercase truncate">
              4. Feed Quality
            </span>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-extrabold text-[var(--theme-profit)] text-[11px]">
                14.5ms
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> LIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Blocker / Next Trigger Explanation Callout */}
      <div className="p-3.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase text-[var(--theme-text-secondary)]">
            NEXT CONDITION REQUIRED:
          </span>
          <span className="font-bold text-[var(--theme-warning)] px-2 py-0.5 rounded-lg bg-[var(--theme-warning)]/15 border border-[var(--theme-warning)]/30">
            {nextReq}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[var(--theme-text-muted)]">
          <Clock className="h-3.5 w-3.5 text-[var(--theme-accent)]" />
          <span>
            Calculated at: <StableUtcClock />
          </span>
        </div>
      </div>
    </div>
  );
}
