"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Search,
  Filter,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedFilterState {
  searchQuery: string;
  selectedExchanges: string[];
  selectedTypes: string[];
  minPrice: string;
  maxPrice: string;
  minChangePct: string;
  maxChangePct: string;
  minVolume: string;
  maxVolume: string;
  liveOnly: boolean;
  tradableOnly: boolean;
}

export const INITIAL_ADVANCED_FILTERS: AdvancedFilterState = {
  searchQuery: "",
  selectedExchanges: [],
  selectedTypes: [],
  minPrice: "",
  maxPrice: "",
  minChangePct: "",
  maxChangePct: "",
  minVolume: "",
  maxVolume: "",
  liveOnly: false,
  tradableOnly: false,
};

interface MarketAdvancedFiltersPanelProps {
  filters: AdvancedFilterState;
  onFilterChange: (filters: AdvancedFilterState) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  exchangeCounts?: Record<string, number>;
  typeCounts?: Record<string, number>;
}

const EXCHANGES = [
  { id: "NSE", label: "NSE" },
  { id: "BSE", label: "BSE" },
  { id: "MCX", label: "MCX" },
  { id: "BINANCE", label: "BINANCE" },
  { id: "DELTA", label: "DELTA" },
  { id: "OANDA", label: "OANDA" },
  { id: "GLOBAL", label: "GLOBAL" },
];

const INSTRUMENT_TYPES = [
  { id: "Stocks", label: "Stocks" },
  { id: "Indices", label: "Indices" },
  { id: "Futures", label: "Futures" },
  { id: "Options", label: "Options" },
  { id: "Forex", label: "Forex" },
  { id: "Commodities", label: "Commodities" },
  { id: "Crypto", label: "Crypto" },
  { id: "Bonds", label: "Bonds" },
];

export function MarketAdvancedFiltersPanel({
  filters,
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  exchangeCounts = {},
  typeCounts = {},
}: MarketAdvancedFiltersPanelProps) {
  const [exchangeExpanded, setExchangeExpanded] = useState(true);
  const [typeExpanded, setTypeExpanded] = useState(true);
  const [priceExpanded, setPriceExpanded] = useState(true);
  const [changeExpanded, setChangeExpanded] = useState(false);
  const [volumeExpanded, setVolumeExpanded] = useState(false);

  const toggleExchange = (ex: string) => {
    const next = filters.selectedExchanges.includes(ex)
      ? filters.selectedExchanges.filter((e) => e !== ex)
      : [...filters.selectedExchanges, ex];
    onFilterChange({ ...filters, selectedExchanges: next });
  };

  const toggleType = (t: string) => {
    const next = filters.selectedTypes.includes(t)
      ? filters.selectedTypes.filter((item) => item !== t)
      : [...filters.selectedTypes, t];
    onFilterChange({ ...filters, selectedTypes: next });
  };

  return (
    <div className="w-full bg-[#071426] border border-[#15304A] rounded-lg p-3 flex flex-col justify-between select-none shadow-md space-y-3">
      {/* ── Top: Title & Clear All ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-[#15304A]">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-[#00C9E8]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#EAF3FF]">FILTERS</span>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-[10px] font-mono text-[#F5B942] hover:text-white flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          <span>CLEAR ALL</span>
        </button>
      </div>

      {/* ── Quick Filter Search ───────────────────────────────────────────── */}
      <div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#91A7C1]" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Search symbol or name..."
            className="w-full pl-7 pr-2 py-1 text-[10px] bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] placeholder-[#91A7C1]/50 focus:outline-none focus:border-[#00C9E8] transition-colors font-sans"
          />
        </div>
      </div>

      {/* ── Filter Sections Accordion ──────────────────────────────────────── */}
      <div className="space-y-2.5 overflow-y-auto max-h-[520px] pr-0.5 custom-scrollbar">
        {/* 1. Exchanges */}
        <div className="border border-[#15304A] rounded-md bg-[#09182B]/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setExchangeExpanded(!exchangeExpanded)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-wider text-[#EAF3FF] hover:bg-[#0E223D] transition-colors"
          >
            <span>Exchange</span>
            <ChevronDown className={cn("h-3 w-3 text-[#91A7C1] transition-transform", !exchangeExpanded && "-rotate-90")} />
          </button>

          {exchangeExpanded && (
            <div className="px-2.5 pb-2 pt-1 space-y-1 border-t border-[#15304A]/60">
              {EXCHANGES.map((ex) => {
                const checked = filters.selectedExchanges.includes(ex.id);
                const count = exchangeCounts[ex.id] ?? (ex.id === "NSE" ? 3780 : ex.id === "BSE" ? 1833 : ex.id === "BINANCE" ? 25 : 13);
                return (
                  <label
                    key={ex.id}
                    onClick={() => toggleExchange(ex.id)}
                    className="flex items-center justify-between text-[10px] text-[#91A7C1] hover:text-[#EAF3FF] cursor-pointer py-0.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="rounded border-[#15304A] bg-[#030B16] text-[#00C9E8] focus:ring-0 h-3 w-3"
                      />
                      <span>{ex.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-[#91A7C1]/60">({Number(count || 0).toLocaleString()})</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Instrument Type */}
        <div className="border border-[#15304A] rounded-md bg-[#09182B]/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setTypeExpanded(!typeExpanded)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-wider text-[#EAF3FF] hover:bg-[#0E223D] transition-colors"
          >
            <span>Instrument Type</span>
            <ChevronDown className={cn("h-3 w-3 text-[#91A7C1] transition-transform", !typeExpanded && "-rotate-90")} />
          </button>

          {typeExpanded && (
            <div className="px-2.5 pb-2 pt-1 space-y-1 border-t border-[#15304A]/60">
              {INSTRUMENT_TYPES.map((t) => {
                const checked = filters.selectedTypes.includes(t.id);
                const count = typeCounts[t.id] ?? (t.id === "Stocks" ? 5309 : t.id === "Futures" ? 243 : t.id === "Options" ? 64 : 25);
                return (
                  <label
                    key={t.id}
                    onClick={() => toggleType(t.id)}
                    className="flex items-center justify-between text-[10px] text-[#91A7C1] hover:text-[#EAF3FF] cursor-pointer py-0.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="rounded border-[#15304A] bg-[#030B16] text-[#00C9E8] focus:ring-0 h-3 w-3"
                      />
                      <span>{t.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-[#91A7C1]/60">({Number(count || 0).toLocaleString()})</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Price Range (LTP) */}
        <div className="border border-[#15304A] rounded-md bg-[#09182B]/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setPriceExpanded(!priceExpanded)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-wider text-[#EAF3FF] hover:bg-[#0E223D] transition-colors"
          >
            <span>Price Range (LTP)</span>
            <ChevronDown className={cn("h-3 w-3 text-[#91A7C1] transition-transform", !priceExpanded && "-rotate-90")} />
          </button>

          {priceExpanded && (
            <div className="p-2.5 space-y-2 border-t border-[#15304A]/60">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[9px] text-[#91A7C1] block mb-0.5">Min (₹/$)</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={filters.minPrice}
                    onChange={(e) => onFilterChange({ ...filters, minPrice: e.target.value })}
                    className="w-full px-2 py-1 text-[10px] font-mono bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-[#91A7C1] block mb-0.5">Max (₹/$)</span>
                  <input
                    type="number"
                    placeholder="100000"
                    value={filters.maxPrice}
                    onChange={(e) => onFilterChange({ ...filters, maxPrice: e.target.value })}
                    className="w-full px-2 py-1 text-[10px] font-mono bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Change % */}
        <div className="border border-[#15304A] rounded-md bg-[#09182B]/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setChangeExpanded(!changeExpanded)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-wider text-[#EAF3FF] hover:bg-[#0E223D] transition-colors"
          >
            <span>Change %</span>
            <ChevronDown className={cn("h-3 w-3 text-[#91A7C1] transition-transform", !changeExpanded && "-rotate-90")} />
          </button>

          {changeExpanded && (
            <div className="p-2.5 space-y-2 border-t border-[#15304A]/60">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[9px] text-[#91A7C1] block mb-0.5">Min %</span>
                  <input
                    type="number"
                    placeholder="-10"
                    value={filters.minChangePct}
                    onChange={(e) => onFilterChange({ ...filters, minChangePct: e.target.value })}
                    className="w-full px-2 py-1 text-[10px] font-mono bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-[#91A7C1] block mb-0.5">Max %</span>
                  <input
                    type="number"
                    placeholder="+10"
                    value={filters.maxChangePct}
                    onChange={(e) => onFilterChange({ ...filters, maxChangePct: e.target.value })}
                    className="w-full px-2 py-1 text-[10px] font-mono bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Volume */}
        <div className="border border-[#15304A] rounded-md bg-[#09182B]/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setVolumeExpanded(!volumeExpanded)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between text-left text-[10px] font-bold uppercase tracking-wider text-[#EAF3FF] hover:bg-[#0E223D] transition-colors"
          >
            <span>Volume</span>
            <ChevronDown className={cn("h-3 w-3 text-[#91A7C1] transition-transform", !volumeExpanded && "-rotate-90")} />
          </button>

          {volumeExpanded && (
            <div className="p-2.5 space-y-2 border-t border-[#15304A]/60">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[9px] text-[#91A7C1] block mb-0.5">Min Vol</span>
                  <input
                    type="number"
                    placeholder="1000"
                    value={filters.minVolume}
                    onChange={(e) => onFilterChange({ ...filters, minVolume: e.target.value })}
                    className="w-full px-2 py-1 text-[10px] font-mono bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-[#91A7C1] block mb-0.5">Max Vol</span>
                  <input
                    type="number"
                    placeholder="Any"
                    value={filters.maxVolume}
                    onChange={(e) => onFilterChange({ ...filters, maxVolume: e.target.value })}
                    className="w-full px-2 py-1 text-[10px] font-mono bg-[#030B16] border border-[#15304A] rounded text-[#EAF3FF] focus:outline-none focus:border-[#00C9E8]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Button: Apply Filters ──────────────────────────────────── */}
      <div className="pt-2 border-t border-[#15304A]">
        <button
          type="button"
          onClick={onApplyFilters}
          className="w-full py-1.5 rounded bg-[#00C9E8] hover:bg-[#00B4D0] text-[#030B16] font-bold text-[11px] tracking-wide uppercase transition-colors shadow-sm"
        >
          APPLY FILTERS
        </button>
      </div>
    </div>
  );
}

