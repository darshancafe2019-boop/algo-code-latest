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
    client_id: true,
    order_type: true,
    fees: false,
    bot_id: false,
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openOrders = useMemo(() => {
    return orders.filter(
      (o) => (o.status as string) === "OPEN" || (o.status as string) === "PARTIALLY_FILLED" || (o.status as string) === "WORKING"
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
    <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl overflow-hidden font-sans text-xs">
      {/* Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0A1422] border-b border-[#1A2A3F]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("open")}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeTab === "open"
                ? "bg-[#2563EB] text-white shadow-sm"
                : "bg-[#0D1727] border border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F]"
            }`}
          >
            <span>Open Orders</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono tabular-nums ${
              activeTab === "open" ? "bg-white/20 text-white" : "bg-[#101B2D] text-[#7C8CA3]"
            }`}>
              {openOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("filled")}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeTab === "filled"
                ? "bg-[#2563EB] text-white shadow-sm"
                : "bg-[#0D1727] border border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F]"
            }`}
          >
            <span>Filled Orders</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono tabular-nums ${
              activeTab === "filled" ? "bg-white/20 text-white" : "bg-[#101B2D] text-[#7C8CA3]"
            }`}>
              {filledOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-[#2563EB] text-white shadow-sm"
                : "bg-[#0D1727] border border-[#1A2A3F] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F]"
            }`}
          >
            <span>Full History</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono tabular-nums ${
              activeTab === "all" ? "bg-white/20 text-white" : "bg-[#101B2D] text-[#7C8CA3]"
            }`}>
              {orders.length}
            </span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[#1A2A3F] bg-[#0D1727] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F] transition"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Columns</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {showColumnsDropdown && (
            <div className="absolute right-12 top-10 w-48 bg-[#0D1727] border border-[#1A2A3F] rounded-lg shadow-2xl p-2 z-50 animate-in fade-in duration-150">
              {[
                { key: "client_id", label: "Client Order ID" },
                { key: "order_type", label: "Order Type" },
                { key: "fees", label: "Estimated Fees" },
                { key: "bot_id", label: "Bot / Strategy" },
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => toggleColumn(c.key)}
                  className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-left text-[#7C8CA3] hover:bg-[#101B2D] hover:text-[#F7FAFC] transition"
                >
                  <span>{c.label}</span>
                  {visibleColumns[c.key] && <Check className="w-3.5 h-3.5 text-[#22D3EE]" />}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => refreshAll()}
            className="p-1.5 rounded-lg border border-[#1A2A3F] bg-[#0D1727] text-[#7C8CA3] hover:text-[#F7FAFC] hover:border-[#29415F] transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/trade-journal"
            className="flex items-center gap-1 text-[11px] text-[#22D3EE] hover:text-[#19C5FF] transition ml-1 font-medium"
          >
            <span>Journal</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto max-h-[340px]">
        {displayedOrders.length === 0 ? (
          <div className="py-10 text-center text-[#52627A]">
            No {activeTab} orders recorded in {tradingMode} mode.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#101B2D] text-[#7C8CA3] border-b border-[#1A2A3F] text-[11px] uppercase tracking-wider font-medium">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                {visibleColumns.client_id && <th className="py-2.5 px-3">Order / Client ID</th>}
                <th className="py-2.5 px-3">Instrument</th>
                <th className="py-2.5 px-3">Side</th>
                {visibleColumns.order_type && <th className="py-2.5 px-3">Type</th>}
                <th className="py-2.5 px-3 text-right">Size</th>
                <th className="py-2.5 px-3 text-right">Price</th>
                <th className="py-2.5 px-3 text-right">Status</th>
                {visibleColumns.bot_id && <th className="py-2.5 px-3 text-right">Origin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2A3F]/60">
              {displayedOrders.map((ord, idx) => {
                const isBuy = (ord.direction || "").toUpperCase().includes("BUY") || (ord.direction || "") === "LONG";
                const isFilled = ord.status === "FILLED";
                const isRejected = ord.status === "REJECTED" || ord.status === "CANCELLED";
                const timeStr = ord.created_at
                  ? ord.created_at.substring(11, 19)
                  : "Recent";

                return (
                  <tr key={ord.id || idx} className="hover:bg-[#101B2D]/60 transition">
                    <td className="py-2.5 px-3 text-[#52627A] font-mono tabular-nums text-[11px]">{timeStr}</td>
                    {visibleColumns.client_id && (
                      <td className="py-2.5 px-3 text-[#7C8CA3] font-mono tabular-nums text-[11px]">
                        #{ord.id.substring(0, 8)}
                      </td>
                    )}
                    <td className="py-2.5 px-3 font-semibold text-[#F7FAFC]">{ord.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          isBuy
                            ? "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30"
                            : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
                        }`}
                      >
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                    </td>
                    {visibleColumns.order_type && (
                      <td className="py-2.5 px-3 text-[#7C8CA3]">{ord.order_type || "MARKET"}</td>
                    )}
                    <td className="py-2.5 px-3 text-right text-[#F7FAFC] font-mono tabular-nums">
                      {ord.requested_quantity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#F7FAFC] font-mono tabular-nums font-semibold">
                      ${ord.price ? ord.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "MARKET"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          isFilled
                            ? "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30"
                            : isRejected
                            ? "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
                            : "bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30 animate-pulse"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    {visibleColumns.bot_id && (
                      <td className="py-2.5 px-3 text-right text-[#52627A] text-[11px] font-mono">
                        {ord.bot_id || "manual"}
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

