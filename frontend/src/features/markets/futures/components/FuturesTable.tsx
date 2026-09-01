"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Activity,
} from "lucide-react";
import { CanonicalFuturesContract } from "../types/futures";
import { useFuturesStore } from "../state/futures-store";
import { useUIStore } from "@/lib/store/useUIStore";

interface FuturesTableProps {
  contracts: CanonicalFuturesContract[];
  isLoading: boolean;
}

export function FuturesTable({ contracts, isLoading }: FuturesTableProps) {
  const { selectedContract, setSelectedContract, setDetailsDrawerOpen, setOrderSide } = useFuturesStore();
  const { setAICopilotOpen, setActiveSymbol } = useUIStore();

  const handleRowClick = (contract: CanonicalFuturesContract) => {
    setSelectedContract(contract);
    setDetailsDrawerOpen(true);
  };

  const handleQuickTrade = (e: React.MouseEvent, contract: CanonicalFuturesContract, side: "BUY" | "SELL") => {
    e.stopPropagation();
    setSelectedContract(contract);
    setOrderSide(side);
    setDetailsDrawerOpen(true);
  };

  const handleOpenAICopilot = (e: React.MouseEvent, contract: CanonicalFuturesContract) => {
    e.stopPropagation();
    setActiveSymbol(contract.symbol);
    setAICopilotOpen(true);
  };

  if (isLoading && contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#0B132B] border border-slate-800 rounded-2xl">
        <Activity className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-xs font-mono text-slate-400">Streaming live multi-venue futures book...</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="text-center py-16 bg-[#0B132B] border border-slate-800 rounded-2xl text-slate-500 font-mono text-xs">
        No futures contracts found matching your current filters.
      </div>
    );
  }

  return (
    <div className="bg-[#0B132B] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left font-sans text-xs text-slate-300">
          <thead className="bg-[#070D1F] border-b border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400">
            <tr>
              <th className="py-3 px-4">Contract / Asset</th>
              <th className="py-3 px-4 text-right">Mark Price</th>
              <th className="py-3 px-4 text-right">Index Price</th>
              <th className="py-3 px-4 text-right">Basis %</th>
              <th className="py-3 px-4 text-right">8h Funding Rate</th>
              <th className="py-3 px-4 text-right">Funding APR</th>
              <th className="py-3 px-4 text-right">24h Change</th>
              <th className="py-3 px-4 text-right">24h Volume</th>
              <th className="py-3 px-4 text-right">Open Interest</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {contracts.map((c) => {
              const isSelected = selectedContract?.symbol === c.symbol;
              const isPositive = c.change_24h_pct >= 0;
              const basisPct = c.basis?.basis_percentage ?? 0;
              const apr = c.funding_rate?.funding_rate_annualized ?? 0;

              return (
                <tr
                  key={c.symbol}
                  onClick={() => handleRowClick(c)}
                  className={`cursor-pointer transition-all hover:bg-slate-800/40 group ${
                    isSelected ? "bg-cyan-950/30 border-l-2 border-cyan-400" : ""
                  }`}
                >
                  {/* Contract info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400">
                        {c.underlying.substring(0, 3)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition">
                          {c.symbol}
                        </div>
                        <div className="text-[10px] font-sans text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{c.venue}</span>
                          <span>•</span>
                          <span>{c.max_leverage}x Lev</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Mark Price */}
                  <td className="py-3 px-4 text-right font-bold text-slate-100">
                    ${c.mark_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* Index Price */}
                  <td className="py-3 px-4 text-right text-slate-400">
                    ${c.index_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* Basis % */}
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        basisPct > 0
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-950 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {basisPct > 0 ? `+${basisPct}%` : `${basisPct}%`}
                    </span>
                  </td>

                  {/* 8h Funding Rate */}
                  <td className="py-3 px-4 text-right">
                    {c.funding_rate ? (
                      <span className="text-slate-300">
                        {(c.funding_rate.funding_rate_8h * 100).toFixed(4)}%
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Funding APR */}
                  <td className="py-3 px-4 text-right">
                    {c.funding_rate ? (
                      <span className="font-bold text-cyan-400">
                        {apr > 0 ? `+${apr}%` : `${apr}%`}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* 24h Change */}
                  <td className="py-3 px-4 text-right font-bold">
                    <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
                      {isPositive ? `+${c.change_24h_pct.toFixed(2)}%` : `${c.change_24h_pct.toFixed(2)}%`}
                    </span>
                  </td>

                  {/* 24h Volume */}
                  <td className="py-3 px-4 text-right text-slate-300">
                    ${(c.volume_24h_usd / 1e6).toFixed(1)}M
                  </td>

                  {/* Open Interest */}
                  <td className="py-3 px-4 text-right text-slate-300">
                    ${(c.open_interest_usd / 1e6).toFixed(1)}M
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={(e) => handleQuickTrade(e, c, "BUY")}
                        className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition active:scale-95"
                      >
                        Long
                      </button>
                      <button
                        onClick={(e) => handleQuickTrade(e, c, "SELL")}
                        className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-bold transition active:scale-95"
                      >
                        Short
                      </button>
                      <button
                        onClick={(e) => handleOpenAICopilot(e, c)}
                        title="AI Strategy Copilot"
                        className="p-1 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
