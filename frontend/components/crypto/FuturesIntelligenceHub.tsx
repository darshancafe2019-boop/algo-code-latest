"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  LineChart,
  Grid,
  TrendingUp,
  Download,
  Clock,
  Compass,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  TermStructureResponse,
  FundingHeatmapResponse,
  OpenInterestAnalyticsResponse,
} from "@/types/futures-terminal";

interface Props {
  underlying: string;
}

export function FuturesIntelligenceHub({ underlying }: Props) {
  const [activeTab, setActiveTab] = useState<"TERM_STRUCTURE" | "FUNDING_HEATMAP" | "OI_ANALYTICS">("TERM_STRUCTURE");

  // Fetch Term Structure
  const { data: termStructure, isLoading: isTsLoading, refetch: refetchTs } = useQuery<TermStructureResponse>({
    queryKey: ["futuresTermStructure", underlying],
    queryFn: async () => {
      const res = await fetch(`/api/futures/term-structure?underlying=${underlying}`);
      if (!res.ok) throw new Error("Failed to load term structure");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch Funding Heatmap
  const { data: fundingHeatmap, isLoading: isHmLoading } = useQuery<FundingHeatmapResponse>({
    queryKey: ["futuresFundingHeatmap"],
    queryFn: async () => {
      const res = await fetch("/api/futures/funding-heatmap");
      if (!res.ok) throw new Error("Failed to load funding heatmap");
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch OI Analytics
  const { data: oiAnalytics, isLoading: isOiLoading } = useQuery<OpenInterestAnalyticsResponse>({
    queryKey: ["futuresOiAnalytics", underlying],
    queryFn: async () => {
      const res = await fetch(`/api/futures/open-interest-analytics?underlying=${underlying}`);
      if (!res.ok) throw new Error("Failed to load OI analytics");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const handleExportCSV = () => {
    window.open(`/api/futures/export?underlying=${underlying}&format=csv`, "_blank");
  };

  return (
    <div className="bg-[#0B101B] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col font-mono text-xs select-none">
      {/* Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Derivatives Market Intelligence
          </h3>
        </div>

        {/* Tab Switchers & Export Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#131B2A] p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveTab("TERM_STRUCTURE")}
              className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "TERM_STRUCTURE"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LineChart className="w-3 h-3" />
              <span>Term Structure</span>
            </button>

            <button
              onClick={() => setActiveTab("FUNDING_HEATMAP")}
              className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "FUNDING_HEATMAP"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Funding Heatmap</span>
            </button>

            <button
              onClick={() => setActiveTab("OI_ANALYTICS")}
              className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "OI_ANALYTICS"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>OI Positioning</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="p-1.5 rounded-lg bg-[#131B2A] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-1 text-[11px]"
            title="Export CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* 1. Term Structure Curve View */}
      {activeTab === "TERM_STRUCTURE" && (
        <div>
          {isTsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading futures curve points...</span>
            </div>
          ) : (
            <div>
              {/* Regime Summary Card */}
              <div className="bg-[#131B2A] p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Curve Structure</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border ${
                        termStructure?.regime === "CONTANGO"
                          ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                          : termStructure?.regime === "BACKWARDATION"
                          ? "bg-amber-950/50 text-amber-300 border-amber-500/30"
                          : "bg-blue-950/50 text-blue-300 border-blue-500/30"
                      }`}
                    >
                      {termStructure?.regime || "CONTANGO"}
                    </span>
                    <span className="text-[11px] text-slate-300">
                      {termStructure?.regime_description}
                    </span>
                  </div>
                </div>

                <div className="text-right text-[11px]">
                  <span className="text-slate-400 block">Spot Reference:</span>
                  <span className="text-white font-bold">
                    ${termStructure?.spot_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Curve Points Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {termStructure?.curve_points.map((pt, i) => (
                  <div
                    key={i}
                    className="bg-[#131B2A] p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <span className="text-[10px] text-blue-400 font-bold block">{pt.label}</span>
                    <span className="text-sm font-bold text-white block mt-0.5">
                      ${pt.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800/60">
                      <span>Basis:</span>
                      <span className={pt.basis >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                        {pt.basis >= 0 ? `+$${pt.basis.toFixed(1)}` : `-$${Math.abs(pt.basis).toFixed(1)}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>APR:</span>
                      <span className="text-slate-300">
                        {pt.annualized_basis_pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Funding Heatmap View */}
      {activeTab === "FUNDING_HEATMAP" && (
        <div>
          {isHmLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading multi-exchange funding rates...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-[#0d1424]">
                    <th className="py-2.5 px-3">Asset</th>
                    {fundingHeatmap?.exchanges.map((ex) => (
                      <th key={ex} className="py-2.5 px-3 text-right">
                        {ex} (8H / APR)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fundingHeatmap?.matrix.map((row) => (
                    <tr key={row.underlying} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-bold text-white">
                        {row.underlying}/USDT
                      </td>
                      {fundingHeatmap.exchanges.map((ex) => {
                        const r = row.rates[ex];
                        if (!r) return <td key={ex} className="py-2.5 px-3 text-right text-slate-600">—</td>;
                        const isHigh = r.funding_rate_pct > 0.015;
                        const isNegative = r.funding_rate_pct < 0;

                        return (
                          <td key={ex} className="py-2.5 px-3 text-right font-mono">
                            <span
                              className={`font-bold block ${
                                isHigh
                                  ? "text-emerald-400"
                                  : isNegative
                                  ? "text-rose-400"
                                  : "text-slate-300"
                              }`}
                            >
                              {r.funding_rate_pct >= 0 ? `+${r.funding_rate_pct.toFixed(4)}%` : `${r.funding_rate_pct.toFixed(4)}%`}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {r.apr_pct.toFixed(1)}% APR
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Open Interest Analytics View */}
      {activeTab === "OI_ANALYTICS" && (
        <div>
          {isOiLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Evaluating open interest intelligence...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Primary OI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-[#131B2A] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Open Interest</span>
                  <span className="text-sm font-bold text-white block mt-0.5">
                    ${((oiAnalytics?.open_interest_usd || 0) / 1_000_000).toFixed(2)}M
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {oiAnalytics?.current_oi.toLocaleString()} {underlying}
                  </span>
                </div>

                <div className="bg-[#131B2A] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">24H OI Change</span>
                  <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                    +{oiAnalytics?.oi_change_24h_pct}%
                  </span>
                  <span className="text-[10px] text-slate-500">7D Trend: Upward</span>
                </div>

                <div className="bg-[#131B2A] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Positioning Bias</span>
                  <span className="text-sm font-bold text-blue-400 block mt-0.5">
                    {oiAnalytics?.signal_bias}
                  </span>
                  <span className="text-[10px] text-slate-500">Institutional Flow</span>
                </div>
              </div>

              {/* Interpretation Matrix Card */}
              <div className="bg-[#131B2A] p-3 rounded-lg border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    OI × Price Regime Interpretation
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {oiAnalytics?.interpretation}
                  </span>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {oiAnalytics?.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
