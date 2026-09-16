"use client";

import { formatMoney } from "@/lib/formatters";
import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  Zap,
  Search,
} from "lucide-react";
import { CanonicalFuturesContract } from "@/types/futures-terminal";
import { cn } from "@/lib/utils";

interface CryptoFuturesTabProps {
  contracts: CanonicalFuturesContract[];
  selectedUnderlying: string;
  onOpenTradeDrawer: (contract: any, side: "BUY" | "SELL") => void;
  isLoading: boolean;
}

export const CryptoFuturesTab: React.FC<CryptoFuturesTabProps> = ({
  contracts,
  selectedUnderlying,
  onOpenTradeDrawer,
  isLoading,
}) => {
  const [filterType, setFilterType] = useState<"ALL" | "PERPETUAL" | "DATED">("ALL");
  const [search, setSearch] = useState<string>("");

  const filtered = contracts.filter((c) => {
    if (filterType === "PERPETUAL" && c.contract_type !== "PERPETUAL") return false;
    if (filterType === "DATED" && c.contract_type === "PERPETUAL") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.display_symbol.toLowerCase().includes(q) ||
        c.contract_id.toLowerCase().includes(q) ||
        c.exchange.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3 select-none">
      {/* Table Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050e1d] border border-[#12365a] rounded-xl px-4 py-2.5 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-300">
            {selectedUnderlying} FUTURES ({filtered.length})
          </span>
          <div className="flex items-center gap-1 bg-[#07192f] p-0.5 rounded-lg border border-[#143e69] text-xs font-mono">
            {(["ALL", "PERPETUAL", "DATED"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  "px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer",
                  filterType === t
                    ? "bg-[#00D4FF] text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-48">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contract..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#07192f] border border-[#143e69] rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00D4FF] font-mono"
          />
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-[#050e1d] border border-[#12365a] rounded-xl shadow-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-[#0f2d4e] bg-[#07192f] text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-3 px-3.5">Contract</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Expiry</th>
              <th className="py-3 px-3 text-right">Last Price</th>
              <th className="py-3 px-3 text-right">Mark Price</th>
              <th className="py-3 px-3 text-right">Basis ($)</th>
              <th className="py-3 px-3 text-right">Funding (8h)</th>
              <th className="py-3 px-3 text-right">Open Interest</th>
              <th className="py-3 px-3 text-right">24h Volume</th>
              <th className="py-3 px-3 text-center">Exchange</th>
              <th className="py-3 px-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0d2642]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-slate-400 text-xs">
                  {isLoading ? "Fetching futures contracts..." : "No contracts match the current filter criteria."}
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const isPerp = c.contract_type === "PERPETUAL";
                const isBullish = (c.change_24h || 0) >= 0;

                return (
                  <tr
                    key={c.contract_id}
                    className="hover:bg-[#07192e] transition-colors group"
                  >
                    {/* Contract Symbol */}
                    <td className="py-2.5 px-3.5 font-bold text-white group-hover:text-[#00D4FF] transition-colors">
                      {c.display_symbol}
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[10px] font-bold border",
                          isPerp
                            ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
                            : "bg-purple-950/60 border-purple-500/40 text-purple-300"
                        )}
                      >
                        {c.contract_type}
                      </span>
                    </td>

                    {/* Expiry */}
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                      {isPerp ? "PERPETUAL" : c.expiry || "DATED"}
                    </td>

                    {/* Last Price */}
                    <td className="py-2.5 px-3 text-right font-extrabold text-white">
                      {formatMoney(c.last_price, "$")}
                    </td>

                    {/* Mark Price */}
                    <td className="py-2.5 px-3 text-right text-[#00D4FF]">
                      {formatMoney(c.mark_price, "$")}
                    </td>

                    {/* Basis */}
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {c.basis ? (c.basis > 0 ? `+$${c.basis.toFixed(2)}` : `-$${Math.abs(c.basis).toFixed(2)}`) : "$0.00"}
                    </td>

                    {/* Funding */}
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      {c.funding_rate_pct ? `+${c.funding_rate_pct.toFixed(3)}%` : "0.010%"}
                    </td>

                    {/* Open Interest */}
                    <td className="py-2.5 px-3 text-right text-slate-200">
                      ${((c.open_interest_usd || 1000000) / 1e6).toFixed(1)}M
                    </td>

                    {/* 24h Volume */}
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      ${((c.volume_24h || 5000000) / 1e6).toFixed(1)}M
                    </td>

                    {/* Exchange */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-[#07192f] border border-[#143e69] text-[10px] text-slate-300 font-bold">
                        {c.exchange}
                      </span>
                    </td>

                    {/* Trade Action */}
                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenTradeDrawer(c, "BUY")}
                          className="px-2 py-1 rounded bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all cursor-pointer"
                        >
                          BUY
                        </button>
                        <button
                          onClick={() => onOpenTradeDrawer(c, "SELL")}
                          className="px-2 py-1 rounded bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-[10px] transition-all cursor-pointer"
                        >
                          SELL
                        </button>
                      </div>
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
