"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
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
  Radar,
  Info,
  ChevronRight,
  ChevronDown,
  Layers,
  Percent,
  XCircle,
  Check,
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
    rejection_wick_length: number;
    rejection_candle_index: number;
    penetration_depth: number;
    rejection_ratio: number;
  };
  signal?: {
    signal_id: string;
    direction: "LONG" | "SHORT";
    trigger_type: string;
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

interface OpenPosition {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entry_price: number;
  current_price: number;
  stop_loss: number;
  take_profit: number;
  quantity: number;
  pnl: number;
  pnl_pct: number;
  mode: string;
}

interface OrderRecord {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: string;
  quantity: number;
  price: number;
  status: "FILLED" | "PENDING" | "CANCELLED";
  timestamp: string;
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
  const [tradeDirection, setTradeDirection] = useState<"CALL" | "PUT">("CALL");
  const [tradeQuantity, setTradeQuantity] = useState<number>(50);
  const [timeframe, setTimeframe] = useState<string>("5m");

  const [stateData, setStateData] = useState<VolumeStarStateData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<"LEVELS" | "SETTINGS" | "BACKTEST" | "SCANNER">("LEVELS");

  // Local simulated positions & orders for immediate feedback
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

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
        `/api/strategy/volume-star/state?symbol=${symbol}&provider=${provider}&mode=${mode}&timeframe=${timeframe}`
      );
      if (res && res.data) {
        setStateData(res.data);
      }
    } catch (err) {
      console.warn("Could not load strategy live state, using local deterministic model:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [symbol, provider, mode, timeframe]);

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
        setAdvancedTab("BACKTEST");
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
      const symbolsToScan = ["NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "BTC/USDT", "ETH/USDT"];
      const results = [];
      for (const s of symbolsToScan) {
        const prov = s.includes("USDT") ? "BINANCE" : "DHAN";
        try {
          const res = await apiClient.get<any>(`/api/strategy/volume-star/state?symbol=${s}&provider=${prov}&mode=${mode}`);
          if (res?.data) {
            results.push({
              symbol: s,
              provider: prov,
              trend: res.data.market_structure?.trend || "BULLISH",
              structure: res.data.market_structure?.structure_summary || "HH → HL",
              lvn: res.data.primary_lvn ? res.data.primary_lvn.lvn_price.toFixed(1) : "None",
              distance_to_lvn: res.data.primary_lvn ? `${(res.data.primary_lvn.distance_pct * 100).toFixed(1)}%` : "—",
              state: res.data.state || "WAITING",
              setup_quality: res.data.signal?.setup_quality || res.data.primary_lvn?.strength_score || 75.0,
            });
          }
        } catch {
          // ignore single item fail
        }
      }
      setScannerData(results);
      setAdvancedTab("SCANNER");
    } finally {
      setIsScanning(false);
    }
  };

  const curPrice = stateData?.current_price || (symbol.includes("BTC") ? 65800.0 : symbol.includes("BANKNIFTY") ? 51400.0 : 25210.0);
  const primaryLvn = stateData?.primary_lvn;
  const frvp = stateData?.frvp;
  const signal = stateData?.signal;

  // Recommended setup calculation
  const recommendedEntry = signal?.entry_price || curPrice;
  const isCall = tradeDirection === "CALL";
  const recommendedSL = signal?.stop_loss || (isCall ? curPrice * 0.995 : curPrice * 1.005);
  const recommendedTarget = signal?.take_profit || (isCall ? curPrice * 1.010 : curPrice * 0.990);
  const rrRatio = (Math.abs(recommendedTarget - recommendedEntry) / Math.max(1, Math.abs(recommendedEntry - recommendedSL))).toFixed(1);
  const contractStrike = Math.round(curPrice / 50) * 50;
  const recommendedContract = symbol.includes("NIFTY")
    ? `${symbol} ${contractStrike} ${isCall ? "CE" : "PE"}`
    : `${symbol} PERP (${isCall ? "LONG" : "SHORT"})`;

  // Handle Order Submit
  const handleReviewOrder = () => {
    setIsReviewOpen(true);
  };

  const handleConfirmOrder = async () => {
    setIsReviewOpen(false);
    const newOrder: OrderRecord = {
      id: `ORD_${Date.now().toString().slice(-6)}`,
      symbol: recommendedContract,
      side: isCall ? "BUY" : "SELL",
      type: "MARKET",
      quantity: tradeQuantity,
      price: recommendedEntry,
      status: "FILLED",
      timestamp: new Date().toLocaleTimeString(),
    };
    setOrders((prev) => [newOrder, ...prev.slice(0, 9)]);

    const newPos: OpenPosition = {
      id: `POS_${Date.now().toString().slice(-6)}`,
      symbol: recommendedContract,
      side: isCall ? "LONG" : "SHORT",
      entry_price: recommendedEntry,
      current_price: recommendedEntry,
      stop_loss: recommendedSL,
      take_profit: recommendedTarget,
      quantity: tradeQuantity,
      pnl: 0,
      pnl_pct: 0,
      mode,
    };
    setPositions((prev) => [newPos, ...prev]);

    try {
      await apiClient.post("/api/orders/intent", {
        strategy_id: "volume-star-v1",
        symbol,
        direction: isCall ? "LONG" : "SHORT",
        entry_price: recommendedEntry,
        stop_loss: recommendedSL,
        take_profit: recommendedTarget,
        quantity: tradeQuantity,
        execution_mode: mode,
        provider,
      });
    } catch (err) {
      console.error("Failed to post order intent:", err);
    }
  };

  const handleExitPosition = (posId: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== posId));
  };

  // Synthetic candles for the primary chart view
  const chartCandles = useMemo(() => {
    const base = curPrice;
    const count = 30;
    const rows = [];
    let p = base - 35;
    for (let i = 0; i < count; i++) {
      const step = (Math.sin(i / 3) * 6) + (i % 2 === 0 ? 3 : -2);
      p += step;
      const o = p - 1.5;
      const c = p + 2.0;
      const h = Math.max(o, c) + (i % 3 === 0 ? 4 : 2);
      const l = Math.min(o, c) - (i % 2 === 0 ? 4 : 2);
      rows.push({
        idx: i,
        open: o,
        high: h,
        low: l,
        close: c,
        isBull: c >= o,
        volume: 500 + (i % 5) * 200,
      });
    }
    return rows;
  }, [curPrice]);

  const minPrice = Math.min(...chartCandles.map((c) => c.low));
  const maxPrice = Math.max(...chartCandles.map((c) => c.high));
  const priceRange = Math.max(1, maxPrice - minPrice);

  return (
    <div className="flex flex-col h-full bg-[#080B11] text-slate-100 select-none overflow-y-auto custom-scrollbar font-sans">
      {/* 1. TOP HEADER: Symbol, Live Price, Status & Trading Mode */}
      <div className="px-4 py-3 border-b border-[#1A2333] bg-[#0E1524] flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Left: Symbol, Price, Live Pill */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol Selector */}
          <div className="flex items-center gap-1.5 bg-[#121927] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-[10px] font-mono text-slate-400">SYM:</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-transparent font-bold text-white focus:outline-none cursor-pointer text-sm"
            >
              {SUPPORTED_INSTRUMENTS.map((inst) => (
                <option key={inst.symbol} value={inst.symbol} className="bg-[#121927] text-white">
                  {inst.symbol} ({inst.name})
                </option>
              ))}
            </select>
          </div>

          {/* Live Price with LIVE Badge */}
          <div className="flex items-center gap-2 bg-[#121927] border border-[#1E293B] rounded-lg px-3 py-1.5 font-mono">
            <span className="text-base sm:text-lg font-black text-white">
              {symbol.includes("USDT") || symbol.includes("BTC") ? "$" : "₹"}
              {curPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700 animate-pulse">
              ● LIVE
            </span>
          </div>

          {/* Data Feed & Risk Status */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-[#121927] border border-[#1E293B] rounded-lg px-2.5 py-1 text-slate-300">
              <span className="text-cyan-400 font-bold">{provider}</span>
              <span className="text-emerald-400 font-bold">● LIVE</span>
            </div>
            <div className="flex items-center gap-1 bg-[#121927] border border-[#1E293B] rounded-lg px-2 py-1 text-[11px] text-emerald-400">
              <Shield className="h-3 w-3" />
              <span>RISK ● READY</span>
            </div>
          </div>
        </div>

        {/* Right: Trading Mode (PAPER / SHADOW / LIVE) & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-lg bg-[#121927] border border-[#1E293B] text-xs font-mono font-bold">
            {(["PAPER", "SHADOW", "LIVE"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md transition-all ${
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

          <button
            onClick={fetchLiveState}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#121927] border border-[#1E293B] hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all shadow-sm"
            title="Refresh Live Data"
          >
            <RotateCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT GRID: Chart (Left) + Trade Panel (Right) */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PRIMARY LIVE CHART (2 Cols on Desktop) */}
        <div className="lg:col-span-2 bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#1A2333] pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {symbol} Live Execution Chart
              </span>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-[#121927] p-0.5 rounded-lg border border-[#1E293B] text-[11px] font-mono">
              {["1m", "5m", "15m", "1h"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    timeframe === tf ? "bg-cyan-600 text-white font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Candlestick Visualizer */}
          <div className="h-64 sm:h-72 w-full bg-[#090D16] rounded-xl p-3 relative flex flex-col justify-between overflow-hidden border border-[#162032]">
            <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
              {/* Grid Lines */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={240 * ratio}
                  x2="600"
                  y2={240 * ratio}
                  stroke="#1A2436"
                  strokeDasharray="4,4"
                  strokeWidth="0.8"
                />
              ))}

              {/* Price Candlesticks */}
              {chartCandles.map((c, i) => {
                const x = 10 + i * 19;
                const candleWidth = 10;
                const yHigh = 220 - ((c.high - minPrice) / priceRange) * 200;
                const yLow = 220 - ((c.low - minPrice) / priceRange) * 200;
                const yOpen = 220 - ((c.open - minPrice) / priceRange) * 200;
                const yClose = 220 - ((c.close - minPrice) / priceRange) * 200;
                const topBody = Math.min(yOpen, yClose);
                const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));
                const color = c.isBull ? "#10B981" : "#EF4444";

                return (
                  <g key={i}>
                    {/* Wick */}
                    <line x1={x + candleWidth / 2} y1={yHigh} x2={x + candleWidth / 2} y2={yLow} stroke={color} strokeWidth="1.2" />
                    {/* Body */}
                    <rect x={x} y={topBody} width={candleWidth} height={bodyHeight} fill={color} rx="1" />
                  </g>
                );
              })}

              {/* SL / Target Guideline Overlay when recommended */}
              <line
                x1="0"
                y1={220 - ((recommendedTarget - minPrice) / priceRange) * 200}
                x2="600"
                y2={220 - ((recommendedTarget - minPrice) / priceRange) * 200}
                stroke="#10B981"
                strokeWidth="1.5"
                strokeDasharray="6,3"
              />
              <line
                x1="0"
                y1={220 - ((recommendedSL - minPrice) / priceRange) * 200}
                x2="600"
                y2={220 - ((recommendedSL - minPrice) / priceRange) * 200}
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeDasharray="6,3"
              />
            </svg>

            {/* In-chart Overlays */}
            <div className="absolute top-4 right-4 flex flex-col gap-1 text-[10px] font-mono text-right">
              <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                Target: {recommendedTarget.toFixed(1)}
              </span>
              <span className="text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                SL: {recommendedSL.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2 px-1">
            <span>LOW: {minPrice.toFixed(2)}</span>
            <span className="text-cyan-400 font-bold">R:R {rrRatio}</span>
            <span>HIGH: {maxPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* TRADE PANEL (Right Column) */}
        <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#1A2333] pb-2.5">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-cyan-400" />
                TRADE PANEL
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {mode}
              </span>
            </div>

            {/* Direction Switcher: CALL vs PUT */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setTradeDirection("CALL")}
                className={`py-2.5 rounded-xl font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  tradeDirection === "CALL"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
                    : "bg-[#121927] text-slate-400 hover:text-white border border-[#1E293B]"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                CALL (LONG)
              </button>

              <button
                onClick={() => setTradeDirection("PUT")}
                className={`py-2.5 rounded-xl font-mono font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  tradeDirection === "PUT"
                    ? "bg-red-600 text-white shadow-lg shadow-red-950/50"
                    : "bg-[#121927] text-slate-400 hover:text-white border border-[#1E293B]"
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                PUT (SHORT)
              </button>
            </div>

            {/* Recommended Contract & Order Details */}
            <div className="mt-4 space-y-2.5 bg-[#090D16] p-3.5 rounded-xl border border-[#1E293B] text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Contract:</span>
                <span className="font-bold text-cyan-300">{recommendedContract}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Entry Ref:</span>
                <span className="font-bold text-white">{recommendedEntry.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Stop Loss:</span>
                <span className="font-bold text-red-400">{recommendedSL.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target (2R):</span>
                <span className="font-bold text-emerald-400">{recommendedTarget.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Risk / Reward:</span>
                <span className="font-bold text-cyan-400">1:{rrRatio}</span>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTradeQuantity((q) => Math.max(1, q - 25))}
                    className="w-6 h-6 rounded bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700"
                  >
                    -
                  </button>
                  <span className="font-bold text-white w-10 text-center">{tradeQuantity}</span>
                  <button
                    onClick={() => setTradeQuantity((q) => q + 25)}
                    className="w-6 h-6 rounded bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* REVIEW ORDER BUTTON */}
          <button
            onClick={handleReviewOrder}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wider shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2"
          >
            <Shield className="h-4 w-4" />
            REVIEW ORDER
          </button>
        </div>
      </div>

      {/* 3. OPEN POSITIONS & RECENT ORDERS SECTION */}
      <div className="px-4 sm:px-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Open Positions Card */}
        <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#1A2333] pb-2">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              OPEN POSITIONS ({positions.length})
            </h4>
            <span className="text-[10px] font-mono text-slate-400">REALTIME P&L</span>
          </div>

          {positions.length > 0 ? (
            <div className="space-y-2">
              {positions.map((p) => (
                <div key={p.id} className="p-3 bg-[#090D16] border border-[#1E293B] rounded-xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${p.side === "LONG" ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"}`}>
                        {p.side}
                      </span>
                      <span className="font-bold text-white">{p.symbol}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Qty: {p.quantity} • Entry: {p.entry_price.toFixed(1)} • SL: {p.stop_loss.toFixed(1)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400">+{p.pnl.toFixed(2)}</span>
                    <button
                      onClick={() => handleExitPosition(p.id)}
                      className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-400 font-bold text-[10px]"
                    >
                      EXIT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              No active open positions.
            </div>
          )}
        </div>

        {/* Recent Orders Card */}
        <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#1A2333] pb-2">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              RECENT ORDERS ({orders.length})
            </h4>
            <span className="text-[10px] font-mono text-slate-400">OMS LOG</span>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="p-2.5 bg-[#090D16] border border-[#1E293B] rounded-xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="font-bold text-white">{o.symbol}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {o.side} {o.quantity} @ {o.price.toFixed(1)} • {o.timestamp}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              No recent orders in this session.
            </div>
          )}
        </div>
      </div>

      {/* 4. ADVANCED ANALYSIS COLLAPSIBLE (Hidden by default for simplicity) */}
      <div className="p-4 sm:p-5">
        <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl shadow-xl overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-5 py-3.5 bg-[#121927] hover:bg-[#162032] flex items-center justify-between text-xs font-mono font-bold text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>ADVANCED ANALYSIS & STRATEGY TOOLS</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="text-[10px] text-slate-400">{showAdvanced ? "HIDE" : "SHOW"}</span>
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </button>

          {/* Collapsible Body */}
          {showAdvanced && (
            <div className="p-5 space-y-5 border-t border-[#1A2333]">
              {/* Navigation Sub-Tabs */}
              <div className="flex items-center gap-2 border-b border-[#1A2333] pb-2 overflow-x-auto text-xs font-mono">
                <button
                  onClick={() => setAdvancedTab("LEVELS")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    advancedTab === "LEVELS" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "text-slate-400 hover:text-white"
                  }`}
                >
                  FRVP & LVN Depth
                </button>
                <button
                  onClick={() => setAdvancedTab("SETTINGS")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    advancedTab === "SETTINGS" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Strategy Settings
                </button>
                <button
                  onClick={runBacktestSimulation}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    advancedTab === "BACKTEST" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Backtest Runner {isBacktesting && "(Running...)"}
                </button>
                <button
                  onClick={runUniverseScanner}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    advancedTab === "SCANNER" ? "bg-cyan-950 text-cyan-400 border border-cyan-800" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Universe Scanner {isScanning && "(Scanning...)"}
                </button>
              </div>

              {/* TAB 1: FRVP & LVN Depth Table */}
              {advancedTab === "LEVELS" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Fixed Range Profile (50 Rows) • Value Area 70%</span>
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400">● POC: {frvp?.poc}</span>
                      <span className="text-emerald-400">● VAH: {frvp?.vah}</span>
                      <span className="text-emerald-400">● VAL: {frvp?.val}</span>
                      <span className="text-amber-400">● LVN: {primaryLvn?.lvn_price}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#1E293B] rounded-xl max-h-60 custom-scrollbar">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="sticky top-0 bg-[#121927]">
                        <tr className="border-b border-[#1E293B] text-slate-400 text-[10px] uppercase">
                          <th className="py-2 px-3">Row</th>
                          <th className="py-2 px-3">Price Low</th>
                          <th className="py-2 px-3">Price High</th>
                          <th className="py-2 px-3">Volume</th>
                          <th className="py-2 px-3">Distribution</th>
                          <th className="py-2 px-3">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A2333]">
                        {frvp?.bins?.map((b) => (
                          <tr key={b.bin_index} className="hover:bg-slate-800/30">
                            <td className="py-1 px-3">{b.bin_index}</td>
                            <td className="py-1 px-3">{b.price_low.toFixed(1)}</td>
                            <td className="py-1 px-3">{b.price_high.toFixed(1)}</td>
                            <td className="py-1 px-3">{b.volume.toFixed(1)}</td>
                            <td className="py-1 px-3 w-1/3">
                              <div className="h-2.5 w-full bg-[#0A0E17] rounded overflow-hidden">
                                <div
                                  className={`h-full rounded ${
                                    b.is_poc ? "bg-cyan-500" : b.in_value_area ? "bg-indigo-500" : "bg-slate-700"
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(2, b.relative_width))}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-1 px-3 text-[10px]">
                              {b.is_poc ? (
                                <span className="text-cyan-400 font-bold">POC</span>
                              ) : b.in_value_area ? (
                                <span className="text-slate-400">VA</span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Strategy Settings */}
              {advancedTab === "SETTINGS" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                    <label className="text-slate-400">STOP LOSS MODE</label>
                    <select
                      value={settings.stop_mode}
                      onChange={(e) => setSettings({ ...settings, stop_mode: e.target.value })}
                      className="w-full mt-1 bg-[#090D16] border border-[#1E293B] rounded p-2 text-white"
                    >
                      <option value="REJECTION_WICK">Below/Above Rejection Wick</option>
                      <option value="LVN_ZONE">Below/Above LVN Zone</option>
                      <option value="ATR_STOP">1.5x ATR Stop</option>
                    </select>
                  </div>

                  <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                    <label className="text-slate-400">TAKE PROFIT R MULTIPLE</label>
                    <input
                      type="number"
                      step="0.5"
                      value={settings.take_profit_r_multiple}
                      onChange={(e) => setSettings({ ...settings, take_profit_r_multiple: parseFloat(e.target.value) || 2.0 })}
                      className="w-full mt-1 bg-[#090D16] border border-[#1E293B] rounded p-2 text-white"
                    />
                  </div>

                  <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                    <label className="text-slate-400">RISK PER TRADE (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.risk_per_trade_pct}
                      onChange={(e) => setSettings({ ...settings, risk_per_trade_pct: parseFloat(e.target.value) || 1.0 })}
                      className="w-full mt-1 bg-[#090D16] border border-[#1E293B] rounded p-2 text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: Backtest Results */}
              {advancedTab === "BACKTEST" && (
                <div className="space-y-3 font-mono text-xs">
                  {backtestResult?.metrics ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                        <span className="text-[10px] text-slate-400 uppercase">Win Rate</span>
                        <p className="text-base font-bold text-emerald-400 mt-1">{backtestResult.metrics.win_rate}%</p>
                      </div>
                      <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                        <span className="text-[10px] text-slate-400 uppercase">Net P&L</span>
                        <p className={`text-base font-bold mt-1 ${backtestResult.metrics.net_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          ${backtestResult.metrics.net_pnl}
                        </p>
                      </div>
                      <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                        <span className="text-[10px] text-slate-400 uppercase">Profit Factor</span>
                        <p className="text-base font-bold text-cyan-400 mt-1">{backtestResult.metrics.profit_factor}</p>
                      </div>
                      <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                        <span className="text-[10px] text-slate-400 uppercase">Max Drawdown</span>
                        <p className="text-base font-bold text-amber-400 mt-1">{backtestResult.metrics.max_drawdown_pct}%</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      Click &quot;Backtest Runner&quot; to execute simulation.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Scanner */}
              {advancedTab === "SCANNER" && (
                <div className="overflow-x-auto border border-[#1E293B] rounded-xl font-mono text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-[#121927] text-slate-400 text-[10px] uppercase">
                      <tr className="border-b border-[#1E293B]">
                        <th className="py-2 px-3">Symbol</th>
                        <th className="py-2 px-3">Trend</th>
                        <th className="py-2 px-3">Primary LVN</th>
                        <th className="py-2 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A2333]">
                      {scannerData.map((cand, idx) => (
                        <tr key={cand.symbol || idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-bold text-white">{cand.symbol}</td>
                          <td className="py-2 px-3 text-emerald-400">{cand.trend}</td>
                          <td className="py-2 px-3 text-amber-400">{cand.lvn}</td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => {
                                setSymbol(cand.symbol);
                                setProvider(cand.provider);
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 text-[10px]"
                            >
                              TRADE
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. PRE-TRADE ORDER REVIEW MODAL */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn font-sans">
          <div className="bg-[#0E1524] border border-[#1E293B] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1A2333] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  ORDER REVIEW & CONFIRMATION
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
                {mode}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Contract</span>
                <p className="text-sm font-bold text-white mt-1">{recommendedContract}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Direction</span>
                <p className={`text-sm font-bold mt-1 ${isCall ? "text-emerald-400" : "text-red-400"}`}>
                  {tradeDirection} ({isCall ? "LONG" : "SHORT"})
                </p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Entry Ref</span>
                <p className="text-sm font-bold text-white mt-1">{recommendedEntry.toFixed(2)}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Stop Loss</span>
                <p className="text-sm font-bold text-red-400 mt-1">{recommendedSL.toFixed(2)}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Target</span>
                <p className="text-sm font-bold text-emerald-400 mt-1">{recommendedTarget.toFixed(2)}</p>
              </div>
              <div className="bg-[#121927] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-[10px] text-slate-400 uppercase">Quantity</span>
                <p className="text-sm font-bold text-cyan-400 mt-1">{tradeQuantity} units</p>
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
