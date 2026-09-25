"use client";

import React from "react";
import {
  Layers,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useStrategyStore } from "@/lib/strategies/strategyStore";
import { formatMoney } from "@/lib/formatters";

export function StrategyClustersView() {
  const { signalClusters } = useStrategyStore();

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0F19] border border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/40">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Central Exposure Controller & Signal Cluster Resolver
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                CROSS-STRATEGY COORDINATION
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              30 strategies do NOT trade independently. Groups concurrent signals by instrument, direction, and correlation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-[#0E1628] border border-[#1A2840] text-slate-300">
            Active Clusters: <strong className="text-white">{signalClusters.length}</strong>
          </span>
        </div>
      </div>

      {/* Signal Clusters Grid */}
      <div className="space-y-4">
        {signalClusters.map((cluster) => {
          const isApproved = cluster.action === "APPROVED";
          const isReduced = cluster.action === "REDUCED";
          const isBlocked = cluster.action === "BLOCKED";

          return (
            <div
              key={cluster.clusterId}
              className="p-5 rounded-2xl bg-[#0C1220] border border-[#1E2E4A] space-y-4 shadow-xl"
            >
              {/* Cluster Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[#1A2840]">
                <div className="flex items-center gap-3">
                  <span className="text-base font-mono font-bold text-white tracking-wider">
                    {cluster.instrument}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                      cluster.direction === "LONG"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : cluster.direction === "SHORT"
                        ? "bg-red-950 text-red-400 border border-red-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {cluster.direction} CLUSTER ({cluster.signalCount} Concurrent Strategies)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">CLUSTER DECISION:</span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider ${
                      isApproved
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : isReduced
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "bg-red-500/20 text-red-400 border border-red-500/40"
                    }`}
                  >
                    {cluster.action}
                  </span>
                </div>
              </div>

              {/* Concurring Strategies in this Cluster */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Contributing Strategies:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {cluster.signals.map((sig) => (
                    <div
                      key={sig.strategyNumber}
                      className="p-3 rounded-xl bg-[#080E1A] border border-[#162238] space-y-1 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300">
                          #{sig.strategyNumber} {sig.direction}
                        </span>
                        <span className="text-[10px] text-slate-400">{sig.proposedRiskPct}% Risk</span>
                      </div>
                      <p className="text-slate-300 truncate text-[11px]">{sig.strategyName}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-[#121A28]">
                        <span>Entry: {formatMoney(sig.entryPrice)}</span>
                        <span>Stop: {formatMoney(sig.stopPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exposure Allocation Bar & Audit Reason */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-[#080E1A] border border-[#162238] space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Proposed Exposure:</span>
                    <span className="font-bold text-white">{cluster.totalProposedRiskPct}% Risk (${cluster.totalProposedNotional.toLocaleString()})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Maximum Permitted Limit:</span>
                    <span className="font-bold text-cyan-400">{cluster.maximumPermittedRiskPct}% Risk (${cluster.maximumPermittedNotional.toLocaleString()})</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#121A2B] overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        cluster.totalProposedRiskPct > cluster.maximumPermittedRiskPct ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min(100, (cluster.totalProposedRiskPct / cluster.maximumPermittedRiskPct) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#080E1A] border border-[#162238] space-y-1 text-xs font-mono">
                  <span className="text-slate-400 uppercase text-[10px] block">Audit Resolution Summary:</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{cluster.resolutionSummary}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
