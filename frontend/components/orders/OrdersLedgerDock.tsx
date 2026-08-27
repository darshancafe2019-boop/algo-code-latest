"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useGlobalData } from "@/context/GlobalDataContext";
import { ExternalLink, RefreshCw, SlidersHorizontal, Check, ChevronDown } from "lucide-react";
import { OrderItem } from "@/types/global-data";

export function OrdersLedgerDock() {
  const { orders, tradingMode, refreshAll, isLoading } = useGlobalData();
  const [activeTab, setActiveTab] = useState<"open" | "filled" | "all">("open");
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    client_id: false,
    order_type: true,
    fees: false,
    bot_id: false,
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED"
    );
  }, [orders]);

  const filledOrders = useMemo(() => {
    return orders.filter((o) => o.status === "FILLED");
  }, [orders]);

  const displayedOrders = useMemo(() => {
    if (activeTab === "open") return openOrders;
    if (activeTab === "filled") return filledOrders;
    return orders;
  }, [activeTab, openOrders, filledOrders, orders]);

  return (
    <div className="bg-[#0B132B]/85 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl font-mono text-xs">
      {/* Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === "open"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Open Orders</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {openOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("filled")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === "filled"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Filled Orders</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {filledOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Full History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {orders.length}
            </span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Columns</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {showColumnsDropdown && (
            <div className="absolute right-12 top-8 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in duration-150">
              {[
                { key: "client_id", label: "Client Order ID" },
                { key: "order_type", label: "Order Type" },
                { key: "fees", label: "Estimated Fees" },
                { key: "bot_id", label: "Bot / Strategy" },
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => toggleColumn(c.key)}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  <span>{c.label}</span>
                  {visibleColumns[c.key] && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => refreshAll()}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/trade-journal"
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition ml-1"
          >
            <span>Journal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto max-h-[300px]">
        {displayedOrders.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-mono">
            No {activeTab} orders recorded in {tradingMode} mode.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                {visibleColumns.client_id && <th className="py-2.5 px-3">Order ID</th>}
                <th className="py-2.5 px-3 font-semibold">Instrument</th>
                <th className="py-2.5 px-3 font-semibold">Side</th>
                {visibleColumns.order_type && <th className="py-2.5 px-3">Type</th>}
                <th className="py-2.5 px-3 text-right font-semibold">Size</th>
                <th className="py-2.5 px-3 text-right font-semibold">Price</th>
                <th className="py-2.5 px-3 text-right font-semibold">Status</th>
                {visibleColumns.bot_id && <th className="py-2.5 px-3 text-right">Origin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {displayedOrders.map((ord, idx) => {
                const isBuy = ord.direction === "BUY" || ord.direction === "LONG";
                const isFilled = ord.status === "FILLED";
                const timeStr = ord.created_at
                  ? ord.created_at.substring(11, 19)
                  : "Recent";

                return (
                  <tr key={ord.id || idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 text-slate-400">{timeStr}</td>
                    {visibleColumns.client_id && (
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">
                        #{ord.id.substring(0, 8)}
                      </td>
                    )}
                    <td className="py-2.5 px-3 font-bold text-white">{ord.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                    </td>
                    {visibleColumns.order_type && (
                      <td className="py-2.5 px-3 text-slate-400">{ord.order_type}</td>
                    )}
                    <td className="py-2.5 px-3 text-right text-slate-300 font-mono">
                      {ord.requested_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300 font-mono font-bold">
                      ${ord.price ? ord.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "MARKET"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isFilled
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-cyan-500/10 text-cyan-400 animate-pulse"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    {visibleColumns.bot_id && (
                      <td className="py-2.5 px-3 text-right text-slate-400 text-[10px]">
                        {ord.bot_id}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
