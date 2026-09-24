"use client";

import React, { memo, useState, useMemo } from "react";
import {
  PieChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Percent,
  Sliders,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { formatNumber, formatMoney } from "@/lib/formatters";

type AnalyticsSubTab =
  | "returns"
  | "risk"
  | "trades"
  | "distribution"
  | "allocation"
  | "strategies";

// Donut Chart SVG Helper
const DonutChart = memo(function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((acc, s) => acc + s.value, 0) || 1;
  const size = 180;
  const radius = 65;
  const strokeWidth = 18;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, i) => {
          const strokeDasharray = `${(slice.value / total) * circumference} ${circumference}`;
          const strokeDashoffset = -accumulatedAngle * circumference;
          accumulatedAngle += slice.value / total;

          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 hover:opacity-80"
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
        })}
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-[10px] text-slate-400 uppercase font-mono">{centerLabel}</span>
        <span className="text-xs font-bold font-mono text-slate-100 mt-0.5">{centerValue}</span>
      </div>
    </div>
  );
});

export const AdvancedAnalyticsGrid = memo(function AdvancedAnalyticsGrid() {
  const [activeTab, setActiveTab] = useState<AnalyticsSubTab>("returns");
  const [timeframe, setTimeframe] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("3M");

  const { portfolioSnapshot, positions = [] } = useGlobalData();
  const { portfolioSummary } = useQuantDataCore();

  // P&L Breakdown by Category
  const pnlSlices = useMemo(
    () => [
      { label: "Equity & ETFs", value: 34, amount: 28200, color: "#06b6d4" },
      { label: "Options Writing", value: 28, amount: 23100, color: "#3b82f6" },
      { label: "Index Futures", value: 20, amount: 16500, color: "#10b981" },
      { label: "Crypto Perps", value: 12, amount: 9900, color: "#a855f7" },
      { label: "Arbitrage & Other", value: 6, amount: 4950, color: "#f59e0b" },
    ],
    []
  );

  // Asset Allocation Slices
  const assetSlices = useMemo(
    () => [
      { label: "NIFTY Futures/Options", value: 30, color: "#06b6d4" },
      { label: "BANKNIFTY Derivatives", value: 22, color: "#3b82f6" },
      { label: "Bluechip Equities", value: 20, color: "#10b981" },
      { label: "BTC / ETH Crypto", value: 14, color: "#a855f7" },
      { label: "Cash & Reserves", value: 14, color: "#64748b" },
    ],
    []
  );

  // Sector Exposure with min/max scale
  const sectorExposures = useMemo(
    () => [
      { sector: "Financial Services & Banking", pct: 34.5, min: 10, max: 40, color: "from-cyan-500 to-blue-500" },
      { sector: "Information Technology (IT)", pct: 24.2, min: 5, max: 30, color: "from-blue-500 to-indigo-500" },
      { sector: "Energy & Infrastructure", pct: 16.8, min: 5, max: 25, color: "from-emerald-500 to-teal-500" },
      { sector: "Automobile & Manufacturing", pct: 12.4, min: 0, max: 20, color: "from-purple-500 to-pink-500" },
      { sector: "Healthcare & Pharma", pct: 8.1, min: 0, max: 15, color: "from-amber-500 to-orange-500" },
      { sector: "FMCG & Consumer Goods", pct: 4.0, min: 0, max: 10, color: "from-rose-500 to-red-500" },
    ],
    []
  );

  // Strategy Leaderboard
  const strategies = useMemo(
    () => [
      { name: "Momentum Confluence", returnPct: "+28.4%", pnl: "+₹42,300", winRate: "72%", trades: 24, positive: true },
      { name: "Options Theta Harvester", returnPct: "+16.8%", pnl: "+₹25,800", winRate: "81%", trades: 18, positive: true },
      { name: "Index Mean Reversion", returnPct: "+11.2%", pnl: "+₹14,200", winRate: "64%", trades: 14, positive: true },
      { name: "Crypto Breakout 15m", returnPct: "+8.6%", pnl: "+₹11,400", winRate: "58%", trades: 12, positive: true },
      { name: "Overnight Gap Engine", returnPct: "-2.1%", pnl: "-₹3,100", winRate: "42%", trades: 8, positive: false },
    ],
    []
  );

  // Cumulative Return Comparison Curve
  const cumulativePoints = useMemo(() => {
    return [
      { label: "Portfolio", val: "+24.8%", color: "#06b6d4" },
      { label: "BANKNIFTY", val: "+11.6%", color: "#3b82f6" },
      { label: "NIFTY 50", val: "+8.2%", color: "#64748b" },
    ];
  }, []);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#081226] border border-cyan-500/30">
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Advanced Performance Analytics
          </h3>
          <p className="text-xs text-slate-400">
            Institutional factor risk, distribution skewness, asset segregation, and strategy attribution
          </p>
        </div>

        {/* Subtabs & Timeframe */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#050b18] p-0.5 rounded-lg border border-slate-800">
            {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 text-xs font-mono font-semibold rounded ${
                  timeframe === tf
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1: Cumulative Return vs Benchmarks & Drawdown Analysis & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Returns (Cumulative) */}
        <div className="p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Returns (Cumulative)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Alpha +16.6%
            </span>
          </div>

          <div className="space-y-2 mb-4 font-mono text-xs">
            {cumulativePoints.map((item) => (
              <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-[#0c1630]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.label}</span>
                </div>
                <span className="font-bold text-emerald-400">{item.val}</span>
              </div>
            ))}
          </div>

          {/* SVG Comparative Line Curve */}
          <div className="h-28 w-full">
            <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                points="0,80 50,78 100,74 150,72 200,68 250,65 300,62"
              />
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.8"
                points="0,80 50,72 100,65 150,55 200,50 250,45 300,38"
              />
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2.5"
                className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                points="0,80 50,60 100,48 150,38 200,28 250,22 300,12"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Drawdown Analysis (Dark Red Gradient Area Chart) */}
        <div className="p-4 rounded-2xl bg-[#081226] border border-rose-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Drawdown Analysis
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold">
              Max DD -4.12%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
            <div className="p-2 rounded-lg bg-[#0c1630] border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Current DD</span>
              <span className="font-bold text-emerald-400 mt-0.5 block">-0.45%</span>
            </div>
            <div className="p-2 rounded-lg bg-[#0c1630] border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Recovery Time</span>
              <span className="font-bold text-slate-200 mt-0.5 block">1.8 Days avg</span>
            </div>
          </div>

          {/* SVG Drawdown Area Chart */}
          <div className="h-28 w-full">
            <svg viewBox="0 0 300 100" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <polygon
                points="0,15 40,25 80,60 120,45 160,85 200,50 240,30 300,18 300,15 0,15"
                fill="url(#drawdownGrad)"
              />
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
                points="0,15 40,25 80,60 120,45 160,85 200,50 240,30 300,18"
              />
              {/* Max DD Marker */}
              <circle cx="160" cy="85" r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />
              <text x="160" y="98" fill="#fda4af" fontSize="8" textAnchor="middle" fontFamily="monospace">
                Max DD -4.12%
              </text>
            </svg>
          </div>
        </div>

        {/* Card 3: Return Distribution Histogram */}
        <div className="p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Return Distribution
            </span>
            <span className="text-[10px] font-mono text-cyan-400">Normal Skew</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono mb-2">
            <div className="p-1.5 rounded bg-[#0c1630]">
              <span className="text-slate-400 block">Avg</span>
              <span className="font-bold text-emerald-400">+1.24%</span>
            </div>
            <div className="p-1.5 rounded bg-[#0c1630]">
              <span className="text-slate-400 block">StdDev</span>
              <span className="font-bold text-slate-200">1.85%</span>
            </div>
            <div className="p-1.5 rounded bg-[#0c1630]">
              <span className="text-slate-400 block">Skew</span>
              <span className="font-bold text-cyan-400">+0.42</span>
            </div>
            <div className="p-1.5 rounded bg-[#0c1630]">
              <span className="text-slate-400 block">Kurtosis</span>
              <span className="font-bold text-slate-200">3.18</span>
            </div>
          </div>

          {/* Histogram Bars */}
          <div className="h-28 w-full flex items-end justify-between gap-1 pt-2">
            {[8, 14, 25, 45, 68, 92, 75, 48, 28, 12, 6].map((h, i) => {
              const isProfit = i >= 4;
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t transition-all ${
                      isProfit
                        ? "bg-cyan-500/80 hover:bg-cyan-400"
                        : "bg-rose-500/80 hover:bg-rose-400"
                    }`}
                    style={{ height: `${(h / 92) * 85}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Donut Charts (P&L Breakdown & Asset Allocation) + Sector Exposure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* P&L Breakdown Donut */}
        <div className="p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              P&L Breakdown by Instrument
            </span>
            <span className="text-[10px] font-mono text-cyan-400">Total ₹82,650</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-2">
            <DonutChart slices={pnlSlices} centerLabel="Total P&L" centerValue="₹82,650" />

            <div className="space-y-1.5 w-full sm:w-auto font-mono text-xs">
              {pnlSlices.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-200">
                    ₹{item.amount.toLocaleString("en-IN")} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Asset Allocation Donut */}
        <div className="p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Asset Allocation
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Deployed ₹8.00L</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-2">
            <DonutChart slices={assetSlices} centerLabel="Capital Deployed" centerValue="₹8,00,000" />

            <div className="space-y-1.5 w-full sm:w-auto font-mono text-xs">
              {assetSlices.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.label}</span>
                  </div>
                  <span className="font-bold text-slate-200">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sector Exposure Horizontal Progress Bars */}
        <div className="p-4 rounded-2xl bg-[#081226] border border-cyan-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Sector Exposure Matrix
            </span>
            <span className="text-[10px] font-mono text-cyan-400">6 Sectors Active</span>
          </div>

          <div className="space-y-2.5 my-1">
            {sectorExposures.map((sec) => (
              <div key={sec.sector} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300 truncate max-w-[180px]">{sec.sector}</span>
                  <span className="text-cyan-300 font-bold">{sec.pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#050b18] overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${sec.color}`}
                    style={{ width: `${sec.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Strategy Performance Attribution Table */}
      <div className="p-4 rounded-2xl bg-[#081226] border border-cyan-500/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Active Strategy Performance & Attribution
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Live Strategy Dispatcher</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                <th className="py-2 px-3">Strategy Name</th>
                <th className="py-2 px-3 text-right">Return %</th>
                <th className="py-2 px-3 text-right">Attributed P&L</th>
                <th className="py-2 px-3 text-right">Win Rate</th>
                <th className="py-2 px-3 text-right">Trades Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {strategies.map((strat) => (
                <tr key={strat.name} className="hover:bg-[#0c1630] transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200">{strat.name}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      strat.positive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {strat.returnPct}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      strat.positive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {strat.pnl}
                  </td>
                  <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold">{strat.winRate}</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">{strat.trades}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
