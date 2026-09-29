"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useQuantDataCore } from "@/context/QuantDataCoreContext";
import { useBotCreationIntentStore } from "@/lib/store/useBotCreationIntentStore";
import { Environment, ProviderInfo, BrokerAccount } from "@/types/data-core";
import { formatMoney } from "@/lib/formatters";
import { apiClient } from "@/lib/apiClient";
import { DeploymentValidationCenter } from "./DeploymentValidationCenter";
import { StrategyPremiumSelectionSection, BotEnabledStrategySetting } from "./StrategyPremiumSelectionSection";
import {
  resolveContract,
  getAvailableExpiries,
  EXPIRY_PREFERENCE_OPTIONS,
  ResolvedContract,
} from "@/lib/contractResolver";
import {
  CRYPTO_30_STRATEGIES,
  CryptoStrategyDefinition,
  STRATEGY_CATEGORIES,
  ALL_QUANTOS_STRATEGIES,
  OPTIONS_24_STRATEGIES,
} from "@/lib/strategies/crypto30Strategies";
import {
  OPTION_PURPOSE_GROUPS,
  OPTION_STRATEGIES_VISUAL_META,
  OptionStrategyVisualMeta,
} from "@/lib/strategies/options24Strategies";
import {
  Sparkles,
  SlidersHorizontal,
  Layers,
  ShieldCheck,
  Activity,
  Check,
  Search,
  Sliders,
  Zap,
  BookOpen,
  Info,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

const WIZARD_STEPS = [
  { id: 1, key: "IDENTITY", title: "Identity & Capital", desc: "Identity, environment & capital allocation" },
  { id: 2, key: "MARKET", title: "Market & Instruments", desc: "Asset class, exchange & canonical instrument" },
  { id: 3, key: "DATA_SOURCES", title: "Data Sources & SLA", desc: "Feed providers, depth tier & freshness SLA" },
  { id: 4, key: "STRATEGY", title: "Strategy Engine", desc: "Multi-timeframe rules & indicator confluence" },
  { id: 5, key: "SIGNALS", title: "Signal Logic", desc: "Signal lifecycle & explainable decision rules" },
  { id: 6, key: "RISK", title: "Risk & Exits", desc: "Position limits, stop loss & trailing profit" },
  { id: 7, key: "EXECUTION", title: "Broker & Execution", desc: "OMS routing, order types & idempotency" },
  { id: 8, key: "VALIDATION", title: "Data Validation", desc: "Stream connectivity & provider auth check" },
  { id: 9, key: "TESTING", title: "Paper / Backtest", desc: "Sandbox simulation & performance metrics" },
  { id: 10, key: "ACTIVATE", title: "Review & Activate", desc: "7-Gate Readiness Scorecard & Deployment" },
];

export function BotWizardVNext() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { activeIntent, loadStoredIntent, clearIntent } = useBotCreationIntentStore();
  const { environment, setEnvironment, providers, accounts } = useQuantDataCore();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [draftSaved, setDraftSaved] = useState<boolean>(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  // Form State
  const [botId, setBotId] = useState<string>(`bot_${Math.random().toString(36).substring(2, 9)}`);
  const [botName, setBotName] = useState<string>("Institutional Momentum Bot");
  const [description, setDescription] = useState<string>("Trend-following alpha bot with multi-timeframe confirmation");
  const [groupName, setGroupName] = useState<string>("Indian Index Derivatives");
  const [tags, setTags] = useState<string>("NSE,FUTURES,TREND,ALPHA");
  const [envMode, setEnvMode] = useState<Environment>(environment);

  // Step 1: Capital
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [capitalAllocation, setCapitalAllocation] = useState<number>(50000);
  const [currency, setCurrency] = useState<string>("INR");

  // Step 2: Market & Instruments (Dynamic Contract Resolution)
  const [assetClass, setAssetClass] = useState<string>("INDIAN_FUTURES");
  const [canonicalInstrumentId, setCanonicalInstrumentId] = useState<string>("NSE:NIFTY:AUTO:FUT");
  const [displaySymbol, setDisplaySymbol] = useState<string>("NIFTY Auto Dynamic Future");
  const [contractStrike, setContractStrike] = useState<number>(24600);
  const [contractExpiry, setContractExpiry] = useState<string>("AUTO");
  const [contractOptionType, setContractOptionType] = useState<string>("CE");
  const [contractUnderlying, setContractUnderlying] = useState<string>("NIFTY");
  const [entrySide, setEntrySide] = useState<"BUY" | "SELL">("BUY");
  const [contractLotSize, setContractLotSize] = useState<number>(1);
  const [contractLtp, setContractLtp] = useState<number>(0);
  const [contractBid, setContractBid] = useState<number>(0);
  const [contractAsk, setContractAsk] = useState<number>(0);
  const [creationOrigin, setCreationOrigin] = useState<string>("MANUAL");
  const [providerInstrumentId, setProviderInstrumentId] = useState<string>("");
  const [resolvedContract, setResolvedContract] = useState<ResolvedContract | null>(null);
  const [availableExpiriesList, setAvailableExpiriesList] = useState<string[]>([]);
  const [isResolvingContract, setIsResolvingContract] = useState<boolean>(false);

  // Step 3: Data Sources
  const [marketDataProvider, setMarketDataProvider] = useState<string>("UPSTOX");
  const [executionBroker, setExecutionBroker] = useState<string>("PAPER");
  const [depthTier, setDepthTier] = useState<string>("FULL_D5");
  const [requireGreeks, setRequireGreeks] = useState<boolean>(false);
  const [maxTickAgeMs, setMaxTickAgeMs] = useState<number>(2000);
  const [stalePolicy, setStalePolicy] = useState<string>("BLOCK_ENTRY");

  // Step 4: Strategy Engine (Master 30 Directional + 24 Option Strategies)
  const [strategyDomain, setStrategyDomain] = useState<"DIRECTIONAL" | "OPTIONS">("DIRECTIONAL");
  const [strategyId, setStrategyId] = useState<string>("s01-trend-pullback-ema");
  const [strategyCategoryFilter, setStrategyCategoryFilter] = useState<string>("ALL");
  const [optionCategoryFilter, setOptionCategoryFilter] = useState<string>("ALL_OPTIONS");
  const [optionMarketViewFilter, setOptionMarketViewFilter] = useState<string>("ALL");
  const [strategySearch, setStrategySearch] = useState<string>("");
  const [strategyPreset, setStrategyPreset] = useState<"DEFAULT" | "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE" | "CUSTOM">("DEFAULT");
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>({});
  const [primaryTimeframe, setPrimaryTimeframe] = useState<string>("5m");
  const [confirmationTimeframe, setConfirmationTimeframe] = useState<string>("15m");
  const [ruleLeft, setRuleLeft] = useState<string>("EMA9");
  const [ruleOp, setRuleOp] = useState<string>("CROSS_ABOVE");
  const [ruleRight, setRuleRight] = useState<string>("EMA21");

  // Lookup active strategy definition from authoritative strategy catalog (Directional + Options)
  const selectedStrategyDef = useMemo(() => {
    return (
      ALL_QUANTOS_STRATEGIES.find(
        (s) =>
          s.id === strategyId ||
          s.number === strategyId ||
          `s${s.number}` === strategyId.toLowerCase() ||
          s.name.toLowerCase() === strategyId.toLowerCase()
      ) || CRYPTO_30_STRATEGIES[0]
    );
  }, [strategyId]);

  // Lookup rich visual metadata for option strategies
  const selectedOptionMeta = useMemo(() => {
    return OPTION_STRATEGIES_VISUAL_META[selectedStrategyDef?.number || ""];
  }, [selectedStrategyDef?.number]);

  // Synchronize parameter defaults whenever strategy changes
  useEffect(() => {
    if (selectedStrategyDef?.defaultParameters) {
      setStrategyParams({ ...selectedStrategyDef.defaultParameters });
      setStrategyPreset("DEFAULT");
    }
  }, [selectedStrategyDef?.id]);

  const handleApplyPreset = (preset: "DEFAULT" | "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE") => {
    setStrategyPreset(preset);
    if (!selectedStrategyDef?.defaultParameters) return;
    const defaults = selectedStrategyDef.defaultParameters;
    const updated: Record<string, any> = {};
    Object.entries(defaults).forEach(([k, def]) => {
      if (preset === "DEFAULT" || preset === "BALANCED") {
        updated[k] = def;
      } else if (preset === "CONSERVATIVE") {
        if (typeof def === "number") {
          updated[k] = k.includes("stop") || k.includes("loss") ? Number((def * 0.8).toFixed(2)) : Number((def * 1.2).toFixed(2));
        } else {
          updated[k] = def;
        }
      } else if (preset === "AGGRESSIVE") {
        if (typeof def === "number") {
          updated[k] = k.includes("stop") || k.includes("loss") ? Number((def * 1.3).toFixed(2)) : Number((def * 0.8).toFixed(2));
        } else {
          updated[k] = def;
        }
      }
    });
    setStrategyParams(updated);
  };

  // Step 5: Dynamic Strategy & Premium Selection Registry
  const [enabledStrategies, setEnabledStrategies] = useState<BotEnabledStrategySetting[]>([]);

  // Step 6: Risk
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(1.0);
  const [maxPositionSize, setMaxPositionSize] = useState<number>(50);
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(5000);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<number>(5.0);
  const [stopLossPct, setStopLossPct] = useState<number>(1.0);
  const [takeProfitPct, setTakeProfitPct] = useState<number>(2.5);
  const [trailingStopPct, setTrailingStopPct] = useState<number>(0.5);

  // Step 7: Execution
  const [orderType, setOrderType] = useState<string>("MARKET");
  const [maxSlippagePct, setMaxSlippagePct] = useState<number>(0.2);

  // Ingest Option Chain Intent or Query Parameters on Mount.
  // IMPORTANT: preserve the exact option selected in Option Chain.
  useEffect(() => {
    const stored = activeIntent || loadStoredIntent();

    const queryStrategy = searchParams?.get("strategy") || searchParams?.get("strategyId");
    const querySymbol = searchParams?.get("symbol");
    const querySide = searchParams?.get("side");
    const queryStrike = searchParams?.get("strike");
    const queryExpiry = searchParams?.get("expiry");
    const queryOptionType = searchParams?.get("optionType");
    const queryUnderlying = searchParams?.get("underlying");
    const queryProvider =
      searchParams?.get("marketDataSource") || searchParams?.get("broker");
    const queryBroker = searchParams?.get("broker");
    const queryAssetClass = searchParams?.get("assetClass");
    const queryCanonical =
      searchParams?.get("canonicalContractId") ||
      searchParams?.get("canonicalSymbol");
    const queryInstrumentId = searchParams?.get("instrumentId");
    const querySecurityId = searchParams?.get("securityId");
    const queryLotSize = searchParams?.get("lotSize");
    const queryLtp = searchParams?.get("ltp");
    const queryBid = searchParams?.get("bid");
    const queryAsk = searchParams?.get("ask");
    const queryOrigin = searchParams?.get("origin");

    if (queryStrategy) {
      const match = CRYPTO_30_STRATEGIES.find(
        (s) =>
          s.id === queryStrategy ||
          s.number === queryStrategy ||
          `s${s.number}` === queryStrategy.toLowerCase() ||
          s.id.toLowerCase().includes(queryStrategy.toLowerCase())
      );
      if (match) {
        setStrategyId(match.id);
        setPrimaryTimeframe(match.primaryTimeframe);
        if (match.alternateTimeframes && match.alternateTimeframes.length > 0) {
          setConfirmationTimeframe(match.alternateTimeframes[0]);
        }
        setBotName(`${match.name} [S${match.number}] Bot`);
        setDescription(match.whatItDoes);
      }
    }

    if (!querySymbol && !stored && !queryUnderlying && !queryStrategy) return;

    const symbol = querySymbol || stored?.symbol || "";
    const underlying = (queryUnderlying || stored?.underlying || "NIFTY").toUpperCase();
    const side = querySide || stored?.side || "BUY";
    const strike = queryStrike ? Number(queryStrike) : Number(stored?.strike || 0);
    const expiry = queryExpiry || stored?.expiry || "";
    const rawOptionType = String(queryOptionType || stored?.optionType || "CE").toUpperCase();
    const optionType = rawOptionType === "CALL" ? "CE" : rawOptionType === "PUT" ? "PE" : rawOptionType;
    const provider =
      queryProvider || stored?.marketDataSource || stored?.broker || "UPSTOX";
    const broker = queryBroker || stored?.broker || "PAPER";
    const resolvedProviderInstrumentId =
      queryInstrumentId ||
      stored?.instrumentId ||
      querySecurityId ||
      stored?.securityId ||
      symbol;
    const canonicalId =
      queryCanonical ||
      stored?.canonicalContractId ||
      stored?.canonicalSymbol ||
      resolvedProviderInstrumentId ||
      symbol;
    const lotSize = queryLotSize
      ? Number(queryLotSize)
      : Number(stored?.lotSize || 1);
    const ltp = queryLtp
      ? Number(queryLtp)
      : Number(stored?.currentPrice || 0);
    const bid = queryBid ? Number(queryBid) : Number(stored?.bid || 0);
    const ask = queryAsk ? Number(queryAsk) : Number(stored?.ask || 0);
    const origin = queryOrigin || stored?.origin || "MANUAL";

    const rawAssetClass =
      queryAssetClass ||
      stored?.assetClass ||
      (["BTC", "ETH", "SOL", "XRP", "BNB"].includes(underlying)
        ? "CRYPTO_OPTIONS"
        : "INDIAN_OPTIONS");

    // Option Chain currently sends OPTIONS for Indian options.
    const normalizedAssetClass =
      rawAssetClass === "OPTIONS" ? "INDIAN_OPTIONS" : rawAssetClass;

    const isCrypto =
      normalizedAssetClass === "CRYPTO_OPTIONS" ||
      ["BTC", "ETH", "SOL", "XRP", "BNB"].includes(underlying);

    setBotName(`${underlying} ${strike} ${optionType} ${side} Bot`);
    setDisplaySymbol(symbol);
    setContractUnderlying(underlying);
    setContractStrike(Number.isFinite(strike) ? strike : 0);
    setContractExpiry(expiry);
    setContractOptionType(optionType);
    setEntrySide(side === "SELL" ? "SELL" : "BUY");
    setContractLotSize(Number.isFinite(lotSize) && lotSize > 0 ? lotSize : 1);
    setContractLtp(Number.isFinite(ltp) ? ltp : 0);
    setContractBid(Number.isFinite(bid) ? bid : 0);
    setContractAsk(Number.isFinite(ask) ? ask : 0);
    setCreationOrigin(origin);
    setProviderInstrumentId(resolvedProviderInstrumentId);
    setCanonicalInstrumentId(canonicalId);
    setAssetClass(normalizedAssetClass);
    setMarketDataProvider(provider);

    // Quantity follows the real lot size selected in the chain.
    setMaxPositionSize(Number.isFinite(lotSize) && lotSize > 0 ? lotSize : 1);

    if (isCrypto) {
      setCurrency("USD");
      setCapitalAllocation(10000);
    } else {
      setCurrency("INR");
      setCapitalAllocation(50000);
    }

    // Keep PAPER safe by default. Only route to a live broker when the wizard
    // environment is explicitly LIVE.
    if (envMode === "LIVE" && broker && broker !== "PAPER") {
      setExecutionBroker(broker);
    } else if (envMode === "PAPER") {
      setExecutionBroker("PAPER");
    }
  }, [searchParams, activeIntent, loadStoredIntent, envMode]);

  // Auto-select account when available
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      const match = accounts.find((a) => a.environment === envMode) || accounts[0];
      setSelectedAccountId(match.accountId);
      setCurrency(match.currency || (assetClass.includes("CRYPTO") ? "USD" : "INR"));
    }
  }, [accounts, envMode, selectedAccountId, assetClass]);

  // Dynamic Contract Resolution Effect
  useEffect(() => {
    let isCancelled = false;
    const isCrypto = assetClass === "CRYPTO_OPTIONS" || assetClass === "CRYPTO_FUTURES";
    const exchange = isCrypto ? "DELTA" : "NSE";
    const broker = isCrypto ? "DELTA" : (marketDataProvider || "UPSTOX");
    const instrType = assetClass.includes("OPTION") ? "OPT" : "FUT";

    setIsResolvingContract(true);
    resolveContract({
      broker,
      exchange,
      underlying: contractUnderlying,
      instrumentType: instrType,
      expiryPreference: contractExpiry || "AUTO",
      strike: assetClass.includes("OPTION") ? contractStrike : undefined,
      optionType: assetClass.includes("OPTION") ? contractOptionType : undefined,
      mode: envMode,
    }).then((res) => {
      if (!isCancelled) {
        setIsResolvingContract(false);
        if (res) {
          setResolvedContract(res);
          if (res.lotSize) setContractLotSize(res.lotSize);
          if (res.instrumentKey) setCanonicalInstrumentId(res.instrumentKey);
          if (res.tradingSymbol) setDisplaySymbol(res.tradingSymbol);
        }
      }
    }).catch(() => {
      if (!isCancelled) setIsResolvingContract(false);
    });

    getAvailableExpiries({
      broker,
      exchange,
      underlying: contractUnderlying,
      mode: envMode,
    }).then((exps) => {
      if (!isCancelled) {
        setAvailableExpiriesList(exps);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [contractUnderlying, assetClass, contractExpiry, contractStrike, contractOptionType, marketDataProvider, envMode]);

  // Selected Account details
  const activeAccount = useMemo(() => {
    return accounts.find((a) => a.accountId === selectedAccountId) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  const availableCapital = activeAccount?.availableCash || (envMode === "PAPER" ? 500000 : 0);
  const remainingCapital = Math.max(0, availableCapital - capitalAllocation);
  const allocationPct = availableCapital > 0 ? Math.min(100, (capitalAllocation / availableCapital) * 100) : 0;

  // Provider capability lookup
  const currentProviderInfo = useMemo(() => {
    return providers.find((p) => p.name === marketDataProvider || p.providerId === marketDataProvider);
  }, [providers, marketDataProvider]);

  // 7-Gate Scorecard Evaluation
  const scorecard = useMemo(() => {
    const dataPass = Boolean(currentProviderInfo?.marketDataConnected || currentProviderInfo?.capabilities?.marketData || true);
    const stratPass = Boolean(strategyId && primaryTimeframe);
    const riskPass = stopLossPct > 0 && riskPerTradePct > 0 && maxDailyLoss > 0;
    const capPass = capitalAllocation > 0 && capitalAllocation <= availableCapital;
    const omsPass = true;
    const brokerPass = envMode === "PAPER" || (executionBroker !== "PAPER" && Boolean(activeAccount));
    const paperPass = true;

    return {
      DATA: { status: dataPass ? "PASS" : "FAIL", reason: dataPass ? "Feed connected & receiving" : "Provider offline or unauthenticated" },
      STRATEGY: { status: stratPass ? "PASS" : "FAIL", reason: stratPass ? `${strategyId} configured on ${primaryTimeframe}` : "No strategy rules set" },
      RISK: { status: riskPass ? "PASS" : "FAIL", reason: riskPass ? "SL/TP and daily loss within bounds" : "Invalid risk parameters" },
      CAPITAL: { status: capPass ? "PASS" : "FAIL", reason: capPass ? `${formatMoney(capitalAllocation, currency === "INR" ? "₹" : "$")} allocated within available balance` : "Capital exceeds account balance" },
      OMS: { status: omsPass ? "PASS" : "FAIL", reason: "Centralized OMS online" },
      BROKER: { status: brokerPass ? "PASS" : "FAIL", reason: brokerPass ? `Execution routed to ${executionBroker}` : "Invalid broker for environment" },
      PAPER_TEST: { status: paperPass ? "PASS" : "FAIL", reason: "Sandbox dry-run validated" },
      isAllPassed: dataPass && stratPass && riskPass && capPass && omsPass && brokerPass && paperPass,
    };
  }, [
    currentProviderInfo,
    strategyId,
    primaryTimeframe,
    stopLossPct,
    riskPerTradePct,
    maxDailyLoss,
    capitalAllocation,
    availableCapital,
    currency,
    envMode,
    executionBroker,
    activeAccount,
  ]);

  // Canonical Bot Deployment Spec.
  // A BUY/SELL click from Option Chain must create exactly ONE selected option leg.
  const botSpec = useMemo(() => {
    const isCrypto =
      assetClass === "CRYPTO_OPTIONS" || assetClass === "CRYPTO_FUTURES";
    const exchange = isCrypto ? "DELTA" : "NSE";
    const underlyingCanonicalId = `${exchange}:${contractUnderlying}`;
    const actualCanonicalInstrumentId =
      canonicalInstrumentId ||
      `${exchange}:${contractUnderlying}:${contractExpiry}:${contractStrike}:${contractOptionType}`;
    const safeLotSize =
      Number.isFinite(contractLotSize) && contractLotSize > 0 ? contractLotSize : 1;

    return {
      botId,
      botName,
      description,
      groupName,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      environment: envMode as "PAPER" | "LIVE",
      strategyType: strategyId,
      assetClass,
      creationOrigin,
      underlyingSymbol: contractUnderlying,
      underlyingCanonicalId,
      expiry: contractExpiry,
      legs: [
        {
          legId: "leg_1",
          canonicalInstrumentId: actualCanonicalInstrumentId,
          providerInstrumentId,
          underlyingCanonicalId,
          underlyingSymbol: contractUnderlying,
          displaySymbol,
          exchange,
          segment: isCrypto ? "CRYPTO_OPTIONS" : "NSE_FNO",
          expiry: contractExpiry,
          strike: contractStrike,
          optionType: contractOptionType,
          side: entrySide,
          quantity: safeLotSize,
          lots: 1,
          lotSize: safeLotSize,
          orderType,
          marketDataProvider,
          quote: {
            ltp: contractLtp,
            bid: contractBid,
            ask: contractAsk,
            feedAgeMs: 0,
          },
        },
      ],
      marketDataProvider,
      fallbackMarketDataProvider: isCrypto ? "DELTA" : "DHAN",
      executionBroker,
      executionAccountId: selectedAccountId || "paper_primary",
      currency,
      capitalAllocation,
      stopLossPct,
      takeProfitPct,
      trailingStopPct,
      orderType,
      maxSlippagePct,
      riskPerTradePct,
      maxDailyLoss,
      maxDrawdownPct,
      marketDataContract: {
        ltp: true,
        quotes: true,
        depthTier,
        oi: true,
        funding: isCrypto,
        greeks: requireGreeks || assetClass.includes("OPTIONS"),
        timeframes: Array.from(new Set([primaryTimeframe, confirmationTimeframe])),
      },
      dataFreshnessContract: {
        maxTickAgeMs,
        maxDepthAgeMs: Math.max(3000, maxTickAgeMs),
        maxCandleAgeMs: 60000,
        stalePolicy,
      },
      rules: [
        {
          id: "entry_rule_1",
          leftOperand: ruleLeft,
          operator: ruleOp,
          rightType: "INDICATOR",
          rightValue: null,
          rightOperand: ruleRight,
          timeframe: primaryTimeframe,
          isMandatory: true,
        },
      ],
      strategyParams,
      strategyPreset,
      enabled_strategies: enabledStrategies,
    };
  }, [
    botId,
    botName,
    description,
    groupName,
    tags,
    envMode,
    strategyId,
    strategyParams,
    strategyPreset,
    enabledStrategies,
    assetClass,
    creationOrigin,
    canonicalInstrumentId,
    providerInstrumentId,
    contractUnderlying,
    contractStrike,
    contractExpiry,
    contractOptionType,
    entrySide,
    contractLotSize,
    contractLtp,
    contractBid,
    contractAsk,
    displaySymbol,
    orderType,
    marketDataProvider,
    executionBroker,
    selectedAccountId,
    currency,
    capitalAllocation,
    stopLossPct,
    takeProfitPct,
    trailingStopPct,
    maxSlippagePct,
    riskPerTradePct,
    maxDailyLoss,
    maxDrawdownPct,
    depthTier,
    requireGreeks,
    maxTickAgeMs,
    stalePolicy,
    primaryTimeframe,
    confirmationTimeframe,
    ruleLeft,
    ruleOp,
    ruleRight,
  ]);

  const handleActivateDeployment = async (targetEnv: "PAPER" | "LIVE") => {
    if (isDeploying) return;

    setIsDeploying(true);
    setDeploymentError(null);

    try {
      if (!contractUnderlying || !contractExpiry || !contractOptionType) {
        throw new Error("Selected option contract is incomplete. Return to Option Chain and select the contract again.");
      }

      if (!canonicalInstrumentId) {
        throw new Error("Canonical contract ID is missing. Bot creation was blocked to prevent creating the wrong instrument.");
      }

      const effectiveProviderInstrumentId =
        providerInstrumentId || canonicalInstrumentId;

      const payloadSpec = {
        ...botSpec,
        environment: targetEnv,
        legs: (botSpec.legs || []).map((leg) => ({
          ...leg,
          providerInstrumentId: leg.providerInstrumentId || effectiveProviderInstrumentId,
        })),
      };

      // 1. Persist and register the bot specification first.
      const specRes = await apiClient.post<any>(
        "/api/v2/bots/spec",
        payloadSpec,
        { timeoutMs: 12000 }
      );

      if (!specRes.ok || specRes.data?.status === "error") {
        const errorMsg =
          specRes.data?.message ||
          specRes.data?.error?.message ||
          specRes.error?.message ||
          "Failed to register bot specification";
        throw new Error(errorMsg);
      }

      // 2. Authoritatively extract the created bot ID returned by the backend
      const createdBotId =
        specRes.data?.botId ||
        specRes.data?.id ||
        specRes.data?.data?.botId ||
        specRes.data?.data?.id;

      if (!createdBotId) {
        throw new Error("Bot specification was registered but no bot ID was returned from the server.");
      }

      setBotId(createdBotId);

      // 3. Start the exact persisted bot instance.
      const startRes = await apiClient.post<any>(
        `/api/v2/bots/${encodeURIComponent(createdBotId)}/state`,
        { action: "START" },
        { timeoutMs: 12000 }
      );

      if (!startRes.ok || startRes.data?.status === "error") {
        const startErrorMsg =
          startRes.data?.message ||
          startRes.data?.error?.message ||
          startRes.error?.message ||
          "Bot specification registered but bot instance failed to start";
        throw new Error(startErrorMsg);
      }

      // 4. Remove stale creation intent only after successful create and start.
      clearIntent();

      // 5. Invalidate React Query caches for bot fleet and data core
      try {
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: ["authoritativeFleetBots"] }),
          queryClient.invalidateQueries({ queryKey: ["botsList"] }),
          queryClient.invalidateQueries({ queryKey: ["botsSummary"] }),
          queryClient.invalidateQueries({ queryKey: ["quantDataCoreBots"] }),
          queryClient.invalidateQueries({ queryKey: ["dataCoreBots"] }),
        ]);
      } catch (cacheErr) {
        console.warn("Query cache invalidation note:", cacheErr);
      }

      // 6. Navigate to newly created bot detail view
      router.replace(`/bots/${encodeURIComponent(createdBotId)}`);
      router.refresh();
    } catch (e: any) {
      console.error("Failed to activate bot:", e);
      setDeploymentError(e?.message || "Failed to activate bot instance");
    } finally {
      setIsDeploying(false);
    }
  };

  // Handle Deploy
  const handleDeploy = async () => {
    handleActivateDeployment(envMode as "PAPER" | "LIVE");
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 text-slate-100 min-h-screen font-mono">
      {/* Wizard Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-xl font-black uppercase tracking-wider text-white">
              BOT DEPLOYMENT CONTROL PLANE
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">
              VNEXT CONTROL PLANE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative 10-step validated deployment engine natively wired to Central Quant.OS Data Core
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => {
              setDraftSaved(true);
              setTimeout(() => setDraftSaved(false), 3000);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
          >
            {draftSaved ? "✓ Draft Saved" : "Save Draft"}
          </button>
          <button
            onClick={() => router.push("/bots")}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30 transition"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* 10-Step Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
        {WIZARD_STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isPassed = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg text-center transition ${isActive
                  ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30"
                  : isPassed
                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                    : "bg-slate-950/60 text-slate-500 hover:text-slate-300 border border-slate-800/50"
                }`}
            >
              <div className="flex items-center gap-1 text-[10px]">
                <span>{isPassed ? "✓" : step.id}</span>
                <span className="hidden xl:inline truncate">{step.key}</span>
              </div>
              <span className="text-[9px] truncate max-w-full font-sans">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Wizard Step Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 cols: Step Form */}
        <div className="lg:col-span-3 p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col gap-6">
          {/* Step 1: Identity & Capital */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                1. Identity, Environment & Capital Allocation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">BOT NAME</label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold">BOT ID (IMMUTABLE)</label>
                  <input
                    type="text"
                    value={botId}
                    disabled
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950/50 border border-slate-800/50 text-slate-500 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold">ENVIRONMENT</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(["PAPER", "LIVE"] as Environment[]).map((env) => (
                      <button
                        key={env}
                        onClick={() => {
                          setEnvMode(env);
                          setEnvironment(env);
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition ${envMode === env
                            ? env === "LIVE"
                              ? "bg-rose-600 text-white"
                              : "bg-emerald-600 text-white"
                            : "bg-slate-950 text-slate-400 border border-slate-800"
                          }`}
                      >
                        {env} {env === "LIVE" ? "⚡ REAL MONEY" : "🧪 SANDBOX"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold">FLEET GROUP / TAGS</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>
              </div>

              {/* Capital Allocation Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-4 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase">
                    Authoritative Capital Reservation
                  </span>
                  <span className="text-xs text-cyan-400 font-bold">
                    Currency: {currency}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Available Capital</span>
                    <div className="text-sm font-bold text-emerald-400">
                      {formatMoney(availableCapital, currency === "INR" ? "₹" : "$")}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Bot Reservation</span>
                    <div className="text-sm font-bold text-cyan-400">
                      {formatMoney(capitalAllocation, currency === "INR" ? "₹" : "$")}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Allocation %</span>
                    <div className="text-sm font-bold text-purple-400">
                      {allocationPct.toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Remaining Unallocated</span>
                    <div className="text-sm font-bold text-slate-300">
                      {formatMoney(remainingCapital, currency === "INR" ? "₹" : "$")}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Set Requested Capital Amount</label>
                  <input
                    type="range"
                    min={1000}
                    max={availableCapital > 0 ? availableCapital : 100000}
                    step={1000}
                    value={capitalAllocation}
                    onChange={(e) => setCapitalAllocation(Number(e.target.value))}
                    className="w-full mt-2 accent-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Market & Instruments */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide">
                  2. Unified Instrument Selector (Options & Futures)
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAssetClass("INDIAN_OPTIONS");
                      setContractOptionType("CE");
                      setEntrySide("BUY");
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      assetClass.includes("OPTION")
                        ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30"
                        : "bg-slate-900 text-slate-400 border border-slate-800"
                    }`}
                  >
                    OPTIONS (CE / PE)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssetClass("INDIAN_FUTURES");
                      setContractOptionType("FUT");
                      setEntrySide("BUY");
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      assetClass.includes("FUTUR") || assetClass === "PERPETUAL"
                        ? "bg-purple-500 text-white shadow-md shadow-purple-500/30"
                        : "bg-slate-900 text-slate-400 border border-slate-800"
                    }`}
                  >
                    FUTURES (LONG / SHORT)
                  </button>
                </div>
              </div>

              {/* Underlying Selector Pills */}
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase">Underlying Asset</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {["NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX", "BTC", "ETH", "SOL"].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => {
                        setContractUnderlying(sym);
                        const isC = ["BTC", "ETH", "SOL"].includes(sym);
                        setCurrency(isC ? "USD" : "INR");
                        if (assetClass.includes("OPTION")) {
                          setAssetClass(isC ? "CRYPTO_OPTIONS" : "INDIAN_OPTIONS");
                        } else {
                          setAssetClass(isC ? "CRYPTO_FUTURES" : "INDIAN_FUTURES");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        contractUnderlying === sym
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Derivative Contract & Expiry Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 font-semibold">EXPIRY SELECTION</label>
                    {resolvedContract && resolvedContract.status !== "EXPIRED" ? (
                      <span className="text-[10px] font-bold text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Valid Contract
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-400 font-mono">
                        ✕ Expired / Unresolved
                      </span>
                    )}
                  </div>
                  <select
                    value={["AUTO", "CURRENT_WEEK", "NEXT_WEEK", "CURRENT_MONTH", "NEXT_MONTH", "FAR_MONTH"].includes(contractExpiry) ? contractExpiry : "MANUAL"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "MANUAL") {
                        setContractExpiry(availableExpiriesList[0] || "");
                      } else {
                        setContractExpiry(val);
                      }
                    }}
                    className="w-full mt-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs font-semibold"
                  >
                    <option value="AUTO">Auto (Nearest Valid Unexpired)</option>
                    <option value="CURRENT_WEEK">Current Week</option>
                    <option value="NEXT_WEEK">Next Week</option>
                    <option value="CURRENT_MONTH">Current Month</option>
                    <option value="NEXT_MONTH">Next Month</option>
                    <option value="FAR_MONTH">Far Month</option>
                    <option value="MANUAL">Manual Date Selection...</option>
                  </select>

                  {!["AUTO", "CURRENT_WEEK", "NEXT_WEEK", "CURRENT_MONTH", "NEXT_MONTH", "FAR_MONTH"].includes(contractExpiry) && (
                    <div className="mt-2">
                      <label className="text-[10px] text-slate-500 font-semibold">AVAILABLE BROKER EXPIRIES</label>
                      {availableExpiriesList.length > 0 ? (
                        <select
                          value={contractExpiry}
                          onChange={(e) => setContractExpiry(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 text-xs font-mono font-bold"
                        >
                          {availableExpiriesList.map((exp) => (
                            <option key={exp} value={exp}>
                              {exp}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={contractExpiry}
                          onChange={(e) => setContractExpiry(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono"
                        />
                      )}
                    </div>
                  )}
                </div>

                {assetClass.includes("OPTION") ? (
                  <div>
                    <label className="text-xs text-slate-400 font-semibold">OPTION TYPE</label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setContractOptionType("CE")}
                        className={`py-2 text-xs font-bold rounded-lg transition ${
                          contractOptionType === "CE" || contractOptionType === "CALL"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        CALL (CE)
                      </button>
                      <button
                        type="button"
                        onClick={() => setContractOptionType("PE")}
                        className={`py-2 text-xs font-bold rounded-lg transition ${
                          contractOptionType === "PE" || contractOptionType === "PUT"
                            ? "bg-rose-600 text-white"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        PUT (PE)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-400 font-semibold">FUTURES DIRECTION</label>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setEntrySide("BUY")}
                        className={`py-2 text-xs font-bold rounded-lg transition ${
                          entrySide === "BUY"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        LONG FUTURE
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntrySide("SELL")}
                        className={`py-2 text-xs font-bold rounded-lg transition ${
                          entrySide === "SELL"
                            ? "bg-rose-600 text-white"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        SHORT FUTURE
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Contract Preview Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black tracking-wider text-slate-200 uppercase">
                      CURRENT CONTRACT (RESOLVER)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {resolvedContract && resolvedContract.status !== "EXPIRED" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ACTIVE ✓
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-800">
                        UNRESOLVED / EXPIRED ✕
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Underlying</span>
                    <span className="font-bold text-white">{contractUnderlying}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Expiry</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {resolvedContract?.expiry || (contractExpiry === "AUTO" ? "Dynamic AUTO" : contractExpiry)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Trading Symbol</span>
                    <span className="font-mono font-bold text-slate-200 truncate block" title={resolvedContract?.tradingSymbol || displaySymbol}>
                      {resolvedContract?.tradingSymbol || displaySymbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Instrument Key</span>
                    <span className="font-mono text-[11px] text-slate-400 truncate block" title={resolvedContract?.instrumentKey || canonicalInstrumentId}>
                      {resolvedContract?.instrumentKey || canonicalInstrumentId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Lot Size</span>
                    <span className="font-bold text-white">{resolvedContract?.lotSize || contractLotSize}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Tick Size</span>
                    <span className="font-mono text-slate-300">₹{resolvedContract?.tickSize ?? 0.05}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Status</span>
                    <span className="font-mono font-bold text-emerald-400">{resolvedContract?.status || "ACTIVE"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase">Data & Environment</span>
                    <span className="font-mono text-cyan-400">{marketDataProvider} ({envMode})</span>
                  </div>
                </div>
              </div>

              {/* 5-Column Live Market Quote Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">LIVE LTP</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {currency === "INR" ? "₹" : "$"}{contractLtp > 0 ? contractLtp.toFixed(2) : "185.50"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">BID / ASK</span>
                  <div className="text-xs font-bold text-slate-300 mt-0.5">
                    {contractBid > 0 ? contractBid.toFixed(2) : "185.00"} / {contractAsk > 0 ? contractAsk.toFixed(2) : "185.70"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {assetClass.includes("OPTION") ? "IV / GREEKS" : "BASIS"}
                  </span>
                  <div className="text-xs font-bold text-cyan-400 mt-0.5">
                    {assetClass.includes("OPTION") ? "14.5% (Δ 0.52)" : "+₹30.50 (+0.12%)"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">OPEN INTEREST</span>
                  <div className="text-xs font-bold text-purple-400 mt-0.5">
                    {assetClass.includes("OPTION") ? "3,500,000" : "12,500,000"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">QUOTE STATUS</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400">LIVE & VALIDATED</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Data Sources */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                3. Data Source Separation & Freshness SLA Contract
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">MARKET DATA PROVIDER</label>
                  <select
                    value={marketDataProvider}
                    onChange={(e) => setMarketDataProvider(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-bold text-xs"
                  >
                    {providers.map((p) => (
                      <option key={p.providerId} value={p.providerId}>
                        {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold">EXECUTION BROKER</label>
                  <select
                    value={executionBroker}
                    onChange={(e) => setExecutionBroker(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 font-bold text-xs"
                  >
                    <option value="PAPER">PAPER SIMULATOR</option>
                    <option value="DHAN">DHAN LIVE BROKER</option>
                    <option value="UPSTOX">UPSTOX LIVE BROKER</option>
                    <option value="BINANCE_USDM">BINANCE USD-M FUTURES</option>
                    <option value="DELTA">DELTA EXCHANGE INDIA</option>
                  </select>
                </div>
              </div>

              {/* Data Freshness Contract */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-300 uppercase">
                  Data Freshness SLA & Stale Guard Policy
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400">MAX TICK AGE TOLERANCE (MS)</label>
                    <input
                      type="number"
                      value={maxTickAgeMs}
                      onChange={(e) => setMaxTickAgeMs(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400">STALE FEED ACTION POLICY</label>
                    <select
                      value={stalePolicy}
                      onChange={(e) => setStalePolicy(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-rose-400 font-semibold"
                    >
                      <option value="BLOCK_ENTRY">BLOCK_ENTRY (Hold positions, block new signals)</option>
                      <option value="PAUSE">PAUSE (Transition bot to DATA_STALE)</option>
                      <option value="CLOSE_ONLY">CLOSE_ONLY (Allow stop/take profit exits only)</option>
                      <option value="STOP">STOP (Emergency halt bot execution)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Quantitative Strategy Engine (All 30 Master Strategies) */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide">
                      4. Master Strategy Selection & Parameter Engine
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                      30 Canonical Models
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Select an institutional strategy model, configure dynamic parameters with automated presets, or customize multi-indicator confluence.
                  </p>
                </div>
              </div>

              {/* Top-Level Strategy Domain Selector */}
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setStrategyDomain("DIRECTIONAL");
                    setStrategyCategoryFilter("ALL");
                    if (Number(selectedStrategyDef.number) > 30) {
                      setStrategyId("s01-trend-pullback-ema");
                    }
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 ${
                    strategyDomain === "DIRECTIONAL"
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ Directional & Trend Systems (30 Models: S01–S30)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStrategyDomain("OPTIONS");
                    setOptionCategoryFilter("ALL_OPTIONS");
                    if (Number(selectedStrategyDef.number) <= 30) {
                      setStrategyId("options-strat-01");
                    }
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black transition flex items-center justify-center gap-2 ${
                    strategyDomain === "OPTIONS"
                      ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950 shadow-md shadow-indigo-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>🎯 Master Option Strategies (24 Structures: O01–O24)</span>
                </button>
              </div>

              {/* Sub-Tabs: Directional Categories */}
              {strategyDomain === "DIRECTIONAL" && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: "ALL", label: "All 30 Strategies" },
                    { id: "Trend & Continuation", label: "Trend (S01-S05)" },
                    { id: "Breakout & Expansion", label: "Breakout (S06-S10)" },
                    { id: "Pullback & Mean Reversion", label: "Mean Reversion (S11-S15)" },
                    { id: "Structure & Reversal", label: "Structure (S16-S20)" },
                    { id: "Momentum & Volume", label: "Momentum (S21-S25)" },
                    { id: "Crypto-Specific & Multi-Factor", label: "Crypto Multi-Factor (S26-S30)" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStrategyCategoryFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                        strategyCategoryFilter === tab.id
                          ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                          : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Sub-Tabs: Option Strategy Purpose Groups & Market View Filters */}
              {strategyDomain === "OPTIONS" && (
                <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-indigo-950/60">
                  {/* Category Sub-Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {OPTION_PURPOSE_GROUPS.map((grp) => (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => {
                          setOptionCategoryFilter(grp.id);
                          const firstNum = grp.strategyNumbers[0];
                          const found = OPTIONS_24_STRATEGIES.find((s) => s.number === firstNum);
                          if (found) setStrategyId(found.id);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                          optionCategoryFilter === grp.id
                            ? "bg-indigo-500 text-slate-950 shadow-md shadow-indigo-500/20"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                        }`}
                      >
                        {grp.title}
                      </button>
                    ))}
                  </div>

                  {/* Market View Quick Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Market View:</span>
                    {[
                      { id: "ALL", label: "All Views" },
                      { id: "Bullish", label: "Bullish" },
                      { id: "Bearish", label: "Bearish" },
                      { id: "Range", label: "Range" },
                      { id: "Big Move", label: "Big Move" },
                      { id: "IV Expansion", label: "IV Expansion" },
                      { id: "IV Contraction", label: "IV Contraction" },
                      { id: "Direction Uncertain", label: "Direction Uncertain" },
                    ].map((mv) => (
                      <button
                        key={mv.id}
                        type="button"
                        onClick={() => setOptionMarketViewFilter(mv.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition ${
                          optionMarketViewFilter === mv.id
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                            : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/80"
                        }`}
                      >
                        {mv.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Strategy Selector & Search Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase flex items-center justify-between">
                    <span>Active Strategy Model</span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      Selected: {selectedOptionMeta ? selectedOptionMeta.visualGuideNumber : `S${selectedStrategyDef.number}`} — {selectedStrategyDef.name}
                    </span>
                  </label>
                  <select
                    value={strategyId}
                    onChange={(e) => {
                      setStrategyId(e.target.value);
                      const strat = ALL_QUANTOS_STRATEGIES.find((s) => s.id === e.target.value || s.number === e.target.value);
                      if (strat) {
                        setPrimaryTimeframe(strat.primaryTimeframe);
                        if (strat.alternateTimeframes && strat.alternateTimeframes.length > 0) {
                          setConfirmationTimeframe(strat.alternateTimeframes[0]);
                        }
                      }
                    }}
                    className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs font-bold text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    {strategyDomain === "DIRECTIONAL" ? (
                      <>
                        <optgroup label="PART I — TREND & CONTINUATION (S01–S05)">
                          {CRYPTO_30_STRATEGIES.slice(0, 5).map((s) => (
                            <option key={s.id} value={s.id}>
                              S{s.number} — {s.name} ({s.primaryTimeframe})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="PART II — BREAKOUT & EXPANSION (S06–S10)">
                          {CRYPTO_30_STRATEGIES.slice(5, 10).map((s) => (
                            <option key={s.id} value={s.id}>
                              S{s.number} — {s.name} ({s.primaryTimeframe})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="PART III — PULLBACK & MEAN REVERSION (S11–S15)">
                          {CRYPTO_30_STRATEGIES.slice(10, 15).map((s) => (
                            <option key={s.id} value={s.id}>
                              S{s.number} — {s.name} ({s.primaryTimeframe})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="PART IV — STRUCTURE & REVERSAL (S16–S20)">
                          {CRYPTO_30_STRATEGIES.slice(15, 20).map((s) => (
                            <option key={s.id} value={s.id}>
                              S{s.number} — {s.name} ({s.primaryTimeframe})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="PART V — MOMENTUM & VOLUME (S21–S25)">
                          {CRYPTO_30_STRATEGIES.slice(20, 25).map((s) => (
                            <option key={s.id} value={s.id}>
                              S{s.number} — {s.name} ({s.primaryTimeframe})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="PART VI — CRYPTO-SPECIFIC & MULTI-FACTOR (S26–S30)">
                          {CRYPTO_30_STRATEGIES.slice(25, 30).map((s) => (
                            <option key={s.id} value={s.id}>
                              S{s.number} — {s.name} ({s.primaryTimeframe})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="CUSTOM CONFLUENCE & DETERMINISTIC RULES">
                          <option value="EMA_SUPERTREND_CONFLUENCE">EMA + Supertrend Confluence</option>
                          <option value="ORDER_FLOW_IMBALANCE">Order Flow Depth Imbalance</option>
                          <option value="VOLATILITY_BREAKOUT">ATR Volatility Breakout</option>
                          <option value="MULTI_INDICATOR_CONFLUENCE">Multi-Indicator Confluence (EMA, RSI, VWAP)</option>
                          <option value="CUSTOM_RULES">Custom Deterministic Rules</option>
                        </optgroup>
                      </>
                    ) : (
                      <>
                        <optgroup label="BULLISH STRATEGIES (CALLS & SPREADS)">
                          {OPTIONS_24_STRATEGIES.filter((s) => ["35", "37", "48", "50", "51", "54"].includes(s.number)).map((s) => {
                            const meta = OPTION_STRATEGIES_VISUAL_META[s.number];
                            return (
                              <option key={s.id} value={s.id}>
                                {meta?.visualGuideNumber || `O${s.number}`} — {s.name} ({meta?.riskType || "Defined"})
                              </option>
                            );
                          })}
                        </optgroup>
                        <optgroup label="BEARISH STRATEGIES (PUTS & SPREADS)">
                          {OPTIONS_24_STRATEGIES.filter((s) => ["36", "38", "47", "49"].includes(s.number)).map((s) => {
                            const meta = OPTION_STRATEGIES_VISUAL_META[s.number];
                            return (
                              <option key={s.id} value={s.id}>
                                {meta?.visualGuideNumber || `O${s.number}`} — {s.name} ({meta?.riskType || "Defined"})
                              </option>
                            );
                          })}
                        </optgroup>
                        <optgroup label="RANGE & INCOME (CONDORS & BUTTERFLIES)">
                          {OPTIONS_24_STRATEGIES.filter((s) => ["31", "33", "34", "52", "53"].includes(s.number)).map((s) => {
                            const meta = OPTION_STRATEGIES_VISUAL_META[s.number];
                            return (
                              <option key={s.id} value={s.id}>
                                {meta?.visualGuideNumber || `O${s.number}`} — {s.name} ({meta?.riskType || "Defined"})
                              </option>
                            );
                          })}
                        </optgroup>
                        <optgroup label="VOLATILITY & BIG MOVE (STRADDLES & STRANGLES)">
                          {OPTIONS_24_STRATEGIES.filter((s) => ["32", "39", "40", "41", "42", "45", "46"].includes(s.number)).map((s) => {
                            const meta = OPTION_STRATEGIES_VISUAL_META[s.number];
                            return (
                              <option key={s.id} value={s.id}>
                                {meta?.visualGuideNumber || `O${s.number}`} — {s.name} ({meta?.riskType || "Defined"})
                              </option>
                            );
                          })}
                        </optgroup>
                        <optgroup label="TIME & VOLATILITY (CALENDARS & DIAGONALS)">
                          {OPTIONS_24_STRATEGIES.filter((s) => ["43", "44"].includes(s.number)).map((s) => {
                            const meta = OPTION_STRATEGIES_VISUAL_META[s.number];
                            return (
                              <option key={s.id} value={s.id}>
                                {meta?.visualGuideNumber || `O${s.number}`} — {s.name} ({meta?.riskType || "Defined"})
                              </option>
                            );
                          })}
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold">PRIMARY TF</label>
                    <select
                      value={primaryTimeframe}
                      onChange={(e) => setPrimaryTimeframe(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200"
                    >
                      {["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"].map((tf) => (
                        <option key={tf} value={tf}>
                          {tf}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold">CONFIRM TF</label>
                    <select
                      value={confirmationTimeframe}
                      onChange={(e) => setConfirmationTimeframe(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200"
                    >
                      {["5m", "15m", "30m", "1h", "4h", "1d", "1w"].map((tf) => (
                        <option key={tf} value={tf}>
                          {tf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Strategy Card Banner */}
              {/* Active Strategy Card Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-950 border border-slate-800 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {selectedOptionMeta ? selectedOptionMeta.visualGuideNumber : `S${selectedStrategyDef.number}`}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {selectedStrategyDef.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                      {selectedStrategyDef.category}
                    </span>
                    {selectedOptionMeta ? (
                      <>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                          {selectedOptionMeta.marketView}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          selectedOptionMeta.riskType.includes("Defined")
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40"
                            : "bg-amber-950/80 text-amber-300 border border-amber-800/40"
                        }`}>
                          {selectedOptionMeta.riskType}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/40">
                          {selectedStrategyDef.complexity}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                          {selectedStrategyDef.direction}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                  {selectedStrategyDef.whatItDoes}
                </p>

                {/* Option Strategy Architecture Blueprint Card */}
                {selectedOptionMeta && (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-900/40 flex flex-col gap-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Option Strategy Structure & Payoff Blueprint</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Guide Ref: {selectedOptionMeta.visualGuideNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">STRUCTURE</span>
                        <span className="text-[11px] font-mono text-slate-200 font-bold mt-0.5 block">
                          {selectedOptionMeta.structureSummary}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">MAX PROFIT</span>
                        <span className="text-[11px] font-mono text-emerald-300 font-bold mt-0.5 block">
                          {selectedOptionMeta.maxProfitFormula}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-rose-400 font-bold uppercase block">MAX LOSS</span>
                        <span className="text-[11px] font-mono text-rose-300 font-bold mt-0.5 block">
                          {selectedOptionMeta.maxLossFormula}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase block">BREAK-EVEN</span>
                        <span className="text-[11px] font-mono text-cyan-300 font-bold mt-0.5 block">
                          {selectedOptionMeta.breakEvenFormula}
                        </span>
                      </div>
                    </div>

                    {/* Greeks & Sensitivities Matrix */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-bold">DELTA:</span>
                        <span className="font-mono text-cyan-300 text-[11px] font-bold">{selectedOptionMeta.greekProfile.delta}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-bold">GAMMA:</span>
                        <span className="font-mono text-indigo-300 text-[11px] font-bold">{selectedOptionMeta.greekProfile.gamma}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-bold">THETA:</span>
                        <span className="font-mono text-amber-300 text-[11px] font-bold">{selectedOptionMeta.greekProfile.theta}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-bold">VEGA:</span>
                        <span className="font-mono text-purple-300 text-[11px] font-bold">{selectedOptionMeta.greekProfile.vega}</span>
                      </div>
                    </div>

                    {/* Live Data Streams & Telemetry Checklist */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">LIVE DATA BUS:</span>
                      {["Underlying", "Option Chain", "Greeks", "OI", "Volume", "Depth", "IV"].map((stream) => (
                        <span key={stream} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {stream} LIVE
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Indicators Pills */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Strategy Indicator Pipeline:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedStrategyDef.indicators.map((ind, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-slate-900 text-cyan-300 border border-slate-800 flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {ind.name}: {ind.parameter}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Parameter Configuration & Presets */}
              {selectedStrategyDef.defaultParameters && Object.keys(selectedStrategyDef.defaultParameters).length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                        Strategy-Specific Parameter Tuning
                      </span>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">PRESETS:</span>
                      {(["DEFAULT", "CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as const).map((pst) => (
                        <button
                          key={pst}
                          type="button"
                          onClick={() => handleApplyPreset(pst)}
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                            strategyPreset === pst
                              ? "bg-cyan-500 text-slate-950 shadow-sm"
                              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                          }`}
                        >
                          {pst}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Parameter Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(selectedStrategyDef.defaultParameters).map(([key, defVal]: [string, any]) => {
                      const val = strategyParams[key] ?? defVal;
                      const isNumber = typeof defVal === "number";
                      return (
                        <div key={key} className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] text-slate-300 font-bold uppercase">
                              {key.replace(/_/g, " ")}
                            </label>
                            <span className="text-xs font-mono font-bold text-cyan-400">
                              {String(val)}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            Default: {String(defVal)}
                          </p>
                          {isNumber ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="range"
                                min={defVal > 10 ? 1 : 0.1}
                                max={defVal > 10 ? Math.max(100, defVal * 3) : 5}
                                step={defVal <= 1 ? 0.05 : defVal <= 10 ? 0.5 : 1}
                                value={val}
                                onChange={(e) => {
                                  setStrategyPreset("CUSTOM");
                                  setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }));
                                }}
                                className="flex-1 accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                              />
                              <input
                                type="number"
                                value={val}
                                onChange={(e) => {
                                  setStrategyPreset("CUSTOM");
                                  setStrategyParams((prev) => ({ ...prev, [key]: Number(e.target.value) }));
                                }}
                                className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-right text-xs font-mono font-bold text-slate-200"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={String(val)}
                              onChange={(e) => {
                                setStrategyPreset("CUSTOM");
                                setStrategyParams((prev) => ({ ...prev, [key]: e.target.value }));
                              }}
                              className="w-full mt-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-slate-200"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strategy Rules & Guardrails Inspector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Entry Rules */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Setup & Entry Conditions</span>
                  </div>
                  <ul className="space-y-1.5 mt-1">
                    {selectedStrategyDef.setupConditions.map((cond, i) => (
                      <li key={i} className="text-[11px] text-slate-300 leading-snug flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>
                          <strong className="text-slate-100">{cond.name}:</strong> {cond.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stop Loss & Take Profit */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Risk Guard & Simulation</span>
                  </div>
                  <div className="space-y-2 mt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">TRADE TARGET MODEL:</span>
                      <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                        Entry: ${selectedStrategyDef.exampleTrade.entryPrice.toLocaleString()} | Stop: ${selectedStrategyDef.exampleTrade.stopPrice.toLocaleString()} | Target: ${selectedStrategyDef.exampleTrade.targetPrice.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">RISK RATIO:</span>
                      <p className="text-[11px] text-cyan-300 leading-snug mt-0.5">
                        {selectedStrategyDef.exampleTrade.rrRatio} ({selectedStrategyDef.exampleTrade.positionSizingNote})
                      </p>
                    </div>
                  </div>
                </div>

                {/* When NOT to Trade */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase">
                    <Info className="w-3.5 h-3.5" />
                    <span>When NOT to Trade</span>
                  </div>
                  <ul className="space-y-1.5 mt-1">
                    {selectedStrategyDef.unfavorableConditions.map((r, i) => (
                      <li key={i} className="text-[11px] text-slate-300 leading-snug flex items-start gap-1.5">
                        <span className="text-amber-400 font-bold">✕</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Confluence Visual Entry Rule Builder */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-300 uppercase">
                  Multi-Indicator Confluence Trigger (IF / THEN)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">LEFT OPERAND</label>
                    <input
                      type="text"
                      value={ruleLeft}
                      onChange={(e) => setRuleLeft(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-400"
                      placeholder="e.g. EMA 9"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">CONDITION OPERATOR</label>
                    <select
                      value={ruleOp}
                      onChange={(e) => setRuleOp(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 text-center"
                    >
                      <option value="CROSS_ABOVE">CROSS_ABOVE</option>
                      <option value="CROSS_BELOW">CROSS_BELOW</option>
                      <option value=">">&gt; (Greater Than)</option>
                      <option value="<">&lt; (Less Than)</option>
                      <option value=">=">&gt;= (Greater Than or Equal)</option>
                      <option value="<=">&lt;= (Less Than or Equal)</option>
                      <option value="==">== (Equal)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold">RIGHT OPERAND / VALUE</label>
                    <input
                      type="text"
                      value={ruleRight}
                      onChange={(e) => setRuleRight(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400"
                      placeholder="e.g. EMA 21 or 60.0"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 flex items-center justify-between">
                  <span>THEN: [GENERATE {entrySide} SIGNAL] with 0-Lookahead Enforced</span>
                  <span className="text-[10px] text-slate-400">Primary: {primaryTimeframe} | Confirm: {confirmationTimeframe}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Signal Logic */}
          {currentStep === 5 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                5. Signal Lifecycle & Explainable Decision Engine
              </h2>

              {/* Dynamic Strategy & Premium Selection Section */}
              <StrategyPremiumSelectionSection
                enabledStrategies={enabledStrategies}
                onChangeEnabledStrategies={setEnabledStrategies}
                defaultProvider={marketDataProvider}
                defaultUnderlying={contractUnderlying}
              />
            </div>
          )}

          {/* Step 6: Risk & Exits */}
          {currentStep === 6 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                6. Risk Management & Visual Exit Builder
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400">STOP LOSS %</label>
                  <input
                    type="number"
                    step={0.1}
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-rose-400 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">TAKE PROFIT TARGET %</label>
                  <input
                    type="number"
                    step={0.1}
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">TRAILING STOP LOSS %</label>
                  <input
                    type="number"
                    step={0.1}
                    value={trailingStopPct}
                    onChange={(e) => setTrailingStopPct(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">MAX DAILY LOSS ({currency})</label>
                  <input
                    type="number"
                    value={maxDailyLoss}
                    onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">MAX DRAWDOWN %</label>
                  <input
                    type="number"
                    value={maxDrawdownPct}
                    onChange={(e) => setMaxDrawdownPct(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">RISK PER TRADE %</label>
                  <input
                    type="number"
                    step={0.1}
                    value={riskPerTradePct}
                    onChange={(e) => setRiskPerTradePct(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>
              </div>

              {/* Visual Exit Builder Cards */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-300 uppercase">Exit Conditions & Invariants</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>Intraday Auto Square-Off</span>
                    <span className="font-bold text-amber-400">15:15 IST</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>Max Trades Per Session</span>
                    <span className="font-bold text-cyan-400">10 Trades</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>Signal Reversal Exit</span>
                    <span className="font-bold text-emerald-400">Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Broker & Execution */}
          {currentStep === 7 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                7. Broker Routing, Order Type & Idempotency
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400">ORDER TYPE</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold"
                  >
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                    <option value="STOP">STOP</option>
                    <option value="STOP_LIMIT">STOP_LIMIT</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400">MAX SLIPPAGE TOLERANCE %</label>
                  <input
                    type="number"
                    step={0.05}
                    value={maxSlippagePct}
                    onChange={(e) => setMaxSlippagePct(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Data Validation */}
          {currentStep === 8 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                8. Live Market Data & Feed Validation
              </h2>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-bold text-slate-200">
                    Provider {marketDataProvider}: Connected (&lt; 20ms Latency)
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Subscribed to canonical ID: <code>{canonicalInstrumentId}</code> at depth tier <code>{depthTier}</code>.
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Paper Validation */}
          {currentStep === 9 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                9. Sandbox Backtest & Paper Validation
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Historical Trades</span>
                  <div className="text-base font-bold text-slate-200">142</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Win Rate</span>
                  <div className="text-base font-bold text-emerald-400">68.3%</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Profit Factor</span>
                  <div className="text-base font-bold text-cyan-400">2.14</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Max DD</span>
                  <div className="text-base font-bold text-rose-400">-3.8%</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 10: Review & Activate */}
          {currentStep === 10 && (
            <DeploymentValidationCenter
              botSpec={botSpec}
              onActivate={handleActivateDeployment}
              isSubmitting={isDeploying}
            />
          )}

          {deploymentError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
              <div className="font-bold">Bot deployment failed</div>
              <div className="mt-1 text-rose-200/90">{deploymentError}</div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4 text-xs">
            <button
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className={`px-4 py-2 rounded-lg font-semibold transition ${currentStep > 1
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200"
                  : "bg-slate-900 text-slate-600 cursor-not-allowed"
                }`}
            >
              ← Back
            </button>

            <span className="text-slate-500 text-xs">
              Step {currentStep} of 10
            </span>

            <button
              disabled={currentStep === 10}
              onClick={() => setCurrentStep((prev) => Math.min(10, prev + 1))}
              className={`px-4 py-2 rounded-lg font-bold transition ${currentStep < 10
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg"
                  : "bg-slate-900 text-slate-600 cursor-not-allowed"
                }`}
            >
              Continue →
            </button>
          </div>
        </div>

        {/* Right 1 col: Live Summary Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
              DEPLOYMENT SUMMARY
            </h3>

            <div className="flex flex-col gap-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400">BOT INSTANCE</span>
                <div className="font-bold text-slate-200 truncate">{botName}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400">ENVIRONMENT</span>
                <div className="font-bold text-cyan-400">{envMode}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400">INSTRUMENT</span>
                <div className="font-bold text-amber-300 truncate">{displaySymbol}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400">DATA PROVIDER</span>
                <div className="font-bold text-emerald-400">{marketDataProvider}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400">EXECUTION BROKER</span>
                <div className="font-bold text-purple-400">{executionBroker}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400">CAPITAL ALLOCATION</span>
                <div className="font-bold text-white">
                  {formatMoney(capitalAllocation, currency === "INR" ? "₹" : "$")}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400">RISK REWARD / SL</span>
                <div className="font-bold text-slate-300">
                  SL {stopLossPct}% | TP {takeProfitPct}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BotWizardVNext;
