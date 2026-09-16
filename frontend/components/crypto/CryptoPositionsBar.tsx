"use client";

import { formatMoney } from "@/lib/formatters";
import React, { useState } from "react";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { DerivativePosition, DerivativeOrder } from "@/types/crypto-derivatives";
import { cn } from "@/lib/utils";

interface CryptoPositionsBarProps {
  positions: DerivativePosition[];
  orders: DerivativeOrder[];
  totalUnrealizedPnl: number;
  totalMarginUsed: number;
  complexityMode: "SIMPLE" | "ADVANCED";
  onOpenPositionsDrawer: () => void;
}

export const CryptoPositionsBar: React.FC<CryptoPositionsBarProps> = ({
  positions,
  orders,
  totalUnrealizedPnl,
  totalMarginUsed,
  complexityMode,
  onOpenPositionsDrawer,
}) => {
  const [showFullTable, setShowFullTable] = useState(false);
  const [subTab, setSubTab] = useState<"POSITIONS" | "ORDERS">("POSITIONS");

  const isProfit = totalUnrealizedPnl >= 0;
  const isAdvanced = complexityMode === "ADVANCED";

  return (
    <div className="w-full bg-[#050e1d] border border-[#12365a] rounded-xl p-3.5 shadow-lg select-none backdrop-blur space-y-3 font-sans">
      {/* 1. Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Counts & PnL */}
        <div className="flex flex-wrap items-center gap-3 font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Layers className="h-4 w-4 text-[#00D4FF]" />
            <span>POSITIONS:</span>
            <strong className="text-white bg-[#07192f] px-2 py-0.5 rounded border border-[#143e69]">
              {positions.length}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span>ORDERS:</span>
            <strong className="text-white bg-[#07192f] px-2 py-0.5 rounded border border-[#143e69]">
              {orders.length}
            </strong>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="text-slate-300">
            UNREALIZED PnL:{" "}
            <strong
              className={cn(
                "px-2 py-0.5 rounded font-bold border",
                isProfit
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              )}
            >
              {isProfit ? "+" : ""}${totalUnrealizedPnl.toFixed(2)}
            </strong>
          </div>

          <div className="text-slate-300 hidden md:block">
            MARGIN USED: <strong className="text-cyan-300">{formatMoney(totalMarginUsed, "$")}</strong>
          </div>

          <div className="text-slate-300 hidden md:block">
            RISK: <strong className="text-emerald-400">NORMAL</strong>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAdvanced && (
            <button
              onClick={() => setShowFullTable((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-300 hover:text-white border border-[#143e69] text-xs font-mono font-semibold transition-all cursor-pointer"
            >
              <span>{showFullTable ? "Collapse Table" : "Expand Ledger"}</span>
              {showFullTable ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}

          <button
            onClick={onOpenPositionsDrawer}
            className="px-3 py-1 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-[#00D4FF] hover:text-white border border-[#143e69] text-xs font-mono font-bold transition-all cursor-pointer"
          >
            VIEW POSITIONS / ORDERS
          </button>
        </div>
      </div>

      {/* 2. Expanded Ledger Table (When Advanced or Expanded) */}
      {(showFullTable || isAdvanced) && (
        <div className="pt-2 border-t border-[#0d2847] space-y-2">
          <div className="flex items-center gap-2 mb-2 font-mono text-xs">
            <button
              onClick={() => setSubTab("POSITIONS")}
              className={cn(
                "px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer",
                subTab === "POSITIONS" ? "bg-cyan-500/20 text-[#00D4FF] border border-cyan-500/40" : "text-slate-400"
              )}
            >
              Crypto Positions ({positions.length})
            </button>
            <button
              onClick={() => setSubTab("ORDERS")}
              className={cn(
                "px-2.5 py-0.5 rounded font-bold transition-all cursor-pointer",
                subTab === "ORDERS" ? "bg-cyan-500/20 text-[#00D4FF] border border-cyan-500/40" : "text-slate-400"
              )}
            >
              Crypto Orders ({orders.length})
            </button>
          </div>

          {subTab === "POSITIONS" ? (
            <div className="overflow-x-auto rounded-lg border border-[#0d2642]">
              <table className="w-full text-left text-xs font-mono border-collapse bg-[#040f1f]">
                <thead>
                  <tr className="border-b border-[#0f2d4e] bg-[#07192f] text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-3">Contract</th>
                    <th className="py-2 px-3">Side</th>
                    <th className="py-2 px-3 text-right">Size</th>
                    <th className="py-2 px-3 text-right">Entry</th>
                    <th className="py-2 px-3 text-right">Mark</th>
                    <th className="py-2 px-3 text-right">Margin</th>
                    <th className="py-2 px-3 text-right">Unrealized P&L</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d2642]">
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                        No open crypto derivative positions in paper simulation.
                      </td>
                    </tr>
                  ) : (
                    positions.map((p) => {
                      const isLong = p.side === "BUY";
                      const pnl = Number(p.unrealized_pnl) || 0;
                      const isPosProfit = pnl >= 0;

                      return (
                        <tr key={p.position_id} className="hover:bg-[#07192e]">
                          <td className="py-2 px-3 text-white font-bold">{p.symbol}</td>
                          <td className="py-2 px-3">
                            <span
                              className={cn(
                                "px-1.5 py-0.2 rounded font-bold text-[10px]",
                                isLong ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                              )}
                            >
                              {isLong ? "LONG" : "SHORT"} {p.leverage}x
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-200">{p.quantity}</td>
                          <td className="py-2 px-3 text-right text-slate-200">${Number(p.entry_price).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-[#00D4FF] font-bold">${Number(p.mark_price).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-slate-300">${Number(p.margin).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold">
                            <span className={isPosProfit ? "text-emerald-400" : "text-rose-400"}>
                              {isPosProfit ? "+" : ""}${pnl.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px]">
                              OPEN
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#0d2642]">
              <table className="w-full text-left text-xs font-mono border-collapse bg-[#040f1f]">
                <thead>
                  <tr className="border-b border-[#0f2d4e] bg-[#07192f] text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-3">Order ID</th>
                    <th className="py-2 px-3">Contract</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Side</th>
                    <th className="py-2 px-3 text-right">Quantity</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0d2642]">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                        No recent crypto orders.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.order_id} className="hover:bg-[#07192e]">
                        <td className="py-2 px-3 text-slate-400">{o.order_id}</td>
                        <td className="py-2 px-3 text-white font-bold">{o.symbol}</td>
                        <td className="py-2 px-3 text-slate-300">{o.order_type}</td>
                        <td className="py-2 px-3">
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded font-bold text-[10px]",
                              o.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            )}
                          >
                            {o.side}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-200">{o.quantity}</td>
                        <td className="py-2 px-3 text-right text-[#00D4FF]">${Number(o.price).toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px]">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
