"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

interface SimpleSystemHealthBannerProps {
  status: "HEALTHY" | "ATTENTION" | "DEGRADED" | "CRITICAL";
  activeIssuesCount: number;
  affectedBotsCount: number;
  criticalCount: number;
  subsystems: {
    marketData: "HEALTHY" | "DEGRADED" | "OFFLINE";
    broker: "HEALTHY" | "DEGRADED" | "OFFLINE";
    database: "HEALTHY" | "DEGRADED" | "OFFLINE";
    runner: "HEALTHY" | "DEGRADED" | "OFFLINE";
    risk: "HEALTHY" | "DEGRADED" | "OFFLINE";
    execution: "HEALTHY" | "DEGRADED" | "OFFLINE";
  };
}

export function SimpleSystemHealthBanner({
  status,
  activeIssuesCount,
  affectedBotsCount,
  criticalCount,
  subsystems,
}: SimpleSystemHealthBannerProps) {
  const isHealthy = status === "HEALTHY" && activeIssuesCount === 0;

  return (
    <div className="bg-[#0B132B]/90 border border-slate-800 rounded-2xl p-4 md:p-5 backdrop-blur-md shadow-xl font-mono text-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title & Status */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl border ${
              isHealthy
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            {isHealthy ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black text-white uppercase tracking-wider">
                SYSTEM HEALTH
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isHealthy
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse"
                }`}
              >
                {isHealthy ? "✓ ALL SYSTEMS HEALTHY" : "⚠ ATTENTION REQUIRED"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              {activeIssuesCount} Active {activeIssuesCount === 1 ? "Issue" : "Issues"} • {affectedBotsCount} {affectedBotsCount === 1 ? "Bot" : "Bots"} Affected • {criticalCount} Critical
            </p>
          </div>
        </div>

        {/* Compact Subsystems Strip */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Market</span>
            <span className={subsystems.marketData === "HEALTHY" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {subsystems.marketData === "HEALTHY" ? "✓" : "⚠"}
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Broker</span>
            <span className={subsystems.broker === "HEALTHY" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {subsystems.broker === "HEALTHY" ? "✓" : "⚠"}
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">DB</span>
            <span className={subsystems.database === "HEALTHY" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {subsystems.database === "HEALTHY" ? "✓" : "⚠"}
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Runner</span>
            <span className={subsystems.runner === "HEALTHY" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {subsystems.runner === "HEALTHY" ? "✓" : "⚠"}
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Risk</span>
            <span className={subsystems.risk === "HEALTHY" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {subsystems.risk === "HEALTHY" ? "✓" : "⚠"}
            </span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Execution</span>
            <span className={subsystems.execution === "HEALTHY" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {subsystems.execution === "HEALTHY" ? "✓" : "⚠"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
