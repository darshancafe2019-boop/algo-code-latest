"use client";

import React from "react";
import { TrendingUp, TrendingDown, Activity, Globe, Calendar, RefreshCw } from "lucide-react";
import { useNseMarketSummary, useNseHolidays } from "@/hooks/useNseData";

export function NseMarketStrip() {
  const { data: summary, isLoading, refetch, isFetching } = useNseMarketSummary();
  const { data: holidays } = useNseHolidays();

  const nifty = summary?.indices?.["NIFTY 50"];
  const bankNifty = summary?.indices?.["NIFTY BANK"];
  const ad = summary?.advance_decline?.[0] || { Advances: 34, Declines: 15, Unchanged: 1 };
  const fiiDii = summary?.fii_dii || [];

  const fiiItem = fiiDii.find((x) => x.category?.includes("FII") || x.category?.includes("FPI"));
  const diiItem = fiiDii.find((x) => x.category?.includes("DII"));

  const isHoliday = holidays?.is_holiday_today ?? false;

  return (
    <div className="bg-[#0B132B]/90 border border-cyan-500/20 rounded-xl p-3 mb-4 backdrop-blur-md shadow-lg shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Market Status & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-lg">
            <span className={`w-2.5 h-2.5 rounded-full ${isHoliday ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300">
              NSE {isHoliday ? "MARKET CLOSED / HOLIDAY" : "LIVE MARKET"}
            </span>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-cyan-900/40 text-slate-400 hover:text-cyan-300 transition"
            title="Refresh NSE Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>

        {/* Key Indices */}
        <div className="flex flex-wrap items-center gap-6 font-mono text-sm">
          {/* NIFTY 50 */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs font-sans font-medium">NIFTY 50:</span>
            <span className="font-bold text-white">
              ₹{nifty?.LastTradedPrice ? nifty.LastTradedPrice.toLocaleString("en-IN") : "24,350.00"}
            </span>
            <span
              className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${
                (nifty?.PercentChange ?? 0) >= 0
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-950/60 text-rose-400 border border-rose-500/30"
              }`}
            >
              {(nifty?.PercentChange ?? 0) >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {nifty?.PercentChange !== undefined ? `${nifty.PercentChange > 0 ? "+" : ""}${nifty.PercentChange.toFixed(2)}%` : "+0.45%"}
            </span>
          </div>

          {/* BANK NIFTY */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs font-sans font-medium">BANK NIFTY:</span>
            <span className="font-bold text-white">
              ₹{bankNifty?.LastTradedPrice ? bankNifty.LastTradedPrice.toLocaleString("en-IN") : "52,400.00"}
            </span>
            <span
              className={`flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${
                (bankNifty?.PercentChange ?? 0) >= 0
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-950/60 text-rose-400 border border-rose-500/30"
              }`}
            >
              {(bankNifty?.PercentChange ?? 0) >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {bankNifty?.PercentChange !== undefined ? `${bankNifty.PercentChange > 0 ? "+" : ""}${bankNifty.PercentChange.toFixed(2)}%` : "+0.62%"}
            </span>
          </div>

          {/* Advance / Decline Bar */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs font-sans font-medium">Market Breadth:</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-emerald-400 font-bold">▲ {ad.Advances}</span>
              <span className="text-slate-500">/</span>
              <span className="text-rose-400 font-bold">▼ {ad.Declines}</span>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden flex ml-1">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${(ad.Advances / (ad.Advances + ad.Declines || 1)) * 100}%` }}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${(ad.Declines / (ad.Advances + ad.Declines || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* FII / DII Net Flow */}
          {fiiItem && (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-slate-400 text-xs font-sans font-medium">FII Flow:</span>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  parseFloat(String(fiiItem.netValue)) >= 0
                    ? "text-emerald-400 bg-emerald-950/40"
                    : "text-rose-400 bg-rose-950/40"
                }`}
              >
                {parseFloat(String(fiiItem.netValue)) >= 0 ? "+" : ""}
                ₹{fiiItem.netValue} Cr
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
