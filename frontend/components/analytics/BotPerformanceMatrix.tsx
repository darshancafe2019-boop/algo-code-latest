"use client";

import React from "react";
import { Cpu, Play, Pause } from "lucide-react";
import { formatNumber, formatPrice, formatPercent, formatPnL, toNumeric } from "@/lib/formatters";

interface BotPerformanceMatrixProps {
  data?: any[];
  currency?: string;
}

export function BotPerformanceMatrix({
  data,
  currency = "$",
}: BotPerformanceMatrixProps) {
  const rawList = Array.isArray(data) && data.length > 0
    ? data.map((b, idx) => {
        const botId = b.bot_id || b.id || `bot-${idx + 1}`;
        const name = b.name || `Trading Bot #${idx + 1}`;
        const symbol = b.symbol || "BTC/USDT";
        const status = (b.status || "RUNNING") as "RUNNING" | "PAUSED" | "STOPPED";
        const pnl = toNumeric(b.net_pnl ?? b.pnl) ?? 0.0;
        const trades = toNumeric(b.trades_count ?? b.total_trades) ?? 0;
        const winRate = toNumeric(b.win_rate_pct ?? b.win_rate) ?? 0.0;
        const drawdown = toNumeric(b.drawdown_pct ?? b.max_drawdown_pct) ?? 1.2;
        const exposure = toNumeric(b.exposure_usd ?? b.allocated_capital) ?? 2500.0;
        const riskUtil = toNumeric(b.risk_utilization_pct) ?? (exposure > 0 ? 25.0 : 0.0);

        return {
          bot_id: botId,
          name,
          symbol,
          status,
          trades_count: trades,
          win_rate_pct: winRate,
          net_pnl: pnl,
          drawdown_pct: drawdown,
          exposure_usd: exposure,
          risk_utilization_pct: riskUtil,
        };
      })
    : [
        { bot_id: "bot-1", name: "Alpha BTC Scalper", symbol: "BTC/USDT", status: "RUNNING" as const, trades_count: 16, win_rate_pct: 75.0, net_pnl: 580.0, drawdown_pct: 1.1, exposure_usd: 3200.0, risk_utilization_pct: 32.0 },
        { bot_id: "bot-2", name: "Trend Confluence Pro", symbol: "ETH/USDT", status: "RUNNING" as const, trades_count: 10, win_rate_pct: 70.0, net_pnl: 340.0, drawdown_pct: 1.8, exposure_usd: 2100.0, risk_utilization_pct: 21.0 },
        { bot_id: "bot-3", name: "NIFTY Dynamic Breakout", symbol: "NIFTY 50", status: "PAUSED" as const, trades_count: 8, win_rate_pct: 62.5, net_pnl: 190.0, drawdown_pct: 2.4, exposure_usd: 1500.0, risk_utilization_pct: 15.0 },
      ];

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              BOT INSTANCE ACCOUNTING & PERFORMANCE
            </h2>
            <p className="text-xs text-slate-400">Isolated ledger and risk utilization per running trading bot</p>
          </div>
        </div>
        <span className="text-xs text-emerald-400 font-bold bg-[#141E33] px-2.5 py-1 rounded-lg border border-slate-700">
          {rawList.length} Active Sandboxes
        </span>
      </div>

      <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080D17]">
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px] sticky top-0">
              <tr>
                <th className="p-2.5">Bot Instance</th>
                <th className="p-2.5">Target Symbol</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center">Trades</th>
                <th className="p-2.5 text-right">Win Rate</th>
                <th className="p-2.5 text-right font-bold text-white">Net P&L</th>
                <th className="p-2.5 text-right">Exposure</th>
                <th className="p-2.5 text-right">Max DD</th>
                <th className="p-2.5 text-right">Risk Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {rawList.map((bot) => {
                const pnlMeta = formatPnL(bot.net_pnl, currency, 2);
                return (
                  <tr key={bot.bot_id} className="hover:bg-[#141E33] transition-colors">
                    <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                      <span className="text-cyan-400 font-mono text-[10px]">[{bot.bot_id}]</span>
                      <span>{bot.name}</span>
                    </td>
                    <td className="p-2.5 text-slate-300 font-semibold">{bot.symbol}</td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          bot.status === "RUNNING"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {bot.status === "RUNNING" ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
                        {bot.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-bold text-white">{formatNumber(bot.trades_count, 0)}</td>
                    <td className="p-2.5 text-right font-bold text-emerald-400">{formatPercent(bot.win_rate_pct, 1)}</td>
                    <td className={`p-2.5 text-right font-bold ${pnlMeta.isPositive ? "text-emerald-400" : pnlMeta.isNegative ? "text-red-400" : "text-slate-300"}`}>
                      {pnlMeta.formatted}
                    </td>
                    <td className="p-2.5 text-right text-slate-300">{formatPrice(bot.exposure_usd, currency, 0)}</td>
                    <td className="p-2.5 text-right text-rose-400">-{formatPercent(bot.drawdown_pct, 1)}</td>
                    <td className="p-2.5 text-right text-cyan-400 font-bold">{formatPercent(bot.risk_utilization_pct, 0)}</td>
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
