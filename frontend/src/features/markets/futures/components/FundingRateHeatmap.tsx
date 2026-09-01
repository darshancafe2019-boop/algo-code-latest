"use client";

import React from "react";
import { Sparkles, Clock, TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import { FundingHeatmapItem } from "../types/futures";
import { useFuturesStore } from "../state/futures-store";

interface FundingRateHeatmapProps {
  data: FundingHeatmapItem[];
  isLoading: boolean;
}

export function FundingRateHeatmap({ data, isLoading }: FundingRateHeatmapProps) {
  const { setSelectedContract, setDetailsDrawerOpen } = useFuturesStore();

  if (isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-[#0B132B] border border-slate-800 rounded-2xl">
        <Activity className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-xs font-mono text-slate-400">Loading live funding rate &amp; APR matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        <div>
          <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Funding Rate &amp; Cash-and-Carry Arbitrage Matrix
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Perpetual funding rate APR yields updated in real-time. Longs pay shorts when funding is positive.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" /> 8h Funding Epochs
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.map((item) => {
          const isHighYield = item.apr > 12.0;
          const isNegative = item.apr < 0;

          return (
            <div
              key={item.symbol}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-[#0B132B] hover:bg-slate-800/60 ${
                isHighYield
                  ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : isNegative
                  ? "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-mono text-sm">{item.symbol}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 border border-slate-700 text-slate-400">
                  {item.countdown}
                </span>
              </div>

              <div className="mt-3 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Mark Price</span>
                  <span className="text-white font-bold">${item.markPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>8h Rate</span>
                  <span className="text-slate-200 font-bold">{(item.rate8h * 100).toFixed(4)}%</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>Annualized APR</span>
                  <span
                    className={`font-black text-sm ${
                      item.apr >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {item.apr >= 0 ? `+${item.apr}%` : `${item.apr}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
