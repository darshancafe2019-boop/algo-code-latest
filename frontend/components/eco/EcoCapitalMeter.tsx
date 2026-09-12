"use client";

import React from "react";
import { Wallet } from "lucide-react";

interface EcoCapitalMeterProps {
  totalCapital?: number;
  usedCapital?: number;
  currency?: string;
  className?: string;
}

export function EcoCapitalMeter({
  totalCapital = 100000,
  usedCapital = 35000,
  currency = "₹",
  className = "",
}: EcoCapitalMeterProps) {
  const availableCapital = Math.max(0, totalCapital - usedCapital);
  const utilizationPct = totalCapital > 0 ? (usedCapital / totalCapital) * 100 : 0;
  const clampedPct = Math.min(100, Math.max(0, utilizationPct));

  // Circular progress calculations (radius = 32, circumference = 2 * PI * 32 = 201.06)
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <div
      className={`p-4 bg-[#0A1422] border border-[#1A2A3F] rounded-xl flex flex-wrap items-center justify-between gap-4 font-sans select-none ${className}`}
    >
      {/* Left: Metric Numbers */}
      <div className="space-y-3 flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 text-[#7C8CA3] text-[10px] font-mono uppercase tracking-wider">
          <Wallet className="h-3.5 w-3.5 text-[#22D3EE]" />
          <span>Capital Allocation Matrix</span>
        </div>

        <div className="grid grid-cols-3 gap-2 font-mono">
          <div>
            <span className="text-[9px] text-[#52627A] uppercase block">Total Capital</span>
            <span className="text-xs font-bold text-[#F7FAFC] tabular-nums">
              {currency}{totalCapital.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[9px] text-[#52627A] uppercase block">Allocated / Used</span>
            <span className="text-xs font-bold text-[#F59E0B] tabular-nums">
              {currency}{usedCapital.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[9px] text-[#52627A] uppercase block">Available Cash</span>
            <span className="text-xs font-bold text-[#00E890] tabular-nums">
              {currency}{availableCapital.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Circular Ring Meter */}
      <div className="flex items-center gap-3 pr-2">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 80 80">
            {/* Background Track */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="#122033"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="#22D3EE"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Percentage */}
          <div className="absolute flex flex-col items-center justify-center font-mono">
            <span className="text-xs font-bold text-[#F7FAFC] tabular-nums">{clampedPct.toFixed(0)}%</span>
            <span className="text-[7px] text-[#52627A] uppercase tracking-tighter">USED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
