"use client";

import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Cpu, Activity, Zap, Database, Globe, Sliders } from "lucide-react";

interface SubsystemHealthItem {
  name: string;
  category: string;
  status: "HEALTHY" | "DEGRADED" | "OFFLINE" | "UNKNOWN";
  latencyMs?: number;
  lastCheck?: string;
  details?: string;
}

interface SimpleSystemHealthTabProps {
  subsystems: SubsystemHealthItem[];
  diagnostics: {
    executionLatencyMs: number;
    dbLatencyMs: number;
    brokerLatencyMs: number;
    signalsLatencyMs: number;
  };
}

export function SimpleSystemHealthTab({ subsystems, diagnostics }: SimpleSystemHealthTabProps) {
  const [showAdvancedDiagnostics, setShowAdvancedDiagnostics] = useState(false);

  return (
    <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xl font-mono text-xs space-y-5">
      {/* Subsystem Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Subsystem Health Status
          </h3>
          <button
            onClick={() => setShowAdvancedDiagnostics(!showAdvancedDiagnostics)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 transition font-sans underline"
          >
            {showAdvancedDiagnostics ? "Hide Latency Diagnostics" : "Show Latency Diagnostics"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {subsystems.map((sub, idx) => {
            const isHealthy = sub.status === "HEALTHY";
            const isDegraded = sub.status === "DEGRADED";
            const isUnknown = sub.status === "UNKNOWN";

            return (
              <div
                key={idx}
                className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-xs">{sub.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isHealthy
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isDegraded
                        ? "bg-amber-500/20 text-amber-400"
                        : isUnknown
                        ? "bg-slate-800 text-slate-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span>{sub.details || "Operating nominally"}</span>
                  {sub.latencyMs !== undefined && (
                    <span className="font-mono text-cyan-400 font-bold">{sub.latencyMs} ms</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced Latency Diagnostics Section */}
      {showAdvancedDiagnostics && (
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase">Pipeline Latency Breakdown</span>
            <span className="text-[10px] text-slate-400">Target Threshold: &lt; 100ms</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Execution</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                {diagnostics.executionLatencyMs} ms
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Database</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                {diagnostics.dbLatencyMs} ms
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Broker API</span>
              <span className="text-sm font-bold text-cyan-400 mt-0.5 block">
                {diagnostics.brokerLatencyMs} ms
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Signal Processing</span>
              <span className="text-sm font-bold text-cyan-400 mt-0.5 block">
                {diagnostics.signalsLatencyMs} ms
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
