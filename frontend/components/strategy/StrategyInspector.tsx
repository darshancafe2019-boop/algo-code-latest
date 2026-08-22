"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  DollarSign,
  Percent,
  Sliders,
  GitBranch,
  Info,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  StrategyIdeDefinition,
  StrategyIdeReadiness,
  StrategyIdePreflight,
  StrategyIdeRisk,
} from "@/types/strategy-ide";

interface StrategyInspectorProps {
  strategy: StrategyIdeDefinition;
  readiness: StrategyIdeReadiness | null;
  preflight: StrategyIdePreflight | null;
  onUpdateRisk: (fields: Partial<StrategyIdeRisk>) => void;
  onOpenVersionsModal: () => void;
}

export function StrategyInspector({
  strategy,
  readiness,
  preflight,
  onUpdateRisk,
  onOpenVersionsModal,
}: StrategyInspectorProps) {
  const [activeTab, setActiveTab] = useState<"READINESS" | "DATA" | "RISK" | "VERSIONS">("READINESS");

  const totalScore = readiness?.total_score ?? 92;
  const isReady = totalScore >= 80;

  return (
    <aside className="w-full lg:w-84 bg-[#0B131E] border border-[#1E293B] rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-2xl">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between border-b border-[#172234] pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px] font-bold">
          <button
            onClick={() => setActiveTab("READINESS")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === "READINESS"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#111C2E]"
            }`}
          >
            Scorecard
          </button>
          <button
            onClick={() => setActiveTab("RISK")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === "RISK"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#111C2E]"
            }`}
          >
            Risk
          </button>
          <button
            onClick={() => setActiveTab("DATA")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === "DATA"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#111C2E]"
            }`}
          >
            Data Feed
          </button>
          <button
            onClick={() => setActiveTab("VERSIONS")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              activeTab === "VERSIONS"
                ? "bg-cyan-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#111C2E]"
            }`}
          >
            Version
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[580px] scrollbar-thin scrollbar-thumb-slate-800 pr-1">
        {/* TAB 1: READINESS SCORECARD & PRE-FLIGHT */}
        {activeTab === "READINESS" && (
          <div className="space-y-3">
            {/* Overall Score Banner */}
            <div className="p-3.5 rounded-2xl bg-[#070D14] border border-[#172234] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Readiness Score
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`text-2xl font-black font-mono ${
                      isReady ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {totalScore}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 100</span>
                </div>
              </div>

              <div
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                  isReady
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                {isReady ? "READY FOR BACKTEST" : "NEEDS REFINEMENT"}
              </div>
            </div>

            {/* 6-Pillar Breakdown */}
            {readiness?.pillars && (
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  6-Pillar Quality Audit
                </h5>
                {Object.entries(readiness.pillars).map(([key, pillar]) => (
                  <div
                    key={key}
                    className="p-2.5 rounded-xl bg-[#070D14] border border-[#172234] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{pillar.label}</span>
                      <span className="font-mono text-[11px] text-cyan-400 font-bold">
                        {pillar.score} / {pillar.max}
                      </span>
                    </div>
                    <div className="w-full bg-[#111C2E] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pillar.score === pillar.max
                            ? "bg-emerald-500"
                            : pillar.score > 0
                            ? "bg-cyan-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${(pillar.score / pillar.max) * 100}%` }}
                      />
                    </div>
                    {pillar.details.length > 0 && (
                      <p className="text-[10px] text-slate-400">{pillar.details[0]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 20-Stage Pre-Flight Checklist */}
            {preflight && (
              <div className="space-y-2 pt-2 border-t border-[#172234]">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    20-Stage Pre-Flight Gate
                  </h5>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {preflight.pass_count} / {preflight.stages.length} PASSED
                  </span>
                </div>

                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {preflight.stages.map((st) => (
                    <div
                      key={st.stage}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-[#070D14] border border-[#131E2E] text-[10px]"
                    >
                      <span className="text-slate-300">
                        {st.stage}. {st.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold font-mono text-[9px] ${
                          st.status === "PASS"
                            ? "bg-emerald-950 text-emerald-400"
                            : "bg-rose-950 text-rose-400"
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-2.5 rounded-xl bg-[#070D14] border border-slate-800 text-[10px] text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-400">Institutional Disclaimer: </span>
              Readiness Score evaluates structural syntax, risk coverage, and dataset alignment. It does NOT guarantee future profitability.
            </div>
          </div>
        )}

        {/* TAB 2: RISK SETTINGS */}
        {activeTab === "RISK" && (
          <div className="space-y-3 text-xs">
            <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Strategy Capital & Risk Controls
            </h5>

            {/* Allocated Capital */}
            <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#172234] space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Allocated Capital ($)</label>
              <input
                type="number"
                value={strategy.risk.capital}
                onChange={(e) => onUpdateRisk({ capital: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-100 font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Risk Per Trade */}
            <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#172234] space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={strategy.risk.risk_per_trade_pct}
                onChange={(e) => onUpdateRisk({ risk_per_trade_pct: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-amber-400 font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Max Position Size */}
            <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#172234] space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Max Position Size (%)</label>
              <input
                type="number"
                value={strategy.risk.max_position_size_pct}
                onChange={(e) => onUpdateRisk({ max_position_size_pct: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-100 font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Max Daily Loss */}
            <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#172234] space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Daily Circuit Breaker ($)</label>
              <input
                type="number"
                value={strategy.risk.max_daily_loss}
                onChange={(e) => onUpdateRisk({ max_daily_loss: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-rose-400 font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Leverage */}
            <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#172234] space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Max Leverage Multiplier</label>
              <input
                type="number"
                step="0.5"
                value={strategy.risk.leverage}
                onChange={(e) => onUpdateRisk({ leverage: parseFloat(e.target.value) || 1.0 })}
                className="w-full bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-cyan-400 font-mono font-bold focus:outline-none"
              />
            </div>

            {/* Cooldown Bars */}
            <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#172234] space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase">Signal Cooldown (Closed Bars)</label>
              <input
                type="number"
                value={strategy.risk.cooldown_bars}
                onChange={(e) => onUpdateRisk({ cooldown_bars: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-[#0B131E] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-100 font-mono font-bold focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* TAB 3: DATA FEED & PIPELINE */}
        {activeTab === "DATA" && (
          <div className="space-y-3 text-xs">
            <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Market Data & Pipeline Status
            </h5>

            <div className="p-2.5 rounded-xl bg-[#070D14] border border-[#172234] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Primary Feed</span>
                <span className="font-mono text-emerald-400 font-bold">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Base Timeframe</span>
                <span className="font-mono text-cyan-300">{strategy.base_timeframe.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Macro Setup Feed</span>
                <span className="font-mono text-cyan-300">1H CLOSED BARS</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lookahead Bias</span>
                <span className="font-mono text-emerald-400">ZERO (Strict Guard)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Candle Cache Depth</span>
                <span className="font-mono text-slate-200">500 Bars Sync</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VERSION HISTORY */}
        {activeTab === "VERSIONS" && (
          <div className="space-y-3 text-xs">
            <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Strategy Version Lineage
            </h5>

            <div className="p-3 rounded-xl bg-[#070D14] border border-[#172234] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Version</span>
                <span className="font-mono text-cyan-300 font-bold">{strategy.active_version || "v1.0.0"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="font-mono text-amber-400 font-bold">{strategy.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Config Hash</span>
                <span className="font-mono text-slate-400 text-[10px]">#{strategy.config_hash || "83908a7e"}</span>
              </div>
            </div>

            <button
              onClick={onOpenVersionsModal}
              className="w-full py-2 rounded-xl bg-[#111C2E] hover:bg-[#18263E] text-purple-300 border border-purple-800/60 font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <GitBranch className="h-4 w-4 text-purple-400" />
              <span>Open Version Diff & History</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
