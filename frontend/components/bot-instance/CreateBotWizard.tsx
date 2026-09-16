"use client";

import { formatNumber } from "@/lib/formatters";
import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Play,
  Radio,
  Sparkles,
  ExternalLink,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Eye,
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
import { useBotCreationIntentStore } from "@/lib/store/useBotCreationIntentStore";
import { BotCreationIntent } from "@/types/bot-creation-intent";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";

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

const QUICK_STRATEGIES = [
  {
    id: "MOMENTUM_CONFLUENCE",
    name: "Momentum Confluence (EMA + RSI)",
    desc: "Fast EMA trend filter paired with RSI momentum threshold for high-probability setups.",
    indicators: [
      { id: "ema_fast", name: "EMA (Fast 9)", category: "Trend" as const, timeframe: "5m", params: { period: 9, source: "close" } },
      { id: "ema_slow", name: "EMA (Slow 21)", category: "Trend" as const, timeframe: "5m", params: { period: 21, source: "close" } },
      { id: "rsi_14", name: "RSI (14)", category: "Momentum" as const, timeframe: "5m", params: { period: 14, overbought: 70, oversold: 30 } },
    ],
    rules: [
      { id: "q-rule-1", leftIndicatorId: "ema_fast", operator: ">" as const, rightType: "INDICATOR" as const, rightIndicatorId: "ema_slow", isMandatory: true },
      { id: "q-rule-2", leftIndicatorId: "rsi_14", operator: ">" as const, rightType: "THRESHOLD" as const, rightValue: 50, isMandatory: true },
    ],
  },
  {
    id: "TREND_SUPERTREND_VWAP",
    name: "Trend Master (Supertrend + VWAP)",
    desc: "Institutional session VWAP anchor confirmed with dynamic ATR Supertrend trailing.",
    indicators: [
      { id: "supertrend", name: "Supertrend (10, 3.0)", category: "Trend" as const, timeframe: "5m", params: { period: 10, multiplier: 3.0 } },
      { id: "vwap", name: "VWAP", category: "Volume" as const, timeframe: "5m", params: { anchor: "session" } },
    ],
    rules: [
      { id: "q-rule-3", leftIndicatorId: "supertrend", operator: ">" as const, rightType: "THRESHOLD" as const, rightValue: 0, isMandatory: true },
      { id: "q-rule-4", leftIndicatorId: "vwap", operator: ">=" as const, rightType: "THRESHOLD" as const, rightValue: 0, isMandatory: true },
    ],
  },
  {
    id: "MEAN_REVERSION_BB",
    name: "Mean Reversion (Bollinger + RSI)",
    desc: "Exploits standard deviation extreme stretches and overbought/oversold snap-backs.",
    indicators: [
      { id: "bollinger", name: "Bollinger Bands", category: "Volatility" as const, timeframe: "5m", params: { period: 20, stdDev: 2.0 } },
      { id: "rsi_14", name: "RSI (14)", category: "Momentum" as const, timeframe: "5m", params: { period: 14, overbought: 70, oversold: 30 } },
    ],
    rules: [
      { id: "q-rule-5", leftIndicatorId: "rsi_14", operator: "<" as const, rightType: "THRESHOLD" as const, rightValue: 35, isMandatory: true },
    ],
  },
  {
    id: "VOLATILITY_BREAKOUT",
    name: "Volatility Breakout (ATR + MACD)",
    desc: "Captures sudden expansion in ATR range aligned with MACD histogram acceleration.",
    indicators: [
      { id: "macd", name: "MACD (12, 26, 9)", category: "Momentum" as const, timeframe: "5m", params: { fast: 12, slow: 26, signal: 9 } },
      { id: "atr_14", name: "ATR (14)", category: "Volatility" as const, timeframe: "5m", params: { period: 14, multiplier: 1.5 } },
    ],
    rules: [
      { id: "q-rule-6", leftIndicatorId: "macd", operator: ">" as const, rightType: "THRESHOLD" as const, rightValue: 0, isMandatory: true },
    ],
  },
];

export function CreateBotWizard({ botId, isEditMode = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Mode: QUICK vs ADVANCED
  const [wizardMode, setWizardMode] = useState<"QUICK" | "ADVANCED">("QUICK");
  const [activeStep, setActiveStep] = useState<number>(1);

  // Intent State
  const activeIntentFromStore = useBotCreationIntentStore((state) => state.activeIntent);
  const loadStoredIntent = useBotCreationIntentStore((state) => state.loadStoredIntent);
  const clearIntent = useBotCreationIntentStore((state) => state.clearIntent);

  const [activeIntent, setActiveIntent] = useState<BotCreationIntent | null>(null);

  // INSTITUTIONAL 8-TIER HIERARCHY STATE
  const [customerId, setCustomerId] = useState<string>("cust_default");
  const [departmentId, setDepartmentId] = useState<string>("dept_algo_trading");
  const [brokerFolderId, setBrokerFolderId] = useState<string>("bf_paper");
  const [brokerAccountId, setBrokerAccountId] = useState<string>("ba_paper_primary");
  const [brokerProvider, setBrokerProvider] = useState<string>("paper_simulator");
  const [riskReserve, setRiskReserve] = useState<number>(0);

  // STEP 1: IDENTITY & CAPITAL
  const [name, setName] = useState<string>("Alpha Momentum Bot");
  const [description, setDescription] = useState<string>("Deterministic multi-indicator momentum bot with 20-stage risk gate.");
  const [groupName, setGroupName] = useState<string>("Crypto Scalping Bots");
  const [customGroup, setCustomGroup] = useState<string>("");
  const [isCreatingCustomGroup, setIsCreatingCustomGroup] = useState(false);
  const [environment, setEnvironment] = useState<BotExecutionMode>("PAPER");
  const [currency, setCurrency] = useState<"INR" | "USDT" | "USD">("USD");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [totalCapital, setTotalCapital] = useState<number>(50000);
  const [allocatedCapital, setAllocatedCapital] = useState<number>(10000);
  const [sizingMethod, setSizingMethod] = useState<"RISK_PER_TRADE" | "FIXED_QUANTITY" | "PERCENT_EQUITY">("RISK_PER_TRADE");
  const [lotSize, setLotSize] = useState<number>(1);
  const [lotsCount, setLotsCount] = useState<number>(1);

  // STEP 2: MARKET & INSTRUMENT
  const [assetClass, setAssetClass] = useState<WizardAssetClass>("CRYPTO");
  const [symbol, setSymbol] = useState<string>("BTC/USDT");
  const [tradeDirection, setTradeDirection] = useState<"BUY" | "SELL">("BUY");
  const [instrumentSearch, setInstrumentSearch] = useState("");
  const [exchange, setExchange] = useState<string>("ccxt_binance");

  // Options & Derivatives
  const [optionSide, setOptionSide] = useState<"CALL" | "PUT" | "BOTH">("BOTH");
  const [optionExpiry, setOptionExpiry] = useState("Nearest Weekly");
  const [strikeOffset, setStrikeOffset] = useState<number>(0);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  // STEP 3: STRATEGY ENGINE
  const [selectedQuickStrategy, setSelectedQuickStrategy] = useState<string>("MOMENTUM_CONFLUENCE");
  const [primaryTimeframe, setPrimaryTimeframe] = useState<string>("5m");
  const [additionalTimeframes, setAdditionalTimeframes] = useState<string[]>(["15m", "1h"]);
  const [executionTrigger, setExecutionTrigger] = useState<"CANDLE_CLOSE" | "INTRABAR">("CANDLE_CLOSE");
  const [warmUpBars, setWarmUpBars] = useState<number>(50);
  const [cooldownBars, setCooldownBars] = useState<number>(2);
  const [ruleConjunction, setRuleConjunction] = useState<"AND" | "OR">("AND");
  const [activeRuleTab, setActiveRuleTab] = useState<"LONG_ENTRY" | "LONG_EXIT" | "SHORT_ENTRY">("LONG_ENTRY");

  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfigItem[]>(
    QUICK_STRATEGIES[0].indicators
  );

  const [strategyRules, setStrategyRules] = useState<StrategyRuleItem[]>(
    QUICK_STRATEGIES[0].rules
  );

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

  // WebSocket Live Telemetry Feed
  const { getQuote, subscribe, unsubscribe, connectionStatus } = useMarketGatewayContext();

  // Subscribe to live market feed for current symbol
  useEffect(() => {
    if (!symbol) return;
    subscribe(symbol, "RUNNING_BOT");
    return () => {
      unsubscribe(symbol, "RUNNING_BOT");
    };
  }, [symbol, subscribe, unsubscribe]);

  const liveWsQuote = getQuote(symbol);

  // Load Intent from Store or Session on mount
  const hasIngestedIntent = useRef(false);
  useEffect(() => {
    if (hasIngestedIntent.current) return;

    let intent = activeIntentFromStore || loadStoredIntent();

    // Fallback: build from URL params if direct navigation
    if (!intent) {
      const urlSymbol = searchParams.get("symbol");
      const urlSide = searchParams.get("side") as "BUY" | "SELL" | null;
      const urlOrigin = searchParams.get("origin") as any;
      if (urlSymbol && urlSide) {
        intent = {
          symbol: urlSymbol,
          canonicalSymbol: urlSymbol,
          side: urlSide,
          assetClass: (searchParams.get("assetClass") as any) || "SPOT",
          broker: searchParams.get("broker") || undefined,
          origin: urlOrigin || "LIVE_FEED",
          timestamp: Date.now(),
        };
      }
    }

    if (intent) {
      hasIngestedIntent.current = true;
      setActiveIntent(intent);

      const sym = intent.symbol;
      setSymbol(sym);
      setTradeDirection(intent.side || "BUY");

      // Set Name
      const sideText = intent.side === "BUY" ? "Long" : "Short";
      setName(`${sym} ${sideText} Alpha Bot`);
      setDescription(`Deterministic 1-click ${sideText} bot originating from ${intent.origin || "Market Feed"}.`);

      // Determine Asset Class
      if (intent.assetClass === "OPTION" || intent.origin === "OPTIONS") {
        setAssetClass("OPTIONS");
        setGroupName("NSE Options Bots");
      } else if (intent.assetClass === "FUTURE" || intent.assetClass === "PERPETUAL" || intent.origin === "FUTURES") {
        setAssetClass("FUTURES");
        setGroupName("Futures Trend Bots");
      } else if (intent.assetClass === "CRYPTO_OPTIONS") {
        setAssetClass("CRYPTO_OPTIONS");
        setGroupName("Crypto Scalping Bots");
      } else if (intent.assetClass === "COMMODITY") {
        setAssetClass("COMMODITIES");
        setGroupName("Commodity Momentum Bots");
      } else if (sym.includes("NIFTY") || sym.includes("BANK") || ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"].some((s) => sym.includes(s))) {
        setAssetClass("INDEX");
        setGroupName("NSE Options Bots");
      } else if (sym.includes("BTC") || sym.includes("ETH") || sym.includes("SOL") || sym.includes("USDT")) {
        setAssetClass("CRYPTO");
        setGroupName("Crypto Scalping Bots");
      }

      // Currency & Capital
      const isIndian = sym.includes("INR") || sym.includes("NIFTY") || sym.includes("BANK") || intent.broker === "dhan" || intent.broker === "upstox";
      if (isIndian) {
        setCurrency("INR");
        setTimezone("Asia/Kolkata");
        setTotalCapital(100000);
        setAllocatedCapital(25000);
      } else {
        setCurrency("USD");
        setTimezone("UTC");
        setTotalCapital(50000);
        setAllocatedCapital(5000);
      }

      // Lot Size
      if (intent.lotSize && intent.lotSize > 0) {
        setLotSize(intent.lotSize);
      }

      // Options Specifics
      if (intent.optionType) {
        setOptionSide(intent.optionType === "PUT" ? "PUT" : "CALL");
      }
      if (intent.strike) {
        setStrikeOffset(intent.strike);
      }
      if (intent.expiry) {
        setOptionExpiry(intent.expiry);
      }

      // Leverage
      if (intent.maxLeverage && intent.maxLeverage > 1) {
        setLeverage(Math.min(intent.maxLeverage, 5));
      }

      // Broker Mapping
      if (intent.broker === "dhan" || intent.broker === "dhan_india") {
        setBrokerFolderId("bf_dhan");
        setBrokerAccountId("ba_dhan_primary");
        setBrokerProvider("dhan");
      } else if (intent.broker === "upstox") {
        setBrokerFolderId("bf_upstox");
        setBrokerAccountId("ba_upstox_primary");
        setBrokerProvider("upstox");
      } else if (intent.broker === "delta_india" || intent.broker === "delta_exchange") {
        setBrokerFolderId("bf_delta");
        setBrokerAccountId("ba_delta_primary");
        setBrokerProvider("delta_exchange");
      }

      // Safe default: strictly PAPER
      setEnvironment("PAPER");
      setBrokerId("paper_simulator");

      // Default to Quick Setup for high-speed streamlined review
      setWizardMode("QUICK");
    }
  }, [activeIntentFromStore, loadStoredIntent, searchParams]);

  // Derived Calculations
  const slug = useMemo(() => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bot", [name]);
  const remainingCapital = useMemo(() => calculateRemainingCapital(totalCapital, allocatedCapital), [totalCapital, allocatedCapital]);
  const allocationPct = useMemo(() => calculateAllocationPct(totalCapital, allocatedCapital), [totalCapital, allocatedCapital]);
  const maxRiskAmount = useMemo(() => calculateRiskAmount(allocatedCapital, riskPerTradePct), [allocatedCapital, riskPerTradePct]);
  const estimatedMaxLoss = useMemo(() => calculateRiskAmount(allocatedCapital, stopLossPct), [allocatedCapital, stopLossPct]);
  const riskRewardRatio = useMemo(() => calculateRiskRewardRatio(stopLossPct, takeProfitPct), [stopLossPct, takeProfitPct]);
  const estimatedNotional = useMemo(() => allocatedCapital * Math.max(1, leverage), [allocatedCapital, leverage]);
  const requiredMargin = useMemo(() => Math.round((estimatedNotional / Math.max(1, leverage)) * 100) / 100, [estimatedNotional, leverage]);

  // Effective Live Price Benchmark
  const effectivePrice = Number(
    liveWsQuote?.last_price ||
    activeIntent?.currentPrice ||
    activeIntent?.markPrice ||
    (currency === "INR" ? 24500.0 : 65000.0)
  );

  const isPositiveChange = (liveWsQuote?.change_pct ?? 0) >= 0;

  // Calculated Price Targets
  const stopLossPrice = useMemo(() => {
    if (!effectivePrice) return 0;
    if (tradeDirection === "BUY") {
      return effectivePrice * (1 - stopLossPct / 100);
    } else {
      return effectivePrice * (1 + stopLossPct / 100);
    }
  }, [effectivePrice, stopLossPct, tradeDirection]);

  const takeProfitPrice = useMemo(() => {
    if (!effectivePrice) return 0;
    if (tradeDirection === "BUY") {
      return effectivePrice * (1 + takeProfitPct / 100);
    } else {
      return effectivePrice * (1 - takeProfitPct / 100);
    }
  }, [effectivePrice, takeProfitPct, tradeDirection]);

  // Query Institutional Hierarchy Tree
  const { data: hierarchyData } = useQuery({
    queryKey: ["hierarchyTree"],
    queryFn: async () => {
      const res = await fetch("/api/hierarchy/tree");
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Query Authoritative Capital Summary
  const { data: capitalSummaryData } = useQuery({
    queryKey: ["capitalSummary", customerId, departmentId, brokerAccountId, environment],
    queryFn: async () => {
      const params = new URLSearchParams({
        customer_id: customerId,
        department_id: departmentId,
        broker_account_id: brokerAccountId,
        environment: environment,
      });
      const res = await fetch(`/api/capital/summary?${params.toString()}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

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
      primaryTimeframe,
      allocatedCapital,
      totalCapital,
      stopLossPct,
      takeProfitPct,
      leverage,
      brokerId,
      environment,
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
        customer_id: customerId,
        department_id: departmentId,
        broker_folder_id: brokerFolderId,
        broker_account_id: brokerAccountId,
        broker_provider: brokerProvider,
        currency,
        risk_reserve: riskReserve,
        capital_source: brokerAccountId,
        strategy_id: selectedQuickStrategy,
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
    enabled: activeStep === 6 || wizardMode === "QUICK",
    staleTime: 5000,
  });

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
      if (b.customer_id) setCustomerId(b.customer_id);
      if (b.department_id) setDepartmentId(b.department_id);
      if (b.broker_folder_id) setBrokerFolderId(b.broker_folder_id);
      if (b.broker_account_id) setBrokerAccountId(b.broker_account_id);
      if (b.broker_provider) setBrokerProvider(b.broker_provider);
      if (b.currency) setCurrency(b.currency as any);
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

  const handleQuickStrategySelect = (stratId: string) => {
    setSelectedQuickStrategy(stratId);
    const found = QUICK_STRATEGIES.find((s) => s.id === stratId);
    if (found) {
      setSelectedIndicators(found.indicators);
      setStrategyRules(found.rules);
    }
  };

  // Save Draft Mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        symbol,
        trade_direction: tradeDirection,
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
        customer_id: customerId,
        department_id: departmentId,
        broker_folder_id: brokerFolderId,
        broker_account_id: brokerAccountId,
        broker_provider: brokerProvider,
        currency,
        creation_intent_id: activeIntent?.creationIntentId,
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
    mutationFn: async (initialStatus: "STOPPED" | "RUNNING_PAPER" = "STOPPED") => {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        symbol: symbol.toUpperCase(),
        trade_direction: tradeDirection,
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
        customer_id: customerId,
        department_id: departmentId,
        broker_folder_id: brokerFolderId,
        broker_account_id: brokerAccountId,
        broker_provider: brokerProvider,
        capital_source: brokerAccountId,
        strategy_id: selectedQuickStrategy || "strat_momentum_alpha",
        risk_reserve: riskReserve,
        department_trading_budget: capitalSummaryData?.capital_breakdown?.department_budget || totalCapital,
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
          account_id: brokerAccountId || accountId,
          execution_mode: executionMode,
          order_type: orderType,
          max_slippage_pct: maxSlippagePct,
        },
        creation_intent_id: activeIntent?.creationIntentId,
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
      queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] });

      clearIntent();

      const createdBotId = data.bot?.id || data.bot_id || data.id || (data.data && data.data.id) || botId;
      setSuccessMessage(data.message || "Bot instance created safely in PAPER mode!");

      setTimeout(() => {
        if (createdBotId) {
          router.push(`/bots?selectedBotId=${encodeURIComponent(createdBotId)}`);
        } else {
          router.push("/bots");
        }
      }, 900);
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

  const originUrl = useMemo(() => {
    if (!activeIntent?.origin) return "/live";
    if (activeIntent.origin === "OPTIONS") return "/options";
    if (activeIntent.origin === "FUTURES") return "/futures";
    return "/live";
  }, [activeIntent]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 font-sans text-xs pb-12">
      
      {/* =========================================================================
          1. TOP LIVE MARKET & ORIGINATION TELEMETRY STRIP
          ========================================================================= */}
      <div className="bg-[#09110E] border border-[#1A2A3F] rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142233] pb-3">
          
          {/* Left: Origin & Symbol Badges */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(originUrl)}
              className="px-2.5 py-1.5 rounded-lg bg-[#07101A] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-white border border-[#1A2A3F] font-bold text-[11px] transition flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-cyan-400" />
              <span>Back to {activeIntent?.origin === "OPTIONS" ? "Option Chain" : activeIntent?.origin === "FUTURES" ? "Futures" : "Live Market"}</span>
            </button>

            <div className="h-4 w-[1px] bg-[#1A2A3F] hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${liveWsQuote?.is_stale ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
              <span className="font-mono font-black text-sm text-white">{symbol}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#142B21] text-cyan-300 border border-[#275841]">
                {assetClass}
              </span>
            </div>

            {/* BUY / SELL Badge Toggle */}
            <div className="flex items-center rounded-lg bg-[#07101A] p-0.5 border border-[#1A2A3F]">
              <button
                type="button"
                onClick={() => {
                  setTradeDirection("BUY");
                  setName(`${symbol} Long Alpha Bot`);
                }}
                className={`px-3 py-1 rounded-md font-black text-xs transition flex items-center gap-1 ${
                  tradeDirection === "BUY"
                    ? "bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400/60"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>BUY (LONG)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTradeDirection("SELL");
                  setName(`${symbol} Short Alpha Bot`);
                }}
                className={`px-3 py-1 rounded-md font-black text-xs transition flex items-center gap-1 ${
                  tradeDirection === "SELL"
                    ? "bg-rose-600 text-white shadow-md ring-1 ring-rose-400/60"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ArrowDownRight className="h-3.5 w-3.5" />
                <span>SELL (SHORT)</span>
              </button>
            </div>
          </div>

          {/* Right: Quick vs Advanced Switcher & Mode Badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-[#07101A] p-1 border border-[#1A2A3F]">
              <button
                type="button"
                onClick={() => setWizardMode("QUICK")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  wizardMode === "QUICK"
                    ? "bg-[rgba(37,99,235,0.22)] text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-[#7C8CA3] hover:text-white"
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                <span>Quick Setup</span>
              </button>
              <button
                type="button"
                onClick={() => setWizardMode("ADVANCED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  wizardMode === "ADVANCED"
                    ? "bg-[rgba(37,99,235,0.22)] text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-[#7C8CA3] hover:text-white"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                <span>Advanced Mode</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => saveDraftMutation.mutate()}
              disabled={saveDraftMutation.isPending}
              className="px-3 py-1.5 rounded-xl bg-[#0C1B15] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-white border border-[#1A2A3F] font-bold text-xs transition flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5 text-[#22D3EE]" />
              <span>{saveDraftMutation.isPending ? "Saving..." : "Save Draft"}</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px] font-mono">
          <div className="bg-[#07101A] border border-[#142233] p-2 rounded-xl">
            <span className="text-[#52627A] block text-[10px]">Live Benchmark (LTP)</span>
            <span className="text-white font-black text-sm">
              {currency === "INR" ? "₹" : "$"}{formatNumber(effectivePrice, 2)}
            </span>
          </div>

          <div className="bg-[#07101A] border border-[#142233] p-2 rounded-xl">
            <span className="text-[#52627A] block text-[10px]">Bid / Ask Spread</span>
            <span className="text-cyan-300 font-bold truncate block">
              {liveWsQuote?.bid !== undefined && liveWsQuote?.bid !== null ? `${liveWsQuote.bid} / ${liveWsQuote.ask}` : (activeIntent?.bid ? `${activeIntent.bid} / ${activeIntent.ask}` : "Tight Spread")}
            </span>
          </div>

          <div className="bg-[#07101A] border border-[#142233] p-2 rounded-xl">
            <span className="text-[#52627A] block text-[10px]">Data Source</span>
            <span className="text-emerald-400 font-bold truncate block">
              {activeIntent?.broker ? activeIntent.broker.toUpperCase() : "LIVE GATEWAY"}
            </span>
          </div>

          <div className="bg-[#07101A] border border-[#142233] p-2 rounded-xl">
            <span className="text-[#52627A] block text-[10px]">Feed Latency</span>
            <div className="flex items-center gap-1 text-slate-200 font-bold">
              <Radio className="h-3 w-3 text-cyan-400 animate-pulse" />
              <span>{liveWsQuote ? Math.round(liveWsQuote.feed_latency_ms || 18) : 22}ms</span>
            </div>
          </div>

          <div className="bg-[#07101A] border border-[#142233] p-2 rounded-xl">
            <span className="text-[#52627A] block text-[10px]">Execution Target</span>
            <span className={`font-bold ${environment === "LIVE" ? "text-red-400" : "text-cyan-400"}`}>
              {environment === "LIVE" ? "LIVE BROKER" : "PAPER SIMULATOR"}
            </span>
          </div>

          <div className="bg-[#07101A] border border-[#142233] p-2 rounded-xl">
            <span className="text-[#52627A] block text-[10px]">Stop Loss Level</span>
            <span className="text-rose-400 font-bold">
              {currency === "INR" ? "₹" : "$"}{formatNumber(stopLossPrice, 2)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. QUICK SETUP MODE (STREAMLINED 1-CLICK MARKET FLOW)
          ========================================================================= */}
      {wizardMode === "QUICK" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fadeIn">
          
          {/* Main Quick Configuration Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* 1. Bot Strategy & Direction Preset */}
            <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#142233] pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    1. Strategy Engine Preset
                  </h2>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">NON-AI DETERMINISTIC</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_STRATEGIES.map((strat) => {
                  const isSelected = selectedQuickStrategy === strat.id;
                  return (
                    <button
                      key={strat.id}
                      type="button"
                      onClick={() => handleQuickStrategySelect(strat.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-[rgba(37,99,235,0.18)] border-cyan-400/80 text-white shadow-md ring-1 ring-cyan-400/40"
                          : "bg-[#07101A] border-[#1A2A3F] text-slate-300 hover:border-[#274435]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white">{strat.name}</span>
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#7C8CA3] line-clamp-2 leading-relaxed">{strat.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Capital, Timeframe & Sizing */}
            <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-[#142233] pb-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  2. Capital Allocation & Sizing
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Allocated Capital ({currency})</label>
                  <input
                    type="number"
                    value={allocatedCapital}
                    onChange={(e) => setAllocatedCapital(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-[#52627A]">Available: {currency} {formatNumber(totalCapital)}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Lot Size / Multiplier</label>
                  <input
                    type="number"
                    value={lotSize}
                    onChange={(e) => setLotSize(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[10px] text-[#52627A]">1 Lot = {lotSize} units</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Execution Timeframe</label>
                  <select
                    value={primaryTimeframe}
                    onChange={(e) => setPrimaryTimeframe(e.target.value)}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  >
                    {ALL_TIMEFRAMES.map((tf) => (
                      <option key={tf.id} value={tf.id}>
                        {tf.label} — {tf.desc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Risk Protection & Exit Rules */}
            <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-[#142233] pb-2">
                <Shield className="h-4 w-4 text-rose-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  3. Risk Management & Exits
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold flex justify-between">
                    <span>Stop Loss %</span>
                    <span className="text-rose-400 font-mono font-bold">
                      {currency === "INR" ? "₹" : "$"}{stopLossPrice.toFixed(1)}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold flex justify-between">
                    <span>Take Profit Target %</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {currency === "INR" ? "₹" : "$"}{takeProfitPrice.toFixed(1)}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Trailing Stop Lock</label>
                  <button
                    type="button"
                    onClick={() => setTrailingStopEnabled(!trailingStopEnabled)}
                    className={`w-full py-2 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-between ${
                      trailingStopEnabled
                        ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/40"
                        : "bg-[#07101A] text-slate-400 border-[#1A2A3F]"
                    }`}
                  >
                    <span>{trailingStopEnabled ? "Enabled (0.5% Trail)" : "Disabled"}</span>
                    {trailingStopEnabled ? <CheckCircle2 className="h-4 w-4 text-cyan-400" /> : <Lock className="h-3.5 w-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Execution Mode & Broker */}
            <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#142233] pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    4. Execution Mode & Broker Routing
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#142B21] text-emerald-400 border border-[#275841]">
                  DEFAULT: PAPER SAFE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Environment</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEnvironment("PAPER")}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        environment === "PAPER"
                          ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/60 shadow-md"
                          : "bg-[#07101A] text-slate-400 border-[#1A2A3F]"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>PAPER MODE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvironment("LIVE")}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        environment === "LIVE"
                          ? "bg-rose-600/20 text-rose-300 border border-rose-500/60 shadow-md"
                          : "bg-[#07101A] text-slate-400 border-[#1A2A3F]"
                      }`}
                    >
                      <Zap className="h-4 w-4 text-rose-400" />
                      <span>LIVE BROKER</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Execution Broker</label>
                  <select
                    value={brokerId}
                    onChange={(e) => setBrokerId(e.target.value)}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="paper_simulator">Paper Trading Simulator (Instant Zero-Risk)</option>
                    <option value="dhan_india">Dhan HQ Direct (NSE/BSE)</option>
                    <option value="upstox">Upstox Pro Gateway (NSE)</option>
                    <option value="delta_exchange">Delta Exchange India (Derivatives)</option>
                    <option value="binance">Binance CCXT Gateway (Crypto)</option>
                  </select>
                </div>
              </div>

              {environment === "LIVE" && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>Live Order Placement Safety Confirmation</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={liveSafetyConfirmed}
                      onChange={(e) => setLiveSafetyConfirmed(e.target.checked)}
                      className="rounded text-rose-500 focus:ring-0 bg-[#07101A] border-rose-700"
                    />
                    <span>I confirm this bot will place real monetary orders via the selected broker.</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pre-Flight Review & Launch Card */}
          <div className="space-y-5">
            <div className="bg-[#09110E] border border-cyan-800/40 rounded-2xl p-5 shadow-2xl space-y-4 sticky top-4">
              <div className="flex items-center gap-2 border-b border-[#142233] pb-3">
                <Eye className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Bot Order Review Card
                </h3>
              </div>

              {/* Bot Identity Summary */}
              <div className="space-y-2.5 font-mono text-[11px]">
                <div className="flex justify-between border-b border-[#142233] pb-1.5">
                  <span className="text-[#7C8CA3]">Bot Name:</span>
                  <span className="text-white font-bold truncate max-w-[170px]">{name}</span>
                </div>

                <div className="flex justify-between border-b border-[#142233] pb-1.5">
                  <span className="text-[#7C8CA3]">Instrument:</span>
                  <span className="text-white font-bold">{symbol}</span>
                </div>

                <div className="flex justify-between border-b border-[#142233] pb-1.5">
                  <span className="text-[#7C8CA3]">Direction:</span>
                  <span className={`font-bold ${tradeDirection === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                    {tradeDirection} ({tradeDirection === "BUY" ? "LONG" : "SHORT"})
                  </span>
                </div>

                <div className="flex justify-between border-b border-[#142233] pb-1.5">
                  <span className="text-[#7C8CA3]">Benchmark Price:</span>
                  <span className="text-cyan-300 font-bold">
                    {currency === "INR" ? "₹" : "$"}{formatNumber(effectivePrice, 2)}
                  </span>
                </div>

                <div className="flex justify-between border-b border-[#142233] pb-1.5">
                  <span className="text-[#7C8CA3]">Allocated Capital:</span>
                  <span className="text-emerald-400 font-bold">{currency} {formatNumber(allocatedCapital)}</span>
                </div>

                <div className="flex justify-between border-b border-[#142233] pb-1.5">
                  <span className="text-[#7C8CA3]">Max Trade Risk:</span>
                  <span className="text-rose-400 font-bold">
                    {currency} {formatNumber(maxRiskAmount)} ({riskPerTradePct}%)
                  </span>
                </div>

                <div className="flex justify-between border-b border-[#142233] pb-1.5">
                  <span className="text-[#7C8CA3]">Target R:R Ratio:</span>
                  <span className="text-cyan-300 font-bold">1 : {riskRewardRatio}</span>
                </div>

                <div className="flex justify-between border-b border-[#142233] pb-1.5">
                  <span className="text-[#7C8CA3]">Environment:</span>
                  <span className={`font-bold ${environment === "LIVE" ? "text-red-400" : "text-emerald-400"}`}>
                    {environment} SANDBOX
                  </span>
                </div>
              </div>

              {/* Feedback Messages */}
              {errorMessage && (
                <div className="p-2.5 bg-red-950/80 text-red-300 border border-red-800 rounded-xl text-[11px] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-2.5 bg-[rgba(37,99,235,0.18)] text-cyan-300 border border-cyan-500 rounded-xl text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => saveMutation.mutate("RUNNING_PAPER")}
                  disabled={saveMutation.isPending || (environment === "LIVE" && !liveSafetyConfirmed)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saveMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span>{saveMutation.isPending ? "Creating Bot..." : "Activate Paper Bot (Instant Run)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => saveMutation.mutate("STOPPED")}
                  disabled={saveMutation.isPending || (environment === "LIVE" && !liveSafetyConfirmed)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#101B2D] hover:bg-[#1A2A3F] text-cyan-300 font-bold text-xs transition border border-cyan-800/40 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Bot className="h-4 w-4" />
                  <span>Create Bot Instance (Stopped)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWizardMode("ADVANCED")}
                  className="w-full py-2 text-[11px] text-slate-400 hover:text-white flex items-center justify-center gap-1 transition"
                >
                  <span>Need granular rules? Switch to Advanced 12-Section Config</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. ADVANCED SETTINGS MODE (FULL 6-STEP MODULAR FACTORY)
          ========================================================================= */}
      {wizardMode === "ADVANCED" && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Stepper Breadcrumb Buttons */}
          <div className="bg-[#09110E] border border-[#1F392D] rounded-2xl p-3 shadow-xl">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
                        ? "bg-[rgba(37,99,235,0.18)] text-[#22D3EE] border border-[#00E890]/60 shadow-md ring-1 ring-[#22D3EE]/30"
                        : isCompleted
                        ? "bg-[#0C1B15] text-[#7C8CA3] hover:text-white border border-[#183126]"
                        : "bg-[#07101A] text-[#42584C] border border-[#101B2D] opacity-60"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                        isCompleted ? "bg-[#22D3EE] text-black" : isCurrent ? "bg-[#256B4A] text-white" : "bg-[#101B2D] text-[#52627A]"
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
            
            {/* STEP 1: IDENTITY, INSTITUTIONAL HIERARCHY & CAPITAL */}
            {activeStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A2A3F] pb-2">
                    <Bot className="h-4 w-4 text-[#22D3EE]" />
                    <span>Institutional Hierarchy & Identity</span>
                  </h3>

                  {/* Tier 1 & 2: Customer & Department */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[#7C8CA3] font-semibold">Customer Account</label>
                      <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
                      >
                        <option value="cust_default">Customer Default (Institutional)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[#7C8CA3] font-semibold">Department Division</label>
                      <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
                      >
                        <option value="dept_algo_trading">Algorithmic Trading (₹1,000,000)</option>
                        <option value="dept_derivatives">Derivatives & Options (₹500,000)</option>
                      </select>
                    </div>
                  </div>

                  {/* Tier 3 & 4: Broker Folder & Broker Account */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[#7C8CA3] font-semibold">Broker Folder</label>
                      <select
                        value={brokerFolderId}
                        onChange={(e) => {
                          const fId = e.target.value;
                          setBrokerFolderId(fId);
                          if (fId === "bf_dhan") {
                            setBrokerAccountId("ba_dhan_primary");
                            setBrokerProvider("dhan");
                            setCurrency("INR");
                            setBrokerId("dhan_india");
                          } else if (fId === "bf_upstox") {
                            setBrokerAccountId("ba_upstox_primary");
                            setBrokerProvider("upstox");
                            setCurrency("INR");
                            setBrokerId("upstox");
                          } else if (fId === "bf_delta") {
                            setBrokerAccountId("ba_delta_primary");
                            setBrokerProvider("delta_exchange");
                            setCurrency("USD");
                            setBrokerId("delta_exchange");
                          } else {
                            setBrokerAccountId("ba_paper_primary");
                            setBrokerProvider("paper_simulator");
                            setCurrency("USD");
                            setBrokerId("paper_simulator");
                          }
                        }}
                        className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
                      >
                        <option value="bf_paper">Paper Trading Sandbox</option>
                        <option value="bf_dhan">Dhan HQ Folder (NSE/BSE)</option>
                        <option value="bf_upstox">Upstox Pro Folder (NSE/BSE)</option>
                        <option value="bf_delta">Delta Exchange Folder (Derivatives)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[#7C8CA3] font-semibold">Broker Funding Account</label>
                      <select
                        value={brokerAccountId}
                        onChange={(e) => setBrokerAccountId(e.target.value)}
                        className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-cyan-400 font-mono font-bold focus:outline-none"
                      >
                        <option value="ba_paper_primary">ba_paper_primary (Paper Sandbox)</option>
                        <option value="ba_dhan_primary">ba_dhan_primary (Dhan HQ Primary)</option>
                        <option value="ba_upstox_primary">ba_upstox_primary (Upstox Pro Primary)</option>
                        <option value="ba_delta_primary">ba_delta_primary (Delta Primary USD)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[#7C8CA3] font-semibold flex justify-between">
                      <span>Bot Instance Name *</span>
                      <span className="text-cyan-400 font-mono text-[10px]">Slug: {slug}</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[#7C8CA3] font-semibold">Base Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as any)}
                        className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="USDT">USDT</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[#7C8CA3] font-semibold">Trading Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      >
                        <option value="UTC">UTC (Global Crypto)</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Column: Capital Allocation */}
                <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#1A2A3F] pb-2">
                    <DollarSign className="h-4 w-4 text-[#22D3EE]" />
                    <span>Authoritative Capital & Allocation</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[#7C8CA3] font-semibold">Total Capital ({currency})</label>
                      <input
                        type="number"
                        value={totalCapital}
                        onChange={(e) => setTotalCapital(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[#7C8CA3] font-semibold">Allocated Capital ({currency})</label>
                      <input
                        type="number"
                        value={allocatedCapital}
                        onChange={(e) => setAllocatedCapital(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-[#07101A] rounded-xl border border-[#1A2A3F] space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#7C8CA3]">Allocation Share:</span>
                      <span className="text-white font-bold">{allocationPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7C8CA3]">Remaining Unallocated:</span>
                      <span className="text-emerald-400 font-bold">{currency} {formatNumber(remainingCapital)}</span>
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
                    const Icon = ac.icon;
                    return (
                      <button
                        key={ac.id}
                        type="button"
                        onClick={() => {
                          setAssetClass(ac.id);
                          const pops = POPULAR_INSTRUMENTS[ac.id];
                          if (pops && pops.length > 0) {
                            setSymbol(pops[0].symbol);
                          }
                        }}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? "bg-[rgba(37,99,235,0.2)] border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/40"
                            : "bg-[#07101A] border-[#1A2A3F] text-slate-400 hover:text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5 text-cyan-400" />
                        <span className="font-bold text-[11px] truncate">{ac.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3">
                    <label className="text-xs font-bold text-white uppercase tracking-wider block">
                      Active Instrument Symbol
                    </label>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />

                    {assetClass === "OPTIONS" && (
                      <button
                        type="button"
                        onClick={() => setIsOptionsModalOpen(true)}
                        className="w-full py-2 px-3 rounded-xl bg-[#101B2D] hover:bg-[#1A2A3F] text-cyan-300 border border-cyan-800/40 font-bold text-xs transition flex items-center justify-center gap-2"
                      >
                        <Layers className="h-4 w-4" />
                        <span>Open Options Strike Chain Picker</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Popular Shortcuts</span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_INSTRUMENTS[assetClass]?.map((pop) => (
                        <button
                          key={pop.symbol}
                          type="button"
                          onClick={() => setSymbol(pop.symbol)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition ${
                            symbol === pop.symbol
                              ? "bg-cyan-950/60 border-cyan-500 text-cyan-300"
                              : "bg-[#07101A] border-[#1A2A3F] text-slate-300 hover:text-white"
                          }`}
                        >
                          {pop.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: STRATEGY ENGINE */}
            {activeStep === 3 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-cyan-400" />
                      <span>Configured Indicator Rules</span>
                    </h3>
                    <div className="space-y-2">
                      {strategyRules.map((rule, idx) => (
                        <div key={rule.id} className="p-2.5 bg-[#07101A] rounded-xl border border-[#1A2A3F] flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-white">
                            {rule.leftIndicatorId} {rule.operator} {rule.rightType === "INDICATOR" ? rule.rightIndicatorId : rule.rightValue}
                          </span>
                          <button
                            type="button"
                            onClick={() => setStrategyRules(strategyRules.filter((r) => r.id !== rule.id))}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Rule Operator</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStrategyRules([
                            ...strategyRules,
                            {
                              id: `rule-${Date.now()}`,
                              leftIndicatorId: "rsi_14",
                              operator: ">",
                              rightType: "THRESHOLD",
                              rightValue: 50,
                              isMandatory: true,
                            },
                          ]);
                        }}
                        className="px-3 py-2 rounded-xl bg-[#101B2D] text-cyan-300 border border-cyan-800/40 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Indicator Threshold Rule</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: RISK & EXITS */}
            {activeStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn">
                <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-2">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Stop Loss %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-2">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Take Profit Target %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Math.max(0.1, Number(e.target.value)))}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-2">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Max Daily Drawdown %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={maxDailyDrawdownPct}
                    onChange={(e) => setMaxDailyDrawdownPct(Math.max(0.5, Number(e.target.value)))}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 5: BROKER & EXECUTION */}
            {activeStep === 5 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
                <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Execution Broker</label>
                  <select
                    value={brokerId}
                    onChange={(e) => setBrokerId(e.target.value)}
                    className="w-full bg-[#07101A] border border-[#1A2A3F] rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none"
                  >
                    <option value="paper_simulator">Paper Trading Simulator (Instant Zero-Risk)</option>
                    <option value="dhan_india">Dhan HQ Direct (NSE/BSE)</option>
                    <option value="upstox">Upstox Pro Gateway (NSE)</option>
                    <option value="delta_exchange">Delta Exchange India (Derivatives)</option>
                    <option value="binance">Binance CCXT Gateway (Crypto)</option>
                  </select>
                </div>
                <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3">
                  <label className="text-[11px] text-[#7C8CA3] font-semibold">Environment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEnvironment("PAPER")}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        environment === "PAPER"
                          ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/60 shadow-md"
                          : "bg-[#07101A] text-slate-400 border-[#1A2A3F]"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>PAPER MODE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEnvironment("LIVE")}
                      className={`p-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        environment === "LIVE"
                          ? "bg-rose-600/20 text-rose-300 border border-rose-500/60 shadow-md"
                          : "bg-[#07101A] text-slate-400 border-[#1A2A3F]"
                      }`}
                    >
                      <Zap className="h-4 w-4 text-rose-400" />
                      <span>LIVE BROKER</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW & ACTIVATE */}
            {activeStep === 6 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-2.5 font-mono text-[11px]">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[#1A2A3F] pb-2 font-sans">
                      Complete Specification Review
                    </h3>
                    <div className="flex justify-between"><span className="text-[#7C8CA3]">Name:</span><span className="text-white font-bold">{name}</span></div>
                    <div className="flex justify-between"><span className="text-[#7C8CA3]">Symbol:</span><span className="text-white font-bold">{symbol}</span></div>
                    <div className="flex justify-between"><span className="text-[#7C8CA3]">Allocated:</span><span className="text-emerald-400 font-bold">{currency} {formatNumber(allocatedCapital)}</span></div>
                    <div className="flex justify-between"><span className="text-[#7C8CA3]">Stop Loss:</span><span className="text-rose-400 font-bold">{stopLossPct}%</span></div>
                    <div className="flex justify-between"><span className="text-[#7C8CA3]">Take Profit:</span><span className="text-emerald-400 font-bold">{takeProfitPct}%</span></div>
                  </div>

                  <div className="bg-[#0A1422] border border-[#1A2A3F] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1A2A3F] pb-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-cyan-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Authoritative Pre-Flight Gates
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => revalidateConfig()}
                        className="text-cyan-400 hover:text-white flex items-center gap-1 text-[10px]"
                      >
                        <RefreshCw className={`h-3 w-3 ${isValidating ? "animate-spin" : ""}`} />
                        <span>Re-Validate</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      {validationData?.evidence && validationData.evidence.length > 0 ? (
                        validationData.evidence.map((item) => (
                          <div key={item.id} className="p-2 rounded-lg bg-[#07101A] border border-[#1A2A3F] space-y-0.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                <span className="font-bold text-white text-[11px]">{item.label}</span>
                              </div>
                              <span className="text-[9px] px-1 rounded font-mono font-bold bg-cyan-950/60 text-cyan-300">
                                {item.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#7C8CA3] pl-5">{item.evidence_text}</p>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-[#7C8CA3]">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-cyan-400" />
                          <span>Validating 20-stage safety precheck gates...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step Navigation Controls */}
            <div className="border-t border-[#182C23] pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                disabled={activeStep === 1 || saveMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-[#0A1422] hover:bg-[#101B2D] text-[#7C8CA3] hover:text-white font-bold transition-colors disabled:opacity-30 flex items-center gap-2"
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveMutation.mutate("STOPPED")}
                      disabled={saveMutation.isPending}
                      className="px-5 py-2.5 rounded-xl bg-[#101B2D] hover:bg-[#1A2A3F] text-cyan-400 font-bold transition-all border border-cyan-800/40 text-xs flex items-center gap-2"
                    >
                      {saveMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      <span>{saveMutation.isPending ? "Creating..." : "Create Bot Instance"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => saveMutation.mutate("RUNNING_PAPER")}
                      disabled={saveMutation.isPending}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md text-xs flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>Activate Paper Bot</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

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
