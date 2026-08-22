"use client";

import React, { useState } from "react";
import { Search, Zap, Flame, Activity, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { OptionStrikeRow } from "@/types/option-chain";

interface OptionsScannerViewProps {
  strikes: OptionStrikeRow[];
  spotPrice: number;
  currency?: string;
  onSelectOption: (strike: number, type: "CE" | "PE", quote: any) => void;
}

export function OptionsScannerView({
  strikes,
  spotPrice,
  currency = "₹",
  onSelectOption,
}: OptionsScannerViewProps) {
  const [scanType, setScanType] = useState<"oi_spike" | "volume" | "high_iv" | "tight_spread">("oi_spike");

  if (!strikes || strikes.length === 0) return null;

  // Derive scanning results from strikes
  const flattenedOptions: { strike: number; type: "CE" | "PE"; quote: any; score: number }[] = [];

  strikes.forEach((s) => {
    if (s.ce) {
      const oiScore = (s.ce.open_interest || 0) * (s.ce.iv || 1);
      flattenedOptions.push({ strike: s.strike, type: "CE", quote: s.ce, score: oiScore });
    }
    if (s.pe) {
      const oiScore = (s.pe.open_interest || 0) * (s.pe.iv || 1);
      flattenedOptions.push({ strike: s.strike, type: "PE", quote: s.pe, score: oiScore });
    }
  });

  // Sort based on scanType
  const sorted = [...flattenedOptions].sort((a, b) => {
    if (scanType === "volume") return (b.quote.volume || 0) - (a.quote.volume || 0);
    if (scanType === "high_iv") return (b.quote.iv || 0) - (a.quote.iv || 0);
    if (scanType === "tight_spread") return (a.quote.spread || 999) - (b.quote.spread || 999);
    return (b.quote.open_interest || 0) - (a.quote.open_interest || 0);
  }).slice(0, 10);

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
      {/* Scanner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              QUANTITATIVE OPTIONS RADAR & SCANNER
            </h2>
            <p className="text-xs text-slate-400">Institutional momentum, open interest spikes, and unusual volume alerts</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center bg-[#141E33] border border-slate-700 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setScanType("oi_spike")}
            className={`px-3 py-1 rounded font-bold transition-all ${
              scanType === "oi_spike" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            OI Spikes
          </button>
          <button
            onClick={() => setScanType("volume")}
            className={`px-3 py-1 rounded font-bold transition-all ${
              scanType === "volume" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Volume Surges
          </button>
          <button
            onClick={() => setScanType("high_iv")}
            className={`px-3 py-1 rounded font-bold transition-all ${
              scanType === "high_iv" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            High IV
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080D17]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Contract</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5 text-right">LTP</th>
              <th className="p-2.5 text-right">OI (Contracts)</th>
              <th className="p-2.5 text-right">Volume</th>
              <th className="p-2.5 text-right">IV%</th>
              <th className="p-2.5 text-right text-cyan-400">Δ Delta</th>
              <th className="p-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {sorted.map((item, idx) => (
              <tr key={`${item.strike}-${item.type}-${idx}`} className="hover:bg-[#141E33]">
                <td className="p-2.5 font-bold text-white">
                  {currency}{item.strike.toLocaleString()}
                </td>
                <td className="p-2.5">
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      item.type === "CE" ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {item.type === "CE" ? "CALL (CE)" : "PUT (PE)"}
                  </span>
                </td>
                <td className="p-2.5 text-right font-bold text-white">
                  {currency}{item.quote.ltp?.toFixed(2)}
                </td>
                <td className="p-2.5 text-right font-semibold text-slate-300">
                  {((item.quote.open_interest || 0) / 1000).toFixed(1)}k
                </td>
                <td className="p-2.5 text-right text-slate-400">
                  {(item.quote.volume || 0).toLocaleString()}
                </td>
                <td className="p-2.5 text-right text-purple-400 font-bold">
                  {item.quote.iv ? `${item.quote.iv.toFixed(1)}%` : "N/A"}
                </td>
                <td className="p-2.5 text-right text-cyan-400 font-bold">
                  {item.quote.delta?.toFixed(2) || "0.00"}
                </td>
                <td className="p-2.5 text-center">
                  <button
                    onClick={() => onSelectOption(item.strike, item.type, item.quote)}
                    className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold transition-all flex items-center gap-0.5 mx-auto"
                  >
                    <span>Trade</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
