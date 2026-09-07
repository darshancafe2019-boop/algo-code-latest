"use client";

import React, { useState } from "react";
import {
  Globe,
  PieChart,
  Code,
  Cpu,
  Smile,
  TrendingUp,
  TrendingDown,
  Shield,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Award,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/formatters";

export interface MarketPerformanceItem {
  market_id: string;
  market_label: string;
  net_pnl: number;
  trades: number;
  win_rate: number;
  profit_factor: number;
}

export interface TradeDistributionItem {
  asset: string;
  count: number;
  percentage: number;
}

export interface StrategyPerformanceRow {
  strategy: string;
  profit: number;
  loss: number;
  net_pnl: number;
  trades: number;
  win_rate: number;
  profit_factor: number;
  avg_r: number;
}

export interface MultiBrokerPerformanceItem {
  broker_id: string;
  broker_name: string;
  exchange: string;
  realized_pnl: number;
  unrealized_pnl: number;
  net_pnl: number;
  trades: number;
  win_rate: number;
  fees: number;
  funding: number;
  capital: number;
  available_margin: number;
  used_margin: number;
}

export interface EmotionStatItem {
  tag: string;
  trades: number;
  win_rate: number;
  net_pnl: number;
  percentage: number;
}

interface PerformanceAnalyticsSectionBProps {
  markets?: MarketPerformanceItem[];
  distributions?: TradeDistributionItem[];
  strategies?: StrategyPerformanceRow[];
  brokers?: MultiBrokerPerformanceItem[];
  emotions?: EmotionStatItem[];
  currencySymbol?: string;
}

export function PerformanceAnalyticsSectionB({
  markets = [],
  distributions = [],
  strategies = [],
  brokers = [],
  emotions = [],
  currencySymbol = "₹",
}: PerformanceAnalyticsSectionBProps) {
  const [activeBrokerTab, setActiveBrokerTab] = useState<string>("ALL");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono select-none">
      {/* 1. MARKET-WISE PERFORMANCE */}
      <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Globe className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wider uppercase">
              MARKET PERFORMANCE
            </span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase">SECTOR BREAKDOWN</span>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[220px] scrollbar-thin pr-1">
          {markets.map((m) => {
            const isPos = m.net_pnl >= 0;
            return (
              <div
                key={m.market_id}
                className="flex items-center justify-between p-2 rounded-xl bg-[#060910] border border-slate-800/60 hover:border-slate-700 transition"
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">{m.market_label}</div>
                  <div className="text-[10px] text-slate-400">
                    {m.trades} trades • {m.win_rate}% Win Rate
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-xs font-extrabold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPos ? "+" : ""}
                    {currencySymbol}
                    {formatNumber(m.net_pnl, 2)}
                  </div>
                  <div className="text-[10px] text-slate-400">PF: {m.profit_factor.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
          <span>Multi-Asset Real Breakdown</span>
          <span className="text-emerald-400">Zero Fabricated Data</span>
        </div>
      </div>

      {/* 2. TRADE DISTRIBUTION & EMOTIONS / DISCIPLINE */}
      <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <PieChart className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wider uppercase">
              TRADE DISTRIBUTION
            </span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase">ASSET ALLOCATION</span>
        </div>

        {/* Asset Class Distribution Progress Bars */}
        <div className="space-y-2 py-1">
          {distributions.map((d) => (
            <div key={d.asset} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold">{d.asset}</span>
                <span className="text-slate-400 text-[11px]">
                  {d.count} trades ({d.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-400 rounded-full"
                  style={{ width: `${Math.min(100, d.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Emotion / Discipline Mini Grid */}
        <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold">
              <Smile className="w-3.5 h-3.5 text-amber-400" />
              <span>EMOTIONS & DISCIPLINE</span>
            </div>
            <span className="text-[9px] text-slate-400">PSYCHOLOGY CORRELATION</span>
          </div>

          <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
            {emotions.slice(0, 4).map((emo) => (
              <div
                key={emo.tag}
                className="bg-[#060910] border border-slate-800/80 rounded-lg p-1 space-y-0.5"
                title={`${emo.trades} trades with ${emo.win_rate}% win rate`}
              >
                <div className="text-slate-300 font-bold truncate">{emo.tag}</div>
                <div className={emo.net_pnl >= 0 ? "text-emerald-400 font-extrabold" : "text-rose-400 font-extrabold"}>
                  {emo.win_rate.toFixed(0)}% WR
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. MULTI-BROKER CONSOLIDATION & CAPITAL ISOLATION */}
      <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wider uppercase">
              MULTI-BROKER PERFORMANCE
            </span>
          </div>
          <span className="text-[10px] text-sky-400 font-bold">SEGREGATED</span>
        </div>

        {/* Broker Cards Grid */}
        <div className="space-y-2 overflow-y-auto max-h-[220px] scrollbar-thin pr-1">
          {brokers.map((b) => {
            const isPos = b.net_pnl >= 0;
            return (
              <div
                key={b.broker_id}
                className="p-2.5 rounded-xl bg-[#060910] border border-slate-800/60 hover:border-slate-700 transition space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white">{b.broker_name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {b.exchange}
                    </span>
                  </div>
                  <span className={`font-extrabold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                    {isPos ? "+" : ""}
                    {currencySymbol}
                    {formatNumber(b.net_pnl, 2)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
                  <div>
                    Capital:{" "}
                    <span className="text-slate-200 font-bold">
                      {currencySymbol}
                      {formatNumber(b.capital, 0)}
                    </span>
                  </div>
                  <div>
                    Used Margin:{" "}
                    <span className="text-amber-400 font-bold">
                      {currencySymbol}
                      {formatNumber(b.used_margin, 0)}
                    </span>
                  </div>
                  <div className="text-right">
                    Win Rate: <span className="text-emerald-400 font-bold">{b.win_rate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
          <span>Underlying account balances kept strictly separate</span>
          <span className="text-sky-400">Paper vs Live Segregated</span>
        </div>
      </div>
    </div>
  );
}
