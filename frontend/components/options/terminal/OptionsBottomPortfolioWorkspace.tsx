"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { PositionItem, OrderItem } from "@/types/global-data";
import { formatNumber, formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface OptionsBottomPortfolioWorkspaceProps {
  currency?: string;
  underlying?: string;
}

export function OptionsBottomPortfolioWorkspace({
  currency = "₹",
  underlying = "NIFTY",
}: OptionsBottomPortfolioWorkspaceProps) {
  const { positions, orders, tradingMode, refreshAll, isLoading } = useGlobalData();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"POSITIONS" | "PENDING" | "EXECUTED" | "HISTORY">("POSITIONS");
  const [isClosingId, setIsClosingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Filter positions and orders
  const openPositions = positions.filter((p) => p.status === "OPEN" || p.status === "RUNNING");
  const pendingOrders = orders.filter((o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED");
  const executedOrders = orders.filter((o) => o.status === "FILLED");
  const historyTrades = orders.filter((o) => o.status === "FILLED" || o.status === "CANCELLED");

  // Handle Close Position
  const handleClosePosition = async (pos: PositionItem) => {
    if (isClosingId) return;
    setIsClosingId(pos.id);
    try {
      const res = await fetch("/api/positions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_id: pos.id,
          symbol: pos.symbol,
          quantity: pos.quantity,
          mode: tradingMode,
        }),
      });
      if (!res.ok) throw new Error("Failed to send close order");
      setActionFeedback(`Closed position for ${pos.symbol}`);
      await refreshAll();
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    } finally {
      setIsClosingId(null);
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: tradingMode }),
      });
      if (!res.ok) throw new Error("Failed to cancel order");
      setActionFeedback(`Order #${orderId} cancelled`);
      await refreshAll();
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    } finally {
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  return (
    <div className="w-full bg-[#081321] border border-[#1A2B43] rounded-xl overflow-hidden shadow-xl font-mono text-xs select-none">
      {/* Workspace Header Strip */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0B1728] border-b border-[#1A2B43]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#00C9E8]" />
            <span className="font-bold text-[#EAF3FF] text-[13px] tracking-tight">
              POSITIONS, WORKING ORDERS & AUDIT TRAIL
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-[#00C9E8]/10 text-[#00C9E8] border border-[#00C9E8]/30 font-bold">
              {openPositions.length} POSITIONS
            </span>
            <span className="px-2 py-0.5 rounded bg-[#0878FF]/10 text-[#0878FF] border border-[#0878FF]/30 font-bold">
              {pendingOrders.length} WORKING
            </span>
            <span className="px-2 py-0.5 rounded bg-[#00D6A0]/10 text-[#00D6A0] border border-[#00D6A0]/30 font-bold">
              MODE: {tradingMode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actionFeedback && (
            <span className="text-[11px] font-sans text-[#F5B942] animate-pulse">
              {actionFeedback}
            </span>
          )}

          <button
            type="button"
            onClick={() => refreshAll()}
            className="p-1 rounded text-[#91A7C1] hover:text-[#EAF3FF] hover:bg-[#1A2B43] transition"
            title="Refresh Portfolio"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", isLoading && "animate-spin text-[#00C9E8]")} />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#0B1A2F] text-[#91A7C1] hover:text-[#EAF3FF] hover:bg-[#122540] border border-[#1A2B43] text-[11px] transition"
          >
            <span>{isExpanded ? "Collapse" : "Expand"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="flex flex-col">
          {/* Internal Tab Bar */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#06101D] border-b border-[#1A2B43] text-[11px]">
            {[
              { id: "POSITIONS", label: "Open Positions", count: openPositions.length },
              { id: "PENDING", label: "Pending Orders", count: pendingOrders.length },
              { id: "EXECUTED", label: "Executed Orders", count: executedOrders.length },
              { id: "HISTORY", label: "Trade History", count: historyTrades.length },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 border",
                    isActive
                      ? "bg-[#0B1728] border-[#00C9E8] text-[#00C9E8] shadow-xs"
                      : "bg-transparent border-transparent text-[#91A7C1] hover:text-[#EAF3FF] hover:bg-[#0B1728]/50"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded-full",
                      isActive ? "bg-[#00C9E8]/20 text-[#00C9E8]" : "bg-[#1A2B43] text-[#91A7C1]"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Open Positions */}
          {activeTab === "POSITIONS" && (
            <div className="overflow-x-auto max-h-[260px]">
              {openPositions.length === 0 ? (
                <div className="py-8 text-center text-[#91A7C1] font-sans text-xs">
                  No active open positions in {tradingMode} mode. Click Buy or Sell on the option chain to initiate a trade.
                </div>
              ) : (
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead className="bg-[#091426] text-[#91A7C1] uppercase text-[10px] border-b border-[#1A2B43] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Contract</th>
                      <th className="py-2 px-3 text-center">Side</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Avg Entry</th>
                      <th className="py-2 px-3 text-right">LTP</th>
                      <th className="py-2 px-3 text-right">Unrealized P&L</th>
                      <th className="py-2 px-3 text-center">Stop Loss</th>
                      <th className="py-2 px-3 text-center">Take Profit</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2B43]/50">
                    {openPositions.map((pos) => {
                      const isProfit = (pos.unrealized_pnl || 0) >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-[#0C1B30] transition">
                          <td className="py-2 px-3 font-bold text-[#EAF3FF]">{pos.symbol}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                pos.direction === "LONG"
                                  ? "bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30"
                                  : "bg-[#FF5268]/15 text-[#FF5268] border border-[#FF5268]/30"
                              )}
                            >
                              {pos.direction}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-[#EAF3FF]">
                            {pos.quantity}
                          </td>
                          <td className="py-2 px-3 text-right text-[#91A7C1]">
                            {currency}{formatNumber(pos.entry_price || 0, 2)}
                          </td>
                          <td className="py-2 px-3 text-right text-[#EAF3FF] font-semibold">
                            {currency}{formatNumber(pos.current_price || pos.entry_price || 0, 2)}
                          </td>
                          <td
                            className={cn(
                              "py-2 px-3 text-right font-bold",
                              isProfit ? "text-[#00D6A0]" : "text-[#FF5268]"
                            )}
                          >
                            {isProfit ? "+" : ""}{currency}{formatNumber(pos.unrealized_pnl || 0, 2)}
                            <span className="text-[10px] ml-1">
                              ({isProfit ? "+" : ""}{(pos.unrealized_pnl_pct || 0).toFixed(2)}%)
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-[#91A7C1]">
                            {pos.stop_loss ? `${currency}${formatNumber(pos.stop_loss, 2)}` : "—"}
                          </td>
                          <td className="py-2 px-3 text-center text-[#91A7C1]">
                            {pos.take_profit ? `${currency}${formatNumber(pos.take_profit, 2)}` : "—"}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleClosePosition(pos)}
                              disabled={isClosingId === pos.id}
                              className="px-2 py-0.5 rounded bg-[#FF5268]/20 hover:bg-[#FF5268]/30 text-[#FF5268] border border-[#FF5268]/40 font-bold transition disabled:opacity-50"
                            >
                              {isClosingId === pos.id ? "Closing..." : "Close"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 2: Pending Orders */}
          {activeTab === "PENDING" && (
            <div className="overflow-x-auto max-h-[260px]">
              {pendingOrders.length === 0 ? (
                <div className="py-8 text-center text-[#91A7C1] font-sans text-xs">
                  No working orders currently open.
                </div>
              ) : (
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead className="bg-[#091426] text-[#91A7C1] uppercase text-[10px] border-b border-[#1A2B43] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Order ID</th>
                      <th className="py-2 px-3">Contract</th>
                      <th className="py-2 px-3 text-center">Type</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Limit Price</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2B43]/50">
                    {pendingOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#0C1B30] transition">
                        <td className="py-2 px-3 text-[#91A7C1] font-mono">#{ord.id.slice(0, 8)}</td>
                        <td className="py-2 px-3 font-bold text-[#EAF3FF]">{ord.symbol}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-[#0878FF]/15 text-[#0878FF] border border-[#0878FF]/30 font-bold text-[10px]">
                            {ord.order_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-[#EAF3FF] font-semibold">
                          {ord.requested_quantity}
                        </td>
                        <td className="py-2 px-3 text-right text-[#EAF3FF]">
                          {currency}{formatNumber(ord.price, 2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-[#F5B942]/15 text-[#F5B942] border border-[#F5B942]/30 font-bold text-[10px]">
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord.id)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 border border-slate-700 transition"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 3: Executed Orders */}
          {activeTab === "EXECUTED" && (
            <div className="overflow-x-auto max-h-[260px]">
              {executedOrders.length === 0 ? (
                <div className="py-8 text-center text-[#91A7C1] font-sans text-xs">
                  No orders executed in this session yet.
                </div>
              ) : (
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead className="bg-[#091426] text-[#91A7C1] uppercase text-[10px] border-b border-[#1A2B43] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Order ID</th>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Contract</th>
                      <th className="py-2 px-3 text-center">Side</th>
                      <th className="py-2 px-3 text-right">Filled Qty</th>
                      <th className="py-2 px-3 text-right">Fill Price</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2B43]/50">
                    {executedOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#0C1B30] transition">
                        <td className="py-2 px-3 text-[#91A7C1] font-mono">#{ord.id.slice(0, 8)}</td>
                        <td className="py-2 px-3 text-[#91A7C1]">{new Date(ord.created_at).toLocaleTimeString()}</td>
                        <td className="py-2 px-3 font-bold text-[#EAF3FF]">{ord.symbol}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold",
                              ord.direction === "BUY" || ord.direction === "LONG"
                                ? "bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30"
                                : "bg-[#FF5268]/15 text-[#FF5268] border border-[#FF5268]/30"
                            )}
                          >
                            {ord.direction}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#EAF3FF]">
                          {ord.filled_quantity}
                        </td>
                        <td className="py-2 px-3 text-right text-[#00C9E8] font-semibold">
                          {currency}{formatNumber(ord.price, 2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30 font-bold text-[10px]">
                            FILLED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 4: Trade History */}
          {activeTab === "HISTORY" && (
            <div className="overflow-x-auto max-h-[260px]">
              {historyTrades.length === 0 ? (
                <div className="py-8 text-center text-[#91A7C1] font-sans text-xs">
                  No trade history recorded yet for this session.
                </div>
              ) : (
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                  <thead className="bg-[#091426] text-[#91A7C1] uppercase text-[10px] border-b border-[#1A2B43] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Date / Time</th>
                      <th className="py-2 px-3">Contract</th>
                      <th className="py-2 px-3 text-center">Type</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Avg Price</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Execution Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2B43]/50">
                    {historyTrades.map((item) => (
                      <tr key={item.id} className="hover:bg-[#0C1B30] transition">
                        <td className="py-2 px-3 text-[#91A7C1]">{new Date(item.created_at).toLocaleTimeString()}</td>
                        <td className="py-2 px-3 font-bold text-[#EAF3FF]">{item.symbol}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#00C9E8]">{item.order_type}</td>
                        <td className="py-2 px-3 text-right text-[#EAF3FF]">{item.filled_quantity || item.requested_quantity}</td>
                        <td className="py-2 px-3 text-right text-[#EAF3FF]">{currency}{formatNumber(item.price, 2)}</td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold",
                              item.status === "FILLED"
                                ? "bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-[10px] text-[#00D6A0] font-bold">
                          {item.execution_mode || tradingMode}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

