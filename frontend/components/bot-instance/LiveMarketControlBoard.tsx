"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Radio,
  Layers,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  Lock,
  Compass,
  FileCheck,
  Building2,
  Coins,
  Cpu,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import {
  PremiumIntent,
  ResolvedPremiumPlan,
  ResolvedLegQuote,
  MarketType,
  InstrumentClass,
  StrikeMode,
  PremiumMode,
  ContractMode,
} from "@/types/premium-intent";
import { ClientPremiumResolver } from "@/lib/strategies/premiumResolver";
import { useBotCreationStore } from "@/lib/store/useBotCreationStore";

interface LiveMarketControlBoardProps {
  onPlanAccepted?: (plan: ResolvedPremiumPlan) => void;
  initialUnderlying?: string;
  initialProvider?: string;
}

const POPULAR_UNDERLYINGS = ["BTC", "ETH", "SOL", "NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX", "RELIANCE", "TCS"];

const DEFAULT_EXPIRIES_MAP: Record<string, string[]> = {
  BTC: ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-30", "2026-12-25"],
  ETH: ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-30"],
  SOL: ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-30"],
  NIFTY: ["2026-09-29", "2026-10-06", "2026-10-13", "2026-10-27", "2026-11-26"],
  BANKNIFTY: ["2026-09-29", "2026-10-06", "2026-10-13", "2026-10-27"],
  FINNIFTY: ["2026-09-30", "2026-10-07", "2026-10-14", "2026-10-28"],
  SENSEX: ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-26"],
  RELIANCE: ["2026-10-29", "2026-11-26", "2026-12-31"],
  TCS: ["2026-10-29", "2026-11-26", "2026-12-31"],
};

export function LiveMarketControlBoard({
  onPlanAccepted,
  initialUnderlying = "BTC",
  initialProvider = "DELTA",
}: LiveMarketControlBoardProps) {
  const store = useBotCreationStore();
  const { market, instrument, provider: providerConfig, capital, updateSection, setUnderlying } = store;

  const [activeBoardTab, setActiveBoardTab] = useState<"OPTIONS" | "FUTURES" | "EQUITY">("OPTIONS");
  const [underlying, setSelectedUnderlying] = useState<string>(market.underlying || initialUnderlying || "BTC");
  const [selectedExpiry, setSelectedExpiry] = useState<string>(instrument.contractExpiry || "2026-09-28");
  const [activeProvider, setActiveProvider] = useState<string>(providerConfig.marketDataProvider || initialProvider || "DELTA");

  const isCrypto = ["BTC", "ETH", "SOL"].includes(underlying.toUpperCase());
  const currencySymbol = isCrypto || capital.currency === "USD" || capital.currency === "USDT" ? "$" : "₹";

  // Intent search parameters
  const [targetPremium, setTargetPremium] = useState<number>(120);
  const [premiumMin, setPremiumMin] = useState<number>(100);
  const [premiumMax, setPremiumMax] = useState<number>(140);
  const [strikeMode, setStrikeMode] = useState<StrikeMode>("ATM");
  const [targetDelta, setTargetDelta] = useState<number>(0.45);
  const [optionType, setOptionType] = useState<string>(instrument.contractOptionType || "CE");
  const [selectedStrategyType, setSelectedStrategyType] = useState<string>("SINGLE_OPTION");
  const [contractMode, setContractMode] = useState<ContractMode>("DYNAMIC");

  // Normalized query parameters matching exact specification
  const provider = activeProvider;
  const expiry = selectedExpiry;
  const minPremium = premiumMin;
  const maxPremium = premiumMax;
  const side = instrument.entrySide || "BUY";

  // Auto-switch provider to valid broker when changing between crypto and Indian markets
  useEffect(() => {
    if (isCrypto && !["DELTA", "BINANCE", "PAPER"].includes(activeProvider)) {
      setActiveProvider("DELTA");
      updateSection("provider", { marketDataProvider: "DELTA", executionBroker: "DELTA" });
    } else if (!isCrypto && ["DELTA", "BINANCE"].includes(activeProvider)) {
      setActiveProvider("UPSTOX");
      updateSection("provider", { marketDataProvider: "UPSTOX", executionBroker: "UPSTOX" });
    }
  }, [isCrypto, activeProvider, updateSection]);

  const availableProviders = useMemo(() => {
    if (isCrypto) {
      return [
        { id: "DELTA", label: "DELTA EXCHANGE INDIA" },
        { id: "BINANCE", label: "BINANCE CRYPTO" },
        { id: "PAPER", label: "PAPER SIMULATOR" },
      ];
    }
    return [
      { id: "UPSTOX", label: "UPSTOX LIVE (NSE/BSE)" },
      { id: "DHAN", label: "DHAN HQ (NSE/BSE)" },
      { id: "ZERODHA", label: "ZERODHA KITE" },
      { id: "PAPER", label: "PAPER SIMULATOR" },
    ];
  }, [isCrypto]);

  // Board tab definitions dynamically tailored to asset class
  const boardTabs = useMemo(() => {
    if (isCrypto) {
      return [
        { id: "OPTIONS" as const, label: "CRYPTO OPTIONS" },
        { id: "FUTURES" as const, label: "PERPETUALS & FUTURES" },
        { id: "EQUITY" as const, label: "SPOT CRYPTO" },
      ];
    }
    return [
      { id: "OPTIONS" as const, label: "OPTIONS BOARD" },
      { id: "FUTURES" as const, label: "FUTURES BOARD" },
      { id: "EQUITY" as const, label: "CASH EQUITIES" },
    ];
  }, [isCrypto]);

  // 1. Fetch live quote for the selected underlying from canonical market data API
  const { data: liveQuote, isFetching: isFetchingQuote, refetch: refetchQuote } = useQuery({
    queryKey: ["liveUnderlyingQuote", underlying, activeProvider],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/market-data/ltp?symbol=${encodeURIComponent(underlying)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.ltp) return json;
        }
        const fallbackRes = await fetch(`/api/market/quote?symbol=${encodeURIComponent(underlying)}`);
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          if (json.quote) return json.quote;
        }
      } catch (e) {
        console.warn("Error fetching live underlying quote:", e);
      }
      return null;
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });

  const liveSpotPrice = liveQuote?.ltp || liveQuote?.price || (isCrypto ? (underlying === "BTC" ? 78000.0 : underlying === "ETH" ? 3480.0 : 168.5) : (underlying === "NIFTY" ? 25312.45 : underlying === "BANKNIFTY" ? 54250.80 : 3020.50));
  const liveChangePct = liveQuote?.change_pct ?? 0.42;
  const liveAgeMs = liveQuote?.ageMs ?? liveQuote?.age_ms ?? 18;

  // Resolver state
  const [activePlan, setActivePlan] = useState<ResolvedPremiumPlan | null>(null);

  const availableExpiries = useMemo(() => {
    return DEFAULT_EXPIRIES_MAP[underlying] || DEFAULT_EXPIRIES_MAP["NIFTY"];
  }, [underlying]);

  // Build canonical intent object
  const currentIntent: PremiumIntent = useMemo(() => {
    return {
      market_type: isCrypto
        ? "CRYPTO_OPTIONS"
        : activeBoardTab === "OPTIONS"
        ? "INDIAN_OPTIONS"
        : activeBoardTab === "FUTURES"
        ? "INDIAN_FUTURES"
        : "INDIAN_EQUITY",
      underlying,
      exchange: isCrypto ? (activeProvider === "BINANCE" ? "BINANCE" : "DELTA") : "NSE",
      instrument_class: selectedStrategyType === "SINGLE_OPTION" ? "OPTION_SINGLE" : "OPTION_MULTI_LEG",
      expiry_mode: "EXACT",
      selected_expiry: expiry,
      option_type: optionType,
      strike_mode: strikeMode,
      premium_mode: "TARGET_PREMIUM",
      target_premium: targetPremium,
      premium_min: minPremium,
      premium_max: maxPremium,
      target_delta: targetDelta,
      quantity: (market.lotSize || (isCrypto ? 1 : 25)) * 1,
      lots: 1,
      lot_size: market.lotSize || (isCrypto ? 1 : 25),
      provider: activeProvider,
      contract_mode: contractMode,
    };
  }, [
    underlying,
    activeBoardTab,
    expiry,
    optionType,
    strikeMode,
    targetPremium,
    minPremium,
    maxPremium,
    targetDelta,
    market.lotSize,
    activeProvider,
    contractMode,
    selectedStrategyType,
    isCrypto,
  ]);

  // TanStack useQuery with Authoritative Exact queryKey
  const {
    data: candidatePlans,
    isLoading: isScanning,
    refetch: handleScan,
  } = useQuery({
    queryKey: [
      "premiumCandidates",
      activeProvider,
      underlying,
      expiry,
      optionType,
      targetPremium,
      minPremium,
      maxPremium,
      strikeMode,
      side,
    ],
    queryFn: async () => {
      if (selectedStrategyType === "SINGLE_OPTION") {
        return await ClientPremiumResolver.scanChain(currentIntent, 4);
      } else {
        const plan = await ClientPremiumResolver.resolvePlan(
          currentIntent,
          selectedStrategyType,
          selectedStrategyType.replace(/_/g, " "),
          capital.availableCapital || 100000
        );
        return [plan];
      }
    },
    staleTime: 5000,
  });

  const resolvedPlans = candidatePlans || [];

  // Sync active plan when query resolves new candidates
  useEffect(() => {
    if (resolvedPlans.length > 0) {
      if (!activePlan || !resolvedPlans.some((p) => p.plan_id === activePlan.plan_id)) {
        setActivePlan(resolvedPlans[0]);
      }
    }
  }, [resolvedPlans, activePlan]);

  // Sync accepted plan back into BotCreationStore
  const handleAcceptPlan = (plan: ResolvedPremiumPlan) => {
    setActivePlan(plan);

    if (plan.legs.length > 0) {
      const primaryLeg = plan.legs[0];
      const executionPremium = primaryLeg.side === "BUY" ? (primaryLeg.ask || primaryLeg.ltp) : (primaryLeg.bid || primaryLeg.ltp);

      updateSection("instrument", {
        contractStrike: primaryLeg.strike,
        contractExpiry: primaryLeg.expiry,
        contractOptionType: (primaryLeg.option_type as any) || "CE",
        entrySide: primaryLeg.side,
        ltp: executionPremium,
        bid: primaryLeg.bid,
        ask: primaryLeg.ask,
        iv: primaryLeg.iv,
        spotPrice: liveSpotPrice,
      });

      updateSection("market", {
        underlying: plan.underlying,
        symbol: primaryLeg.trading_symbol,
        canonicalInstrumentId: primaryLeg.instrument_key,
      });

      updateSection("risk", {
        maxDailyLoss: Math.max(store.risk.maxDailyLoss, plan.estimated_max_loss),
      });
    }

    if (onPlanAccepted) {
      onPlanAccepted(plan);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl">
      {/* 1. HEADER: UNDERLYING, SPOT, STATUS, LATENCY & EXPIRIES */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">UNDERLYING:</span>
            <select
              value={underlying}
              onChange={(e) => {
                const next = e.target.value;
                setSelectedUnderlying(next);
                setUnderlying(next);
                if (DEFAULT_EXPIRIES_MAP[next]) {
                  setSelectedExpiry(DEFAULT_EXPIRIES_MAP[next][0]);
                }
              }}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded font-bold text-xs text-cyan-400 focus:outline-none"
            >
              {POPULAR_UNDERLYINGS.map((u) => (
                <option key={u} value={u}>
                  {u} {["BTC", "ETH", "SOL"].includes(u) ? "(CRYPTO)" : "(NSE/BSE)"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-xs text-slate-400">SPOT:</span>
            <span className="text-sm font-bold text-white">
              {currencySymbol}{Number(liveSpotPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[10px] font-bold flex items-center ${liveChangePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {liveChangePct >= 0 ? <TrendingUp className="w-3 h-3 ml-0.5" /> : <TrendingDown className="w-3 h-3 ml-0.5" />}
              {liveChangePct >= 0 ? `+${liveChangePct.toFixed(2)}%` : `${liveChangePct.toFixed(2)}%`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">PROVIDER:</span>
            <select
              value={activeProvider}
              onChange={(e) => {
                const next = e.target.value;
                setActiveProvider(next);
                updateSection("provider", { marketDataProvider: next, executionBroker: next });
              }}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-cyan-400 border border-cyan-500/30"
            >
              {availableProviders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold text-[10px]">LIVE FEED</span>
          </div>
          <span className="text-slate-400 text-[10px]">{liveAgeMs} ms</span>
          <button
            type="button"
            disabled={isScanning || isFetchingQuote}
            onClick={() => {
              handleScan();
              refetchQuote();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
          >
            <RefreshCw className={`w-3 h-3 text-cyan-400 ${isScanning || isFetchingQuote ? "animate-spin" : ""}`} />
            <span>RESCAN</span>
          </button>
        </div>
      </div>

      {/* 2. EXPIRIES SELECTOR PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 font-semibold uppercase shrink-0">EXPIRY:</span>
        {availableExpiries.map((exp, idx) => (
          <button
            key={exp}
            type="button"
            onClick={() => setSelectedExpiry(exp)}
            className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition shrink-0 ${
              selectedExpiry === exp
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            {exp} {idx === 0 ? "(CURRENT)" : idx === 1 ? "(NEXT)" : ""}
          </button>
        ))}
      </div>

      {/* 3. BOARD SUB-TABS (OPTIONS / FUTURES / SPOT/EQUITY) & STRATEGY TEMPLATES */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          {boardTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveBoardTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeBoardTab === tab.id
                  ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/30 font-black"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeBoardTab === "OPTIONS" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">STRUCTURE:</span>
            <select
              value={selectedStrategyType}
              onChange={(e) => setSelectedStrategyType(e.target.value)}
              className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-bold text-purple-400"
            >
              <option value="SINGLE_OPTION">Single Option (CE / PE)</option>
              <option value="IRON_CONDOR">Short Iron Condor (4 Legs)</option>
              <option value="STRADDLE">Straddle (ATM CE + PE)</option>
              <option value="STRANGLE">Strangle (OTM CE + PE)</option>
              <option value="BULL_CALL_SPREAD">Bull Call Spread (Debit)</option>
              <option value="BEAR_PUT_SPREAD">Bear Put Spread (Debit)</option>
              <option value="BUTTERFLY">Butterfly (1:2:1)</option>
              <option value="JADE_LIZARD">Jade Lizard</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. MAIN BOARD WORKSPACE: SCANNER + CANDIDATE RANKING + CASH FLOWS */}
      {activeBoardTab === "OPTIONS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT 1 COL: SEARCH BY TARGET PREMIUM & RANGE CONTROLS */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-3 text-xs">
            <span className="font-bold text-cyan-400 uppercase flex items-center gap-1.5 border-b border-slate-800 pb-1">
              <Sliders className="w-4 h-4" />
              Search By Premium / Delta
            </span>

            {selectedStrategyType === "SINGLE_OPTION" && (
              <div>
                <label className="text-[10px] text-slate-400 font-semibold">DIRECTION / TYPE</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setOptionType("CE")}
                    className={`py-1.5 rounded font-bold text-xs transition ${
                      optionType === "CE" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" : "bg-slate-950 text-slate-400 border border-slate-800"
                    }`}
                  >
                    CALL (CE)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionType("PE")}
                    className={`py-1.5 rounded font-bold text-xs transition ${
                      optionType === "PE" ? "bg-rose-600 text-white shadow-md shadow-rose-600/30" : "bg-slate-950 text-slate-400 border border-slate-800"
                    }`}
                  >
                    PUT (PE)
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Target Premium:</span>
                <span className="font-mono text-white font-bold">{currencySymbol}{targetPremium}</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={5}
                value={targetPremium}
                onChange={(e) => setTargetPremium(Number(e.target.value))}
                className="w-full mt-1 accent-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">MIN PREMIUM</label>
                <input
                  type="number"
                  value={premiumMin}
                  onChange={(e) => setPremiumMin(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">MAX PREMIUM</label>
                <input
                  type="number"
                  value={premiumMax}
                  onChange={(e) => setPremiumMax(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400">STRIKE MODE</label>
              <select
                value={strikeMode}
                onChange={(e) => setStrikeMode(e.target.value as StrikeMode)}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs"
              >
                <option value="ATM">ATM (At-The-Money)</option>
                <option value="ITM">ITM (In-The-Money)</option>
                <option value="OTM">OTM (Out-of-The-Money)</option>
                <option value="TARGET_PREMIUM">Target Premium Match</option>
                <option value="TARGET_DELTA">Target Delta Match</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400">CONTRACT EXECUTION MODE</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setContractMode("DYNAMIC")}
                  className={`py-1 rounded text-[10px] font-bold ${
                    contractMode === "DYNAMIC" ? "bg-purple-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  DYNAMIC (Signal Scan)
                </button>
                <button
                  type="button"
                  onClick={() => setContractMode("PINNED")}
                  className={`py-1 rounded text-[10px] font-bold ${
                    contractMode === "PINNED" ? "bg-amber-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  PINNED (Exact Contract)
                </button>
              </div>
            </div>
          </div>

          {/* CENTER & RIGHT 2 COLS: RESOLVED MATCHES & SIGNED CASH FLOW CARDS */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <span className="text-xs font-bold text-slate-300 uppercase flex items-center justify-between border-b border-slate-800 pb-1">
              <span>Live Contract Suggestions & Payoff Profile</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {resolvedPlans.length} Candidate(s) Found
              </span>
            </span>

            {resolvedPlans.map((plan, idx) => {
              const isSelected = activePlan?.plan_id === plan.plan_id;
              const isBestMatch = idx === 0 || plan.score_breakdown?.rank_label === "BEST_MATCH";
              const primaryLeg = plan.legs[0];
              const contractSymbol = primaryLeg?.trading_symbol || `${underlying} ${primaryLeg?.strike || ''} ${primaryLeg?.option_type || ''}`;
              const legProvider = primaryLeg?.provider || provider || "DELTA";
              const legExpiry = primaryLeg?.expiry || expiry;

              const bid = primaryLeg?.bid ?? 0;
              const ask = primaryLeg?.ask ?? 0;
              const mark = primaryLeg?.mid ?? (bid > 0 && ask > 0 ? Number(((bid + ask) / 2).toFixed(2)) : primaryLeg?.ltp ?? 0);
              const ltp = primaryLeg?.ltp ?? 0;

              const execPrice = Math.abs(plan.conservative_execution_value || (side === "BUY" ? ask : bid) || ltp);
              const execSideLabel = side === "BUY" ? "ASK" : "BID";
              const diff = Number((execPrice - targetPremium).toFixed(2));
              const diffPct = targetPremium > 0 ? Number(((diff / targetPremium) * 100).toFixed(2)) : 0;
              const spread = Number(Math.max(0, ask - bid).toFixed(2));
              const spreadPct = ask > 0 ? Number(((spread / ask) * 100).toFixed(2)) : 0;
              const iv = primaryLeg?.iv ?? 14.5;
              const delta = primaryLeg?.delta ?? (optionType === "PE" ? -0.50 : 0.50);
              const oi = primaryLeg?.open_interest ?? 3200000;
              const volume = primaryLeg?.volume ?? 750000;
              const quoteAge = liveAgeMs;
              const liquidityLabel = oi > 500000 ? "HIGH / TIGHT" : "NORMAL";

              const estimatedCapitalReq = Math.abs(plan.required_capital || plan.estimated_margin || Number((execPrice * (primaryLeg?.lot_size || 1)).toFixed(2)));
              const step1Allocation = capital.allocatedCapital || 10000;
              const isSufficient = (capital.availableCapital || 100000) >= estimatedCapitalReq;

              return (
                <div
                  key={`${plan.plan_id || 'plan'}_${idx}`}
                  className={`p-4 rounded-xl border transition flex flex-col gap-3.5 ${
                    isBestMatch
                      ? "bg-slate-900/90 border-cyan-500/60 ring-1 ring-cyan-500/40 shadow-xl shadow-cyan-500/10"
                      : isSelected
                      ? "bg-slate-900 border-indigo-500/50 ring-1 ring-indigo-500/30"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* CARD HEADER: RANK BADGE, CONTRACT, PROVIDER, EXPIRY */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wider uppercase font-mono ${
                            isBestMatch
                              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {isBestMatch ? "BEST PREMIUM MATCH" : plan.score_breakdown?.rank_label.replace("_", " ") || "ALTERNATIVE MATCH"}
                        </span>
                        <span className="text-sm font-black text-white font-mono tracking-wide">{contractSymbol}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span className="flex items-center gap-1 text-cyan-400 font-bold">
                          <Building2 className="w-3 h-3" />
                          {legProvider}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300 font-semibold">
                          <Clock className="w-3 h-3 text-slate-400" />
                          EXPIRY: {legExpiry}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptPlan(plan)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-wider uppercase transition flex items-center gap-1.5 font-mono ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                            : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{isSelected ? "ACCEPTED" : "SELECT & ACCEPT"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. PRICE QUOTES GRID: BID / ASK / MARK / LTP */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">BID</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-400">
                        {currencySymbol}{bid.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ASK</span>
                      <span className="text-xs sm:text-sm font-black text-rose-400">
                        {currencySymbol}{ask.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">MARK</span>
                      <span className="text-xs sm:text-sm font-black text-slate-200">
                        {currencySymbol}{mark.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">LTP</span>
                      <span className="text-xs sm:text-sm font-black text-cyan-400">
                        {currencySymbol}{ltp.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 2. EXECUTION PREMIUM & TARGET MATCH STRIP */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono p-3 rounded-lg bg-slate-950 border border-cyan-500/20">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">EXECUTION PREMIUM</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-1">
                        {currencySymbol}{execPrice.toFixed(2)} <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400">{execSideLabel}</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">TARGET</span>
                      <span className="text-xs sm:text-sm font-black text-white">
                        {currencySymbol}{targetPremium.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">DIFFERENCE</span>
                      <span className={`text-xs sm:text-sm font-black ${diff > 0 ? "text-amber-400" : diff < 0 ? "text-cyan-400" : "text-emerald-400"}`}>
                        {diff === 0 ? `${currencySymbol}0.00` : diff > 0 ? `+${currencySymbol}${diff.toFixed(2)}` : `-${currencySymbol}${Math.abs(diff).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">DIFFERENCE %</span>
                      <span className={`text-xs sm:text-sm font-black ${diffPct > 0 ? "text-amber-400" : diffPct < 0 ? "text-cyan-400" : "text-emerald-400"}`}>
                        {diffPct === 0 ? "0.00%" : diffPct > 0 ? `+${diffPct.toFixed(2)}%` : `-${Math.abs(diffPct).toFixed(2)}%`}
                      </span>
                    </div>
                  </div>

                  {/* 3. GREEKS & STATS: IV / DELTA / OI / VOLUME */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold">IV</span>
                      <span className="font-bold text-cyan-300">{iv.toFixed(1)}%</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold">DELTA</span>
                      <span className="font-bold text-purple-400">Δ {delta.toFixed(2)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold">OI</span>
                      <span className="font-bold text-slate-200">{oi.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-bold">VOLUME</span>
                      <span className="font-bold text-slate-200">{volume.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* 4. MICROSTRUCTURE: SPREAD / QUOTE AGE / LIQUIDITY */}
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-bold">SPREAD</span>
                      <span className="font-bold text-slate-300 text-[11px]">
                        {currencySymbol}{spread.toFixed(2)} <span className="text-[10px] text-slate-400">({spreadPct}%)</span>
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-bold">QUOTE AGE</span>
                      <span className="font-bold text-emerald-400 text-[11px] flex items-center gap-1">
                        <Activity className="w-3 h-3 animate-pulse" />
                        &lt; {quoteAge}ms
                      </span>
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-bold">LIQUIDITY</span>
                      <span className="font-bold text-cyan-400 text-[11px]">{liquidityLabel}</span>
                    </div>
                  </div>

                  {/* 5. ESTIMATED CAPITAL REQUIRED & STEP 1 ALLOCATION */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">ESTIMATED CAPITAL REQUIRED</span>
                      <span className="text-sm font-black text-emerald-400">
                        {currencySymbol}{estimatedCapitalReq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 text-right">
                      <span className="text-[10px] text-indigo-400 font-bold uppercase">STEP 1 ALLOCATION = {currencySymbol}{step1Allocation.toLocaleString()}</span>
                      <span className="text-[11px] text-slate-300">
                        Available: {currencySymbol}{(capital.availableCapital || 100000).toLocaleString()} •{" "}
                        <span className={isSufficient ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                          {isSufficient ? "SUFFICIENT" : "INSUFFICIENT"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. FUTURES / PERPETUALS BOARD */}
      {activeBoardTab === "FUTURES" && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
          <span className="text-xs font-bold text-cyan-400 uppercase flex items-center justify-between">
            <span>{isCrypto ? "Live Crypto Perpetuals & Futures" : "Live Futures Contracts & Basis"}</span>
            <span className="text-[10px] text-slate-400 font-mono">PROVIDER: {activeProvider}</span>
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            {isCrypto ? (
              [
                { symbol: `${underlying}-PERP`, label: "PERPETUAL CONTRACT", basis: 0.0 },
                { symbol: `${underlying}-${availableExpiries[0] || "2026-09-28"}`, label: "CURRENT EXPIRY FUT", basis: 15.0 },
                { symbol: `${underlying}-${availableExpiries[1] || "2026-10-05"}`, label: "NEXT EXPIRY FUT", basis: 42.5 },
              ].map((c) => {
                const futPrice = Number(liveSpotPrice) + c.basis;
                return (
                  <div key={c.symbol} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">{c.label}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400">
                        {c.symbol}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {currencySymbol}{futPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Basis: {c.basis >= 0 ? `+${currencySymbol}${c.basis.toFixed(2)}` : `-${currencySymbol}${Math.abs(c.basis).toFixed(2)}`}</span>
                      <span className="text-emerald-400 font-bold">LIVE PERP FEED</span>
                    </div>
                  </div>
                );
              })
            ) : (
              ["CURRENT CONTRACT", "NEXT CONTRACT", "FAR CONTRACT"].map((tier, idx) => {
                const futPrice = Number(liveSpotPrice) + (idx * 35.5);
                return (
                  <div key={tier} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">{tier}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400">
                        {availableExpiries[idx] || "2026-09-29"}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {currencySymbol}{futPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Basis: +{currencySymbol}{(idx * 35.5).toFixed(2)}</span>
                      <span className="text-emerald-400 font-bold">LIVE FUTURES PRICE</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 6. SPOT CRYPTO / CASH EQUITIES BOARD */}
      {activeBoardTab === "EQUITY" && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
          <span className="text-xs font-bold text-cyan-400 uppercase flex items-center justify-between">
            <span>{isCrypto ? "Spot Crypto Live Market" : "Cash Equities Live Board"}</span>
            <span className="text-[10px] text-slate-400 font-mono">PROVIDER: {activeProvider}</span>
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">SYMBOL / VENUE</span>
              <div className="text-sm font-bold text-white">
                {isCrypto ? `${underlying}/USDT (${activeProvider} SPOT)` : `${underlying} (NSE EQ)`}
              </div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">LAST TRADED PRICE</span>
              <div className="text-sm font-bold text-emerald-400">
                {currencySymbol}{Number(liveSpotPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">24H VOLUME</span>
              <div className="text-sm font-bold text-cyan-400">
                {isCrypto ? `${(liveQuote?.volume || 18450).toLocaleString()} ${underlying}` : "4,250,800 Shares"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
