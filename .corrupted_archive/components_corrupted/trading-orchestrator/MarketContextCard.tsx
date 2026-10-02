"use client";

import React from "react";
import {
  Newspaper,
  Calendar,
  Compass,
  Layers,
  ArrowRight,
} from "lucide-react";
import { MarketContextSummary, DrawerContentType } from "./useSharedTradingState";
import { cn } from "@/lib/utils";

interface MarketContextCardProps {
  context: MarketContextSummary;
  onOpenDrawer: (type: DrawerContentType, title: string, data?: any) => void;
}

export const MarketContextCard: React.FC<MarketContextCardProps> = ({
  context,
  onOpenDrawer,
}) => {
  return (
    <div className="w-full bg-[#050e1d]/90 border border-[#12365a] rounded-xl p-4 shadow-lg select-none backdrop-blur flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#0d2847]">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            MARKET CONTEXT & SENTIMENT
          </h3>
        </div>

        <span className="px-2 py-0.5 rounded bg-[#07192f] border border-[#143e69] text-cyan-300 text-[11px] font-mono font-bold">
          {context.marketRegime}
        </span>
      </div>

      {/* Body Info */}
      <div className="grid grid-cols-2 gap-2 py-3 text-xs font-sans">
        <div className="bg-[#07192f] border border-[#103456] rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">NEWS & MACRO</span>
          <span className="text-slate-100 font-bold">{context.newsCount} Important Events</span>
        </div>

        <div className="bg-[#07192f] border border-[#103456] rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">ECONOMIC CALENDAR</span>
          <span className="text-amber-400 font-bold">{context.highImpactEventsCount} High Impact</span>
        </div>

        <div className="bg-[#07192f] border border-[#103456] rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">SENTIMENT</span>
          <span className="text-slate-200 font-bold">{context.sentiment}</span>
        </div>

        <div className="bg-[#07192f] border border-[#103456] rounded-lg p-2.5">
          <span className="text-[10px] text-slate-400 font-mono block">REGIME</span>
          <span className="text-emerald-400 font-bold">{context.marketRegime}</span>
        </div>
      </div>

      {/* Button */}
      <div className="pt-2 border-t border-[#0d2847]">
        <button
          onClick={() => onOpenDrawer("market_context", "Macro Context, News & Economic Events", context)}
          className="w-full py-1.5 px-3 rounded-lg bg-[#07192f] hover:bg-[#0c284a] text-slate-200 hover:text-white border border-[#143e69] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Newspaper className="h-3.5 w-3.5 text-[#00D4FF]" />
          VIEW FULL CONTEXT
        </button>
      </div>
    </div>
  );
};
