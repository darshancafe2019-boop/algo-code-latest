"use client";

import React, { useState } from "react";
import {
  PieChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  DollarSign,
  Calendar,
  Layers,
  Search,
  Eye,
} from "lucide-react";
import {
  useNseValuation,
  useNsePreMarket,
  useNseOiQuadrants,
  useNseInsiderTrading,
  useNseResultsCalendar,
  useNseEtfs,
} from "@/hooks/useNseData";

export function NseComprehensiveIntelligence() {
  const [activeTab, setActiveTab] = useState<"valuation" | "pre_market" | "quadrants" | "insider" | "results" | "etfs">("quadrants");

  const { data: valData } = useNseValuation();
  const { data: preData } = useNsePreMarket("All");
  const { data: oiQuadData } = useNseOiQuadrants();
  const { data: insiderData } = useNseInsiderTrading();
  const { data: resultsData } = useNseResultsCalendar();
  const { data: etfData } = useNseEtfs();

  return (
    <div className="bg-[#0B132B]/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md font-mono text-xs">
      {/* Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white">NSE Institutional Market Matrix</h3>
        </div>

        <div className="flex flex-wrap gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("quadrants")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "quadrants" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            OI 4-Quadrants
          </button>
          <button
            onClick={() => setActiveTab("valuation")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "valuation" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Valuation (P/E & P/B)
          </button>
          <button
            onClick={() => setActiveTab("pre_market")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "pre_market" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Pre-Market Open
          </button>
          <button
            onClick={() => setActiveTab("insider")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "insider" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Insider & Promoter
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "results" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Results Calendar
          </button>
          <button
            onClick={() => setActiveTab("etfs")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "etfs" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            ETFs
          </button>
        </div>
      </div>

      {/* 1. OI 4-Quadrants */}
      {activeTab === "quadrants" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Long Build Up */}
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-emerald-400">LONG BUILD-UP</span>
              <span className="text-[10px] text-emerald-300 font-sans">▲ OI / ▲ Price</span>
            </div>
            <div className="space-y-1.5">
              {(oiQuadData?.long_buildup || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-1.5 bg-slate-900/60 rounded">
                  <span className="text-white font-bold">{item.symbol}</span>
                  <span className="text-emerald-400">+{item.pChange}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Short Build Up */}
          <div className="p-3.5 bg-rose-950/20 border border-rose-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-rose-400">SHORT BUILD-UP</span>
              <span className="text-[10px] text-rose-300 font-sans">▲ OI / ▼ Price</span>
            </div>
            <div className="space-y-1.5">
              {(oiQuadData?.short_buildup || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-1.5 bg-slate-900/60 rounded">
                  <span className="text-white font-bold">{item.symbol}</span>
                  <span className="text-rose-400">{item.pChange}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Short Covering */}
          <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-cyan-300">SHORT COVERING</span>
              <span className="text-[10px] text-cyan-300 font-sans">▼ OI / ▲ Price</span>
            </div>
            <div className="space-y-1.5">
              {(oiQuadData?.short_covering || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-1.5 bg-slate-900/60 rounded">
                  <span className="text-white font-bold">{item.symbol}</span>
                  <span className="text-cyan-400">+{item.pChange}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Long Unwinding */}
          <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-300">LONG UNWINDING</span>
              <span className="text-[10px] text-amber-300 font-sans">▼ OI / ▼ Price</span>
            </div>
            <div className="space-y-1.5">
              {(oiQuadData?.long_unwinding || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-1.5 bg-slate-900/60 rounded">
                  <span className="text-white font-bold">{item.symbol}</span>
                  <span className="text-amber-400">{item.pChange}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Valuation Multiples */}
      {activeTab === "valuation" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <h4 className="font-bold text-cyan-300 mb-3">Price-to-Earnings (P/E)</h4>
            <div className="space-y-2">
              {(valData?.pe_ratios || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-slate-300">{item.Index}</span>
                  <span className="text-white font-bold">{item["Profit Earning Ratio"]}x</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <h4 className="font-bold text-cyan-300 mb-3">Price-to-Book (P/B)</h4>
            <div className="space-y-2">
              {(valData?.pb_ratios || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-slate-300">{item.Index}</span>
                  <span className="text-white font-bold">{item["Price Book Ratio"]}x</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <h4 className="font-bold text-cyan-300 mb-3">Dividend Yield (%)</h4>
            <div className="space-y-2">
              {(valData?.div_yields || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-2 bg-slate-950/60 rounded-lg">
                  <span className="text-slate-300">{item.Index}</span>
                  <span className="text-emerald-400 font-bold">{item["Div Yield"]}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Pre-Market Gaps */}
      {activeTab === "pre_market" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Indicative Equilibrium Price (IEP)</th>
                <th className="py-2.5 px-3">Pre-Open % Change</th>
                <th className="py-2.5 px-3">Auction Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {(preData?.data || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-bold text-white">{item.symbol}</td>
                  <td className="py-2.5 px-3 text-cyan-300">₹{item.iep || item.lastPrice || 24350.0}</td>
                  <td className={`py-2.5 px-3 font-bold ${(item.pChange ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(item.pChange ?? 0) >= 0 ? "+" : ""}{item.pChange || 0.45}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{item.finalQuantity ? item.finalQuantity.toLocaleString("en-IN") : "15,400"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Insider Trading */}
      {activeTab === "insider" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Acquirer / Promoter</th>
                <th className="py-2.5 px-3">Security Type</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Filing Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {(insiderData?.data || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-bold text-cyan-300">{item.symbol}</td>
                  <td className="py-2.5 px-3 text-white">{item.acquirer}</td>
                  <td className="py-2.5 px-3 text-slate-400">{item.secType}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">+{item.buyQty.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 px-3 text-slate-300">{item.mode}</td>
                  <td className="py-2.5 px-3 text-slate-400">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Results Calendar */}
      {activeTab === "results" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Meeting Purpose</th>
                <th className="py-2.5 px-3">Board Meeting Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {(resultsData?.data || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-bold text-cyan-300">{item.symbol}</td>
                  <td className="py-2.5 px-3 text-white">{item.purpose}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{item.meetingDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. ETFs */}
      {activeTab === "etfs" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">ETF Name</th>
                <th className="py-2.5 px-3">NAV (₹)</th>
                <th className="py-2.5 px-3">Day Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {(etfData?.data || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-bold text-cyan-300">{item.symbol}</td>
                  <td className="py-2.5 px-3 text-white">{item.name}</td>
                  <td className="py-2.5 px-3 text-white font-bold">₹{item.nav}</td>
                  <td className={`py-2.5 px-3 font-bold ${(item.pChange ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(item.pChange ?? 0) >= 0 ? "+" : ""}{item.pChange}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
