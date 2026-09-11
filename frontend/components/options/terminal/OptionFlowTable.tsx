"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  Flame,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { OptionFlowTrade } from "@/types/option-terminal";
import {
  formatIndianCurrency,
  formatIndianQuantity,
} from "@/lib/options/options-analytics-engine";

interface OptionFlowTableProps {
  flowTrades: OptionFlowTrade[];
  currency?: string;
  onSelectTrade?: (trade: OptionFlowTrade) => void;
}

export const OptionFlowTable: React.FC<OptionFlowTableProps> = ({
  flowTrades,
  currency = "₹",
  onSelectTrade,
}) => {
  const [filterSentiment, setFilterSentiment] = useState<"ALL" | "BULLISH" | "BEARISH" | "NEUTRAL">("ALL");
  const [filterUnusualOnly, setFilterUnusualOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTrades = useMemo(() => {
    return flowTrades.filter((t) => {
      if (filterSentiment !== "ALL" && t.sentiment !== filterSentiment) return false;
      if (filterUnusualOnly && t.signalType !== "UNUSUAL_ACTIVITY" && t.signalType !== "LARGE_ACTIVITY") return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchSym = t.symbol.toLowerCase().includes(q);
        const matchStrike = t.strike.toString().includes(q);
        const matchSide = t.side.toLowerCase().includes(q);
        if (!matchSym && !matchStrike && !matchSide) return false;
      }
      return true;
    });
  }, [flowTrades, filterSentiment, filterUnusualOnly, searchQuery]);

  return (
    <div className="bg-[#090E17] border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl font-mono text-xs">
      {/* Header Toolbar */}
      <div className="p-3 bg-[#0B1222] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white text-sm">Real-Time Options Order Flow Stream</span>
          <span className="text-[10px] text-slate-400">({filteredTrades.length} trades)</span>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {[
              { id: "ALL", label: "All" },
              { id: "BULLISH", label: "Bullish" },
              { id: "BEARISH", label: "Bearish" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilterSentiment(btn.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                  filterSentiment === btn.id
                    ? btn.id === "BULLISH"
                      ? "bg-emerald-500 text-slate-950"
                      : btn.id === "BEARISH"
                      ? "bg-rose-500 text-white"
                      : "bg-cyan-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Unusual Toggle */}
          <button
            type="button"
            onClick={() => setFilterUnusualOnly(!filterUnusualOnly)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
              filterUnusualOnly
                ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-3 h-3 text-orange-400" />
            <span>Unusual Only</span>
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flow..."
              className="pl-6 pr-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Dense Flow Table */}
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-[#060A12] border-b border-slate-800 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="py-2 px-3 text-left">Time</th>
              <th className="py-2 px-3 text-left">Symbol</th>
              <th className="py-2 px-2 text-center">Type</th>
              <th className="py-2 px-2 text-center">Side</th>
              <th className="py-2 px-3 text-right">Strike</th>
              <th className="py-2 px-2 text-center">Money</th>
              <th className="py-2 px-3 text-right">Price</th>
              <th className="py-2 px-3 text-right text-cyan-300">Premium</th>
              <th className="py-2 px-3 text-right">Size (Lots)</th>
              <th className="py-2 px-3 text-right">OI</th>
              <th className="py-2 px-2 text-right">Vol/OI</th>
              <th className="py-2 px-2 text-right">IV%</th>
              <th className="py-2 px-2 text-right">Delta</th>
              <th className="py-2 px-3 text-center">Sentiment</th>
              <th className="py-2 px-3 text-left">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-10 text-center text-slate-500">
                  No options flow trades matching criteria.
                </td>
              </tr>
            ) : (
              filteredTrades.map((trade) => {
                const isCall = trade.optionType === "CE" || trade.optionType === "CALL";
                const isBullish = trade.sentiment === "BULLISH";
                const isBearish = trade.sentiment === "BEARISH";
                const isUnusual = trade.signalType === "UNUSUAL_ACTIVITY";

                return (
                  <tr
                    key={trade.id}
                    onClick={() => onSelectTrade?.(trade)}
                    className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      isUnusual ? "bg-orange-950/10" : ""
                    }`}
                  >
                    {/* Time */}
                    <td className="py-1.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {trade.time}
                    </td>

                    {/* Symbol */}
                    <td className="py-1.5 px-3 font-bold text-white whitespace-nowrap">
                      {trade.symbol}
                    </td>

                    {/* Option Type Badge */}
                    <td className="py-1.5 px-2 text-center">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                          isCall
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {isCall ? "CALL" : "PUT"}
                      </span>
                    </td>

                    {/* Side */}
                    <td className="py-1.5 px-2 text-center">
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                          trade.side === "BUY"
                            ? "text-emerald-400 bg-emerald-500/10"
                            : "text-rose-400 bg-rose-500/10"
                        }`}
                      >
                        {trade.side}
                      </span>
                    </td>

                    {/* Strike */}
                    <td className="py-1.5 px-3 text-right font-bold text-slate-100">
                      {trade.strike.toLocaleString("en-IN")}
                    </td>

                    {/* Moneyness */}
                    <td className="py-1.5 px-2 text-center text-[10px]">
                      <span
                        className={`px-1 rounded ${
                          trade.moneyness === "ITM"
                            ? "bg-purple-500/20 text-purple-300 font-bold"
                            : trade.moneyness === "ATM"
                            ? "bg-cyan-500/20 text-cyan-300 font-bold"
                            : "text-slate-500"
                        }`}
                      >
                        {trade.moneyness}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-1.5 px-3 text-right font-bold text-slate-200">
                      {formatIndianCurrency(trade.price, currency)}
                    </td>

                    {/* Premium Turnover */}
                    <td className="py-1.5 px-3 text-right font-extrabold text-cyan-300">
                      {formatIndianCurrency(trade.premium, currency)}
                    </td>

                    {/* Size & Lots */}
                    <td className="py-1.5 px-3 text-right text-slate-300">
                      <span>{formatIndianQuantity(trade.size)}</span>
                      <span className="text-[10px] text-slate-500 block">({trade.lots}L)</span>
                    </td>

                    {/* OI */}
                    <td className="py-1.5 px-3 text-right text-slate-400">
                      {formatIndianQuantity(trade.oi)}
                    </td>

                    {/* Vol / OI */}
                    <td
                      className={`py-1.5 px-2 text-right font-bold ${
                        trade.volumeOiRatio >= 3.0 ? "text-orange-400" : "text-slate-300"
                      }`}
                    >
                      {trade.volumeOiRatio.toFixed(1)}x
                    </td>

                    {/* IV */}
                    <td className="py-1.5 px-2 text-right text-slate-300">
                      {trade.iv.toFixed(1)}%
                    </td>

                    {/* Delta */}
                    <td className="py-1.5 px-2 text-right text-purple-300 text-[11px]">
                      {trade.delta.toFixed(2)}
                    </td>

                    {/* Sentiment */}
                    <td className="py-1.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBullish
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : isBearish
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {isBullish ? (
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                        ) : isBearish ? (
                          <TrendingDown className="w-3 h-3 text-rose-400" />
                        ) : null}
                        <span>
                          {trade.sentiment} {trade.sentimentConfidence}%
                        </span>
                      </span>
                    </td>

                    {/* Signal */}
                    <td className="py-1.5 px-3 text-left">
                      {isUnusual ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                          <Flame className="w-2.5 h-2.5 text-orange-400" />
                          UNUSUAL
                        </span>
                      ) : trade.signalType === "LARGE_ACTIVITY" ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          LARGE
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Flow</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
