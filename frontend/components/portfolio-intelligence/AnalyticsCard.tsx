"use client";

import React, { memo } from "react";
import { MultiDimAllocation } from "@/types/portfolio-intelligence";
import { DonutChart } from "@/components/charts/DonutChart";
import { Layers, Compass, PieChart, Clock, ShieldAlert } from "lucide-react";

interface AnalyticsCardProps {
  item: MultiDimAllocation;
  onClick?: (item: MultiDimAllocation) => void;
}

const ICONS_MAP: Record<string, any> = {
  asset_class: Layers,
  strategy_wise: Compass,
  sector_allocation: PieChart,
  expiry_wise: Clock,
  risk_allocation: ShieldAlert,
};

export const AnalyticsCard = memo(function AnalyticsCard({
  item,
  onClick,
}: AnalyticsCardProps) {
  const IconComponent = ICONS_MAP[item.id] || Layers;

  return (
    <div
      onClick={() => onClick?.(item)}
      className="p-3.5 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md hover:shadow-[#16C6F4]/5 select-none"
    >
      {/* Header: Title + Category Icon */}
      <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] flex items-center justify-center text-[#16C6F4] group-hover:border-[#16C6F4] transition-colors">
            <IconComponent className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors">
            {item.title}
          </span>
        </div>
      </div>

      {/* Center: Donut Chart with Center Rupee & Percentage */}
      <div className="py-2.5 flex justify-center items-center">
        <DonutChart
          segments={item.segments}
          size={130}
          thickness={16}
          centerValue={item.centerValue}
          centerSubtitle={item.centerSubtitle}
          centerValueClass="text-[11px] font-bold text-white font-mono"
          centerSubtitleClass="text-[10px] font-semibold text-[#16C6F4] font-mono"
        />
      </div>

      {/* Segment Legend Grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-[#0C2237] text-[10px]">
        {item.segments.map((seg, idx) => (
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
    </div>
  );
});
