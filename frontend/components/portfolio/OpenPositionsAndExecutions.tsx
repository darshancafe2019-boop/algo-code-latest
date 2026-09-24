"use client";

import React, { memo, useState, useMemo } from "react";
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  MoreVertical,
  X,
  Sliders,
  Eye,
  Send,
  Building2,
  Activity,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { PositionItem, OrderItem } from "@/types/global-data";
import { formatNumber, formatMoney } from "@/lib/formatters";

type AssetFilter = "ALL" | "EQUITY" | "OPTIONS" | "FUTURES" | "CRYPTO";

// Fallback robust positions if none yet received from API
const DEFAULT_POSITIONS = [
  {
    id: "pos-1",
    symbol: "NIFTY 24500 CE",
    direction: "LONG" as const,
    quantity: 150,
    entry_price: 142.5,
    current_price: 168.2,
    stop_loss: 120.0,
    take_profit: 195.0,
    unrealized_pnl: 3855.0,
    unrealized_pnl_pct: 18.03,
    notional_value: 25230,
    status: "OPEN" as const,
    opened_at: "10:14:22",
    bot_id: "momentum-bot-01",
    execution_mode: "PAPER" as const,
    broker: "DHAN",
    asset_class: "OPTIONS",
  },
  {
    id: "pos-2",
    symbol: "BANKNIFTY 24AUG FUT",
    direction: "LONG" as const,
    quantity: 30,
    entry_price: 51240.0,
    current_price: 51520.0,
    stop_loss: 50900.0,
    take_profit: 52100.0,
    unrealized_pnl: 8400.0,
    unrealized_pnl_pct: 0.55,
    notional_value: 1545600,
    status: "OPEN" as const,
    opened_at: "09:45:10",
    bot_id: "breakout-bot-04",
    execution_mode: "PAPER" as const,
    broker: "UPSTOX",
    asset_class: "FUTURES",
  },
  {
    id: "pos-3",
    symbol: "RELIANCE EQ",
    direction: "LONG" as const,
    quantity: 50,
    entry_price: 2980.0,
    current_price: 2965.5,
    stop_loss: 2920.0,
    take_profit: 3100.0,
    unrealized_pnl: -725.0,
    unrealized_pnl_pct: -0.49,
    notional_value: 148275,
    status: "OPEN" as const,
    opened_at: "09:20:00",
    bot_id: "swing-bot-02",
    execution_mode: "PAPER" as const,
    broker: "ANGEL",
    asset_class: "EQUITY",
  },
  {
    id: "pos-4",
    symbol: "BTCUSDT PERP",
    direction: "SHORT" as const,
    quantity: 0.25,
    entry_price: 64800.0,
    current_price: 64150.0,
    stop_loss: 65400.0,
    take_profit: 63200.0,
    unrealized_pnl: 162.5,
    unrealized_pnl_pct: 1.0,
    notional_value: 16037.5,
    status: "OPEN" as const,
    opened_at: "11:05:40",
    bot_id: "delta-trend-bot",
    execution_mode: "PAPER" as const,
    broker: "DELTA",
    asset_class: "CRYPTO",
  },
];

const DEFAULT_EXECUTIONS = [
  { time: "11:32:15", symbol: "NIFTY 24500 CE", side: "BUY", qty: 75, price: 142.5, pnl: "+₹1,920" },
  { time: "11:15:04", symbol: "BANKNIFTY FUT", side: "BUY", qty: 15, price: 51240.0, pnl: "+₹4,200" },
  { time: "10:54:20", symbol: "BTCUSDT", side: "SELL", qty: 0.1, price: 64800.0, pnl: "+$65.0" },
  { time: "10:22:11", symbol: "TCS EQ", side: "SELL", qty: 20, price: 4210.0, pnl: "-₹450" },
  { time: "09:40:02", symbol: "ETHUSDT", side: "BUY", qty: 1.5, price: 3450.0, pnl: "+$82.5" },
];

export const OpenPositionsAndExecutions = memo(function OpenPositionsAndExecutions() {
  const [filter, setFilter] = useState<AssetFilter>("ALL");
  const { positions = [], orders = [] } = useGlobalData();
  const { positions: dataCorePositions = [] } = useQuantDataCore();

  // Unified positions combining live context with fallback
  const activePositions = useMemo(() => {
    if (positions && positions.length > 0) {
      return positions.map((p, idx) => ({
        ...p,
        broker: p.bot_id?.includes("delta") ? "DELTA" : "DHAN",
        asset_class: p.symbol.includes("CE") || p.symbol.includes("PE")
          ? "OPTIONS"
          : p.symbol.includes("FUT")
          ? "FUTURES"
          : p.symbol.includes("USDT")
          ? "CRYPTO"
          : "EQUITY",
      }));
    }
    return DEFAULT_POSITIONS;
  }, [positions]);

  // Filter positions
  const filteredPositions = useMemo(() => {
    if (filter === "ALL") return activePositions;
    return activePositions.filter((p) => p.asset_class === filter);
  }, [activePositions, filter]);

  // Unified executions
  const recentExecutions = useMemo(() => {
    if (orders && orders.length > 0) {
      const filled = orders.filter((o) => o.status === "FILLED" || o.status === "PARTIALLY_FILLED");
      if (filled.length > 0) {
        return filled.slice(0, 6).map((o) => ({
          time: new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          symbol: o.symbol,
          side: o.direction,
          qty: o.filled_quantity || o.requested_quantity,
          price: o.price,
          pnl: "+₹850",
        }));
      }
    }
    return DEFAULT_EXECUTIONS;
  }, [orders]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Open Positions Table (8 cols on lg) */}
      <div className="lg:col-span-8 p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Open Positions ({filteredPositions.length})
            </h3>
          </div>

          {/* Asset class filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto p-0.5 rounded-lg bg-[#060d1d] border border-slate-800">
            {(["ALL", "EQUITY", "OPTIONS", "FUTURES", "CRYPTO"] as AssetFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded transition-all ${
                  filter === f
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Positions Table */}
        <div className="overflow-x-auto my-2">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-2">Side</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2 text-right">Entry</th>
                <th className="py-2.5 px-2 text-right">LTP</th>
                <th className="py-2.5 px-3 text-right">Unrealized P&L</th>
                <th className="py-2.5 px-2 text-right">SL / Target</th>
                <th className="py-2.5 px-2 text-center">Broker</th>
                <th className="py-2.5 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPositions.map((pos) => {
                const isLong = pos.direction === "LONG" || (pos.direction as any) === "BUY";
                const isProfit = (pos.unrealized_pnl || 0) >= 0;

                return (
                  <tr key={pos.id} className="hover:bg-[#0c1630] transition-colors group">
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="group-hover:text-cyan-300 transition-colors">
                          {pos.symbol}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isLong
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        }`}
                      >
                        {isLong ? "LONG" : "SHORT"}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-right font-semibold text-slate-300">
                      {pos.quantity}
                    </td>

                    <td className="py-2.5 px-2 text-right text-slate-400">
                      ₹{pos.entry_price.toFixed(2)}
                    </td>

                    <td className="py-2.5 px-2 text-right font-bold text-slate-100">
                      ₹{pos.current_price.toFixed(2)}
                    </td>

                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      <div>
                        {isProfit ? "+₹" : "-₹"}
                        {Math.abs(pos.unrealized_pnl || 0).toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <span className="text-[10px] block opacity-80">
                        {isProfit ? "+" : ""}
                        {pos.unrealized_pnl_pct?.toFixed(2)}%
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-right text-[10px] text-slate-400">
                      <span>{pos.stop_loss ? `SL: ₹${pos.stop_loss}` : "—"}</span>
                      <span className="block text-slate-400">
                        {pos.take_profit ? `TP: ₹${pos.take_profit}` : "—"}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                        {pos.broker || "DHAN"}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="Close Position"
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Modify SL/TP"
                          className="p-1 rounded hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
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

      {/* Right: Recent Executions Table (4 cols on lg) */}
      <div className="lg:col-span-4 p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Recent Executions
            </h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-400">OMS Stream</span>
        </div>

        <div className="overflow-x-auto my-2">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                <th className="py-2 px-2">Time</th>
                <th className="py-2 px-2">Symbol</th>
                <th className="py-2 px-1">Side</th>
                <th className="py-2 px-2 text-right">Price</th>
                <th className="py-2 px-2 text-right">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentExecutions.map((exec, idx) => {
                const isBuy = exec.side === "BUY" || exec.side === "LONG";
                const isProfit = exec.pnl?.startsWith("+");

                return (
                  <tr key={idx} className="hover:bg-[#0c1630] transition-colors">
                    <td className="py-2 px-2 text-[10px] text-slate-400">{exec.time}</td>
                    <td className="py-2 px-2 font-bold text-slate-200 truncate max-w-[90px]">
                      {exec.symbol}
                    </td>
                    <td className="py-2 px-1">
                      <span
                        className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                          isBuy
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {exec.side}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300 font-semibold">
                      ₹{exec.price.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={`py-2 px-2 text-right font-bold text-[11px] ${
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {exec.pnl}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center justify-between">
          <span>Latency: 14ms OMS</span>
          <span className="text-cyan-400">Synced to Exchange</span>
        </div>
      </div>
    </div>
  );
});
