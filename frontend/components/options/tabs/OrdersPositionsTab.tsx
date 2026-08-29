"use client";

import React, { useState, useEffect } from "react";
import { Layers, CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

export interface OrdersPositionsTabProps {
  currencySymbol?: string;
}

export function OrdersPositionsTab({ currencySymbol = "₹" }: OrdersPositionsTabProps) {
  const [positions, setPositions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"positions" | "orders">("positions");

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const res = await fetch("/api/options/positions");
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch (err) {
      console.error("Fetch positions error:", err);
    }
  };

  const handleSquareOff = async (posId: string) => {
    try {
      const res = await fetch(`/api/options/position/${posId}/squareoff`, {
        method: "POST",
      });
      if (res.ok) {
        fetchPositions();
      }
    } catch (err) {
      console.error("Square off error:", err);
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("positions")}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTab === "positions"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Open Positions ({positions.length})
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTab === "orders"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Order Audit Log
            </button>
          </div>
        </div>

        <button
          onClick={fetchPositions}
          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="w-full h-48 flex items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 font-mono text-xs">
          No open options/pairs positions found in broker ledger.
        </div>
      ) : (
        <div className="bg-[#080E1E] border border-slate-800 rounded-2xl p-4 shadow-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2 px-3">Position ID</th>
                <th className="py-2 px-3">Strategy / Pair</th>
                <th className="py-2 px-3">Underlying</th>
                <th className="py-2 px-3">Direction</th>
                <th className="py-2 px-3 text-right">Quantity / Lots</th>
                <th className="py-2 px-3 text-right">Entry Price</th>
                <th className="py-2 px-3 text-right">Unrealized P&L</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {positions.map((p) => (
                <tr key={p.position_id} className="hover:bg-slate-900/60 transition">
                  <td className="py-2.5 px-3 text-white font-bold">{p.position_id}</td>
                  <td className="py-2.5 px-3 text-slate-200">{p.strategy_name || p.strategy_id}</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">{p.underlying}</td>
                  <td className="py-2.5 px-3 text-slate-300">{p.direction || "NEUTRAL"}</td>
                  <td className="py-2.5 px-3 text-right text-white font-bold">{p.lots || p.quantity || 1}</td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {currencySymbol}{p.net_cash_flow || p.entry_price || 0}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-extrabold ${
                      (p.unrealized_pnl || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {(p.unrealized_pnl || 0) >= 0 ? "+" : ""}
                    {currencySymbol}{(p.unrealized_pnl || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                      {p.status || "OPEN"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handleSquareOff(p.position_id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-[11px] font-bold transition flex items-center gap-1 mx-auto"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>Square Off</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
