"use client";

import React, { useState } from "react";
import { X, Filter, RotateCcw, Check } from "lucide-react";

export interface MarketFilterState {
  exchange: string;
  minPrice: string;
  maxPrice: string;
  minVolume: string;
  status: string;
}

interface MarketFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: MarketFilterState;
  onApplyFilters: (filters: MarketFilterState) => void;
  onResetFilters: () => void;
}

export function MarketFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
}: MarketFilterDrawerProps) {
  const [localFilters, setLocalFilters] = useState<MarketFilterState>(filters);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const empty: MarketFilterState = {
      exchange: "ALL",
      minPrice: "",
      maxPrice: "",
      minVolume: "",
      status: "ALL",
    };
    setLocalFilters(empty);
    onResetFilters();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-[#0B111E] border-l border-[#1E293B] w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200 font-sans">
        {/* Header */}
        <div className="p-5 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Market Filters</h2>
              <p className="text-xs text-slate-400">Refine instruments by exchange, price, and volume</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs font-sans">
          {/* Exchange */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-300 uppercase">Exchange / Venue</label>
            <select
              value={localFilters.exchange}
              onChange={(e) => setLocalFilters({ ...localFilters, exchange: e.target.value })}
              className="w-full bg-[#141E33] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Exchanges (Global)</option>
              <option value="BINANCE">Binance (Crypto)</option>
              <option value="NSE">NSE (India Equities & F&O)</option>
              <option value="BSE">BSE (India)</option>
              <option value="NYSE">NYSE / NASDAQ (US)</option>
              <option value="OANDA">OANDA (Forex & Commodities)</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-300 uppercase">Price Range ($ / ₹)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min Price"
                value={localFilters.minPrice}
                onChange={(e) => setLocalFilters({ ...localFilters, minPrice: e.target.value })}
                className="w-full bg-[#141E33] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={localFilters.maxPrice}
                onChange={(e) => setLocalFilters({ ...localFilters, maxPrice: e.target.value })}
                className="w-full bg-[#141E33] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Minimum Volume */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-300 uppercase">Minimum 24H Volume</label>
            <select
              value={localFilters.minVolume}
              onChange={(e) => setLocalFilters({ ...localFilters, minVolume: e.target.value })}
              className="w-full bg-[#141E33] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500"
            >
              <option value="">Any Volume</option>
              <option value="1000000">&gt; $1M / ₹10L</option>
              <option value="10000000">&gt; $10M / ₹1Cr</option>
              <option value="100000000">&gt; $100M / ₹10Cr</option>
              <option value="1000000000">&gt; $1B (High Liquidity)</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-300 uppercase">Data Quality / Feed</label>
            <select
              value={localFilters.status}
              onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
              className="w-full bg-[#141E33] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Feeds</option>
              <option value="LIVE">Live & Verified Only</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#080D17] flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
}
