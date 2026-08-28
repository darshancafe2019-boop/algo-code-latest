"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Cpu,
  DollarSign,
  Globe,
  Layers,
  Lock,
  Minus,
  Percent,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sliders,
  TrendingDown,
  TrendingUp,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import { OptionLeg, StrategyPayoffPoint } from "@/lib/trading/strategies/base/StrategyTypes";
import { PremiumSelectionClientEngine, OptionStrikeRowData } from "@/lib/trading/engine/PremiumSelectionEngine";
import { apiClient } from "@/lib/apiClient";

// Multi-Market Underlyings Catalog
const MARKET_UNDERLYINGS = [
  // India (NSE / BSE)
  { symbol: "NIFTY", name: "NIFTY 50", market: "India", exchange: "NSE", multiplier: 50, currency: "₹", type: "INDEX", spot: 24350.0, step: 50 },
  { symbol: "BANKNIFTY", name: "BANK NIFTY", market: "India", exchange: "NSE", multiplier: 15, currency: "₹", type: "INDEX", spot: 51200.0, step: 100 },
  { symbol: "FINNIFTY", name: "FINNIFTY", market: "India", exchange: "NSE", multiplier: 40, currency: "₹", type: "INDEX", spot: 23600.0, step: 50 },
  { symbol: "MIDCPNIFTY", name: "NIFTY MIDCAP", market: "India", exchange: "NSE", multiplier: 75, currency: "₹", type: "INDEX", spot: 12850.0, step: 25 },
  { symbol: "SENSEX", name: "BSE SENSEX", market: "India", exchange: "BSE", multiplier: 10, currency: "₹", type: "INDEX", spot: 79800.0, step: 100 },
  { symbol: "RELIANCE", name: "Reliance Industries", market: "India", exchange: "NSE", multiplier: 250, currency: "₹", type: "STOCK", spot: 2980.0, step: 20 },
  { symbol: "TCS", name: "Tata Consultancy", market: "India", exchange: "NSE", multiplier: 175, currency: "₹", type: "STOCK", spot: 4190.0, step: 20 },
  { symbol: "HDFCBANK", name: "HDFC Bank", market: "India", exchange: "NSE", multiplier: 550, currency: "₹", type: "STOCK", spot: 1640.0, step: 10 },

  // Global (US / CBOE / NASDAQ)
  { symbol: "SPX", name: "S&P 500 Index", market: "Global", exchange: "CBOE", multiplier: 100, currency: "$", type: "INDEX", spot: 5620.0, step: 10 },
  { symbol: "NDX", name: "NASDAQ 100 Index", market: "Global", exchange: "NASDAQ", multiplier: 100, currency: "$", type: "INDEX", spot: 19800.0, step: 25 },
  { symbol: "RUT", name: "Russell 2000", market: "Global", exchange: "CBOE", multiplier: 100, currency: "$", type: "INDEX", spot: 2210.0, step: 5 },
  { symbol: "VIX", name: "CBOE Volatility", market: "Global", exchange: "CBOE", multiplier: 100, currency: "$", type: "INDEX", spot: 16.5, step: 0.5 },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", market: "Global", exchange: "NYSE", multiplier: 100, currency: "$", type: "ETF", spot: 561.5, step: 1 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", market: "Global", exchange: "NASDAQ", multiplier: 100, currency: "$", type: "ETF", spot: 482.0, step: 1 },
  { symbol: "AAPL", name: "Apple Inc.", market: "Global", exchange: "NASDAQ", multiplier: 100, currency: "$", type: "STOCK", spot: 228.0, step: 2.5 },
  { symbol: "NVDA", name: "NVIDIA Corp.", market: "Global", exchange: "NASDAQ", multiplier: 100, currency: "$", type: "STOCK", spot: 125.5, step: 2.5 },
  { symbol: "TSLA", name: "Tesla Inc.", market: "Global", exchange: "NASDAQ", multiplier: 100, currency: "$", type: "STOCK", spot: 215.0, step: 2.5 },

  // Crypto (Binance / Deribit)
  { symbol: "BTC/USDT", name: "Bitcoin / USDT", market: "Crypto", exchange: "Binance", multiplier: 1, currency: "USDT", type: "CRYPTO_OPTION", spot: 64200.0, step: 1000 },
  { symbol: "ETH/USDT", name: "Ethereum / USDT", market: "Crypto", exchange: "Binance", multiplier: 1, currency: "USDT", type: "CRYPTO_OPTION", spot: 3450.0, step: 50 },
  { symbol: "SOL/USDT", name: "Solana / USDT", market: "Crypto", exchange: "Binance", multiplier: 1, currency: "USDT", type: "CRYPTO_OPTION", spot: 152.0, step: 5 },
];

const STRATEGY_CATEGORIES = [
  "All",
  "Single Leg",
  "Vertical Spreads",
  "Volatility",
  "Winged Spreads",
  "Ratio & Backspreads",
  "Time Spreads",
  "Covered Combinations",
];

export function MultiMarketOptionsWorkstation() {
  // Step navigation (1 to 5)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Market & Underlying State
  const [selectedMarket, setSelectedMarket] = useState<"All" | "India" | "Global" | "Crypto">("India");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnderlying, setSelectedUnderlying] = useState(MARKET_UNDERLYINGS[0]);
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [liveConfirmUnlock, setLiveConfirmUnlock] = useState(false);

  // Step 2: Strategy Selection State
  const [strategyCategory, setStrategyCategory] = useState("All");
  const [strategyOutlook, setStrategyOutlook] = useState<"ALL" | "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE">("ALL");
  const [selectedStrategyId, setSelectedStrategyId] = useState("bull-call-spread");
  const [availableStrategies, setAvailableStrategies] = useState<any[]>([]);

  // Step 3: Expiry, Strike & Premium Selection State
  const [selectedExpiry, setSelectedExpiry] = useState("2026-09-04");
  const [availableExpiries, setAvailableExpiries] = useState<string[]>(["2026-09-04", "2026-09-18", "2026-09-25", "2026-10-30"]);
  const [premiumMethod, setPremiumMethod] = useState<"EXACT" | "NEAREST" | "RANGE" | "DELTA" | "MONEYNESS">("EXACT");
  const [targetPremiumValue, setTargetPremiumValue] = useState<number>(100.0);
  const [configuredLegs, setConfiguredLegs] = useState<any[]>([]);

  // Step 4: Capital, Risk & Exit State
  const [lots, setLots] = useState(1);
  const [profitTargetPct, setProfitTargetPct] = useState(50);
  const [stopLossPct, setStopLossPct] = useState(50);
  const [trailingStopPct, setTrailingStopPct] = useState(0);
  const [exitDte, setExitDte] = useState(1);

  // Step 5: Payoff & Analytics State
  const [payoffData, setPayoffData] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionNotice, setExecutionNotice] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  // Positions & Orders Dock
  const [activePositions, setActivePositions] = useState<any[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<any[]>([]);

  // Filtered Underlyings
  const filteredUnderlyings = useMemo(() => {
    return MARKET_UNDERLYINGS.filter((u) => {
      const matchMarket = selectedMarket === "All" || u.market === selectedMarket;
      const matchQuery =
        !searchQuery ||
        u.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMarket && matchQuery;
    });
  }, [selectedMarket, searchQuery]);

  // Load Strategies & Providers on Mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [stratRes, provRes, posRes] = await Promise.all([
          apiClient.get<any>("/api/options/strategies"),
          apiClient.get<any>("/api/options/providers/status"),
          apiClient.get<any>("/api/options/positions"),
        ]);
        if (stratRes?.data?.strategies) setAvailableStrategies(stratRes.data.strategies);
        if (provRes?.data?.providers) setProviderStatuses(provRes.data.providers);
        if (posRes?.data?.positions) setActivePositions(posRes.data.positions);
      } catch (err) {
        console.warn("Using fallback strategy metadata:", err);
      }
    }
    loadInitialData();
  }, []);

  // Sync configured legs when strategy or underlying changes
  useEffect(() => {
    const spot = selectedUnderlying.spot;
    const step = selectedUnderlying.step;
    const atm = Math.round(spot / step) * step;
    const expiry = selectedExpiry;
    const mult = selectedUnderlying.multiplier;

    // Load calibrated preset
    if (selectedStrategyId === "bull-call-spread") {
      setConfiguredLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "CE", strike: atm, expiry, premium: Math.round(spot * 0.025 * 100) / 100, lots, quantity: lots * mult, delta: 0.52 },
        { leg_id: "leg-2", action: "SELL", option_type: "CE", strike: atm + step * 2, expiry, premium: Math.round(spot * 0.010 * 100) / 100, lots, quantity: lots * mult, delta: -0.26 },
      ]);
    } else if (selectedStrategyId === "short-iron-condor") {
      setConfiguredLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "PE", strike: atm - step * 3, expiry, premium: Math.round(spot * 0.006 * 100) / 100, lots, quantity: lots * mult, delta: -0.12 },
        { leg_id: "leg-2", action: "SELL", option_type: "PE", strike: atm - step, expiry, premium: Math.round(spot * 0.018 * 100) / 100, lots, quantity: lots * mult, delta: 0.30 },
        { leg_id: "leg-3", action: "SELL", option_type: "CE", strike: atm + step, expiry, premium: Math.round(spot * 0.018 * 100) / 100, lots, quantity: lots * mult, delta: -0.30 },
        { leg_id: "leg-4", action: "BUY", option_type: "CE", strike: atm + step * 3, expiry, premium: Math.round(spot * 0.006 * 100) / 100, lots, quantity: lots * mult, delta: 0.12 },
      ]);
    } else if (selectedStrategyId === "long-call") {
      setConfiguredLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "CE", strike: atm, expiry, premium: Math.round(spot * 0.025 * 100) / 100, lots, quantity: lots * mult, delta: 0.50 },
      ]);
    } else if (selectedStrategyId === "long-straddle") {
      setConfiguredLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "CE", strike: atm, expiry, premium: Math.round(spot * 0.025 * 100) / 100, lots, quantity: lots * mult, delta: 0.50 },
        { leg_id: "leg-2", action: "BUY", option_type: "PE", strike: atm, expiry, premium: Math.round(spot * 0.025 * 100) / 100, lots, quantity: lots * mult, delta: -0.50 },
      ]);
    } else if (selectedStrategyId === "covered-call") {
      setConfiguredLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "STOCK", strike: spot, expiry: "", premium: spot, lots, quantity: lots * mult, delta: 1.0 },
        { leg_id: "leg-2", action: "SELL", option_type: "CE", strike: atm + step, expiry, premium: Math.round(spot * 0.018 * 100) / 100, lots, quantity: lots * mult, delta: -0.35 },
      ]);
    } else {
      // Default single leg
      setConfiguredLegs([
        { leg_id: "leg-1", action: "BUY", option_type: "CE", strike: atm, expiry, premium: Math.round(spot * 0.025 * 100) / 100, lots, quantity: lots * mult, delta: 0.50 },
      ]);
    }
  }, [selectedStrategyId, selectedUnderlying, selectedExpiry, lots]);

  // Recalculate Payoff & Greeks whenever legs or spot change
  useEffect(() => {
    async function evaluatePayoff() {
      if (configuredLegs.length === 0) return;
      try {
        const res = await apiClient.post<any>("/api/options/strategy/evaluate", {
          strategy_name: selectedStrategyId,
          underlying: selectedUnderlying.symbol,
          spot_price: selectedUnderlying.spot,
          legs: configuredLegs,
        });
        const data = res?.data;
        if (data?.status === "success") {
          setPayoffData(data);
        }
      } catch (err) {
        console.warn("Payoff evaluation error:", err);
      }
    }
    evaluatePayoff();
  }, [configuredLegs, selectedUnderlying, selectedStrategyId]);

  // Run 14-Point Pre-Flight Validation
  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await apiClient.post<any>("/api/options/order/validate", {
        underlying: selectedUnderlying.symbol,
        exchange: selectedUnderlying.exchange,
        strategy_id: selectedStrategyId,
        execution_mode: executionMode,
        lots,
        legs: configuredLegs,
      });
      const data = res?.data;
      setValidationResult(data);
      if (data?.is_valid) {
        setExecutionNotice({ type: "success", msg: "All pre-flight validation gates PASSED." });
      } else {
        setExecutionNotice({ type: "error", msg: "Validation failed on some risk gates." });
      }
    } catch (err: any) {
      setExecutionNotice({ type: "error", msg: `Validation error: ${err.message || err}` });
    } finally {
      setIsValidating(false);
    }
  };

  // Execute Order (Paper or Live)
  const handleExecute = async () => {
    if (executionMode === "LIVE" && !liveConfirmUnlock) {
      setExecutionNotice({ type: "error", msg: "LIVE mode is locked. Please toggle the Live Confirmation lock first." });
      return;
    }

    setIsExecuting(true);
    try {
      const payload = {
        underlying: selectedUnderlying.symbol,
        strategy_id: selectedStrategyId,
        strategy_name: availableStrategies.find((s) => s.id === selectedStrategyId)?.name || selectedStrategyId,
        exchange: selectedUnderlying.exchange,
        execution_mode: executionMode,
        lots,
        legs: configuredLegs,
        required_margin: payoffData?.required_margin || 0.0,
        max_profit: payoffData?.max_profit,
        max_loss: payoffData?.max_loss,
        breakevens: payoffData?.breakevens || [],
      };

      const res = await apiClient.post<any>("/api/options/order/execute", payload);
      const data = res?.data;
      if (data?.status === "SUCCESS") {
        setExecutionNotice({ type: "success", msg: `Trade executed successfully in ${executionMode} mode! Order ID: ${data.order?.order_id}` });
        // Refresh positions
        const posRes = await apiClient.get<any>("/api/options/positions");
        if (posRes?.data?.positions) setActivePositions(posRes.data.positions);
      } else {
        setExecutionNotice({ type: "error", msg: data?.message || "Order rejected by broker adapter." });
      }
    } catch (err: any) {
      setExecutionNotice({ type: "error", msg: `Execution error: ${err.message || err}` });
    } finally {
      setIsExecuting(false);
    }
  };

  // Square Off Position
  const handleSquareOff = async (posId: string) => {
    try {
      const res = await apiClient.post<any>(`/api/options/position/${posId}/squareoff`, {});
      const data = res?.data;
      if (data?.status === "SQUARED_OFF") {
        setExecutionNotice({ type: "success", msg: `Position ${posId} squared off.` });
        const posRes = await apiClient.get<any>("/api/options/positions");
        if (posRes?.data?.positions) setActivePositions(posRes.data.positions);
      }
    } catch (err: any) {
      setExecutionNotice({ type: "error", msg: `Square-off error: ${err.message || err}` });
    }
  };

  // Update Leg Field Helper
  const updateLeg = (index: number, field: string, value: any) => {
    const updated = [...configuredLegs];
    updated[index] = { ...updated[index], [field]: value };
    setConfiguredLegs(updated);
  };

  // Add Leg
  const addLeg = () => {
    const step = selectedUnderlying.step;
    const spot = selectedUnderlying.spot;
    const atm = Math.round(spot / step) * step;
    setConfiguredLegs([
      ...configuredLegs,
      {
        leg_id: `leg-${configuredLegs.length + 1}`,
        action: "BUY",
        option_type: "CE",
        strike: atm,
        expiry: selectedExpiry,
        premium: Math.round(spot * 0.02 * 100) / 100,
        lots,
        quantity: lots * selectedUnderlying.multiplier,
        delta: 0.50,
      },
    ]);
  };

  // Remove Leg
  const removeLeg = (index: number) => {
    if (configuredLegs.length <= 1) return;
    const updated = configuredLegs.filter((_, i) => i !== index);
    setConfiguredLegs(updated);
  };

  return (
    <div className="flex flex-col gap-6 text-white">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* WORKSTATION COMMAND HEADER & TELEMETRY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-lg">
            <Compass className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Multi-Market Options Workstation</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                24 Strategies
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Indian Derivatives (NSE/BSE) • Global Indices & Equities (CBOE/NASDAQ) • Crypto Options (Binance)
            </p>
          </div>
        </div>

        {/* Mode Selector & Status */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setExecutionMode("PAPER")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                executionMode === "PAPER"
                  ? "bg-cyan-500 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Paper Mode
            </button>
            <button
              onClick={() => setExecutionMode("LIVE")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                executionMode === "LIVE"
                  ? "bg-rose-500 text-white shadow-md font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Live Mode
            </button>
          </div>

          {executionMode === "LIVE" && (
            <button
              onClick={() => setLiveConfirmUnlock(!liveConfirmUnlock)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all ${
                liveConfirmUnlock
                  ? "bg-rose-500/20 border-rose-500 text-rose-300"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {liveConfirmUnlock ? <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> : <Lock className="w-3.5 h-3.5" />}
              {liveConfirmUnlock ? "Unlocked for Live" : "Unlock Live"}
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Gateway Active</span>
          </div>
        </div>
      </div>

      {/* Execution Notice */}
      {executionNotice && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            executionNotice.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : executionNotice.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {executionNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{executionNotice.msg}</span>
          </div>
          <button onClick={() => setExecutionNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5-STEP WORKFLOW TABS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
        {[
          { step: 1, title: "1. Market & Asset", desc: selectedUnderlying.symbol },
          { step: 2, title: "2. Strategy Select", desc: availableStrategies.find((s) => s.id === selectedStrategyId)?.name || selectedStrategyId },
          { step: 3, title: "3. Strikes & Premium", desc: `${configuredLegs.length} Legs` },
          { step: 4, title: "4. Capital & Risk", desc: `${lots} Lot(s)` },
          { step: 5, title: "5. Review & Execute", desc: payoffData?.nature || "Ready" },
        ].map((item) => (
          <button
            key={item.step}
            onClick={() => setCurrentStep(item.step as any)}
            className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between ${
              currentStep === item.step
                ? "bg-slate-800 border border-cyan-500/40 shadow-lg text-white"
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <span className={`text-xs font-bold uppercase tracking-wider ${currentStep === item.step ? "text-cyan-400" : "text-slate-400"}`}>
              {item.title}
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate mt-1">{item.desc}</span>
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 1: MARKET & UNDERLYING SELECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Select Market & Underlying Instrument
              </h2>
              <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {["All", "India", "Global", "Crypto"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMarket(m as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      selectedMarket === m ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search stocks, ETFs, indices (NIFTY, BANKNIFTY, SPX, AAPL, BTC/USDT)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Underlyings Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
              {filteredUnderlyings.map((u) => {
                const isSelected = selectedUnderlying.symbol === u.symbol;
                return (
                  <button
                    key={u.symbol}
                    onClick={() => setSelectedUnderlying(u)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500 text-white shadow-md ring-1 ring-cyan-500/40"
                        : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{u.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {u.exchange}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-1">{u.name}</div>
                    <div className="text-xs font-semibold text-cyan-300 mt-2">
                      {u.currency} {u.spot.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Instrument Detail Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedUnderlying.symbol}</h3>
                  <p className="text-xs text-slate-400">{selectedUnderlying.name}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedUnderlying.market}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Spot Reference</span>
                  <span className="font-bold text-cyan-400 text-sm">
                    {selectedUnderlying.currency} {selectedUnderlying.spot.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Lot Multiplier</span>
                  <span className="font-bold text-white text-sm">{selectedUnderlying.multiplier}x</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Strike Step</span>
                  <span className="font-bold text-white text-sm">{selectedUnderlying.step}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Exchange</span>
                  <span className="font-bold text-white text-sm">{selectedUnderlying.exchange}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <span>Continue to Strategy Selection</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 2: 24 STRATEGY REGISTRY SELECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Select Option Strategy (24 PDF Structures)
              </h2>
              <p className="text-xs text-slate-400">
                Visual structure definitions calibrated for {selectedUnderlying.symbol}
              </p>
            </div>

            {/* Outlook Filters */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(["ALL", "BULLISH", "BEARISH", "NEUTRAL", "VOLATILE"] as const).map((o) => (
                <button
                  key={o}
                  onClick={() => setStrategyOutlook(o)}
                  className={`px-3 py-1 font-medium rounded-lg transition-all ${
                    strategyOutlook === o ? "bg-slate-800 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
            {availableStrategies
              .filter((s) => strategyOutlook === "ALL" || s.outlook === strategyOutlook)
              .map((s) => {
                const isSelected = selectedStrategyId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStrategyId(s.id)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500 shadow-lg ring-1 ring-cyan-500/50"
                        : "bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{s.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            s.outlook === "BULLISH"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : s.outlook === "BEARISH"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : s.outlook === "NEUTRAL"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {s.outlook}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5">{s.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 font-mono text-[10px]">{s.category}</span>
                      <span
                        className={`font-semibold ${
                          s.risk_profile === "DEFINED_RISK"
                            ? "text-emerald-400"
                            : s.risk_profile === "CASH_BACKED"
                            ? "text-cyan-400"
                            : "text-rose-400"
                        }`}
                      >
                        {s.risk_profile.replace("_", " ")}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2"
            >
              <span>Configure Strikes & Premium</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 3: EXPIRY, STRIKE & PREMIUM ENGINE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Legs Configuration & Premium Selection
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Expiry:</span>
                <select
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {availableExpiries.map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Configured Legs Editor Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Strike</th>
                    <th className="py-2.5 px-3">Expiry</th>
                    <th className="py-2.5 px-3">Premium</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Delta</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {configuredLegs.map((leg, idx) => (
                    <tr key={leg.leg_id || idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3">
                        <select
                          value={leg.action}
                          onChange={(e) => updateLeg(idx, "action", e.target.value)}
                          className={`bg-slate-950 border border-slate-800 rounded px-2 py-1 font-bold ${
                            leg.action === "BUY" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={leg.option_type}
                          onChange={(e) => updateLeg(idx, "option_type", e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white"
                        >
                          <option value="CE">CALL (CE)</option>
                          <option value="PE">PUT (PE)</option>
                          <option value="STOCK">STOCK</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={leg.strike}
                          onChange={(e) => updateLeg(idx, "strike", parseFloat(e.target.value) || 0)}
                          className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{leg.expiry || selectedExpiry}</td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300">
                        {selectedUnderlying.currency} {leg.premium}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white">{leg.quantity}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{leg.delta ?? "—"}</td>
                      <td className="py-2.5 px-2 text-center">
                        <button onClick={() => removeLeg(idx)} className="text-slate-500 hover:text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={addLeg}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Leg
              </button>

              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <span>Continue to Capital & Risk</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Premium Selection Assistant */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Intelligent Premium Selector
            </h3>
            <p className="text-xs text-slate-400">
              Target options by exact premium value, delta, or range bounds
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target Method</label>
                <select
                  value={premiumMethod}
                  onChange={(e) => setPremiumMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="EXACT">Exact Target Premium</option>
                  <option value="NEAREST">Nearest Liquid Strike</option>
                  <option value="DELTA">Target Delta (e.g. 0.30)</option>
                  <option value="RANGE">Premium Range Bound</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Target Value ({selectedUnderlying.currency})
                </label>
                <input
                  type="number"
                  value={targetPremiumValue}
                  onChange={(e) => setTargetPremiumValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Execution Pricing Mode</span>
                <span className="text-emerald-400 font-semibold">Conservative Bid/Ask Fills</span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Buys use Ask price; Sells use Bid price to ensure realistic fill modeling.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 4: CAPITAL, RISK & EXIT CONFIGURATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sizing & Capital Allocation */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              Contract Sizing & Margin Allocation
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="text-xs text-slate-400 block mb-1">Lots / Quantity Stepper</label>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setLots(Math.max(1, lots - 1))}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold text-cyan-400 font-mono">{lots}</span>
                  <button
                    onClick={() => setLots(lots + 1)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-2 block">
                  Total Units: {lots * selectedUnderlying.multiplier} contracts
                </span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="text-xs text-slate-400 block mb-1">Estimated Margin Required</label>
                <span className="text-lg font-bold text-amber-400 font-mono block mt-2">
                  {selectedUnderlying.currency} {(payoffData?.required_margin || 25000).toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-400 mt-2 block">Margin Buffer: OK</span>
              </div>
            </div>
          </div>

          {/* Automated Exit Triggers */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Automated Risk & Exit Rules
              </h2>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Take-Profit Target (%)</label>
                  <input
                    type="number"
                    value={profitTargetPct}
                    onChange={(e) => setProfitTargetPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Stop-Loss Limit (%)</label>
                  <input
                    type="number"
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Trailing Stop (%)</label>
                  <input
                    type="number"
                    value={trailingStopPct}
                    onChange={(e) => setTrailingStopPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Expiry Exit (DTE)</label>
                  <input
                    type="number"
                    value={exitDte}
                    onChange={(e) => setExitDte(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center gap-2"
              >
                <span>Proceed to Review & Execution</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* STEP 5: REVIEW, LIVE PAYOFF & EXECUTION COMMAND BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentStep === 5 && (
        <div className="flex flex-col gap-6">
          {/* Analytics Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">Net Cash Flow</span>
              <span
                className={`text-sm font-bold font-mono ${
                  payoffData?.nature === "NET DEBIT" ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {selectedUnderlying.currency} {payoffData?.net_premium ?? "—"}
              </span>
              <span className="text-[10px] text-slate-400 block">{payoffData?.nature}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">Max Profit</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {payoffData?.max_profit === "UNLIMITED"
                  ? "UNLIMITED"
                  : `${selectedUnderlying.currency} ${payoffData?.max_profit ?? "—"}`}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">Max Loss</span>
              <span className="text-sm font-bold font-mono text-rose-400">
                {payoffData?.max_loss === "UNLIMITED"
                  ? "UNLIMITED"
                  : `${selectedUnderlying.currency} ${payoffData?.max_loss ?? "—"}`}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">Risk / Reward</span>
              <span className="text-sm font-bold font-mono text-cyan-400">
                {payoffData?.risk_reward_ratio ?? "1:2.5"}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">Net Delta</span>
              <span className="text-sm font-bold font-mono text-white">
                {payoffData?.aggregate_greeks?.delta ?? 0.0}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block uppercase font-semibold">Net Theta</span>
              <span className="text-sm font-bold font-mono text-amber-300">
                {payoffData?.aggregate_greeks?.theta ?? 0.0} / day
              </span>
            </div>
          </div>

          {/* Payoff Chart & Validation Results */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payoff Chart Container */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  Analytical Expiry Payoff Curve
                </h3>
                <span className="text-xs text-slate-400">
                  Breakevens: {payoffData?.breakevens?.join(", ") || "—"}
                </span>
              </div>

              {/* Simple Visual Payoff SVG */}
              <div className="w-full h-56 bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                {payoffData?.payoff_curve?.length ? (
                  <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    {/* Zero Line */}
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
                    {/* Payoff Polyline */}
                    {(() => {
                      const points = payoffData.payoff_curve;
                      const maxPnl = Math.max(100, ...points.map((p: any) => Math.abs(p.pnl)));
                      const coords = points.map((p: any, idx: number) => {
                        const x = (idx / (points.length - 1)) * 500;
                        const y = 100 - (p.pnl / maxPnl) * 80;
                        return `${x},${Math.max(10, Math.min(190, y))}`;
                      });
                      return (
                        <polyline
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="2.5"
                          points={coords.join(" ")}
                        />
                      );
                    })()}
                  </svg>
                ) : (
                  <div className="text-xs text-slate-500">Calculating payoff curve...</div>
                )}
                <div className="absolute bottom-2 left-3 text-[10px] text-slate-500">Price Spectrum (-30% to +30%)</div>
                <div className="absolute top-2 right-3 text-[10px] text-emerald-400">Profit Zone (+)</div>
                <div className="absolute bottom-2 right-3 text-[10px] text-rose-400">Loss Zone (-)</div>
              </div>
            </div>

            {/* Validation & Execution Actions */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Pre-Flight Validation Check
                </h3>
                <p className="text-xs text-slate-400 mt-1">14-Point Pre-Order Gate Check</p>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin" : ""}`} />
                    {isValidating ? "Validating Gates..." : "Run Pre-Flight Gate Check"}
                  </button>

                  {validationResult?.checks && (
                    <div className="mt-2 flex flex-col gap-1 max-h-44 overflow-y-auto pr-1">
                      {validationResult.checks.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] p-2 bg-slate-950 rounded-lg border border-slate-800"
                        >
                          <span className="text-slate-300 font-mono text-[10px]">{c.gate}</span>
                          <span
                            className={`font-bold ${
                              c.status === "PASS"
                                ? "text-emerald-400"
                                : c.status === "WARN"
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Buttons */}
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className={`w-full py-3 text-xs font-bold rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all ${
                    executionMode === "LIVE"
                      ? "bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white"
                      : "bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950"
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isExecuting
                    ? "Submitting Multi-Leg Order..."
                    : executionMode === "LIVE"
                    ? "Execute Live Multi-Leg Order"
                    : "Execute Paper Simulation Trade"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACTIVE POSITIONS & ORDERS DOCK */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Active Options Strategy Positions ({activePositions.length})</h3>
          </div>
          <span className="text-xs text-slate-400">Real-time P&L Ledger</span>
        </div>

        {activePositions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No active options positions currently open. Configure and execute a strategy above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePositions.map((pos) => (
              <div key={pos.position_id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{pos.strategy_name || pos.strategy_id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <span className="text-[11px] text-cyan-400 font-mono mt-1 block">{pos.underlying} • {pos.lots} Lot(s)</span>
                  <div className="text-[11px] text-slate-400 mt-2">
                    Entry Net: {pos.net_cash_flow} • Margin: {pos.margin_allocated}
                  </div>
                </div>

                <button
                  onClick={() => handleSquareOff(pos.position_id)}
                  className="w-full py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold"
                >
                  Square Off Position
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
