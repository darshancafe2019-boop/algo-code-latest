"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Search, Star, Plus, Check, BookOpen, Layers } from "lucide-react";
import { IndicatorConfigItem, IndicatorCategory } from "@/types/indicator";

interface AddIndicatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  allIndicators: IndicatorConfigItem[];
  onAddIndicator: (indicatorId: string) => void;
  isSaving?: boolean;
}

const CATEGORIES: { key: IndicatorCategory; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "TREND", label: "TREND" },
  { key: "MOMENTUM", label: "MOMENTUM" },
  { key: "VOLATILITY", label: "VOLATILITY" },
  { key: "VOLUME", label: "VOLUME" },
  { key: "PRICE_ACTION", label: "PRICE ACTION" },
  { key: "MARKET_STRUCTURE", label: "STRUCTURE" },
];

const DEFAULT_FAVORITES = ["ema_20", "ema_50", "rsi", "macd", "vwap", "supertrend", "bollinger", "volume"];

export function AddIndicatorDrawer({
  isOpen,
  onClose,
  allIndicators,
  onAddIndicator,
  isSaving,
}: AddIndicatorDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IndicatorCategory | "FAVORITES">("ALL");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(DEFAULT_FAVORITES));

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("quantos_indicator_favorites");
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch {
      // Fallback
    }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem("quantos_indicator_favorites", JSON.stringify(Array.from(next)));
      } catch {
        // Safe fallback
      }
      return next;
    });
  };

  const filteredList = useMemo(() => {
    return allIndicators.filter((ind) => {
      const id = ind.indicator_id || ind.id;

      // 1. Favorites tab
      if (selectedCategory === "FAVORITES") {
        if (!favorites.has(id)) return false;
      } else if (selectedCategory !== "ALL") {
        const cat = (ind.category || "").toUpperCase();
        if (selectedCategory === "PRICE_ACTION" && !cat.includes("PRICE") && !cat.includes("ACTION")) return false;
        if (selectedCategory === "MARKET_STRUCTURE" && !cat.includes("STRUCTURE")) return false;
        if (selectedCategory !== "PRICE_ACTION" && selectedCategory !== "MARKET_STRUCTURE" && cat !== selectedCategory) {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ind.name?.toLowerCase().includes(q);
        const matchId = id.toLowerCase().includes(q);
        const matchCat = ind.category?.toLowerCase().includes(q);
        const matchDesc = ind.description?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCat && !matchDesc) return false;
      }

      return true;
    });
  }, [allIndicators, selectedCategory, searchQuery, favorites]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-[#0B111E] border-l border-[#1E293B] w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#1E293B] space-y-3 bg-[#080D17]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight font-sans">
                  Add Indicator
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  Select quantitative model to add to active confluence strategy
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, category, formula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141E33] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>

          {/* Category Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-850 pt-2.5">
            <button
              onClick={() => setSelectedCategory("FAVORITES")}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedCategory === "FAVORITES"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40"
                  : "bg-[#141E33] text-slate-400 hover:text-slate-200"
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>FAVORITES</span>
            </button>

            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/40"
                      : "bg-[#141E33] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Indicator Rows List */}
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          {filteredList.length > 0 ? (
            <div className="space-y-2">
              {filteredList.map((ind) => {
                const id = ind.indicator_id || ind.id;
                const isFav = favorites.has(id);
                const isAlreadyActive = ind.enabled;

                return (
                  <div
                    key={id}
                    className="p-3 rounded-xl bg-[#141E33]/80 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
                  >
                    {/* Left: Star + Name & Description */}
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={(e) => toggleFavorite(id, e)}
                        className={`p-1 mt-0.5 rounded transition-colors ${
                          isFav
                            ? "text-amber-400 hover:text-amber-300"
                            : "text-slate-600 hover:text-slate-400"
                        }`}
                        title={isFav ? "Remove favorite" : "Star favorite"}
                      >
                        <Star className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-white text-xs font-sans truncate">
                            {ind.name || id}
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                            {ind.category}
                          </span>
                        </div>
                        {ind.description && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5 font-sans">
                            {ind.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Add Action */}
                    <button
                      onClick={() => {
                        onAddIndicator(id);
                        onClose();
                      }}
                      disabled={isAlreadyActive || isSaving}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg font-sans transition-all flex items-center gap-1 shrink-0 ${
                        isAlreadyActive
                          ? "bg-slate-800 text-slate-500 cursor-default"
                          : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 active:scale-95"
                      }`}
                    >
                      {isAlreadyActive ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 font-sans text-xs space-y-2">
              <div>No indicators found matching &quot;{searchQuery}&quot;.</div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
                className="text-cyan-400 underline font-bold"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#080D17] flex items-center justify-between text-xs text-slate-400 font-sans">
          <span>{filteredList.length} indicators available</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
