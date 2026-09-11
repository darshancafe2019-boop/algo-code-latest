"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Shield,
  Zap,
  Layers,
} from "lucide-react";
import { OptionTerminalSnapshot } from "@/types/option-terminal";
import {
  formatIndianQuantity,
  formatIndianCurrency,
} from "@/lib/options/options-analytics-engine";

interface OptionAnalyticsPanelProps {
  snapshot: OptionTerminalSnapshot;
  currency?: string;
}

export const OptionAnalyticsPanel: React.FC<OptionAnalyticsPanelProps> = ({
  snapshot,
  currency = "₹",
}) => {
  const [activeTab, setActiveTab] = useState<"HEATMAP" | "IV_SKEW" | "BUILDUP" | "SUPPORT_RES">("HEATMAP");

  const strikes = snapshot.strikes || [];
  const maxCallOi = Math.max(1, ...strikes.map((s) => s.call?.oi || 0));
  const maxPutOi = Math.max(1, ...strikes.map((s) => s.put?.oi || 0));
  const maxOverallOi = Math.max(maxCallOi, maxPutOi);

  // Group strikes by buildup
  const longBuildups = strikes.filter((s) => s.call?.oiBuildup === "LONG_BUILDUP" || s.put?.oiBuildup === "LONG_BUILDUP");
  const shortBuildups = strikes.filter((s) => s.call?.oiBuildup === "SHORT_BUILDUP" || s.put?.oiBuildup === "SHORT_BUILDUP");
  const longUnwindings = strikes.filter((s) => s.call?.oiBuildup === "LONG_UNWINDING" || s.put?.oiBuildup === "LONG_UNWINDING");
  const shortCoverings = strikes.filter((s) => s.call?.oiBuildup === "SHORT_COVERING" || s.put?.oiBuildup === "SHORT_COVERING");

  return (
    <div className="bg-[#090E17] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl font-mono text-xs">
      {/* Top Tabs */}
      <div className="p-3 bg-[#0B1222] border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white text-sm">Advanced Derivatives Analytics</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
          {[
            { id: "HEATMAP", label: "OI Distribution Ladder" },
            { id: "IV_SKEW", label: "IV Skew Curve" },
            { id: "BUILDUP", label: "Buildup Matrix" },
            { id: "SUPPORT_RES", label: "Support / Resistance" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                activeTab === tab.id
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: OI Distribution Heatmap Ladder */}
      {activeTab === "HEATMAP" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
            <span className="text-rose-400 font-bold">CALL OPEN INTEREST</span>
            <span className="text-white font-bold">STRIKE</span>
            <span className="text-emerald-400 font-bold">PUT OPEN INTEREST</span>
          </div>

          <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
            {strikes.map((s) => {
              const callOi = s.call?.oi || 0;
              const putOi = s.put?.oi || 0;
              const callPct = Math.round((callOi / maxOverallOi) * 100);
              const putPct = Math.round((putOi / maxOverallOi) * 100);
              const isATM = s.isATM;

              return (
                <div
                  key={s.strike}
                  className={`grid grid-cols-11 items-center gap-2 py-1 px-2 rounded-lg text-[11px] hover:bg-slate-800/50 transition ${
                    isATM ? "bg-purple-950/30 border border-purple-500/40 font-bold" : ""
                  }`}
                >
                  {/* Call OI Bar */}
                  <div className="col-span-5 flex items-center justify-end gap-2">
                    <span className="text-slate-300 text-[10px]">{formatIndianQuantity(callOi)}</span>
                    <div className="w-32 bg-slate-900 rounded-full h-2.5 overflow-hidden flex justify-end">
                      <div
                        className="bg-rose-500/80 h-full rounded-full transition-all duration-300"
                        style={{ width: `${callPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Strike Center */}
                  <div className="col-span-1 text-center font-bold text-white">
                    {s.strike}
                    {isATM && <span className="block text-[8px] text-cyan-400 font-extrabold">ATM</span>}
                  </div>

                  {/* Put OI Bar */}
                  <div className="col-span-5 flex items-center justify-start gap-2">
                    <div className="w-32 bg-slate-900 rounded-full h-2.5 overflow-hidden flex justify-start">
                      <div
                        className="bg-emerald-500/80 h-full rounded-full transition-all duration-300"
                        style={{ width: `${putPct}%` }}
                      />
                    </div>
                    <span className="text-slate-300 text-[10px]">{formatIndianQuantity(putOi)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Implied Volatility Skew Curve */}
      {activeTab === "IV_SKEW" && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">ATM Implied Volatility</span>
              <div className="text-lg font-bold text-purple-300 mt-1">{snapshot.atmIV || "14.5"}%</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Call IV Avg</span>
              <div className="text-lg font-bold text-rose-300 mt-1">{snapshot.ivSkew.callIVAverage}%</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Put IV Avg (Skew)</span>
              <div className="text-lg font-bold text-emerald-300 mt-1">{snapshot.ivSkew.putIVAverage}%</div>
            </div>
          </div>

          {/* Strikes IV Table */}
          <div className="overflow-x-auto max-h-[45vh]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1222] text-[10px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3 text-right">Call IV%</th>
                  <th className="py-2 px-4 text-center">Strike</th>
                  <th className="py-2 px-3 text-left">Put IV%</th>
                  <th className="py-2 px-3 text-center">IV Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {strikes.map((s) => {
                  const callIv = s.call?.iv || 0;
                  const putIv = s.put?.iv || 0;
                  const isAtm = s.isATM;
                  return (
                    <tr key={s.strike} className={isAtm ? "bg-purple-950/20 font-bold" : ""}>
                      <td className="py-1.5 px-3 text-right text-rose-300">{callIv > 0 ? `${callIv.toFixed(1)}%` : "—"}</td>
                      <td className="py-1.5 px-4 text-center font-bold text-white bg-slate-900/60">{s.strike}</td>
                      <td className="py-1.5 px-3 text-left text-emerald-300">{putIv > 0 ? `${putIv.toFixed(1)}%` : "—"}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300">
                          {callIv > (snapshot.atmIV || 14.5) + 1 ? "IV EXPANSION" : "IV STABLE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Open Interest Buildup Matrix */}
      {activeTab === "BUILDUP" && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Long Buildup */}
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">LONG BUILDUP</span>
              <span className="text-[10px] text-slate-400">Price ↑ + OI ↑</span>
            </div>
            <div className="text-slate-300 text-[11px] space-y-1">
              {longBuildups.length === 0 ? (
                <span className="text-slate-500 block">No strikes in long buildup</span>
              ) : (
                longBuildups.slice(0, 5).map((s) => (
                  <div key={s.strike} className="flex justify-between">
                    <span>{s.strike}</span>
                    <span className="text-emerald-400">+{formatIndianQuantity(s.call?.oiChange || s.put?.oiChange)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Short Buildup */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400">SHORT BUILDUP</span>
              <span className="text-[10px] text-slate-400">Price ↓ + OI ↑</span>
            </div>
            <div className="text-slate-300 text-[11px] space-y-1">
              {shortBuildups.length === 0 ? (
                <span className="text-slate-500 block">No strikes in short buildup</span>
              ) : (
                shortBuildups.slice(0, 5).map((s) => (
                  <div key={s.strike} className="flex justify-between">
                    <span>{s.strike}</span>
                    <span className="text-rose-400">+{formatIndianQuantity(s.call?.oiChange || s.put?.oiChange)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Long Unwinding */}
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300">LONG UNWINDING</span>
              <span className="text-[10px] text-slate-400">Price ↓ + OI ↓</span>
            </div>
            <div className="text-slate-300 text-[11px] space-y-1">
              {longUnwindings.length === 0 ? (
                <span className="text-slate-500 block">No strikes unwinding</span>
              ) : (
                longUnwindings.slice(0, 5).map((s) => (
                  <div key={s.strike} className="flex justify-between">
                    <span>{s.strike}</span>
                    <span className="text-amber-400">{formatIndianQuantity(s.call?.oiChange || s.put?.oiChange)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Short Covering */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300">SHORT COVERING</span>
              <span className="text-[10px] text-slate-400">Price ↑ + OI ↓</span>
            </div>
            <div className="text-slate-300 text-[11px] space-y-1">
              {shortCoverings.length === 0 ? (
                <span className="text-slate-500 block">No strikes covering</span>
              ) : (
                shortCoverings.slice(0, 5).map((s) => (
                  <div key={s.strike} className="flex justify-between">
                    <span>{s.strike}</span>
                    <span className="text-cyan-400">{formatIndianQuantity(s.call?.oiChange || s.put?.oiChange)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: OI Support & Resistance Zones */}
      {activeTab === "SUPPORT_RES" && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Support Zone */}
          <div className="p-4 rounded-xl bg-[#0B1222] border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                OI-Based Support Zone
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                PE OI Concentrated
              </span>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {snapshot.supportZone?.strike.toLocaleString("en-IN") || "—"}
            </div>
            <div className="text-xs text-slate-400">
              Total Put Open Interest: <strong className="text-emerald-300">{formatIndianQuantity(snapshot.supportZone?.oi)}</strong>
            </div>
          </div>

          {/* Resistance Zone */}
          <div className="p-4 rounded-xl bg-[#0B1222] border border-rose-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                OI-Based Resistance Zone
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                CE OI Concentrated
              </span>
            </div>
            <div className="text-2xl font-extrabold text-white">
              {snapshot.resistanceZone?.strike.toLocaleString("en-IN") || "—"}
            </div>
            <div className="text-xs text-slate-400">
              Total Call Open Interest: <strong className="text-rose-300">{formatIndianQuantity(snapshot.resistanceZone?.oi)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
