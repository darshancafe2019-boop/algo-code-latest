"use client";

import React, { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Layers,
  Award,
  Clock,
  ChevronDown,
  Activity,
  Zap,
  Shield,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/formatters";

export interface InstrumentPerformanceItem {
  symbol: string;
  net_pnl: number;
  trades: number;
  win_rate: number;
  volume: number;
}

export interface OpenPositionsBreakdownData {
  total_open: number;
  options: number;
  futures: number;
  equities: number;
  crypto: number;
  forex: number;
  commodities: number;
  long_count: number;
  short_count: number;
}

export interface StrategyPerformanceItem {
  strategy: string;
  profit: number;
  loss: number;
  net_pnl: number;
  trades: number;
  win_rate: number;
  profit_factor: number;
  avg_r: number;
}

interface PerformanceTopCenterSectionProps {
  instruments?: InstrumentPerformanceItem[];
  openPositionsBreakdown?: OpenPositionsBreakdownData;
  strategies?: StrategyPerformanceItem[];
  winCount?: number;
  lossCount?: number;
  breakevenCount?: number;
  winRate?: number;
  avgWin?: number;
  avgLoss?: number;
  avgWinPct?: number;
  avgLossPct?: number;
  maxGain?: number;
  maxLoss?: number;
  avgWinDurationMins?: number;
  avgLossDurationMins?: number;
  currencySymbol?: string;
}

export function PerformanceTopCenterSection({
  instruments = [],
  openPositionsBreakdown = {
    total_open: 3,
    options: 2,
    futures: 1,
    equities: 0,
    crypto: 0,
    forex: 0,
    commodities: 0,
    long_count: 2,
    short_count: 1,
  },
  strategies = [],
  winCount = 24,
  lossCount = 10,
  breakevenCount = 1,
  winRate = 68.57,
  avgWin = 850.0,
  avgLoss = 420.0,
  avgWinPct = 3.25,
  avgLossPct = 1.65,
  maxGain = 3450.0,
  maxLoss = -1200.0,
  avgWinDurationMins = 42.0,
  avgLossDurationMins = 18.0,
  currencySymbol = "₹",
}: PerformanceTopCenterSectionProps) {
  // Strategy selector for the Strategy Win Rate widget
  const [selectedStratIndex, setSelectedStratIndex] = useState<number>(0);
  const activeStrategy = strategies[selectedStratIndex] || {
    strategy: "All Strategies Aggregated",
    win_rate: winRate,
    net_pnl: 14850.0,
    trades: winCount + lossCount + breakevenCount,
    profit_factor: 2.85,
    avg_r: 1.82,
  };

  // Find max PnL for scaling instrument bars
  const maxPnlAbs = Math.max(...instruments.map((i) => Math.abs(i.net_pnl)), 100.0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono select-none">
      {/* 1. REALIZED P&L PERFORMANCE BARS (BY INSTRUMENT / UNDERLYING) */}
      <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wider uppercase">
              PERFORMANCE / REALIZED P&L
            </span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase">TOP ASSETS</span>
        </div>

        {/* Compact Instrument Bars List */}
        <div className="space-y-2 py-1 overflow-y-auto max-h-[160px] scrollbar-thin pr-1">
          {instruments.slice(0, 6).map((item) => {
            const isPos = item.net_pnl >= 0;
            const barPct = Math.min(100, Math.max(8, (Math.abs(item.net_pnl) / maxPnlAbs) * 100));

            return (
              <div key={item.symbol} className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-300 font-bold">{item.symbol}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {item.trades} trds • {item.win_rate}% win
                    </span>
                    <span className={isPos ? "text-emerald-400 font-extrabold" : "text-rose-400 font-extrabold"}>
                      {isPos ? "+" : ""}
                      {currencySymbol}
                      {formatNumber(item.net_pnl, 2)}
                    </span>
                  </div>
                </div>

                {/* Performance Bar Track */}
                <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPos
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-gradient-to-r from-rose-500 to-amber-500"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
          <span>Realized trade P&L across underlying assets</span>
          <span className="text-sky-400 font-bold">LIVE MARK CALCULATED</span>
        </div>
      </div>

      {/* 2. WINS / LOSSES & OPEN POSITIONS COMPACT WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Wins / Losses Panel */}
        <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-white tracking-wider uppercase">
                WINS / LOSSES
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold">{winRate.toFixed(1)}% WR</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Winning Trades</span>
              <span className="text-emerald-400 font-bold">
                {winCount} ({((winCount / (winCount + lossCount + breakevenCount || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Losing Trades</span>
              <span className="text-rose-400 font-bold">
                {lossCount} ({((lossCount / (winCount + lossCount + breakevenCount || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Breakeven Trades</span>
              <span className="text-slate-300 font-bold">{breakevenCount}</span>
            </div>

            {/* Split Visual Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex pt-0.5">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${(winCount / (winCount + lossCount + breakevenCount || 1)) * 100}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${(lossCount / (winCount + lossCount + breakevenCount || 1)) * 100}%` }}
              />
              <div
                className="bg-slate-600 h-full transition-all"
                style={{ width: `${(breakevenCount / (winCount + lossCount + breakevenCount || 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
            Total Closed: <span className="text-white font-bold">{winCount + lossCount + breakevenCount}</span>
          </div>
        </div>

        {/* Positions Open Panel */}
        <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-white tracking-wider uppercase">
                POSITIONS OPEN
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/40">
              {openPositionsBreakdown.total_open} ACTIVE
            </span>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Options:</span>
              <span className="text-slate-200 font-bold">{openPositionsBreakdown.options}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Futures:</span>
              <span className="text-slate-200 font-bold">{openPositionsBreakdown.futures}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Equities:</span>
              <span className="text-slate-200 font-bold">{openPositionsBreakdown.equities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Crypto:</span>
              <span className="text-slate-200 font-bold">{openPositionsBreakdown.crypto}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              <span>{openPositionsBreakdown.long_count} Long</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-400">
              <ArrowDownRight className="w-3 h-3" />
              <span>{openPositionsBreakdown.short_count} Short</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. STRATEGY WIN RATE SELECTOR & STATS */}
      <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wider uppercase">
              STRATEGY WIN RATE
            </span>
          </div>

          {/* Strategy Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedStratIndex}
              onChange={(e) => setSelectedStratIndex(Number(e.target.value))}
              className="bg-[#0e1626] border border-slate-700/80 text-sky-400 text-xs rounded-lg px-2 py-1 appearance-none pr-6 focus:outline-none cursor-pointer font-bold"
            >
              {strategies.map((strat, idx) => (
                <option key={strat.strategy} value={idx}>
                  {strat.strategy}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Selected Strategy Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-[#060910] p-2 rounded-xl border border-slate-800/60">
            <div className="text-[10px] text-slate-400 uppercase">WIN RATE</div>
            <div className="text-emerald-400 font-extrabold text-sm">{activeStrategy.win_rate.toFixed(1)}%</div>
          </div>
          <div className="bg-[#060910] p-2 rounded-xl border border-slate-800/60">
            <div className="text-[10px] text-slate-400 uppercase">NET P&L</div>
            <div
              className={`font-extrabold text-sm ${
                activeStrategy.net_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {activeStrategy.net_pnl >= 0 ? "+" : ""}
              {currencySymbol}
              {formatNumber(activeStrategy.net_pnl, 2)}
            </div>
          </div>
          <div className="bg-[#060910] p-2 rounded-xl border border-slate-800/60">
            <div className="text-[10px] text-slate-400 uppercase">TRADES</div>
            <div className="text-white font-bold text-sm">{activeStrategy.trades}</div>
          </div>
          <div className="bg-[#060910] p-2 rounded-xl border border-slate-800/60">
            <div className="text-[10px] text-slate-400 uppercase">PROFIT FACTOR</div>
            <div className="text-sky-400 font-extrabold text-sm">{activeStrategy.profit_factor.toFixed(2)}</div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 flex justify-between">
          <span>Avg R-Multiple: <span className="text-white font-bold">{activeStrategy.avg_r}R</span></span>
          <span className="text-emerald-400">Strategy Version Isolated</span>
        </div>
      </div>

      {/* 4. WIN / LOSS STATS PANEL (DURATION & EXPECTANCY) */}
      <div className="bg-[#0b101b]/95 border border-[#1e293b] rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold text-white tracking-wider uppercase">
              WIN / LOSS STATS
            </span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase">EXPECTANCY</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[#060910] p-2 rounded-xl border border-slate-800/60 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">AVG WIN DURATION</div>
            <div className="text-emerald-400 font-bold text-sm">{avgWinDurationMins.toFixed(0)} mins</div>
            <div className="text-[10px] text-slate-400">+{avgWinPct.toFixed(2)}% avg gain</div>
          </div>

          <div className="bg-[#060910] p-2 rounded-xl border border-slate-800/60 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">AVG LOSS DURATION</div>
            <div className="text-rose-400 font-bold text-sm">{avgLossDurationMins.toFixed(0)} mins</div>
            <div className="text-[10px] text-slate-400">-{avgLossPct.toFixed(2)}% avg cut</div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
          <span>Max Profit: <span className="text-emerald-400 font-bold">+{currencySymbol}{formatNumber(maxGain, 2)}</span></span>
          <span>Max Drawdown: <span className="text-rose-400 font-bold">{currencySymbol}{formatNumber(maxLoss, 2)}</span></span>
        </div>
      </div>
    </div>
  );
}
