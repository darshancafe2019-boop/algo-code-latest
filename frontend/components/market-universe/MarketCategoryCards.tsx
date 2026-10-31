"use client";

import React from "react";
import {
  Layers,
  TrendingUp,
  BarChart2,
  Zap,
  Disc,
  DollarSign,
  Flame,
  Bitcoin,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MarketCategory =
  | "ALL"
  | "STOCKS"
  | "INDICES"
  | "FUTURES"
  | "OPTIONS"
  | "FOREX"
  | "COMMODITIES"
  | "CRYPTO"
  | "BONDS"
  | "WATCHLIST"
  | "GLOBAL";

interface CategoryMeta {
  id: MarketCategory;
  label: string;
  icon: React.ElementType;
  exchange: string;
  iconColor: string;
  bgGlow: string;
}

const CATEGORIES: CategoryMeta[] = [
  { id: "ALL", label: "ALL INSTRUMENTS", icon: Layers, exchange: "Multi-Asset Engine", iconColor: "text-[#00C9E8]", bgGlow: "bg-[#00C9E8]/10" },
  { id: "STOCKS", label: "STOCKS", icon: TrendingUp, exchange: "NSE / BSE Cash", iconColor: "text-[#00D6A0]", bgGlow: "bg-[#00D6A0]/10" },
  { id: "INDICES", label: "INDICES", icon: BarChart2, exchange: "Benchmark Baskets", iconColor: "text-[#0878FF]", bgGlow: "bg-[#0878FF]/10" },
  { id: "FUTURES", label: "FUTURES", icon: Zap, exchange: "Index & Crypto Perps", iconColor: "text-[#F5B942]", bgGlow: "bg-[#F5B942]/10" },
  { id: "OPTIONS", label: "OPTIONS", icon: Disc, exchange: "NSE & Delta Derivatives", iconColor: "text-[#A855F7]", bgGlow: "bg-[#A855F7]/10" },
  { id: "FOREX", label: "FOREX", icon: DollarSign, exchange: "OANDA G10 Pairs", iconColor: "text-[#00D6A0]", bgGlow: "bg-[#00D6A0]/10" },
  { id: "COMMODITIES", label: "COMMODITIES", icon: Flame, exchange: "MCX Metals & Energy", iconColor: "text-[#FF5268]", bgGlow: "bg-[#FF5268]/10" },
  { id: "CRYPTO", label: "CRYPTO", icon: Bitcoin, exchange: "Binance Spot & Perps", iconColor: "text-[#F5B942]", bgGlow: "bg-[#F5B942]/10" },
  { id: "BONDS", label: "BONDS", icon: Landmark, exchange: "Sovereign & Yield", iconColor: "text-[#91A7C1]", bgGlow: "bg-[#91A7C1]/10" },
];

interface MarketCategoryCardsProps {
  activeCategory: MarketCategory;
  onSelectCategory: (category: MarketCategory) => void;
  categoryCounts: Record<string, number>;
}

export function MarketCategoryCards({
  activeCategory,
  onSelectCategory,
  categoryCounts,
}: MarketCategoryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
      {CATEGORIES.map((cat) => {
        const isSelected = activeCategory === cat.id;
        const Icon = cat.icon;
        const count = categoryCounts[cat.id] ?? (cat.id === "ALL" ? categoryCounts["total"] ?? 5718 : 0);

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              "p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer group",
              isSelected
                ? "bg-[#071426] border-[#00C9E8] shadow-md shadow-[#00C9E8]/10 ring-1 ring-[#00C9E8]/40"
                : "bg-[#071426] border-[#15304A] hover:border-[#1F4264] hover:bg-[#09182B]"
            )}
          >
            {/* Top row: Icon & Count */}
            <div className="flex items-center justify-between w-full mb-1">
              <div className={cn("p-1.5 rounded-md", cat.bgGlow, cat.iconColor)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={cn(
                "text-[12px] font-mono font-bold tabular-nums",
                isSelected ? "text-[#00C9E8]" : "text-[#EAF3FF]"
              )}>
                {Number(count || 0).toLocaleString()}
              </span>
            </div>

            {/* Bottom info: Title & Exchange */}
            <div className="mt-0.5">
              <div className={cn(
                "text-[10px] font-bold uppercase tracking-wider truncate",
                isSelected ? "text-[#EAF3FF]" : "text-[#91A7C1] group-hover:text-[#EAF3FF]"
              )}>
                {cat.label}
              </div>
              <div className="text-[9px] text-[#91A7C1]/60 truncate font-mono mt-0.2">
                {cat.exchange}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

