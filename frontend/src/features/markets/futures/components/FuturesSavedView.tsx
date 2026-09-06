"use client";

import React from "react";
import { Star, Bookmark, Trash2, ArrowUpRight, Zap, TrendingUp } from "lucide-react";
import { useFuturesStore } from "../state/futures-store";
import { CanonicalFuturesContract } from "../types/futures";

interface FuturesSavedViewProps {
  contracts: CanonicalFuturesContract[];
}

export function FuturesSavedView({ contracts }: FuturesSavedViewProps) {
  const { savedContractKeys, toggleSaveContract, setSelectedContract, setDetailsDrawerOpen, setOrderReviewOpen } = useFuturesStore();

  const savedContracts = contracts.filter((c) =>
    savedContractKeys.includes(c.symbol) || savedContractKeys.includes(c.instrument_key || "")
  );

  return (
    <div className="space-y-4 font-sans text-slate-200">
      <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Saved Watchlist & Instrument Preferences ({savedContracts.length})
          </h3>
        </div>
        <span className="text-[10px] text-slate-400">
          Re-fetches fresh market data automatically on load
        </span>
      </div>

      {savedContracts.length === 0 ? (
        <div className="text-center py-16 bg-[#0E1524] border border-[#1E293B] rounded-2xl text-slate-500 font-mono text-xs">
          No saved futures contracts. Click the star icon on any contract row to save it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 font-mono">
          {savedContracts.map((c) => {
            const isIndian = c.exchange === "NSE" || c.currency === "INR";
            const currSymbol = isIndian ? "₹" : "$";
            const isConnected = c.status === "CONNECTED" || c.status === "LIVE";

            return (
              <div
                key={c.instrument_key || c.symbol}
                className="p-4 bg-[#0E1524] border border-[#1E293B] hover:border-cyan-500/40 rounded-2xl shadow-xl transition-all relative group flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-cyan-300 transition">
                        {c.displayName || c.symbol}
                      </h4>
                      <span className="text-[10px] text-slate-500">{c.provider}</span>
                    </div>
                    <button
                      onClick={() => toggleSaveContract(c.symbol)}
                      className="p-1.5 rounded-lg text-amber-400 hover:text-rose-400 transition"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Mark Price</span>
                      <span className="font-bold text-white text-sm">
                        {isConnected && c.mark_price != null ? `${currSymbol}${c.mark_price.toLocaleString()}` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">24h Change</span>
                      <span className={(c.change_24h_pct ?? 0) >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {isConnected && c.change_24h_pct != null
                          ? `${c.change_24h_pct >= 0 ? "+" : ""}${c.change_24h_pct.toFixed(2)}%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between gap-2">
                  <span className="text-[9px] text-slate-400 uppercase">{c.exchange} • {c.asset_type}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedContract(c);
                        setDetailsDrawerOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setOrderReviewOpen(true, c, "BUY")}
                      disabled={!isConnected}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition disabled:opacity-30"
                    >
                      Trade
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
