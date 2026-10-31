"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface CategoryPillItem {
  id: string;
  label: string;
  codeRange: string;
  count: number;
}

export const STRATEGY_CATEGORY_PILLS: CategoryPillItem[] = [
  { id: "ALL", label: "All Models", codeRange: "54 Total", count: 54 },
  { id: "TREND", label: "Trend", codeRange: "S01–S05", count: 5 },
  { id: "BREAKOUT", label: "Breakout", codeRange: "S06–S10", count: 5 },
  { id: "REVERSAL", label: "Reversal", codeRange: "S11–S15", count: 5 },
  { id: "VOLUME", label: "Volume", codeRange: "S21–S25", count: 5 },
  { id: "STRUCTURE", label: "Structure", codeRange: "S16–S20", count: 5 },
  { id: "CRYPTO_SPECIFIC", label: "Crypto-Specific", codeRange: "S26–S30", count: 5 },
  { id: "OPTIONS_INCOME", label: "Range & Income", codeRange: "O01–O08", count: 8 },
  { id: "OPTIONS_VOLATILITY", label: "Volatility & Spreads", codeRange: "O09–O16", count: 8 },
  { id: "OPTIONS_CALENDARS", label: "Calendars & Synthetics", codeRange: "O17–O24", count: 8 },
];

interface StrategyCategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  categoryCounts?: Record<string, number>;
}

export function StrategyCategoryPills({
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
}: StrategyCategoryPillsProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-0.5">
      <div className="flex items-center gap-1.5 flex-nowrap">
        {STRATEGY_CATEGORY_PILLS.map((pill) => {
          const isSelected = selectedCategory === pill.id;
          const displayCount = categoryCounts[pill.id] ?? pill.count;

          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onSelectCategory(pill.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-sans font-semibold transition-all duration-150 border shrink-0 cursor-pointer select-none",
                isSelected
                  ? "bg-[#0B1728] border-[#00C9E8] text-[#00C9E8] shadow-sm shadow-[#00C9E8]/10 ring-1 ring-[#00C9E8]/30 font-bold"
                  : "bg-[#081321] border-[#1A2B43] text-[#91A7C1] hover:text-[#EAF3FF] hover:border-[#1F4264] hover:bg-[#09182B]"
              )}
            >
              <span>{pill.label}</span>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.2 rounded-full",
                  isSelected
                    ? "bg-[#00C9E8]/20 text-[#00C9E8]"
                    : "bg-[#06101B] text-[#91A7C1] border border-[#1A2B43]"
                )}
              >
                ({pill.codeRange})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

