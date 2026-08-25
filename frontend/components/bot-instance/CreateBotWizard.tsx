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
  RefreshCw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ],
  OPTIONS: [
    { symbol: "NIFTY", name: "Nifty 50 Weekly / Monthly Options", exchange: "NFO" },
    { symbol: "BANKNIFTY", name: "Bank Nifty Options Chain", exchange: "NFO" },
    { symbol: "FINNIFTY", name: "Fin Nifty Options Chain", exchange: "NFO" },
    { symbol: "RELIANCE", name: "Reliance Stock Options", exchange: "NFO" },
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
    { symbol: "PEPE/USDT", name: "Pepe / Tether Spot", exchange: "BINANCE" },
  ],
  CRYPTO_OPTIONS: [
    { symbol: "BTC-OPTIONS", name: "Bitcoin Options Chain", exchange: "DERIBIT" },
    { symbol: "ETH-OPTIONS", name: "Ethereum Options Chain", exchange: "DERIBIT" },
    { symbol: "SOL-OPTIONS", name: "Solana Options Chain", exchange: "DERIBIT" },
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
  { id: "10m", label: "10m", desc: "10 Minutes" },
  { id: "15m", label: "15m", desc: "15 Minutes (Short-Term)" },
  { id: "30m", label: "30m", desc: "30 Minutes" },
  { id: "45m", label: "45m", desc: "45 Minutes" },
  { id: "1h", label: "1h", desc: "1 Hour (Trend Confirmation)" },
  { id: "2h", label: "2h", desc: "2 Hours" },
  { id: "4h", label: "4h", desc: "4 Hours (Swing Trend)" },
  { id: "1d", label: "1d", desc: "1 Day (Macro Regime)" },
  { id: "1w", label: "1w", desc: "1 Week" },
  { id: "1M", label: "1M", desc: "1 Month (Macro Cycle)" },
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
  const [name, setName] = useState<string>("BTC Trend Following Bot");
  const [description, setDescription] = useState<string>("Deterministic multi-indicator momentum bot");
  const [groupName, setGroupName] = useState<string>("Crypto Scalping Bots");
  const [customGroup, setCustomGroup] = useState<string>("");
  const [isCreatingCustomGroup, setIsCreatingCustomGroup] = useState(false);
  const [environment, setEnvironment] = useState<BotExecutionMode>("PAPER");
  const [currency, setCurrency] = useState<"INR" | "USDT" | "USD">("USDT");
  const [totalCapital, setTotalCapital] = useState<number>(50000);
  const [allocatedCapital, setAllocatedCapital] = useState<number>(10000);

  // STEP 2: MARKET & INSTRUMENT
  const [assetClass, setAssetClass] = useState<WizardAssetClass>("CRYPTO");
  const [symbol, setSymbol] = useState<string>("BTC/USDT");
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [exchange, setExchange] = useState<string>("ccxt_binance");

  // Options & Derivatives
  const [optionSide, setOptionSide] = useState<"CALL" | "PUT" | "BOTH">("BOTH");
  const [callPremiumMin, setCallPremiumMin] = useState<number | null>(50);
  const [callPremiumMax, setCallPremiumMax] = useState<number | null>(200);
  const [callNoLimit, setCallNoLimit] = useState(false);
  const [putPremiumMin, setPutPremiumMin] = useState<number | null>(50);
  const [putPremiumMax, setPutPremiumMax] = useState<number | null>(200);
  const [putNoLimit, setPutNoLimit] = useState(false);
  const [optionExpiry, setOptionExpiry] = useState("Nearest Weekly");
  const [strikeOffset, setStrikeOffset] = useState<number>(0);

  // Crypto Options
  const [cryptoOptExchange, setCryptoOptExchange] = useState("deribit");
  const [cryptoOptUnderlying, setCryptoOptUnderlying] = useState("BTC");
  const [cryptoOptType, setCryptoOptType] = useState<"CALL" | "PUT" | "BOTH">("BOTH");
  const [cryptoOptStrike, setCryptoOptStrike] = useState("65000");

  // STEP 3: TIMEFRAME & INDICATORS
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
  ]);

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
  const [accountId, setAccountId] = useState<string>("ACC-001");
  const [leverage, setLeverage] = useState<number>(2.0);
  const [executionMode, setExecutionMode] = useState<"MANUAL" | "AUTOMATIC">("MANUAL");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP" | "STOP-LIMIT">("MARKET");
  const [maxSlippagePct, setMaxSlippagePct] = useState<number>(0.2);
  const [liveSafetyConfirmed, setLiveSafetyConfirmed] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  // Fetch Existing Bot Config if Edit Mode
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
      if (c.stop_loss_pct) setStopLossPct(c.stop_loss_pct);
      if (c.profit_target_pct) setTakeProfitPct(c.profit_target_pct);
      if (c.leverage) setLeverage(c.leverage);
      if (c.trailing_stop?.enabled) {
        setTrailingStopEnabled(true);
        setTrailingStopPct(c.trailing_stop.distance_pct || 0.5);
      }
    }
  }, [existingBotData]);

  // Calculations
  const remainingCapital = useMemo(() => calculateRemainingCapital(totalCapital, allocatedCapital), [totalCapital, allocatedCapital]);
  const allocationPct = useMemo(() => calculateAllocationPct(totalCapital, allocatedCapital), [totalCapital, allocatedCapital]);
  const maxRiskAmount = useMemo(() => calculateRiskAmount(allocatedCapital, riskPerTradePct), [allocatedCapital, riskPerTradePct]);
  const estimatedMaxLoss = useMemo(() => calculateRiskAmount(allocatedCapital, stopLossPct), [allocatedCapital, stopLossPct]);
  const riskRewardRatio = useMemo(() => calculateRiskRewardRatio(stopLossPct, takeProfitPct), [stopLossPct, takeProfitPct]);
  const estimatedNotional = useMemo(() => allocatedCapital * Math.max(1, leverage), [allocatedCapital, leverage]);
  const requiredMargin = useMemo(() => Math.round((estimatedNotional / Math.max(1, leverage)) * 100) / 100, [estimatedNotional, leverage]);

  // Save Mutation
  const saveMutation = useMutation({
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
          strike_offset: strikeOffset,
        },
        crypto_options: assetClass === "CRYPTO_OPTIONS" ? {
          exchange: cryptoOptExchange,
          underlying: cryptoOptUnderlying,
          option_type: cryptoOptType,
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
      setSuccessMessage(data.message || "Bot instance saved successfully!");
      setTimeout(() => {
        router.push("/bots");
      }, 1200);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Error saving bot instance");
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
                  6-STEP DETERMINISTIC ENGINE
                </span>
              </div>
              <p className="text-xs text-[#8BA596]">
                Configure capital bounds, asset selection, indicator rules, risk controls, and broker execution.
              </p>
            </div>
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
        
        {/* STEP 1 */}
        {activeStep === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <Bot className="h-4 w-4 text-[#55C98A]" />
                <span>Bot Identity & Grouping</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Bot Instance Name *</label>
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
                <label className="text-[11px] text-[#8BA596] font-semibold">Environment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvironment("PAPER")}
                    className={`p-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
                      environment === "PAPER" ? "bg-[#123C2A] text-[#55C98A] border border-[#39B978]" : "bg-[#060D0A] text-[#8BA596]"
                    }`}
                  >
                    PAPER (Simulated)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvironment("LIVE")}
                    className={`p-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
                      environment === "LIVE" ? "bg-red-950/60 text-red-400 border border-red-700" : "bg-[#060D0A] text-[#8BA596]"
                    }`}
                  >
                    LIVE TRADING
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <DollarSign className="h-4 w-4 text-[#55C98A]" />
                <span>Capital Sizing Model</span>
              </h3>

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

              <div className="p-3 bg-[#060D0A] border border-[#1A3127] rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[#8BA596]">Allocation:</span>
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
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
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

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase">Select Trading Instrument ({assetClass})</span>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={instrumentSearch}
                  onChange={(e) => setInstrumentSearch(e.target.value)}
                  className="bg-[#060D0A] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white"
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

        {/* STEP 3 */}
        {activeStep === 3 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <Clock className="h-4 w-4 text-[#55C98A]" />
                <span>Primary Execution Timeframe</span>
              </h3>
              <div className="grid grid-cols-6 sm:grid-cols-13 gap-1.5">
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
                        <span className="font-bold text-xs text-white">{ind.name}</span>
                        {isAdded ? (
                          <button
                            type="button"
                            onClick={() => setSelectedIndicators(selectedIndicators.filter((i) => i.id !== ind.id))}
                            className="text-red-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedIndicators([...selectedIndicators, { id: ind.id, name: ind.name, category: ind.category, timeframe: primaryTimeframe, params: { ...ind.defaultParams } }])}
                            className="text-[#55C98A] p-1"
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
                <h3 className="text-xs font-bold text-white uppercase">Rule Confluence Tree</h3>
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

        {/* STEP 4 */}
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
                    <input
                      type="number"
                      step={0.1}
                      value={trailingStopPct}
                      onChange={(e) => setTrailingStopPct(parseFloat(e.target.value) || 0.5)}
                      className="bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
                    <input
                      type="number"
                      step={0.1}
                      value={activationProfitPct}
                      onChange={(e) => setActivationProfitPct(parseFloat(e.target.value) || 1.0)}
                      className="bg-[#0C1713] border border-[#1A3127] rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
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
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {activeStep === 5 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <Building2 className="h-4 w-4 text-[#55C98A]" />
                <span>Broker Routing</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Broker Gateway</label>
                <select
                  value={brokerId}
                  onChange={(e) => setBrokerId(e.target.value)}
                  className="w-full bg-[#060D0A] border border-[#1A3127] rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="paper_simulator">QuantOS Paper Simulator (CONNECTED)</option>
                  <option value="dhan_india">Dhan HQ (CONNECTED)</option>
                  <option value="zerodha_kite">Zerodha Kite Connect (CONNECTED)</option>
                  <option value="ccxt_binance">Binance Global (CONNECTED)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-[#8BA596] font-semibold">Leverage</label>
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
            </div>

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-4 text-xs font-mono">
              <h3 className="text-xs font-bold text-white uppercase flex items-center gap-2 border-b border-[#1A3127] pb-2">
                <Shield className="h-4 w-4 text-[#55C98A]" />
                <span>Margin Estimates</span>
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
            </div>
          </div>
        )}

        {/* STEP 6 */}
        {activeStep === 6 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-3 text-xs font-mono">
              <h3 className="text-xs font-bold text-white uppercase border-b border-[#1A3127] pb-2">
                Review Configuration
              </h3>
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Bot Name:</span>
                <span className="text-white font-bold">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Instrument & TF:</span>
                <span className="text-cyan-400 font-bold">{symbol} ({primaryTimeframe})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Allocated Capital:</span>
                <span className="text-[#55C98A] font-bold">{formatCurrency(allocatedCapital, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8BA596]">R:R Bounds:</span>
                <span className="text-white font-bold">SL {stopLossPct}% / TP {takeProfitPct}% ({riskRewardRatio})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8BA596]">Broker Gateway:</span>
                <span className="text-cyan-400 font-bold">{brokerId} ({leverage}x)</span>
              </div>
            </div>

            <div className="bg-[#0C1713] border border-[#1A3127] rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase border-b border-[#1A3127] pb-2">
                Deterministic Pre-Check Gates
              </h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-[#55C98A]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Capital Allocation & Risk Bounds Valid</span>
                </div>
                <div className="flex items-center gap-2 text-[#55C98A]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Instrument & Timeframe Feasibility Verified</span>
                </div>
                <div className="flex items-center gap-2 text-[#55C98A]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Quantitative Indicators & Combiner Rules Ready</span>
                </div>
                <div className="flex items-center gap-2 text-[#55C98A]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Broker Connection & Margin Bounds Satisfied</span>
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
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-md flex items-center gap-2"
              >
                {saveMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                <span>{saveMutation.isPending ? "Saving..." : isEditMode ? "Save Changes" : "Create Bot Instance"}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
