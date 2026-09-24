"use client";

import React, { memo } from "react";
import { BrokerPortfolio } from "@/types/portfolio-intelligence";
import { DonutChart } from "@/components/charts/DonutChart";
import { Landmark, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface BrokerCardProps {
  broker: BrokerPortfolio;
  onClick?: (broker: BrokerPortfolio) => void;
}

export const BrokerCard = memo(function BrokerCard({
  broker,
  onClick,
}: BrokerCardProps) {
  const isPos = broker.pnl >= 0;

  return (
    <div
      onClick={() => onClick?.(broker)}
      className="p-3.5 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm hover:shadow-md hover:shadow-[#16C6F4]/5 select-none"
    >
      {/* Header: Broker Logo/Icon + Name + Status */}
      <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
        <div className="flex items-center gap-2">
          {/* Logo Badge */}
          <div className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] flex items-center justify-center font-bold text-[10px] text-[#16C6F4] group-hover:border-[#16C6F4] transition-colors">
            {broker.id === "dhan" ? "DH" : broker.id === "upstox" ? "UP" : broker.id === "angel_one" ? "AO" : broker.id === "delta_exchange" ? "DX" : "BN"}
          </div>
          <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors">
            {broker.name}
          </span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#07241E] border border-[#00E890]/30 text-[10px] font-medium text-[#00E890]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00E890] animate-pulse" />
          <span>{broker.status}</span>
        </div>
      </div>

      {/* Center: Donut Chart with Center Rupee & Percentage */}
      <div className="py-2.5 flex justify-center items-center">
        <DonutChart
          segments={broker.segments}
          size={130}
          thickness={16}
          centerValue={`₹ ${broker.allocatedValue.toLocaleString("en-IN")}`}
          centerSubtitle={`${broker.allocatedPercentage}%`}
          centerValueClass="text-[11px] font-bold text-white font-mono"
          centerSubtitleClass="text-[10px] font-semibold text-[#16C6F4] font-mono"
        />
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-2 border-t border-b border-[#0C2237] text-[10px]">
        {broker.segments.map((seg, idx) => (
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

      {/* Footer Metrics: Positions | Open | P&L */}
      <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1 text-[#7D8EA5]">
          <span>Positions</span>
          <span className="font-semibold text-slate-200">{broker.positionsCount}</span>
        </div>
        <div className="flex items-center gap-1 text-[#7D8EA5]">
          <span>Open</span>
          <span className="font-semibold text-[#16C6F4]">{broker.openPositionsCount}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-[#7D8EA5] text-[10px]">P&L</span>
          <span
            className={`font-bold tabular-nums ${
              isPos ? "text-[#00E890]" : "text-[#FF3B5C]"
            }`}
          >
            {isPos ? "+" : ""}
            {broker.pnl.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </div>
  );
});
