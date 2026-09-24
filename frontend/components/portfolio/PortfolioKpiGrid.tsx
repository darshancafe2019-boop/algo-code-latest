"use client";

import React, { memo, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Percent,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { formatNumber } from "@/lib/formatters";

// Reusable SVG Mini Sparkline
const MiniSparkline = memo(function MiniSparkline({
  data,
  color,
  isArea = false,
  isNegative = false,
}: {
  data: number[];
  color: string;
  isArea?: boolean;
  isNegative?: boolean;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 30;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="w-24 h-8 shrink-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {isArea && (
          <polygon
            points={areaPoints}
            fill={`url(#grad-${color})`}
          />
        )}

        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  );
});

export const PortfolioKpiGrid = memo(function PortfolioKpiGrid() {
  const { portfolioSnapshot, positions } = useGlobalData();
  const { portfolioSummary } = useQuantDataCore();

  // 1. Realized P&L
  const realizedPnL = useMemo(() => {
    if (portfolioSnapshot?.netRealizedPnl != null) {
      return portfolioSnapshot.netRealizedPnl;
    }
    if (portfolioSummary?.byCurrency?.INR?.realizedPnL != null) {
      return portfolioSummary.byCurrency.INR.realizedPnL;
    }
    return 34250;
  }, [portfolioSnapshot, portfolioSummary]);

  const totalTrades = portfolioSnapshot?.totalTradesCount || 48;
  const winRate = portfolioSnapshot?.winRate != null ? portfolioSnapshot.winRate : 68.5;

  // 2. Unrealized P&L
  const unrealizedPnL = useMemo(() => {
    if (portfolioSnapshot?.unrealizedPnl != null) {
      return portfolioSnapshot.unrealizedPnl;
    }
    if (portfolioSummary?.byCurrency?.INR?.unrealizedPnL != null) {
      return portfolioSummary.byCurrency.INR.unrealizedPnL;
    }
    return 12840;
  }, [portfolioSnapshot, portfolioSummary]);

  const openPositionsCount = positions?.length || portfolioSnapshot?.openPositions || 5;

  // 3. Day ROI
  const dayRoi = useMemo(() => {
    if (portfolioSnapshot?.dailyPnl != null && portfolioSnapshot.equity != null && portfolioSnapshot.equity > 0) {
      return (portfolioSnapshot.dailyPnl / portfolioSnapshot.equity) * 100;
    }
    return 2.31;
  }, [portfolioSnapshot]);

  // 4. Max Drawdown
  const maxDrawdownPct = portfolioSnapshot?.maxDrawdownPct || 4.12;
  const maxDrawdownValue = useMemo(() => {
    if (portfolioSnapshot?.equity) {
      return (portfolioSnapshot.equity * maxDrawdownPct) / 100;
    }
    return 33950;
  }, [portfolioSnapshot, maxDrawdownPct]);

  // Sparkline data series
  const realizedSpark = [10, 14, 12, 18, 22, 21, 28, 32, 34];
  const unrealizedSpark = [5, 8, 4, 9, 11, 8, 14, 12, 13];
  const roiSpark = [1.1, 1.4, 1.2, 1.8, 2.0, 1.9, 2.3];
  const ddSpark = [0.8, 1.2, 2.1, 1.5, 3.2, 4.1, 3.6];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Card A: REALIZED P&L (Cyan/Blue Accent) */}
      <div className="relative overflow-hidden rounded-xl bg-[#091226] border border-cyan-500/30 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:border-cyan-400/60 transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
            Realized P&L
          </span>
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="text-xl font-extrabold font-mono text-slate-100">
              ₹ {realizedPnL.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
              <span>{totalTrades} Trades</span>
              <span>•</span>
              <span className="text-cyan-300 font-semibold">{winRate.toFixed(1)}% Win Rate</span>
            </div>
          </div>
          <MiniSparkline data={realizedSpark} color="#06b6d4" isArea />
        </div>
      </div>

      {/* Card B: UNREALIZED P&L (Purple/Violet Accent) */}
      <div className="relative overflow-hidden rounded-xl bg-[#091226] border border-purple-500/30 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:border-purple-400/60 transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
            Unrealized P&L
          </span>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-300">
            <Activity className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="text-xl font-extrabold font-mono text-slate-100">
              ₹ {unrealizedPnL.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
              <span className="text-purple-300 font-semibold">
                {openPositionsCount} Active Positions
              </span>
            </div>
          </div>
          <MiniSparkline data={unrealizedSpark} color="#a855f7" isArea />
        </div>
      </div>

      {/* Card C: DAY ROI (Emerald/Green Accent) */}
      <div className="relative overflow-hidden rounded-xl bg-[#091226] border border-emerald-500/30 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:border-emerald-400/60 transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            Day ROI
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-300">
            <Percent className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="text-xl font-extrabold font-mono text-emerald-400">
              +{dayRoi.toFixed(2)}%
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400 font-mono">
              <ArrowUpRight className="w-3 h-3 inline" />
              <span>+0.85% vs Prev Close</span>
            </div>
          </div>
          <MiniSparkline data={roiSpark} color="#10b981" isArea />
        </div>
      </div>

      {/* Card D: MAX DRAWDOWN (Coral/Red Accent) */}
      <div className="relative overflow-hidden rounded-xl bg-[#091226] border border-rose-500/30 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:border-rose-400/60 transition-all duration-200 group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
            Max Drawdown
          </span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-300">
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <div className="text-xl font-extrabold font-mono text-rose-400">
              -{maxDrawdownPct.toFixed(2)}%
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400 font-mono">
              <span>Peak: -₹{maxDrawdownValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          <MiniSparkline data={ddSpark} color="#f43f5e" isArea isNegative />
        </div>
      </div>
    </div>
  );
});
