"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Layers,
  RefreshCw,
  Zap,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export function OptionsPositionsView() {
  const [modeFilter, setModeFilter] = useState<"ALL" | "PAPER" | "SHADOW" | "LIVE">("ALL");

  const { data, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ["optionsPositions", modeFilter],
    queryFn: async () => {
      const res = await apiClient.get<any>("/api/options/positions");
      if (!res.ok || !res.data) throw new Error("Failed to load options positions");
      return res.data.data || res.data;
    },
    staleTime: 5000,
  });

  const positions = data?.positions || [];
  const filteredPositions = modeFilter === "ALL" ? positions : positions.filter((p: any) => p.mode === modeFilter || (!p.mode && modeFilter === "PAPER"));

  const totalPnl = filteredPositions.reduce((acc: number, p: any) => acc + (p.unrealized_pnl || p.pnl || 0), 0);
  const totalMargin = filteredPositions.reduce((acc: number, p: any) => acc + (p.margin || 25000), 0);

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Top Header Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              OPTIONS POSITIONS INTELLIGENCE
            </h1>
            <p className="text-xs text-slate-400">
              Active option contracts, net Greek exposures, and portfolio margin usage
            </p>
          </div>
        </div>

        {/* Mode Filter & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
            {(["ALL", "PAPER", "SHADOW", "LIVE"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  modeFilter === m
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Positions"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase block">OPEN CONTRACTS</span>
          <div className="text-xl font-bold text-slate-100 mt-1">{filteredPositions.length}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Across active strategies</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase block">TOTAL UNREALIZED P&L</span>
          <div className={`text-xl font-bold mt-1 ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ₹{totalPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{totalPnl >= 0 ? "+ Profit" : "- Loss"}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase block">MARGIN ALLOCATION</span>
          <div className="text-xl font-bold text-amber-300 mt-1">
            ₹{totalMargin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Portfolio collateral</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase block">EXECUTION MODE</span>
          <div className="text-base font-bold text-sky-400 mt-1">{modeFilter}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Default: PAPER (Safe)</span>
        </div>
      </div>

      {/* Positions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            REAL-TIME OPTIONS POSITIONS TABLE
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">Instrument</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Entry Price</th>
                <th className="py-2.5 px-3 text-right">LTP / Mark</th>
                <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                <th className="py-2.5 px-3 text-right">Delta</th>
                <th className="py-2.5 px-3 text-right">Theta</th>
                <th className="py-2.5 px-3">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No active options positions in {modeFilter} mode.
                  </td>
                </tr>
              ) : (
                filteredPositions.map((p: any, idx: number) => {
                  const pnl = p.unrealized_pnl || p.pnl || 0;
                  const isBuy = p.side === "BUY" || p.direction === "LONG";

                  return (
                    <tr key={p.id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-100">
                        {p.symbol || `${p.underlying} ${p.strike} ${p.option_type}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isBuy ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"}`}>
                          {isBuy ? "BUY" : "SELL"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-sky-400">{p.provider || "DHAN"}</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">{p.quantity || p.lots || 1}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">₹{(p.entry_price || p.average_price || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-200 font-bold">₹{(p.current_price || p.last_price || 0).toFixed(2)}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {pnl >= 0 ? "+" : ""}₹{pnl.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-sky-400">{p.delta !== undefined ? p.delta.toFixed(2) : "—"}</td>
                      <td className="py-2.5 px-3 text-right text-rose-400">{p.theta !== undefined ? p.theta.toFixed(1) : "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {p.mode || "PAPER"}
                        </span>
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
