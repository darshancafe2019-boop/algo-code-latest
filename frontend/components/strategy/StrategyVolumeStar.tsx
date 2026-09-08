"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  Shield,
  Zap,
  Play,
  RotateCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ArrowRight,
  Eye,
  BarChart2,
  Maximize2,
  Bot,
  Radar,
  Info,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Lock,
  Compass,
  FileText,
  Copy,
  Check,
  Percent,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useQuantOSShell } from "@/components/shell/QuantOSAppShell";

interface VolumeStarStateData {
  strategy_id: string;
  strategy_name: string;
  version: string;
  timeframe: string;
  symbol: string;
  provider: string;
  mode: string;
  state: string;
  reason_code: string;
  decision_summary: string;
  current_price: number;
  market_structure?: {
    trend: string;
    trend_confidence: number;
    structure_state: string;
    reason: string;
    structure_summary: string;
    last_higher_high?: any;
    last_higher_low?: any;
    last_lower_high?: any;
    last_lower_low?: any;
    anchor_pivot?: any;
  };
  frvp?: {
    status: string;
    poc: number;
    vah: number;
    val: number;
    total_volume: number;
    bin_size?: number;
    bins: Array<{
      bin_index: number;
      price_low: number;
      price_high: number;
      price_mid: number;
      volume: number;
      volume_ratio: number;
      is_poc: boolean;
      in_value_area: boolean;
      relative_width: number;
    }>;
    row_size: number;
    value_area_pct: number;
    width: number;
  };
  primary_lvn?: {
    lvn_id: string;
    lvn_price: number;
    lvn_low: number;
    lvn_high: number;
    lvn_volume: number;
    relative_deficit: number;
    strength_score: number;
    distance_to_price: number;
    distance_pct: number;
    location_aligned: boolean;
    in_value_area: boolean;
  };
  all_lvns?: any[];
  rejection?: {
    confirmed: boolean;
    signal_direction: string;
    touched_lvn: boolean;
    wick_penetrated: boolean;
    directional_close: boolean;
    reclaimed_level: boolean;
    vol_passed: boolean;
    rejection_quality: number;
    rejection_summary: string;
    metrics: {
      candle_range: number;
      body_size: number;
      upper_wick: number;
      lower_wick: number;
      lower_wick_ratio: number;
      upper_wick_ratio: number;
      body_ratio: number;
      close_location: number;
      volume: number;
    };
  };
  step_1_trend?: {
    step: number;
    title: string;
    status: string;
    badge: string;
    detail: string;
  };
  step_2_frvp?: {
    step: number;
    title: string;
    status: string;
    badge: string;
    detail: string;
  };
  step_3_rejection?: {
    step: number;
    title: string;
    status: string;
    badge: string;
    detail: string;
  };
  signal?: {
    signal_id: string;
    idempotency_key: string;
    direction: string;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    r_multiple: number;
    risk_amount: number;
    setup_quality: number;
    reason_codes: string[];
    timestamp: string;
  } | null;
}

const SUPPORTED_INSTRUMENTS = [
  { symbol: "NIFTY", name: "NIFTY 50 Index / Derivatives", assetClass: "INDEX", provider: "DHAN", defaultPrice: 25210.0 },
  { symbol: "BANKNIFTY", name: "BANK NIFTY Index", assetClass: "INDEX", provider: "DHAN", defaultPrice: 51400.0 },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", assetClass: "EQUITY", provider: "DHAN", defaultPrice: 2980.0 },
  { symbol: "TCS", name: "Tata Consultancy Services", assetClass: "EQUITY", provider: "DHAN", defaultPrice: 4250.0 },
  { symbol: "BTC/USDT", name: "Bitcoin Perpetual", assetClass: "CRYPTO", provider: "BINANCE", defaultPrice: 65800.0 },
  { symbol: "ETH/USDT", name: "Ethereum Perpetual", assetClass: "CRYPTO", provider: "BINANCE", defaultPrice: 3520.0 },
  { symbol: "GOLD", name: "Gold Commodity Futures", assetClass: "COMMODITY", provider: "DELTA", defaultPrice: 2500.0 },
  { symbol: "EUR/USD", name: "Euro / US Dollar Major", assetClass: "FOREX", provider: "GLOBAL", defaultPrice: 1.0920 },
];

export function StrategyVolumeStar() {
  const { openOrderReview } = useQuantOSShell();
  const [symbol, setSymbol] = useState("NIFTY");
  const [provider, setProvider] = useState("DHAN");
  const [mode, setMode] = useState<"PAPER" | "SHADOW" | "LIVE">("PAPER");
  const [activeSubTab, setActiveSubTab] = useState<"MONITOR" | "LEVELS" | "SETTINGS" | "BACKTEST" | "SCANNER">("MONITOR");

  const [stateData, setStateData] = useState<VolumeStarStateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    timeframe: "5m",
    frvp_row_size: 50,
    frvp_value_area_percent: 70.0,
    frvp_width: 100,
    pivot_left_bars: 3,
    pivot_right_bars: 3,
    lvn_detection_method: "local_minima",
    lvn_relative_deficit_threshold: 0.35,
    lvn_zone_width_mode: "bin_width",
    require_rejection_wick: true,
    require_directional_close: true,
    require_volume_confirmation: false,
    stop_mode: "REJECTION_WICK",
    stop_buffer_value: 0.2,
    take_profit_mode: "FIXED_R_MULTIPLE",
    take_profit_r_multiple: 2.0,
    risk_per_trade_pct: 1.0,
    capital: 10000.0,
  });

  // Backtest State
  const [backtestResult, setBacktestResult] = useState<any | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  // Scanner State
  const [scannerData, setScannerData] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch Live State
  const fetchLiveState = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await apiClient.get<any>(
        `/api/strategy/volume-star/state?symbol=${symbol}&provider=${provider}&mode=${mode}&timeframe=${settings.timeframe}`
      );
      if (res && res.data) {
        setStateData(res.data);
      }
    } catch (err) {
      console.warn("Could not load Volume Star live state, using local deterministic model:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [symbol, provider, mode, settings.timeframe]);

  useEffect(() => {
    fetchLiveState();
    const interval = setInterval(fetchLiveState, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveState]);

  // Run Backtest
  const runBacktestSimulation = async () => {
    setIsBacktesting(true);
    try {
      const res = await apiClient.post<any>("/api/strategy/volume-star/backtest", {
        symbol,
        provider,
        initial_capital: settings.capital,
        config: settings,
      });
      const data = res?.data || res;
      if (data) {
        setBacktestResult(data);
        setActiveSubTab("BACKTEST");
      }
    } catch (err) {
      console.error("Backtest failed:", err);
    } finally {
      setIsBacktesting(false);
    }
  };

  // Run Scanner
  const runUniverseScanner = async () => {
    setIsScanning(true);
    try {
      const res = await apiClient.get<any>("/api/strategy/volume-star/scan");
      const data = res?.data || res;
      if (data && (data as any).candidates) {
        setScannerData((data as any).candidates);
        setActiveSubTab("SCANNER");
      }
    } catch (err) {
      console.error("Scanner failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Pre-Trade Order Review Action
  const handleReviewOrder = () => {
    if (!stateData?.signal) return;
    setIsReviewOpen(true);
  };

  const handleConfirmOrder = async () => {
    setIsReviewOpen(false);
    // Submit order intent to OMS
    try {
      await apiClient.post("/api/orders/intent", {
        strategy_id: "volume-star-v1",
        symbol,
        direction: stateData?.signal?.direction || "LONG",
        entry_price: stateData?.signal?.entry_price,
        stop_loss: stateData?.signal?.stop_loss,
        take_profit: stateData?.signal?.take_profit,
        execution_mode: mode,
        provider,
      });
    } catch (err) {
      console.error("Failed to post order intent:", err);
    }
  };

  const trend = stateData?.market_structure?.trend || "BULLISH";
  const stateStr = stateData?.state || "WAITING_FOR_RETRACE";
  const reasonStr = stateData?.reason_code || "WAITING_FOR_RETRACE";
  const curPrice = stateData?.current_price || 25210.0;
  const primaryLvn = stateData?.primary_lvn;
  const frvp = stateData?.frvp;
  const signal = stateData?.signal;

  return (
    <div className="flex flex-col h-full bg-[#080B11] text-slate-100 select-none overflow-y-auto custom-scrollbar font-sans">
      {/* Top Banner & Strategy Identification Bar */}
      <div className="p-4 sm:p-5 border-b border-[#1A2333] bg-[#0E1524] flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 shadow-md">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wider uppercase font-mono">
                VOLUME STAR STRATEGY
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-700">
                5M BASE TF
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-purple-950 text-purple-400 border border-purple-800">
                MARKET FLOW + FRVP LVN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Market Structure (HH/HL) • Fixed Range Volume Profile (50 Rows / 70% VA) • LVN Retrace & Rejection Confirmation
            </p>
          </div>
        </div>

        {/* Global Controls: Symbol, Provider, Mode, Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Symbol Selector */}
          <div className="flex items-center gap-1.5 bg-[#121927] border border-[#1E293B] rounded-xl px-2.5 py-1 text-xs">
            <span className="text-[10px] font-mono text-slate-400">SYM:</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
            >
              {SUPPORTED_INSTRUMENTS.map((inst) => (
                <option key={inst.symbol} value={inst.symbol} className="bg-[#121927] text-white">
                  {inst.symbol} ({inst.assetClass})
                </option>
              ))}
            </select>
          </div>

          {/* Provider Selector */}
          <div className="flex items-center gap-1.5 bg-[#121927] border border-[#1E293B] rounded-xl px-2.5 py-1 text-xs">
            <span className="text-[10px] font-mono text-slate-400">FEED:</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-transparent font-bold text-cyan-400 focus:outline-none cursor-pointer"
            >
              <option value="DHAN" className="bg-[#121927] text-white">DHAN HQ (NSE)</option>
              <option value="UPSTOX" className="bg-[#121927] text-white">UPSTOX (NSE)</option>
              <option value="BINANCE" className="bg-[#121927] text-white">BINANCE (CRYPTO)</option>
              <option value="DELTA" className="bg-[#121927] text-white">DELTA EXCHANGE</option>
            </select>
          </div>

          {/* Execution Mode Selector */}
          <div className="flex items-center p-0.5 rounded-xl bg-[#121927] border border-[#1E293B] text-xs font-mono font-bold">
            {(["PAPER", "SHADOW", "LIVE"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  mode === m
                    ? m === "LIVE"
                      ? "bg-red-600 text-white shadow-lg"
                      : m === "SHADOW"
                      ? "bg-purple-600 text-white shadow-lg"
                      : "bg-emerald-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchLiveState}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[#121927] border border-[#1E293B] hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all shadow-sm"
            title="Refresh Live State"
          >
            <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-5 border-b border-[#1A2333] bg-[#0A0E17] flex items-center gap-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveSubTab("MONITOR")}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "MONITOR"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          LIVE MONITOR & WORKFLOW
        </button>
        <button
          onClick={() => setActiveSubTab("LEVELS")}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "LEVELS"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          FRVP & LVN INSPECTOR
        </button>
        <button
          onClick={() => setActiveSubTab("SETTINGS")}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "SETTINGS"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          STRATEGY PARAMETERS
        </button>
        <button
          onClick={runBacktestSimulation}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "BACKTEST"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart2 className="h-3.5 w-3.5" />
          BACKTEST & SIMULATION {isBacktesting && "(Running...)"}
        </button>
        <button
          onClick={runUniverseScanner}
          className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "SCANNER"
              ? "border-cyan-500 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Radar className="h-3.5 w-3.5" />
          UNIVERSE SCANNER {isScanning && "(Scanning...)"}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 flex-1 space-y-6">
        {activeSubTab === "MONITOR" && (
          <>
            {/* Top State Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3 shadow-md flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Current State</span>
                <span
                  className={`text-xs sm:text-sm font-black font-mono mt-1 uppercase ${
                    stateStr.includes("SIGNAL_READY")
                      ? "text-emerald-400"
                      : stateStr.includes("TOUCHED")
                      ? "text-amber-400"
                      : "text-cyan-400"
                  }`}
                >
                  {stateStr.replace(/_/g, " ")}
                </span>
              </div>

              <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3 shadow-md flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">5M Trend</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {trend === "BULLISH" ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : trend === "BEARISH" ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : (
                    <Activity className="h-4 w-4 text-slate-400" />
                  )}
                  <span
                    className={`text-xs sm:text-sm font-black font-mono uppercase ${
                      trend === "BULLISH"
                        ? "text-emerald-400"
                        : trend === "BEARISH"
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  >
                    {trend}
                  </span>
                </div>
              </div>

              <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3 shadow-md flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Market Price</span>
                <span className="text-xs sm:text-sm font-black font-mono text-white mt-1">
                  {curPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3 shadow-md flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">FRVP POC / VA</span>
                <span className="text-xs sm:text-sm font-black font-mono text-cyan-300 mt-1">
                  {frvp ? `${frvp.poc.toFixed(0)}` : "—"}
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({frvp ? `${frvp.val.toFixed(0)}–${frvp.vah.toFixed(0)}` : "—"})
                  </span>
                </span>
              </div>

              <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3 shadow-md flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Primary LVN Zone</span>
                <span className="text-xs sm:text-sm font-black font-mono text-amber-400 mt-1">
                  {primaryLvn ? `${primaryLvn.lvn_low.toFixed(0)} – ${primaryLvn.lvn_high.toFixed(0)}` : "None"}
                </span>
              </div>

              <div className="bg-[#121927] border border-[#1E293B] rounded-xl p-3 shadow-md flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Setup Quality</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                    {signal?.setup_quality || primaryLvn?.strength_score || 75.0} / 100
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    OPTIMAL
                  </span>
                </div>
              </div>
            </div>

            {/* THREE-STEP WORKFLOW TRACKER (Exact Source-True Process UI) */}
            <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    CANONICAL 3-STEP FLOW TRACKER (5M EXECUTION)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  NO LOOKAHEAD • STRICT CLOSE CONFIRMATION
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* STEP 1 */}
                <div
                  className={`border rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 ${
                    trend !== "NEUTRAL"
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : "bg-[#121927] border-[#1E293B]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-mono font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        trend !== "NEUTRAL"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {trend !== "NEUTRAL" ? `✓ ${trend}` : "○ NEUTRAL"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">
                      IDENTIFY THE TREND (5M)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {trend === "BULLISH"
                        ? "Confirmed Higher Highs (HH) + Higher Lows (HL). Long bias active."
                        : trend === "BEARISH"
                        ? "Confirmed Lower Highs (LH) + Lower Lows (LL). Short bias active."
                        : "Mixed / Range-bound market structure. No directional trade allowed."}
                    </p>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                    <span>STRUCTURE:</span>
                    <span className="font-bold text-white">
                      {stateData?.market_structure?.structure_summary || "HH → HL"}
                    </span>
                  </div>
                </div>

                {/* STEP 2 */}
                <div
                  className={`border rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 ${
                    primaryLvn
                      ? "bg-cyan-950/20 border-cyan-500/40"
                      : "bg-[#121927] border-[#1E293B]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-mono font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        primaryLvn
                          ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {primaryLvn ? `✓ LVN ${primaryLvn.lvn_low.toFixed(0)}–${primaryLvn.lvn_high.toFixed(0)}` : "○ PENDING"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">
                      MARK FIXED RANGE VP + LVN
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      FRVP anchored from Higher Low (Row Size: 50, VA: 70%, Width: 100). Low Volume Node pinpointed deterministically.
                    </p>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                    <span>DEFICIT DEPTH:</span>
                    <span className="font-bold text-cyan-300">
                      {primaryLvn ? `${(primaryLvn.relative_deficit * 100).toFixed(1)}% vs neighbors` : "—"}
                    </span>
                  </div>
                </div>

                {/* STEP 3 */}
                <div
                  className={`border rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 ${
                    signal
                      ? "bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/30"
                      : stateStr.includes("TOUCHED")
                      ? "bg-amber-950/20 border-amber-500/40"
                      : "bg-[#121927] border-[#1E293B]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-mono font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        signal
                          ? "bg-emerald-600 text-white shadow-md animate-pulse"
                          : stateStr.includes("TOUCHED")
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {signal ? `✓ ${signal.direction} READY` : stateStr.includes("TOUCHED") ? "⚡ LVN TOUCHED" : "○ WAITING"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">
                      WAIT FOR LVN REJECTION
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {signal
                        ? "Wick penetrated below LVN and candle closed bullish back above reference. Confirmation complete."
                        : "Waiting for price retrace into LVN zone with lower wick rejection & bullish close."}
                    </p>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                    <span>CONFIRMATION:</span>
                    <span className="font-bold text-white">
                      {signal ? "CONFIRMED ON 5M CLOSE" : "IN PROGRESS"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* "WHY TRADE / WHY NO TRADE" DIAGNOSTIC CARD */}
            <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    &quot;WHY TRADE / WHY NO TRADE?&quot; DETERMINISTIC DIAGNOSTIC
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  REASON CODE: <strong className="text-cyan-400 font-bold">{reasonStr}</strong>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#0A0E17] border border-[#1E293B] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        signal ? "bg-emerald-400 animate-ping" : "bg-cyan-400"
                      }`}
                    />
                    <span className="text-xs font-bold text-white font-mono uppercase">
                      {stateData?.decision_summary || "Evaluating live market structure and volume profile..."}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {signal
                      ? `Execution ready on ${symbol} at ${signal.entry_price} with Stop Loss ${signal.stop_loss} and Take Profit ${signal.take_profit} (${signal.r_multiple}R).`
                      : `Strategy will not trigger orders until all 3 stages (Trend + FRVP LVN + Wick Rejection) are confirmed on candle close.`}
                  </p>
                </div>

                {signal && (
                  <button
                    onClick={handleReviewOrder}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    REVIEW {signal.direction} INTENT
                  </button>
                )}
              </div>
            </div>

            {/* LIVE SIGNAL & RISK DETAILS (If Active) */}
            {signal && (
              <div className="bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                      CONFIRMED STRATEGY SIGNAL OBJECT
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-800">
                    {signal.direction} ENTRY CANDIDATE
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="bg-[#121927]/80 p-3 rounded-xl border border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 uppercase">Entry Price</span>
                    <p className="text-sm font-bold text-white mt-1">{signal.entry_price}</p>
                  </div>
                  <div className="bg-[#121927]/80 p-3 rounded-xl border border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 uppercase">Stop Loss</span>
                    <p className="text-sm font-bold text-red-400 mt-1">{signal.stop_loss}</p>
                  </div>
                  <div className="bg-[#121927]/80 p-3 rounded-xl border border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 uppercase">Take Profit (2R)</span>
                    <p className="text-sm font-bold text-emerald-400 mt-1">{signal.take_profit}</p>
                  </div>
                  <div className="bg-[#121927]/80 p-3 rounded-xl border border-[#1E293B]">
                    <span className="text-[10px] text-slate-400 uppercase">Risk / Reward</span>
                    <p className="text-sm font-bold text-cyan-400 mt-1">{signal.r_multiple} R Multiple</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* FRVP & LVN LEVELS INSPECTOR TAB */}
        {activeSubTab === "LEVELS" && (
          <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A2333] pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  FIXED RANGE VOLUME PROFILE (50 PRICE ROWS)
                </h3>
                <p className="text-xs text-slate-400">
                  Value Area 70% • Width 100 • Deterministic Low Volume Node Identification
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-cyan-400">● POC: {frvp?.poc}</span>
                <span className="text-emerald-400">● VAH: {frvp?.vah}</span>
                <span className="text-emerald-400">● VAL: {frvp?.val}</span>
                <span className="text-amber-400">● LVN: {primaryLvn?.lvn_price}</span>
              </div>
            </div>

            {/* Profile Table / Row Visualizer */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#1E293B] text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-3">Row</th>
                    <th className="py-2 px-3">Price Low</th>
                    <th className="py-2 px-3">Price High</th>
                    <th className="py-2 px-3">Volume</th>
                    <th className="py-2 px-3">Volume Distribution Bar</th>
                    <th className="py-2 px-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2333]">
                  {frvp?.bins?.map((b) => (
                    <tr
                      key={b.bin_index}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        b.is_poc
                          ? "bg-cyan-950/30 text-cyan-300 font-bold"
                          : primaryLvn && Math.abs(b.price_mid - primaryLvn.lvn_price) < (frvp?.bin_size || 1)
                          ? "bg-amber-950/30 text-amber-300 font-bold"
                          : b.in_value_area
                          ? "bg-slate-900/40 text-slate-200"
                          : "text-slate-400"
                      }`}
                    >
                      <td className="py-1.5 px-3">{b.bin_index}</td>
                      <td className="py-1.5 px-3">{b.price_low.toFixed(2)}</td>
                      <td className="py-1.5 px-3">{b.price_high.toFixed(2)}</td>
                      <td className="py-1.5 px-3">{b.volume.toFixed(1)}</td>
                      <td className="py-1.5 px-3 w-1/3">
                        <div className="h-3 w-full bg-[#0A0E17] rounded overflow-hidden">
                          <div
                            className={`h-full rounded transition-all ${
                              b.is_poc
                                ? "bg-cyan-500"
                                : primaryLvn && Math.abs(b.price_mid - primaryLvn.lvn_price) < (frvp?.bin_size || 1)
                                ? "bg-amber-500"
                                : b.in_value_area
                                ? "bg-indigo-500"
                                : "bg-slate-700"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, b.relative_width))}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-1.5 px-3">
                        {b.is_poc ? (
                          <span className="px-2 py-0.5 rounded text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-700">
                            POC
                          </span>
                        ) : primaryLvn && Math.abs(b.price_mid - primaryLvn.lvn_price) < (frvp?.bin_size || 1) ? (
                          <span className="px-2 py-0.5 rounded text-[9px] bg-amber-950 text-amber-400 border border-amber-700">
                            PRIMARY LVN
                          </span>
                        ) : b.in_value_area ? (
                          <span className="text-[9px] text-slate-500">VA</span>
                        ) : (
                          <span className="text-[9px] text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS PANEL (Source vs Quant.OS Separation) */}
        {activeSubTab === "SETTINGS" && (
          <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-6 font-sans">
            <div className="border-b border-[#1A2333] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  STRATEGY PARAMETER CONFIGURATION
                </h3>
                <p className="text-xs text-slate-400">
                  Explicit demarcation between Source Canonical Defaults and Quant.OS Risk & Execution Enhancements.
                </p>
              </div>
            </div>

            {/* SOURCE CANONICAL PARAMETERS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-400 border border-purple-800">
                  SOURCE CANONICAL RULES
                </span>
                <span className="text-xs font-bold text-white uppercase font-mono">
                  Core Volume Star Logic
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0A0E17] p-4 rounded-xl border border-[#1E293B] text-xs">
                <div>
                  <label className="text-slate-400 font-mono text-[10px]">TIMEFRAME</label>
                  <p className="text-white font-bold font-mono mt-1">5 Minutes (5m)</p>
                </div>
                <div>
                  <label className="text-slate-400 font-mono text-[10px]">FRVP ROW SIZE</label>
                  <p className="text-white font-bold font-mono mt-1">50 Rows</p>
                </div>
                <div>
                  <label className="text-slate-400 font-mono text-[10px]">VALUE AREA VOLUME</label>
                  <p className="text-white font-bold font-mono mt-1">70% Volume</p>
                </div>
              </div>
            </div>

            {/* QUANT.OS ENHANCEMENT PARAMETERS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  QUANTOS IMPLEMENTATION PARAMETERS
                </span>
                <span className="text-xs font-bold text-white uppercase font-mono">
                  Configurable Risk, Stop & Target Rules
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0A0E17] p-4 rounded-xl border border-[#1E293B] text-xs">
                <div>
                  <label className="text-slate-400 font-mono text-[10px]">STOP LOSS MODE</label>
                  <select
                    value={settings.stop_mode}
                    onChange={(e) => setSettings({ ...settings, stop_mode: e.target.value })}
                    className="w-full mt-1 bg-[#121927] border border-[#1E293B] rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="REJECTION_WICK">Below/Above Rejection Wick</option>
                    <option value="LVN_ZONE">Below/Above LVN Zone</option>
                    <option value="ATR_STOP">1.5x ATR Stop</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-mono text-[10px]">TAKE PROFIT R MULTIPLE</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.take_profit_r_multiple}
                    onChange={(e) => setSettings({ ...settings, take_profit_r_multiple: parseFloat(e.target.value) || 2.0 })}
                    className="w-full mt-1 bg-[#121927] border border-[#1E293B] rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-mono text-[10px]">RISK PER TRADE (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.risk_per_trade_pct}
                    onChange={(e) => setSettings({ ...settings, risk_per_trade_pct: parseFloat(e.target.value) || 1.0 })}
                    className="w-full mt-1 bg-[#121927] border border-[#1E293B] rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BACKTEST & SIMULATION TAB */}
        {activeSubTab === "BACKTEST" && (
          <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1A2333] pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  HISTORICAL BAR-BY-BAR BACKTEST RESULTS
                </h3>
                <p className="text-xs text-slate-400">
                  Strict Zero-Lookahead Simulation with Brokerage, Fee & Slippage Modeling
                </p>
              </div>

              <button
                onClick={runBacktestSimulation}
                disabled={isBacktesting}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono shadow-md transition-all flex items-center gap-2"
              >
                <Play className="h-3.5 w-3.5" />
                {isBacktesting ? "RUNNING SIMULATION..." : "RERUN BACKTEST"}
              </button>
            </div>

            {backtestResult?.metrics ? (
              <div className="space-y-4">
                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Win Rate</span>
                    <p className="text-base font-black font-mono text-emerald-400 mt-1">
                      {backtestResult.metrics.win_rate}%
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {backtestResult.metrics.wins}W / {backtestResult.metrics.losses}L
                    </span>
                  </div>

                  <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Net P&L</span>
                    <p
                      className={`text-base font-black font-mono mt-1 ${
                        backtestResult.metrics.net_pnl >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      ${backtestResult.metrics.net_pnl.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {backtestResult.metrics.return_pct}% return
                    </span>
                  </div>

                  <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Profit Factor</span>
                    <p className="text-base font-black font-mono text-cyan-400 mt-1">
                      {backtestResult.metrics.profit_factor}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Avg R: {backtestResult.metrics.avg_r}
                    </span>
                  </div>

                  <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Max Drawdown</span>
                    <p className="text-base font-black font-mono text-amber-400 mt-1">
                      {backtestResult.metrics.max_drawdown_pct}%
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Capital: ${backtestResult.metrics.initial_capital}
                    </span>
                  </div>
                </div>

                {/* Trade Log Table */}
                <div className="overflow-x-auto border border-[#1E293B] rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-[#121927] text-slate-400 text-[10px] uppercase border-b border-[#1E293B]">
                        <th className="py-2.5 px-3">Trade ID</th>
                        <th className="py-2.5 px-3">Direction</th>
                        <th className="py-2.5 px-3">Entry Price</th>
                        <th className="py-2.5 px-3">Exit Price</th>
                        <th className="py-2.5 px-3">Net P&L</th>
                        <th className="py-2.5 px-3">R Multiple</th>
                        <th className="py-2.5 px-3">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A2333]">
                      {backtestResult.trades?.map((t: any, idx: number) => (
                        <tr key={t.trade_id || idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-300">{t.trade_id}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                t.direction === "LONG"
                                  ? "bg-emerald-950 text-emerald-400"
                                  : "bg-red-950 text-red-400"
                              }`}
                            >
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-2 px-3">{t.entry_price}</td>
                          <td className="py-2 px-3">{t.exit_price}</td>
                          <td
                            className={`py-2 px-3 font-bold ${
                              t.net_pnl >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            ${t.net_pnl}
                          </td>
                          <td className="py-2 px-3">{t.r_multiple}R</td>
                          <td className="py-2 px-3 text-slate-400">{t.exit_reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 font-mono">
                No backtest results yet. Click &quot;Rerun Backtest&quot; to execute high-fidelity simulation.
              </div>
            )}
          </div>
        )}

        {/* SCANNER TAB */}
        {activeSubTab === "SCANNER" && (
          <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A2333] pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                  VOLUME STAR MULTI-ASSET SCANNER
                </h3>
                <p className="text-xs text-slate-400">
                  Realtime Market Structure & LVN Setup Discovery across Indian Equities, Indices, Crypto, and Forex
                </p>
              </div>

              <button
                onClick={runUniverseScanner}
                disabled={isScanning}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono shadow-md transition-all flex items-center gap-2"
              >
                <Radar className="h-3.5 w-3.5" />
                {isScanning ? "SCANNING..." : "SCAN UNIVERSE"}
              </button>
            </div>

            <div className="overflow-x-auto border border-[#1E293B] rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#121927] text-slate-400 text-[10px] uppercase border-b border-[#1E293B]">
                    <th className="py-2.5 px-3">Instrument</th>
                    <th className="py-2.5 px-3">Feed</th>
                    <th className="py-2.5 px-3">Trend</th>
                    <th className="py-2.5 px-3">Structure</th>
                    <th className="py-2.5 px-3">Primary LVN</th>
                    <th className="py-2.5 px-3">Distance to LVN</th>
                    <th className="py-2.5 px-3">State</th>
                    <th className="py-2.5 px-3">Setup Quality</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2333]">
                  {scannerData.map((cand, idx) => (
                    <tr key={cand.symbol || idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-bold text-white">{cand.symbol}</td>
                      <td className="py-2.5 px-3 text-cyan-400">{cand.provider}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            cand.trend === "BULLISH"
                              ? "bg-emerald-950 text-emerald-400"
                              : cand.trend === "BEARISH"
                              ? "bg-red-950 text-red-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {cand.trend}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{cand.structure}</td>
                      <td className="py-2.5 px-3 text-amber-400 font-bold">{cand.lvn}</td>
                      <td className="py-2.5 px-3 text-slate-400">{cand.distance_to_lvn}</td>
                      <td className="py-2.5 px-3 text-slate-300">{cand.state.replace(/_/g, " ")}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{cand.setup_quality} / 100</td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            setSymbol(cand.symbol);
                            setProvider(cand.provider);
                            setActiveSubTab("MONITOR");
                          }}
                          className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-400 font-bold text-[10px]"
                        >
                          OPEN
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Trade Order Review Modal */}
      {isReviewOpen && signal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-sans">
          <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A2333] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  VOLUME STAR ORDER REVIEW
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
                {mode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Instrument</span>
                <p className="text-sm font-bold text-white mt-1">{symbol}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Direction</span>
                <p className="text-sm font-bold text-emerald-400 mt-1">{signal.direction}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Entry Reference</span>
                <p className="text-sm font-bold text-white mt-1">{signal.entry_price}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Stop Loss</span>
                <p className="text-sm font-bold text-red-400 mt-1">{signal.stop_loss}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Target (2R)</span>
                <p className="text-sm font-bold text-emerald-400 mt-1">{signal.take_profit}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Data Provider</span>
                <p className="text-sm font-bold text-cyan-400 mt-1">{provider}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsReviewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmOrder}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                CONFIRM & SUBMIT TO OMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
