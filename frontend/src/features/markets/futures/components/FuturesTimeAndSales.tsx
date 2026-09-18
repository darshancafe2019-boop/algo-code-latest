"use client";

import React, { useState, useMemo } from "react";
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Sliders,
  Clock,
  Radio,
} from "lucide-react";
import { formatPrice, formatVolume, formatMoney } from "@/lib/formatters";
import { CanonicalFuturesContract } from "../types/futures";

export interface FuturesTradeEvent {
  id: string;
  time: string;
  symbol: string;
  provider: string;
  side: "BUY" | "SELL" | "BUY_AGGRESSIVE" | "SELL_AGGRESSIVE";
  price: number;
  quantity: number;
  notional: number;
  latencyMs?: number;
}

interface FuturesTimeAndSalesProps {
  contract: CanonicalFuturesContract | null;
  trades?: FuturesTradeEvent[];
}

export function FuturesTimeAndSales({ contract, trades = [] }: FuturesTimeAndSalesProps) {
  const [minSizeFilter, setMinSizeFilter] = useState<string>("");
  const [sideFilter, setSideFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");

  const filteredTrades = useMemo(() => {
    let list = trades;
    if (contract?.symbol) {
      list = list.filter((t) => t.symbol === contract.symbol || t.symbol.includes(contract.underlying));
    }
    if (sideFilter !== "ALL") {
      list = list.filter((t) => t.side.includes(sideFilter));
    }
    if (minSizeFilter) {
      const min = parseFloat(minSizeFilter);
      if (!isNaN(min)) {
        list = list.filter((t) => t.quantity >= min || t.notional >= min);
      }
    }
    return list.slice(0, 100);
  }, [trades, contract, sideFilter, minSizeFilter]);

  const curr = contract?.quote_currency === "INR" ? "₹" : "$";

  return (
    <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs select-none space-y-3">
      {/* 1. Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <span>TIME & SALES (TAPE)</span>
            {contract && (
              <span className="text-emerald-300 text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                {contract.symbol}
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Side Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(["ALL", "BUY", "SELL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSideFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  sideFilter === s
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Min Size Input */}
          <input
            type="number"
            value={minSizeFilter}
            onChange={(e) => setMinSizeFilter(e.target.value)}
            placeholder="Min Size / Notional..."
            className="w-36 bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl px-2.5 py-1 text-xs outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 2. Trades Tape Table */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0A1020] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
            <tr>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Contract</th>
              <th className="py-2 px-3 text-center">Side</th>
              <th className="py-2 px-3 text-right">Price ({curr})</th>
              <th className="py-2 px-3 text-right">Qty</th>
              <th className="py-2 px-3 text-right">Notional</th>
              <th className="py-2 px-3 text-center">Provider</th>
              <th className="py-2 px-3 text-right">Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 max-h-[420px] overflow-y-auto custom-scrollbar">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-600 text-xs">
                  Waiting for incoming real-time match events...
                </td>
              </tr>
            ) : (
              filteredTrades.map((t) => {
                const isBuy = t.side.includes("BUY");
                return (
                  <tr key={t.id} className="hover:bg-slate-900/60 transition text-xs font-mono">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{t.time.split("T")[1]?.slice(0, 8) || t.time}</td>
                    <td className="py-2 px-3 font-bold text-white whitespace-nowrap">{t.symbol}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.side}
                      </span>
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatPrice(t.price)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-200">{formatVolume(t.quantity)}</td>
                    <td className="py-2 px-3 text-right text-slate-300 font-medium">
                      {formatMoney(t.notional, curr)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {t.provider}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {t.latencyMs != null ? `${t.latencyMs}ms` : "—"}
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
}
