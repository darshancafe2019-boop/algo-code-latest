"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  ChevronDown,
  Star,
  Plus,
  Check,
  Search,
  Sparkles,
  Layers,
  Zap,
} from "lucide-react";
import {
  CanonicalTimeframe,
  ALL_CANONICAL_TIMEFRAMES,
  DEFAULT_TOOLBAR_PRESETS,
} from "@/lib/timeframeConstants";

interface TradingViewTimeframeSelectorProps {
  activeTimeframe: string;
  onSelectTimeframe: (tf: string) => void;
  provider?: string;
  symbol?: string;
}

export const TradingViewTimeframeSelector: React.FC<TradingViewTimeframeSelectorProps> = ({
  activeTimeframe,
  onSelectTimeframe,
  provider = "ccxt_binance",
  symbol = "BTC/USDT",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customValue, setCustomValue] = useState("7");
  const [customUnit, setCustomUnit] = useState<"m" | "h" | "d" | "s">("m");
  const [capabilities, setCapabilities] = useState<Record<string, any>>({});
  const [pinnedPresets, setPinnedPresets] = useState<string[]>(DEFAULT_TOOLBAR_PRESETS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load pinned favorites from localStorage
  useEffect(() => {
    try {
      const savedPins = localStorage.getItem("pinned_timeframes");
      if (savedPins) {
        const parsed = JSON.parse(savedPins);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPinnedPresets(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch capabilities from backend
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/timeframes/capabilities?provider=${provider}&symbol=${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.capabilities) {
          const capMap: Record<string, any> = {};
          data.capabilities.forEach((c: any) => {
            capMap[c.timeframe] = c;
          });
          setCapabilities(capMap);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [provider, symbol]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const togglePin = (e: React.MouseEvent, tfValue: string) => {
    e.stopPropagation();
    let newPins: string[];
    if (pinnedPresets.includes(tfValue)) {
      newPins = pinnedPresets.filter((p) => p !== tfValue);
    } else {
      newPins = [...pinnedPresets, tfValue];
    }
    setPinnedPresets(newPins);
    try {
      localStorage.setItem("pinned_timeframes", JSON.stringify(newPins));
    } catch {
      // Ignore
    }
  };

  const handleAddCustom = () => {
    const num = parseInt(customValue, 10);
    if (!num || num <= 0) return;
    const customTf = `${num}${customUnit}`;
    onSelectTimeframe(customTf);
    if (!pinnedPresets.includes(customTf)) {
      const newPins = [...pinnedPresets, customTf];
      setPinnedPresets(newPins);
      try {
        localStorage.setItem("pinned_timeframes", JSON.stringify(newPins));
      } catch {}
    }
    setIsOpen(false);
  };

  const filteredTimeframes = ALL_CANONICAL_TIMEFRAMES.filter((tf) => {
    if (activeCategory !== "all" && tf.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        tf.value.toLowerCase().includes(q) ||
        tf.label.toLowerCase().includes(q) ||
        tf.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const categories = [
    { id: "all", label: "All" },
    { id: "second", label: "Seconds" },
    { id: "minute", label: "Minutes" },
    { id: "hour", label: "Hours" },
    { id: "day", label: "Days" },
    { id: "week", label: "Weeks" },
    { id: "month", label: "Months" },
  ];

  return (
    <div className="relative inline-flex items-center gap-1 bg-[#121927] p-1 rounded-xl border border-[#1E293B] shadow-inner select-none" ref={dropdownRef}>
      {/* Primary Toolbar Pinned Timeframes */}
      <div className="flex items-center gap-0.5 overflow-x-auto max-w-[420px] scrollbar-none py-0.5 px-0.5">
        {pinnedPresets.map((tfValue) => {
          const tfObj = ALL_CANONICAL_TIMEFRAMES.find(
            (t) => t.value.toLowerCase() === tfValue.toLowerCase()
          );
          const label = tfObj ? tfObj.label : tfValue.toUpperCase();
          const isSelected = activeTimeframe.toLowerCase() === tfValue.toLowerCase();

          return (
            <button
              key={tfValue}
              onClick={() => onSelectTimeframe(tfValue)}
              title={`${label} Interval`}
              className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase transition-all flex items-center justify-center min-w-[28px] ${
                isSelected
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold shadow-md shadow-cyan-500/20 scale-105"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1A253A]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* MORE Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
          isOpen
            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
            : "text-slate-400 hover:text-slate-200 hover:bg-[#1A253A] border-transparent"
        }`}
      >
        <Clock className="h-3.5 w-3.5" />
        <span>MORE</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180 text-cyan-400" : ""}`} />
      </button>

      {/* Dropdown Menu Drawer */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header & Search */}
          <div className="p-3 border-b border-[#1A2333] space-y-2 bg-[#121927]/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Select Timeframe
              </span>
              <span className="text-[10px] text-cyan-400 font-mono px-2 py-0.5 bg-cyan-950/60 rounded border border-cyan-800/40">
                ACTIVE: {activeTimeframe.toUpperCase()}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search interval (e.g. 5m, 1h, 15s)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#0A0E17] border border-[#1E293B] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#1A253A]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeframe Grid Items */}
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {filteredTimeframes.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching intervals found.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {filteredTimeframes.map((tf) => {
                  const isSelected = activeTimeframe.toLowerCase() === tf.value.toLowerCase();
                  const isPinned = pinnedPresets.includes(tf.value);
                  const cap = capabilities[tf.value];
                  const isAggregated = cap?.status === "AGGREGATED";

                  return (
                    <div
                      key={tf.value}
                      onClick={() => {
                        onSelectTimeframe(tf.value);
                        setIsOpen(false);
                      }}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer border transition-all ${
                        isSelected
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold shadow-sm"
                          : "bg-[#121927]/60 border-[#1E293B] text-slate-300 hover:bg-[#1A253A] hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-mono tracking-wide">{tf.label}</span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {isAggregated ? "SYNTH" : tf.category.slice(0, 3)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => togglePin(e, tf.value)}
                        className="opacity-40 group-hover:opacity-100 hover:scale-110 transition-transform p-0.5"
                        title={isPinned ? "Unpin from toolbar" : "Pin to toolbar"}
                      >
                        <Star
                          className={`h-3 w-3 ${
                            isPinned ? "text-amber-400 fill-amber-400 opacity-100" : "text-slate-400"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Timeframe Builder Footer */}
          <div className="p-3 border-t border-[#1A2333] bg-[#121927]/90">
            <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-cyan-400" />
              Custom Timeframe
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="999"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="w-16 px-2.5 py-1 bg-[#0A0E17] border border-[#1E293B] rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-cyan-500"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as any)}
                className="px-2 py-1 bg-[#0A0E17] border border-[#1E293B] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="m">Minute (m)</option>
                <option value="h">Hour (h)</option>
                <option value="d">Day (d)</option>
                <option value="s">Second (s)</option>
              </select>
              <button
                onClick={handleAddCustom}
                className="flex-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="h-3 w-3" />
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
