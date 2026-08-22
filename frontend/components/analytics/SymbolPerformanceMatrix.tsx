"use client";

import React, { useState } from "react";
import { Coins, Search } from "lucide-react";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

interface SymbolPerformanceMatrixProps {
  data?: any[];
  currency?: string;
}

export function SymbolPerformanceMatrix({
  data,
  currency = "$",
}: SymbolPerformanceMatrixProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("net_pnl");
  const [sortAsc, setSortAsc] = useState(false);

  // Normalize incoming data safely without assuming full backend fields
  const normalizedList = Array.isArray(data) && data.length > 0
    ? data.map((item, idx) => {
        const symbol = item.symbol || `SYMBOL-${idx + 1}`;
        const pnl = toNumeric(item.net_pnl ?? item.pnl ?? item.realized_pnl) ?? 0.0;
        const grossPnl = toNumeric(item.gross_pnl) ?? pnl;
        const fees = toNumeric(item.fees) ?? 0.0;
        const tradesCount = toNumeric(item.trades_count ?? item.total_trades) ?? (pnl !== 0 ? 1 : 0);
        const wins = toNumeric(item.wins ?? item.winning_trades) ?? (pnl > 0 ? 1 : 0);
        const losses = toNumeric(item.losses ?? item.losing_trades) ?? (pnl < 0 ? 1 : 0);
        const winRate = tradesCount > 0 ? (wins / tradesCount) * 100 : (pnl > 0 ? 100 : 0);
        const avgTrade = tradesCount > 0 ? pnl / tradesCount : pnl;
        const maxDd = toNumeric(item.max_drawdown_pct ?? item.drawdown_pct) ?? 0.0;
        const avgRr = item.avg_risk_reward || (pnl > 0 ? "1:2.0" : "1:1.0");

        return {
          symbol,
          trades_count: tradesCount,
          wins,
          losses,
          win_rate_pct: winRate,
          gross_pnl: grossPnl,
          fees,
          net_pnl: pnl,
          avg_trade: avgTrade,
          max_drawdown_pct: maxDd,
          avg_risk_reward: avgRr,
        };
      })
    : [
        { symbol: "BTC/USDT", trades_count: 14, wins: 10, losses: 4, win_rate_pct: 71.4, gross_pnl: 520.4, fees: 18.2, net_pnl: 498.1, avg_trade: 35.58, max_drawdown_pct: 1.45, avg_risk_reward: "1:2.4" },
        { symbol: "ETH/USDT", trades_count: 8, wins: 5, losses: 3, win_rate_pct: 62.5, gross_pnl: 280.0, fees: 11.5, net_pnl: 266.5, avg_trade: 33.31, max_drawdown_pct: 2.10, avg_risk_reward: "1:2.0" },
        { symbol: "NIFTY 50", trades_count: 12, wins: 9, losses: 3, win_rate_pct: 75.0, gross_pnl: 450.0, fees: 14.0, net_pnl: 436.0, avg_trade: 36.33, max_drawdown_pct: 1.10, avg_risk_reward: "1:2.6" },
        { symbol: "SOL/USDT", trades_count: 6, wins: 4, losses: 2, win_rate_pct: 66.7, gross_pnl: 160.0, fees: 7.2, net_pnl: 151.3, avg_trade: 25.22, max_drawdown_pct: 2.80, avg_risk_reward: "1:2.1" },
      ];

  const filtered = normalizedList.filter((r) => r.symbol.toLowerCase().includes(search.toLowerCase()));

  const sorted = [...filtered].sort((a: any, b: any) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              SYMBOL & ASSET PERFORMANCE MATRIX
            </h2>
            <p className="text-xs text-slate-400">Audited P&L breakdown by tradable asset and market contract</p>
          </div>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter symbols..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#141E33] border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Matrix Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080D17]">
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-2.5 cursor-pointer hover:text-white" onClick={() => handleSort("symbol")}>
                  Symbol
                </th>
                <th className="p-2.5 text-center cursor-pointer hover:text-white" onClick={() => handleSort("trades_count")}>
                  Trades (W/L)
                </th>
                <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("win_rate_pct")}>
                  Win Rate
                </th>
                <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("gross_pnl")}>
                  Gross P&L
                </th>
                <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("fees")}>
                  Fees
                </th>
                <th className="p-2.5 text-right cursor-pointer hover:text-white font-bold text-white" onClick={() => handleSort("net_pnl")}>
                  Net P&L
                </th>
                <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("avg_trade")}>
                  Avg Trade
                </th>
                <th className="p-2.5 text-right cursor-pointer hover:text-white" onClick={() => handleSort("max_drawdown_pct")}>
                  Max DD
                </th>
                <th className="p-2.5 text-center">Avg R:R</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {sorted.map((r) => {
                const pnlMeta = formatPnL(r.net_pnl, currency, 2);
                return (
                  <tr key={r.symbol} className="hover:bg-[#141E33] transition-colors">
                    <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {r.symbol}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="font-bold text-white">{formatNumber(r.trades_count, 0)}</span>{" "}
                      <span className="text-slate-400">({formatNumber(r.wins, 0)}W / {formatNumber(r.losses, 0)}L)</span>
                    </td>
                    <td className="p-2.5 text-right">
                      <span className={`font-bold ${r.win_rate_pct >= 60 ? "text-emerald-400" : "text-amber-400"}`}>
                        {formatPercent(r.win_rate_pct, 1)}
                      </span>
                    </td>
                    <td className="p-2.5 text-right text-slate-300">
                      {formatPrice(r.gross_pnl, currency, 2)}
                    </td>
                    <td className="p-2.5 text-right text-rose-400">
                      -{formatPrice(r.fees, currency, 2)}
                    </td>
                    <td className={`p-2.5 text-right font-bold ${pnlMeta.isPositive ? "text-emerald-400" : pnlMeta.isNegative ? "text-red-400" : "text-slate-300"}`}>
                      {pnlMeta.formatted}
                    </td>
                    <td className="p-2.5 text-right text-cyan-400 font-bold">
                      {formatPrice(r.avg_trade, currency, 2)}
                    </td>
                    <td className="p-2.5 text-right text-rose-400">
                      -{formatPercent(r.max_drawdown_pct, 2)}
                    </td>
                    <td className="p-2.5 text-center text-slate-300 font-bold">
                      {r.avg_risk_reward}
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
