"use client";

import React from "react";
import { 
  ShieldAlert, 
  Radio, 
  Send, 
  Sliders, 
  CheckCheck, 
  RefreshCw, 
  BellRing,
  Sparkles,
  Zap
} from "lucide-react";
import { IncidentMetricsSummary } from "@/types/alerts";

interface AlertsCenterHeaderProps {
  metrics?: IncidentMetricsSummary;
  isStreaming: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onOpenTestModal: () => void;
  onTestTelegram: () => void;
  onOpenRulesModal: () => void;
  onAcknowledgeVisible: () => void;
  isAcknowledging: boolean;
  isTestingTelegram: boolean;
}

export function AlertsCenterHeader({
  metrics,
  isStreaming,
  isFetching,
  onRefresh,
  onOpenTestModal,
  onTestTelegram,
  onOpenRulesModal,
  onAcknowledgeVisible,
  isAcknowledging,
  isTestingTelegram
}: AlertsCenterHeaderProps) {
  const unackCount = metrics?.unacknowledged || 0;
  const criticalCount = metrics?.critical || 0;

  return (
    <header className="relative bg-[#0F172A]/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-2xl overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 right-0 w-96 h-32 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent pointer-events-none rounded-full blur-2xl" />
      {criticalCount > 0 && (
        <div className="absolute top-0 left-0 w-80 h-32 bg-rose-500/10 pointer-events-none rounded-full blur-2xl animate-pulse" />
      )}

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Branding & Status Pills */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-inner">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              ALERTS & INCIDENT CENTER
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-semibold tracking-wider">
                V3.0 Enterprise
              </span>
            </h1>

            {/* Live SSE Stream Pulse */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStreaming ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isStreaming ? "bg-emerald-500" : "bg-amber-500"}`} />
              </span>
              <span className={isStreaming ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
                {isStreaming ? "LIVE SSE" : "POLLING (5s)"}
              </span>
            </div>

            {/* Unacknowledged Badge */}
            {unackCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/70 border border-rose-500/50 text-rose-300 text-[11px] font-mono font-bold animate-pulse">
                <BellRing className="w-3 h-3 text-rose-400" />
                {unackCount} UNACKNOWLEDGED
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 flex items-center gap-2">
            <span>Institutional Real-Time Alerting, Incident Correlation, Risk Guardrails & Subsystem Observability</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-500 font-mono text-[11px]">Zero Data Loss Policy</span>
          </p>
        </div>

        {/* Right: Operational Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
          {/* Rules Modal */}
          <button
            onClick={onOpenRulesModal}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
            title="Configure Alert Rules & Thresholds"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Alert Rules
          </button>

          {/* Test Alert Modal */}
          <button
            onClick={onOpenTestModal}
            className="px-3 py-2 bg-indigo-950/50 hover:bg-indigo-900/60 active:scale-95 border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm"
            title="Dispatch a controlled test alert to verify pipeline"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Test Alert
          </button>

          {/* Test Telegram */}
          <button
            onClick={onTestTelegram}
            disabled={isTestingTelegram}
            className="px-3 py-2 bg-sky-950/50 hover:bg-sky-900/60 active:scale-95 border border-sky-500/40 text-sky-200 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Send test message to configured Telegram Channel"
          >
            <Send className={`w-3.5 h-3.5 text-sky-400 ${isTestingTelegram ? "animate-spin" : ""}`} />
            {isTestingTelegram ? "Testing..." : "Test Telegram"}
          </button>

          {/* Acknowledge Visible / Clear All Equivalent */}
          <button
            onClick={onAcknowledgeVisible}
            disabled={isAcknowledging || unackCount === 0}
            className="px-3 py-2 bg-slate-800/90 hover:bg-emerald-950/60 hover:text-emerald-300 hover:border-emerald-500/40 active:scale-95 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            title="Mark visible unacknowledged incidents as seen without deleting records"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            {isAcknowledging ? "Acknowledging..." : "Ack Visible"}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="p-2 bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 border border-slate-700 text-slate-300 rounded-xl transition-all duration-150 flex items-center justify-center shadow-sm disabled:opacity-50"
            title="Refresh Incidents & KPIs"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
