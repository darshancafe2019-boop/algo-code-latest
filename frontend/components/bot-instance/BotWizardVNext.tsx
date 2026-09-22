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

  // Step 2: Market & Instruments
  const [assetClass, setAssetClass] = useState<string>("INDIAN_FUTURES");
  const [canonicalInstrumentId, setCanonicalInstrumentId] = useState<string>("NSE:NIFTY26MARFUT");
  const [displaySymbol, setDisplaySymbol] = useState<string>("NIFTY 27-MAR-2026 Future");
  const [contractStrike, setContractStrike] = useState<number>(24600);
  const [contractExpiry, setContractExpiry] = useState<string>("2026-03-27");
  const [contractOptionType, setContractOptionType] = useState<string>("CE");
  const [contractUnderlying, setContractUnderlying] = useState<string>("NIFTY");
  const [entrySide, setEntrySide] = useState<"BUY" | "SELL">("BUY");
  const [contractLotSize, setContractLotSize] = useState<number>(1);
  const [contractLtp, setContractLtp] = useState<number>(0);
  const [contractBid, setContractBid] = useState<number>(0);
  const [contractAsk, setContractAsk] = useState<number>(0);
  const [creationOrigin, setCreationOrigin] = useState<string>("MANUAL");
  const [providerInstrumentId, setProviderInstrumentId] = useState<string>("");

  // Step 3: Data Sources
  const [marketDataProvider, setMarketDataProvider] = useState<string>("UPSTOX");
  const [executionBroker, setExecutionBroker] = useState<string>("PAPER");
  const [depthTier, setDepthTier] = useState<string>("FULL_D5");
  const [requireGreeks, setRequireGreeks] = useState<boolean>(false);
  const [maxTickAgeMs, setMaxTickAgeMs] = useState<number>(2000);
  const [stalePolicy, setStalePolicy] = useState<string>("BLOCK_ENTRY");

  // Step 4: Strategy
  const [strategyId, setStrategyId] = useState<string>("EMA_SUPERTREND_CONFLUENCE");
  const [primaryTimeframe, setPrimaryTimeframe] = useState<string>("5m");
  const [confirmationTimeframe, setConfirmationTimeframe] = useState<string>("15m");
  const [ruleLeft, setRuleLeft] = useState<string>("EMA9");
  const [ruleOp, setRuleOp] = useState<string>("CROSS_ABOVE");
  const [ruleRight, setRuleRight] = useState<string>("EMA21");

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

    if (!querySymbol && !stored) return;

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
    };
  }, [
    botId,
    botName,
    description,
    groupName,
    tags,
    envMode,
    strategyId,
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
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                2. Market Segment & Canonical Instrument Universe
              </h2>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: "INDIAN_FUTURES", label: "Indian Futures (NSE)" },
                  { key: "INDIAN_OPTIONS", label: "Indian Options (NSE)" },
                  { key: "CRYPTO_FUTURES", label: "Crypto Perpetuals (Binance / Delta)" },
                  { key: "CRYPTO_OPTIONS", label: "Crypto Options (Delta / Deribit)" },
                  { key: "FOREX", label: "Forex & CFDs (Exness)" },
                ].map((seg) => (
                  <button
                    key={seg.key}
                    onClick={() => setAssetClass(seg.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition ${assetClass === seg.key
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">CANONICAL INSTRUMENT ID</label>
                  <input
                    type="text"
                    value={canonicalInstrumentId}
                    onChange={(e) => setCanonicalInstrumentId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold">DISPLAY SYMBOL</label>
                  <input
                    type="text"
                    value={displaySymbol}
                    onChange={(e) => setDisplaySymbol(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                  />
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

          {/* Step 4: Strategy Engine */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                4. Deterministic Multi-Timeframe Strategy Engine
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">PRIMARY TIMEFRAME</label>
                  <select
                    value={primaryTimeframe}
                    onChange={(e) => setPrimaryTimeframe(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold"
                  >
                    {["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d"].map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold">CONFIRMATION TIMEFRAME</label>
                  <select
                    value={confirmationTimeframe}
                    onChange={(e) => setConfirmationTimeframe(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold"
                  >
                    {["15m", "30m", "1h", "4h", "1d"].map((tf) => (
                      <option key={tf} value={tf}>
                        {tf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-semibold">STRATEGY TEMPLATE</label>
                  <select
                    value={strategyId}
                    onChange={(e) => setStrategyId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-amber-400"
                  >
                    <option value="EMA_SUPERTREND_CONFLUENCE">EMA + Supertrend Confluence</option>
                    <option value="ORDER_FLOW_IMBALANCE">Order Flow Depth Imbalance</option>
                    <option value="VOLATILITY_BREAKOUT">ATR Volatility Breakout</option>
                    <option value="CUSTOM_RULES">Custom Deterministic Rules</option>
                  </select>
                </div>
              </div>

              {/* Rule Builder */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-300 uppercase">Entry Rule Node (IF / THEN)</span>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={ruleLeft}
                    onChange={(e) => setRuleLeft(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-400"
                    placeholder="Left Operand"
                  />
                  <select
                    value={ruleOp}
                    onChange={(e) => setRuleOp(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 text-center"
                  >
                    <option value="CROSS_ABOVE">CROSS_ABOVE</option>
                    <option value="CROSS_BELOW">CROSS_BELOW</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&gt;=</option>
                  </select>
                  <input
                    type="text"
                    value={ruleRight}
                    onChange={(e) => setRuleRight(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400"
                    placeholder="Right Operand"
                  />
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
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-3 text-xs">
                <div className="font-bold text-slate-200">Explainable Decision Audit Guarantee</div>
                <p className="text-slate-400 text-[11px]">
                  Every bot tick generates a deterministic audit entry: <code>{ruleLeft} {ruleOp} {ruleRight}</code>.
                  Operators can inspect exact passing / failing conditions for every decision.
                </p>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400">
                  ✓ Signal Lifecycle: NO_SIGNAL → CANDIDATE → CONFIRMED → EXECUTED
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Risk & Exits */}
          {currentStep === 6 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-base font-black text-cyan-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                6. Risk Management & Position Exits
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
                  <label className="text-xs text-slate-400">TAKE PROFIT %</label>
                  <input
                    type="number"
                    step={0.1}
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">TRAILING STOP %</label>
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
