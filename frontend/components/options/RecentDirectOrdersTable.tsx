"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { RecentDirectOrder, OrderExecutionStatus } from "@/types/option-order-intent";
import { formatNumber } from "@/lib/formatters";

interface RecentDirectOrdersTableProps {
  currency?: string;
  refreshTrigger?: number;
}

export const RecentDirectOrdersTable: React.FC<RecentDirectOrdersTableProps> = ({
  currency = "₹",
  refreshTrigger = 0,
}) => {
  const [orders, setOrders] = useState<RecentDirectOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchRecentOrders = async () => {
    try {
      const res = await fetch("/api/options/order/recent");
      if (res.ok) {
        const data = await res.json();
        if (data && data.orders) {
          setOrders(data.orders);
        }
      }
    } catch {
      // Ignore polling errors
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentOrders();
    const interval = setInterval(fetchRecentOrders, 5000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleCancelOrder = async (orderId: string, broker: string) => {
    setCancellingId(orderId);
    try {
      const res = await fetch("/api/options/order/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, broker }),
      });
      if (res.ok) {
        await fetchRecentOrders();
      }
    } catch {
      // Ignore
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: OrderExecutionStatus) => {
    switch (status) {
      case "TRADED":
      case "FILLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            TRADED
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            REJECTED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            CANCELLED
          </span>
        );
      case "PENDING":
      case "SUBMITTING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <RefreshCw className="w-3 h-3 animate-spin" />
            PENDING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl bg-[#09101E] border border-slate-800/90 overflow-hidden font-mono text-slate-200">
      <div className="p-3 bg-[#0C1527] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-black tracking-wide text-white">
            RECENT DIRECT ORDERS
          </h3>
          <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-400">
            {orders.length}
          </span>
        </div>
        <button
          type="button"
          onClick={fetchRecentOrders}
          className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          title="Refresh orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px] text-left">
          <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
            <tr>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Broker</th>
              <th className="py-2.5 px-3">Symbol</th>
              <th className="py-2.5 px-3 text-right">Strike</th>
              <th className="py-2.5 px-3 text-center">Type</th>
              <th className="py-2.5 px-3 text-center">Side</th>
              <th className="py-2.5 px-3 text-right">Qty</th>
              <th className="py-2.5 px-3 text-right">Price</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3">Order ID</th>
              <th className="py-2.5 px-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500">
                  No recent direct orders. Execute from the Option Chain table above.
                </td>
              </tr>
            ) : (
              orders.map((ord) => {
                const isBuy = ord.side === "BUY";
                const isCall = ord.optionType === "CALL";
                const timeStr = ord.time
                  ? new Date(ord.time).toLocaleTimeString()
                  : "—";

                return (
                  <tr key={ord.orderId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{timeStr}</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                        {ord.broker}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-white whitespace-nowrap">{ord.symbol}</td>
                    <td className="py-2 px-3 text-right text-slate-300 font-bold">
                      {formatNumber(ord.strike)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isCall
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-purple-500/20 text-purple-300"
                        }`}
                      >
                        {ord.optionType}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          isBuy
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {ord.side}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-200">{ord.qty}</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                      {currency}{ord.price ? ord.price.toFixed(2) : "0.00"}
                    </td>
                    <td className="py-2 px-3 text-center">{getStatusBadge(ord.status)}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-400 max-w-[140px] truncate" title={ord.orderId}>
                      {ord.orderId}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {ord.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord.orderId, ord.broker)}
                          disabled={cancellingId === ord.orderId}
                          className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 text-[10px] font-bold transition-colors"
                        >
                          Cancel
                        </button>
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
  );
};
