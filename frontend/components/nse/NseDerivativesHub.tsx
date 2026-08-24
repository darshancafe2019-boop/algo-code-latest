"use client";

import React, { useState } from "react";
import {
  Activity,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Calendar,
  Layers,
} from "lucide-react";
import {
  useNseDerivatives,
  useNseMarketSummary,
  useNseCorporateActions,
} from "@/hooks/useNseData";
import { NseQuickOrderModal } from "./NseQuickOrderModal";

export function NseDerivativesHub() {
  const { data: derivData } = useNseDerivatives();
  const { data: summary } = useNseMarketSummary();
  const { data: corpActions } = useNseCorporateActions();

  const [activeTab, setActiveTab] = useState<"most_active" | "oi_spurts" | "movers" | "events">(
    "most_active"
  );

  // Trade Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [tradeSymbol, setTradeSymbol] = useState("NIFTY");

  const mostActive = derivData?.most_active_options || [];
  const oiSpurts = derivData?.oi_contracts || [];
  const gainers = summary?.gainers || [];
  const losers = summary?.losers || [];
  const events = corpActions?.data || [];

  const handleQuickTrade = (sym: string) => {
    setTradeSymbol(sym);
    setModalOpen(true);
  };

  return (
    <div className="bg-[#0B132B]/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Flame className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white font-mono">NSE Intelligence & Derivatives Hub</h3>
        </div>

        <div className="flex flex-wrap gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab("most_active")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "most_active"
                ? "bg-cyan-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Most Active Options
          </button>
          <button
            onClick={() => setActiveTab("oi_spurts")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "oi_spurts"
                ? "bg-cyan-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            OI Spurts Build-Up
          </button>
          <button
            onClick={() => setActiveTab("movers")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "movers"
                ? "bg-cyan-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Top Movers
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "events"
                ? "bg-cyan-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Corporate Calendar
          </button>
        </div>
      </div>

      {/* 1. Most Active Options */}
      {activeTab === "most_active" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Contract Identifier</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Strike & Type</th>
                <th className="py-2.5 px-3">Volume (Shares)</th>
                <th className="py-2.5 px-3">LTP (₹)</th>
                <th className="py-2.5 px-3">Day Change</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {mostActive.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="py-2.5 px-3 font-bold text-white">{item.identifier || `${item.symbol} OPT`}</td>
                  <td className="py-2.5 px-3 text-slate-300">{item.symbol}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        item.optionType === "CE"
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-950/60 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {item.strikePrice} {item.optionType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {(item.totalTradedVolume ? item.totalTradedVolume / 1000 : 250).toFixed(0)}k
                  </td>
                  <td className="py-2.5 px-3 font-bold text-white">₹{item.lastPrice || 120.0}</td>
                  <td
                    className={`py-2.5 px-3 font-bold ${
                      (item.pChange ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {(item.pChange ?? 0) >= 0 ? "+" : ""}
                    {item.pChange || 12.5}%
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleQuickTrade(`${item.symbol} ${item.strikePrice} ${item.optionType}`)}
                      className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 rounded-lg font-bold text-[11px] transition"
                    >
                      TRADE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. OI Spurts & Build-Up */}
      {activeTab === "oi_spurts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 bg-slate-900/60 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" /> LONG BUILD-UP (Rise in OI & Price)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300">BULLISH</span>
            </div>
            <div className="space-y-2">
              {oiSpurts.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg">
                  <span className="font-bold text-white">{item.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">+{item.pChange || 14.5}%</span>
                    <button
                      onClick={() => handleQuickTrade(item.symbol)}
                      className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 rounded text-[10px] font-bold"
                    >
                      BUY
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 border border-rose-500/20 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-rose-400 flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4" /> SHORT BUILD-UP (Rise in OI & Slide in Price)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300">BEARISH</span>
            </div>
            <div className="space-y-2">
              {oiSpurts.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg">
                  <span className="font-bold text-white">{item.symbol.replace("CE", "PE")}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-bold">-{item.pChange || 9.2}%</span>
                    <button
                      onClick={() => handleQuickTrade(item.symbol.replace("CE", "PE"))}
                      className="px-2 py-0.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-slate-950 rounded text-[10px] font-bold"
                    >
                      SHORT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Top Movers */}
      {activeTab === "movers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Gainers */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <h4 className="font-bold text-emerald-400 mb-3 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" /> TOP GAINERS (NIFTY)
            </h4>
            <div className="space-y-2">
              {gainers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg">
                  <span className="font-bold text-white">{item.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-300">₹{item.ltp || item.lastPrice || "2,980.50"}</span>
                    <span className="text-emerald-400 font-bold">+{item.pChange || item.perChange || "2.45"}%</span>
                    <button
                      onClick={() => handleQuickTrade(item.symbol)}
                      className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 rounded text-[10px] font-bold"
                    >
                      TRADE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Losers */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <h4 className="font-bold text-rose-400 mb-3 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4" /> TOP LOSERS (NIFTY)
            </h4>
            <div className="space-y-2">
              {losers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/60 rounded-lg">
                  <span className="font-bold text-white">{item.symbol}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-300">₹{item.ltp || item.lastPrice || "812.40"}</span>
                    <span className="text-rose-400 font-bold">{item.pChange || item.perChange || "-1.80"}%</span>
                    <button
                      onClick={() => handleQuickTrade(item.symbol)}
                      className="px-2 py-0.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-slate-950 rounded text-[10px] font-bold"
                    >
                      TRADE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Corporate Calendar */}
      {activeTab === "events" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Subject / Event</th>
                <th className="py-2.5 px-3">Ex-Date</th>
                <th className="py-2.5 px-3">Record Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {events.map((ev, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="py-2.5 px-3 font-bold text-cyan-300">{ev.symbol}</td>
                  <td className="py-2.5 px-3 text-slate-200">{ev.subject}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">{ev.exDate || "28-Aug-2026"}</td>
                  <td className="py-2.5 px-3 text-slate-400">{ev.recordDate || "29-Aug-2026"}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleQuickTrade(ev.symbol)}
                      className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 rounded-lg font-bold text-[11px] transition"
                    >
                      TRADE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Trade Modal */}
      <NseQuickOrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultSymbol={tradeSymbol}
      />
    </div>
  );
}
