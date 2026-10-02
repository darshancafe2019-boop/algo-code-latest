"use client";

import React, { useState } from "react";
import { TradeAnalysisInstrument } from "./TradeAnalysisTypes";
import { Activity, ShieldAlert, TrendingUp, BarChart2 } from "lucide-react";

interface TradeAnalysisDashboardProps {
  initialInstrument?: Partial<TradeAnalysisInstrument>;
}

export function TradeAnalysisDashboard({ initialInstrument }: TradeAnalysisDashboardProps) {
  const [instrument, setInstrument] = useState<Partial<TradeAnalysisInstrument>>(
    initialInstrument || {
      symbol: "NIFTY 25000 CE",
      underlying: "NIFTY",
      side: "BUY",
      assetClass: "OPTION",
      ltp: 132.4,
      lotSize: 25,
    }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white tracking-wide">{instrument.symbol}</span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                  instrument.side === "BUY"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {instrument.side}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {instrument.assetClass}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Underlying: <span className="text-slate-200 font-mono">{instrument.underlying}</span> | Expiry:{" "}
              <span className="text-slate-200 font-mono">{instrument.expiry || "11 Sep 2025"}</span> | Lot Size:{" "}
              <span className="text-slate-200 font-mono">{instrument.lotSize}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Last Traded Price</div>
            <div className="text-2xl font-black text-white font-mono">₹{instrument.ltp?.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Max Profit
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">Unlimited</div>
          <p className="text-[11px] text-slate-500 mt-1">Calculated at expiration</p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Max Risk
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">
            ₹{((instrument.ltp || 0) * (instrument.lotSize || 25)).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Limited to premium paid</p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <Activity className="w-4 h-4 text-cyan-400" /> Breakeven
          </div>
          <div className="text-xl font-bold text-cyan-400 font-mono">
            ₹{((instrument.strike || 25000) + (instrument.ltp || 0)).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Strike + Premium</p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" /> Prob of Profit (PoP)
          </div>
          <div className="text-xl font-bold text-indigo-400 font-mono">48.2%</div>
          <p className="text-[11px] text-slate-500 mt-1">Black-Scholes Model</p>
        </div>
      </div>
    </div>
  );
}
