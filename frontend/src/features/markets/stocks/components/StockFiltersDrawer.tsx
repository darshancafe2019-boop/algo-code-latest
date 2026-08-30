"use client";

import React, { useState } from "react";
import { X, RotateCcw, ChevronDown, ChevronUp, Check, Filter } from "lucide-react";
import { useStocksStore } from "../state/stocks-store";
import { StockFilterState } from "../types/stocks";

interface StockFiltersDrawerProps {
  totalMatching: number;
}

export const StockFiltersDrawer: React.FC<StockFiltersDrawerProps> = ({ totalMatching }) => {
  const { filters, setFilters, resetFilters, isFilterDrawerOpen, setFilterDrawerOpen } = useStocksStore();

  // Local draft state
  const [draft, setDraft] = useState<StockFilterState>({ ...filters });

  // Collapsible section toggles
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    identity: true,
    price: true,
    liquidity: true,
    technicals: false,
    fundamentals: false,
    analysis: false,
  });

  const toggleSection = (s: string) => {
    setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));
  };

  const handleApply = () => {
    setFilters({ ...draft, page: 1 });
    setFilterDrawerOpen(false);
  };

  const handleReset = () => {
    resetFilters();
    setDraft({ ...filters });
  };

  if (!isFilterDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:w-[420px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col h-full font-mono text-xs select-none">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white text-sm">Stock Screener Filters</span>
          </div>
          <button
            onClick={() => setFilterDrawerOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Filter Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Section 1: Classification */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <button
              onClick={() => toggleSection("identity")}
              className="w-full flex items-center justify-between font-bold text-white uppercase text-[11px]"
            >
              <span>Exchange &amp; Region</span>
              {openSections.identity ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {openSections.identity && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Exchange</label>
                  <select
                    value={draft.exchange || "ALL"}
                    onChange={(e) => setDraft({ ...draft, exchange: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">All Exchanges (NSE, BSE, NASDAQ, NYSE)</option>
                    <option value="NSE">NSE (National Stock Exchange)</option>
                    <option value="BSE">BSE (Bombay Stock Exchange)</option>
                    <option value="NASDAQ">NASDAQ (US Equities)</option>
                    <option value="NYSE">NYSE (New York Stock Exchange)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Sector</label>
                  <select
                    value={draft.sector || "ALL"}
                    onChange={(e) => setDraft({ ...draft, sector: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">All Sectors</option>
                    <option value="Technology">Technology &amp; Software</option>
                    <option value="Financial Services">Financial Services &amp; Banks</option>
                    <option value="Energy & Conglomerate">Energy &amp; Conglomerate</option>
                    <option value="Consumer Goods">Consumer Goods &amp; FMCG</option>
                    <option value="Automobile">Automobile &amp; EV</option>
                    <option value="Healthcare">Healthcare &amp; Pharma</option>
                    <option value="Utilities">Utilities &amp; Power</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Price & Returns */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <button
              onClick={() => toggleSection("price")}
              className="w-full flex items-center justify-between font-bold text-white uppercase text-[11px]"
            >
              <span>Price &amp; Returns</span>
              {openSections.price ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {openSections.price && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Direction</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "All", val: undefined },
                      { label: "Gainers", val: "GAINERS" },
                      { label: "Losers", val: "LOSERS" },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setDraft({ ...draft, price_direction: btn.val as any })}
                        className={`py-1.5 rounded-lg border text-[11px] font-bold transition ${
                          draft.price_direction === btn.val
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Min Return %</label>
                    <input
                      type="number"
                      value={draft.min_change_pct ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          min_change_pct: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g. 1.5"
                      className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Max Return %</label>
                    <input
                      type="number"
                      value={draft.max_change_pct ?? ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          max_change_pct: e.target.value ? parseFloat(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g. 10.0"
                      className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Liquidity & Relative Volume */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <button
              onClick={() => toggleSection("liquidity")}
              className="w-full flex items-center justify-between font-bold text-white uppercase text-[11px]"
            >
              <span>Liquidity &amp; Volume</span>
              {openSections.liquidity ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {openSections.liquidity && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Min Relative Volume</label>
                  <select
                    value={draft.min_relative_volume ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        min_relative_volume: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Any Volume</option>
                    <option value="1.0">&gt; 1.0x (Above Average)</option>
                    <option value="1.5">&gt; 1.5x (High Participation)</option>
                    <option value="2.0">&gt; 2.0x (Unusual Surge)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Quantitative Bias */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
            <button
              onClick={() => toggleSection("analysis")}
              className="w-full flex items-center justify-between font-bold text-white uppercase text-[11px]"
            >
              <span>Quantitative Direction &amp; Score</span>
              {openSections.analysis ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {openSections.analysis && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Directional Bias</label>
                  <select
                    value={draft.directional_bias || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, directional_bias: e.target.value || undefined })
                    }
                    className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Any Trend</option>
                    <option value="STRONG_BULLISH">Strong Bullish</option>
                    <option value="BULLISH">Bullish</option>
                    <option value="NEUTRAL">Neutral / Consolidation</option>
                    <option value="BEARISH">Bearish</option>
                    <option value="STRONG_BEARISH">Strong Bearish</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleReset}
            className="px-3.5 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleApply}
            className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Check className="w-4 h-4" />
            <span>Apply Filters ({totalMatching} Matches)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
