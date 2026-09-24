"use client";

import React, { memo } from "react";
import {
  Activity,
  Radio,
  Server,
  Zap,
  Globe,
  Bell,
  Layers,
} from "lucide-react";
import { useGlobalData } from "@/context/GlobalDataContext";

export const LiveFooterTicker = memo(function LiveFooterTicker() {
  const { tradingMode, isLive, isStale } = useGlobalData();

  const newsItems = [
    "NIFTY +0.82% hits day high on heavy financial flows",
    "Delta Exchange BTC perp basis spreads tighten to +0.02%",
    "US Fed Chair speech scheduled for 18:30 IST today",
    "Crude Oil breaks below $82/bbl; favorable for Indian equities",
    "Quant.OS Auto-Reconciliation Engine synced 128 orders across 5 brokers",
  ];

  return (
    <div className="w-full bg-[#050b18] border border-cyan-900/40 rounded-xl px-3 py-2 text-xs font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-[0_0_15px_rgba(0,0,0,0.6)]">
      {/* Left: News Flash Title & Scrolling Headlines */}
      <div className="flex items-center gap-2 overflow-hidden w-full sm:w-auto">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 shrink-0 text-[10px] font-bold">
          <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>FLASH</span>
        </div>
        <div className="truncate text-slate-300 text-[11px]">
          {newsItems.join("  •  ")}
        </div>
      </div>

      {/* Right: Telemetry pill strip */}
      <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span>Market Feed: <strong>Sub-10ms</strong></span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <Server className="w-3 h-3 text-cyan-400" />
          <span>Brokers: <strong>5 Connected</strong></span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#091226] border border-slate-800 text-slate-200">
          <span>Mode: <strong className="text-cyan-400">{tradingMode}</strong></span>
        </div>
      </div>
    </div>
  );
});
