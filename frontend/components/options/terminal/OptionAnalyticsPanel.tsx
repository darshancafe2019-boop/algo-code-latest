"use client";
import { formatNumber, formatPrice, formatMoney, formatQuantity, formatVolume } from "@/lib/formatters";

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
  const [heatmapMode, setHeatmapMode] = useState<"OI" | "OI_CHANGE" | "VOLUME" | "LTP_CHANGE" | "IV">("OI");

  const strikes = snapshot.strikes || [];

  // Dynamically compute values for heatmap mode
  const getStrikeValues = (s: (typeof strikes)[0]) => {
    switch (heatmapMode) {
      case "OI_CHANGE":
        return {
          callVal: Math.abs(s.call?.oiChange || 0),
          putVal: Math.abs(s.put?.oiChange || 0),
          callLabel: `${(s.call?.oiChange || 0) >= 0 ? "+" : ""}${formatIndianQuantity(s.call?.oiChange || 0)}`,
          putLabel: `${(s.put?.oiChange || 0) >= 0 ? "+" : ""}${formatIndianQuantity(s.put?.oiChange || 0)}`,
          callColor: (s.call?.oiChange || 0) >= 0 ? "bg-emerald-500/80" : "bg-rose-500/80",
          putColor: (s.put?.oiChange || 0) >= 0 ? "bg-emerald-500/80" : "bg-rose-500/80",
        };
      case "VOLUME":
        return {
          callVal: s.call?.volume || 0,
          putVal: s.put?.volume || 0,
          callLabel: formatIndianQuantity(s.call?.volume || 0),
          putLabel: formatIndianQuantity(s.put?.volume || 0),
          callColor: "bg-blue-500/80",
          putColor: "bg-cyan-500/80",
        };
      case "LTP_CHANGE":
        return {
          callVal: Math.abs(s.call?.change || 0),
          putVal: Math.abs(s.put?.change || 0),
          callLabel: `${(s.call?.change || 0) >= 0 ? "+" : ""}${(s.call?.change || 0).toFixed(2)}`,
          putLabel: `${(s.put?.change || 0) >= 0 ? "+" : ""}${(s.put?.change || 0).toFixed(2)}`,
          callColor: (s.call?.change || 0) >= 0 ? "bg-emerald-500/80" : "bg-rose-500/80",
          putColor: (s.put?.change || 0) >= 0 ? "bg-emerald-500/80" : "bg-rose-500/80",
        };
      case "IV":
        return {
          callVal: s.call?.iv || 0,
          putVal: s.put?.iv || 0,
          callLabel: s.call?.iv ? `${s.call.iv.toFixed(1)}%` : "—",
          putLabel: s.put?.iv ? `${s.put.iv.toFixed(1)}%` : "—",
          callColor: "bg-purple-500/80",
          putColor: "bg-purple-500/80",
        };
      case "OI":
      default:
        return {
          callVal: s.call?.oi || 0,
          putVal: s.put?.oi || 0,
          callLabel: formatIndianQuantity(s.call?.oi || 0),
          putLabel: formatIndianQuantity(s.put?.oi || 0),
          callColor: "bg-rose-500/80",
          putColor: "bg-emerald-500/80",
        };
    }
  };

  const maxValAcrossStrikes = Math.max(
    1,
    ...strikes.flatMap((s) => {
      const { callVal, putVal } = getStrikeValues(s);
      return [callVal, putVal];
    })
  );

  // Group strikes by buildup
  const longBuildups = strikes.filter((s) => s.call?.oiBuildup === "LONG_BUILDUP" || s.put?.oiBuildup === "LONG_BUILDUP");
  const shortBuildups = strikes.filter((s) => s.call?.oiBuildup === "SHORT_BUILDUP" || s.put?.oiBuildup === "SHORT_BUILDUP");
  const longUnwindings = strikes.filter((s) => s.call?.oiBuildup === "LONG_UNWINDING" || s.put?.oiBuildup === "LONG_UNWINDING");
  const shortCoverings = strikes.filter((s) => s.call?.oiBuildup === "SHORT_COVERING" || s.put?.oiBuildup === "SHORT_COVERING");

  return (
    <div className="bg-[#090E17] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl font-mono text-xs sm:text-sm md:text-[14px]">
      {/* Top Tabs */}
      <div className="p-3.5 bg-[#0B1222] border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span className="font-extrabold text-white text-sm sm:text-base md:text-lg">Advanced Derivatives Analytics</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {[
            { id: "HEATMAP", label: "Derivatives Heatmap Ladder" },
            { id: "IV_SKEW", label: "IV Skew Curve" },
            { id: "BUILDUP", label: "Buildup Matrix" },
            { id: "SUPPORT_RES", label: "Support / Resistance" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition ${
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

      {/* Tab 1: Heatmap Ladder with Metric Selector */}
      {activeTab === "HEATMAP" && (
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Heatmap Mode Selector */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800/80">
            <span className="text-slate-400 font-bold text-xs uppercase">Heatmap Metric:</span>
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1">
              {[
                { id: "OI", label: "Open Interest (OI)" },
                { id: "OI_CHANGE", label: "OI Change (ΔOI)" },
                { id: "VOLUME", label: "Volume" },
                { id: "LTP_CHANGE", label: "LTP Change" },
                { id: "IV", label: "IV%" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setHeatmapMode(m.id as any)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                    heatmapMode === m.id
                      ? "bg-cyan-500 text-slate-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400 pb-2 border-b border-slate-800">
            <span className="text-rose-400 font-extrabold">CALL SIDE ({heatmapMode})</span>
            <span className="text-white font-black">STRIKE</span>
            <span className="text-emerald-400 font-extrabold">PUT SIDE ({heatmapMode})</span>
          </div>

          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
            {strikes.map((s) => {
              const { callVal, putVal, callLabel, putLabel, callColor, putColor } = getStrikeValues(s);
              const callPct = Math.min(100, Math.round((callVal / maxValAcrossStrikes) * 100));
              const putPct = Math.min(100, Math.round((putVal / maxValAcrossStrikes) * 100));
              const isATM = s.isATM;

              return (
                <div
                  key={s.strike}
                  className={`grid grid-cols-11 items-center gap-2.5 py-1.5 px-2.5 rounded-lg text-xs sm:text-sm hover:bg-slate-800/50 transition ${
                    isATM ? "bg-purple-950/30 border border-purple-500/40 font-bold" : ""
                  }`}
                >
                  {/* Call Bar */}
                  <div className="col-span-5 flex items-center justify-end gap-2.5">
                    <span className="text-slate-300 font-semibold text-xs sm:text-sm">{callLabel}</span>
                    <div className="w-32 sm:w-40 md:w-48 bg-slate-900 rounded-full h-3 overflow-hidden flex justify-end">
                      <div
                        className={`${callColor} h-full rounded-full transition-all duration-300`}
                        style={{ width: `${callPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Strike Center */}
                  <div className="col-span-1 text-center font-black text-sm sm:text-base text-white">
                    {s.strike}
                    {isATM && <span className="block text-[9px] sm:text-[10px] text-cyan-400 font-black">ATM</span>}
                  </div>

                  {/* Put Bar */}
                  <div className="col-span-5 flex items-center justify-start gap-2.5">
                    <div className="w-32 sm:w-40 md:w-48 bg-slate-900 rounded-full h-3 overflow-hidden flex justify-start">
                      <div
                        className={`${putColor} h-full rounded-full transition-all duration-300`}
                        style={{ width: `${putPct}%` }}
                      />
                    </div>
                    <span className="text-slate-300 font-semibold text-xs sm:text-sm">{putLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Implied Volatility Skew Curve */}
      {activeTab === "IV_SKEW" && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold">ATM Implied Volatility</span>
              <div className="text-xl sm:text-2xl font-black text-purple-300 mt-1">{snapshot.atmIV || "14.5"}%</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold">Call IV Avg</span>
              <div className="text-xl sm:text-2xl font-black text-rose-300 mt-1">{snapshot.ivSkew.callIVAverage}%</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold">Put IV Avg (Skew)</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">{snapshot.ivSkew.putIVAverage}%</div>
            </div>
          </div>

          {/* Strikes IV Table */}
          <div className="overflow-x-auto max-h-[45vh]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#0B1222] text-xs text-slate-400 uppercase border-b border-slate-800 font-bold">
                <tr>
                  <th className="py-2.5 px-3.5 text-right">Call IV%</th>
                  <th className="py-2.5 px-4 text-center">Strike</th>
                  <th className="py-2.5 px-3.5 text-left">Put IV%</th>
                  <th className="py-2.5 px-3.5 text-center">IV Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {strikes.map((s) => {
                  const callIv = s.call?.iv || 0;
                  const putIv = s.put?.iv || 0;
                  const isAtm = s.isATM;
                  return (
                    <tr key={s.strike} className={isAtm ? "bg-purple-950/20 font-bold" : ""}>
                      <td className="py-2 px-3.5 text-right text-rose-300 font-semibold">{callIv > 0 ? `${callIv.toFixed(1)}%` : "—"}</td>
                      <td className="py-2 px-4 text-center font-black text-white bg-slate-900/60 text-sm sm:text-base">{s.strike}</td>
                      <td className="py-2 px-3.5 text-left text-emerald-300 font-semibold">{putIv > 0 ? `${putIv.toFixed(1)}%` : "—"}</td>
                      <td className="py-2 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold bg-slate-800 text-slate-300">
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
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Long Buildup */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">LONG BUILDUP</span>
              <span className="text-[11px] text-slate-400 font-bold">Price ↑ + OI ↑</span>
            </div>
            <div className="text-slate-300 text-xs sm:text-sm space-y-1.5">
              {longBuildups.length === 0 ? (
                <span className="text-slate-500 block">No strikes in long buildup</span>
              ) : (
                longBuildups.slice(0, 5).map((s) => (
                  <div key={s.strike} className="flex justify-between font-semibold">
                    <span>{s.strike}</span>
                    <span className="text-emerald-400">+{formatIndianQuantity(s.call?.oiChange || s.put?.oiChange)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Short Buildup */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-rose-400 text-xs sm:text-sm">SHORT BUILDUP</span>
              <span className="text-[11px] text-slate-400 font-bold">Price ↓ + OI ↑</span>
            </div>
            <div className="text-slate-300 text-xs sm:text-sm space-y-1.5">
              {shortBuildups.length === 0 ? (
                <span className="text-slate-500 block">No strikes in short buildup</span>
              ) : (
                shortBuildups.slice(0, 5).map((s) => (
                  <div key={s.strike} className="flex justify-between font-semibold">
                    <span>{s.strike}</span>
                    <span className="text-rose-400">+{formatIndianQuantity(s.call?.oiChange || s.put?.oiChange)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Long Unwinding */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-300 text-xs sm:text-sm">LONG UNWINDING</span>
              <span className="text-[11px] text-slate-400 font-bold">Price ↓ + OI ↓</span>
            </div>
            <div className="text-slate-300 text-xs sm:text-sm space-y-1.5">
              {longUnwindings.length === 0 ? (
                <span className="text-slate-500 block">No strikes unwinding</span>
              ) : (
                longUnwindings.slice(0, 5).map((s) => (
                  <div key={s.strike} className="flex justify-between font-semibold">
                    <span>{s.strike}</span>
                    <span className="text-amber-400">{formatIndianQuantity(s.call?.oiChange || s.put?.oiChange)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Short Covering */}
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-cyan-300 text-xs sm:text-sm">SHORT COVERING</span>
              <span className="text-[11px] text-slate-400 font-bold">Price ↑ + OI ↓</span>
            </div>
            <div className="text-slate-300 text-xs sm:text-sm space-y-1.5">
              {shortCoverings.length === 0 ? (
                <span className="text-slate-500 block">No strikes covering</span>
              ) : (
                shortCoverings.slice(0, 5).map((s) => (
                  <div key={s.strike} className="flex justify-between font-semibold">
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
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Support Zone */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0B1222] border border-emerald-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 text-xs sm:text-sm">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                OI-Based Support Zone
              </span>
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                PE OI Concentrated
              </span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
              {formatPrice(snapshot.supportZone?.strike)}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 font-semibold">
              Total Put Open Interest: <strong className="text-emerald-300">{formatIndianQuantity(snapshot.supportZone?.oi)}</strong>
            </div>
          </div>

          {/* Resistance Zone */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0B1222] border border-rose-500/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-rose-400 font-extrabold flex items-center gap-1.5 text-xs sm:text-sm">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                OI-Based Resistance Zone
              </span>
              <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">
                CE OI Concentrated
              </span>
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
              {formatPrice(snapshot.resistanceZone?.strike)}
            </div>
            <div className="text-xs sm:text-sm text-slate-400 font-semibold">
              Total Call Open Interest: <strong className="text-rose-300">{formatIndianQuantity(snapshot.resistanceZone?.oi)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
