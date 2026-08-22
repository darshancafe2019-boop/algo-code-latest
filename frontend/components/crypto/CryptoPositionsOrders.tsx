"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap,
  XCircle,
} from "lucide-react";
import { DerivativePosition, DerivativeOrder } from "@/types/crypto-derivatives";

export function CryptoPositionsOrders() {
  const [activeTab, setActiveTab] = useState<"positions" | "orders">("positions");
  const [closeFeedback, setCloseFeedback] = useState<string | null>(null);

  // Fetch Positions
  const { data: posData, refetch: refetchPos, isFetching: isFetchingPos } = useQuery<{
    status: string;
    positions: DerivativePosition[];
  }>({
    queryKey: ["cryptoPositions"],
    queryFn: async () => {
      const res = await fetch("/api/crypto/positions");
      if (!res.ok) throw new Error("Failed to fetch positions");
      return res.json();
    },
    refetchInterval: 3000,
  });

  // Fetch Orders
  const { data: ordData, refetch: refetchOrd, isFetching: isFetchingOrd } = useQuery<{
    status: string;
    orders: DerivativeOrder[];
  }>({
    queryKey: ["cryptoOrders"],
    queryFn: async () => {
      const res = await fetch("/api/crypto/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const positions = Array.isArray(posData?.positions) ? posData.positions : [];
  const orders = Array.isArray(ordData?.orders) ? ordData.orders : [];

  return (
    <div className="bg-[#131B2A] border border-slate-800 rounded-xl p-5 shadow-xl font-sans text-slate-100">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("positions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "positions"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white bg-[#0B101B]"
            }`}
          >
            <span>Active Positions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono">
              {positions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white bg-[#0B101B]"
            }`}
          >
            <span>Order History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono">
              {orders.length}
            </span>
          </button>
        </div>

        <button
          onClick={() => {
            refetchPos();
            refetchOrd();
          }}
          className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 border border-slate-700"
          title="Refresh Positions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingPos || isFetchingOrd ? "animate-spin text-blue-400" : ""}`} />
        </button>
      </div>

      {closeFeedback && (
        <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-mono mb-4">
          {closeFeedback}
        </div>
      )}

      {/* Tab 1: Active Positions */}
      {activeTab === "positions" && (
        <div>
          {positions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No open crypto derivative positions in paper trading.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-[#0B101B]">
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3 text-right">Size</th>
                    <th className="py-2.5 px-3 text-right">Entry</th>
                    <th className="py-2.5 px-3 text-right">Mark</th>
                    <th className="py-2.5 px-3 text-right">Margin</th>
                    <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {positions.map((p) => {
                    const isLong = p.side === "BUY";
                    const pnl = p.unrealized_pnl || 0;
                    const isProfit = pnl >= 0;

                    return (
                      <tr key={p.position_id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-white font-bold">{p.symbol}</td>
                        <td className="py-2.5 px-3 text-slate-300">{p.instrument_type}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              isLong ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {isLong ? "LONG" : "SHORT"} {p.leverage}x
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200">{p.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-200">${p.entry_price.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-blue-400 font-bold">${p.mark_price.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">${p.margin.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>
                            {isProfit ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Order History */}
      {activeTab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No recent derivative orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-[#0B101B]">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Side</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-center">Mode</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.map((ord) => (
                    <tr key={ord.order_id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{ord.order_id}</td>
                      <td className="py-2.5 px-3 text-white font-bold">{ord.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            ord.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">{ord.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-white font-bold">${ord.price.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px]">
                          {ord.execution_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                        {ord.created_at.slice(11, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
