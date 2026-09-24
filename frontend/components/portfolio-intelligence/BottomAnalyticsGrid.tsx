"use client";

import React, { memo } from "react";
import { DonutChart } from "@/components/charts/DonutChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { BarChartItem, ChartSegment } from "@/types/portfolio-intelligence";
import { DollarSign, PieChart, BarChart2, TrendingUp, CheckCircle2 } from "lucide-react";

interface BottomAnalyticsGridProps {
  pnlBreakdown: {
    title: string;
    centerValue: string;
    centerSubtitle: string;
    segments: ChartSegment[];
  };
  capitalDeployment: {
    title: string;
    centerValue: string;
    centerSubtitle: string;
    segments: ChartSegment[];
  };
  brokerWisePnl: BarChartItem[];
  boardWisePnl: BarChartItem[];
  dailyPerformance: {
    title: string;
    centerValue: string;
    centerSubtitle: string;
    segments: ChartSegment[];
  };
  onCardClick?: (type: string) => void;
}

export const BottomAnalyticsGrid = memo(function BottomAnalyticsGrid({
  pnlBreakdown,
  capitalDeployment,
  brokerWisePnl,
  boardWisePnl,
  dailyPerformance,
  onCardClick,
}: BottomAnalyticsGridProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Card 1: P&L Breakdown */}
        <div
          onClick={() => onCardClick?.("pnl_breakdown")}
          className="p-3.5 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm select-none"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] flex items-center justify-center text-[#00E890] group-hover:border-[#16C6F4] transition-colors">
                <DollarSign className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors">
                {pnlBreakdown.title}
              </span>
            </div>
          </div>

          <div className="py-2.5 flex justify-center items-center">
            <DonutChart
              segments={pnlBreakdown.segments}
              size={130}
              thickness={16}
              centerValue={pnlBreakdown.centerValue}
              centerSubtitle={pnlBreakdown.centerSubtitle}
              centerValueClass="text-[11px] font-bold text-[#00E890] font-mono"
              centerSubtitleClass="text-[10px] font-semibold text-[#8EA1B7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-[#0C2237] text-[10px]">
            {pnlBreakdown.segments.map((seg, idx) => (
              <div key={idx} className="flex items-center justify-between gap-1 text-[#8EA1B7]">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate">{seg.name}</span>
                </div>
                <span
                  className={`font-mono font-medium ${
                    seg.pnl !== undefined && seg.pnl < 0 ? "text-[#FF3B5C]" : "text-[#00E890]"
                  }`}
                >
                  {seg.pnl !== undefined ? (seg.pnl >= 0 ? `+${seg.pnl}` : `${seg.pnl}`) : `${seg.percentage}%`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Capital Deployment */}
        <div
          onClick={() => onCardClick?.("capital_deployment")}
          className="p-3.5 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm select-none"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] flex items-center justify-center text-[#16C6F4] group-hover:border-[#16C6F4] transition-colors">
                <PieChart className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors">
                {capitalDeployment.title}
              </span>
            </div>
          </div>

          <div className="py-2.5 flex justify-center items-center">
            <DonutChart
              segments={capitalDeployment.segments}
              size={130}
              thickness={16}
              centerValue={capitalDeployment.centerValue}
              centerSubtitle={capitalDeployment.centerSubtitle}
              centerValueClass="text-[11px] font-bold text-white font-mono"
              centerSubtitleClass="text-[10px] font-semibold text-[#16C6F4]"
            />
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-2 border-t border-[#0C2237] text-[10px]">
            {capitalDeployment.segments.map((seg, idx) => (
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

        {/* Card 3: Broker Wise P&L */}
        <div
          onClick={() => onCardClick?.("broker_wise_pnl")}
          className="p-3.5 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm select-none"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] flex items-center justify-center text-[#16C6F4] group-hover:border-[#16C6F4] transition-colors">
                <BarChart2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors">
                Broker Wise P&L
              </span>
            </div>
          </div>

          <div className="py-2 my-auto">
            <HorizontalBarChart items={brokerWisePnl} />
          </div>

          <div className="pt-2 border-t border-[#0C2237] flex items-center justify-between text-[10px] text-[#7D8EA5]">
            <span>Net Contribution</span>
            <span className="font-mono font-bold text-[#00E890]">+₹17,450</span>
          </div>
        </div>

        {/* Card 4: Board Wise P&L */}
        <div
          onClick={() => onCardClick?.("board_wise_pnl")}
          className="p-3.5 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm select-none"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] flex items-center justify-center text-[#16C6F4] group-hover:border-[#16C6F4] transition-colors">
                <BarChart2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors">
                Board Wise P&L
              </span>
            </div>
          </div>

          <div className="py-2 my-auto">
            <HorizontalBarChart items={boardWisePnl} />
          </div>

          <div className="pt-2 border-t border-[#0C2237] flex items-center justify-between text-[10px] text-[#7D8EA5]">
            <span>Leading Driver</span>
            <span className="font-mono font-bold text-[#16C6F4]">NSE F&O</span>
          </div>
        </div>

        {/* Card 5: Daily Performance */}
        <div
          onClick={() => onCardClick?.("daily_performance")}
          className="p-3.5 rounded-lg bg-[#061A2A] border border-[#0F2D48] hover:border-[#16C6F4]/50 transition-all duration-200 flex flex-col justify-between cursor-pointer group shadow-sm select-none"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#0C2237]">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-[#092237] border border-[#133A5C] flex items-center justify-center text-[#00E890] group-hover:border-[#16C6F4] transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-[13px] font-bold text-white tracking-wide group-hover:text-[#16C6F4] transition-colors">
                {dailyPerformance.title}
              </span>
            </div>
          </div>

          <div className="py-2.5 flex justify-center items-center">
            <DonutChart
              segments={dailyPerformance.segments}
              size={130}
              thickness={16}
              centerValue={dailyPerformance.centerValue}
              centerSubtitle={dailyPerformance.centerSubtitle}
              centerValueClass="text-[11px] font-bold text-[#00E890] font-mono"
              centerSubtitleClass="text-[10px] font-semibold text-[#8EA1B7]"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#0C2237] text-[10px]">
            {dailyPerformance.segments.map((seg, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center text-[#8EA1B7]">
                <div className="flex items-center gap-1">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate">{seg.name}</span>
                </div>
                <span className="font-mono text-slate-200 font-bold">{seg.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
