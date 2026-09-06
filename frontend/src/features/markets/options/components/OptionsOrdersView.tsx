"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  Shield,
  Layers,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export function OptionsOrdersView() {
  const [modeFilter, setModeFilter] = useState<"ALL" | "PAPER" | "SHADOW" | "LIVE">("ALL");

  const { data, isLoading, isFetching, refetch } = useQuery<any>({
    queryKey: ["optionsOrders", modeFilter],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/api/options/orders?mode=${modeFilter}`);
      if (!res.ok || !res.data) throw new Error("Failed to load options orders");
      return res.data.data || res.data;
    },
    staleTime: 4000,
  });

  const orders = data?.orders || [];

  return (
    <div className="space-y-5 text-slate-100 font-sans">
      {/* Header Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              OPTIONS ORDER INTENT & EXECUTION AUDIT
            </h1>
            <p className="text-xs text-slate-400">
              Traceable OMS order intents, execution broker acknowledgements, and fills
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
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
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
            title="Refresh Orders"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-400" />
            ORDER AUDIT TRAIL
          </div>
          <div className="text-xs font-mono text-slate-400">
            Showing {orders.length} orders
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">Order Intent ID</th>
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                <th className="py-2.5 px-3">Provider / Broker</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No options orders recorded for {modeFilter} mode.
                  </td>
                </tr>
              ) : (
                orders.map((o: any, idx: number) => {
                  const isBuy = o.side === "BUY";
                  const isFilled = o.status === "FILLED";

                  return (
                    <tr key={o.order_intent_id || idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-300">
                        {o.order_intent_id || `OPT_${idx}`}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-100">
                        {o.instrument || o.symbol}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isBuy ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"}`}>
                          {o.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{o.order_type || "LIMIT"}</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">{o.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                        ₹{(o.price || o.average_fill_price || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        <span className="text-sky-400 font-bold">{o.provider || "DHAN"}</span>
                        {o.execution_broker && o.execution_broker !== o.provider && (
                          <span className="text-slate-400"> → {o.execution_broker}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${isFilled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`}>
                          {o.status || "FILLED"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {o.mode || "PAPER"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        {o.created_at ? new Date(o.created_at).toLocaleTimeString() : "Recent"}
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
