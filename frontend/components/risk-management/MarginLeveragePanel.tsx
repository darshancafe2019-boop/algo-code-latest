"use client";

import React from "react";
import {
  Percent,
  Zap,
  Shield,
  AlertTriangle,
  Lock,
  Layers,
} from "lucide-react";
import { RiskOverviewState } from "@/types/risk";

interface MarginLeveragePanelProps {
  overview: RiskOverviewState;
}

export function MarginLeveragePanel({ overview }: MarginLeveragePanelProps) {
  const balance = overview.account_balance || 10000.0;
  const marginUsed = overview.margin_used || 3200.0;
  const marginPct = (marginUsed / balance) * 100.0;
  const marginFreePct = Math.max(0, 100.0 - marginPct);
  const marginFreeDollars = Math.max(0, balance - marginUsed);
  const maxLeverage = overview.active_limits?.max_leverage || 20.0;

  const isCritical = marginPct >= 70.0;
  const isWarning = marginPct >= 50.0 && marginPct < 70.0;

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Margin & Leverage Protection Engine
          </h3>
          <p className="text-[11px] text-[#7C8CA3]">
            Automated collateral buffers, liquidation prevention gates, and leverage capping.
          </p>
        </div>
        <span className="text-[10px] px-2.5 py-0.5 rounded font-mono font-bold uppercase bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/40">
          70.0% Max Cap
        </span>
      </div>

      {/* Main Visual Margin Gauge Card */}
      <div className="p-5 rounded-2xl bg-[#0A1422] border border-[#122033] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#7C8CA3] font-bold uppercase tracking-wider block">
              Collateral Utilization
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">
                {marginPct.toFixed(1)}%
              </span>
              <span className="text-xs font-mono text-purple-300 font-bold">USED</span>
              <span className="text-xs font-mono text-[#52627A]">
                (${marginUsed.toLocaleString()} / ${balance.toLocaleString()})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-[#52627A] font-mono uppercase block">Free Collateral</span>
              <span className="text-lg font-bold font-mono text-[#22D3EE]">
                {marginFreePct.toFixed(1)}% FREE
              </span>
              <span className="text-[10px] text-[#7C8CA3] font-mono block">
                (${marginFreeDollars.toLocaleString()} Available)
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border font-bold text-xs font-mono uppercase ${
                isCritical
                  ? "bg-red-950 text-red-400 border-red-800 animate-pulse"
                  : isWarning
                  ? "bg-amber-950 text-amber-400 border-amber-800"
                  : "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border-[#00E890]/40"
              }`}
            >
              {isCritical ? "ORDERS BLOCKED" : isWarning ? "MARGIN WARNING" : "SAFE THRESHOLD"}
            </div>
          </div>
        </div>

        {/* Progress Bar with Safety Threshold Marker */}
        <div className="space-y-1.5 font-mono">
          <div className="h-3 w-full bg-[#07101A] rounded-full overflow-hidden border border-[#122033] relative">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-[#22D3EE]"
              }`}
              style={{ width: `${Math.min(100, marginPct)}%` }}
            />
            {/* 70% threshold line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
              style={{ left: "70%" }}
              title="70% Hard Limit"
            />
          </div>

          <div className="flex justify-between text-[10px] text-[#52627A]">
            <span>0% Margin</span>
            <span className="text-amber-400">50% Warning</span>
            <span className="text-red-400 font-bold">70% Hard Order Block Limit</span>
            <span>100% Liquidation Risk</span>
          </div>
        </div>

        {/* Leverage Tier Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#07101A] border border-[#122033] space-y-1">
            <div className="flex items-center justify-between text-cyan-300 font-bold">
              <span>Crypto Perps</span>
              <span>10x Max</span>
            </div>
            <p className="text-[10px] text-[#52627A]">
              Dynamic liquidation cushion: 10% maintenance margin required.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#07101A] border border-[#122033] space-y-1">
            <div className="flex items-center justify-between text-purple-300 font-bold">
              <span>NSE Index Futures</span>
              <span>1x (Cash Secured)</span>
            </div>
            <p className="text-[10px] text-[#52627A]">
              SPAN + Exposure margin strictly enforced before order dispatch.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#07101A] border border-[#122033] space-y-1">
            <div className="flex items-center justify-between text-[#22D3EE] font-bold">
              <span>Options Buying</span>
              <span>100% Cash</span>
            </div>
            <p className="text-[10px] text-[#52627A]">
              Maximum loss limited strictly to premium paid at entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
