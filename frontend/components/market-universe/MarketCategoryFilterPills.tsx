"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Star, Sliders, Settings2 } from "lucide-react";
import { MarketCategory } from "./MarketCategoryCards";

interface CategoryFilterPillsProps {
  activeCategory: MarketCategory;
  onSelectCategory: (cat: MarketCategory) => void;
  categoryCounts: Record<string, number>;
  watchlistCount: number;
  onOpenColumnSettings?: () => void;
}

const PILLS: { id: MarketCategory; label: string; isWatchlist?: boolean }[] = [
  { id: "WATCHLIST", label: "WATCHLIST", isWatchlist: true },
  { id: "ALL", label: "ALL" },
  { id: "STOCKS", label: "STOCKS" },
  { id: "INDICES", label: "INDICES" },
  { id: "FUTURES", label: "FUTURES" },
  { id: "OPTIONS", label: "OPTIONS" },
  { id: "FOREX", label: "FOREX" },
  { id: "COMMODITIES", label: "COMMODITIES" },
  { id: "CRYPTO", label: "CRYPTO" },
  { id: "BONDS", label: "BONDS" },
  { id: "GLOBAL", label: "GLOBAL" },
];

export function MarketCategoryFilterPills({
  activeCategory,
  onSelectCategory,
  categoryCounts,
  watchlistCount,
  onOpenColumnSettings,
}: CategoryFilterPillsProps) {
  return (
    <div className="w-full flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
      <div className="flex items-center gap-1.5 flex-nowrap">
        {PILLS.map((pill) => {
          const isSelected = activeCategory === pill.id;
          const count = pill.isWatchlist
            ? watchlistCount
            : categoryCounts[pill.id] ?? (pill.id === "ALL" ? categoryCounts["total"] ?? 5718 : 0);

          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onSelectCategory(pill.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-all duration-150 border shrink-0 cursor-pointer",
                isSelected
                  ? "bg-[#09182B] border-[#00C9E8] text-[#00C9E8] font-bold shadow-sm shadow-[#00C9E8]/10"
                  : "bg-[#071426] border-[#15304A] text-[#91A7C1] hover:text-[#EAF3FF] hover:border-[#1F4264]"
              )}
            >
              {pill.isWatchlist && <Star className={cn("h-3 w-3", isSelected ? "text-[#F5B942] fill-[#F5B942]" : "text-[#91A7C1]")} />}
              <span>{pill.label}</span>
              <span
                className={cn(
                  "text-[9px] font-mono px-1.5 py-0.2 rounded-full",
                  isSelected ? "bg-[#00C9E8]/20 text-[#00C9E8]" : "bg-[#09182B] text-[#91A7C1]"
                )}
              >
                {Number(count || 0).toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>

      {onOpenColumnSettings && (
        <button
          type="button"
          onClick={onOpenColumnSettings}
          className="p-1.5 rounded border border-[#15304A] bg-[#071426] hover:bg-[#09182B] text-[#91A7C1] hover:text-[#00C9E8] transition-colors shrink-0"
          title="Table Column Settings"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

