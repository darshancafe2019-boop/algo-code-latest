"use client";

import React, { useState } from "react";
import { Layers, Briefcase, Zap, Target, ArrowUpDown, ChevronRight } from "lucide-react";
import {
  StrategyPerformance,
  InstrumentPerformance,
  AssetClassPerformance,
} from "@/types/pnl-journal";

interface MultiDimensionAttributionDeskProps {
  strategyPerformance: StrategyPerformance[];
  instrumentPerformance: InstrumentPerformance[];
  assetClassPerformance: AssetClassPerformance[];
  currencySymbol?: string;
  onSelectFilter?: (type: "strategy" | "asset" | "symbol", val: string) => void;
}

export const MultiDimensionAttributionDesk: React.FC<MultiDimensionAttributionDeskProps> = ({
  strategyPerformance,
  instrumentPerformance,
  assetClassPerformance,
  currencySymbol = "₹",
  onSelectFilter,
}) => {
  const [activeTab, setActiveTab] = useState<"STRATEGY" | "INSTRUMENT" | "ASSET">("STRATEGY");

  const formatMoney = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    let str = "";
    if (absVal >= 100000) {
      str = `${(absVal / 100000).toFixed(1)}L`;
    } else if (absVal >= 1000) {
      str = `${(absVal / 1000).toFixed(1)}K`;
    } else {
      str = absVal.toFixed(0);
    }
    return `${isNeg ? "-" : "+"}${currencySymbol}${str}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur-md flex flex-col gap-3">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Multi-Dimensional Attribution Desk
            </h3>
            <p className="text-[11px] text-slate-400">
              Granular breakdown by strategy alpha, traded contracts, and asset segment
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("STRATEGY")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === "STRATEGY" ? "bg-teal-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            By Strategy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("INSTRUMENT")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === "INSTRUMENT" ? "bg-teal-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            By Instrument
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ASSET")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === "ASSET" ? "bg-teal-600 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            By Asset Class
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto rounded-lg border border-slate-800/80">
        <table className="w-full text-left text-xs font-mono select-none">
          <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Entity Name</th>
              <th className="py-2.5 px-3 font-semibold text-center">Trades</th>
              <th className="py-2.5 px-3 font-semibold text-center">Win Rate</th>
              <th className="py-2.5 px-3 font-semibold text-right">Gross P&L</th>
              <th className="py-2.5 px-3 font-semibold text-right">Charges</th>
              <th className="py-2.5 px-3 font-semibold text-right">Net P&L</th>
              <th className="py-2.5 px-3 font-semibold text-center">Profit Factor</th>
              <th className="py-2.5 px-3 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {activeTab === "STRATEGY" &&
              strategyPerformance.map((row) => (
                <tr key={row.strategy} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    {row.strategy}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-300">{row.totalTrades}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="font-semibold text-cyan-400">{row.winRate.toFixed(1)}%</span>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300 font-medium">
                    {formatMoney(row.netPnl + row.charges)}
                  </td>
                  <td className="py-2 px-3 text-right text-amber-400">
                    {currencySymbol}{row.charges.toFixed(2)}
                  </td>
                  <td className={`py-2 px-3 text-right font-bold ${
                    row.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {formatMoney(row.netPnl)}
                  </td>
                  <td className="py-2 px-3 text-center text-indigo-400 font-semibold">
                    {row.profitFactor ? row.profitFactor.toFixed(2) : "-"}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {onSelectFilter && (
                      <button
                        type="button"
                        onClick={() => onSelectFilter("strategy", row.strategy)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                      >
                        Filter
                      </button>
                    )}
                  </td>
                </tr>
              ))}

            {activeTab === "INSTRUMENT" &&
              instrumentPerformance.map((row) => (
                <tr key={row.symbol} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    {row.symbol}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-300">{row.totalTrades}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="font-semibold text-cyan-400">{row.winRate.toFixed(1)}%</span>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300 font-medium">
                    {formatMoney(row.netPnl + row.charges)}
                  </td>
                  <td className="py-2 px-3 text-right text-amber-400">
                    {currencySymbol}{row.charges.toFixed(2)}
                  </td>
                  <td className={`py-2 px-3 text-right font-bold ${
                    row.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {formatMoney(row.netPnl)}
                  </td>
                  <td className="py-2 px-3 text-center text-indigo-400 font-semibold">
                    {row.profitFactor ? row.profitFactor.toFixed(2) : "-"}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {onSelectFilter && (
                      <button
                        type="button"
                        onClick={() => onSelectFilter("symbol", row.symbol)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                      >
                        Filter
                      </button>
                    )}
                  </td>
                </tr>
              ))}

            {activeTab === "ASSET" &&
              assetClassPerformance.map((row) => (
                <tr key={row.assetClass} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-200 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    {row.assetClass}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-300">{row.totalTrades}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="font-semibold text-cyan-400">{row.winRate.toFixed(1)}%</span>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300 font-medium">
                    {formatMoney(row.netPnl + row.charges)}
                  </td>
                  <td className="py-2 px-3 text-right text-amber-400">
                    {currencySymbol}{row.charges.toFixed(2)}
                  </td>
                  <td className={`py-2 px-3 text-right font-bold ${
                    row.netPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {formatMoney(row.netPnl)}
                  </td>
                  <td className="py-2 px-3 text-center text-indigo-400 font-semibold">-</td>
                  <td className="py-2 px-3 text-center">
                    {onSelectFilter && (
                      <button
                        type="button"
                        onClick={() => onSelectFilter("asset", row.assetClass)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                      >
                        Filter
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
