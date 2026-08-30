"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bookmark, ChevronDown, Check, Zap } from "lucide-react";
import { useStocksStore } from "../state/stocks-store";

interface ScreenPreset {
  id: string;
  name: string;
  description: string;
  filters: any;
}

const PRESETS: ScreenPreset[] = [
  {
    id: "gainers",
    name: "Top Gainers",
    description: "Stocks with largest positive 24h returns",
    filters: { price_direction: "GAINERS", sort_by: "change_pct", sort_direction: "desc" },
  },
  {
    id: "losers",
    name: "Top Losers",
    description: "Stocks with largest negative 24h returns",
    filters: { price_direction: "LOSERS", sort_by: "change_pct", sort_direction: "asc" },
  },
  {
    id: "most_active",
    name: "Most Active Volume",
    description: "Equities with highest trading volume",
    filters: { sort_by: "volume_shares", sort_direction: "desc" },
  },
  {
    id: "unusual_volume",
    name: "Unusual Volume (1.2x+)",
    description: "Volume surging well above 30D average",
    filters: { min_relative_volume: 1.2, sort_by: "relative_volume", sort_direction: "desc" },
  },
  {
    id: "breakouts",
    name: "Technical Breakouts",
    description: "Bullish momentum breaking 20-period highs",
    filters: { directional_bias: "BULLISH", min_score: 60, sort_by: "overall_score", sort_direction: "desc" },
  },
];

export const SavedScreens: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { setFilters, activePreset, setActivePreset } = useStocksStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPreset = (preset: ScreenPreset) => {
    setActivePreset(preset.id);
    setFilters({ ...preset.filters, page: 1 });
    setIsOpen(false);
  };

  const currentLabel = PRESETS.find((p) => p.id === activePreset)?.name || "Saved Screens";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition ${
          activePreset
            ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
            : "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
        }`}
      >
        <Bookmark className="w-3.5 h-3.5 text-purple-400" />
        <span className="hidden sm:inline">{currentLabel}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Standard Screener Presets
          </div>
          {PRESETS.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`w-full text-left p-2 rounded-xl transition flex items-start justify-between gap-2 ${
                  isSelected
                    ? "bg-purple-500/15 border border-purple-500/30 text-purple-300"
                    : "hover:bg-slate-800/80 text-slate-300"
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-purple-400" />
                    <span>{p.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{p.description}</p>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
