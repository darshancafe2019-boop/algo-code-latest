"use client";

import React, { useState } from "react";
import { ListOrdered, Receipt, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatDateTime } from "@/lib/formatters";

export interface OrderRecord {
  id: string;
  exchangeOrderId: string;
  contract: string;
  orderType: string;
  side: "BUY" | "SELL";
  requestedQty: number;
  filledQty: number;
  remainingQty: number;
  avgFillPrice: number;
  fees: number;
  submissionTime: string;
  lastUpdated: string;
  status: "OPEN" | "FILLED" | "PARTIALLY_FILLED" | "CANCELLED" | "REJECTED";
}

interface OrdersAndFillsSectionProps {
  orders: OrderRecord[];
  currencySymbol?: string;
}

type OrderTab = "OPEN" | "EXECUTED" | "PARTIALLY_FILLED" | "CANCELLED" | "REJECTED" | "TRADE_HISTORY";

export function OrdersAndFillsSection({
  orders,
  currencySymbol = "₹",
}: OrdersAndFillsSectionProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>("EXECUTED");

  const filteredOrders = orders.filter((ord) => {
    if (activeTab === "OPEN") return ord.status === "OPEN";
    if (activeTab === "EXECUTED" || activeTab === "TRADE_HISTORY") return ord.status === "FILLED";
    if (activeTab === "PARTIALLY_FILLED") return ord.status === "PARTIALLY_FILLED";
    if (activeTab === "CANCELLED") return ord.status === "CANCELLED";
    if (activeTab === "REJECTED") return ord.status === "REJECTED";
    return true;
  });

  const TABS: Array<{ key: OrderTab; label: string; count: number }> = [
    { key: "OPEN", label: "Open Orders", count: orders.filter((o) => o.status === "OPEN").length },
    { key: "EXECUTED", label: "Executed Orders", count: orders.filter((o) => o.status === "FILLED").length },
    { key: "PARTIALLY_FILLED", label: "Partially Filled", count: orders.filter((o) => o.status === "PARTIALLY_FILLED").length },
    { key: "CANCELLED", label: "Cancelled Orders", count: orders.filter((o) => o.status === "CANCELLED").length },
    { key: "REJECTED", label: "Rejected Orders", count: orders.filter((o) => o.status === "REJECTED").length },
    { key: "TRADE_HISTORY", label: "Trade History", count: orders.filter((o) => o.status === "FILLED").length },
  ];

  return (
    <div className="rounded-[8px] bg-[#091426] border border-[#1A2B43] p-4 space-y-3 font-sans select-none shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1A2B43]/70">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4 text-[#00C9E8]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono">
            Orders, Fills &amp; Execution Ledger
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#00D6A0]">OMS Synchronized</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 border-b border-[#1A2B43]/60">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-mono font-bold transition-all border cursor-pointer shrink-0",
              activeTab === t.key
                ? "bg-[#0878FF] text-white border-[#0878FF] shadow-sm"
                : "bg-[#050B16] text-[#91A7C1] border-[#1A2B43] hover:text-[#EAF3FF]"
            )}
          >
            <span>{t.label}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] tabular-nums",
                activeTab === t.key ? "bg-white/20 text-white" : "bg-[#0B1728] text-[#91A7C1]"
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-[6px] border border-[#1A2B43] bg-[#050B16] max-h-72 custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse font-mono min-w-[1100px]">
          <thead className="sticky top-0 bg-[#081321] z-10">
            <tr className="text-[#91A7C1] border-b border-[#1A2B43] h-9 uppercase font-bold text-[10px]">
              <th className="px-3 py-1.5">Order ID</th>
              <th className="px-3 py-1.5">Exchange ID</th>
              <th className="px-3 py-1.5">Contract</th>
              <th className="px-2 py-1.5">Type</th>
              <th className="px-2 py-1.5 text-center">Side</th>
              <th className="px-3 py-1.5 text-right">Requested</th>
              <th className="px-3 py-1.5 text-right">Filled</th>
              <th className="px-3 py-1.5 text-right">Remaining</th>
              <th className="px-3 py-1.5 text-right">Avg Fill Price</th>
              <th className="px-3 py-1.5 text-right">Fees</th>
              <th className="px-3 py-1.5 text-right">Submission Time</th>
              <th className="px-2 py-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A2B43]/50">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-10 text-[#91A7C1]">
                  No orders recorded under the {activeTab.replace("_", " ")} tab.
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => {
                const isBuy = ord.side === "BUY";
                return (
                  <tr key={ord.id} className="hover:bg-[#0D1D35]/50 transition-colors">
                    <td className="px-3 py-2 font-bold text-[#00C9E8]">{ord.id}</td>
                    <td className="px-3 py-2 text-[#91A7C1] text-[11px]">{ord.exchangeOrderId || "N/A"}</td>
                    <td className="px-3 py-2 font-bold text-[#EAF3FF]">{ord.contract}</td>
                    <td className="px-2 py-2 text-[#91A7C1]">{ord.orderType}</td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold border",
                          isBuy
                            ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                            : "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                        )}
                      >
                        {ord.side}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#EAF3FF]">{ord.requestedQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#00D6A0] font-bold">{ord.filledQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#91A7C1]">{ord.remainingQty}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-[#00C9E8]">
                      {currencySymbol}{formatNumber(ord.avgFillPrice, 2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[#FFB020]">
                      {currencySymbol}{formatNumber(ord.fees, 2)}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-[#91A7C1] tabular-nums">
                      {formatDateTime(ord.submissionTime)}
                    </td>
                    <td className="px-2 py-2 text-center font-bold">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] border",
                          ord.status === "FILLED"
                            ? "bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30"
                            : ord.status === "CANCELLED"
                              ? "bg-[#FF5268]/15 text-[#FF5268] border-[#FF5268]/30"
                              : "bg-[#0878FF]/15 text-[#0878FF] border-[#0878FF]/30"
                        )}
                      >
                        {ord.status}
                      </span>
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

