"use client";

import React, { useState } from "react";
import { Table, TrendingUp, TrendingDown, Clock, ShieldCheck, DollarSign } from "lucide-react";
import { ScenarioRow } from "@/lib/derivatives/profitEngine";

interface ScenarioAnalysisGridProps {
  scenarios: ScenarioRow[];
  currency: string;
  onCustomPriceChange?: (price: number) => void;
  customPrice?: number;
}

export const ScenarioAnalysisGrid: React.FC<ScenarioAnalysisGridProps> = ({
  scenarios,
  currency,
  onCustomPriceChange,
  customPrice,
}) => {
  const [activeHorizon, setActiveHorizon] = useState<"expiry" | "1d" | "3d" | "7d">("expiry");
  const [inputVal, setInputVal] = useState<string>(customPrice ? String(customPrice) : "");

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(inputVal);
    if (!isNaN(val) && val > 0 && onCustomPriceChange) {
      onCustomPriceChange(val);
    }
  };

  return (
    <div className="bg-[#0B1118] border border-[#1E293B] rounded-2xl overflow-hidden shadow-lg mt-4">
      {/* Header with Horizon Selection */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E293B] bg-[#0F172A]/70 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[#38BDF8]" />
          <span className="font-mono font-bold text-xs text-white uppercase tracking-wider">
            Multi-Horizon Scenario Payoff Grid (-20% to +20%)
          </span>
        </div>

        {/* Time Horizon Pills */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveHorizon("expiry")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-all ${
              activeHorizon === "expiry"
                ? "bg-[#38BDF8] text-black font-bold shadow-sm"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            At Expiry
          </button>
          <button
            type="button"
            onClick={() => setActiveHorizon("1d")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-all ${
              activeHorizon === "1d"
                ? "bg-[#38BDF8] text-black font-bold shadow-sm"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            1 Day Before
          </button>
          <button
            type="button"
            onClick={() => setActiveHorizon("3d")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-all ${
              activeHorizon === "3d"
                ? "bg-[#38BDF8] text-black font-bold shadow-sm"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            3 Days Before
          </button>
          <button
            type="button"
            onClick={() => setActiveHorizon("7d")}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-all ${
              activeHorizon === "7d"
                ? "bg-[#38BDF8] text-black font-bold shadow-sm"
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            7 Days Before
          </button>
        </div>
      </div>

      {/* Custom Price Probe Bar */}
      <div className="px-5 py-2.5 bg-black/20 border-b border-[#1E293B]/60 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[11px] text-[#94A3B8] font-mono">
          Simulated Underlying Price Probe:
        </span>
        <form onSubmit={handleApplyCustom} className="flex items-center gap-2">
          <input
            type="number"
            step="any"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Custom Price..."
            className="w-36 bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-1 text-xs font-mono text-white placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-[#1E293B] hover:bg-[#38BDF8]/20 border border-[#334155] hover:border-[#38BDF8]/50 text-xs font-mono text-white rounded-lg transition-all"
          >
            Probe Price
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-[#0F172A] text-[#94A3B8] border-b border-[#1E293B] z-10">
            <tr>
              <th className="py-2.5 px-4">Shock</th>
              <th className="py-2.5 px-4">Underlying</th>
              <th className="py-2.5 px-4">Strategy P&L</th>
              <th className="py-2.5 px-4">ROI %</th>
              <th className="py-2.5 px-4">Delta</th>
              <th className="py-2.5 px-4">Theta</th>
              <th className="py-2.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/40">
            {scenarios.map((row, idx) => {
              const pnl =
                activeHorizon === "expiry"
                  ? row.pnlAtExpiry
                  : activeHorizon === "1d"
                  ? row.pnl1dBefore
                  : activeHorizon === "3d"
                  ? row.pnl3dBefore
                  : row.pnl7dBefore;

              const isProfitable = pnl > 0;
              const isLoss = pnl < 0;
              const isCurrent = row.scenario === "CURRENT";

              return (
                <tr
                  key={idx}
                  className={`hover:bg-[#1E293B]/30 transition-colors ${
                    isCurrent ? "bg-[#38BDF8]/5 font-bold" : ""
                  }`}
                >
                  <td className="py-2 px-4 text-[#E2E8F0]">{row.scenario}</td>
                  <td className="py-2 px-4 text-white">
                    {currency} {row.underlyingPrice.toLocaleString()}
                  </td>
                  <td
                    className={`py-2 px-4 font-bold ${
                      isProfitable ? "text-[#10B981]" : isLoss ? "text-[#EF4444]" : "text-[#94A3B8]"
                    }`}
                  >
                    {isProfitable ? "+" : ""}
                    {currency} {pnl.toLocaleString()}
                  </td>
                  <td
                    className={`py-2 px-4 ${
                      isProfitable ? "text-[#10B981]" : isLoss ? "text-[#EF4444]" : "text-[#94A3B8]"
                    }`}
                  >
                    {row.roiPct > 0 ? "+" : ""}
                    {row.roiPct.toFixed(1)}%
                  </td>
                  <td className="py-2 px-4 text-[#94A3B8]">{row.delta.toFixed(3)}</td>
                  <td className="py-2 px-4 text-[#94A3B8]">{row.theta.toFixed(2)}</td>
                  <td className="py-2 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isProfitable
                          ? "bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30"
                          : isLoss
                          ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30"
                          : "bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30"
                      }`}
                    >
                      {row.riskStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
