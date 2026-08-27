"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useGlobalData } from "@/context/GlobalDataContext";
import { ExternalLink, RefreshCw } from "lucide-react";
import { PositionItem, OrderItem } from "@/types/global-data";

export function OptionsPositionsOrdersDock() {
  const { positions, orders, tradingMode, isLive, refreshAll, isLoading } = useGlobalData();
  const [activeTab, setActiveTab] = useState<"positions" | "orders">("positions");
  const [isClosing, setIsClosing] = useState<string | null>(null);

  // Filter positions for active ones
  const openPositions = positions.filter((p) => p.status === "OPEN" || p.status === "RUNNING");
  const openOrders = orders.filter((o) => o.status === "OPEN" || o.status === "PARTIALLY_FILLED");

  const handleClosePosition = async (pos: PositionItem) => {
    if (isClosing) return;
    setIsClosing(pos.id);
    try {
      await fetch("/api/positions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_id: pos.id,
          symbol: pos.symbol,
          quantity: pos.quantity,
          mode: tradingMode,
        }),
      });
      await refreshAll();
    } catch (e) {
      console.error("Failed to close position:", e);
    } finally {
      setIsClosing(null);
    }
  };

  return (
    <div className="bg-[#0B132B]/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl font-mono text-xs">
      {/* Dock Tabs Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("positions")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === "positions"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Active Positions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {openPositions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Working Orders</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {openOrders.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshAll()}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href={activeTab === "positions" ? "/positions" : "/orders"}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
          >
            <span>View Full Ledger</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Content View */}
      <div className="overflow-x-auto max-h-[300px]">
        {activeTab === "positions" ? (
          openPositions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-mono">
              No active open options positions in {tradingMode} mode.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 px-4 font-semibold">Instrument</th>
                  <th className="py-2 px-3 font-semibold">Side</th>
                  <th className="py-2 px-3 text-right font-semibold">Quantity</th>
                  <th className="py-2 px-3 text-right font-semibold">Entry Price</th>
                  <th className="py-2 px-3 text-right font-semibold">Mark / LTP</th>
                  <th className="py-2 px-4 text-right font-semibold">Unrealized P&L</th>
                  <th className="py-2 px-4 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {openPositions.map((pos) => {
                  const pnl = pos.unrealized_pnl || 0;
                  const isProfit = pnl >= 0;
                  const isBuy = pos.direction === "LONG";
                  const isClosingThis = isClosing === pos.id;

                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <span>{pos.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {pos.bot_id || "Manual"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBuy ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {isBuy ? "BUY" : "SELL"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {pos.quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        ₹{pos.entry_price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-cyan-300 font-bold">
                        ₹{pos.current_price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono">
                        <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>
                          {isProfit ? "+" : ""}₹{pnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          disabled={isClosingThis}
                          onClick={() => handleClosePosition(pos)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 rounded-lg transition disabled:opacity-50"
                        >
                          {isClosingThis ? "Closing..." : "Close"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : openOrders.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-mono">
            No working orders in {tradingMode} mode.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2 px-4 font-semibold">Order ID</th>
                <th className="py-2 px-4 font-semibold">Instrument</th>
                <th className="py-2 px-3 font-semibold">Side</th>
                <th className="py-2 px-3 text-right font-semibold">Qty</th>
                <th className="py-2 px-3 text-right font-semibold">Price</th>
                <th className="py-2 px-4 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {openOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-4 text-slate-400 font-mono text-[11px]">
                    #{ord.id.substring(0, 10)}
                  </td>
                  <td className="py-2 px-4 font-bold text-white">{ord.symbol}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.direction === "BUY" || ord.direction === "LONG"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/20 text-rose-400"
                      }`}
                    >
                      {ord.direction}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {ord.requested_quantity.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">
                    {ord.price ? `₹${ord.price.toFixed(2)}` : "MARKET"}
                  </td>
                  <td className="py-2 px-4 text-right font-mono">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
