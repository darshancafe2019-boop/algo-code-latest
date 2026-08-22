"use client";

import React from "react";
import { Wallet, PieChart, ArrowUpRight } from "lucide-react";

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
      className={`p-4 bg-[#0D1914] border border-[#294238] rounded-2xl flex flex-wrap items-center justify-between gap-4 font-sans select-none ${className}`}
    >
      {/* Left: Metric Numbers */}
      <div className="space-y-3 flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 text-[#70877A] text-[10px] font-mono uppercase tracking-wider">
          <Wallet className="h-3.5 w-3.5 text-[#55C98A]" />
          <span>Capital Allocation Matrix</span>
        </div>

        <div className="grid grid-cols-3 gap-2 font-mono">
          <div>
            <span className="text-[9px] text-[#70877A] uppercase block">Total Capital</span>
            <span className="text-xs font-extrabold text-[#E8F3EC]">
              {currency}{totalCapital.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[9px] text-[#70877A] uppercase block">Allocated / Used</span>
            <span className="text-xs font-bold text-[#D9A441]">
              {currency}{usedCapital.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[9px] text-[#70877A] uppercase block">Available Cash</span>
            <span className="text-xs font-bold text-[#55C98A]">
              {currency}{availableCapital.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Circular Ring Meter */}
      <div className="flex items-center gap-3 pr-2">
        <div className="relative w-18 h-18 flex items-center justify-center">
          <svg className="w-18 h-18 transform -rotate-90" viewBox="0 0 80 80">
            {/* Background Track */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="#1B3328"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="#55C98A"
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
            <span className="text-xs font-black text-[#E8F3EC]">{clampedPct.toFixed(0)}%</span>
            <span className="text-[7px] text-[#70877A] uppercase tracking-tighter">USED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
