"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Shield,
  Sliders,
  TrendingUp,
  Percent,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  DollarSign,
  Activity,
  Play,
  RotateCcw,
  Check,
  Search,
  Plus,
  Trash2,
  Clock,
  ChevronRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  botId?: string;
  isEditMode?: boolean;
}

const AVAILABLE_INDICATORS = [
  { id: "ema", name: "EMA (Exponential Moving Avg)", category: "Trend", defaultParams: { period: 9, fast: 9, slow: 21 } },
  { id: "sma", name: "SMA (Simple Moving Avg)", category: "Trend", defaultParams: { period: 20 } },
  { id: "wma", name: "WMA (Weighted Moving Avg)", category: "Trend", defaultParams: { period: 14 } },
  { id: "rsi", name: "RSI (Relative Strength Index)", category: "Momentum", defaultParams: { period: 14, overbought: 70, oversold: 30 } },
  { id: "macd", name: "MACD (Moving Avg Convergence)", category: "Momentum", defaultParams: { fast: 12, slow: 26, signal: 9 } },
  { id: "vwap", name: "VWAP (Volume Weighted Avg Price)", category: "Volume", defaultParams: {} },
  { id: "atr", name: "ATR (Average True Range)", category: "Volatility", defaultParams: { period: 14, multiplier: 1.5 } },
  { id: "adx", name: "ADX (Average Directional Index)", category: "Trend", defaultParams: { period: 14, threshold: 25 } },
  { id: "bollinger", name: "Bollinger Bands", category: "Volatility", defaultParams: { period: 20, stdDev: 2.0 } },
  { id: "stochastic", name: "Stochastic Oscillator", category: "Momentum", defaultParams: { kPeriod: 14, dPeriod: 3 } },
  { id: "supertrend", name: "Supertrend Indicator", category: "Trend", defaultParams: { period: 10, multiplier: 3.0 } },
  { id: "vp", name: "Volume Profile (POC / VAH / VAL)", category: "Volume", defaultParams: { rows: 24 } },
  { id: "pivot_points", name: "Pivot Points (Standard)", category: "Support/Resistance", defaultParams: { method: "standard" } },
  { id: "oi", name: "Open Interest & OI Delta", category: "Derivatives", defaultParams: {} },
  { id: "funding", name: "Perpetual Funding Rate", category: "Derivatives", defaultParams: {} },
];

export function CreateBotWizard({ botId, isEditMode = false }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [indicatorSearch, setIndicatorSearch] = useState<string>("");

  // Step 1: Identity & Market
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [groupName, setGroupName] = useState<string>("Crypto Scalping Bots");
  const [assetClass, setAssetClass] = useState<string>("CRYPTO");
  const [exchange, setExchange] = useState<string>("ccxt_binance");
  const [symbol, setSymbol] = useState<string>("BTC/USDT");
  const [timeframe, setTimeframe] = useState<string>("5m");
  const [strategy, setStrategy] = useState<string>("EMA_MACD_VP");
  const [strategyType, setStrategyType] = useState<string>("STANDARD");
  const [executionMode, setExecutionMode] = useState<string>("PAPER");

  // Step 2: Capital & Risk
  const [availableCapital, setAvailableCapital] = useState<number>(10000);
  const [maxPerTrade, setMaxPerTrade] = useState<number>(1000);
  const [maxPerStrategy, setMaxPerStrategy] = useState<number>(5000);
  const [maxTotalExposure, setMaxTotalExposure] = useState<number>(8000);
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(2.0);
  const [stopLossPct, setStopLossPct] = useState<number>(1.5);
  const [profitTargetPct, setProfitTargetPct] = useState<number>(3.0);
  const [autoSquareOffScope, setAutoSquareOffScope] = useState<string>("per_trade");
  const [trailingStopEnabled, setTrailingStopEnabled] = useState<boolean>(false);
  const [trailingStopDistance, setTrailingStopDistance] = useState<number>(1.0);

  // Step 3: Indicators & Combiner
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["ema", "macd", "rsi", "vp"]);
  const [indicatorOperator, setIndicatorOperator] = useState<"AND" | "OR">("AND");
  const [useScoring, setUseScoring] = useState<boolean>(false);
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(80);
  const [confirmationTf, setConfirmationTf] = useState<string>("15m");
  const [trendTf, setTrendTf] = useState<string>("1h");
  const [higherTf, setHigherTf] = useState<string>("4h");

  // Step 4: Leverage & Lots / Derivatives
  const [leverage, setLeverage] = useState<number>(1.0);
  const [lotSize, setLotSize] = useState<number>(1);
  const [lotsCount, setLotsCount] = useState<number>(1);
  const [optionsExpiry, setOptionsExpiry] = useState<string>("2026-08-28");
  const [optionsStrikeType, setOptionsStrikeType] = useState<string>("ATM");
  const [optionsStrategyCombo, setOptionsStrategyCombo] = useState<string>("Bull Call Spread");

  // Step 5: Validation & Success
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const currencySymbol = assetClass === "INDIAN_STOCKS" ? "₹" : "$";

  // Fetch existing config if in Edit Mode
  const { data: existingBotData, isLoading: isBotLoading } = useQuery({
    queryKey: ["botConfig", botId],
    queryFn: async () => {
      if (!botId) return null;
      const res = await fetch(`/api/bots/${botId}/config`);
      if (!res.ok) throw new Error("Failed to load bot configuration");
      return res.json();
    },
    enabled: isEditMode && !!botId,
  });

  useEffect(() => {
    if (existingBotData?.bot) {
      const b = existingBotData.bot;
      const c = b.config || {};
      setName(b.name || "");
      setSymbol(b.symbol || "BTC/USDT");
      setStrategy(b.strategy || "EMA_MACD_VP");
      setTimeframe(b.timeframe || "5m");
      setAssetClass(b.asset_class || "CRYPTO");
      setExchange(b.exchange || "ccxt_binance");
      setExecutionMode(b.execution_mode || "PAPER");
      setAvailableCapital(b.allocated_capital || 10000);
      setGroupName(b.group_name || "Crypto Scalping Bots");
      if (c.stop_loss_pct) setStopLossPct(c.stop_loss_pct);
      if (c.profit_target_pct) setProfitTargetPct(c.profit_target_pct);
      if (c.leverage) setLeverage(c.leverage);
      if (c.lot_size) setLotSize(c.lot_size);
      if (c.lots_count) setLotsCount(c.lots_count);
      if (c.strategy_type) setStrategyType(c.strategy_type);
      if (c.indicators) setSelectedIndicators(c.indicators);
    }
  }, [existingBotData]);

  // Live Calculations
  const totalQuantity = useMemo(() => lotSize * lotsCount, [lotSize, lotsCount]);
  const estimatedPrice = useMemo(() => (symbol.includes("BTC") ? 64500 : symbol.includes("ETH") ? 3400 : 100), [symbol]);
  const estimatedNotional = useMemo(() => Math.round(totalQuantity * estimatedPrice * 100) / 100, [totalQuantity, estimatedPrice]);
  const requiredMargin = useMemo(() => Math.round((estimatedNotional / Math.max(1, leverage)) * 100) / 100, [estimatedNotional, leverage]);
  const estimatedMaxLoss = useMemo(() => Math.round(estimatedNotional * (stopLossPct / 100) * 100) / 100, [estimatedNotional, stopLossPct]);
  const estimatedMaxProfit = useMemo(() => Math.round(estimatedNotional * (profitTargetPct / 100) * 100) / 100, [estimatedNotional, profitTargetPct]);
  const riskRewardRatio = useMemo(() => (estimatedMaxLoss > 0 ? (estimatedMaxProfit / estimatedMaxLoss).toFixed(2) : "2.00"), [estimatedMaxProfit, estimatedMaxLoss]);

  // Capital Calculations
  const simulatedUsedCapital = useMemo(() => Math.min(availableCapital, requiredMargin), [availableCapital, requiredMargin]);
  const remainingCapital = useMemo(() => Math.max(0, availableCapital - simulatedUsedCapital), [availableCapital, simulatedUsedCapital]);
  const utilizationPct = useMemo(() => (availableCapital > 0 ? ((simulatedUsedCapital / availableCapital) * 100).toFixed(1) : "0.0"), [availableCapital, simulatedUsedCapital]);

  // Pre-flight validation query
  const { data: validationData } = useQuery({
    queryKey: ["botValidation", name, symbol, availableCapital, stopLossPct, profitTargetPct, leverage, lotSize, lotsCount],
    queryFn: async () => {
      const res = await fetch("/api/bots/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "TestBot",
          symbol,
          allocated_capital: availableCapital,
          stop_loss_pct: stopLossPct,
          profit_target_pct: profitTargetPct,
          leverage,
          lot_size: lotSize,
          lots_count: lotsCount,
          asset_class: assetClass,
          execution_mode: executionMode,
          estimated_price: estimatedPrice
        }),
      });
      return res.json();
    },
    enabled: !!name && !!symbol,
    refetchInterval: false,
  });

  // Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        group_name: groupName,
        asset_class: assetClass,
        exchange,
        symbol,
        timeframe,
        strategy,
        strategy_type: strategyType,
        execution_mode: executionMode,
        allocated_capital: availableCapital,
        risk_pct: riskPerTradePct,
        stop_loss_pct: stopLossPct,
        profit_target_pct: profitTargetPct,
        auto_square_off: {
          enabled: true,
          scope: autoSquareOffScope,
          on_target: true,
          on_sl: true,
        },
        trailing_stop: {
          enabled: trailingStopEnabled,
          method: "percent",
          distance_pct: trailingStopDistance,
        },
        leverage,
        lot_size: lotSize,
        lots_count: lotsCount,
        quantity: totalQuantity,
        capital_allocation: {
          max_per_trade: maxPerTrade,
          max_per_strategy: maxPerStrategy,
          max_total_exposure: maxTotalExposure,
        },
        indicators: selectedIndicators,
        indicator_combination: {
          rules: selectedIndicators.map((ind) => `${ind.toUpperCase()} ACTIVE`),
          operator: indicatorOperator,
          min_score: minScoreThreshold,
          use_scoring: useScoring,
        },
        multi_timeframe: {
          entry_tf: timeframe,
          confirmation_tf: confirmationTf,
          trend_tf: trendTf,
          higher_tf: higherTf,
        },
        options_config: strategyType === "OPTIONS" ? {
          expiry: optionsExpiry,
          strike_type: optionsStrikeType,
          combo: optionsStrategyCombo,
        } : {},
        futures_config: strategyType === "FUTURES" ? {
          leverage,
          basis: 0.15,
        } : {},
      };

      const url = isEditMode ? `/api/bots/${botId}` : "/api/bots/create";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to save bot instance");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      setSuccessMessage(data.message || "Bot instance saved successfully!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Error saving bot instance");
    },
  });

  const filteredIndicators = AVAILABLE_INDICATORS.filter(
    (i) =>
      i.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
      i.category.toLowerCase().includes(indicatorSearch.toLowerCase())
  );

  const toggleIndicator = (id: string) => {
    setSelectedIndicators((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Bot className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {isEditMode ? `Edit Bot Instance: ${name || botId}` : "Create New Bot Instance"}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                {isEditMode ? "CONFIG VERSIONING ACTIVE" : "MULTI-ASSET QUANT WIZARD"}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure independent capital allocation, risk bounds, multi-timeframe indicators, options/futures legs, and auto square-off rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-4 shadow-lg">
        <div className="grid grid-cols-5 gap-2">
          {[
            { step: 1, label: "Identity & Market", icon: Bot },
            { step: 2, label: "Capital & Risk", icon: DollarSign },
            { step: 3, label: "Indicators & Logic", icon: Sliders },
            { step: 4, label: "Leverage & Derivatives", icon: Zap },
            { step: 5, label: "Summary & Launch", icon: CheckCircle2 },
          ].map((s) => {
            const Icon = s.icon;
            const isCurrent = activeStep === s.step;
            const isCompleted = activeStep > s.step;

            return (
              <button
                key={s.step}
                onClick={() => setActiveStep(s.step)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/30"
                    : isCompleted
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                    : "bg-[#0B0F17] border-[#1E293B] text-slate-500 hover:text-slate-300"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? "bg-cyan-500 text-black"
                      : isCompleted
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : s.step}
                </div>
                <div className="hidden md:block">
                  <div className="text-[10px] font-mono text-slate-400">Step {s.step}</div>
                  <div className="text-xs font-semibold leading-tight">{s.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{successMessage} Redirecting to Dashboard...</span>
        </div>
      )}

      {/* STEP 1: IDENTITY & MARKET */}
      {activeStep === 1 && (
        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <Bot className="h-4 w-4 text-cyan-400" />
            Step 1: Bot Identity & Market Selection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bot Instance Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alpha BTC Scalper 5m"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bot Group / Portfolio Folder</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Crypto Scalping Bots"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Asset Class</label>
              <select
                value={assetClass}
                onChange={(e) => {
                  setAssetClass(e.target.value);
                  if (e.target.value === "INDIAN_STOCKS") setSymbol("RELIANCE");
                  else if (e.target.value === "OPTIONS") { setSymbol("BTC-260327-70000-C"); setStrategyType("OPTIONS"); }
                  else if (e.target.value === "FUTURES") { setSymbol("BTC/USDT:USDT"); setStrategyType("FUTURES"); }
                  else setSymbol("BTC/USDT");
                }}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="CRYPTO">Crypto (Spot & Perps)</option>
                <option value="INDIAN_STOCKS">Indian Equities (NSE / BSE in ₹)</option>
                <option value="US_STOCKS">US Equities (NASDAQ / NYSE in $)</option>
                <option value="OPTIONS">Options Derivatives (Index & Crypto)</option>
                <option value="FUTURES">Futures Contracts (Perpetuals & Dated)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Trading Pair / Symbol *</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. BTC/USDT, RELIANCE, NIFTY"
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="EMA_MACD_VP">EMA Cross + MACD + Volume Profile</option>
                <option value="RSI_MEAN_REVERSION">RSI Extreme Mean Reversion</option>
                <option value="SUPERTREND_BREAKOUT">Supertrend Volatility Breakout</option>
                <option value="BOLLINGER_SQUEEZE">Bollinger Bands Squeeze</option>
                <option value="OPTIONS_DELTA_NEUTRAL">Options Delta-Neutral Straddle/Strangle</option>
                <option value="CUSTOM_MULTI_INDICATOR">Custom Multi-Indicator Confluence</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Execution Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {["BACKTEST", "PAPER", "LIVE"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setExecutionMode(mode)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      executionMode === mode
                        ? mode === "LIVE"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/50"
                          : "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                        : "bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CAPITAL & RISK */}
      {activeStep === 2 && (
        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <DollarSign className="h-4 w-4 text-cyan-400" />
            Step 2: Capital Allocation & Auto Square-Off Safeguards
          </h2>

          {/* Live Capital Utilization Meter */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#0B0F17] p-4 rounded-xl border border-[#1E293B]">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Available Capital</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">{currencySymbol}{availableCapital.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Used Capital (Simulated)</div>
              <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">{currencySymbol}{simulatedUsedCapital.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Remaining Capital</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{currencySymbol}{remainingCapital.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-mono">Utilization %</div>
              <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">{utilizationPct}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Total Available Capital ({currencySymbol}) *</label>
              <input
                type="number"
                value={availableCapital}
                onChange={(e) => setAvailableCapital(Math.max(100, parseFloat(e.target.value) || 0))}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Capital Per Trade ({currencySymbol})</label>
              <input
                type="number"
                value={maxPerTrade}
                onChange={(e) => setMaxPerTrade(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Total Exposure Cap ({currencySymbol})</label>
              <input
                type="number"
                value={maxTotalExposure}
                onChange={(e) => setMaxTotalExposure(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-3 border-t border-[#1E293B]">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Stop-Loss % (Auto Square-Off) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={stopLossPct}
                  onChange={(e) => setStopLossPct(parseFloat(e.target.value) || 0.1)}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-rose-400 font-mono focus:border-rose-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">%</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                LONG SL = Entry × (1 - {stopLossPct}%)
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Profit Target % (Auto Square-Off) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={profitTargetPct}
                  onChange={(e) => setProfitTargetPct(parseFloat(e.target.value) || 0.1)}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">%</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                TP Target = Entry × (1 + {profitTargetPct}%)
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Auto Square-Off Scope</label>
              <select
                value={autoSquareOffScope}
                onChange={(e) => setAutoSquareOffScope(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="per_trade">Per Trade Position (Default)</option>
                <option value="per_strategy">Per Strategy Level</option>
                <option value="entire_bot">Entire Bot Instance Portfolio</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: INDICATORS & COMBINATIONS */}
      {activeStep === 3 && (
        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#1E293B] pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              Step 3: Searchable Indicator Library & Condition Combiner
            </h2>

            <div className="relative w-full md:w-64">
              <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search 20+ indicators..."
                value={indicatorSearch}
                onChange={(e) => setIndicatorSearch(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Indicator Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {filteredIndicators.map((ind) => {
              const isSelected = selectedIndicators.includes(ind.id);
              return (
                <div
                  key={ind.id}
                  onClick={() => toggleIndicator(ind.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-2 ${
                    isSelected
                      ? "bg-cyan-950/40 border-cyan-500/50 text-white shadow-sm"
                      : "bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                      {ind.name}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono mt-1 inline-block">
                      {ind.category}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${
                      isSelected ? "bg-cyan-500 text-black" : "border border-slate-700"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logic Combiner & Multi-Timeframe */}
          <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#1E293B] space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Confluence Logic & Multi-Timeframe Filters
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Combination Rule</label>
                <div className="flex items-center gap-2">
                  {(["AND", "OR"] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setIndicatorOperator(op)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${
                        indicatorOperator === op
                          ? "bg-cyan-500 text-black border-cyan-400"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      {op} (Match All/Any)
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Confirmation Timeframe</label>
                <select
                  value={confirmationTf}
                  onChange={(e) => setConfirmationTf(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m (Recommended)</option>
                  <option value="30m">30m</option>
                  <option value="1h">1h</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Trend Filter Timeframe</label>
                <select
                  value={trendTf}
                  onChange={(e) => setTrendTf(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="15m">15m</option>
                  <option value="1h">1h (Standard)</option>
                  <option value="4h">4h (Swing Trend)</option>
                  <option value="1d">1d (Macro Filter)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Higher-TF Macro Filter</label>
                <select
                  value={higherTf}
                  onChange={(e) => setHigherTf(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="4h">4h (Default)</option>
                  <option value="1d">1d (Daily Macro)</option>
                  <option value="1w">1w (Weekly Macro)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: LEVERAGE & DERIVATIVES */}
      {activeStep === 4 && (
        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <Zap className="h-4 w-4 text-cyan-400" />
            Step 4: Leverage Bounds, Contract Lot Size & Derivatives
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Leverage Multiplier ({leverage}x)</label>
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 5, 10, 20].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLeverage(l)}
                    className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition ${
                      leverage === l
                        ? "bg-cyan-500 text-black border-cyan-400"
                        : "bg-[#0B0F17] border-[#1E293B] text-slate-400 hover:text-white"
                    }`}
                  >
                    {l}x
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Leverage is strictly validated against provider margin limits.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contract Lot Size & Quantity</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Contract Lot Size</span>
                  <input
                    type="number"
                    value={lotSize}
                    onChange={(e) => setLotSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Lots Count</span>
                  <input
                    type="number"
                    value={lotsCount}
                    onChange={(e) => setLotsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
              <div className="text-[10px] text-cyan-400 font-mono mt-1">
                Total Execution Quantity: {totalQuantity} units
              </div>
            </div>
          </div>

          {/* Options Studio Section if Strategy is Options */}
          {strategyType === "OPTIONS" && (
            <div className="bg-[#0B0F17] p-4 rounded-xl border border-cyan-500/30 space-y-4">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Crypto & Index Options Studio Parameters
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Target Expiry Date</label>
                  <input
                    type="date"
                    value={optionsExpiry}
                    onChange={(e) => setOptionsExpiry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Dynamic Strike Selection</label>
                  <select
                    value={optionsStrikeType}
                    onChange={(e) => setOptionsStrikeType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="ATM">ATM (At-The-Money)</option>
                    <option value="ATM+1">ATM + 1 Strike (OTM Call / ITM Put)</option>
                    <option value="ATM-1">ATM - 1 Strike (ITM Call / OTM Put)</option>
                    <option value="OTM5%">5% OTM Strike</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Multi-Leg Strategy Template</label>
                  <select
                    value={optionsStrategyCombo}
                    onChange={(e) => setOptionsStrategyCombo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Bull Call Spread">Bull Call Spread</option>
                    <option value="Bear Put Spread">Bear Put Spread</option>
                    <option value="Straddle">Delta-Neutral Straddle</option>
                    <option value="Iron Condor">Iron Condor (4-Leg Range)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: SUMMARY & LAUNCH */}
      {activeStep === 5 && (
        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1E293B] pb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Step 5: Pre-Flight Risk & Execution Summary
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Summary Metrics */}
            <div className="bg-[#0B0F17] p-5 rounded-xl border border-[#1E293B] space-y-3 font-mono text-xs">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider pb-2 border-b border-slate-800">
                Instance Specs
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Bot Name:</span>
                <span className="text-white font-bold">{name || "Unnamed Bot"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Market / Symbol:</span>
                <span className="text-cyan-400 font-bold">{symbol} ({assetClass})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Execution Mode:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  executionMode === "LIVE" ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"
                }`}>
                  {executionMode}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Available Capital:</span>
                <span className="text-white font-bold">{currencySymbol}{availableCapital.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Leverage:</span>
                <span className="text-white font-bold">{leverage}x</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Quantity / Lots:</span>
                <span className="text-white font-bold">{totalQuantity} units ({lotsCount} lots)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Indicators:</span>
                <span className="text-slate-300">{selectedIndicators.join(", ") || "None"}</span>
              </div>
            </div>

            {/* Right: Risk Calculations */}
            <div className="bg-[#0B0F17] p-5 rounded-xl border border-cyan-500/30 space-y-3 font-mono text-xs">
              <div className="text-cyan-300 text-xs font-bold uppercase tracking-wider pb-2 border-b border-slate-800">
                Estimated Risk & Margin Bounds
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Estimated Notional:</span>
                <span className="text-white font-bold">{currencySymbol}{estimatedNotional.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Required Margin:</span>
                <span className="text-cyan-400 font-bold">{currencySymbol}{requiredMargin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Stop-Loss Risk ({stopLossPct}%):</span>
                <span className="text-rose-400 font-bold">-{currencySymbol}{estimatedMaxLoss.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-900">
                <span className="text-slate-500">Profit Target ({profitTargetPct}%):</span>
                <span className="text-emerald-400 font-bold">+{currencySymbol}{estimatedMaxProfit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Risk : Reward Ratio:</span>
                <span className="text-amber-400 font-bold">1 : {riskRewardRatio}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={() => router.push(`/backtest?symbol=${encodeURIComponent(symbol)}&strategy=${encodeURIComponent(strategy)}`)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Backtest Configuration First
            </button>

            <button
              type="button"
              disabled={saveMutation.isPending || !name}
              onClick={() => saveMutation.mutate()}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" />
              {saveMutation.isPending ? "Saving..." : isEditMode ? "Update Bot Instance (Save Version)" : "Create Bot Instance"}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Buttons (Bottom) */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          disabled={activeStep === 1}
          onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous Step
        </button>

        {activeStep < 5 ? (
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.min(5, prev + 1))}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-500/20"
          >
            Next: Step {activeStep + 1}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
