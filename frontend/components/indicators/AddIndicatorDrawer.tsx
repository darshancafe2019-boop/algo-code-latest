"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Search, Star, Plus, Check, BookOpen, Layers, Settings2, Trash2 } from "lucide-react";
import { indicatorRegistry } from "@/lib/indicators/registry";
import { IndicatorCategory, IndicatorDefinition } from "@/lib/indicators/types";

interface AddIndicatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicatorIds?: string[];
  onAddIndicator: (indicatorId: string) => void;
  onRemoveIndicator?: (indicatorId: string) => void;
  onConfigureIndicator?: (indicator: IndicatorDefinition<any>) => void;
  isSaving?: boolean;
}

const CATEGORIES: { key: IndicatorCategory | "ALL" | "FAVORITES" | "ACTIVE"; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "FAVORITES", label: "★ FAVORITES" },
  { key: "ACTIVE", label: "ACTIVE" },
  { key: "TREND", label: "TREND" },
  { key: "MOMENTUM", label: "MOMENTUM" },
  { key: "STRENGTH", label: "STRENGTH" },
  { key: "VOLATILITY", label: "VOLATILITY" },
  { key: "VOLUME", label: "VOLUME" },
  { key: "STRUCTURE", label: "STRUCTURE" },
  { key: "OPTIONS", label: "OPTIONS" },
];

const DEFAULT_FAVORITES = ["ema", "sma", "supertrend", "macd", "adx", "rsi", "vwap", "bollinger", "volume"];

export function AddIndicatorDrawer({
  isOpen,
  onClose,
  activeIndicatorIds = [],
  onAddIndicator,
  onRemoveIndicator,
  onConfigureIndicator,
  isSaving,
}: AddIndicatorDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IndicatorCategory | "ALL" | "FAVORITES" | "ACTIVE">("ALL");
  const [favorites, setFavorites] = useState<Set<string>>(new Set(DEFAULT_FAVORITES));

  // Load registered indicators from central registry
  const allRegistered = useMemo(() => indicatorRegistry.getAll(), []);

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

  const activeSet = useMemo(() => new Set(activeIndicatorIds), [activeIndicatorIds]);

  const filteredList = useMemo(() => {
    return allRegistered.filter((ind) => {
      const id = ind.id;

      // Tab filtering
      if (selectedCategory === "FAVORITES") {
        if (!favorites.has(id)) return false;
      } else if (selectedCategory === "ACTIVE") {
        if (!activeSet.has(id)) return false;
      } else if (selectedCategory !== "ALL") {
        if (ind.category !== selectedCategory) return false;
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ind.name?.toLowerCase().includes(q);
        const matchShort = ind.shortName?.toLowerCase().includes(q);
        const matchId = id.toLowerCase().includes(q);
        const matchCat = ind.category?.toLowerCase().includes(q);
        const matchDesc = ind.description?.toLowerCase().includes(q);
        if (!matchName && !matchShort && !matchId && !matchCat && !matchDesc) return false;
      }

      return true;
    });
  }, [allRegistered, selectedCategory, searchQuery, favorites, activeSet]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-[#0B111E] border-l border-[#1A2A3F] w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#1A2A3F] space-y-3 bg-[#080D17]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight font-sans">
                    INDICATORS
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    {allRegistered.length} Available
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Universal quantitative indicators for live charts and strategy confluence
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
              placeholder="Search indicators by name, formula, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141E33] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              autoFocus
            />
          </div>

          {/* Category Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg whitespace-nowrap transition-all flex items-center gap-1 ${
                  selectedCategory === cat.key
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/50"
                    : "bg-[#141E33] text-slate-400 hover:text-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indicator Cards List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-[#080D17]">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-mono text-slate-400">No indicators match your filter.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
                className="text-xs text-cyan-400 font-mono hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredList.map((ind) => {
              const isFav = favorites.has(ind.id);
              const isActive = activeSet.has(ind.id);

              return (
                <div
                  key={ind.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    isActive
                      ? "bg-[#0E1729] border-cyan-500/40 shadow-lg shadow-cyan-950/20"
                      : "bg-[#0F1626] border-[#1A2A3F] hover:border-slate-700"
                  }`}
                >
                  {/* Left: Star + Name + Description */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={(e) => toggleFavorite(ind.id, e)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isFav ? "text-amber-400 hover:text-amber-300" : "text-slate-600 hover:text-slate-400"
                      }`}
                      title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Star className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white font-mono tracking-tight truncate">
                          {ind.shortName || ind.name}
                        </h3>
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[#141E33] text-cyan-400 border border-slate-700">
                          {ind.category}
                        </span>
                        {ind.overlay && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800">
                            OVERLAY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {ind.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2">
                    {onConfigureIndicator && (
                      <button
                        onClick={() => onConfigureIndicator(ind)}
                        className="p-2 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                        title="Configure Parameters"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isActive ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold text-xs flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          ADDED
                        </span>
                        {onRemoveIndicator && (
                          <button
                            onClick={() => onRemoveIndicator(ind.id)}
                            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-800 transition-all"
                            title="Remove Indicator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => onAddIndicator(ind.id)}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-md shadow-cyan-950/50 transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A2A3F] bg-[#080D17] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>{filteredList.length} indicators shown</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-white font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
