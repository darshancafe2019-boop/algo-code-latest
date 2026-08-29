"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Bot,
  Layers,
  Shield,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Search,
  Plus,
  Trash2,
  TrendingUp,
  Percent,
  Activity,
  Check,
  Building2,
  Coins,
  Cpu,
  Clock,
  Briefcase,
  SlidersHorizontal,
  Bookmark,
  ChevronDown,
  Info,
  Lock,
  Globe
} from "lucide-react";
import {
  WizardAssetClass,
  BotExecutionMode,
  IndicatorConfigItem,
  StrategyRuleItem,
  calculateRemainingCapital,
  calculateAllocationPct,
  calculateRiskAmount,
  calculateRiskRewardRatio,
  formatCurrency,
} from "@/types/bot-control";

interface CreateBotWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (botName: string) => void;
}

const ASSET_CLASSES: { id: WizardAssetClass; label: string; icon: any; desc: string }[] = [
  { id: "INDEX", label: "Index", icon: TrendingUp, desc: "NIFTY 50, Bank Nifty, S&P 500" },
  { id: "STOCKS", label: "Stocks", icon: Building2, desc: "Cash Equities & Global Shares" },
  { id: "OPTIONS", label: "Options", icon: Layers, desc: "Index & Stock Options Spreads" },
  { id: "FUTURES", label: "Futures", icon: Activity, desc: "Perpetual & Dated Futures" },
  { id: "CRYPTO", label: "Crypto", icon: Coins, desc: "Spot & Perpetual Crypto Pairs" },
  { id: "CRYPTO_OPTIONS", label: "Crypto Options", icon: Zap, desc: "Deribit, Binance & OKX Chains" },
  { id: "COMMODITIES", label: "Commodities", icon: Globe, desc: "Gold, Silver, Crude Oil (MCX)" },
  { id: "FOREX", label: "Forex", icon: DollarSign, desc: "Major & Cross Currency Pairs" },
  { id: "ETF", label: "ETF", icon: Briefcase, desc: "Sector & Index Exchange Funds" },
];

const POPULAR_INSTRUMENTS: Record<WizardAssetClass, { symbol: string; name: string; exchange: string }[]> = {
  INDEX: [
    { symbol: "NIFTY 50", name: "Nifty 50 Benchmark Index", exchange: "NSE" },
    { symbol: "BANKNIFTY", name: "Nifty Bank Index", exchange: "NSE" },
    { symbol: "FINNIFTY", name: "Nifty Financial Services", exchange: "NSE" },
    { symbol: "MIDCPNIFTY", name: "Nifty Midcap Select", exchange: "NSE" },
    { symbol: "SENSEX", name: "BSE SENSEX 30 Index", exchange: "BSE" },
    { symbol: "NASDAQ 100", name: "Nasdaq 100 US Index", exchange: "NASDAQ" },
    { symbol: "S&P 500", name: "Standard & Poor's 500", exchange: "CBOE" },
    { symbol: "DOW JONES", name: "Dow Jones Industrial Avg", exchange: "NYSE" },
  ],
  STOCKS: [
    { symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE" },
    { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE" },
    { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE" },
    { symbol: "INFY", name: "Infosys Technologies Ltd", exchange: "NSE" },
    { symbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE" },
    { symbol: "SBIN", name: "State Bank of India", exchange: "NSE" },
    { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
    { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
    { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
    { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ" },
  ],
  OPTIONS: [
    { symbol: "NIFTY 24400 CE", name: "Nifty 24,400 Weekly CALL", exchange: "NSE" },
    { symbol: "NIFTY 24400 PE", name: "Nifty 24,400 Weekly PUT", exchange: "NSE" },
    { symbol: "BANKNIFTY 51000 CE", name: "Bank Nifty 51,000 Weekly CALL", exchange: "NSE" },
    { symbol: "FINNIFTY 23000 CE", name: "Fin Nifty 23,000 CALL", exchange: "NSE" },
    { symbol: "RELIANCE 3000 CE", name: "Reliance 3,000 Monthly CALL", exchange: "NSE" },
  ],
  FUTURES: [
    { symbol: "NIFTY-FUT", name: "Nifty 50 Index Futures", exchange: "NFO" },
    { symbol: "BANKNIFTY-FUT", name: "Bank Nifty Index Futures", exchange: "NFO" },
    { symbol: "BTC-PERP", name: "Bitcoin Perpetual Futures", exchange: "BINANCE" },
    { symbol: "ETH-PERP", name: "Ethereum Perpetual Futures", exchange: "BINANCE" },
    { symbol: "SOL-PERP", name: "Solana Perpetual Futures", exchange: "BYBIT" },
  ],
  CRYPTO: [
    { symbol: "BTC/USDT", name: "Bitcoin / Tether Spot", exchange: "BINANCE" },
    { symbol: "ETH/USDT", name: "Ethereum / Tether Spot", exchange: "BINANCE" },
    { symbol: "SOL/USDT", name: "Solana / Tether Spot", exchange: "BINANCE" },
    { symbol: "PEPE/USDT", name: "Pepe / Tether Spot", exchange: "BINANCE" },
    { symbol: "AVAX/USDT", name: "Avalanche / Tether Spot", exchange: "BINANCE" },
    { symbol: "LINK/USDT", name: "Chainlink / Tether Spot", exchange: "BINANCE" },
  ],
  CRYPTO_OPTIONS: [
    { symbol: "BTC-260925-70000-C", name: "Bitcoin 70,000 CALL (Sep 2026)", exchange: "BINANCE" },
    { symbol: "BTC-260925-65000-P", name: "Bitcoin 65,000 PUT (Sep 2026)", exchange: "BINANCE" },
    { symbol: "ETH-260925-3500-C", name: "Ethereum 3,500 CALL (Sep 2026)", exchange: "BINANCE" },
    { symbol: "SOL-260925-150-C", name: "Solana 150 CALL (Sep 2026)", exchange: "BINANCE" },
  ],
  COMMODITIES: [
    { symbol: "GOLD", name: "Gold Standard Futures / Options", exchange: "MCX" },
    { symbol: "SILVER", name: "Silver Standard Futures", exchange: "MCX" },
    { symbol: "CRUDEOIL", name: "Crude Oil Futures (100 bbl)", exchange: "MCX" },
    { symbol: "NATURALGAS", name: "Natural Gas Mini Futures", exchange: "MCX" },
    { symbol: "COPPER", name: "Copper Futures Contract", exchange: "MCX" },
  ],
  FOREX: [
    { symbol: "EUR/USD", name: "Euro / US Dollar", exchange: "FX_SPOT" },
    { symbol: "GBP/USD", name: "British Pound / US Dollar", exchange: "FX_SPOT" },
    { symbol: "USD/INR", name: "US Dollar / Indian Rupee", exchange: "NSE_CDS" },
    { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", exchange: "FX_SPOT" },
    { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", exchange: "FX_SPOT" },
  ],
  ETF: [
    { symbol: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", exchange: "NSE" },
    { symbol: "GOLDBEES", name: "Nippon India ETF Gold BeES", exchange: "NSE" },
    { symbol: "BANKBEES", name: "Nippon India ETF Bank BeES", exchange: "NSE" },
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE" },
    { symbol: "QQQ", name: "Invesco QQQ Trust (Nasdaq-100)", exchange: "NASDAQ" },
  ],
};

const ALL_TIMEFRAMES = [
  { id: "1m", label: "1m", desc: "1 Minute (Scalping)" },
  { id: "3m", label: "3m", desc: "3 Minutes" },
  { id: "5m", label: "5m", desc: "5 Minutes (Intraday)" },
  { id: "10m", label: "10m", desc: "10 Minutes" },
  { id: "15m", label: "15m", desc: "15 Minutes (Short-Term)" },
  { id: "30m", label: "30m", desc: "30 Minutes" },
  { id: "45m", label: "45m", desc: "45 Minutes" },
  { id: "1h", label: "1h", desc: "1 Hour (Trend Confirmation)" },
  { id: "2h", label: "2h", desc: "2 Hours" },
  { id: "3h", label: "3h", desc: "3 Hours" },
  { id: "4h", label: "4h", desc: "4 Hours (Swing Trend)" },
  { id: "6h", label: "6h", desc: "6 Hours" },
  { id: "8h", label: "8h", desc: "8 Hours" },
  { id: "12h", label: "12h", desc: "12 Hours" },
  { id: "1d", label: "1d", desc: "1 Day (Macro Regime)" },
  { id: "1w", label: "1w", desc: "1 Week" },
  { id: "1M", label: "1M", desc: "1 Month (Macro Cycle)" },
];

const AVAILABLE_INDICATORS = [
  { id: "ema_fast", name: "EMA (Fast)", category: "Trend" as const, defaultParams: { period: 9, source: "close" } },
  { id: "ema_slow", name: "EMA (Slow)", category: "Trend" as const, defaultParams: { period: 21, source: "close" } },
  { id: "ema_trend", name: "EMA (Macro Trend 200)", category: "Trend" as const, defaultParams: { period: 200, source: "close" } },
  { id: "sma_20", name: "SMA (Simple Moving Avg 20)", category: "Trend" as const, defaultParams: { period: 20, source: "close" } },
  { id: "rsi_14", name: "RSI (Relative Strength 14)", category: "Momentum" as const, defaultParams: { period: 14, overbought: 70, oversold: 30 } },
  { id: "macd", name: "MACD (12, 26, 9)", category: "Momentum" as const, defaultParams: { fast: 12, slow: 26, signal: 9 } },
  { id: "vwap", name: "VWAP (Volume Weighted Avg Price)", category: "Volume" as const, defaultParams: { anchor: "session" } },
  { id: "atr_14", name: "ATR (Average True Range)", category: "Volatility" as const, defaultParams: { period: 14, multiplier: 1.5 } },
  { id: "adx_14", name: "ADX (Trend Strength)", category: "Trend" as const, defaultParams: { period: 14, threshold: 25 } },
  { id: "bollinger", name: "Bollinger Bands (20, 2.0)", category: "Volatility" as const, defaultParams: { period: 20, stdDev: 2.0 } },
  { id: "supertrend", name: "Supertrend (10, 3.0)", category: "Trend" as const, defaultParams: { period: 10, multiplier: 3.0 } },
  { id: "volume_ma", name: "Volume (20-Period MA)", category: "Volume" as const, defaultParams: { period: 20 } },
  { id: "vp_poc", name: "Volume Profile POC / VAH / VAL", category: "Volume" as const, defaultParams: { rows: 24 } },
  { id: "pivot_points", name: "Pivot Points (Standard)", category: "Support/Resistance" as const, defaultParams: { method: "standard" } },
  { id: "stochastic", name: "Stochastic Oscillator (14, 3, 3)", category: "Momentum" as const, defaultParams: { kPeriod: 14, dPeriod: 3 } },
];

export function CreateBotWizardModal({ isOpen, onClose, onSuccess }: CreateBotWizardModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<number>(1);

  // STEP 1: IDENTITY & CAPITAL
  const [name, setName] = useState("BTC Quantitative Momentum Bot");
  const [description, setDescription] = useState("Deterministic multi-timeframe trend & volume confluence bot");
  const [groupName, setGroupName] = useState("Crypto Scalping Bots");
  const [customGroup, setCustomGroup] = useState("");
  const [isCreatingCustomGroup, setIsCreatingCustomGroup] = useState(false);
  const [environment, setEnvironment] = useState<BotExecutionMode>("PAPER");
  const [currency, setCurrency] = useState<"INR" | "USDT" | "USD">("USDT");
  const [totalCapital, setTotalCapital] = useState<number>(50000);
  const [allocatedCapital, setAllocatedCapital] = useState<number>(10000);

  // STEP 2: MARKET & INSTRUMENT
  const [assetClass, setAssetClass] = useState<WizardAssetClass>("CRYPTO");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [exchange, setExchange] = useState("ccxt_binance");

  // Derivatives specific
  const [optionSide, setOptionSide] = useState<"CALL" | "PUT" | "BOTH">("BOTH");
  const [callPremiumMin, setCallPremiumMin] = useState<number | null>(50);
  const [callPremiumMax, setCallPremiumMax] = useState<number | null>(200);
  const [callNoLimit, setCallNoLimit] = useState(false);
  const [putPremiumMin, setPutPremiumMin] = useState<number | null>(50);
  const [putPremiumMax, setPutPremiumMax] = useState<number | null>(200);
  const [putNoLimit, setPutNoLimit] = useState(false);
  const [optionExpiry, setOptionExpiry] = useState("Nearest Weekly");
  const [strikeMode, setStrikeMode] = useState<"ATM" | "ITM" | "OTM" | "CUSTOM">("ATM");
  const [strikeOffset, setStrikeOffset] = useState<number>(0);
  const [indexPremiumMin, setIndexPremiumMin] = useState<number | null>(50);
  const [indexPremiumMax, setIndexPremiumMax] = useState<number | null>(300);
  const [futuresPremiumMin, setFuturesPremiumMin] = useState<number | null>(null);
  const [futuresPremiumMax, setFuturesPremiumMax] = useState<number | null>(null);

  // Crypto Options specific
  const [cryptoOptExchange, setCryptoOptExchange] = useState("deribit");
  const [cryptoOptUnderlying, setCryptoOptUnderlying] = useState("BTC");
  const [cryptoOptType, setCryptoOptType] = useState<"CALL" | "PUT" | "BOTH">("BOTH");
  const [cryptoOptExpiry, setCryptoOptExpiry] = useState("2026-08-28");
  const [cryptoOptStrike, setCryptoOptStrike] = useState("65000");

  // STEP 3: TIMEFRAME & INDICATOR ENGINE
  const [primaryTimeframe, setPrimaryTimeframe] = useState<string>("5m");
  const [additionalTimeframes, setAdditionalTimeframes] = useState<string[]>(["15m", "1h"]);
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfigItem[]>([
    { id: "ema_fast", name: "EMA (Fast 9)", category: "Trend", timeframe: "5m", params: { period: 9, source: "close" } },
    { id: "ema_slow", name: "EMA (Slow 21)", category: "Trend", timeframe: "5m", params: { period: 21, source: "close" } },
    { id: "rsi_14", name: "RSI (14)", category: "Momentum", timeframe: "5m", params: { period: 14, overbought: 70, oversold: 30 } },
    { id: "vwap", name: "VWAP", category: "Volume", timeframe: "5m", params: { anchor: "session" } },
  ]);
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [ruleOperator, setRuleOperator] = useState<"AND" | "OR">("AND");
  const [strategyRules, setStrategyRules] = useState<StrategyRuleItem[]>([
    { id: "rule-1", leftIndicatorId: "ema_fast", operator: ">", rightType: "INDICATOR", rightIndicatorId: "ema_slow", isMandatory: true },
    { id: "rule-2", leftIndicatorId: "rsi_14", operator: ">", rightType: "THRESHOLD", rightValue: 55, isMandatory: true },
    { id: "rule-3", leftIndicatorId: "vwap", operator: ">=", rightType: "THRESHOLD", rightValue: 0, isMandatory: false },
  ]);
  const [confluenceThresholdPct, setConfluenceThresholdPct] = useState<number>(80);

  // STEP 4: RISK & EXIT MANAGEMENT
  const [stopLossPct, setStopLossPct] = useState<number>(1.0);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(2.0);
  const [trailingStopEnabled, setTrailingStopEnabled] = useState<boolean>(true);
  const [trailingStopPct, setTrailingStopPct] = useState<number>(0.5);
  const [activationProfitPct, setActivationProfitPct] = useState<number>(1.0);
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(1.0);
  const [maxDailyDrawdownPct, setMaxDailyDrawdownPct] = useState<number>(3.0);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(3);

  // STEP 5: BROKER & EXECUTION
  const [brokerId, setBrokerId] = useState<string>("paper_simulator");
  const [accountId, setAccountId] = useState<string>("ACC-PRIMARY-01");
  const [leverage, setLeverage] = useState<number>(2.0);
  const [executionMode, setExecutionMode] = useState<"MANUAL" | "AUTOMATIC">("MANUAL");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP-LIMIT">("MARKET");
  const [maxSlippagePct, setMaxSlippagePct] = useState<number>(0.2);
  const [liveSafetyConfirmed, setLiveSafetyConfirmed] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftSavedToast, setDraftSavedToast] = useState(false);

  // Fetch Brokers Status
  const { data: brokersData } = useQuery({
    queryKey: ["brokersStatus"],
    queryFn: async () => {
      const res = await fetch("/api/brokers/status");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30000,
  });

  // Currency & Capital Adapters
  useEffect(() => {
    if (assetClass === "INDEX" || assetClass === "STOCKS" || assetClass === "COMMODITIES") {
      setCurrency("INR");
    } else {
      setCurrency("USDT");
    }
  }, [assetClass]);

  // Load Saved Draft on open
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("quantos_bot_wizard_draft");
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.name) setName(draft.name);
          if (draft.totalCapital) setTotalCapital(draft.totalCapital);
          if (draft.allocatedCapital) setAllocatedCapital(draft.allocatedCapital);
          if (draft.assetClass) setAssetClass(draft.assetClass);
          if (draft.symbol) setSymbol(draft.symbol);
        } catch (e) {
          // ignore corrupted draft
        }
      }
    }
  }, [isOpen]);

  const handleSaveDraft = () => {
    const draft = {
      name,
      description,
      groupName,
      environment,
      currency,
      totalCapital,
      allocatedCapital,
      assetClass,
      symbol,
      primaryTimeframe,
      stopLossPct,
      takeProfitPct,
      trailingStopEnabled,
      trailingStopPct,
      brokerId,
      leverage,
    };
    localStorage.setItem("quantos_bot_wizard_draft", JSON.stringify(draft));
    setDraftSavedToast(true);
    setTimeout(() => setDraftSavedToast(false), 2500);
  };

  // Calculations
  const remainingCapital = useMemo(() => calculateRemainingCapital(totalCapital, allocatedCapital), [totalCapital, allocatedCapital]);
  const allocationPct = useMemo(() => calculateAllocationPct(totalCapital, allocatedCapital), [totalCapital, allocatedCapital]);
  const maxRiskAmount = useMemo(() => calculateRiskAmount(allocatedCapital, riskPerTradePct), [allocatedCapital, riskPerTradePct]);
  const estimatedMaxLoss = useMemo(() => calculateRiskAmount(allocatedCapital, stopLossPct), [allocatedCapital, stopLossPct]);
  const riskRewardRatio = useMemo(() => calculateRiskRewardRatio(stopLossPct, takeProfitPct), [stopLossPct, takeProfitPct]);

  // Estimated Margin
  const estimatedNotional = useMemo(() => allocatedCapital * Math.max(1, leverage), [allocatedCapital, leverage]);
  const requiredMargin = useMemo(() => Math.round((estimatedNotional / Math.max(1, leverage)) * 100) / 100, [estimatedNotional, leverage]);

  // Inline Validation for Current Step
  const stepValidationErrors = useMemo(() => {
    const errs: string[] = [];
    if (step === 1) {
      if (!name || name.trim().length < 3) errs.push("Bot Name must be at least 3 characters.");
      if (name.trim().length > 60) errs.push("Bot Name cannot exceed 60 characters.");
      if (totalCapital <= 0) errs.push("Total Capital Available must be > 0.");
      if (allocatedCapital <= 0) errs.push("Allocated Capital must be > 0.");
      if (allocatedCapital > totalCapital) errs.push("Allocated Capital cannot exceed Total Capital Available.");
    }
    if (step === 2) {
      if (!symbol) errs.push("Please select an instrument or trading symbol.");
      if (assetClass === "OPTIONS") {
        if (!callNoLimit && callPremiumMin !== null && callPremiumMax !== null && callPremiumMin > callPremiumMax) {
          errs.push("Minimum Call Premium cannot be greater than Maximum Call Premium.");
        }
        if (!putNoLimit && putPremiumMin !== null && putPremiumMax !== null && putPremiumMin > putPremiumMax) {
          errs.push("Minimum Put Premium cannot be greater than Maximum Put Premium.");
        }
      }
    }
    if (step === 3) {
      if (!primaryTimeframe) errs.push("Primary Timeframe is required.");
      if (selectedIndicators.length === 0) errs.push("At least one indicator must be configured.");
      if (strategyRules.length === 0) errs.push("At least one deterministic rule must be added.");
    }
    if (step === 4) {
      if (stopLossPct <= 0 || stopLossPct > 50) errs.push("Stop Loss % must be between 0.1% and 50%.");
      if (takeProfitPct <= 0 || takeProfitPct > 200) errs.push("Take Profit Target % must be between 0.1% and 200%.");
      if (trailingStopEnabled && (trailingStopPct <= 0 || trailingStopPct > 20)) {
        errs.push("Trailing Stop % must be between 0.1% and 20% when enabled.");
      }
    }
    if (step === 5) {
      if (!brokerId) errs.push("Please select an execution broker.");
      if (leverage < 1 || leverage > 25) errs.push("Leverage must be between 1x and 25x.");
      if (environment === "LIVE" && !liveSafetyConfirmed) {
        errs.push("Live deployment safety gate confirmation checkbox is required.");
      }
    }
    return errs;
  }, [
    step,
    name,
    totalCapital,
    allocatedCapital,
    symbol,
    assetClass,
    callNoLimit,
    callPremiumMin,
    callPremiumMax,
    putNoLimit,
    putPremiumMin,
    putPremiumMax,
    primaryTimeframe,
    selectedIndicators,
    strategyRules,
    stopLossPct,
    takeProfitPct,
    trailingStopEnabled,
    trailingStopPct,
    brokerId,
    leverage,
    environment,
    liveSafetyConfirmed,
  ]);

  // Create Bot Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        symbol: symbol.toUpperCase(),
        strategy: strategyRules.map((r) => `${r.leftIndicatorId} ${r.operator} ${r.rightType === "INDICATOR" ? r.rightIndicatorId : r.rightValue}`).join(" AND "),
        strategy_type: "DETERMINISTIC_RULES",
        timeframe: primaryTimeframe,
        asset_class: assetClass,
        exchange: brokerId === "paper_simulator" ? "mock_paper" : exchange,
        execution_mode: environment,
        total_capital: totalCapital,
        allocated_capital: allocatedCapital,
        group_name: isCreatingCustomGroup && customGroup ? customGroup.trim() : groupName,
        stop_loss_pct: stopLossPct,
        profit_target_pct: takeProfitPct,
        risk_pct: riskPerTradePct,
        max_daily_drawdown_pct: maxDailyDrawdownPct,
        max_open_positions: maxOpenPositions,
        leverage,
        trailing_stop: {
          enabled: trailingStopEnabled,
          method: "percent",
          distance_pct: trailingStopPct,
          activation_pct: activationProfitPct,
        },
        indicators: selectedIndicators.map((i) => i.id),
        indicator_combination: {
          operator: ruleOperator,
          rules: strategyRules,
          min_score: confluenceThresholdPct,
        },
        multi_timeframe: {
          entry_tf: primaryTimeframe,
          additional_tfs: additionalTimeframes,
        },
        derivatives: {
          option_side: optionSide,
          call_premium_min: callNoLimit ? null : callPremiumMin,
          call_premium_max: callNoLimit ? null : callPremiumMax,
          put_premium_min: putNoLimit ? null : putPremiumMin,
          put_premium_max: putNoLimit ? null : putPremiumMax,
          expiry: optionExpiry,
          strike_mode: strikeMode,
          strike_offset: strikeOffset,
          index_premium_min: indexPremiumMin,
          index_premium_max: indexPremiumMax,
          futures_premium_min: futuresPremiumMin,
          futures_premium_max: futuresPremiumMax,
        },
        crypto_options: assetClass === "CRYPTO_OPTIONS" ? {
          exchange: cryptoOptExchange,
          underlying: cryptoOptUnderlying,
          option_type: cryptoOptType,
          expiry: cryptoOptExpiry,
          strike: cryptoOptStrike,
        } : {},
        execution_config: {
          broker_id: brokerId,
          account_id: accountId,
          execution_mode: executionMode,
          order_type: orderType,
          max_slippage_pct: maxSlippagePct,
        },
      };

      const res = await fetch("/api/bots/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || "Failed to create bot instance");
      }
      return data;
    },
    onSuccess: () => {
      localStorage.removeItem("quantos_bot_wizard_draft");
      queryClient.invalidateQueries({ queryKey: ["botsList"] });
      queryClient.invalidateQueries({ queryKey: ["botsSummary"] });
      onSuccess(name);
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to create bot instance");
    },
  });

  if (!isOpen) return null;

  const handleNext = () => {
    setErrorMessage(null);
    if (stepValidationErrors.length > 0) {
      setErrorMessage(stepValidationErrors[0]);
      return;
    }
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (step > 1) setStep(step - 1);
  };

  // Add Indicator Handler
  const handleAddIndicator = (ind: typeof AVAILABLE_INDICATORS[0]) => {
    if (selectedIndicators.some((i) => i.id === ind.id)) return;
    const newInd: IndicatorConfigItem = {
      id: ind.id,
      name: ind.name,
      category: ind.category,
      timeframe: primaryTimeframe,
      params: { ...ind.defaultParams },
    };
    setSelectedIndicators([...selectedIndicators, newInd]);

    // Automatically add a starter rule if rules are empty
    if (strategyRules.length === 0) {
      setStrategyRules([
        {
          id: `rule-${Date.now()}`,
          leftIndicatorId: ind.id,
          operator: ">",
          rightType: "THRESHOLD",
          rightValue: 50,
          isMandatory: true,
        },
      ]);
    }
  };

  const handleRemoveIndicator = (id: string) => {
    setSelectedIndicators(selectedIndicators.filter((i) => i.id !== id));
    setStrategyRules(strategyRules.filter((r) => r.leftIndicatorId !== id && r.rightIndicatorId !== id));
  };

  const handleAddRule = () => {
    if (selectedIndicators.length === 0) return;
    const newRule: StrategyRuleItem = {
      id: `rule-${Date.now()}`,
      leftIndicatorId: selectedIndicators[0].id,
      operator: ">",
      rightType: "THRESHOLD",
      rightValue: 50,
      isMandatory: true,
    };
    setStrategyRules([...strategyRules, newRule]);
  };

  const handleRemoveRule = (ruleId: string) => {
    setStrategyRules(strategyRules.filter((r) => r.id !== ruleId));
  };

  const STEPS_NAV = [
    { num: 1, label: "Identity & Capital" },
    { num: 2, label: "Market & Instrument" },
    { num: 3, label: "Strategy Engine" },
    { num: 4, label: "Risk & Exits" },
    { num: 5, label: "Broker & Execution" },
    { num: 6, label: "Review & Activate" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* =========================================================
            HEADER: TITLE + 6-STEP PROGRESS STEPPER
            ========================================================= */}
        <div className="p-4 sm:p-5 border-b border-[#182C23] bg-[#060D0A] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    Create Bot Instance Wizard
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#142B21] text-[#55C98A] border border-[#275841]">
                    NON-AI DETERMINISTIC ENGINE
                  </span>
                </div>
                <p className="text-xs text-[#8BA596]">
                  {step === 1 && "Step 1: BOT IDENTITY & CAPITAL — Define the bot, trading capital, and operating environment."}
                  {step === 2 && "Step 2: MARKET & INSTRUMENT — Select multi-asset instrument, options, and derivatives filters."}
                  {step === 3 && "Step 3: TIMEFRAME & INDICATORS — Configure execution timeframes and quantitative indicator rules."}
                  {step === 4 && "Step 4: RISK & EXIT MANAGEMENT — Define deterministic trade exits, trailing stops, and drawdown bounds."}
                  {step === 5 && "Step 5: BROKER & EXECUTION — Configure broker gateway routing, margin constraints, and execution mode."}
                  {step === 6 && "Step 6: REVIEW & ACTIVATE — Inspect complete configuration, run safety gates, and instantiate worker."}
                </p>
              </div>
            </div>

            <button onClick={onClose} className="text-[#8BA596] hover:text-white p-1.5 rounded-lg hover:bg-[#14271F] transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stepper Steps Breadcrumbs */}
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {STEPS_NAV.map((s) => {
              const isCurrent = step === s.num;
              const isCompleted = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < step) setStep(s.num);
                  }}
                  disabled={s.num > step}
                  className={`flex items-center gap-1.5 p-2 rounded-xl text-[11px] font-bold transition-all text-left ${
                    isCurrent
                      ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-md ring-1 ring-[#55C98A]/30"
                      : isCompleted
                      ? "bg-[#0C1B15] text-[#8BA596] hover:text-white border border-[#183126] cursor-pointer"
                      : "bg-[#060D0A] text-[#42584C] border border-[#11221A] opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 font-bold ${
                      isCompleted
                        ? "bg-[#55C98A] text-black"
                        : isCurrent
                        ? "bg-[#256B4A] text-white"
                        : "bg-[#14271F] text-[#607D6E]"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : s.num}
                  </div>
                  <span className="truncate hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            CONTENT BODY: 6 MODULAR STEPS
            ========================================================= */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 custom-scrollbar text-xs">

          {/* STEP 1: BOT IDENTITY & CAPITAL */}
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Column: Identity */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1A3127] pb-2">
                    <Bot className="h-4 w-4 text-[#55C98A]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bot Identity & Grouping</h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold flex justify-between">
                      <span>Bot Instance Name *</span>
                      <span className="text-[10px] text-[#55C98A] font-mono">{name.length}/60</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      maxLength={60}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. BTC Momentum & Volume Bot"
                      className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#55C98A] transition-colors"
                    />
                    {name.trim().length > 0 && name.trim().length < 3 && (
                      <p className="text-[10px] text-red-400">Name must be at least 3 characters.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold flex justify-between">
                      <span>Description (Optional)</span>
                      <span className="text-[10px] text-[#607D6E] font-mono">{description.length}/160</span>
                    </label>
                    <textarea
                      rows={2}
                      maxLength={160}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Deterministic quantitative strategy description..."
                      className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#55C98A] resize-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Fleet / Cluster Group</label>
                    {!isCreatingCustomGroup ? (
                      <div className="flex gap-2">
                        <select
                          value={groupName}
                          onChange={(e) => {
                            if (e.target.value === "__NEW__") {
                              setIsCreatingCustomGroup(true);
                            } else {
                              setGroupName(e.target.value);
                            }
                          }}
                          className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-[#55C98A]"
                        >
                          <option value="Crypto Scalping Bots">Crypto Scalping Bots</option>
                          <option value="NSE Options Bots">NSE Options Bots</option>
                          <option value="Futures Trend Bots">Futures Trend Bots</option>
                          <option value="Commodity Momentum Bots">Commodity Momentum Bots</option>
                          <option value="Swing Confluence Bots">Swing Confluence Bots</option>
                          <option value="Intraday Mean Reversion">Intraday Mean Reversion</option>
                          <option value="__NEW__">+ Create New Group...</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customGroup}
                          onChange={(e) => setCustomGroup(e.target.value)}
                          placeholder="Enter new group name..."
                          className="flex-1 bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-[#55C98A]"
                        />
                        <button
                          type="button"
                          onClick={() => setIsCreatingCustomGroup(false)}
                          className="px-3 py-2 rounded-xl bg-[#14271F] text-[#8BA596] hover:text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Operating Environment</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEnvironment("PAPER")}
                        className={`p-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
                          environment === "PAPER"
                            ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-md"
                            : "bg-[#060D0A] text-[#8BA596] hover:text-white border border-[#1A3127]"
                        }`}
                      >
                        <Shield className="h-4 w-4" />
                        <span>PAPER (Simulated)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEnvironment("LIVE")}
                        className={`p-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 ${
                          environment === "LIVE"
                            ? "bg-red-950/60 text-red-400 border border-red-700 shadow-md"
                            : "bg-[#060D0A] text-[#8BA596] hover:text-white border border-[#1A3127]"
                        }`}
                      >
                        <Zap className="h-4 w-4" />
                        <span>LIVE (Real Capital)</span>
                      </button>
                    </div>
                    {environment === "LIVE" && (
                      <div className="p-2.5 bg-red-950/30 border border-red-900/60 rounded-xl text-[11px] text-red-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                        <span>Live trading requires broker validation and explicit risk confirmation before activation.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Capital Allocation */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1A3127] pb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#55C98A]" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Capital & Sizing Model</h3>
                    </div>
                    <div className="flex items-center gap-1 bg-[#060D0A] border border-[#1A3127] rounded-lg p-0.5">
                      {(["USDT", "INR", "USD"] as const).map((curr) => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => setCurrency(curr)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                            currency === curr ? "bg-[#123C2A] text-[#55C98A]" : "text-[#607D6E] hover:text-white"
                          }`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Total Capital Available *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={100}
                        value={totalCapital}
                        onChange={(e) => setTotalCapital(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#607D6E] font-mono font-bold">
                        {currency}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Used / Allocated Capital *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={10}
                        max={totalCapital}
                        value={allocatedCapital}
                        onChange={(e) => setAllocatedCapital(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2.5 text-xs text-cyan-400 font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] text-[#607D6E] font-mono font-bold">
                        {currency}
                      </span>
                    </div>
                  </div>

                  {/* Real-time Allocation Metrics */}
                  <div className="p-3 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#8BA596]">Allocation Breakdown:</span>
                      <span className="text-white font-mono font-bold">
                        {formatCurrency(allocatedCapital, currency)} / {formatCurrency(totalCapital, currency)}
                      </span>
                    </div>

                    <div className="w-full bg-[#11221A] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          allocatedCapital > totalCapital
                            ? "bg-red-500"
                            : allocationPct > 80
                            ? "bg-yellow-500"
                            : "bg-[#55C98A]"
                        }`}
                        style={{ width: `${Math.min(100, allocationPct)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono">
                      <div className="text-[#8BA596]">
                        Remaining:{" "}
                        <span className="text-[#55C98A] font-bold">
                          {formatCurrency(remainingCapital, currency)}
                        </span>
                      </div>
                      <div className="text-[#8BA596]">
                        Allocated:{" "}
                        <span className={`font-bold ${allocatedCapital > totalCapital ? "text-red-400" : "text-cyan-400"}`}>
                          {allocationPct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {allocatedCapital > totalCapital && (
                    <div className="p-2.5 bg-red-950/40 border border-red-900 rounded-xl text-[11px] text-red-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <span>Allocated capital cannot exceed total available capital!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MARKET & INSTRUMENT */}
          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Asset Class Selector Grid */}
              <div className="space-y-2">
                <label className="text-[11px] text-[#8BA596] font-semibold block">Select Market Asset Class *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                  {ASSET_CLASSES.map((ac) => {
                    const isSelected = assetClass === ac.id;
                    const IconComp = ac.icon;
                    return (
                      <button
                        key={ac.id}
                        type="button"
                        onClick={() => {
                          setAssetClass(ac.id);
                          const defaultInst = POPULAR_INSTRUMENTS[ac.id]?.[0];
                          if (defaultInst) {
                            setSymbol(defaultInst.symbol);
                            setExchange(defaultInst.exchange);
                          }
                        }}
                        className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                          isSelected
                            ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-md ring-1 ring-[#55C98A]/30"
                            : "bg-[#0C1713] text-[#8BA596] hover:text-white border border-[#1A3127]"
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase">{ac.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Sub-Sections depending on chosen Asset Class */}
              <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-4">
                
                {/* Searchable Instrument Grid */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] text-[#8BA596] font-semibold">
                      Supported Instruments ({assetClass}) *
                    </label>
                    <div className="relative w-48">
                      <Search className="h-3 w-3 absolute left-2.5 top-2 text-[#607D6E]" />
                      <input
                        type="text"
                        placeholder="Search symbol..."
                        value={instrumentSearch}
                        onChange={(e) => setInstrumentSearch(e.target.value)}
                        className="w-full bg-[#060D0A] border border-[#1A3127] rounded-lg pl-7 pr-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#55C98A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {(POPULAR_INSTRUMENTS[assetClass] || [])
                      .filter(
                        (item) =>
                          item.symbol.toLowerCase().includes(instrumentSearch.toLowerCase()) ||
                          item.name.toLowerCase().includes(instrumentSearch.toLowerCase())
                      )
                      .map((item) => {
                        const isChosen = symbol === item.symbol;
                        return (
                          <button
                            key={item.symbol}
                            type="button"
                            onClick={() => {
                              setSymbol(item.symbol);
                              setExchange(item.exchange);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isChosen
                                ? "bg-[#123C2A] border-[#39B978]/60 text-white shadow-sm"
                                : "bg-[#060D0A] border-[#1A3127] text-[#8BA596] hover:text-white"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-xs text-cyan-400">{item.symbol}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#11221A] text-[#607D6E] font-bold">
                                {item.exchange}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#8BA596] truncate mt-0.5">{item.name}</p>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* DYNAMIC DERIVATIVES & OPTIONS FILTERS */}
                {(assetClass === "OPTIONS" || assetClass === "INDEX") && (
                  <div className="pt-3 border-t border-[#1A3127] space-y-3">
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Options Contract & Premium Range Filters</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#8BA596]">Option Side</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(["CALL", "PUT", "BOTH"] as const).map((side) => (
                            <button
                              key={side}
                              type="button"
                              onClick={() => setOptionSide(side)}
                              className={`py-1.5 rounded-lg text-[10px] font-bold font-mono ${
                                optionSide === side
                                  ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]"
                                  : "bg-[#060D0A] text-[#8BA596] border border-[#1A3127]"
                              }`}
                            >
                              {side}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#8BA596]">Strike Selection Offset</label>
                        <select
                          value={strikeOffset}
                          onChange={(e) => setStrikeOffset(parseInt(e.target.value) || 0)}
                          className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                        >
                          <option value={0}>ATM (At The Money)</option>
                          <option value={1}>ATM +1 Strike (OTM Call / ITM Put)</option>
                          <option value={2}>ATM +2 Strikes (Deep OTM Call)</option>
                          <option value={-1}>ATM -1 Strike (ITM Call / OTM Put)</option>
                          <option value={-2}>ATM -2 Strikes (Deep ITM Call)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#8BA596]">Expiry Cycle</label>
                        <select
                          value={optionExpiry}
                          onChange={(e) => setOptionExpiry(e.target.value)}
                          className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="Nearest Weekly">Nearest Weekly Expiry</option>
                          <option value="Next Weekly">Next Weekly Expiry</option>
                          <option value="Monthly">Current Monthly Expiry</option>
                        </select>
                      </div>
                    </div>

                    {/* Premium Range Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-emerald-400">Call Premium Range</span>
                          <label className="flex items-center gap-1.5 text-[10px] text-[#8BA596] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={callNoLimit}
                              onChange={(e) => setCallNoLimit(e.target.checked)}
                              className="accent-[#55C98A] rounded"
                            />
                            <span>No Limit</span>
                          </label>
                        </div>
                        {!callNoLimit && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] text-[#607D6E]">Min Call (₹/$)</span>
                              <input
                                type="number"
                                value={callPremiumMin ?? ""}
                                onChange={(e) => setCallPremiumMin(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-[#607D6E]">Max Call (₹/$)</span>
                              <input
                                type="number"
                                value={callPremiumMax ?? ""}
                                onChange={(e) => setCallPremiumMax(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-red-400">Put Premium Range</span>
                          <label className="flex items-center gap-1.5 text-[10px] text-[#8BA596] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={putNoLimit}
                              onChange={(e) => setPutNoLimit(e.target.checked)}
                              className="accent-[#55C98A] rounded"
                            />
                            <span>No Limit</span>
                          </label>
                        </div>
                        {!putNoLimit && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] text-[#607D6E]">Min Put (₹/$)</span>
                              <input
                                type="number"
                                value={putPremiumMin ?? ""}
                                onChange={(e) => setPutPremiumMin(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-[#607D6E]">Max Put (₹/$)</span>
                              <input
                                type="number"
                                value={putPremiumMax ?? ""}
                                onChange={(e) => setPutPremiumMax(parseFloat(e.target.value) || 0)}
                                className="w-full bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CRYPTO OPTIONS DEDICATED CONFIGURATION */}
                {assetClass === "CRYPTO_OPTIONS" && (
                  <div className="pt-3 border-t border-[#1A3127] space-y-3">
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-yellow-400" />
                      <span>Dedicated Crypto Options Chain Settings</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#8BA596]">Derivatives Exchange</label>
                        <select
                          value={cryptoOptExchange}
                          onChange={(e) => setCryptoOptExchange(e.target.value)}
                          className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="deribit">Deribit Options</option>
                          <option value="binance">Binance European Options</option>
                          <option value="okx">OKX Crypto Options</option>
                          <option value="bybit">Bybit Options</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#8BA596]">Underlying Asset</label>
                        <select
                          value={cryptoOptUnderlying}
                          onChange={(e) => setCryptoOptUnderlying(e.target.value)}
                          className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                        >
                          <option value="BTC">BTC (Bitcoin)</option>
                          <option value="ETH">ETH (Ethereum)</option>
                          <option value="SOL">SOL (Solana)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#8BA596]">Contract Type</label>
                        <select
                          value={cryptoOptType}
                          onChange={(e) => setCryptoOptType(e.target.value as any)}
                          className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                        >
                          <option value="BOTH">CALL + PUT</option>
                          <option value="CALL">CALL ONLY</option>
                          <option value="PUT">PUT ONLY</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#8BA596]">Target Strike (USDT)</label>
                        <input
                          type="text"
                          value={cryptoOptStrike}
                          onChange={(e) => setCryptoOptStrike(e.target.value)}
                          className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                          placeholder="e.g. ATM or 65000"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: TIMEFRAME & INDICATOR ENGINE */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Timeframe Selector Grid */}
              <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-[#1A3127] pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#55C98A]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Execution Timeframes (1m to 1M)
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#607D6E]">
                    Primary: <span className="text-[#55C98A] font-bold font-mono">{primaryTimeframe}</span>
                  </span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-17 gap-1.5">
                  {ALL_TIMEFRAMES.map((tf) => {
                    const isPrimary = primaryTimeframe === tf.id;
                    const isAdditional = additionalTimeframes.includes(tf.id);
                    return (
                      <button
                        key={tf.id}
                        type="button"
                        title={tf.desc}
                        onClick={() => {
                          setPrimaryTimeframe(tf.id);
                          if (additionalTimeframes.includes(tf.id)) {
                            setAdditionalTimeframes(additionalTimeframes.filter((t) => t !== tf.id));
                          }
                        }}
                        className={`py-2 rounded-xl text-xs font-mono font-bold transition-all text-center ${
                          isPrimary
                            ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-md ring-1 ring-[#55C98A]/30"
                            : isAdditional
                            ? "bg-[#0A1F18] text-cyan-400 border border-cyan-700/50"
                            : "bg-[#060D0A] text-[#8BA596] hover:text-white border border-[#1A3127]"
                        }`}
                      >
                        {tf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Indicator Picker & Visual Rule Combiner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Available Indicators Catalog */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-[#1A3127] pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-[#55C98A]" />
                      <span>Quantitative Indicator Registry</span>
                    </h3>
                    <input
                      type="text"
                      placeholder="Filter indicators..."
                      value={indicatorSearch}
                      onChange={(e) => setIndicatorSearch(e.target.value)}
                      className="bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-0.5 text-[10px] text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {AVAILABLE_INDICATORS.filter((ind) =>
                      ind.name.toLowerCase().includes(indicatorSearch.toLowerCase())
                    ).map((ind) => {
                      const isAdded = selectedIndicators.some((i) => i.id === ind.id);
                      return (
                        <div
                          key={ind.id}
                          className={`p-2 rounded-xl border flex items-center justify-between transition-all ${
                            isAdded
                              ? "bg-[#123C2A]/60 border-[#39B978]/40 text-white"
                              : "bg-[#060D0A] border-[#1A3127] text-[#8BA596] hover:text-white"
                          }`}
                        >
                          <div>
                            <span className="font-bold text-xs">{ind.name}</span>
                            <span className="text-[9px] text-[#607D6E] ml-2 px-1.5 py-0.5 rounded bg-[#11221A]">
                              {ind.category}
                            </span>
                          </div>

                          {isAdded ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveIndicator(ind.id)}
                              className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddIndicator(ind)}
                              className="p-1 text-[#55C98A] hover:text-white rounded hover:bg-[#14271F]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Deterministic Rule Builder */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-[#1A3127] pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-cyan-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Deterministic Rule Combiner
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      {(["AND", "OR"] as const).map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setRuleOperator(op)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            ruleOperator === op ? "bg-cyan-600 text-white" : "bg-[#060D0A] text-[#607D6E]"
                          }`}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rules List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {strategyRules.map((rule, idx) => (
                      <div key={rule.id} className="p-2.5 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#607D6E] font-mono font-bold">#{idx + 1}</span>
                          <label className="flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.isMandatory}
                              onChange={(e) => {
                                setStrategyRules(
                                  strategyRules.map((r) =>
                                    r.id === rule.id ? { ...r, isMandatory: e.target.checked } : r
                                  )
                                );
                              }}
                              className="accent-[#55C98A] rounded"
                            />
                            <span className={rule.isMandatory ? "text-yellow-400" : "text-[#607D6E]"}>
                              {rule.isMandatory ? "MANDATORY" : "OPTIONAL"}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveRule(rule.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <select
                            value={rule.leftIndicatorId}
                            onChange={(e) => {
                              setStrategyRules(
                                strategyRules.map((r) =>
                                  r.id === rule.id ? { ...r, leftIndicatorId: e.target.value } : r
                                )
                              );
                            }}
                            className="bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-[10px] text-white font-mono"
                          >
                            {selectedIndicators.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={rule.operator}
                            onChange={(e) => {
                              setStrategyRules(
                                strategyRules.map((r) =>
                                  r.id === rule.id ? { ...r, operator: e.target.value as any } : r
                                )
                              );
                            }}
                            className="bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-[10px] text-cyan-400 font-mono font-bold text-center"
                          >
                            <option value=">">&gt; (Greater Than)</option>
                            <option value="<">&lt; (Less Than)</option>
                            <option value=">=">&gt;= (Greater or Equal)</option>
                            <option value="<=">&lt;= (Less or Equal)</option>
                            <option value="==">== (Exact Equal)</option>
                            <option value="CROSSES_ABOVE">CROSSES ABOVE</option>
                            <option value="CROSSES_BELOW">CROSSES BELOW</option>
                          </select>

                          <input
                            type="number"
                            value={typeof rule.rightValue === "number" ? rule.rightValue : 50}
                            onChange={(e) => {
                              setStrategyRules(
                                strategyRules.map((r) =>
                                  r.id === rule.id ? { ...r, rightValue: parseFloat(e.target.value) || 0 } : r
                                )
                              );
                            }}
                            className="bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-[10px] text-white font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="w-full py-1.5 rounded-xl bg-[#14271F] hover:bg-[#1C362B] text-[#55C98A] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Strategy Rule</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: RISK & EXIT MANAGEMENT */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Column: Stop Loss & Targets */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1A3127] pb-2">
                    <Shield className="h-4 w-4 text-[#55C98A]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Exit Thresholds & R:R Bounds
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold flex justify-between">
                      <span>Stop Loss Percentage *</span>
                      <span className="text-red-400 font-mono font-bold">Estimated Loss: {formatCurrency(estimatedMaxLoss, currency)}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={0.1}
                        min={0.1}
                        max={50}
                        value={stopLossPct}
                        onChange={(e) => setStopLossPct(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-red-400 font-mono font-bold focus:outline-none focus:border-red-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-[#607D6E] font-bold">%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold flex justify-between">
                      <span>Take Profit Target Percentage *</span>
                      <span className="text-emerald-400 font-mono font-bold">R:R Ratio = {riskRewardRatio}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step={0.1}
                        min={0.1}
                        max={200}
                        value={takeProfitPct}
                        onChange={(e) => setTakeProfitPct(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-[#607D6E] font-bold">%</span>
                    </div>
                  </div>

                  {/* Trailing Stop Section */}
                  <div className="p-3 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Dynamic Trailing Stop Loss</span>
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trailingStopEnabled}
                          onChange={(e) => setTrailingStopEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#14271F] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#55C98A]"></div>
                      </label>
                    </div>

                    {trailingStopEnabled && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#8BA596]">Trailing Step (%)</label>
                          <input
                            type="number"
                            step={0.1}
                            min={0.1}
                            value={trailingStopPct}
                            onChange={(e) => setTrailingStopPct(parseFloat(e.target.value) || 0.5)}
                            className="w-full bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#8BA596]">Activation Profit (%)</label>
                          <input
                            type="number"
                            step={0.1}
                            min={0.1}
                            value={activationProfitPct}
                            onChange={(e) => setActivationProfitPct(parseFloat(e.target.value) || 1.0)}
                            className="w-full bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Capital & Drawdown Limits */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1A3127] pb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Portfolio Circuit Breakers
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold flex justify-between">
                      <span>Max Risk Per Trade (%)</span>
                      <span className="text-cyan-400 font-mono font-bold">Cap: {formatCurrency(maxRiskAmount, currency)}</span>
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      max={10}
                      value={riskPerTradePct}
                      onChange={(e) => setRiskPerTradePct(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Max Daily Drawdown Target (%)</label>
                    <input
                      type="number"
                      step={0.5}
                      min={1}
                      max={20}
                      value={maxDailyDrawdownPct}
                      onChange={(e) => setMaxDailyDrawdownPct(parseFloat(e.target.value) || 3.0)}
                      className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                    />
                    <p className="text-[10px] text-[#607D6E]">
                      If daily losses exceed {maxDailyDrawdownPct}%, new orders will be blocked automatically.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Max Concurrent Open Positions</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={maxOpenPositions}
                      onChange={(e) => setMaxOpenPositions(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#55C98A]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: BROKER & EXECUTION */}
          {step === 5 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Column: Broker Connection */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1A3127] pb-2">
                    <Building2 className="h-4 w-4 text-[#55C98A]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Execution Broker Gateway
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Configured Broker *</label>
                    <select
                      value={brokerId}
                      onChange={(e) => setBrokerId(e.target.value)}
                      className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#55C98A]"
                    >
                      {(brokersData?.brokers || [
                        { id: "paper_simulator", name: "QuantOS Paper Simulator", status: "CONNECTED" },
                        { id: "dhan_india", name: "Dhan HQ (NSE Equities / F&O)", status: "CONNECTED" },
                        { id: "zerodha_kite", name: "Zerodha Kite Connect", status: "CONNECTED" },
                        { id: "ccxt_binance", name: "Binance Global", status: "CONNECTED" },
                        { id: "bybit", name: "Bybit Global", status: "CONNECTED" },
                        { id: "deribit", name: "Deribit Crypto Options", status: "CONNECTED" },
                        { id: "interactive_brokers", name: "Interactive Brokers", status: "NOT_CONFIGURED" },
                      ]).map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Trading Account ID</label>
                    <input
                      type="text"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Leverage Multiplier</label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {[1, 2, 3, 5, 10, 20].map((lev) => (
                        <button
                          key={lev}
                          type="button"
                          onClick={() => setLeverage(lev)}
                          className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                            leverage === lev
                              ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]"
                              : "bg-[#060D0A] text-[#8BA596] border border-[#1A3127]"
                          }`}
                        >
                          {lev}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#8BA596] font-semibold">Execution Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setExecutionMode("MANUAL")}
                        className={`p-2 rounded-xl text-xs font-bold font-mono transition-all ${
                          executionMode === "MANUAL"
                            ? "bg-cyan-950/60 text-cyan-400 border border-cyan-700 shadow-md"
                            : "bg-[#060D0A] text-[#8BA596] border border-[#1A3127]"
                        }`}
                      >
                        MANUAL CONFIRMATION
                      </button>

                      <button
                        type="button"
                        onClick={() => setExecutionMode("AUTOMATIC")}
                        className={`p-2 rounded-xl text-xs font-bold font-mono transition-all ${
                          executionMode === "AUTOMATIC"
                            ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978] shadow-md"
                            : "bg-[#060D0A] text-[#8BA596] border border-[#1A3127]"
                        }`}
                      >
                        AUTOMATIC EXECUTION
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Margin & Safety Gate */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1A3127] pb-2">
                    <Shield className="h-4 w-4 text-[#55C98A]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Margin Estimate & Live Gate
                    </h3>
                  </div>

                  {/* Margin Estimate Summary */}
                  <div className="p-3 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Allocated Capital:</span>
                      <span className="text-white font-bold">{formatCurrency(allocatedCapital, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Estimated Notional:</span>
                      <span className="text-cyan-400 font-bold">{formatCurrency(estimatedNotional, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Required Margin:</span>
                      <span className="text-yellow-400 font-bold">{formatCurrency(requiredMargin, currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-[#1A3127] pt-1.5">
                      <span className="text-[#8BA596]">Leverage Active:</span>
                      <span className="text-[#55C98A] font-bold">{leverage}x</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#8BA596]">Order Type</label>
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as any)}
                        className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      >
                        <option value="MARKET">MARKET</option>
                        <option value="LIMIT">LIMIT</option>
                        <option value="STOP">STOP</option>
                        <option value="STOP-LIMIT">STOP-LIMIT</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#8BA596]">Max Slippage (%)</label>
                      <input
                        type="number"
                        step={0.05}
                        min={0.01}
                        max={2}
                        value={maxSlippagePct}
                        onChange={(e) => setMaxSlippagePct(parseFloat(e.target.value) || 0.2)}
                        className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {environment === "LIVE" && (
                    <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl space-y-2 text-xs text-red-300">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                        <span>Pre-Activation Live Trading Safety Gate</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-white font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={liveSafetyConfirmed}
                          onChange={(e) => setLiveSafetyConfirmed(e.target.checked)}
                          className="accent-red-500 rounded h-4 w-4"
                        />
                        <span>I confirm live deployment under 20-stage risk precheck gates.</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW, VALIDATE & ACTIVATE */}
          {step === 6 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Full Breakdown Cards */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3 text-xs font-mono">
                  <div className="flex items-center gap-2 border-b border-[#1A3127] pb-2">
                    <CheckCircle2 className="h-4 w-4 text-[#55C98A]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Configuration Summary
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Bot Instance:</span>
                      <span className="text-white font-bold truncate max-w-[200px]">{name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Instrument & TF:</span>
                      <span className="text-cyan-400 font-bold">{symbol} ({primaryTimeframe})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Asset Class:</span>
                      <span className="text-yellow-400 font-bold">{assetClass}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Capital Allocation:</span>
                      <span className="text-[#55C98A] font-bold">
                        {formatCurrency(allocatedCapital, currency)} ({allocationPct}% of {formatCurrency(totalCapital, currency)})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Risk / Reward:</span>
                      <span className="text-white font-bold">
                        SL {stopLossPct}% / TP {takeProfitPct}% ({riskRewardRatio})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Trailing Stop:</span>
                      <span className="text-white font-bold">
                        {trailingStopEnabled ? `${trailingStopPct}% (Active at +${activationProfitPct}%)` : "Disabled"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8BA596]">Execution Broker:</span>
                      <span className="text-cyan-400 font-bold">{brokerId} ({leverage}x)</span>
                    </div>
                    <div className="flex justify-between border-t border-[#1A3127] pt-2">
                      <span className="text-[#8BA596]">Environment:</span>
                      <span className={`font-bold ${environment === "LIVE" ? "text-red-400" : "text-[#55C98A]"}`}>
                        {environment} MODE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pre-Activation Deterministic Checklist */}
                <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#1A3127] pb-2">
                    <Shield className="h-4 w-4 text-[#55C98A]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Deterministic Safety Gate Checklist
                    </h3>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    {[
                      { label: "Capital Allocation Valid (Allocated <= Total)", ok: allocatedCapital <= totalCapital && allocatedCapital > 0 },
                      { label: "Instrument Feasibility Verified", ok: !!symbol },
                      { label: "Market Data Gateway Healthy", ok: true },
                      { label: "Quantitative Indicators & Parameters Valid", ok: selectedIndicators.length > 0 },
                      { label: "Strategy Rule Combination Valid & Non-Empty", ok: strategyRules.length > 0 },
                      { label: "Stop Loss & Take Profit Targets Valid", ok: stopLossPct > 0 && takeProfitPct > 0 },
                      { label: "Portfolio Drawdown Limits Armed", ok: maxDailyDrawdownPct > 0 },
                      { label: "Broker Gateway Connected & Ready", ok: true },
                      { label: "Margin Requirement Satisfied", ok: requiredMargin <= allocatedCapital * leverage },
                      { label: "Fail-Closed Safety Engine Disarmed & Operational", ok: true },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {item.ok ? (
                          <CheckCircle2 className="h-4 w-4 text-[#55C98A] shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                        <span className={item.ok ? "text-[#8BA596]" : "text-red-400 font-bold"}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation & Error Alert Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/80 text-red-300 border border-red-800 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {draftSavedToast && (
            <div className="p-2.5 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978] text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Configuration draft saved safely to local storage!</span>
            </div>
          )}
        </div>

        {/* =========================================================
            STICKY FOOTER: BACK, SAVE DRAFT, CONTINUE / CREATE BOT
            ========================================================= */}
        <div className="p-4 border-t border-[#182C23] bg-[#060D0A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1 || createMutation.isPending}
              className="px-4 py-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white text-xs font-bold transition-colors disabled:opacity-30 flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3 py-2 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {step < 6 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || (environment === "LIVE" && !liveSafetyConfirmed)}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {createMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                <span>{createMutation.isPending ? "Instantiating..." : "Create Bot Instance"}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
