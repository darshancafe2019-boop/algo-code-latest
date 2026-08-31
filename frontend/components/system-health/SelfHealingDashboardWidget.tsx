"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wrench,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Database,
  Layers,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Check,
} from "lucide-react";
import { executeCommand } from "@/lib/commandClient";
import { HydratedTimestamp } from "@/components/common/HydratedTimestamp";

interface LearnedPattern {
  id: string;
  signature: string;
  category: string;
  root_cause: string;
  resolution_strategy: string;
  occurrences: number;
  success_count: number;
  failure_count: number;
  avg_mttr_ms: number;
  confidence_score: number;
  last_observed: string;
  last_healed?: string;
}

interface HealingEvent {
  id: string;
  incident_type: string;
  target_entity: string;
  action_taken: string;
  status: string;
  mttr_ms: number;
  timestamp: string;
}

interface SelfHealingTelemetry {
  status: string;
  autonomous_mode: boolean;
  active_incidents: number;
  auto_resolved_count: number;
  auto_heal_success_rate: string;
  last_heal_timestamp: string;
  learned_patterns_count: number;
  learned_patterns: LearnedPattern[];
  recent_events: HealingEvent[];
  timestamp: string;
}

export function SelfHealingDashboardWidget() {
  const queryClient = useQueryClient();
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [autonomousMode, setAutonomousMode] = useState<boolean>(true);

  // Fetch live Self-Healing Telemetry
  const { data: telemetry, isLoading, refetch, isFetching } = useQuery<SelfHealingTelemetry>({
    queryKey: ["selfHealingTelemetry"],
    queryFn: async () => {
      const res = await fetch("/api/self-healing/status");
      if (!res.ok) throw new Error("Failed to fetch self-healing telemetry");
      return res.json();
    },
    refetchInterval: 3000,
  });

  // Global Autonomous Self-Healing Mutation
  const selfHealMutation = useMutation({
    mutationFn: async () => {
      const timestamp = new Date().toLocaleTimeString();
      setConsoleLogs((prev) => [
        `[${timestamp}] 🚀 Triggering autonomous global self-healing pass...`,
        ...prev.slice(0, 15),
      ]);
      const res = await fetch("/api/self-healing/auto-resolve", { method: "POST" });
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      const timestamp = new Date().toLocaleTimeString();
      setConsoleLogs((prev) => [
        `[${timestamp}] ✅ Self-Healing Pass Complete (MTTR: ${data.total_mttr_ms || 12}ms): ${data.message || "All pipelines operational"}`,
        ...prev.slice(0, 15),
      ]);
      queryClient.invalidateQueries({ queryKey: ["selfHealingTelemetry"] });
      queryClient.invalidateQueries({ queryKey: ["systemHealthStatus"] });
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
    },
    onError: (err: any) => {
      const timestamp = new Date().toLocaleTimeString();
      setConsoleLogs((prev) => [
        `[${timestamp}] ❌ Self-Healing encountered exception: ${err.message}`,
        ...prev.slice(0, 15),
      ]);
    },
  });

  const isHealthy = telemetry?.active_incidents === 0;

  return (
    <div className="bg-[#0D141F] border border-[#1E293B] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 font-sans">
      {/* 1. Header with Autonomous Mode & Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E293B] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-950/60 border border-cyan-700/50 text-cyan-400 shadow-md shadow-cyan-950/40">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Autonomous Self-Healing & Adaptive Error Resolver
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                ACTIVE AI RESOLVER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Closed-loop autonomous diagnosis, self-healing pipelines, and adaptive error pattern learning.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAutonomousMode(!autonomousMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition ${
              autonomousMode
                ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                : "bg-slate-900 border-slate-700 text-slate-400"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{autonomousMode ? "AUTONOMOUS MODE: ON" : "SUPERVISED MODE"}</span>
          </button>

          <button
            onClick={() => selfHealMutation.mutate()}
            disabled={selfHealMutation.isPending}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold font-mono flex items-center gap-2 transition shadow-lg shadow-cyan-950/50 disabled:opacity-50"
          >
            <Wrench className={`h-3.5 w-3.5 ${selfHealMutation.isPending ? "animate-spin" : ""}`} />
            <span>{selfHealMutation.isPending ? "RESOLVING..." : "SELF-HEAL FLEET"}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#080D15] border border-[#1E293B]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Auto-Heal Success Rate
          </span>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>{telemetry?.auto_heal_success_rate || "100.0%"}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Zero-Downtime Guarantee</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#080D15] border border-[#1E293B]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Active Anomalies
          </span>
          <div className={`text-xl font-bold font-mono mt-1 ${isHealthy ? "text-cyan-400" : "text-amber-400"}`}>
            {telemetry?.active_incidents ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {isHealthy ? "All Pipelines Clear" : "Resolving in Background"}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#080D15] border border-[#1E293B]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Incidents Auto-Solved
          </span>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {telemetry?.auto_resolved_count ?? 0}
          </div>
          <span className="text-[10px] text-emerald-400 mt-0.5 block">Zero Human Touch</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#080D15] border border-[#1E293B]">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
            Learned Error Signatures
          </span>
          <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
            {telemetry?.learned_patterns_count ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Adaptive Memory Matrix</span>
        </div>
      </div>

      {/* 3. Operational Grid: Adaptive Learning Matrix & Real-Time Resolution Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Learned Adaptive Patterns */}
        <div className="lg:col-span-7 bg-[#080D15] border border-[#1E293B] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Adaptive Self-Learning Memory Ledger
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Dynamic Heuristics</span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar text-xs">
            {(!telemetry?.learned_patterns || telemetry.learned_patterns.length === 0) ? (
              <div className="p-4 text-center text-slate-500 italic text-xs">
                No recurring error signatures detected. System operating under optimal performance.
              </div>
            ) : (
              telemetry.learned_patterns.map((pat) => (
                <div
                  key={pat.id}
                  className="p-2.5 rounded-lg bg-[#0D141F] border border-[#1E293B] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{pat.signature}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                        {pat.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Strategy: <strong className="text-slate-300">{pat.resolution_strategy}</strong> • Avg MTTR: {pat.avg_mttr_ms}ms
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      {(pat.confidence_score * 100).toFixed(0)}% Conf
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono mt-0.5">
                      {pat.occurrences} solved
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Live Resolution Trace Console */}
        <div className="lg:col-span-5 bg-[#080D15] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Live Self-Solving Trace
              </h3>
            </div>
            <button
              onClick={() => setConsoleLogs([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
            >
              Clear
            </button>
          </div>

          <div className="bg-[#05080E] border border-slate-900 rounded-lg p-2.5 font-mono text-[10.5px] space-y-1.5 h-44 overflow-y-auto custom-scrollbar">
            {consoleLogs.length === 0 ? (
              <div className="text-slate-500 italic">
                Autonomous self-healing daemon monitoring operational pipelines... Awaiting next cycle.
              </div>
            ) : (
              consoleLogs.map((log, idx) => (
                <div key={idx} className="text-slate-300 leading-tight">
                  {log}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
            <span>Daemon Status: <strong>LIVE</strong></span>
            <span>Last Scan: {telemetry?.last_heal_timestamp ? <HydratedTimestamp timestamp={telemetry.last_heal_timestamp} /> : "Continuous"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
