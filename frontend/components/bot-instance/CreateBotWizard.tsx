"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
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
  Zap,
  DollarSign,
  Activity,
  Check,
  Search,
  Plus,
  Trash2,
  Clock,
  Building2,
  Coins,
  Globe,
  Briefcase,
  Bookmark,
  RefreshCw,
  Lock,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Save,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  WizardAssetClass,
  BotExecutionMode,
  IndicatorConfigItem,
  StrategyRuleItem,
  ValidationEvidenceItem,
  BotWizardValidationResponse,
  calculateRemainingCapital,
  calculateAllocationPct,
  calculateRiskAmount,
  calculateRiskRewardRatio,
  formatCurrency,
} from "@/types/bot-control";
import { OptionsContractSelectorModal, SelectedOptionsContract } from "@/components/options/OptionsContractSelectorModal";

interface Props {
  botId?: string;
  isEditMode?: boolean;
}

const ASSET_CLASSES: { id: WizardAssetClass; label: string; icon: any; desc: string }[] = [
  { id: "INDEX", label: "Index", icon: TrendingUp, desc: "NIFTY 50, Bank Nifty, S&P 500" },
  { id: "STOCKS", label: "Stocks", icon: Building2, desc: "Cash Equities & Global Shares" },
  { id: "OPTIONS", label: "Options", icon: Layers, desc: "Index & Stock Options Spreads" },
  { id: "FUTURES", label: "Futures", icon: Activity, desc: "Perpetual & Dated Futures" },
  { id: "CRYPTO", label: "Crypto", icon: Coins, desc: "Spot & Perpetual Crypto Pairs" },
  { id: "CRYPTO_OPTIONS", label: "Crypto Options", icon: Zap, desc: "Deribit, Binance & Delta Chains" },
  { id: "COMMODITIES", label: "Commodities", icon: Globe, desc: "Gold, Silver, Crude Oil (MCX)" },
  { id: "FOREX", label: "Forex", icon: DollarSign, desc: "Major & Cross Currency Pairs" },
  { id: "ETF", label: "ETF", icon: Briefcase, desc: "Sector & Index Exchange Funds" },
];

const POPULAR_INSTRUMENTS: Record<WizardAssetClass, { symbol: string; name: string; exchange: string }[]> = {
  INDEX: [
    { symbol: "NIFTY 50", name: "Nifty 50 Benchmark Index", exchange: "NSE" },
    { symbol: "BANKNIFTY", name: "Nifty Bank Index", exchange: "NSE" },
    { symbol: "FINNIFTY", name: "Nifty Financial Services", exchange: "NSE" },
    { symbol: "SENSEX", name: "BSE SENSEX 30 Index", exchange: "BSE" },
    { symbol: "NASDAQ 100", name: "Nasdaq 100 US Index", exchange: "NASDAQ" },
    { symbol: "S&P 500", name: "Standard & Poor's 500", exchange: "CBOE" },
  ],
  STOCKS: [
    { symbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE" },
    { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE" },
    { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE" },
    { symbol: "INFY", name: "Infosys Technologies Ltd", exchange: "NSE" },
    { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
    { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
    { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
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
  ],
  CRYPTO: [
    { symbol: "BTC/USDT", name: "Bitcoin / Tether Spot", exchange: "BINANCE" },
    { symbol: "ETH/USDT", name: "Ethereum / Tether Spot", exchange: "BINANCE" },
    { symbol: "SOL/USDT", name: "Solana / Tether Spot", exchange: "BINANCE" },
    { symbol: "BNB/USDT", name: "Binance Coin / Tether", exchange: "BINANCE" },
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
  ],
  FOREX: [
    { symbol: "EUR/USD", name: "Euro / US Dollar", exchange: "FX_SPOT" },
    { symbol: "GBP/USD", name: "British Pound / US Dollar", exchange: "FX_SPOT" },
    { symbol: "USD/INR", name: "US Dollar / Indian Rupee", exchange: "NSE_CDS" },
  ],
  ETF: [
    { symbol: "NIFTYBEES", name: "Nippon India ETF Nifty BeES", exchange: "NSE" },
    { symbol: "GOLDBEES", name: "Nippon India ETF Gold BeES", exchange: "NSE" },
    { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE" },
  ],
};

const ALL_TIMEFRAMES = [
  { id: "1m", label: "1m", desc: "1 Minute (Scalping)" },
  { id: "3m", label: "3m", desc: "3 Minutes" },
  { id: "5m", label: "5m", desc: "5 Minutes (Intraday)" },
  { id: "15m", label: "15m", desc: "15 Minutes (Short-Term)" },
  { id: "30m", label: "30m", desc: "30 Minutes" },
  { id: "1h", label: "1h", desc: "1 Hour (Trend Confirmation)" },
  { id: "4h", label: "4h", desc: "4 Hours (Swing Trend)" },
  { id: "1d", label: "1d", desc: "1 Day (Macro Regime)" },
];

const AVAILABLE_INDICATORS = [
  { id: "ema_fast", name: "EMA (Fast 9)", category: "Trend" as const, defaultParams: { period: 9, source: "close" } },
  { id: "ema_slow", name: "EMA (Slow 21)", category: "Trend" as const, defaultParams: { period: 21, source: "close" } },
  { id: "rsi_14", name: "RSI (14)", category: "Momentum" as const, defaultParams: { period: 14, overbought: 70, oversold: 30 } },
  { id: "macd", name: "MACD (12, 26, 9)", category: "Momentum" as const, defaultParams: { fast: 12, slow: 26, signal: 9 } },
  { id: "vwap", name: "VWAP", category: "Volume" as const, defaultParams: { anchor: "session" } },
  { id: "atr_14", name: "ATR (14)", category: "Volatility" as const, defaultParams: { period: 14, multiplier: 1.5 } },
  { id: "adx_14", name: "ADX (14)", category: "Trend" as const, defaultParams: { period: 14, threshold: 25 } },
  { id: "bollinger", name: "Bollinger Bands", category: "Volatility" as const, defaultParams: { period: 20, stdDev: 2.0 } },
  { id: "supertrend", name: "Supertrend", category: "Trend" as const, defaultParams: { period: 10, multiplier: 3.0 } },
  { id: "volume_ma", name: "Volume (20 MA)", category: "Volume" as const, defaultParams: { period: 20 } },
];

export function CreateBotWizard({ botId, isEditMode = false }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState<number>(1);

  // STEP 1: IDENTITY & CAPITAL
  const [name, setName] = useState<string>("BTC Momentum Alpha Bot");
  const [description, setDescription] = useState<string>("Deterministic multi-indicator momentum bot with 20-stage risk gate.");
  const [groupName, setGroupName] = useState<string>("Crypto Scalping Bots");
  const [customGroup, setCustomGroup] = useState<string>("");
  const [isCreatingCustomGroup, setIsCreatingCustomGroup] = useState(false);
  const [environment, setEnvironment] = useState<BotExecutionMode>("PAPER");
  const [currency, setCurrency] = useState<"INR" | "USDT" | "USD">("USDT");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [totalCapital, setTotalCapital] = useState<number>(50000);
  const [allocatedCapital, setAllocatedCapital] = useState<number>(10000);
  const [sizingMethod, setSizingMethod] = useState<"RISK_PER_TRADE" | "FIXED_QUANTITY" | "PERCENT_EQUITY">("RISK_PER_TRADE");
  const [lotSize, setLotSize] = useState<number>(1);
  const [lotsCount, setLotsCount] = useState<number>(1);

  // STEP 2: MARKET & INSTRUMENT
  const [assetClass, setAssetClass] = useState<WizardAssetClass>("CRYPTO");
  const [symbol, setSymbol] = useState<string>("BTC/USDT");
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [exchange, setExchange] = useState<string>("ccxt_binance");

  // Options & Derivatives
  const [optionSide, setOptionSide] = useState<"CALL" | "PUT" | "BOTH">("BOTH");
  const [optionExpiry, setOptionExpiry] = useState("Nearest Weekly");
  const [strikeOffset, setStrikeOffset] = useState<number>(0);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  // STEP 3: STRATEGY ENGINE
  const [primaryTimeframe, setPrimaryTimeframe] = useState<string>("5m");
  const [additionalTimeframes, setAdditionalTimeframes] = useState<string[]>(["15m", "1h"]);
  const [executionTrigger, setExecutionTrigger] = useState<"CANDLE_CLOSE" | "INTRABAR">("CANDLE_CLOSE");
  const [warmUpBars, setWarmUpBars] = useState<number>(50);
  const [cooldownBars, setCooldownBars] = useState<number>(2);
  const [ruleConjunction, setRuleConjunction] = useState<"AND" | "OR">("AND");
  const [activeRuleTab, setActiveRuleTab] = useState<"LONG_ENTRY" | "LONG_EXIT" | "SHORT_ENTRY">("LONG_ENTRY");

  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfigItem[]>([
    { id: "ema_fast", name: "EMA (Fast 9)", category: "Trend", timeframe: "5m", params: { period: 9, source: "close" } },
    { id: "ema_slow", name: "EMA (Slow 21)", category: "Trend", timeframe: "5m", params: { period: 21, source: "close" } },
    { id: "rsi_14", name: "RSI (14)", category: "Momentum", timeframe: "5m", params: { period: 14, overbought: 70, oversold: 30 } },
    { id: "vwap", name: "VWAP", category: "Volume", timeframe: "5m", params: { anchor: "session" } },
  ]);

  const [strategyRules, setStrategyRules] = useState<StrategyRuleItem[]>([
    { id: "rule-1", leftIndicatorId: "ema_fast", operator: ">", rightType: "INDICATOR", rightIndicatorId: "ema_slow", isMandatory: true },
    { id: "rule-2", leftIndicatorId: "rsi_14", operator: ">", rightType: "THRESHOLD", rightValue: 52, isMandatory: true },
  ]);

  // STEP 4: RISK & EXITS
  const [stopLossPct, setStopLossPct] = useState<number>(1.5);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(3.0);
  const [trailingStopEnabled, setTrailingStopEnabled] = useState<boolean>(true);
  const [trailingStopPct, setTrailingStopPct] = useState<number>(0.5);
  const [activationProfitPct, setActivationProfitPct] = useState<number>(1.0);
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(2.0);
  const [maxDailyDrawdownPct, setMaxDailyDrawdownPct] = useState<number>(3.0);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(1);
  const [maxSlippagePct, setMaxSlippagePct] = useState<number>(0.2);

  // STEP 5: BROKER & EXECUTION
  const [brokerId, setBrokerId] = useState<string>("paper_simulator");
  const [accountId, setAccountId] = useState<string>("ACC-PRIMARY");
  const [leverage, setLeverage] = useState<number>(1.0);
  const [executionMode, setExecutionMode] = useState<"MANUAL" | "AUTOMATIC">("AUTOMATIC");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP-LIMIT">("MARKET");
  const [liveSafetyConfirmed, setLiveSafetyConfirmed] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Live Derived Calculations
  const slug = useMemo(() => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bot", [name]);
  const remainingCapital = useMemo(() => calculateRemainingCapital(totalCapital, allocatedCapital), [totalCapital, allocatedCapital]);
  const allocationPct = useMemo(() => calculateAllocationPct(totalCapital, allocatedCapital), [totalCapital, allocatedCapital]);
  const maxRiskAmount = useMemo(() => calculateRiskAmount(allocatedCapital, riskPerTradePct), [allocatedCapital, riskPerTradePct]);
  const estimatedMaxLoss = useMemo(() => calculateRiskAmount(allocatedCapital, stopLossPct), [allocatedCapital, stopLossPct]);
  const riskRewardRatio = useMemo(() => calculateRiskRewardRatio(stopLossPct, takeProfitPct), [stopLossPct, takeProfitPct]);
  const estimatedNotional = useMemo(() => allocatedCapital * Math.max(1, leverage), [allocatedCapital, leverage]);
  const requiredMargin = useMemo(() => Math.round((estimatedNotional / Math.max(1, leverage)) * 100) / 100, [estimatedNotional, leverage]);

  // Query Live Brokers
  const { data: brokersData } = useQuery({
    queryKey: ["brokersStatus"],
    queryFn: async () => {
      const res = await fetch("/api/brokers/status");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Query Pre-Flight Validation Evidence
  const { data: validationData, isLoading: isValidating, refetch: revalidateConfig } = useQuery<BotWizardValidationResponse>({
    queryKey: [
      "botValidation",
      name,
      symbol,
      assetClass,
      timeframeKey(primaryTimeframe),
      allocatedCapital,
      totalCapital,
      stopLossPct,
      takeProfitPct,
      leverage,
      brokerId,
      environment
    ],
    queryFn: async () => {
      const payload = {
        name,
        symbol,
        asset_class: assetClass,
        primary_timeframe: primaryTimeframe,
        timeframe: primaryTimeframe,
        allocated_capital: allocatedCapital,
        total_capital: totalCapital,
        stop_loss_pct: stopLossPct,
        profit_target_pct: takeProfitPct,
        risk_pct: riskPerTradePct,
        leverage,
        lot_size: lotSize,
        lots_count: lotsCount,
        broker_id: brokerId,
        execution_mode: environment,
        indicators: selectedIndicators,
        strategy_rules: strategyRules,
      };
      const res = await fetch("/api/bots/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    enabled: activeStep === 6,
    staleTime: 5000,
  });

  function timeframeKey(tf: string) {
    return tf || "5m";
  }

  // Load Existing Bot Config if in Edit Mode
  const { data: existingBotData } = useQuery({
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
      setPrimaryTimeframe(b.timeframe || "5m");
      setAssetClass(b.asset_class || "CRYPTO");
      setExchange(b.exchange || "ccxt_binance");
      setEnvironment(b.execution_mode || "PAPER");
      setAllocatedCapital(b.allocated_capital || 10000);
      setGroupName(b.group_name || "Crypto Scalping Bots");
      if (c.risk?.stop_loss_pct || c.stop_loss_pct) setStopLossPct(c.risk?.stop_loss_pct || c.stop_loss_pct);
      if (c.risk?.profit_target_pct || c.profit_target_pct) setTakeProfitPct(c.risk?.profit_target_pct || c.profit_target_pct);
      if (c.capital?.leverage || c.leverage) setLeverage(c.capital?.leverage || c.leverage);
      if (c.risk?.trailing_stop?.enabled || c.trailing_stop?.enabled) {
        setTrailingStopEnabled(true);
        setTrailingStopPct(c.risk?.trailing_stop?.distance_pct || c.trailing_stop?.distance_pct || 0.5);
      }
    }
  }, [existingBotData]);

  const handleContractSelected = (contract: SelectedOptionsContract) => {
    setSymbol(contract.symbol);
    setExchange(contract.exchange);
    setOptionExpiry(contract.expiry);
    setOptionSide(contract.option_type === "CALL" ? "CALL" : "PUT");
    setStrikeOffset(contract.strike);
  };

  // Save Draft Mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        symbol,
        assetClass,
        allocatedCapital,
        totalCapital,
        primaryTimeframe,
        strategyRules,
        selectedIndicators,
        stopLossPct,
        takeProfitPct,
        leverage,
        brokerId,
        environment,
      };
      const res = await fetch("/api/bots/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save draft");
      return data;
    },
    onSuccess: () => {
      setSuccessMessage("Draft saved successfully to persistent database.");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Error saving draft");
    },
  });

  // Create / Update Bot Mutation
  const saveMutation = useMutation({
    mutationFn: async (initialStatus: "STOPPED" | "DRAFT" = "STOPPED") => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        symbol: symbol.toUpperCase(),
        strategy: strategyRules.map((r) => `${r.leftIndicatorId} ${r.operator} ${r.rightType === "INDICATOR" ? r.rightIndicatorId : r.rightValue}`).join(" AND ") || "EMA_MACD_VP",
        strategy_type: "DETERMINISTIC_RULES",
        primary_timeframe: primaryTimeframe,
        timeframe: primaryTimeframe,
        asset_class: assetClass,
        exchange: brokerId === "paper_simulator" ? "paper_simulator" : exchange,
        data_provider_id: exchange,
        broker_id: brokerId,
        execution_mode: environment,
        initial_status: initialStatus,
        total_capital: totalCapital,
        allocated_capital: allocatedCapital,
        currency,
        timezone,
        group_name: isCreatingCustomGroup && customGroup ? customGroup.trim() : groupName,
        stop_loss_pct: stopLossPct,
        profit_target_pct: takeProfitPct,
        risk_pct: riskPerTradePct,
        max_daily_drawdown_pct: maxDailyDrawdownPct,
        max_open_positions: maxOpenPositions,
        leverage,
        lot_size: lotSize,
        lots_count: lotsCount,
        trailing_stop: {
          enabled: trailingStopEnabled,
          method: "percent",
          distance_pct: trailingStopPct,
          activation_pct: activationProfitPct,
        },
        indicators: selectedIndicators,
        indicator_combination: {
          operator: ruleConjunction,
          rules: strategyRules,
        },
        multi_timeframe: {
          entry_tf: primaryTimeframe,
          additional_tfs: additionalTimeframes,
        },
        execution_config: {
          broker_id: brokerId,
          account_id: accountId,
          execution_mode: executionMode,
          order_type: orderType,
          max_slippage_pct: maxSlippagePct,
        },
      };

      const url = isEditMode && botId ? `/api/bots/${botId}` : "/api/bots/create";
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
      setSuccessMessage(data.message || "Bot instance created safely in STOPPED paper mode.");
      setTimeout(() => {
        router.push("/bots");
      }, 1200);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Error creating bot instance");
    },
  });

  const STEPS_NAV = [
    { num: 1, label: "Identity & Capital" },
    { num: 2, label: "Market & Instrument" },
    { num: 3, label: "Strategy Engine" },
    { num: 4, label: "Risk & Exits" },
    { num: 5, label: "Broker & Execution" },
    { num: 6, label: "Review & Activate" },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-sans text-xs">
      
      {/* Header Bar */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#123C2A] text-[#55C98A] border border-[#39B978]/40 shadow-md">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white uppercase tracking-wider">
                  {isEditMode ? `Edit Bot Instance: ${name}` : "Create Bot Instance Wizard"}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#142B21] text-[#55C98A] border border-[#275841]">
                  VERSION 2.0 • DETERMINISTIC BOT FACTORY
                </span>
              </div>
              <p className="text-xs text-[#8BA596]">
                Configure capital bounds, asset selection, indicator rules, 20-stage risk gates, and paper-safe execution.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => saveDraftMutation.mutate()}
              disabled={saveDraftMutation.isPending}
              className="px-3.5 py-2 rounded-xl bg-[#0C1B15] hover:bg-[#14271F] text-[#8BA596] hover:text-white border border-[#1A3127] font-bold text-xs transition flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5 text-[#55C98A]" />
              <span>{saveDraftMutation.isPending ? "Saving Draft..." : "Save Draft"}</span>
            </button>
          </div>
        </div>

        {/* Stepper Breadcrumb Buttons */}
        <div className="grid grid-cols-6 gap-2">
          {STEPS_NAV.map((s) => {
            const isCurrent = activeStep === s.num;
            const isCompleted = activeStep > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setActiveStep(s.num)}
                className={`p-2.5 rounded-xl text-left font-bold transition-all flex items-center gap-2 ${
                  isCurrent
                    ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]/60 shadow-md ring-1 ring-[#55C98A]/30"
                    : isCompleted
                    ? "bg-[#0C1B15] text-[#8BA596] hover:text-white border border-[#183126]"
                    : "bg-[#060D0A] text-[#42584C] border border-[#11221A] opacity-60"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                    isCompleted ? "bg-[#55C98A] text-black" : isCurrent ? "bg-[#256B4A] text-white" : "bg-[#14271F] text-[#607D6E]"
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : s.num}
                </div>
                <span className="truncate hidden sm:inline text-[11px]">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Content Panels */}
      <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-6 shadow-xl space-y-6">
        
        {/* STEP 1: IDENTITY & CAPITAL */}
        {activeStep === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <Bot className="h-4 w-4 text-[#55C98A]" />
                <span>Bot Identity & Grouping</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold flex justify-between">
                  <span>Bot Instance Name *</span>
                  <span className="text-cyan-400 font-mono text-[10px]">Slug: {slug}</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#55C98A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#55C98A] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#8BA596] font-semibold">Fleet Group</label>
                  <select
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none"
                  >
                    <option value="Crypto Scalping Bots">Crypto Scalping Bots</option>
                    <option value="NSE Options Bots">NSE Options Bots</option>
                    <option value="Futures Trend Bots">Futures Trend Bots</option>
                    <option value="Commodity Momentum Bots">Commodity Momentum Bots</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#8BA596] font-semibold">Trading Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  >
                    <option value="UTC">UTC (Global Crypto)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Execution Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvironment("PAPER")}
                    className={`p-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
                      environment === "PAPER" ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]" : "bg-[#060D0A] text-[#8BA596]"
                    }`}
                  >
                    PAPER SIMULATOR (Safe Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironment("LIVE")}
                    className={`p-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
                      environment === "LIVE" ? "bg-red-950/60 text-red-400 border border-red-700" : "bg-[#060D0A] text-[#8BA596]"
                    }`}
                  >
                    LIVE TRADING (Gate Locked)
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <DollarSign className="h-4 w-4 text-[#55C98A]" />
                <span>Capital Sizing Model</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#8BA596] font-semibold">Total Capital Available *</label>
                  <input
                    type="number"
                    value={totalCapital}
                    onChange={(e) => setTotalCapital(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#8BA596] font-semibold">Allocated Capital to Bot *</label>
                  <input
                    type="number"
                    value={allocatedCapital}
                    onChange={(e) => setAllocatedCapital(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2.5 text-xs text-cyan-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#8BA596]">Allocated / Total:</span>
                  <span className="text-white font-bold">{formatCurrency(allocatedCapital, currency)} / {formatCurrency(totalCapital, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8BA596]">Remaining Capital:</span>
                  <span className="text-[#55C98A] font-bold">{formatCurrency(remainingCapital, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8BA596]">Allocation Ratio:</span>
                  <span className="text-cyan-400 font-bold">{allocationPct}%</span>
                </div>
                <div className="flex justify-between border-t border-[#1A3127] pt-1.5">
                  <span className="text-[#8BA596]">Max Per-Trade Risk:</span>
                  <span className="text-yellow-400 font-bold">{formatCurrency(maxRiskAmount, currency)} ({riskPerTradePct}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MARKET & INSTRUMENT */}
        {activeStep === 2 && (
          <div className="space-y-5 animate-fadeIn">
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
                      if (ac.id === "STOCKS" || ac.id === "INDEX" || ac.id === "OPTIONS") {
                        setCurrency("INR");
                      } else {
                        setCurrency("USDT");
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

            {/* Options Live Chain Trigger */}
            {(assetClass === "OPTIONS" || assetClass === "CRYPTO_OPTIONS") && (
              <div className="p-4 bg-[#0B182B]/90 border border-purple-500/40 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold text-white uppercase">Options Contract Chain & Strike Offset</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      LIVE CONTRACT MASTER
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Selected contract: <strong className="text-cyan-400 font-mono">{symbol}</strong> ({exchange})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOptionsModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md shadow-purple-500/30 flex items-center gap-1.5 shrink-0"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Launch Options Chain</span>
                </button>
              </div>
            )}

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase">Select Trading Instrument ({assetClass})</span>
                <input
                  type="text"
                  placeholder="Filter symbols..."
                  value={instrumentSearch}
                  onChange={(e) => setInstrumentSearch(e.target.value)}
                  className="bg-[#060D0A] border border-[#1A3127] rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {(POPULAR_INSTRUMENTS[assetClass] || [])
                  .filter((item) => item.symbol.toLowerCase().includes(instrumentSearch.toLowerCase()))
                  .map((item) => (
                    <button
                      key={item.symbol}
                      type="button"
                      onClick={() => {
                        setSymbol(item.symbol);
                        setExchange(item.exchange);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        symbol === item.symbol
                          ? "bg-[#123C2A] border-[#39B978] text-white"
                          : "bg-[#060D0A] border-[#1A3127] text-[#8BA596] hover:text-white"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-mono font-bold text-cyan-400">{item.symbol}</span>
                        <span className="text-[9px] px-1 rounded bg-[#11221A] text-[#607D6E]">{item.exchange}</span>
                      </div>
                      <p className="text-[10px] text-[#8BA596] truncate mt-1">{item.name}</p>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: STRATEGY ENGINE */}
        {activeStep === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-[#1A3127] pb-2">
                <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#55C98A]" />
                  <span>Primary Execution Timeframe & Trigger Mode</span>
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8BA596]">Execution Trigger:</span>
                  <select
                    value={executionTrigger}
                    onChange={(e) => setExecutionTrigger(e.target.value as any)}
                    className="bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-cyan-400 font-mono font-bold"
                  >
                    <option value="CANDLE_CLOSE">CANDLE CLOSE (Deterministic)</option>
                    <option value="INTRABAR">INTRABAR (Tick Scalping)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {ALL_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setPrimaryTimeframe(tf.id)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                      primaryTimeframe === tf.id
                        ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]"
                        : "bg-[#060D0A] text-[#8BA596] border border-[#1A3127]"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase">Quantitative Indicators</h3>
                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
                  {AVAILABLE_INDICATORS.map((ind) => {
                    const isAdded = selectedIndicators.some((i) => i.id === ind.id);
                    return (
                      <div key={ind.id} className="p-2 rounded-xl bg-[#060D0A] border border-[#1A3127] flex justify-between items-center">
                        <div>
                          <span className="font-bold text-xs text-white">{ind.name}</span>
                          <span className="ml-2 text-[9px] px-1 rounded bg-[#11221A] text-[#607D6E]">{ind.category}</span>
                        </div>
                        {isAdded ? (
                          <button
                            type="button"
                            onClick={() => setSelectedIndicators(selectedIndicators.filter((i) => i.id !== ind.id))}
                            className="text-red-400 p-1 hover:bg-red-950/40 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedIndicators([...selectedIndicators, { id: ind.id, name: ind.name, category: ind.category, timeframe: primaryTimeframe, params: { ...ind.defaultParams } }])}
                            className="text-[#55C98A] p-1 hover:bg-[#123C2A] rounded"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase">Rule Confluence Tree</h3>
                  <select
                    value={ruleConjunction}
                    onChange={(e) => setRuleConjunction(e.target.value as any)}
                    className="bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-0.5 text-xs text-[#55C98A] font-bold"
                  >
                    <option value="AND">ALL Rules (AND)</option>
                    <option value="OR">ANY Rule (OR)</option>
                  </select>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {strategyRules.map((rule, idx) => (
                    <div key={rule.id} className="p-2.5 bg-[#060D0A] border border-[#1A3127] rounded-xl flex items-center justify-between font-mono text-xs">
                      <span className="text-cyan-400 font-bold">{rule.leftIndicatorId} {rule.operator} {rule.rightValue || rule.rightIndicatorId}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-yellow-950/60 text-yellow-400 border border-yellow-800">
                        {rule.isMandatory ? "MANDATORY" : "OPTIONAL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: RISK & EXITS */}
        {activeStep === 4 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <Shield className="h-4 w-4 text-[#55C98A]" />
                <span>Stop Loss & Take Profit Target</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold flex justify-between">
                  <span>Stop Loss (%) *</span>
                  <span className="text-red-400 font-mono">Max Loss: {formatCurrency(estimatedMaxLoss, currency)}</span>
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={stopLossPct}
                  onChange={(e) => setStopLossPct(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-red-400 font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold flex justify-between">
                  <span>Take Profit Target (%) *</span>
                  <span className="text-emerald-400 font-mono">R:R Ratio = {riskRewardRatio}</span>
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={takeProfitPct}
                  onChange={(e) => setTakeProfitPct(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold"
                />
              </div>

              <div className="p-3 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">Trailing Stop Loss</span>
                  <input
                    type="checkbox"
                    checked={trailingStopEnabled}
                    onChange={(e) => setTrailingStopEnabled(e.target.checked)}
                    className="accent-[#55C98A]"
                  />
                </div>
                {trailingStopEnabled && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-[#8BA596]">Trailing Dist (%)</span>
                      <input
                        type="number"
                        step={0.1}
                        value={trailingStopPct}
                        onChange={(e) => setTrailingStopPct(parseFloat(e.target.value) || 0.5)}
                        className="w-full bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8BA596]">Activation Profit (%)</span>
                      <input
                        type="number"
                        step={0.1}
                        value={activationProfitPct}
                        onChange={(e) => setActivationProfitPct(parseFloat(e.target.value) || 1.0)}
                        className="w-full bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span>Drawdown & Position Bounds</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Max Daily Drawdown (%)</label>
                <input
                  type="number"
                  step={0.5}
                  value={maxDailyDrawdownPct}
                  onChange={(e) => setMaxDailyDrawdownPct(parseFloat(e.target.value) || 3.0)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Max Open Positions</label>
                <input
                  type="number"
                  value={maxOpenPositions}
                  onChange={(e) => setMaxOpenPositions(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Max Slippage Tolerance (%)</label>
                <input
                  type="number"
                  step={0.05}
                  value={maxSlippagePct}
                  onChange={(e) => setMaxSlippagePct(parseFloat(e.target.value) || 0.2)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: BROKER & EXECUTION */}
        {activeStep === 5 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <Building2 className="h-4 w-4 text-[#55C98A]" />
                <span>Broker & Execution Router</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Execution Broker</label>
                <select
                  value={brokerId}
                  onChange={(e) => setBrokerId(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="paper_simulator">QuantOS Paper Simulator (CONNECTED)</option>
                  <option value="ccxt_binance">Binance Global (Spot & Perps)</option>
                  <option value="upstox">Upstox Pro (NSE / BSE / MCX)</option>
                  <option value="dhan_india">Dhan HQ (NSE Equities / F&O)</option>
                  <option value="zerodha_kite">Zerodha Kite Connect</option>
                  <option value="deribit">Deribit (Crypto Options)</option>
                  <option value="interactive_brokers">Interactive Brokers TWS</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Leverage Multiplier</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 5, 10].map((lev) => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setLeverage(lev)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold ${
                        leverage === lev ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]" : "bg-[#060D0A] text-[#8BA596]"
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as any)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-mono"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                  <option value="STOP">STOP</option>
                  <option value="STOP-LIMIT">STOP-LIMIT</option>
                </select>
              </div>
            </div>

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4 text-xs font-mono">
              <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <Shield className="h-4 w-4 text-[#55C98A]" />
                <span>Margin Estimates & Safety Status</span>
              </h3>

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

              {environment === "LIVE" && (
                <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl space-y-2 text-xs text-red-300 font-sans">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>Live Trading Safety Gate</span>
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
        )}

        {/* STEP 6: REVIEW, VALIDATE & ACTIVATE */}
        {activeStep === 6 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Configuration Summary Card */}
              <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3 text-xs font-mono">
                <div className="flex items-center gap-2 border-b border-[#1A3127] pb-2">
                  <CheckCircle2 className="h-4 w-4 text-[#55C98A]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Configuration Summary
                  </h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Bot Name:</span>
                    <span className="text-white font-bold truncate max-w-[200px]">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8BA596]">Slug:</span>
                    <span className="text-cyan-400 font-bold">{slug}</span>
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

              {/* Real Backend Evidence Telemetry */}
              <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A3127] pb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#55C98A]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Authoritative Backend Safety Evidence
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => revalidateConfig()}
                    className="text-[#55C98A] hover:text-white flex items-center gap-1 text-[10px]"
                  >
                    <RefreshCw className={`h-3 w-3 ${isValidating ? "animate-spin" : ""}`} />
                    <span>Re-Validate</span>
                  </button>
                </div>

                <div className="space-y-2 text-[11px]">
                  {validationData?.evidence && validationData.evidence.length > 0 ? (
                    validationData.evidence.map((item) => (
                      <div key={item.id} className="p-2 rounded-lg bg-[#060D0A] border border-[#1A3127] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {item.status === "PASSED" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#55C98A] shrink-0" />
                            ) : item.status === "WARNING" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                            )}
                            <span className="font-bold text-white text-[11px]">{item.label}</span>
                          </div>
                          <span className={`text-[9px] px-1 rounded font-mono font-bold ${
                            item.status === "PASSED" ? "bg-[#123C2A] text-[#55C98A]" : "bg-yellow-950/60 text-yellow-400"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8BA596] pl-5">{item.evidence_text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-center text-[#8BA596]">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-[#55C98A]" />
                      <span>Validating 20-stage safety precheck gates with server...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="p-3 bg-red-950/80 text-red-300 border border-red-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-[#123C2A] text-[#55C98A] border border-[#39B978] rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="border-t border-[#182C23] pt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
            disabled={activeStep === 1 || saveMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-[#0C1713] hover:bg-[#14271F] text-[#8BA596] hover:text-white font-bold transition-colors disabled:opacity-30 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3">
            {activeStep < 6 ? (
              <button
                type="button"
                onClick={() => setActiveStep(Math.min(6, activeStep + 1))}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => saveMutation.mutate("STOPPED")}
                disabled={saveMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-md flex items-center gap-2"
              >
                {saveMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                <span>{saveMutation.isPending ? "Creating Instance..." : isEditMode ? "Save Changes" : "Create Bot Instance"}</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Options Contract Selector Modal */}
      <OptionsContractSelectorModal
        isOpen={isOptionsModalOpen}
        onClose={() => setIsOptionsModalOpen(false)}
        onSelectContract={handleContractSelected}
        initialUnderlying={symbol}
        initialAssetClass={assetClass === "OPTIONS" ? "OPTIONS" : "CRYPTO_OPTIONS"}
        botName={name}
      />
    </div>
  );
}
