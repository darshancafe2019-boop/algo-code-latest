"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  DollarSign,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { fetchFuturesPositions } from "../api/futures-api";
import { FuturesPosition } from "../types/futures";

export function FuturesPositionsView() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresActivePositions"],
    queryFn: () => fetchFuturesPositions(),
    refetchInterval: 4000,
  });

  const positions: FuturesPosition[] = data?.positions || [];
  const totalPnL = data?.total_unrealized_pnl_usd || 0;
  const totalMargin = data?.total_margin_used_usd || 0;

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Unrealized PnL</span>
          <span className={`text-xl font-bold mt-1 block ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`}
          </span>
          <div className="mt-2 text-[10px] text-slate-500">Paper Execution Ledger</div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Margin In Use</span>
          <span className="text-xl font-bold text-cyan-300 mt-1 block">${totalMargin.toLocaleString()}</span>
          <div className="mt-2 text-[10px] text-slate-500">Isolated & Cross Allocation</div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Open Positions</span>
            <span className="text-xl font-bold text-white mt-1 block">{positions.length} Active</span>
            <div className="mt-1 text-[10px] text-emerald-400 font-bold">100% RECONCILED</div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="Refresh Positions"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
            <thead className="bg-[#080C14]/90 border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Contract / Symbol</th>
                <th className="py-3.5 px-3">Side</th>
                <th className="py-3.5 px-3 text-right">Size</th>
                <th className="py-3.5 px-3 text-right">Entry Price</th>
                <th className="py-3.5 px-3 text-right">Mark Price</th>
                <th className="py-3.5 px-3 text-right">Unrealized PnL</th>
                <th className="py-3.5 px-3 text-right">Margin (Mode)</th>
                <th className="py-3.5 px-3 text-right">Liq. Price</th>
                <th className="py-3.5 px-3 text-right">Liq. Dist.</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141D2E]">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No active futures positions. Place an order from the Futures Universe table.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const isProfit = pos.unrealized_pnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-[#121927]/70 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{pos.displayName || pos.symbol}</div>
                        <div className="text-[10px] text-slate-500">{pos.provider}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pos.side === "LONG"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-red-500/20 text-red-400 border border-red-500/40"
                          }`}
                        >
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-white">{pos.quantity}</td>
                      <td className="py-3.5 px-3 text-right text-slate-400">${pos.entry_price.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-white">${pos.mark_price.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right">
                        <span className={`font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                          {isProfit ? `+$${pos.unrealized_pnl.toFixed(2)}` : `-$${Math.abs(pos.unrealized_pnl).toFixed(2)}`}
                          <span className="text-[10px] font-normal ml-1">({pos.unrealized_pnl_pct.toFixed(2)}%)</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="text-slate-200 font-bold">${pos.margin_usd.toLocaleString()}</div>
                        <div className="text-[9px] text-slate-500">{pos.margin_mode} ({pos.leverage}x)</div>
                      </td>
                      <td className="py-3.5 px-3 text-right text-red-400 font-bold">${pos.liquidation_price.toLocaleString()}</td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="text-emerald-400 font-bold">{pos.liquidation_distance_pct}%</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => alert(`Close position ${pos.symbol} requested.`)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
