"use client";

import React, { memo } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { PortfolioHeroData } from "@/types/portfolio-intelligence";
import { ProgressBar } from "@/components/charts/ProgressBar";

interface PortfolioHeroKpiProps {
  data: PortfolioHeroData;
  onCardClick?: (metric: string) => void;
}

export const PortfolioHeroKpi = memo(function PortfolioHeroKpi({
  data,
  onCardClick,
}: PortfolioHeroKpiProps) {
  const isPos = data.dayChangePercent >= 0;

  return (
    <div className="w-full bg-[#030D18] border-b border-[#0C1E30] p-4 select-none">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
        {/* Large Left KPI: Total Portfolio Value (approx 3.5 - 4 cols) */}
        <div
          onClick={() => onCardClick?.("total_portfolio")}
          className="xl:col-span-4 p-4 rounded-lg bg-gradient-to-br from-[#061A2A] via-[#071F32] to-[#041424] border border-[#103450] hover:border-[#16C6F4]/50 transition-all flex flex-col justify-between cursor-pointer group shadow-lg shadow-black/40"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#8EA1B7] tracking-wider uppercase">
              Total Portfolio Value
            </span>
            <div className="h-6 w-6 rounded-md bg-[#16C6F4]/10 border border-[#16C6F4]/30 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-[#16C6F4]" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-[36px] lg:text-[40px] font-black text-white font-mono tracking-tight tabular-nums leading-none">
              ₹ {data.totalValue.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 text-[13px] font-mono font-bold px-2 py-0.5 rounded ${
                isPos
                  ? "bg-[#00E890]/15 text-[#00E890] border border-[#00E890]/30"
                  : "bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30"
              }`}
            >
              {isPos ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              <span>
                {isPos ? "+" : ""}
                {data.dayChangePercent.toFixed(2)}% (+₹{data.dayChangeAmount.toLocaleString("en-IN")})
              </span>
            </div>
            <span className="text-[11px] text-[#7D8EA5]">overall return</span>
          </div>
        </div>

        {/* 8 KPI Cards Grid (approx 8 cols) */}
        <div className="xl:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Invested */}
          <div
            onClick={() => onCardClick?.("invested")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="text-[11px] font-medium text-[#7D8EA5]">1. Invested</div>
            <div className="text-[17px] sm:text-[19px] font-bold text-white font-mono tabular-nums leading-tight">
              ₹ {data.invested.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">Principal Allocated</div>
          </div>

          {/* 2. Available */}
          <div
            onClick={() => onCardClick?.("available")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="text-[11px] font-medium text-[#7D8EA5]">2. Available</div>
            <div className="text-[17px] sm:text-[19px] font-bold text-[#16C6F4] font-mono tabular-nums leading-tight">
              ₹ {data.available.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">Free Cash Balance</div>
          </div>

          {/* 3. Used Margin */}
          <div
            onClick={() => onCardClick?.("used_margin")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="text-[11px] font-medium text-[#7D8EA5]">3. Used Margin</div>
            <div className="text-[17px] sm:text-[19px] font-bold text-amber-400 font-mono tabular-nums leading-tight">
              ₹ {data.usedMargin.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">Active Exposure</div>
          </div>

          {/* 4. Realized P&L */}
          <div
            onClick={() => onCardClick?.("realized_pnl")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>4. Realized P&L</span>
            </div>
            <div className="text-[17px] sm:text-[19px] font-bold text-[#00E890] font-mono tabular-nums leading-tight">
              ₹ {data.realizedPnl.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-[#8EA1B7] flex items-center justify-between">
              <span>Win Rate</span>
              <span className="font-semibold text-[#16C6F4]">{data.winRate}%</span>
            </div>
          </div>

          {/* 5. Unrealized P&L */}
          <div
            onClick={() => onCardClick?.("unrealized_pnl")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="text-[11px] font-medium text-[#7D8EA5]">5. Unrealized P&L</div>
            <div className="text-[17px] sm:text-[19px] font-bold text-[#00E890] font-mono tabular-nums leading-tight">
              ₹ {data.unrealizedPnl.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-[#8EA1B7]">
              <span className="font-semibold text-slate-200">{data.openPositionsCount}</span> positions
            </div>
          </div>

          {/* 6. Day P&L */}
          <div
            onClick={() => onCardClick?.("day_pnl")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="text-[11px] font-medium text-[#7D8EA5]">6. Day P&L</div>
            <div className="text-[17px] sm:text-[19px] font-bold text-[#00E890] font-mono tabular-nums leading-tight">
              ₹ {data.dayPnl.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-[#00E890] font-mono font-semibold">
              +{data.dayPnlPercent.toFixed(2)}%
            </div>
          </div>

          {/* 7. Max Drawdown */}
          <div
            onClick={() => onCardClick?.("drawdown")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="text-[11px] font-medium text-[#7D8EA5]">7. Max Drawdown</div>
            <div className="text-[17px] sm:text-[19px] font-bold text-[#FF3B5C] font-mono tabular-nums leading-tight">
              ₹ {data.maxDrawdown.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-[#FF3B5C] font-mono font-semibold">
              {data.maxDrawdownPercent.toFixed(2)}%
            </div>
          </div>

          {/* 8. Margin Utilization */}
          <div
            onClick={() => onCardClick?.("margin_utilization")}
            className="p-3 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/40 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] font-medium text-[#7D8EA5]">
              <span>8. Margin Util.</span>
              <span className="text-[12px] font-mono font-bold text-amber-400">
                {data.marginUtilization}%
              </span>
            </div>
            <div className="my-1">
              <ProgressBar
                value={data.marginUtilization}
                max={100}
                height={5}
                color={
                  data.marginUtilization > 75
                    ? "bg-[#FF3B5C]"
                    : data.marginUtilization > 50
                    ? "bg-amber-400"
                    : "bg-[#16C6F4]"
                }
              />
            </div>
            <div className="text-[10px] text-[#8EA1B7]">Safe &lt; 50% Threshold</div>
          </div>
        </div>
      </div>
    </div>
  );
});
