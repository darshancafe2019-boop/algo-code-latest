"use client";

import React, { useState } from "react";
import {
  Layers,
  Bot,
  Award,
  Globe,
  TrendingUp,
  TrendingDown,
  Compass,
  Zap,
  ShieldCheck,
  AlertCircle,
  BarChart2,
  PieChart,
} from "lucide-react";
import { formatPrice, formatPercent, formatPnL, formatNumber } from "@/lib/formatters";

interface MultiDimensionAttributionMatrixProps {
  botsData?: any[];
  strategiesData?: any[];
  currency?: string;
  currencyRate?: number;
}

export function MultiDimensionAttributionMatrix({
  botsData = [],
  strategiesData = [],
  currency = "$",
  currencyRate = 1.0,
}: MultiDimensionAttributionMatrixProps) {
  const [activeTab, setActiveTab] = useState<"BOTS" | "STRATEGIES" | "ASSETS" | "SYMBOLS" | "BIAS">("BOTS");

  // 1. Normalized Bot Instances
  const botsList = botsData.length > 0 ? botsData : [
    { id: "bot-1", name: "Alpha BTC Scalper", symbol: "BTC/USDT", status: "RUNNING", pnl: 485.50, winRate: 77.8, trades: 18, drawdown: 1.2, exposure: 12500, fees: 14.20 },
    { id: "bot-2", name: "Trend Confluence Pro", symbol: "ETH/USDT", status: "RUNNING", pnl: 342.00, winRate: 66.7, trades: 12, drawdown: 2.1, exposure: 8000, fees: 9.80 },
    { id: "bot-3", name: "NIFTY Dynamic Breakout", symbol: "NIFTY", status: "RUNNING", pnl: 215.00, winRate: 62.5, trades: 8, drawdown: 1.8, exposure: 5000, fees: 5.40 },
    { id: "bot-4", name: "Delta Crypto Options Scalper", symbol: "BTC-OPT", status: "RUNNING", pnl: 195.20, winRate: 80.0, trades: 5, drawdown: 0.8, exposure: 3500, fees: 3.20 },
    { id: "bot-5", name: "SOL Mean Reversion", symbol: "SOL/USDT", status: "PAUSED", pnl: -45.00, winRate: 40.0, trades: 5, drawdown: 3.5, exposure: 0, fees: 4.10 },
  ];

  // 2. Normalized Strategies
  const strategiesList = strategiesData.length > 0 ? strategiesData : [
    { name: "Trend Confluence Pro", pnl: 657.50, winRate: 77.8, trades: 18, profitFactor: "3.42", expectancy: 36.53, maxDd: 1.2, verified: true },
    { name: "EMA Cross 9/21 Momentum", pnl: 325.00, winRate: 66.7, trades: 12, profitFactor: "2.35", expectancy: 27.08, maxDd: 2.1, verified: true },
    { name: "Volume Profile Breakout", pnl: 210.50, winRate: 62.5, trades: 8, profitFactor: "2.10", expectancy: 26.31, maxDd: 2.8, verified: true },
    { name: "Delta Gamma Scalper", pnl: 195.20, winRate: 80.0, trades: 5, profitFactor: "4.10", expectancy: 39.04, maxDd: 0.8, verified: true },
    { name: "Mean Reversion Scalper", pnl: 41.80, winRate: 50.0, trades: 4, profitFactor: "1.45", expectancy: 10.45, maxDd: 3.5, verified: false },
  ];

  // 3. Asset Classes Attribution
  const assetClasses = [
    { name: "Crypto Derivatives (Perps & Options)", pnl: 827.50, sharePct: 58.2, trades: 23, color: "bg-cyan-500", winRate: 78.2 },
    { name: "Crypto Spot (BTC/ETH/SOL)", pnl: 395.00, sharePct: 27.8, trades: 14, color: "bg-emerald-500", winRate: 71.4 },
    { name: "Indian Equities & Indices (NSE/BSE)", pnl: 198.50, sharePct: 14.0, trades: 8, color: "bg-amber-500", winRate: 62.5 },
  ];

  // 4. Symbols Attribution
  const symbolsList = [
    { symbol: "BTC/USDT", pnl: 485.50, winRate: 77.8, trades: 18, volume: "$114,200", isWinner: true },
    { symbol: "ETH/USDT", pnl: 342.00, winRate: 66.7, trades: 12, volume: "$68,500", isWinner: true },
    { symbol: "NIFTY 50", pnl: 215.00, winRate: 62.5, trades: 8, volume: "$45,000", isWinner: true },
    { symbol: "BTC-28AUG-65000-C", pnl: 195.20, winRate: 80.0, trades: 5, volume: "$22,000", isWinner: true },
    { symbol: "SOL/USDT", pnl: -45.00, winRate: 40.0, trades: 5, volume: "$18,500", isWinner: false },
  ];

  // 5. Long vs Short Bias
  const biasStats = {
    long: { pnl: 945.50, trades: 28, winRate: 75.0, profitFactor: "2.95", avgWin: 65.20, avgLoss: -28.10 },
    short: { pnl: 297.20, trades: 17, winRate: 64.7, profitFactor: "2.10", avgWin: 52.40, avgLoss: -31.50 },
  };

  return (
    <div className="bg-[#0B111E] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 font-mono">
      {/* 1. Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide uppercase">
                MULTI-DIMENSIONAL P&L ATTRIBUTION
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-400 border border-amber-800">
                5-AXIS ALPHA ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Segmented alpha generation by Bot Instance, Algorithm, Asset Class, Symbol, and Directional Bias
            </p>
          </div>
        </div>

        {/* Dimension Sub-Tabs */}
        <div className="flex items-center gap-1 bg-[#141E33] border border-slate-700 rounded-xl p-1 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab("BOTS")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "BOTS" ? "bg-cyan-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Bots</span>
          </button>

          <button
            onClick={() => setActiveTab("STRATEGIES")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "STRATEGIES" ? "bg-cyan-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Strategies</span>
          </button>

          <button
            onClick={() => setActiveTab("ASSETS")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "ASSETS" ? "bg-cyan-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Asset Classes</span>
          </button>

          <button
            onClick={() => setActiveTab("SYMBOLS")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "SYMBOLS" ? "bg-cyan-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Symbols</span>
          </button>

          <button
            onClick={() => setActiveTab("BIAS")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === "BIAS" ? "bg-cyan-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Long / Short Bias</span>
          </button>
        </div>
      </div>

      {/* 2. Tab Content Views */}

      {/* VIEW A: BY BOT INSTANCE */}
      {activeTab === "BOTS" && (
        <div className="space-y-3">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080D17]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Bot Name & ID</th>
                    <th className="p-3">Symbol</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Trades (W/L)</th>
                    <th className="p-3 text-right">Win Rate</th>
                    <th className="p-3 text-right font-bold text-white">Net P&L</th>
                    <th className="p-3 text-right">Exposure</th>
                    <th className="p-3 text-right">Max DD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {botsList.map((bot) => {
                    const pnl = bot.pnl * currencyRate;
                    const pnlMeta = formatPnL(pnl, currency, 2);
                    return (
                      <tr key={bot.id} className="hover:bg-[#141E33] transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <Bot className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="block">{bot.name}</span>
                            <span className="text-[10px] text-slate-500">ID: {bot.id}</span>
                          </div>
                        </td>
                        <td className="p-3 text-cyan-300 font-bold">{bot.symbol}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            bot.status === "RUNNING" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                          }`}>
                            ● {bot.status}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-300">
                          {bot.trades}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          {formatPercent(bot.winRate, 1)}
                        </td>
                        <td className={`p-3 text-right font-bold ${pnlMeta.isPositive ? "text-emerald-400" : pnlMeta.isNegative ? "text-rose-400" : "text-slate-300"}`}>
                          {pnlMeta.formatted}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">
                          {formatPrice(bot.exposure * currencyRate, currency, 0)}
                        </td>
                        <td className="p-3 text-right text-rose-400">
                          -{formatPercent(bot.drawdown, 1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: BY STRATEGY */}
      {activeTab === "STRATEGIES" && (
        <div className="space-y-3">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080D17]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Strategy Name</th>
                    <th className="p-3 text-center">Trades</th>
                    <th className="p-3 text-right">Win Rate</th>
                    <th className="p-3 text-right font-bold text-white">Net P&L</th>
                    <th className="p-3 text-right text-cyan-400">Expectancy</th>
                    <th className="p-3 text-right">Profit Factor</th>
                    <th className="p-3 text-right">Max DD</th>
                    <th className="p-3 text-center">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {strategiesList.map((st, idx) => {
                    const pnl = st.pnl * currencyRate;
                    const pnlMeta = formatPnL(pnl, currency, 2);
                    return (
                      <tr key={st.name} className="hover:bg-[#141E33] transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-slate-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                            #{idx + 1}
                          </span>
                          <span>{st.name}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-300">{st.trades}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{formatPercent(st.winRate, 1)}</td>
                        <td className={`p-3 text-right font-bold ${pnlMeta.isPositive ? "text-emerald-400" : pnlMeta.isNegative ? "text-rose-400" : "text-slate-300"}`}>
                          {pnlMeta.formatted}
                        </td>
                        <td className="p-3 text-right text-cyan-400 font-bold">
                          +{formatPrice(st.expectancy * currencyRate, currency, 2)}/T
                        </td>
                        <td className="p-3 text-right font-bold text-white">{st.profitFactor}</td>
                        <td className="p-3 text-right text-rose-400">-{formatPercent(st.maxDd, 1)}</td>
                        <td className="p-3 text-center">
                          {st.verified ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              ✓ VERIFIED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              LOW SAMPLE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW C: BY ASSET CLASS */}
      {activeTab === "ASSETS" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {assetClasses.map((ac) => {
              const pnl = ac.pnl * currencyRate;
              const pnlMeta = formatPnL(pnl, currency, 2);
              return (
                <div key={ac.name} className="bg-[#141E33] border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{ac.name}</span>
                    <span className="text-xs font-bold text-cyan-400">{ac.sharePct}% Allocation</span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className={`${ac.color} h-2 rounded-full`} style={{ width: `${ac.sharePct}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Net P&L</span>
                      <span className={`text-sm font-extrabold ${pnlMeta.isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {pnlMeta.formatted}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Win Rate / Trades</span>
                      <span className="text-sm font-bold text-white">
                        {formatPercent(ac.winRate, 1)} ({ac.trades}T)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW D: BY SYMBOL */}
      {activeTab === "SYMBOLS" && (
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#080D17]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141E33] text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Symbol</th>
                <th className="p-3 text-center">Trades</th>
                <th className="p-3 text-right">Win Rate</th>
                <th className="p-3 text-right">Traded Volume</th>
                <th className="p-3 text-right font-bold text-white">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {symbolsList.map((sym) => {
                const pnl = sym.pnl * currencyRate;
                const pnlMeta = formatPnL(pnl, currency, 2);
                return (
                  <tr key={sym.symbol} className="hover:bg-[#141E33] transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span>{sym.symbol}</span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-300">{sym.trades}</td>
                    <td className="p-3 text-right font-bold text-emerald-400">{formatPercent(sym.winRate, 1)}</td>
                    <td className="p-3 text-right text-slate-400">{sym.volume}</td>
                    <td className={`p-3 text-right font-bold ${pnlMeta.isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {pnlMeta.formatted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW E: LONG VS SHORT BIAS */}
      {activeTab === "BIAS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Long Bias Card */}
          <div className="bg-[#141E33] border border-emerald-500/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-black text-white uppercase">LONG SIDE ALPHA</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                {biasStats.long.trades} Executions
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Long P&L</span>
                <span className="text-lg font-extrabold text-emerald-400">
                  +{formatPrice(biasStats.long.pnl * currencyRate, currency, 2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Long Win Rate</span>
                <span className="text-lg font-extrabold text-white">
                  {formatPercent(biasStats.long.winRate, 1)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Profit Factor</span>
                <span className="text-sm font-bold text-cyan-400">{biasStats.long.profitFactor}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Avg Win / Avg Loss</span>
                <span className="text-sm font-bold text-slate-200">
                  +{formatPrice(biasStats.long.avgWin * currencyRate, currency, 0)} / -{formatPrice(Math.abs(biasStats.long.avgLoss) * currencyRate, currency, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Short Bias Card */}
          <div className="bg-[#141E33] border border-cyan-500/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-black text-white uppercase">SHORT SIDE ALPHA</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-bold">
                {biasStats.short.trades} Executions
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Short P&L</span>
                <span className="text-lg font-extrabold text-emerald-400">
                  +{formatPrice(biasStats.short.pnl * currencyRate, currency, 2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Short Win Rate</span>
                <span className="text-lg font-extrabold text-white">
                  {formatPercent(biasStats.short.winRate, 1)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Profit Factor</span>
                <span className="text-sm font-bold text-cyan-400">{biasStats.short.profitFactor}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Avg Win / Avg Loss</span>
                <span className="text-sm font-bold text-slate-200">
                  +{formatPrice(biasStats.short.avgWin * currencyRate, currency, 0)} / -{formatPrice(Math.abs(biasStats.short.avgLoss) * currencyRate, currency, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
