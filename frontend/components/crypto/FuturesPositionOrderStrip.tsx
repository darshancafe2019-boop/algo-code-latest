"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  CheckCircle2,
  ListOrdered,
  History as HistoryIcon,
} from "lucide-react";
import { FuturesPositionRecord, FuturesOrderRecord } from "@/types/futures-terminal";

interface Props {
  refreshTrigger?: number;
}

export function FuturesPositionOrderStrip({ refreshTrigger }: Props) {
  const [activeTab, setActiveTab] = useState<"POSITIONS" | "ORDERS" | "HISTORY">("POSITIONS");

  // Fetch Positions
  const { data: posData, isLoading: isPosLoading } = useQuery<{
    status: string;
    positions: FuturesPositionRecord[];
  }>({
    queryKey: ["cryptoPositions", refreshTrigger],
    queryFn: async () => {
      const res = await fetch("/api/crypto/positions");
      if (!res.ok) throw new Error("Failed to load positions");
      return res.json();
    },
    refetchInterval: 3000,
  });

  // Fetch Orders
  const { data: ordData, isLoading: isOrdLoading } = useQuery<{
    status: string;
    orders: FuturesOrderRecord[];
  }>({
    queryKey: ["cryptoOrders", refreshTrigger],
    queryFn: async () => {
      const res = await fetch("/api/crypto/orders");
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    },
    refetchInterval: 4000,
  });

  const positions = posData?.positions || [];
  const allOrders = ordData?.orders || [];
  const openOrders = allOrders.filter((o) => o.status === "PENDING");
  const historyOrders = allOrders.filter((o) => o.status !== "PENDING");

  return (
    <div className="bg-[#0B101B] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col font-mono text-xs select-none">
      {/* Tab Switcher & Deep Links */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex bg-[#131B2A] p-0.5 rounded-lg border border-slate-800 text-[11px]">
            {/* Positions Tab */}
            <button
              onClick={() => setActiveTab("POSITIONS")}
              className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "POSITIONS"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Positions</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 border border-blue-400/40 text-blue-200 font-bold">
                {positions.length}
              </span>
            </button>

            {/* Open Orders Tab */}
            <button
              onClick={() => setActiveTab("ORDERS")}
              className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "ORDERS"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ListOrdered className="w-3 h-3" />
              <span>Open Orders</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {openOrders.length}
              </span>
            </button>

            {/* History Tab */}
            <button
              onClick={() => setActiveTab("HISTORY")}
              className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "HISTORY"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <HistoryIcon className="w-3 h-3" />
              <span>History</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {historyOrders.length}
              </span>
            </button>
          </div>
        </div>

        {/* Deep Link */}
        <Link
          href={activeTab === "POSITIONS" ? "/positions" : "/orders"}
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded"
        >
          <span>View All {activeTab === "POSITIONS" ? "Positions" : "Orders"}</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 1. Positions View */}
      {activeTab === "POSITIONS" && (
        <div>
          {isPosLoading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading positions...</div>
          ) : positions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No active futures positions currently open.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-[#0d1424]">
                    <th className="py-2.5 px-3">Contract</th>
                    <th className="py-2.5 px-3">Side & Leverage</th>
                    <th className="py-2.5 px-3 text-right">Size</th>
                    <th className="py-2.5 px-3 text-right">Entry Price</th>
                    <th className="py-2.5 px-3 text-right">Mark Price</th>
                    <th className="py-2.5 px-3 text-right">Est. Liq Price</th>
                    <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const isLong = p.side === "BUY";
                    const isProfitable = (p.unrealized_pnl || 0) >= 0;

                    return (
                      <tr key={p.position_id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-white">
                          {p.canonical_symbol || p.symbol}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isLong
                                ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/20"
                                : "bg-rose-950/50 text-rose-300 border border-rose-500/20"
                            }`}
                          >
                            {isLong ? "LONG" : "SHORT"} {p.leverage}x
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {p.quantity} {p.underlying}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          ${(p.entry_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          ${(p.mark_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">
                          ${(p.liquidation_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            isProfitable ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isProfitable ? `+$${(p.unrealized_pnl || 0).toFixed(2)}` : `-$${Math.abs(p.unrealized_pnl || 0).toFixed(2)}`}
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

      {/* 2. Open Orders View */}
      {activeTab === "ORDERS" && (
        <div>
          {isOrdLoading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading open orders...</div>
          ) : openOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No pending open orders.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-[#0d1424]">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Contract</th>
                    <th className="py-2.5 px-3">Side & Type</th>
                    <th className="py-2.5 px-3 text-right">Size</th>
                    <th className="py-2.5 px-3 text-right">Order Price</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((o) => (
                    <tr key={o.order_id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400">{o.order_id.substring(0, 12)}...</td>
                      <td className="py-2.5 px-3 font-bold text-white">{o.canonical_symbol || o.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            o.side === "BUY"
                              ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/20"
                              : "bg-rose-950/50 text-rose-300 border border-rose-500/20"
                          }`}
                        >
                          {o.side} {o.order_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {o.quantity} {o.underlying}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        ${(o.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-400 font-bold">
                        {o.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. History View */}
      {activeTab === "HISTORY" && (
        <div>
          {isOrdLoading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading order history...</div>
          ) : historyOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No order history logged.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase bg-[#0d1424]">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Contract</th>
                    <th className="py-2.5 px-3">Side & Type</th>
                    <th className="py-2.5 px-3 text-right">Size</th>
                    <th className="py-2.5 px-3 text-right">Filled Price</th>
                    <th className="py-2.5 px-3 text-right">Mode</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                    <th className="py-2.5 px-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {historyOrders.slice(0, 10).map((o) => (
                    <tr key={o.order_id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{o.order_id.substring(0, 12)}...</td>
                      <td className="py-2.5 px-3 font-bold text-white">{o.canonical_symbol || o.symbol}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            o.side === "BUY"
                              ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/20"
                              : "bg-rose-950/50 text-rose-300 border border-rose-500/20"
                          }`}
                        >
                          {o.side} {o.order_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        {o.quantity} {o.underlying}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-200">
                        ${(o.price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {o.execution_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                        {o.status}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[10px] text-slate-400">
                        {o.created_at ? o.created_at.substring(11, 19) : "—"}
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
