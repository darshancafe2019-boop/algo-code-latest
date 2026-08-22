"use client";

import React, { useState } from "react";
import { Flame, Layers, BarChart3, Activity } from "lucide-react";
import { OptionStrikeRow } from "@/types/option-chain";

interface OpenInterestHeatmapViewProps {
  strikes: OptionStrikeRow[];
  spotPrice: number;
  currency?: string;
}

export function OpenInterestHeatmapView({
  strikes,
  spotPrice,
  currency = "₹",
}: OpenInterestHeatmapViewProps) {
  const [metric, setMetric] = useState<"oi" | "volume" | "iv">("oi");

  if (!strikes || strikes.length === 0) return null;

  const maxVal = Math.max(
    ...strikes.map((s) => {
      if (metric === "oi") return Math.max(s.ce?.open_interest || 1, s.pe?.open_interest || 1);
      if (metric === "volume") return Math.max(s.ce?.volume || 1, s.pe?.volume || 1);
      return Math.max(s.ce?.iv || 1, s.pe?.iv || 1);
    })
  );

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              DERIVATIVES LIQUIDITY & OPEN INTEREST HEATMAP
            </h2>
            <p className="text-xs text-slate-400">Visual concentration of call resistance and put support walls</p>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center bg-[#141E33] border border-slate-700 rounded-lg p-0.5 text-xs">
          {(["oi", "volume", "iv"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1 rounded font-bold uppercase transition-all ${
                metric === m ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              {m === "oi" ? "Open Interest" : m === "volume" ? "Volume" : "IV %"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-rose-500 rounded" />
          <span className="font-bold text-rose-300">Call Options (Resistance Concentration)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-emerald-500 rounded" />
          <span className="font-bold text-emerald-300">Put Options (Support Concentration)</span>
        </div>
      </div>

      {/* Bars Grid */}
      <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
        {strikes.map((r) => {
          const ceVal = metric === "oi" ? r.ce?.open_interest || 0 : metric === "volume" ? r.ce?.volume || 0 : r.ce?.iv || 0;
          const peVal = metric === "oi" ? r.pe?.open_interest || 0 : metric === "volume" ? r.pe?.volume || 0 : r.pe?.iv || 0;

          const ceWidth = `${Math.min(100, Math.max(2, (ceVal / maxVal) * 100))}%`;
          const peWidth = `${Math.min(100, Math.max(2, (peVal / maxVal) * 100))}%`;

          return (
            <div key={r.strike} className="grid grid-cols-12 items-center gap-2 text-xs">
              {/* Call Bar (Left) */}
              <div className="col-span-5 flex items-center justify-end gap-2">
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {metric === "iv" ? `${ceVal.toFixed(1)}%` : `${(ceVal / 1000).toFixed(1)}k`}
                </span>
                <div className="w-full bg-[#141E33] rounded-full h-3.5 flex justify-end overflow-hidden">
                  <div
                    style={{ width: ceWidth }}
                    className="bg-gradient-to-l from-rose-500 to-rose-600 h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>

              {/* Strike Price (Center) */}
              <div
                className={`col-span-2 text-center py-1 rounded font-extrabold text-[11px] ${
                  r.is_atm
                    ? "bg-amber-500 text-slate-950 shadow-md scale-105"
                    : "bg-[#141E33] text-white border border-slate-700"
                }`}
              >
                {currency}{r.strike.toLocaleString()}
              </div>

              {/* Put Bar (Right) */}
              <div className="col-span-5 flex items-center gap-2">
                <div className="w-full bg-[#141E33] rounded-full h-3.5 overflow-hidden">
                  <div
                    style={{ width: peWidth }}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-300"
                  />
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {metric === "iv" ? `${peVal.toFixed(1)}%` : `${(peVal / 1000).toFixed(1)}k`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
