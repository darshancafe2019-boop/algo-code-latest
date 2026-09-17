"use client";

import { formatMoney } from "@/lib/formatters";
import React, { useState } from "react";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Sliders,
  XCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { RiskPosition } from "@/types/risk";

interface PositionRiskTableProps {
  positions: RiskPosition[];
  onRefresh?: () => void;
}

export function PositionRiskTable({ positions = [], onRefresh }: PositionRiskTableProps) {
  const [activeActionId, setActiveActionId] = useState<string | number | null>(null);

  const handleClosePosition = async (id: string | number) => {
    setActiveActionId(id);
    try {
      await fetch(`/api/positions/${id}/close`, { method: "POST" });
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Open Position Risk Ledger
          </h3>
          <p className="text-[11px] text-[#7C8CA3]">
            Real-time margin utilization, stop-loss distance, and liquidation exposure across all active broker positions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-[rgba(37,99,235,0.18)] text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-bold">
            {positions.length} Positions Active
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-[#07101A] border border-[#1A2A3F] text-slate-400 hover:text-white transition"
              title="Refresh positions"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-[#09110E] border border-[#1A2A3F] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#07101A] text-[#52627A] text-[10px] uppercase tracking-wider border-b border-[#142233]">
              <tr>
                <th className="py-2.5 px-3">Position / Bot</th>
                <th className="py-2.5 px-3">Side / Size</th>
                <th className="py-2.5 px-3 text-right">Entry Price</th>
                <th className="py-2.5 px-3 text-right">Mark Price</th>
                <th className="py-2.5 px-3 text-right">SL / TP</th>
                <th className="py-2.5 px-3 text-right">Margin / Risk</th>
                <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142233] text-slate-200">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans text-xs">
                    No active open positions in risk ledger.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const isLong = (pos.direction || "").toUpperCase() === "LONG";
                  const isProfit = (pos.unrealized_pnl || 0) >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-[rgba(37,99,235,0.18)]/30 transition-colors">
                      {/* Symbol */}
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="block">{pos.symbol}</span>
                        <span className="text-[10px] text-[#52627A] font-normal">{pos.asset_class}</span>
                      </td>

                    {/* Side */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isLong
                            ? "bg-emerald-950 text-[#22D3EE] border border-emerald-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {pos.direction}
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="py-3.5 px-3 font-semibold text-[#F7FAFC]">
                      {pos.quantity}
                    </td>

                    {/* Entry / Current */}
                    <td className="py-3.5 px-3">
                      <span className="text-white block">{formatMoney(pos.entry_price, "$")}</span>
                      <span className="text-[10px] text-cyan-300 block">
                        {formatMoney(pos.current_price ?? pos.entry_price, "$")}
                      </span>
                    </td>

                    {/* Exposure / Margin */}
                    <td className="py-3.5 px-3">
                      <span className="text-white block">{formatMoney(pos.position_value, "$")}</span>
                      <span className="text-[10px] text-[#52627A] block">
                        Margin: {formatMoney(pos.margin_used, "$")} ({pos.leverage}x)
                      </span>
                    </td>

                    {/* SL / TP */}
                    <td className="py-3.5 px-3">
                      <span className="text-red-400 block">SL: {formatMoney(pos.stop_loss, "$")}</span>
                      <span className="text-[#22D3EE] text-[10px] block">
                        TP: {pos.take_profit ? formatMoney(pos.take_profit, "$") : "Auto Trailing"}
                      </span>
                    </td>

                    {/* Risk $ / % */}
                    <td className="py-3.5 px-3">
                      <span className="text-purple-300 font-bold block">${pos.risk_amount.toFixed(2)}</span>
                      <span className="text-[10px] text-[#52627A] block">{pos.risk_pct || 1.0}% Equity</span>
                    </td>

                    {/* Unrealized P&L */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-bold block ${
                          isProfit ? "text-[#22D3EE]" : "text-red-400"
                        }`}
                      >
                        {isProfit ? "+" : ""}${pos.unrealized_pnl.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#52627A] block">
                        {pos.distance_to_sl_pct ? `${pos.distance_to_sl_pct.toFixed(1)}% to SL` : "Protected"}
                      </span>
                    </td>

                    {/* Risk Status */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40">
                        {pos.risk_status || "SAFE"}
                      </span>
                    </td>

                    {/* Protection Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          disabled={activeActionId === pos.id}
                          className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          {activeActionId === pos.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          <span>Close</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
