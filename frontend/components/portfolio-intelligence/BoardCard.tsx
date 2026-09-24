"use client";

import React, { memo } from "react";
import { BoardPortfolio } from "@/types/portfolio-intelligence";
import { DonutChart } from "@/components/charts/DonutChart";
import { TrendingUp, Zap, Building2, Coins, Globe } from "lucide-react";

interface BoardCardProps {
  board: BoardPortfolio;
  onClick?: (board: BoardPortfolio) => void;
}

const ICONS_MAP: Record<string, any> = {
  TrendingUp,
  Zap,
  Building2,
  Coins,
  Globe,
};

export const BoardCard = memo(function BoardCard({
  board,
  onClick,
}: BoardCardProps) {
  const isPos = board.pnl >= 0;
  const IconComponent = ICONS_MAP[board.iconName] || TrendingUp;

  return (
    <div
      onClick={() => onClick?.(board)}
      className="p-3.5 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md hover:shadow-[#16C6F4]/5 select-none"
    >
      {/* Header: Board Icon + Title + Code Badge */}
      <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] flex items-center justify-center text-[#16C6F4] group-hover:border-[#16C6F4] transition-colors">
            <IconComponent className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors">
            {board.name}
          </span>
        </div>

        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#092237] text-[#8EA1B7] border border-[#10304C]">
          {board.code}
        </span>
      </div>

      {/* Center: Donut Chart with Center Amount & Percentage */}
      <div className="py-2.5 flex justify-center items-center">
        <DonutChart
          segments={board.segments}
          size={130}
          thickness={16}
          centerValue={`₹ ${board.allocatedValue.toLocaleString("en-IN")}`}
          centerSubtitle={`${board.allocatedPercentage}%`}
          centerValueClass="text-[11px] font-bold text-white font-mono"
          centerSubtitleClass="text-[10px] font-semibold text-[#16C6F4] font-mono"
        />
      </div>

      {/* Category Legend */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-2 border-t border-b border-[#0C2237] text-[10px]">
        {board.segments.map((seg, idx) => (
          <div key={idx} className="flex items-center justify-between gap-1 text-[#8EA1B7]">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate">{seg.name}</span>
            </div>
            <span className="font-mono text-slate-200 font-medium">{seg.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Bottom Metrics: Symbols/Contracts/Lots + P&L */}
      <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1 text-[#7D8EA5]">
          <span>{board.itemLabel}</span>
          <span className="font-semibold text-slate-200">{board.itemCount}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-[#7D8EA5] text-[10px]">P&L</span>
          <span
            className={`font-bold tabular-nums ${
              isPos ? "text-[#00E890]" : "text-[#FF3B5C]"
            }`}
          >
            {isPos ? "+" : ""}
            {board.pnl.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
});
