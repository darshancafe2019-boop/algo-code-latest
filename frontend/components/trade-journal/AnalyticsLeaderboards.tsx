"use client";

import React, { useState } from "react";
import {
  Award,
  Bot,
  Layers,
  Clock,
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  Activity,
  Zap,
} from "lucide-react";
import {
  StrategyLeaderboardItem,
  BotPerformanceItem,
  MarketPerformanceItem,
  TimePerformanceItem,
} from "@/types/trade-journal";

export function AnalyticsLeaderboards() {
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"strategies" | "bots" | "markets" | "time">("strategies");

  const strategies: StrategyLeaderboardItem[] = [
    { strategy_name: "Multi-Timeframe Trend Confluence", total_trades: 14, win_rate_pct: 71.4, net_pnl: 940.20, profit_factor: 3.42, expectancy: 67.15, max_drawdown_pct: 2.1, avg_risk_reward: 2.3, avg_duration: "38m" },
    { strategy_name: "EMA Dynamic Crossover (9/21)", total_trades: 8, win_rate_pct: 62.5, net_pnl: 320.10, profit_factor: 2.15, expectancy: 40.01, max_drawdown_pct: 3.2, avg_risk_reward: 1.8, avg_duration: "1h 12m" },
    { strategy_name: "Iron Condor Range Options", total_trades: 6, win_rate_pct: 50.0, net_pnl: 160.20, profit_factor: 1.85, expectancy: 26.70, max_drawdown_pct: 1.5, avg_risk_reward: 1.5, avg_duration: "4h 30m" },
  ];

  const bots: BotPerformanceItem[] = [
    { bot_id: "btc-scalper", bot_name: "BTC Alpha Scalper", total_trades: 14, win_rate_pct: 71.4, net_pnl: 940.20, drawdown_pct: 2.1, risk_status: "SAFE", fees: 8.40, execution_quality: 98.5, status: "RUNNING" },
    { bot_id: "nifty-trend", bot_name: "NIFTY Index Follower", total_trades: 8, win_rate_pct: 62.5, net_pnl: 320.10, drawdown_pct: 3.2, risk_status: "SAFE", fees: 5.60, execution_quality: 97.2, status: "RUNNING" },
    { bot_id: "options-income", bot_name: "Options Income Bot", total_trades: 6, win_rate_pct: 50.0, net_pnl: 160.20, drawdown_pct: 1.5, risk_status: "SAFE", fees: 4.40, execution_quality: 99.0, status: "PAUSED" },
  ];

  const markets: MarketPerformanceItem[] = [
    { market_name: "Crypto Derivatives (Binance)", asset_class: "Crypto", total_trades: 14, win_rate_pct: 71.4, net_pnl: 940.20, profit_factor: 3.42 },
    { market_name: "NSE Index Options & Futures", asset_class: "Options/Futures", total_trades: 10, win_rate_pct: 60.0, net_pnl: 380.30, profit_factor: 2.20 },
    { market_name: "Global Equities (US/EU)", asset_class: "Equities", total_trades: 4, win_rate_pct: 50.0, net_pnl: 100.00, profit_factor: 1.65 },
  ];

  const timeBreakdown: TimePerformanceItem[] = [
    { period_label: "09:15 – 10:30 (Opening Bell / Session Open)", total_trades: 12, win_rate_pct: 75.0, net_pnl: 810.00, avg_return_pct: 3.2 },
    { period_label: "10:30 – 13:30 (Mid-Day European Open Overlap)", total_trades: 10, win_rate_pct: 60.0, net_pnl: 450.50, avg_return_pct: 1.8 },
    { period_label: "13:30 – 15:30 (Closing Power Hour)", total_trades: 6, win_rate_pct: 50.0, net_pnl: 160.00, avg_return_pct: 1.1 },
  ];

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Header & Category Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1B3328] pb-3">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Quantitative Analytics & Comparative Attribution
          </h3>
          <p className="text-[11px] text-[#A8BDB0]">
            Performance attribution across trading strategies, bot instances, asset classes, and session times.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#07110D] p-1 rounded-xl border border-[#1B3328] text-xs font-mono">
          <button
            onClick={() => setActiveLeaderboardTab("strategies")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
              activeLeaderboardTab === "strategies"
                ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                : "text-[#A8BDB0] hover:text-white"
            }`}
          >
            Strategies
          </button>
          <button
            onClick={() => setActiveLeaderboardTab("bots")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
              activeLeaderboardTab === "bots"
                ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                : "text-[#A8BDB0] hover:text-white"
            }`}
          >
            Bots
          </button>
          <button
            onClick={() => setActiveLeaderboardTab("markets")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
              activeLeaderboardTab === "markets"
                ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                : "text-[#A8BDB0] hover:text-white"
            }`}
          >
            Markets
          </button>
          <button
            onClick={() => setActiveLeaderboardTab("time")}
            className={`px-3 py-1.5 rounded-lg font-bold uppercase transition-all ${
              activeLeaderboardTab === "time"
                ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-sm"
                : "text-[#A8BDB0] hover:text-white"
            }`}
          >
            Time & Sessions
          </button>
        </div>
      </div>

      {/* 1. STRATEGY LEADERBOARD */}
      {activeLeaderboardTab === "strategies" && (
        <div className="bg-[#0D1914] border border-[#294238] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A130F] text-[#70877A] text-[10px] uppercase tracking-wider border-b border-[#1B3328]">
                <tr>
                  <th className="py-3 px-4">Strategy</th>
                  <th className="py-3 px-3">Trades</th>
                  <th className="py-3 px-3">Win Rate</th>
                  <th className="py-3 px-3">Net P&L</th>
                  <th className="py-3 px-3">Profit Factor</th>
                  <th className="py-3 px-3">Expectancy</th>
                  <th className="py-3 px-3">Max DD</th>
                  <th className="py-3 px-3">Avg R:R</th>
                  <th className="py-3 px-4 text-right">Avg Hold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B3328]/60 text-slate-200">
                {strategies.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#123C2A]/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="text-[#55C98A]">#{idx + 1}</span>
                      <span>{s.strategy_name}</span>
                    </td>
                    <td className="py-3.5 px-3 text-[#A8BDB0]">{s.total_trades}</td>
                    <td className="py-3.5 px-3 font-bold text-[#55C98A]">{s.win_rate_pct.toFixed(1)}%</td>
                    <td className="py-3.5 px-3 font-bold text-[#55C98A]">+${s.net_pnl.toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-cyan-300 font-bold">{s.profit_factor.toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-purple-300">${s.expectancy.toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-slate-400">{s.max_drawdown_pct}%</td>
                    <td className="py-3.5 px-3 text-slate-300">1 : {s.avg_risk_reward}</td>
                    <td className="py-3.5 px-4 text-right text-[#70877A]">{s.avg_duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. BOT PERFORMANCE */}
      {activeLeaderboardTab === "bots" && (
        <div className="bg-[#0D1914] border border-[#294238] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A130F] text-[#70877A] text-[10px] uppercase tracking-wider border-b border-[#1B3328]">
                <tr>
                  <th className="py-3 px-4">Bot Instance</th>
                  <th className="py-3 px-3">Trades</th>
                  <th className="py-3 px-3">Win Rate</th>
                  <th className="py-3 px-3">Net P&L</th>
                  <th className="py-3 px-3">Max DD</th>
                  <th className="py-3 px-3">Risk Status</th>
                  <th className="py-3 px-3">Fees Paid</th>
                  <th className="py-3 px-3">Quality Score</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B3328]/60 text-slate-200">
                {bots.map((b, idx) => (
                  <tr key={idx} className="hover:bg-[#123C2A]/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <span>{b.bot_name}</span>
                      <span className="text-[10px] text-[#70877A] block">{b.bot_id}</span>
                    </td>
                    <td className="py-3.5 px-3 text-[#A8BDB0]">{b.total_trades}</td>
                    <td className="py-3.5 px-3 font-bold text-[#55C98A]">{b.win_rate_pct.toFixed(1)}%</td>
                    <td className="py-3.5 px-3 font-bold text-[#55C98A]">+${b.net_pnl.toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-slate-400">{b.drawdown_pct}%</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40">
                        {b.risk_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-amber-400">${b.fees.toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-cyan-300 font-bold">{b.execution_quality}/100</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-[#55C98A] border border-emerald-800">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MARKETS PERFORMANCE */}
      {activeLeaderboardTab === "markets" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono animate-fadeIn">
          {markets.map((m, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#0D1914] border border-[#1B3328] space-y-2 hover:border-[#2E7D5B] transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white">{m.market_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#07110D] text-cyan-300 border border-[#1B3328]">
                  {m.asset_class}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#1B3328] text-[11px]">
                <div>
                  <span className="text-[10px] text-[#70877A] block">Trades</span>
                  <span className="font-bold text-white">{m.total_trades}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#70877A] block">Win Rate</span>
                  <span className="font-bold text-[#55C98A]">{m.win_rate_pct}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#70877A] block">Net P&L</span>
                  <span className="font-bold text-[#55C98A]">+${m.net_pnl.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. TIME ANALYSIS */}
      {activeLeaderboardTab === "time" && (
        <div className="space-y-2.5 text-xs font-mono animate-fadeIn">
          {timeBreakdown.map((t, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-[#0D1914] border border-[#1B3328] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#2E7D5B] transition-colors"
            >
              <div>
                <span className="font-bold text-white block">{t.period_label}</span>
                <span className="text-[10px] text-[#70877A]">{t.total_trades} Trades Executed</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-[#70877A] block">Win Rate</span>
                  <span className="font-bold text-[#55C98A]">{t.win_rate_pct}%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#70877A] block">Realized Return</span>
                  <span className="font-bold text-[#55C98A]">+${t.net_pnl.toFixed(2)} ({t.avg_return_pct}%)</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
