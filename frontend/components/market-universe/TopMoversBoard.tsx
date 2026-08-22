"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  BarChart3,
  Layers
} from "lucide-react";
import { MarketInstrument, TopMoversResponse } from "@/types/market-universe";

interface TopMoversBoardProps {
  onSelectInstrument: (inst: MarketInstrument) => void;
}

export function TopMoversBoard({ onSelectInstrument }: TopMoversBoardProps) {
  const [preset, setPreset] = useState<"gainers" | "losers" | "volume" | "oi" | "volatility" | "momentum">("gainers");
  const [assetClass, setAssetClass] = useState<string>("ALL");

  const { data: moversData, isLoading } = useQuery<TopMoversResponse>({
    queryKey: ["universeMovers", preset, assetClass],
    queryFn: async () => {
      const res = await fetch(`/api/universe/movers?preset=${preset}&asset_class=${assetClass}&limit=8`);
      if (!res.ok) throw new Error("Failed to fetch movers");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const movers = moversData?.movers || [];

  return (
    <div className="bg-[#0B131E] border border-[#1E293B] rounded-2xl p-4 shadow-xl select-none font-sans space-y-4">
      {/* 1. Header & Preset Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Top Movers & Institutional Momentum
            </h3>
            <span className="text-[10px] text-slate-500">
              Server-side ranked with liquidity filtering ($10k+ 24h volume)
            </span>
          </div>
        </div>

        {/* Preset Tabs */}
        <div className="flex items-center gap-1 bg-[#070D14] p-1 rounded-xl border border-[#1E293B] text-[11px] font-mono overflow-x-auto scrollbar-none">
          {[
            { id: "gainers", label: "Top Gainers" },
            { id: "losers", label: "Top Losers" },
            { id: "volume", label: "Volume Surge" },
            { id: "oi", label: "OI Leaders" },
            { id: "volatility", label: "Volatility" },
            { id: "momentum", label: "Momentum" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPreset(item.id as any)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                preset === item.id
                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Grid of Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-[#070D14] rounded-xl border border-[#1E293B]" />
          ))}
        </div>
      ) : movers.length === 0 ? (
        <div className="p-6 text-center text-xs font-mono text-slate-500 bg-[#070D14] rounded-xl border border-[#1E293B]">
          No instruments matched the liquidity and category thresholds.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
          {movers.map((inst, idx) => {
            const sym = inst.canonical_symbol || inst.symbol || "UNKNOWN";
            const isPos = (inst.change_24h || 0) >= 0;
            const currSymbol = inst.currency === "INR" ? "₹" : "$";

            return (
              <div
                key={idx}
                onClick={() => onSelectInstrument(inst)}
                className="p-3 bg-[#070D14] hover:bg-[#0F1B2A] border border-[#1E293B] hover:border-cyan-700 rounded-xl transition-all cursor-pointer space-y-1.5 group shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {sym}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#162231] text-slate-400">
                      {inst.exchange}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                      isPos
                        ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                        : "bg-rose-950/60 border-rose-800 text-rose-300"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {(inst.change_24h || 0).toFixed(2)}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {currSymbol}
                    {inst.last_price ? inst.last_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Vol: {currSymbol}{(inst.volume_24h || 0) > 1e6 ? `${((inst.volume_24h || 0) / 1e6).toFixed(1)}M` : `${((inst.volume_24h || 0) / 1e3).toFixed(0)}k`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
