"use client";

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

  const mockOpenPositions: RiskPosition[] = positions.length > 0 ? positions : [
    {
      id: "pos-1",
      bot_id: "btc-scalper",
      symbol: "BTC/USDT",
      direction: "LONG",
      quantity: 0.05,
      entry_price: 64200.0,
      current_price: 65420.0,
      stop_loss: 63200.0,
      take_profit: 67200.0,
      position_value: 3271.0,
      margin_used: 3271.0,
      risk_amount: 50.0,
      risk_pct: 0.5,
      leverage: 1.0,
      asset_class: "Crypto",
      unrealized_pnl: 61.0,
      distance_to_sl_pct: 3.4,
      distance_to_tp_pct: 2.7,
      risk_status: "SAFE",
    },
    {
      id: "pos-2",
      bot_id: "nifty-trend",
      symbol: "NIFTY-24SEP-24500-CE",
      direction: "LONG",
      quantity: 50,
      entry_price: 140.0,
      current_price: 165.0,
      stop_loss: 110.0,
      take_profit: 200.0,
      position_value: 8250.0,
      margin_used: 8250.0,
      risk_amount: 1500.0,
      risk_pct: 1.5,
      leverage: 1.0,
      asset_class: "Options",
      unrealized_pnl: 1250.0,
      distance_to_sl_pct: 33.3,
      distance_to_tp_pct: 21.2,
      risk_status: "SAFE",
    },
  ];

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
          <p className="text-[11px] text-[#A8BDB0]">
            Live mark-to-market valuations, distance to stop-loss, risk in dollars, and protection bounds.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
          {mockOpenPositions.length} Positions Active
        </span>
      </div>

      {/* Table */}
      <div className="bg-[#0D1914] border border-[#294238] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0A130F] text-[#70877A] text-[10px] uppercase tracking-wider border-b border-[#1B3328]">
              <tr>
                <th className="py-3 px-4">Symbol / Asset</th>
                <th className="py-3 px-3">Side</th>
                <th className="py-3 px-3">Qty</th>
                <th className="py-3 px-3">Entry / Mark</th>
                <th className="py-3 px-3">Exposure / Margin</th>
                <th className="py-3 px-3">SL / TP</th>
                <th className="py-3 px-3">Risk ($ / %)</th>
                <th className="py-3 px-3">Unrealized P&L</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Protection Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B3328]/60 text-slate-200">
              {mockOpenPositions.map((pos) => {
                const isLong = pos.direction.toUpperCase() === "LONG";
                const isProfit = (pos.unrealized_pnl || 0) >= 0;
                return (
                  <tr key={pos.id} className="hover:bg-[#123C2A]/30 transition-colors">
                    {/* Symbol */}
                    <td className="py-3.5 px-4 font-bold text-white">
                      <span className="block">{pos.symbol}</span>
                      <span className="text-[10px] text-[#70877A] font-normal">{pos.asset_class}</span>
                    </td>

                    {/* Side */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isLong
                            ? "bg-emerald-950 text-[#55C98A] border border-emerald-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {pos.direction}
                      </span>
                    </td>

                    {/* Qty */}
                    <td className="py-3.5 px-3 font-semibold text-[#E8F3EC]">
                      {pos.quantity}
                    </td>

                    {/* Entry / Current */}
                    <td className="py-3.5 px-3">
                      <span className="text-white block">${pos.entry_price.toLocaleString()}</span>
                      <span className="text-[10px] text-cyan-300 block">
                        ${pos.current_price?.toLocaleString() || pos.entry_price.toLocaleString()}
                      </span>
                    </td>

                    {/* Exposure / Margin */}
                    <td className="py-3.5 px-3">
                      <span className="text-white block">${pos.position_value.toLocaleString()}</span>
                      <span className="text-[10px] text-[#70877A] block">
                        Margin: ${pos.margin_used.toLocaleString()} ({pos.leverage}x)
                      </span>
                    </td>

                    {/* SL / TP */}
                    <td className="py-3.5 px-3">
                      <span className="text-red-400 block">SL: ${pos.stop_loss.toLocaleString()}</span>
                      <span className="text-[#55C98A] text-[10px] block">
                        TP: ${pos.take_profit ? pos.take_profit.toLocaleString() : "Auto Trailing"}
                      </span>
                    </td>

                    {/* Risk $ / % */}
                    <td className="py-3.5 px-3">
                      <span className="text-purple-300 font-bold block">${pos.risk_amount.toFixed(2)}</span>
                      <span className="text-[10px] text-[#70877A] block">{pos.risk_pct || 1.0}% Equity</span>
                    </td>

                    {/* Unrealized P&L */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-bold block ${
                          isProfit ? "text-[#55C98A]" : "text-red-400"
                        }`}
                      >
                        {isProfit ? "+" : ""}${pos.unrealized_pnl.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#70877A] block">
                        {pos.distance_to_sl_pct ? `${pos.distance_to_sl_pct.toFixed(1)}% to SL` : "Protected"}
                      </span>
                    </td>

                    {/* Risk Status */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
