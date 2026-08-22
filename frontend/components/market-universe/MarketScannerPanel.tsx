"use client";

import React, { useState } from "react";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Search,
  Filter,
  Zap,
} from "lucide-react";
import { MarketInstrument } from "@/types/market-universe";

interface MarketScannerPanelProps {
  instruments: MarketInstrument[];
  onSelectInstrument: (inst: MarketInstrument) => void;
}

export function MarketScannerPanel({
  instruments,
  onSelectInstrument,
}: MarketScannerPanelProps) {
  const [activeScanPreset, setActiveScanPreset] = useState<
    "gainers" | "losers" | "volume" | "oi" | "breakout" | "volatility"
  >("gainers");

  // Sorted subsets based on real data
  const topGainers = [...instruments].sort((a, b) => (b.change_24h || 0) - (a.change_24h || 0)).slice(0, 8);
  const topLosers = [...instruments].sort((a, b) => (a.change_24h || 0) - (b.change_24h || 0)).slice(0, 8);
  const topVolume = [...instruments].sort((a, b) => (b.volume_24h || 0) - (a.volume_24h || 0)).slice(0, 8);
  const topOI = [...instruments].sort((a, b) => (b.open_interest || 0) - (a.open_interest || 0)).slice(0, 8);
  const topBreakouts = instruments.filter((i) => (i.volatility_score || 0) > 60 || i.is_scalping_candidate).slice(0, 8);

  const displayedList =
    activeScanPreset === "gainers"
      ? topGainers
      : activeScanPreset === "losers"
      ? topLosers
      : activeScanPreset === "volume"
      ? topVolume
      : activeScanPreset === "oi"
      ? topOI
      : topBreakouts;

  return (
    <div className="bg-[#0D1914] border border-[#294238] rounded-2xl p-4 sm:p-5 shadow-xl select-none font-sans space-y-4">
      {/* Header & Preset Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B3328] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Market Scanner & Top Movers
            </h3>
            <p className="text-[11px] text-[#A8BDB0]">
              Real-time statistical momentum, volume expansion, and Open Interest concentration.
            </p>
          </div>
        </div>

        {/* Scan Filter Pills */}
        <div className="flex items-center gap-1 bg-[#07110D] p-1 rounded-xl border border-[#1B3328] text-xs font-mono">
          {[
            { id: "gainers", label: "Top Gainers" },
            { id: "losers", label: "Top Losers" },
            { id: "volume", label: "Volume Surges" },
            { id: "oi", label: "OI Leaders" },
            { id: "breakout", label: "Breakout Scans" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setActiveScanPreset(preset.id as any)}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeScanPreset === preset.id
                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                  : "text-[#70877A] hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scanned Instrument Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
        {displayedList.map((inst, idx) => {
          const sym = inst.canonical_symbol || inst.symbol || "UNKNOWN";
          const isPositive = (inst.change_24h || 0) >= 0;
          const currSymbol = inst.currency === "INR" ? "₹" : "$";

          return (
            <div
              key={idx}
              onClick={() => onSelectInstrument(inst)}
              className="p-3.5 rounded-2xl bg-[#07110D] border border-[#1B3328] hover:border-[#2E7D5B] transition-colors cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white group-hover:text-[#55C98A] transition-colors">
                  {sym}
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    isPositive ? "text-[#55C98A]" : "text-red-400"
                  }`}
                >
                  {isPositive ? "+" : ""}{(inst.change_24h || 0).toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1B3328]">
                <span className="text-white font-bold">
                  {inst.last_price ? `${currSymbol}${inst.last_price.toLocaleString()}` : "N/A"}
                </span>
                <span className="text-[10px] text-cyan-300">
                  Vol: {inst.volume_24h ? (inst.volume_24h / 1000).toFixed(1) + "k" : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
