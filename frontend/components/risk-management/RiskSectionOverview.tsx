"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Scale,
  DollarSign,
  Layers,
  HelpCircle,
} from "lucide-react";
import { CanonicalRiskSnapshot, RiskGateResult } from "@/types/risk";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";

interface RiskSectionOverviewProps {
  snapshot: CanonicalRiskSnapshot;
  onOpenEmergencyModal: () => void;
  onNavigateTab: (tabId: "overview" | "capital_exposure" | "limits" | "advanced") => void;
}

export function RiskSectionOverview({
  snapshot,
  onOpenEmergencyModal,
  onNavigateTab,
}: RiskSectionOverviewProps) {
  const router = useRouter();
  const { permission, capital, exposure, margin, dailyRisk, tradeRisk, concentration } = snapshot;

  const [isGatesExpanded, setIsGatesExpanded] = useState(false);

  const canTrade = permission.canTrade;
  const isBlocked = permission.status === "BLOCKED";
  const isHalted = permission.status === "EMERGENCY_HALT";
  const isCaution = permission.status === "CAUTION";
  const isReady = permission.status === "READY";

  // Max New Order Calculation
  const maxOrderSize = canTrade
    ? Math.min(capital.availableCash * 3, capital.accountEquity * exposure.maxAllowedLeverage - exposure.grossExposure)
    : 0.0;

  // Handle Blocker Action Routing
  const handleFixAction = (gate?: RiskGateResult) => {
    const action = gate?.suggestedAction;
    if (!action) return;

    switch (action.actionType) {
      case "NAVIGATE_PNL":
        router.push("/pnl");
        break;
      case "NAVIGATE_POSITIONS":
        router.push("/positions");
        break;
      case "NAVIGATE_LIMITS":
        onNavigateTab("limits");
        break;
      case "DISENGAGE_HALT":
        onOpenEmergencyModal();
        break;
      case "RECONNECT":
        router.push("/system-health");
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-5 font-sans select-none">
      {/* 1. PRIMARY BLOCKER / ACTIVE REASON HERO */}
      {!isReady && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isHalted
              ? "bg-red-950/50 border-red-800/80 text-red-300"
              : isBlocked
              ? "bg-[var(--theme-loss)]/10 border-[var(--theme-loss)]/30 text-[var(--theme-loss)]"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-black/20 shrink-0 mt-0.5 sm:mt-0">
              {isHalted ? (
                <AlertOctagon className="h-6 w-6 text-red-400" />
              ) : isBlocked ? (
                <ShieldAlert className="h-6 w-6 text-[var(--theme-loss)]" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-black/30 border border-white/10">
                  {isHalted ? "EMERGENCY HALT" : isBlocked ? "PRIMARY BLOCKER" : "CAUTIONARY WARNING"}
                </span>
                <span className="text-sm font-bold text-[var(--theme-text-primary)]">
                  {permission.primaryBlocker?.name || (isHalted ? "Kill Switch Active" : "Risk Threshold Exceeded")}
                </span>
              </div>

              <div className="mt-1 text-xs text-[var(--theme-text-secondary)] font-mono">
                Current: <span className="font-bold text-[var(--theme-text-primary)]">{permission.primaryBlocker?.currentValue || "Triggered"}</span> • Limit: <span className="font-bold text-[var(--theme-text-primary)]">{permission.primaryBlocker?.limitValue || "0"}</span>
              </div>

              <p className="mt-1 text-xs font-sans text-[var(--theme-text-primary)] opacity-95">
                {permission.primaryReason}
              </p>
            </div>
          </div>

          {/* Contextual Fix Issue Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
            {permission.primaryBlocker?.suggestedAction && (
              <button
                onClick={() => handleFixAction(permission.primaryBlocker)}
                className="px-3.5 py-2 rounded-xl bg-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/90 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-[var(--theme-accent)]/20 cursor-pointer"
              >
                <span>{permission.primaryBlocker.suggestedAction.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {isBlocked && (
              <button
                onClick={() => onNavigateTab("limits")}
                className="px-3 py-2 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-xs font-mono font-bold text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition"
              >
                <span>Review Limits</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. CORE DECISION SUMMARY GRID (2 Columns: Quick Status + 14 Safety Gates) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card A: 4-Item Quick Status Card */}
        <div className="p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--theme-accent)]" />
              <h3 className="text-sm font-bold tracking-tight text-[var(--theme-text-primary)]">
                Authoritative Trading Status
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">
              Evaluation: <HydratedTimestamp timestamp={permission.evaluatedAt} />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            {/* Field 1: Can I Trade? */}
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              canTrade
                ? "bg-[var(--theme-profit)]/10 border-[var(--theme-profit)]/30 text-[var(--theme-profit)]"
                : "bg-[var(--theme-loss)]/10 border-[var(--theme-loss)]/30 text-[var(--theme-loss)]"
            }`}>
              <span className="text-[10px] uppercase font-bold text-[var(--theme-text-muted)] block">Can I Trade?</span>
              <div className="text-lg font-bold flex items-center gap-1.5">
                <span>{canTrade ? "YES" : "NO"}</span>
                {canTrade ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              </div>
              <span className="text-[10px] opacity-80 block truncate">
                {canTrade ? "Gates Open" : isHalted ? "Halted" : "Blocked"}
              </span>
            </div>

            {/* Field 2: Max Order Size */}
            <div className="p-3.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--theme-text-muted)] block">Max New Order</span>
              <div className="text-lg font-bold text-[var(--theme-text-primary)]">
                ${maxOrderSize > 0 ? maxOrderSize.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
              </div>
              <span className="text-[10px] text-[var(--theme-text-muted)] block truncate">
                {canTrade ? "Based on Collateral" : "Orders Restricted"}
              </span>
            </div>

            {/* Field 3: Risk / Trade */}
            <div className="p-3.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--theme-text-muted)] block">Risk / Trade</span>
              <div className="text-lg font-bold text-[var(--theme-profit)]">
                {tradeRisk.maxRiskPerTradePct.toFixed(1)}%
              </div>
              <span className="text-[10px] text-[var(--theme-text-muted)] block truncate">
                ${tradeRisk.maxRiskAmount.toFixed(0)} Max Budget
              </span>
            </div>

            {/* Field 4: Last Blocker / Active Gate */}
            <div className="p-3.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--theme-text-muted)] block">Active Block</span>
              <div className="text-sm font-bold text-[var(--theme-text-primary)] truncate pt-0.5">
                {permission.primaryBlocker?.name || "None (Clear)"}
              </div>
              <span className={`text-[10px] font-bold block truncate ${
                isReady ? "text-[var(--theme-profit)]" : isCaution ? "text-amber-400" : "text-[var(--theme-loss)]"
              }`}>
                {permission.passedCount} / {permission.totalCount} Gates Pass
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-[var(--theme-text-secondary)] border-t border-[var(--theme-border-subtle)]">
            <span>Deterministic engine enforcement</span>
            <button
              onClick={() => onNavigateTab("limits")}
              className="text-xs font-bold text-[var(--theme-accent)] hover:underline flex items-center gap-0.5"
            >
              <span>View All Limits</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Card B: 14 Institutional Safety Gates Summary */}
        <div className="p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-[var(--theme-profit)]" />
              <h3 className="text-sm font-bold tracking-tight text-[var(--theme-text-primary)]">
                Institutional Safety Gates
              </h3>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
              permission.passedCount === permission.totalCount
                ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)] border-[var(--theme-profit)]/30"
                : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border-[var(--theme-loss)]/30"
            }`}>
              {permission.passedCount} / {permission.totalCount} PASS
            </span>
          </div>

          {/* Compact 4 Top Gates Preview */}
          <div className="space-y-2 font-mono text-xs">
            {permission.allGates.slice(0, 4).map((gate) => {
              const isPass = gate.status === "PASS";
              const isWarn = gate.status === "WARN";
              return (
                <div
                  key={gate.id}
                  className="p-2.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    {isPass ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--theme-profit)] shrink-0" />
                    ) : isWarn ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[var(--theme-loss)] shrink-0" />
                    )}
                    <span className="font-medium text-[var(--theme-text-primary)]">{gate.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-[11px] text-[var(--theme-text-secondary)]">{gate.currentValue}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      isPass
                        ? "bg-[var(--theme-profit)]/15 text-[var(--theme-profit)]"
                        : isWarn
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-[var(--theme-loss)]/15 text-[var(--theme-loss)]"
                    }`}>
                      {gate.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs border-t border-[var(--theme-border-subtle)]">
            <span className="text-[var(--theme-text-muted)] font-mono">14 Pre-Order Gate Pipeline</span>
            <button
              onClick={() => setIsGatesExpanded(!isGatesExpanded)}
              className="text-xs font-bold text-[var(--theme-accent)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isGatesExpanded ? "Hide Detailed Gates" : `View All ${permission.totalCount} Gates`}</span>
              {isGatesExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. EXPANDABLE 14 SAFETY GATES ACCORDION */}
      {isGatesExpanded && (
        <div className="p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[var(--theme-border-subtle)] pb-2.5">
            <h4 className="text-xs font-bold font-mono text-[var(--theme-text-primary)] uppercase tracking-wider">
              Complete 14-Point Pre-Trade Risk Pipeline Verification
            </h4>
            <span className="text-xs text-[var(--theme-text-muted)] font-mono">
              Auto-monitored pre-trade & post-execution
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
            {permission.allGates.map((gate, idx) => {
              const isPass = gate.status === "PASS";
              const isWarn = gate.status === "WARN";
              return (
                <div
                  key={gate.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    isPass
                      ? "bg-[var(--theme-elevated)] border-[var(--theme-border-subtle)]"
                      : isWarn
                      ? "bg-amber-950/20 border-amber-800/40 text-amber-200"
                      : "bg-[var(--theme-loss)]/10 border-[var(--theme-loss)]/30 text-[var(--theme-loss)]"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-[10px] text-[var(--theme-text-muted)] font-bold mt-0.5">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-[var(--theme-text-primary)]">{gate.name}</div>
                      <div className="text-[10px] text-[var(--theme-text-muted)] font-sans mt-0.5">{gate.description}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-[var(--theme-text-primary)]">{gate.currentValue}</div>
                    <span className="text-[10px] text-[var(--theme-text-muted)] block">Cap: {gate.limitValue}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. HIGHEST RISK POSITION & EXPOSURE CARD */}
      <div className="p-4 rounded-2xl bg-[var(--theme-elevated)] border border-[var(--theme-border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-accent)]">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold">Highest Risk Position</div>
            <div className="font-bold text-[var(--theme-text-primary)] text-sm">
              {concentration.topAsset} • {concentration.topAssetPct.toFixed(1)}% Portfolio Concentration
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/positions")}
          className="px-3 py-1.5 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border)] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
        >
          <span>View All Positions</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
