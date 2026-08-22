"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid, Sparkles, TrendingUp, TrendingDown, Layers } from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";

interface GlobalMarketHeatmapProps {
  onSelectInstrument: (inst: MarketInstrument) => void;
}

export function GlobalMarketHeatmap({ onSelectInstrument }: GlobalMarketHeatmapProps) {
  const [activeAssetGroup, setActiveAssetGroup] = useState<string>("Crypto");

  const { data: heatmapData, isLoading } = useQuery<{ status: string; heatmaps: Record<string, MarketInstrument[]> }>({
    queryKey: ["globalMarketHeatmaps"],
    queryFn: async () => {
      const res = await fetch("/api/universe/heatmaps");
      if (!res.ok) throw new Error("Failed to fetch heatmaps");
      return res.json();
    },
    refetchInterval: 12000,
  });

  const heatmaps = heatmapData?.heatmaps || {};
  const categories = Object.keys(heatmaps);
  const activeList = heatmaps[activeAssetGroup] || (categories.length > 0 ? heatmaps[categories[0]] : []);

  // Helper for background heat color based on 24h percentage return
  const getTileBg = (change: number) => {
    if (change >= 5.0) return "bg-emerald-950/80 border-emerald-600 text-emerald-200";
    if (change >= 2.0) return "bg-emerald-950/60 border-emerald-700 text-emerald-300";
    if (change > 0.0) return "bg-emerald-950/40 border-emerald-900 text-emerald-400";
    if (change <= -5.0) return "bg-rose-950/80 border-rose-600 text-rose-200";
    if (change <= -2.0) return "bg-rose-950/60 border-rose-700 text-rose-300";
    if (change < 0.0) return "bg-rose-950/40 border-rose-900 text-rose-400";
    return "bg-[#070D14] border-[#1E293B] text-slate-300";
  };

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 shadow-xl select-none font-sans space-y-4">
      {/* 1. Header & Group Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Grid className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Global Performance Heatmap
            </h3>
            <span className="text-[10px] text-slate-500">
              Multi-market cross-asset performance matrix
            </span>
          </div>
        </div>

        {/* Group Selector */}
        <div className="flex items-center gap-1 bg-[#070D14] p-1 rounded-xl border border-[#1E293B] text-[11px] font-mono overflow-x-auto scrollbar-none">
          {(categories.length > 0 ? categories : ["Crypto", "Indian Equities", "Global Equities", "Forex", "Commodities"]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveAssetGroup(cat)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeAssetGroup === cat
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Heatmap Tiles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-16 bg-[#070D14] rounded-xl border border-[#1E293B]" />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="p-6 text-center text-xs font-mono text-slate-500 bg-[#070D14] rounded-xl border border-[#1E293B]">
          No assets available for this market category.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 font-mono text-xs">
          {activeList.map((inst, idx) => {
            const sym = inst.canonical_symbol || inst.symbol || "UNKNOWN";
            const change = inst.change_24h || 0;
            const currSymbol = inst.currency === "INR" ? "₹" : "$";

            return (
              <div
                key={idx}
                onClick={() => onSelectInstrument(inst)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] space-y-1 shadow-sm ${getTileBg(
                  change
                )}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-100 text-xs truncate max-w-[80px]">
                    {sym}
                  </span>
                  <span className="text-[10px] font-bold">
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] opacity-80">
                  <span>
                    {currSymbol}
                    {inst.last_price ? inst.last_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                  </span>
                  <span className="text-[9px] uppercase">{inst.exchange}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
