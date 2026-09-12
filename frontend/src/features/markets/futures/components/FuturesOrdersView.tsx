"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Trash2,
  Ban,
  ArrowUpDown,
} from "lucide-react";
import { fetchFuturesOrders, cancelFuturesOrder } from "../api/futures-api";
import { FuturesOrder } from "../types/futures";

export function FuturesOrdersView() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [orderSearch, setOrderSearch] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch real derivative order log
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["futuresOrdersList"],
    queryFn: () => fetchFuturesOrders(),
    refetchInterval: 4000,
  });

  const orders: FuturesOrder[] = data?.orders || [];

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return cancelFuturesOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["futuresOrdersList"] });
      queryClient.invalidateQueries({ queryKey: ["futuresActivePositions"] });
    },
  });

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      return (
        o.symbol.toLowerCase().includes(q) ||
        o.order_id?.toLowerCase().includes(q) ||
        o.provider?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCount = orders.filter((o) => o.status === "OPEN" || o.status === "SUBMITTED" || o.status === "ACKNOWLEDGED").length;
  const filledCount = orders.filter((o) => o.status === "FILLED").length;

  return (
    <div className="space-y-4 font-sans text-slate-200">
      {/* Orders Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Active Open Orders</span>
          <span className="text-xl font-bold text-cyan-400 mt-1 block">{openCount} Working</span>
          <div className="mt-2 text-[10px] text-slate-500">Live Resting Limit Orders</div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Filled Today</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">{filledCount} Executions</span>
          <div className="mt-2 text-[10px] text-slate-500">Authoritative Fills</div>
        </div>

        <div className="p-4 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Order Router Status</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <strong className="text-sm font-bold text-emerald-400">IDEMPOTENCY ARMED</strong>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono">Replay Safe • Zero Duplication</div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          {["ALL", "OPEN", "FILLED", "CANCELLED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === st
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                  : "bg-[#080C14] text-slate-400 hover:text-white border border-[#1E293B]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Search order ID, contract..."
            className="pl-8 pr-3 py-1.5 bg-[#080C14] border border-[#1E293B] rounded-xl text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left font-mono text-xs text-slate-300 border-collapse">
            <thead className="bg-[#080C14]/90 border-b border-[#1E293B] text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-3">Order ID / Client ID</th>
                <th className="py-3.5 px-3">Contract / Symbol</th>
                <th className="py-3.5 px-3">Side</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-3 text-right">Quantity</th>
                <th className="py-3.5 px-3 text-right">Order Price</th>
                <th className="py-3.5 px-3 text-right">Avg Fill Price</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141D2E]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No futures orders matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const isBuy = ord.side === "BUY" || ord.side === "LONG";
                  return (
                    <tr key={ord.id || ord.order_id} className="hover:bg-[#121927]/70 transition-all">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {ord.created_at ? new Date(ord.created_at).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        <div className="text-slate-300 font-bold">{ord.order_id || ord.id}</div>
                        {ord.client_order_id && (
                          <div className="text-[9px] text-slate-500">{ord.client_order_id}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-white text-xs">{ord.symbol}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">{ord.provider || "PAPER"}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBuy ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{ord.order_type}</td>
                      <td className="py-3 px-3 text-right font-bold text-white">{ord.quantity}</td>
                      <td className="py-3 px-3 text-right text-slate-200">
                        {ord.price != null ? `$${ord.price.toLocaleString()}` : "MARKET"}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        {ord.average_fill_price != null ? `$${ord.average_fill_price.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === "FILLED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : ord.status === "OPEN" || ord.status === "SUBMITTED" || ord.status === "ACKNOWLEDGED"
                              ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                              : "bg-slate-900 text-slate-500 border border-slate-700"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ord.status === "OPEN" || ord.status === "SUBMITTED" || ord.status === "ACKNOWLEDGED" ? (
                          <button
                            onClick={() => cancelMutation.mutate(ord.order_id || ord.id)}
                            disabled={cancelMutation.isPending}
                            className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800 rounded text-[10px] font-bold transition active:scale-95"
                          >
                            Cancel
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[10px]">—</span>
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
    </div>
  );
}
