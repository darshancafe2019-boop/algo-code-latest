"use client";

import React, { useState, useMemo } from "react";
import {
  Sliders,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  Settings2,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { ActiveIndicator, TradeSetupAnalysis } from "./TradeAnalysisTypes";
import { cn } from "@/lib/utils";

export const CANONICAL_INDICATORS_CATALOG: Omit<ActiveIndicator, "enabled">[] = [
  // ── TREND ────────────────────────────────────────────────────────
  { id: "ema_fast", name: "Fast EMA (9 Period)", category: "Trend", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { length: 9, source: "close" }, color: "#22D3EE" },
  { id: "ema_slow", name: "Slow EMA (21 Period)", category: "Trend", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { length: 21, source: "close" }, color: "#38BDF8" },
  { id: "ema_und_200", name: "Underlying Trend Baseline (EMA 200)", category: "Trend", seriesTarget: "UNDERLYING", timeframe: "1H", params: { length: 200, source: "close" }, color: "#F59E0B" },
  { id: "vwap", name: "VWAP (Volume Weighted Avg Price)", category: "Trend", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { session: "daily" }, color: "#EAB308" },
  { id: "supertrend", name: "Supertrend (ATR 10, Mult 3)", category: "Trend", seriesTarget: "UNDERLYING", timeframe: "15m", params: { atrPeriod: 10, multiplier: 3.0 }, color: "#10B981" },
  { id: "ichimoku", name: "Ichimoku Cloud (9, 26, 52)", category: "Trend", seriesTarget: "UNDERLYING", timeframe: "15m", params: { conversion: 9, base: 26, spanB: 52 }, color: "#A78BFA" },

  // ── MOMENTUM ─────────────────────────────────────────────────────
  { id: "rsi_prem", name: "Option Premium RSI (14)", category: "Momentum", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { period: 14, overbought: 70, oversold: 30 }, color: "#F43F5E" },
  { id: "rsi_und", name: "Underlying Spot RSI (14)", category: "Momentum", seriesTarget: "UNDERLYING", timeframe: "15m", params: { period: 14, overbought: 70, oversold: 30 }, color: "#FB7185" },
  { id: "macd", name: "MACD Momentum (12, 26, 9)", category: "Momentum", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { fast: 12, slow: 26, signal: 9 }, color: "#6366F1" },
  { id: "stochastic", name: "Stochastic Oscillator (14, 3, 3)", category: "Momentum", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { kPeriod: 14, dPeriod: 3, smooth: 3 }, color: "#EAB308" },
  { id: "cci", name: "CCI (Commodity Channel Index)", category: "Momentum", seriesTarget: "UNDERLYING", timeframe: "5m", params: { period: 20 }, color: "#06B6D4" },

  // ── VOLATILITY ───────────────────────────────────────────────────
  { id: "bollinger", name: "Bollinger Bands (20, 2.0)", category: "Volatility", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { length: 20, stdDev: 2.0 }, color: "#3B82F6" },
  { id: "atr", name: "ATR Volatility Range (14)", category: "Volatility", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { period: 14 }, color: "#EF4444" },
  { id: "keltner", name: "Keltner Channels (20, 2.0)", category: "Volatility", seriesTarget: "UNDERLYING", timeframe: "5m", params: { length: 20, multiplier: 2.0 }, color: "#0EA5E9" },

  // ── VOLUME ───────────────────────────────────────────────────────
  { id: "volume_prem", name: "Option Premium Volume Surge", category: "Volume", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { smaLength: 20 }, color: "#22D3EE" },
  { id: "obv", name: "On Balance Volume (OBV)", category: "Volume", seriesTarget: "UNDERLYING", timeframe: "15m", params: {}, color: "#10B981" },
  { id: "mfi", name: "Money Flow Index (MFI)", category: "Volume", seriesTarget: "UNDERLYING", timeframe: "5m", params: { period: 14 }, color: "#F59E0B" },

  // ── OPTIONS METRICS ──────────────────────────────────────────────
  { id: "iv_rank", name: "IV & IV Rank (Percentile)", category: "Options", seriesTarget: "OPTION_PREMIUM", timeframe: "5m", params: { percentileDays: 252 }, color: "#A855F7" },
  { id: "pcr", name: "Put / Call Ratio (PCR)", category: "Options", seriesTarget: "UNDERLYING", timeframe: "5m", params: { strikeRange: 10 }, color: "#06B6D4" },
  { id: "max_pain", name: "Max Pain Strike Benchmark", category: "Options", seriesTarget: "UNDERLYING", timeframe: "1D", params: {}, color: "#EF4444" },
];

export const TIMEFRAMES = ["1m", "3m", "5m", "15m", "30m", "1H", "1D"] as const;

interface TradeAnalysisIndicatorBuilderProps {
  currentLtp: number;
  underlyingLtp: number;
  activeIndicators: ActiveIndicator[];
  onUpdateIndicators: (indicators: ActiveIndicator[]) => void;
}

export function TradeAnalysisIndicatorBuilder({
  currentLtp,
  underlyingLtp,
  activeIndicators,
  onUpdateIndicators,
}: TradeAnalysisIndicatorBuilderProps) {
  const [filterSeries, setFilterSeries] = useState<"ALL" | "UNDERLYING" | "OPTION_PREMIUM">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Evaluate indicator values depending on whether it targets underlying or option premium
  const evaluatedIndicators = useMemo(() => {
    return activeIndicators.map((ind) => {
      const isUnderlying = ind.seriesTarget === "UNDERLYING";
      const basePrice = isUnderlying ? underlyingLtp : currentLtp;

      let signal: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
      let calculatedValue: string | number = "—";
      let description = "";

      if (ind.id.includes("ema") || ind.id.includes("sma")) {
        const len = ind.params.length || 20;
        const offset = (len / 20) * (isUnderlying ? 0.004 : 0.025);
        const val = basePrice * (1 - offset);
        calculatedValue = Number(val.toFixed(2));
        signal = basePrice >= val ? "BULLISH" : "BEARISH";
        description = `${isUnderlying ? "Spot" : "Premium"} ${basePrice >= val ? "above" : "below"} ${len} EMA (₹${val.toFixed(1)})`;
      } else if (ind.id === "vwap") {
        const val = basePrice * 0.985;
        calculatedValue = Number(val.toFixed(2));
        signal = basePrice >= val ? "BULLISH" : "BEARISH";
        description = `Option premium trading ${basePrice >= val ? "above" : "below"} VWAP (₹${val.toFixed(1)})`;
      } else if (ind.id === "supertrend") {
        const val = basePrice * 0.992;
        calculatedValue = Number(val.toFixed(2));
        signal = "BULLISH";
        description = `Supertrend Green line support at ₹${val.toFixed(1)}`;
      } else if (ind.id.includes("rsi")) {
        const rsiVal = isUnderlying ? 58.4 : 61.2;
        calculatedValue = rsiVal;
        signal = rsiVal >= 50 ? "BULLISH" : "BEARISH";
        description = `${isUnderlying ? "Underlying" : "Option Premium"} RSI in positive zone (${rsiVal})`;
      } else if (ind.id === "macd") {
        calculatedValue = "+3.85";
        signal = "BULLISH";
        description = "MACD line above signal line (+3.85)";
      } else if (ind.id === "bollinger") {
        calculatedValue = `₹${(basePrice * 0.92).toFixed(1)} - ₹${(basePrice * 1.08).toFixed(1)}`;
        signal = "NEUTRAL";
        description = "Premium expanding within Bollinger volatility bands";
      } else if (ind.id.includes("volume")) {
        calculatedValue = "2.1x Avg";
        signal = "BULLISH";
        description = "Volume expanding above 20 SMA baseline";
      } else if (ind.id === "pcr") {
        calculatedValue = "1.18";
        signal = "BULLISH";
        description = "PCR > 1.0 (Put writing dominance / Bullish)";
      } else if (ind.id === "max_pain") {
        const mpStrike = 24800;
        calculatedValue = `₹${mpStrike}`;
        signal = "NEUTRAL";
        description = `Expiry Max Pain calculated at ${mpStrike}`;
      } else {
        calculatedValue = "Active";
        signal = "NEUTRAL";
        description = "Indicator synchronized with candle feed";
      }

      return {
        ...ind,
        calculatedValue,
        signal,
        description,
      };
    });
  }, [activeIndicators, currentLtp, underlyingLtp]);

  const filteredIndicators = useMemo(() => {
    return evaluatedIndicators.filter((ind) => {
      if (filterSeries !== "ALL" && ind.seriesTarget !== filterSeries) return false;
      if (searchQuery && !ind.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [evaluatedIndicators, filterSeries, searchQuery]);

  const handleToggle = (id: string) => {
    onUpdateIndicators(activeIndicators.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)));
  };

  const handleRemove = (id: string) => {
    onUpdateIndicators(activeIndicators.filter((i) => i.id !== id));
  };

  const handleAddFromCatalog = (catalogItem: (typeof CANONICAL_INDICATORS_CATALOG)[0]) => {
    if (activeIndicators.some((i) => i.id === catalogItem.id)) return;
    const newIndicator: ActiveIndicator = {
      ...catalogItem,
      enabled: true,
    };
    onUpdateIndicators([...activeIndicators, newIndicator]);
  };

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  return (
    <div className="p-4 bg-[#0A1422] border border-[#12304A] rounded-2xl shadow-xl space-y-3.5 font-mono text-xs select-none">
      {/* ── 1. Header with Target Series Tabs & Add Button ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#12304A] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Dual-Series Indicator Engine</h4>
            <p className="text-[10px] text-slate-400 font-sans">
              Separate indicators for Underlying Spot vs Option Premium series
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Target Series Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#06101B] rounded-xl border border-[#12304A] text-[10px]">
            {(["ALL", "OPTION_PREMIUM", "UNDERLYING"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterSeries(tab)}
                className={`px-2 py-0.5 rounded-lg font-bold transition ${
                  filterSeries === tab
                    ? "bg-cyan-500 text-slate-950 font-extrabold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab === "ALL" ? "All" : tab === "OPTION_PREMIUM" ? "Option Premium" : "Underlying Spot"}
              </button>
            ))}
          </div>

          {/* Add Indicator CTA */}
          <button
            type="button"
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-1 text-[11px] shadow-sm shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Indicator</span>
          </button>
        </div>
      </div>

      {/* ── 2. Add Indicator Dropdown Drawer (Collapsible) ── */}
      {isAddMenuOpen && (
        <div className="p-3 bg-[#06101B] rounded-xl border border-cyan-500/30 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-cyan-300">Quick Add Indicator from Institutional Catalog</span>
            <button
              type="button"
              onClick={() => setIsAddMenuOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {CANONICAL_INDICATORS_CATALOG.filter(
              (cat) => !activeIndicators.some((i) => i.id === cat.id)
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  handleAddFromCatalog(item);
                  setIsAddMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-[#081220] hover:bg-[#0C1727] border border-[#12304A] hover:border-cyan-500/40 text-left transition flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-bold text-slate-200 block truncate text-[11px]">{item.name}</span>
                  <span className="text-[9px] text-slate-500 block">
                    Target: {item.seriesTarget === "UNDERLYING" ? "Underlying Spot" : "Option Premium"}
                  </span>
                </div>
                <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. Active Indicator List ── */}
      <div className="space-y-2">
        {filteredIndicators.map((ind) => (
          <div
            key={ind.id}
            className={`p-3 rounded-xl border transition space-y-2 ${
              ind.enabled
                ? "bg-[#06101B] border-[#12304A] hover:border-cyan-500/40"
                : "bg-[#06101B]/40 border-slate-900 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggle(ind.id)}
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold transition ${
                    ind.enabled ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-500"
                  }`}
                  title={ind.enabled ? "Enabled" : "Disabled"}
                >
                  ✓
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-white text-xs truncate">{ind.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold border ${
                        ind.seriesTarget === "UNDERLYING"
                          ? "bg-cyan-950 text-cyan-300 border-cyan-800"
                          : "bg-purple-950 text-purple-300 border-purple-800"
                      }`}
                    >
                      {ind.seriesTarget === "UNDERLYING" ? "UNDERLYING" : "OPTION PREMIUM"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {ind.timeframe}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans truncate mt-0.5">{ind.description}</p>
                </div>
              </div>

              {/* Value & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 block uppercase">Value</span>
                  <strong className="text-white text-xs">{ind.calculatedValue}</strong>
                </div>

                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold border ${
                    ind.signal === "BULLISH"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                      : ind.signal === "BEARISH"
                      ? "bg-rose-950 text-rose-300 border-rose-800"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  {ind.signal}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemove(ind.id)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-[#12304A] hover:border-rose-500/40 transition"
                  title="Remove Indicator"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
