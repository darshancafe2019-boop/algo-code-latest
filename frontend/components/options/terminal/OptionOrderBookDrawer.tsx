"use client";

import React, { useState } from "react";
import {
  X,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sliders,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit2,
  ArrowRight,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { apiClient } from "@/lib/apiClient";

interface OptionOrderBookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  onModifyOrder?: (order: any) => void;
}

export const OptionOrderBookDrawer: React.FC<OptionOrderBookDrawerProps> = ({
  isOpen,
  onClose,
  currency = "₹",
  onModifyOrder,
}) => {
  const { orders = [], tradingMode, refreshAll } = useGlobalData();
  const [filterTab, setFilterTab] = useState<"ALL" | "OPEN" | "FILLED" | "CANCELLED">("ALL");
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string } | null>(null);

  if (!isOpen) return null;

  const filteredOrders = orders.filter((ord: any) => {
    const st = (ord.status || ord.order_status || "OPEN").toUpperCase();
    if (filterTab === "OPEN") return ["OPEN", "PENDING", "SUBMITTED", "TRIGGER_PENDING"].includes(st);
    if (filterTab === "FILLED") return ["FILLED", "EXECUTED", "COMPLETE"].includes(st);
    if (filterTab === "CANCELLED") return ["CANCELLED", "REJECTED", "FAILED"].includes(st);
    return true;
  });

  const handleCancelOrder = async (orderId: string) => {
    if (cancellingOrderId) return;
    setCancellingOrderId(orderId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && data.status !== "SUCCESS") {
        throw new Error(data.message || "Failed to cancel order");
      }
      setFeedback({ status: "success", message: `Order #${orderId} cancelled successfully.` });
      await refreshAll();
    } catch (err: any) {
      setFeedback({ status: "error", message: err.message || "Cancellation failed." });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || "OPEN").toUpperCase();
    if (["FILLED", "EXECUTED", "COMPLETE"].includes(s)) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          FILLED
        </span>
      );
    }
    if (["OPEN", "PENDING", "SUBMITTED"].includes(s)) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
          <Clock className="w-3 h-3 animate-spin" />
          OPEN
        </span>
      );
    }
    if (["CANCELLED"].includes(s)) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
          CANCELLED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        {s}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150 font-mono text-xs">
      <div className="bg-[#0A101D] border border-slate-800 rounded-2xl max-w-2xl w-full p-4 md:p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              📑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-tight">Option Chain Order Book</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {orders.length} Total
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Live order synchronization & execution status</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refreshAll()}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh Order Book"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#060A12] p-1 rounded-xl border border-slate-800 flex-shrink-0">
          {[
            { id: "ALL", label: `All Orders (${orders.length})` },
            {
              id: "OPEN",
              label: `Open (${
                orders.filter((o: any) => ["OPEN", "PENDING", "SUBMITTED"].includes((o.status || "").toUpperCase())).length
              })`,
            },
            {
              id: "FILLED",
              label: `Filled (${
                orders.filter((o: any) => ["FILLED", "EXECUTED", "COMPLETE"].includes((o.status || "").toUpperCase())).length
              })`,
            },
            {
              id: "CANCELLED",
              label: `Cancelled / Rejected (${
                orders.filter((o: any) => ["CANCELLED", "REJECTED", "FAILED"].includes((o.status || "").toUpperCase())).length
              })`,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 text-center ${
                filterTab === t.id
                  ? "bg-cyan-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center justify-between border ${
              feedback.status === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
            }`}
          >
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback(null)} className="font-bold text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Orders Table List */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-800 rounded-xl bg-[#060A12] divide-y divide-slate-800/60">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <Clock className="w-6 h-6 text-slate-600" />
              <span>No orders found in {filterTab} status.</span>
            </div>
          ) : (
            filteredOrders.map((ord: any) => {
              const id = ord.order_id || ord.id || ord.client_order_id;
              const isBuy = (ord.side || ord.direction || "BUY").toUpperCase() in ["BUY", "LONG"];
              const qty = ord.quantity || ord.amount || 1;
              const filledQty = ord.filled_quantity || ord.filledQty || (ord.status === "FILLED" ? qty : 0);
              const price = ord.price || ord.limit_price || ord.fill_price || 0;
              const statusStr = ord.status || ord.order_status || "OPEN";
              const isOpenOrder = ["OPEN", "PENDING", "SUBMITTED"].includes(statusStr.toUpperCase());
              const timeStr = ord.timestamp || ord.created_at || new Date().toLocaleTimeString();

              return (
                <div key={id} className="p-3 hover:bg-slate-800/30 transition flex items-center justify-between gap-3">
                  {/* Left: Contract, Side, Symbol */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-black ${
                        isBuy ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                      }`}
                    >
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-extrabold truncate text-xs">{ord.symbol}</span>
                        {ord.order_type && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400 font-bold">
                            {ord.order_type}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>ID: #{String(id).slice(-8)}</span>
                        <span>•</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center: Qty and Price */}
                  <div className="text-right">
                    <div className="text-white font-bold text-xs">
                      {filledQty} / {qty} Qty
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      @ {currency}
                      {price.toFixed(2)}
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(statusStr)}

                    {isOpenOrder && (
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(id)}
                        disabled={cancellingOrderId === id}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
                        title="Cancel Order"
                      >
                        {cancellingOrderId === id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3 flex-shrink-0">
          <div>
            Mode: <strong className={tradingMode === "LIVE" ? "text-rose-400" : "text-emerald-400"}>{tradingMode}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
