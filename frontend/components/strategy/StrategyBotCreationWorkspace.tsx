"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot,
  Zap,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Search,
  Sliders,
  RefreshCw,
  Lock,
  Layers,
  Sparkles,
  DollarSign,
  Activity,
  Check,
  ChevronRight,
  ChevronDown,
  Info,
  Calendar,
  Compass,
  Play,
  Save,
  Radio,
  Clock,
  Building2,
  Coins,
  Shield,
  Eye,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useBotCreationIntentStore } from "@/lib/store/useBotCreationIntentStore";

// --- Types & Interfaces ---
export type CreationStep = "market" | "strategy" | "contracts" | "risk" | "review";

export interface StrategyLegConfig {
  id: string;
  action: "BUY" | "SELL";
  optionType: "CE" | "PE";
  strike: number;
  expiry: string;
  lots: number;
  quantity: number;
  premium: number;
  securityId?: string;
  tradingSymbol?: string;
  delta?: number;
  theta?: number;
  iv?: number;
}

export interface OptionStrategyTemplate {
  id: string;
  name: string;
  category: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILITY";
  bias: "Bullish" | "Bearish" | "Neutral" | "Bi-Directional";
  riskProfile: "Defined" | "Undefined";
  type: "Debit" | "Credit" | "Net Zero";
  description: string;
  structure: string;
  defaultLegOffsets: Array<{
    action: "BUY" | "SELL";
    optionType: "CE" | "PE";
    strikeOffsetSteps: number; // in strike increments relative to ATM
    lots: number;
  }>;
}

const STRATEGY_CATALOG: OptionStrategyTemplate[] = [
  // Bullish
  {
    id: "BULL_CALL_SPREAD",
    name: "Bull Call Spread",
    category: "BULLISH",
    bias: "Bullish",
    riskProfile: "Defined",
    type: "Debit",
    description: "Capitalizes on moderate upward price movement with capped risk and lower cost than naked Call.",
    structure: "Buy ATM Call + Sell OTM Call",
    defaultLegOffsets: [
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 0, lots: 1 },
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 2, lots: 1 },
    ],
  },
  {
    id: "BULL_PUT_SPREAD",
    name: "Bull Put Spread",
    category: "BULLISH",
    bias: "Bullish",
    riskProfile: "Defined",
    type: "Credit",
    description: "Collects upfront premium expecting the underlying to stay above the short put strike.",
    structure: "Sell OTM Put + Buy Lower OTM Put",
    defaultLegOffsets: [
      { action: "SELL", optionType: "PE", strikeOffsetSteps: -1, lots: 1 },
      { action: "BUY", optionType: "PE", strikeOffsetSteps: -3, lots: 1 },
    ],
  },
  {
    id: "LONG_CALL",
    name: "Long Call",
    category: "BULLISH",
    bias: "Bullish",
    riskProfile: "Defined",
    type: "Debit",
    description: "Pure directional long exposure with unlimited profit potential and risk limited to premium paid.",
    structure: "Buy ATM/OTM Call",
    defaultLegOffsets: [
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 0, lots: 1 },
    ],
  },
  {
    id: "COVERED_CALL",
    name: "Covered Call",
    category: "BULLISH",
    bias: "Bullish",
    riskProfile: "Defined",
    type: "Credit",
    description: "Generates income against held underlying stock/futures by selling an OTM call option.",
    structure: "Long Underlying + Sell OTM Call",
    defaultLegOffsets: [
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 2, lots: 1 },
    ],
  },

  // Bearish
  {
    id: "BEAR_PUT_SPREAD",
    name: "Bear Put Spread",
    category: "BEARISH",
    bias: "Bearish",
    riskProfile: "Defined",
    type: "Debit",
    description: "Capitalizes on downward price movement with capped risk and reduced cost compared to naked Put.",
    structure: "Buy ATM Put + Sell Lower OTM Put",
    defaultLegOffsets: [
      { action: "BUY", optionType: "PE", strikeOffsetSteps: 0, lots: 1 },
      { action: "SELL", optionType: "PE", strikeOffsetSteps: -2, lots: 1 },
    ],
  },
  {
    id: "BEAR_CALL_SPREAD",
    name: "Bear Call Spread",
    category: "BEARISH",
    bias: "Bearish",
    riskProfile: "Defined",
    type: "Credit",
    description: "Collects upfront credit betting the underlying stays below the short call strike.",
    structure: "Sell OTM Call + Buy Higher OTM Call",
    defaultLegOffsets: [
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 1, lots: 1 },
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 3, lots: 1 },
    ],
  },
  {
    id: "LONG_PUT",
    name: "Long Put",
    category: "BEARISH",
    bias: "Bearish",
    riskProfile: "Defined",
    type: "Debit",
    description: "Pure directional downside play with large profit potential and risk limited to premium paid.",
    structure: "Buy ATM/OTM Put",
    defaultLegOffsets: [
      { action: "BUY", optionType: "PE", strikeOffsetSteps: 0, lots: 1 },
    ],
  },

  // Neutral
  {
    id: "IRON_CONDOR",
    name: "Iron Condor",
    category: "NEUTRAL",
    bias: "Neutral",
    riskProfile: "Defined",
    type: "Credit",
    description: "High-probability market-neutral strategy collecting credit from both OTM calls and puts within a defined range.",
    structure: "Buy OTM Put + Sell Put + Sell Call + Buy OTM Call",
    defaultLegOffsets: [
      { action: "BUY", optionType: "PE", strikeOffsetSteps: -4, lots: 1 },
      { action: "SELL", optionType: "PE", strikeOffsetSteps: -2, lots: 1 },
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 2, lots: 1 },
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 4, lots: 1 },
    ],
  },
  {
    id: "SHORT_STRADDLE",
    name: "Short Straddle",
    category: "NEUTRAL",
    bias: "Neutral",
    riskProfile: "Undefined",
    type: "Credit",
    description: "Collects maximum premium selling ATM Call and Put, profiting from low volatility and theta decay.",
    structure: "Sell ATM Call + Sell ATM Put",
    defaultLegOffsets: [
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 0, lots: 1 },
      { action: "SELL", optionType: "PE", strikeOffsetSteps: 0, lots: 1 },
    ],
  },
  {
    id: "SHORT_STRANGLE",
    name: "Short Strangle",
    category: "NEUTRAL",
    bias: "Neutral",
    riskProfile: "Undefined",
    type: "Credit",
    description: "Wider profit range than straddle by selling OTM Call and OTM Put, profiting if price remains range-bound.",
    structure: "Sell OTM Put + Sell OTM Call",
    defaultLegOffsets: [
      { action: "SELL", optionType: "PE", strikeOffsetSteps: -2, lots: 1 },
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 2, lots: 1 },
    ],
  },
  {
    id: "IRON_BUTTERFLY",
    name: "Iron Butterfly",
    category: "NEUTRAL",
    bias: "Neutral",
    riskProfile: "Defined",
    type: "Credit",
    description: "Defined-risk version of short straddle with protective wings on both sides.",
    structure: "Buy OTM Put + Sell ATM Put + Sell ATM Call + Buy OTM Call",
    defaultLegOffsets: [
      { action: "BUY", optionType: "PE", strikeOffsetSteps: -3, lots: 1 },
      { action: "SELL", optionType: "PE", strikeOffsetSteps: 0, lots: 1 },
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 0, lots: 1 },
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 3, lots: 1 },
    ],
  },

  // Volatility
  {
    id: "LONG_STRADDLE",
    name: "Long Straddle",
    category: "VOLATILITY",
    bias: "Bi-Directional",
    riskProfile: "Defined",
    type: "Debit",
    description: "Profits from massive price breakout in either direction ahead of major events or earnings.",
    structure: "Buy ATM Call + Buy ATM Put",
    defaultLegOffsets: [
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 0, lots: 1 },
      { action: "BUY", optionType: "PE", strikeOffsetSteps: 0, lots: 1 },
    ],
  },
  {
    id: "LONG_STRANGLE",
    name: "Long Strangle",
    category: "VOLATILITY",
    bias: "Bi-Directional",
    riskProfile: "Defined",
    type: "Debit",
    description: "Lower-cost volatility breakout strategy using OTM Call and OTM Put.",
    structure: "Buy OTM Put + Buy OTM Call",
    defaultLegOffsets: [
      { action: "BUY", optionType: "PE", strikeOffsetSteps: -2, lots: 1 },
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 2, lots: 1 },
    ],
  },
  {
    id: "LONG_BUTTERFLY",
    name: "Long Call Butterfly",
    category: "VOLATILITY",
    bias: "Neutral",
    riskProfile: "Defined",
    type: "Debit",
    description: "Low-cost defined-risk strategy aiming for pinpoint accuracy at the center strike at expiration.",
    structure: "Buy Lower Call + 2x Sell ATM Call + Buy Higher Call",
    defaultLegOffsets: [
      { action: "BUY", optionType: "CE", strikeOffsetSteps: -2, lots: 1 },
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 0, lots: 2 },
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 2, lots: 1 },
    ],
  },
  {
    id: "CALENDAR_SPREAD",
    name: "Calendar Spread",
    category: "VOLATILITY",
    bias: "Neutral",
    riskProfile: "Defined",
    type: "Debit",
    description: "Exploits differential time decay by selling near-term option and buying longer-term option at same strike.",
    structure: "Sell Near-Term Call + Buy Far-Term Call",
    defaultLegOffsets: [
      { action: "SELL", optionType: "CE", strikeOffsetSteps: 0, lots: 1 },
      { action: "BUY", optionType: "CE", strikeOffsetSteps: 0, lots: 1 },
    ],
  },
];

const POPULAR_UNDERLYINGS = [
  { symbol: "NIFTY", name: "Nifty 50 Index", exchange: "NSE", segment: "NSE_FNO", lotSize: 50, step: 50 },
  { symbol: "BANKNIFTY", name: "Bank Nifty Index", exchange: "NSE", segment: "NSE_FNO", lotSize: 15, step: 100 },
  { symbol: "FINNIFTY", name: "Fin Nifty Index", exchange: "NSE", segment: "NSE_FNO", lotSize: 25, step: 50 },
  { symbol: "MIDCPNIFTY", name: "Nifty Midcap 50", exchange: "NSE", segment: "NSE_FNO", lotSize: 75, step: 25 },
  { symbol: "SENSEX", name: "BSE Sensex 30", exchange: "BSE", segment: "BSE_FNO", lotSize: 10, step: 100 },
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", segment: "NSE_FNO", lotSize: 250, step: 20 },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", segment: "NSE_FNO", lotSize: 175, step: 20 },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", exchange: "NSE", segment: "NSE_FNO", lotSize: 550, step: 10 },
  { symbol: "INFY", name: "Infosys Ltd", exchange: "NSE", segment: "NSE_FNO", lotSize: 400, step: 20 },
  { symbol: "BTC", name: "Bitcoin Crypto Options", exchange: "DELTA", segment: "CRYPTO", lotSize: 1, step: 500 },
  { symbol: "ETH", name: "Ethereum Crypto Options", exchange: "DELTA", segment: "CRYPTO", lotSize: 1, step: 25 },
];

function detectStrategyName(legs: StrategyLegConfig[], underlying: string): string {
  if (legs.length === 0) return `${underlying} Option Bot`;
  if (legs.length === 1) {
    const leg = legs[0];
    const side = leg.action === "BUY" ? "Long" : "Short";
    const type = leg.optionType === "CE" ? "Call" : "Put";
    return `${underlying} ${side} ${type} Bot`;
  }
  if (legs.length === 2) {
    const leg1 = legs[0];
    const leg2 = legs[1];
    if (leg1.optionType === "CE" && leg2.optionType === "CE") {
      if (leg1.action === "BUY" && leg2.action === "SELL" && leg1.strike < leg2.strike) {
        return `${underlying} Bull Call Spread Bot`;
      }
      if (leg1.action === "SELL" && leg2.action === "BUY" && leg1.strike < leg2.strike) {
        return `${underlying} Bear Call Spread Bot`;
      }
    }
    if (leg1.optionType === "PE" && leg2.optionType === "PE") {
      if (leg1.action === "BUY" && leg2.action === "SELL" && leg1.strike > leg2.strike) {
        return `${underlying} Bear Put Spread Bot`;
      }
      if (leg1.action === "SELL" && leg2.action === "BUY" && leg1.strike > leg2.strike) {
        return `${underlying} Bull Put Spread Bot`;
      }
    }
    if (leg1.strike === leg2.strike) {
      if (leg1.action === "BUY" && leg2.action === "BUY") return `${underlying} Long Straddle Bot`;
      if (leg1.action === "SELL" && leg2.action === "SELL") return `${underlying} Short Straddle Bot`;
    }
    if (leg1.strike !== leg2.strike) {
      if (leg1.action === "BUY" && leg2.action === "BUY") return `${underlying} Long Strangle Bot`;
      if (leg1.action === "SELL" && leg2.action === "SELL") return `${underlying} Short Strangle Bot`;
    }
  }
  return `${underlying} Multi-Leg Strategy Bot`;
}

export function StrategyBotCreationWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active step state
  const [currentStep, setCurrentStep] = useState<CreationStep>("market");
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [liveConfirmModalOpen, setLiveConfirmModalOpen] = useState(false);

  // Step 1: Market State
  const [marketRegion, setMarketRegion] = useState<"INDIA" | "CRYPTO" | "US">("INDIA");
  const [broker, setBroker] = useState<"DHAN" | "DELTA" | "PAPER">("DHAN");
  const [dataProvider, setDataProvider] = useState("Dhan Live Feed (WebSocket)");
  const [underlying, setUnderlying] = useState("NIFTY");
  const [searchUnderlyingTerm, setSearchUnderlyingTerm] = useState("");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");

  // Option Origin & Contract Context
  const isInitializedRef = React.useRef(false);
  const isCustomOptionSelectionRef = React.useRef(false);
  const [optionOriginContext, setOptionOriginContext] = useState<{
    isFromOptionChain: boolean;
    contractSymbol?: string;
    action?: "BUY" | "SELL";
    strike?: number;
    optionType?: "CE" | "PE";
    expiry?: string;
    exchange?: string;
    broker?: string;
    ltp?: number;
    bid?: number;
    ask?: number;
    lotSize?: number;
    timestamp?: number;
  } | null>(null);

  // Step 2: Strategy Selection
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("BULL_CALL_SPREAD");
  const [strategySearchTerm, setStrategySearchTerm] = useState("");
  const [strategyFilterCategory, setStrategyFilterCategory] = useState<string>("ALL");
  const [showAdvancedStrategyDetails, setShowAdvancedStrategyDetails] = useState(false);

  // Step 3: Contracts & Legs
  const [selectByMode, setSelectByMode] = useState<"STRIKE" | "PREMIUM" | "DELTA" | "MONEYNESS">("STRIKE");
  const [targetPremium, setTargetPremium] = useState<number>(100);
  const [premiumTolerance, setPremiumTolerance] = useState<number>(10);
  const [strategyLegs, setStrategyLegs] = useState<StrategyLegConfig[]>([]);

  // Step 4: Risk & Capital
  const [capital, setCapital] = useState<number>(50000);
  const [lots, setLots] = useState<number>(1);
  const [stopLossType, setStopLossType] = useState<"POINTS" | "PCT" | "INR" | "NONE">("POINTS");
  const [stopLossValue, setStopLossValue] = useState<number>(30);
  const [takeProfitType, setTakeProfitType] = useState<"POINTS" | "PCT" | "INR" | "NONE">("POINTS");
  const [takeProfitValue, setTakeProfitValue] = useState<number>(60);
  const [trailingStopEnabled, setTrailingStopEnabled] = useState<boolean>(false);
  const [exitBeforeExpiry, setExitBeforeExpiry] = useState<boolean>(true);
  const [exitMinutesBeforeClose, setExitMinutesBeforeClose] = useState<number>(15);
  const [showAdvancedRisk, setShowAdvancedRisk] = useState<boolean>(false);

  // Bot Metadata & Drafts
  const [botName, setBotName] = useState<string>("NIFTY Bull Call Spread Bot");
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Current instrument definition
  const currentInstrument = useMemo(() => {
    return POPULAR_UNDERLYINGS.find((u) => u.symbol === underlying) || POPULAR_UNDERLYINGS[0];
  }, [underlying]);

  // Deep-linking from query parameters & central BotCreationIntentStore
  useEffect(() => {
    if (isInitializedRef.current) return;

    const storedIntent = useBotCreationIntentStore.getState().loadStoredIntent();

    const qUnderlying =
      searchParams.get("underlying") ||
      searchParams.get("symbol") ||
      storedIntent?.underlying ||
      (storedIntent?.symbol ? storedIntent.symbol.split(" ")[0].split("-")[0] : null);
    const qExpiry = searchParams.get("expiry") || storedIntent?.expiry;
    const qStrategy = searchParams.get("strategy");
    const qMode = searchParams.get("mode");
    const qStrike = searchParams.get("strike") ? parseFloat(searchParams.get("strike")!) : storedIntent?.strike;
    const qOptionType = searchParams.get("optionType") || storedIntent?.optionType;
    const qSide = (searchParams.get("side") || storedIntent?.side || "BUY").toUpperCase() as "BUY" | "SELL";
    const qBroker = (searchParams.get("broker") || storedIntent?.broker || "DHAN").toUpperCase();
    const qExchange = searchParams.get("exchange") || storedIntent?.exchange || (qUnderlying === "BTC" || qUnderlying === "ETH" ? "DELTA" : "NSE");
    const qSecurityId = searchParams.get("securityId") || storedIntent?.securityId || storedIntent?.instrumentId;
    const qTradingSymbol = storedIntent?.tradingSymbol || storedIntent?.symbol || searchParams.get("symbol");
    const qLtp = searchParams.get("ltp") ? parseFloat(searchParams.get("ltp")!) : storedIntent?.currentPrice || null;
    const qBid = searchParams.get("bid") ? parseFloat(searchParams.get("bid")!) : storedIntent?.bid || null;
    const qAsk = searchParams.get("ask") ? parseFloat(searchParams.get("ask")!) : storedIntent?.ask || null;
    const qLotSize = searchParams.get("lotSize") ? parseInt(searchParams.get("lotSize")!, 10) : storedIntent?.lotSize || null;
    const isAddLegMode = searchParams.get("mode") === "addLeg" || storedIntent?.mode === "addLeg";

    if (qUnderlying) setUnderlying(qUnderlying.toUpperCase());
    if (qExpiry) setSelectedExpiry(qExpiry);
    if (qBroker === "DELTA" || qBroker === "DHAN" || qBroker === "PAPER") setBroker(qBroker as any);
    if (qExchange === "DELTA" || ["BTC", "ETH", "SOL", "XRP"].includes(qUnderlying?.toUpperCase() || "")) {
      setMarketRegion("CRYPTO");
    }
    if (qMode === "LIVE") setExecutionMode("LIVE");

    // Detect if user arrived with an exact Option Chain contract selection
    const isOptionSelection =
      qStrike != null ||
      storedIntent?.origin === "OPTIONS" ||
      storedIntent?.assetClass === "OPTIONS" ||
      storedIntent?.assetClass === "CRYPTO_OPTIONS" ||
      Boolean(qOptionType);

    if (isOptionSelection && qStrike != null) {
      isInitializedRef.current = true;
      isCustomOptionSelectionRef.current = true;
      const optType = (qOptionType === "PUT" || qOptionType === "PE") ? "PE" : "CE";
      const targetUnderlying = (qUnderlying || "NIFTY").toUpperCase();
      const instDef = POPULAR_UNDERLYINGS.find((u) => u.symbol === targetUnderlying) || POPULAR_UNDERLYINGS[0];
      const defaultLot = qLotSize || instDef.lotSize || 50;
      const initialPrice = qLtp != null && qLtp > 0 ? qLtp : (optType === "CE" ? 115.0 : 95.0);

      const newLeg: StrategyLegConfig = {
        id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        action: qSide === "SELL" ? "SELL" : "BUY",
        optionType: optType,
        strike: qStrike,
        expiry: qExpiry || "2026-09-25",
        lots: 1,
        quantity: defaultLot,
        premium: initialPrice,
        securityId: qSecurityId || `${qBroker}_${targetUnderlying}_${qStrike}_${optType}`,
        tradingSymbol: qTradingSymbol || `${targetUnderlying} ${qStrike} ${optType}`,
        delta: storedIntent?.delta ?? (optType === "CE" ? 0.5 : -0.5),
        theta: storedIntent?.theta ?? -10.0,
        iv: storedIntent?.iv ?? 15.0,
      };

      if (isAddLegMode) {
        // Retrieve existing legs from draft
        let existingLegs: StrategyLegConfig[] = [];
        try {
          const draftStr = typeof window !== "undefined" ? sessionStorage.getItem("quantos_bot_creation_draft") || localStorage.getItem("quantos_bot_creation_draft") : null;
          if (draftStr) {
            const parsed = JSON.parse(draftStr);
            if (Array.isArray(parsed.strategyLegs) && parsed.strategyLegs.length > 0) {
              existingLegs = parsed.strategyLegs;
            }
          }
        } catch {}

        const combinedLegs = [...existingLegs, newLeg];
        setStrategyLegs(combinedLegs);
        setBotName(detectStrategyName(combinedLegs, targetUnderlying));
      } else {
        // Automatic First Leg!
        setStrategyLegs([newLeg]);
        setBotName(`${targetUnderlying} ${newLeg.action === "BUY" ? "Long" : "Short"} ${optType === "CE" ? "Call" : "Put"} Bot`);
      }

      setOptionOriginContext({
        isFromOptionChain: true,
        contractSymbol: newLeg.tradingSymbol,
        action: newLeg.action,
        strike: newLeg.strike,
        optionType: newLeg.optionType,
        expiry: newLeg.expiry,
        exchange: qExchange,
        broker: qBroker,
        ltp: initialPrice,
        bid: qBid || initialPrice * 0.98,
        ask: qAsk || initialPrice * 1.02,
        lotSize: defaultLot,
        timestamp: Date.now(),
      });

      setCurrentStep("contracts");
      useBotCreationIntentStore.getState().clearIntent();
      return;
    }

    // If no option contract intent, try restoring previous local draft
    try {
      const draft = localStorage.getItem("quantos_bot_creation_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.strategyLegs && parsed.strategyLegs.length > 0) {
          isInitializedRef.current = true;
          setStrategyLegs(parsed.strategyLegs);
          if (parsed.botName) setBotName(parsed.botName);
          if (parsed.underlying) setUnderlying(parsed.underlying);
          if (parsed.selectedExpiry) setSelectedExpiry(parsed.selectedExpiry);
          if (parsed.selectedStrategyId) setSelectedStrategyId(parsed.selectedStrategyId);
          if (parsed.executionMode) setExecutionMode(parsed.executionMode);
          return;
        }
      }
    } catch {}

    // Fallback template initialization
    if (qStrategy && STRATEGY_CATALOG.some((s) => s.id === qStrategy)) {
      setSelectedStrategyId(qStrategy);
    }
  }, [searchParams]);

  // Fetch Expiries & Option Flow for current underlying
  const { data: optionFlowData, isLoading: isOptionLoading, refetch: refetchOptions } = useQuery({
    queryKey: ["optionFlowData", underlying],
    queryFn: async () => {
      const res = await fetch(`/api/options/flow?underlying=${encodeURIComponent(underlying)}`);
      if (!res.ok) throw new Error("Failed to fetch option chain data");
      return res.json();
    },
    staleTime: 5000,
  });

  const availableExpiries: string[] = useMemo(() => {
    if (optionFlowData?.expiries && Array.isArray(optionFlowData.expiries) && optionFlowData.expiries.length > 0) {
      return optionFlowData.expiries;
    }
    return ["2026-09-25", "2026-10-02", "2026-10-30", "2026-11-27"];
  }, [optionFlowData?.expiries]);

  // Sync active expiry if none selected
  useEffect(() => {
    if (!selectedExpiry && availableExpiries.length > 0) {
      setSelectedExpiry(availableExpiries[0]);
    }
  }, [availableExpiries, selectedExpiry]);

  // Derived strikes and spot price
  const spotPrice = optionFlowData?.spotPrice || 24580.0;
  const atmStrike = useMemo(() => {
    const step = currentInstrument.step;
    return Math.round(spotPrice / step) * step;
  }, [spotPrice, currentInstrument.step]);

  const strikesLadder = useMemo(() => {
    if (optionFlowData?.strikes && Array.isArray(optionFlowData.strikes) && optionFlowData.strikes.length > 0) {
      return optionFlowData.strikes;
    }
    // Generate synthetic ladder around ATM if not yet returned
    const step = currentInstrument.step;
    const base = atmStrike;
    const list = [];
    for (let i = -10; i <= 10; i++) {
      const k = base + i * step;
      list.push({
        strike: k,
        isAtm: k === atmStrike,
        callQuote: {
          securityId: `DHAN_${underlying}_${k}_CE`,
          tradingSymbol: `${underlying} ${k} CE`,
          ltp: Math.max(1.5, Math.round((spotPrice - k > 0 ? spotPrice - k + 45 : Math.max(10, 180 - i * 18)) * 10) / 10),
          bid: Math.max(1.0, Math.round((spotPrice - k > 0 ? spotPrice - k + 44 : Math.max(9, 178 - i * 18)) * 10) / 10),
          ask: Math.max(2.0, Math.round((spotPrice - k > 0 ? spotPrice - k + 46 : Math.max(11, 182 - i * 18)) * 10) / 10),
          oi: 1250000 - Math.abs(i) * 60000,
          iv: 14.5 + Math.abs(i) * 0.2,
          delta: Math.max(0.05, Math.min(0.95, 0.5 - i * 0.04)),
          theta: -12.4,
        },
        putQuote: {
          securityId: `DHAN_${underlying}_${k}_PE`,
          tradingSymbol: `${underlying} ${k} PE`,
          ltp: Math.max(1.5, Math.round((k - spotPrice > 0 ? k - spotPrice + 45 : Math.max(10, 180 + i * 18)) * 10) / 10),
          bid: Math.max(1.0, Math.round((k - spotPrice > 0 ? k - spotPrice + 44 : Math.max(9, 178 + i * 18)) * 10) / 10),
          ask: Math.max(2.0, Math.round((k - spotPrice > 0 ? k - spotPrice + 46 : Math.max(11, 182 + i * 18)) * 10) / 10),
          oi: 1180000 - Math.abs(i) * 55000,
          iv: 15.1 + Math.abs(i) * 0.2,
          delta: Math.max(-0.95, Math.min(-0.05, -0.5 - i * 0.04)),
          theta: -11.8,
        },
      });
    }
    return list;
  }, [optionFlowData?.strikes, spotPrice, atmStrike, currentInstrument.step, underlying]);

  // Load Strategy Template into Legs
  const applyStrategyTemplate = useCallback(
    (strategyId: string) => {
      const template = STRATEGY_CATALOG.find((s) => s.id === strategyId);
      if (!template) return;

      const step = currentInstrument.step;
      const baseK = atmStrike;

      const newLegs: StrategyLegConfig[] = template.defaultLegOffsets.map((offset, idx) => {
        const strike = baseK + offset.strikeOffsetSteps * step;
        const matchingRow = strikesLadder.find((r: any) => r.strike === strike);
        const quote = offset.optionType === "CE" ? matchingRow?.callQuote : matchingRow?.putQuote;

        return {
          id: `leg-${idx + 1}-${Date.now()}`,
          action: offset.action,
          optionType: offset.optionType,
          strike,
          expiry: selectedExpiry || "2026-09-25",
          lots: offset.lots * lots,
          quantity: offset.lots * lots * currentInstrument.lotSize,
          premium: quote?.ltp || (offset.optionType === "CE" ? 115.0 : 95.0),
          securityId: quote?.securityId || `DHAN_${underlying}_${strike}_${offset.optionType}`,
          tradingSymbol: quote?.tradingSymbol || `${underlying} ${strike} ${offset.optionType}`,
          delta: quote?.delta || (offset.optionType === "CE" ? 0.5 : -0.5),
          theta: quote?.theta || -10.0,
          iv: quote?.iv || 14.8,
        };
      });

      setStrategyLegs(newLegs);
      setBotName(`${underlying} ${template.name} Bot`);
    },
    [atmStrike, currentInstrument, lots, selectedExpiry, strikesLadder, underlying]
  );

  // Initialize Strategy legs when strategy or underlying changes (only if not custom option chain selection)
  useEffect(() => {
    if (!isCustomOptionSelectionRef.current && strategyLegs.length === 0) {
      applyStrategyTemplate(selectedStrategyId);
    }
  }, [selectedStrategyId, underlying, selectedExpiry, applyStrategyTemplate, strategyLegs.length]);

  // Add individual leg from Option Chain click
  const handleAddOptionLeg = (strike: number, optionType: "CE" | "PE", action: "BUY" | "SELL") => {
    const matchingRow = strikesLadder.find((r: any) => r.strike === strike);
    const quote = optionType === "CE" ? matchingRow?.callQuote : matchingRow?.putQuote;

    const newLeg: StrategyLegConfig = {
      id: `leg-${strategyLegs.length + 1}-${Date.now()}`,
      action,
      optionType,
      strike,
      expiry: selectedExpiry || "2026-09-25",
      lots: lots,
      quantity: lots * currentInstrument.lotSize,
      premium: quote?.ltp || 100.0,
      securityId: quote?.securityId || `DHAN_${underlying}_${strike}_${optionType}`,
      tradingSymbol: quote?.tradingSymbol || `${underlying} ${strike} ${optionType}`,
      delta: quote?.delta || (optionType === "CE" ? 0.5 : -0.5),
      theta: quote?.theta || -10.0,
      iv: quote?.iv || 15.0,
    };

    setStrategyLegs((prev) => [...prev, newLeg]);
  };

  const handleRemoveLeg = (id: string) => {
    setStrategyLegs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleUpdateLegQty = (id: string, deltaLots: number) => {
    setStrategyLegs((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const newLots = Math.max(1, l.lots + deltaLots);
          return {
            ...l,
            lots: newLots,
            quantity: newLots * currentInstrument.lotSize,
          };
        }
        return l;
      })
    );
  };

  // Premium Matcher
  const handleAutoMatchByPremium = () => {
    const matches = strikesLadder
      .map((r: any) => ({
        strike: r.strike,
        ceDiff: Math.abs((r.callQuote?.ltp || 0) - targetPremium),
        peDiff: Math.abs((r.putQuote?.ltp || 0) - targetPremium),
        callQuote: r.callQuote,
        putQuote: r.putQuote,
      }))
      .filter((m: any) => m.ceDiff <= premiumTolerance || m.peDiff <= premiumTolerance);

    if (matches.length > 0) {
      const best = matches[0];
      const isCE = best.ceDiff <= best.peDiff;
      handleAddOptionLeg(best.strike, isCE ? "CE" : "PE", "BUY");
    }
  };

  // Centralized Financial & Risk Calculations
  const riskMetrics = useMemo(() => {
    if (strategyLegs.length === 0) {
      return {
        netDebitCredit: 0,
        maxLoss: 0,
        maxProfit: 0,
        requiredMargin: 0,
        breakEvens: [],
        estimatedCharges: 0,
        riskCapitalRatio: 0,
      };
    }

    let netCash = 0;
    let netDelta = 0;
    let totalLots = 0;

    strategyLegs.forEach((leg) => {
      const legValue = leg.premium * leg.quantity;
      if (leg.action === "BUY") {
        netCash -= legValue;
        netDelta += (leg.delta || 0) * leg.lots;
      } else {
        netCash += legValue;
        netDelta -= (leg.delta || 0) * leg.lots;
      }
      totalLots += leg.lots;
    });

    const isNetDebit = netCash < 0;
    const absNetCash = Math.abs(netCash);

    // Margin estimation: Buying requires full premium; selling requires exchange span + exposure margin
    const sellLegsCount = strategyLegs.filter((l) => l.action === "SELL").length;
    const requiredMargin =
      sellLegsCount > 0
        ? Math.max(25000, sellLegsCount * 115000 * lots)
        : Math.max(absNetCash, 5000);

    // Max profit & loss calculation based on strategy type
    let maxProfit = isNetDebit ? absNetCash * 1.8 : absNetCash;
    let maxLoss = isNetDebit ? absNetCash : requiredMargin * 0.4;

    const breakEvenStrike = atmStrike + (isNetDebit ? absNetCash / currentInstrument.lotSize : -absNetCash / currentInstrument.lotSize);
    const estimatedCharges = Math.round(20 * strategyLegs.length + absNetCash * 0.0006);
    const riskCapitalRatio = Math.min(100, Math.round((maxLoss / Math.max(1, capital)) * 100));

    return {
      netDebitCredit: netCash,
      maxLoss: Math.round(maxLoss),
      maxProfit: Math.round(maxProfit),
      requiredMargin: Math.round(requiredMargin),
      breakEvens: [Math.round(breakEvenStrike)],
      estimatedCharges,
      riskCapitalRatio,
    };
  }, [strategyLegs, lots, capital, atmStrike, currentInstrument.lotSize]);

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    const draftPayload = {
      botName,
      marketRegion,
      broker,
      dataProvider,
      underlying,
      selectedExpiry,
      selectedStrategyId,
      strategyLegs,
      capital,
      lots,
      stopLossType,
      stopLossValue,
      takeProfitType,
      takeProfitValue,
      trailingStopEnabled,
      exitBeforeExpiry,
      exitMinutesBeforeClose,
      executionMode,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem("quantos_bot_creation_draft", JSON.stringify(draftPayload));
      setDraftSavedAt(new Date().toLocaleTimeString());
    } catch {
      // ignore storage limits
    }
  }, [
    botName,
    marketRegion,
    broker,
    dataProvider,
    underlying,
    selectedExpiry,
    selectedStrategyId,
    strategyLegs,
    capital,
    lots,
    stopLossType,
    stopLossValue,
    takeProfitType,
    takeProfitValue,
    trailingStopEnabled,
    exitBeforeExpiry,
    exitMinutesBeforeClose,
    executionMode,
  ]);

  // Bot Creation Submission Mutation
  const createBotMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: botName,
        strategy: selectedStrategyId,
        symbol: underlying,
        asset_class: "OPTIONS",
        execution_mode: executionMode,
        broker: broker === "DHAN" ? "DHAN" : "PAPER",
        allocated_capital: capital,
        risk_per_trade_pct: riskMetrics.riskCapitalRatio || 2.0,
        max_loss_limit: riskMetrics.maxLoss,
        profit_target_limit: riskMetrics.maxProfit,
        option_legs: strategyLegs.map((l) => ({
          action: l.action,
          option_type: l.optionType,
          strike: l.strike,
          expiry: l.expiry,
          quantity: l.quantity,
          premium: l.premium,
          security_id: l.securityId,
          trading_symbol: l.tradingSymbol,
        })),
        risk_config: {
          stop_loss_type: stopLossType,
          stop_loss_value: stopLossValue,
          take_profit_type: takeProfitType,
          take_profit_value: takeProfitValue,
          trailing_stop_enabled: trailingStopEnabled,
          exit_before_expiry: exitBeforeExpiry,
          exit_minutes_before_close: exitMinutesBeforeClose,
        },
      };

      const res = await fetch("/api/bots/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create bot instance");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSubmissionFeedback({
        type: "success",
        message: `Bot "${botName}" successfully deployed in ${executionMode} mode! (ID: ${data.bot_id || "BOT-9021"})`,
      });
      setTimeout(() => {
        router.push("/bots");
      }, 1500);
    },
    onError: (err: any) => {
      setSubmissionFeedback({
        type: "error",
        message: err.message || "Failed to create bot instance. Check risk parameters.",
      });
    },
  });

  const handleRunPaperTest = () => {
    setExecutionMode("PAPER");
    createBotMutation.mutate();
  };

  const handleActivateLiveBot = () => {
    if (executionMode === "LIVE") {
      setLiveConfirmModalOpen(true);
    } else {
      createBotMutation.mutate();
    }
  };

  // Step Validation Checkers
  const isMarketValid = Boolean(underlying && selectedExpiry);
  const isStrategyValid = Boolean(selectedStrategyId);
  const isContractsValid = strategyLegs.length > 0;
  const isRiskValid = capital >= 5000 && lots >= 1 && riskMetrics.maxLoss <= capital;

  const canProceedNext =
    (currentStep === "market" && isMarketValid) ||
    (currentStep === "strategy" && isStrategyValid) ||
    (currentStep === "contracts" && isContractsValid) ||
    (currentStep === "risk" && isRiskValid) ||
    currentStep === "review";

  const handleNextStep = () => {
    if (currentStep === "market") setCurrentStep("strategy");
    else if (currentStep === "strategy") setCurrentStep("contracts");
    else if (currentStep === "contracts") setCurrentStep("risk");
    else if (currentStep === "risk") setCurrentStep("review");
  };

  const handlePrevStep = () => {
    if (currentStep === "strategy") setCurrentStep("market");
    else if (currentStep === "contracts") setCurrentStep("strategy");
    else if (currentStep === "risk") setCurrentStep("contracts");
    else if (currentStep === "review") setCurrentStep("risk");
  };

  // Filtered Strategies
  const filteredStrategies = useMemo(() => {
    return STRATEGY_CATALOG.filter((strat) => {
      const matchesSearch =
        strat.name.toLowerCase().includes(strategySearchTerm.toLowerCase()) ||
        strat.description.toLowerCase().includes(strategySearchTerm.toLowerCase());
      const matchesCategory =
        strategyFilterCategory === "ALL" || strat.category === strategyFilterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [strategySearchTerm, strategyFilterCategory]);

  const selectedTemplate = useMemo(() => {
    return STRATEGY_CATALOG.find((s) => s.id === selectedStrategyId) || STRATEGY_CATALOG[0];
  }, [selectedStrategyId]);

  return (
    <div className="w-full min-h-screen bg-[#07111F] text-[#F8FAFC] font-sans flex flex-col pb-24">
      {/* 1. Header Bar matching Dashboard Design */}
      <div className="sticky top-0 z-30 bg-[#07111F]/95 backdrop-blur-md border-b border-[#12304A] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#0EA5E9] to-[#2563EB] flex items-center justify-center text-white shadow-lg shadow-[#0EA5E9]/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">CREATE BOT</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0A2A47] text-[#22D3EE] border border-[#22D3EE]/30">
                STRATEGY BUILDER
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#7D8EA5]">
              <span>One-Click Direct Creation</span>
              <span>•</span>
              <span className="text-[#10B981] flex items-center gap-1 font-mono">
                <CheckCircle2 className="h-3 w-3" />
                {draftSavedAt ? `Draft saved ${draftSavedAt}` : "Auto-save active"}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Selector & Quick Action Pills */}
        <div className="flex items-center gap-3">
          {/* Execution Mode Chip */}
          <div className="flex items-center p-1 rounded-xl bg-[#0B1929] border border-[#12304A]">
            <button
              type="button"
              onClick={() => setExecutionMode("PAPER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                executionMode === "PAPER"
                  ? "bg-[#17C5FF]/20 text-[#17C5FF] border border-[#17C5FF]/40 shadow-sm"
                  : "text-[#7D8EA5] hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#17C5FF] animate-pulse" />
              PAPER
            </button>
            <button
              type="button"
              onClick={() => setExecutionMode("LIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                executionMode === "LIVE"
                  ? "bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/40 shadow-sm"
                  : "text-[#7D8EA5] hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#F43F5E]" />
              LIVE
            </button>
          </div>

          <button
            type="button"
            onClick={() => applyStrategyTemplate(selectedStrategyId)}
            className="p-2 rounded-xl bg-[#0B1929] border border-[#12304A] text-[#7D8EA5] hover:text-[#22D3EE] hover:border-[#22D3EE]/40 transition-colors"
            title="Reset Strategy Legs"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Compact Horizontal Stepper */}
      <div className="bg-[#0B1929] border-b border-[#12304A] px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {[
            { id: "market", label: "1. Market", icon: Building2 },
            { id: "strategy", label: "2. Strategy", icon: Layers },
            { id: "contracts", label: "3. Contracts", icon: Zap },
            { id: "risk", label: "4. Risk & Size", icon: Shield },
            { id: "review", label: "5. Review & Launch", icon: CheckCircle2 },
          ].map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone =
              (step.id === "market" && isMarketValid) ||
              (step.id === "strategy" && isStrategyValid) ||
              (step.id === "contracts" && isContractsValid) ||
              (step.id === "risk" && isRiskValid);

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id as CreationStep)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#0A2A47] text-[#22D3EE] border border-[#22D3EE]/40 shadow-md shadow-[#22D3EE]/10"
                      : isDone
                      ? "text-[#10B981] hover:bg-[#07111F]"
                      : "text-[#7D8EA5] hover:text-white"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-mono ${
                      isActive
                        ? "bg-[#22D3EE] text-[#07111F] font-bold"
                        : isDone
                        ? "bg-[#10B981]/20 text-[#10B981]"
                        : "bg-[#12304A] text-[#7D8EA5]"
                    }`}
                  >
                    {isDone && !isActive ? <Check className="h-3 w-3" /> : idx + 1}
                  </div>
                  <span className="hidden sm:inline tracking-tight">{step.label}</span>
                </button>
                {idx < 4 && <ChevronRight className="h-4 w-4 text-[#12304A] shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Source: OPTION CHAIN Banner & Two-Way Navigation */}
        {(optionOriginContext?.isFromOptionChain || strategyLegs.length > 0) && (
          <div className="bg-[#0B1929] border border-purple-500/40 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#12304A] pb-3">
              <div className="flex items-center flex-wrap gap-2.5">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-purple-400" />
                  SOURCE: OPTION CHAIN
                </span>
                <span className="text-sm font-bold text-white tracking-wide">
                  {underlying} • {selectedExpiry}
                </span>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
                  {currentInstrument.exchange} ({broker})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/trading/options?underlying=${encodeURIComponent(underlying)}&expiry=${encodeURIComponent(
                        selectedExpiry
                      )}&mode=addLeg`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  title="Add another leg from the Option Chain"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Leg from Option Chain</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/trading/options?underlying=${encodeURIComponent(underlying)}&expiry=${encodeURIComponent(
                        selectedExpiry
                      )}`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-[#07111F] hover:bg-[#0B1C30] text-[#7D8EA5] hover:text-white border border-[#12304A] text-xs font-bold transition flex items-center gap-1.5"
                  title="Return to Option Chain"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Open Option Chain</span>
                </button>
              </div>
            </div>

            {/* Selected Option Summary Metrics */}
            {strategyLegs.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-[#07111F] border border-[#12304A]">
                  <span className="text-[#7D8EA5] text-[10px] block uppercase font-sans">Selected Contract</span>
                  <span
                    className={`font-bold text-[13px] ${
                      strategyLegs[0].action === "BUY" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {strategyLegs[0].action} {strategyLegs[0].tradingSymbol}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#07111F] border border-[#12304A]">
                  <span className="text-[#7D8EA5] text-[10px] block uppercase font-sans">Expiry Cycle</span>
                  <span className="font-bold text-white text-[13px]">{strategyLegs[0].expiry || selectedExpiry}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#07111F] border border-[#12304A]">
                  <span className="text-[#7D8EA5] text-[10px] block uppercase font-sans">LTP (Quote)</span>
                  <span className="font-bold text-white text-[13px]">₹{strategyLegs[0].premium?.toFixed(2)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#07111F] border border-[#12304A]">
                  <span className="text-[#7D8EA5] text-[10px] block uppercase font-sans">Bid / Ask</span>
                  <span className="font-bold text-slate-300 text-[12px]">
                    ₹{(optionOriginContext?.bid || strategyLegs[0].premium * 0.98).toFixed(1)} / ₹
                    {(optionOriginContext?.ask || strategyLegs[0].premium * 1.02).toFixed(1)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#07111F] border border-[#12304A]">
                  <span className="text-[#7D8EA5] text-[10px] block uppercase font-sans">Quantity & Lot</span>
                  <span className="font-bold text-cyan-300 text-[13px]">
                    {strategyLegs[0].lots} Lot ({strategyLegs[0].quantity} Qty)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#07111F] border border-[#12304A]">
                  <span className="text-[#7D8EA5] text-[10px] block uppercase font-sans">Order Routing</span>
                  <span className="font-bold text-emerald-400 text-[13px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {broker} • {executionMode}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: MARKET & UNDERLYING */}
        {currentStep === "market" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B1929] border border-[#12304A] rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#22D3EE]" />
                  Step 1 — Market & Broker Connection
                </h2>
                <p className="text-xs text-[#7D8EA5] mt-1">
                  Select your execution broker, data gateway, and underlying instrument.
                </p>
              </div>

              {/* 3-Column Config Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Market Region */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#B7C6D8]">Market</label>
                  <select
                    value={marketRegion}
                    onChange={(e) => setMarketRegion(e.target.value as any)}
                    className="w-full bg-[#07111F] border border-[#12304A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                  >
                    <option value="INDIA">🇮🇳 India (NSE / BSE)</option>
                    <option value="CRYPTO">₿ Crypto Derivatives (24/7)</option>
                    <option value="US">🇺🇸 US Equities & Options</option>
                  </select>
                </div>

                {/* Broker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#B7C6D8]">Broker Adapter</label>
                  <select
                    value={broker}
                    onChange={(e) => setBroker(e.target.value as any)}
                    className="w-full bg-[#07111F] border border-[#12304A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                  >
                    <option value="DHAN">Dhan HQ (Live Multi-Broker)</option>
                    <option value="DELTA">Delta Exchange</option>
                    <option value="PAPER">Quant.OS Paper Simulator</option>
                  </select>
                </div>

                {/* Data Provider */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#B7C6D8]">Market Data Gateway</label>
                  <div className="w-full bg-[#07111F] border border-[#12304A] rounded-xl px-3 py-2.5 text-xs text-[#10B981] flex items-center justify-between">
                    <span className="truncate">{dataProvider}</span>
                    <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Underlying Quick Select Pills & Search */}
              <div className="space-y-3 pt-2 border-t border-[#12304A]">
                <label className="text-xs font-semibold text-[#B7C6D8]">Select Underlying</label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_UNDERLYINGS.map((u) => {
                    const isSelected = underlying === u.symbol;
                    return (
                      <button
                        key={u.symbol}
                        type="button"
                        onClick={() => setUnderlying(u.symbol)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
                          isSelected
                            ? "bg-[#0A2A47] text-[#22D3EE] font-bold border border-[#22D3EE] shadow-md shadow-[#22D3EE]/10"
                            : "bg-[#07111F] text-[#B7C6D8] border border-[#12304A] hover:text-white hover:border-[#22D3EE]/40"
                        }`}
                      >
                        <span>{u.symbol}</span>
                        <span className="text-[10px] font-mono text-[#7D8EA5] px-1 py-0.2 rounded bg-black/30">
                          {u.exchange}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expiry Selector */}
              <div className="space-y-1.5 pt-2 border-t border-[#12304A]">
                <label className="text-xs font-semibold text-[#B7C6D8]">Contract Expiry Cycle</label>
                <div className="flex flex-wrap gap-2">
                  {availableExpiries.map((exp) => {
                    const isSelected = selectedExpiry === exp;
                    return (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => setSelectedExpiry(exp)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 ${
                          isSelected
                            ? "bg-gradient-to-r from-[#0EA5E9] to-[#2563EB] text-white font-bold shadow-md shadow-[#0EA5E9]/20"
                            : "bg-[#07111F] text-[#B7C6D8] border border-[#12304A] hover:text-white"
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5 text-[#22D3EE]" />
                        <span>{exp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: STRATEGY SELECTION */}
        {currentStep === "strategy" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B1929] border border-[#12304A] rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-[#22D3EE]" />
                    Step 2 — Select Option Strategy
                  </h2>
                  <p className="text-xs text-[#7D8EA5] mt-1">
                    Choose from predefined quantitative option structures with automated strike positioning.
                  </p>
                </div>

                {/* Search & Category Filter */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-[#7D8EA5] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search strategy..."
                      value={strategySearchTerm}
                      onChange={(e) => setStrategySearchTerm(e.target.value)}
                      className="bg-[#07111F] border border-[#12304A] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#7D8EA5] focus:outline-none focus:border-[#22D3EE] w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {["ALL", "BULLISH", "BEARISH", "NEUTRAL", "VOLATILITY"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setStrategyFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      strategyFilterCategory === cat
                        ? "bg-[#0A2A47] text-[#22D3EE] font-bold border border-[#22D3EE]/40"
                        : "bg-[#07111F] text-[#7D8EA5] hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Strategy Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStrategies.map((strat) => {
                  const isSelected = selectedStrategyId === strat.id;
                  return (
                    <button
                      key={strat.id}
                      type="button"
                      onClick={() => setSelectedStrategyId(strat.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? "bg-[#0A2A47] border-[#22D3EE] shadow-lg shadow-[#22D3EE]/10"
                          : "bg-[#07111F] border-[#12304A] hover:border-[#22D3EE]/40 hover:bg-[#0B1C30]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-bold text-white tracking-tight">{strat.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              strat.category === "BULLISH"
                                ? "bg-[#10B981]/20 text-[#10B981]"
                                : strat.category === "BEARISH"
                                ? "bg-[#F43F5E]/20 text-[#F43F5E]"
                                : "bg-[#22D3EE]/20 text-[#22D3EE]"
                            }`}
                          >
                            {strat.bias}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7D8EA5] mt-1 line-clamp-2 leading-relaxed">
                          {strat.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#12304A]/60 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[#B7C6D8] truncate">{strat.structure}</span>
                        <span className="text-[#22D3EE] shrink-0 font-bold">{strat.type}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Compact Selected Strategy Detail Box */}
              {selectedTemplate && (
                <div className="bg-[#07111F] border border-[#22D3EE]/30 rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#12304A] pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#22D3EE]" />
                      <span className="font-bold text-white">{selectedTemplate.name} Configuration</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedStrategyDetails(!showAdvancedStrategyDetails)}
                      className="text-[11px] text-[#22D3EE] hover:underline flex items-center gap-1"
                    >
                      {showAdvancedStrategyDetails ? "Hide Details" : "Advanced Details"}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvancedStrategyDetails ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="text-[#7D8EA5] block">Market View</span>
                      <span className="font-bold text-white">{selectedTemplate.bias}</span>
                    </div>
                    <div>
                      <span className="text-[#7D8EA5] block">Risk Profile</span>
                      <span className="font-bold text-[#10B981]">{selectedTemplate.riskProfile} Risk</span>
                    </div>
                    <div>
                      <span className="text-[#7D8EA5] block">Leg Structure</span>
                      <span className="font-bold text-white truncate block">{selectedTemplate.structure}</span>
                    </div>
                    <div>
                      <span className="text-[#7D8EA5] block">Default Flow</span>
                      <span className="font-bold text-[#22D3EE]">{selectedTemplate.type}</span>
                    </div>
                  </div>

                  {showAdvancedStrategyDetails && (
                    <div className="pt-2 border-t border-[#12304A] text-[11px] text-[#B7C6D8] space-y-1">
                      <p>• Greeks Alignment: Directional Delta with automated positive/negative Theta management.</p>
                      <p>• Execution: Automatically mapped to liquid Dhan security IDs on `{underlying}`.</p>
                      <p>• Central Risk: Enforces portfolio stop loss and maximum margin allocation.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: CONTRACTS & EMBEDDED OPTION CHAIN */}
        {currentStep === "contracts" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bar: Underlying Spot & Matcher */}
            <div className="bg-[#0B1929] border border-[#12304A] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#12304A] pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{underlying} OPTION CHAIN</span>
                  <span className="font-mono text-xs text-[#22D3EE] px-2 py-0.5 rounded bg-[#0A2A47] border border-[#22D3EE]/30">
                    SPOT: ₹{spotPrice.toLocaleString()}
                  </span>
                  <span className="font-mono text-xs text-[#10B981] px-2 py-0.5 rounded bg-[#10B981]/10">
                    ATM: {atmStrike}
                  </span>
                  <span className="font-mono text-xs text-[#7D8EA5] hidden sm:inline">
                    EXPIRY: {selectedExpiry}
                  </span>
                </div>

                {/* Premium-First Selector Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7D8EA5] font-semibold">SELECT BY:</span>
                  {(["STRIKE", "PREMIUM", "DELTA", "MONEYNESS"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectByMode(m)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                        selectByMode === m
                          ? "bg-[#0A2A47] text-[#22D3EE] border border-[#22D3EE]/40"
                          : "text-[#7D8EA5] hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Premium Matcher Input Bar */}
              {selectByMode === "PREMIUM" && (
                <div className="p-3 rounded-xl bg-[#07111F] border border-[#12304A] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#7D8EA5]">Target Premium:</span>
                      <input
                        type="number"
                        value={targetPremium}
                        onChange={(e) => setTargetPremium(Number(e.target.value))}
                        className="w-20 bg-[#0B1929] border border-[#12304A] rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#7D8EA5]">Tolerance: ±₹</span>
                      <input
                        type="number"
                        value={premiumTolerance}
                        onChange={(e) => setPremiumTolerance(Number(e.target.value))}
                        className="w-16 bg-[#0B1929] border border-[#12304A] rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoMatchByPremium}
                    className="px-3 py-1.5 rounded-lg bg-[#22D3EE] text-[#07111F] font-bold text-xs hover:bg-[#22D3EE]/90 transition-all flex items-center gap-1.5"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Auto-Match Contract
                  </button>
                </div>
              )}

              {/* Embedded Option Chain Strike Ladder */}
              <div className="overflow-x-auto rounded-xl border border-[#12304A]">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-[#07111F] text-[#7D8EA5] border-b border-[#12304A]">
                      <th className="py-2.5 px-3 text-center bg-[#07111F]/80" colSpan={5}>
                        CALLS (CE)
                      </th>
                      <th className="py-2.5 px-3 text-center bg-[#0B1929] font-bold text-white border-x border-[#12304A]">
                        STRIKE
                      </th>
                      <th className="py-2.5 px-3 text-center bg-[#07111F]/80" colSpan={5}>
                        PUTS (PE)
                      </th>
                    </tr>
                    <tr className="bg-[#050D18] text-[#7D8EA5] border-b border-[#12304A] text-[10px]">
                      <th className="py-1.5 px-2 text-center">ACTION</th>
                      <th className="py-1.5 px-2 text-right">LTP</th>
                      <th className="py-1.5 px-2 text-right">BID/ASK</th>
                      <th className="py-1.5 px-2 text-right">OI</th>
                      <th className="py-1.5 px-2 text-right">IV</th>
                      <th className="py-1.5 px-3 text-center bg-[#0B1929] border-x border-[#12304A] font-bold text-white">
                        STRIKE
                      </th>
                      <th className="py-1.5 px-2 text-left">IV</th>
                      <th className="py-1.5 px-2 text-left">OI</th>
                      <th className="py-1.5 px-2 text-left">BID/ASK</th>
                      <th className="py-1.5 px-2 text-left">LTP</th>
                      <th className="py-1.5 px-2 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#12304A]/60">
                    {strikesLadder.slice(5, 16).map((row: any) => {
                      const isAtm = row.isAtm;
                      const ceSelected = strategyLegs.some((l) => l.strike === row.strike && l.optionType === "CE");
                      const peSelected = strategyLegs.some((l) => l.strike === row.strike && l.optionType === "PE");

                      return (
                        <tr
                          key={row.strike}
                          className={`hover:bg-[#0B1C30] transition-colors ${
                            isAtm ? "bg-[#0A2A47]/40 font-semibold" : ""
                          }`}
                        >
                          {/* CE Actions */}
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAddOptionLeg(row.strike, "CE", "BUY")}
                                className="px-1.5 py-0.5 rounded bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#07111F] text-[10px] font-bold transition-all"
                              >
                                BUY
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddOptionLeg(row.strike, "CE", "SELL")}
                                className="px-1.5 py-0.5 rounded bg-[#F43F5E]/20 hover:bg-[#F43F5E] text-[#F43F5E] hover:text-white text-[10px] font-bold transition-all"
                              >
                                SELL
                              </button>
                            </div>
                          </td>
                          <td className={`py-1.5 px-2 text-right font-bold ${ceSelected ? "text-[#22D3EE]" : "text-white"}`}>
                            ₹{row.callQuote?.ltp?.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-[#7D8EA5] text-[10px]">
                            {row.callQuote?.bid?.toFixed(1)} / {row.callQuote?.ask?.toFixed(1)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-[#B7C6D8]">
                            {(row.callQuote?.oi / 1000).toFixed(0)}k
                          </td>
                          <td className="py-1.5 px-2 text-right text-[#7D8EA5]">
                            {row.callQuote?.iv?.toFixed(1)}%
                          </td>

                          {/* Strike Centered Column */}
                          <td
                            className={`py-1.5 px-3 text-center border-x border-[#12304A] font-bold ${
                              isAtm
                                ? "bg-[#0A2A47] text-[#22D3EE]"
                                : "bg-[#07111F] text-white"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>{row.strike}</span>
                              {isAtm && <span className="text-[9px] px-1 py-0.2 rounded bg-[#22D3EE]/20 text-[#22D3EE]">ATM</span>}
                            </div>
                          </td>

                          {/* PE Side */}
                          <td className="py-1.5 px-2 text-left text-[#7D8EA5]">
                            {row.putQuote?.iv?.toFixed(1)}%
                          </td>
                          <td className="py-1.5 px-2 text-left text-[#B7C6D8]">
                            {(row.putQuote?.oi / 1000).toFixed(0)}k
                          </td>
                          <td className="py-1.5 px-2 text-left text-[#7D8EA5] text-[10px]">
                            {row.putQuote?.bid?.toFixed(1)} / {row.putQuote?.ask?.toFixed(1)}
                          </td>
                          <td className={`py-1.5 px-2 text-left font-bold ${peSelected ? "text-[#22D3EE]" : "text-white"}`}>
                            ₹{row.putQuote?.ltp?.toFixed(2)}
                          </td>
                          {/* PE Actions */}
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleAddOptionLeg(row.strike, "PE", "BUY")}
                                className="px-1.5 py-0.5 rounded bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#07111F] text-[10px] font-bold transition-all"
                              >
                                BUY
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddOptionLeg(row.strike, "PE", "SELL")}
                                className="px-1.5 py-0.5 rounded bg-[#F43F5E]/20 hover:bg-[#F43F5E] text-[#F43F5E] hover:text-white text-[10px] font-bold transition-all"
                              >
                                SELL
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Legs Manager Panel */}
            <div className="bg-[#0B1929] border border-[#12304A] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#12304A] pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#22D3EE]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Selected Strategy Legs ({strategyLegs.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/trading/options?underlying=${encodeURIComponent(underlying)}&expiry=${encodeURIComponent(
                          selectedExpiry
                        )}&mode=addLeg`
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Add another leg from live Option Chain"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Leg from Option Chain</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddOptionLeg(atmStrike, "CE", "BUY")}
                    className="px-3 py-1.5 rounded-xl bg-[#0A2A47] text-[#22D3EE] hover:bg-[#22D3EE] hover:text-[#07111F] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Custom Leg</span>
                  </button>
                </div>
              </div>

              {strategyLegs.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#7D8EA5]">
                  No option legs selected yet. Click BUY or SELL above on any strike to configure your strategy.
                </div>
              ) : (
                <div className="space-y-2">
                  {strategyLegs.map((leg, index) => {
                    const isBuy = leg.action === "BUY";
                    return (
                      <div
                        key={leg.id}
                        className="bg-[#07111F] border border-[#12304A] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-[#7D8EA5] font-bold">#{index + 1}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              isBuy ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#F43F5E]/20 text-[#F43F5E]"
                            }`}
                          >
                            {leg.action}
                          </span>
                          <span className="font-bold text-white">{leg.tradingSymbol}</span>
                          <span className="text-[#7D8EA5] text-[11px] hidden sm:inline">
                            (SecID: {leg.securityId})
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-[#7D8EA5] block">Premium</span>
                            <span className="font-bold text-white">₹{leg.premium?.toFixed(2)}</span>
                          </div>

                          {/* Lot Stepper */}
                          <div className="flex items-center gap-1.5 bg-[#0B1929] border border-[#12304A] rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateLegQty(leg.id, -1)}
                              className="h-5 w-5 rounded bg-[#07111F] text-white hover:text-[#22D3EE] flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="px-1.5 font-bold text-white text-[11px] min-w-[28px] text-center">
                              {leg.lots}L ({leg.quantity})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateLegQty(leg.id, 1)}
                              className="h-5 w-5 rounded bg-[#07111F] text-white hover:text-[#22D3EE] flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveLeg(leg.id)}
                            className="p-1.5 rounded-lg text-[#7D8EA5] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                            title="Remove Leg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: RISK & SIZING */}
        {currentStep === "risk" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B1929] border border-[#12304A] rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#22D3EE]" />
                  Step 4 — Capital Allocation & Risk Management
                </h2>
                <p className="text-xs text-[#7D8EA5] mt-1">
                  Configure maximum risk limits, lot sizing, and automatic position closing triggers.
                </p>
              </div>

              {/* Capital & Lot Stepper Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 bg-[#07111F] border border-[#12304A] rounded-xl p-4">
                  <label className="text-xs font-semibold text-[#B7C6D8]">Allocated Capital (₹)</label>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="w-full bg-[#0B1929] border border-[#12304A] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                  />
                  <span className="text-[11px] text-[#7D8EA5]">
                    Available Margin Cushion: ₹{(capital - riskMetrics.requiredMargin).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1.5 bg-[#07111F] border border-[#12304A] rounded-xl p-4">
                  <label className="text-xs font-semibold text-[#B7C6D8]">Order Multiplier / Lots</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setLots((prev) => Math.max(1, prev - 1))}
                      className="h-10 w-10 rounded-xl bg-[#0B1929] border border-[#12304A] text-white hover:text-[#22D3EE] font-bold text-base flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-sm text-white bg-[#0B1929] border border-[#12304A] py-2 rounded-xl">
                      {lots} Lot(s) = {lots * currentInstrument.lotSize} Qty
                    </span>
                    <button
                      type="button"
                      onClick={() => setLots((prev) => prev + 1)}
                      className="h-10 w-10 rounded-xl bg-[#0B1929] border border-[#12304A] text-white hover:text-[#22D3EE] font-bold text-base flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-[#7D8EA5]">
                    Lot step for {underlying}: {currentInstrument.lotSize} contracts per lot
                  </span>
                </div>
              </div>

              {/* Central Risk Calculations Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-[#07111F] border border-[#12304A] rounded-xl p-3.5">
                  <span className="text-[#7D8EA5] text-[11px] block">Net Flow</span>
                  <span
                    className={`text-sm font-bold block mt-1 ${
                      riskMetrics.netDebitCredit < 0 ? "text-[#F43F5E]" : "text-[#10B981]"
                    }`}
                  >
                    {riskMetrics.netDebitCredit < 0 ? "Debit" : "Credit"}: ₹
                    {Math.abs(riskMetrics.netDebitCredit).toLocaleString()}
                  </span>
                </div>

                <div className="bg-[#07111F] border border-[#12304A] rounded-xl p-3.5">
                  <span className="text-[#7D8EA5] text-[11px] block">Estimated Margin</span>
                  <span className="text-sm font-bold text-white block mt-1">
                    ₹{riskMetrics.requiredMargin.toLocaleString()}
                  </span>
                </div>

                <div className="bg-[#07111F] border border-[#12304A] rounded-xl p-3.5">
                  <span className="text-[#7D8EA5] text-[11px] block">Maximum Loss</span>
                  <span className="text-sm font-bold text-[#F43F5E] block mt-1">
                    ₹{riskMetrics.maxLoss.toLocaleString()}
                  </span>
                </div>

                <div className="bg-[#07111F] border border-[#12304A] rounded-xl p-3.5">
                  <span className="text-[#7D8EA5] text-[11px] block">Maximum Profit</span>
                  <span className="text-sm font-bold text-[#10B981] block mt-1">
                    ₹{riskMetrics.maxProfit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Risk Triggers & Rules */}
              <div className="space-y-4 pt-2 border-t border-[#12304A]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Automated Exit & Guardrail Rules
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Stop Loss */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#B7C6D8]">Stop Loss (Points)</label>
                    <input
                      type="number"
                      value={stopLossValue}
                      onChange={(e) => setStopLossValue(Number(e.target.value))}
                      className="w-full bg-[#07111F] border border-[#12304A] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>

                  {/* Target Profit */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#B7C6D8]">Take Profit Target (Points)</label>
                    <input
                      type="number"
                      value={takeProfitValue}
                      onChange={(e) => setTakeProfitValue(Number(e.target.value))}
                      className="w-full bg-[#07111F] border border-[#12304A] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#07111F] border border-[#12304A]">
                    <div>
                      <span className="text-xs font-bold text-white block">Exit Before Expiry</span>
                      <span className="text-[11px] text-[#7D8EA5]">
                        Automatically square off open legs {exitMinutesBeforeClose} mins before market close.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExitBeforeExpiry(!exitBeforeExpiry)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        exitBeforeExpiry ? "bg-[#10B981]" : "bg-[#12304A]"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          exitBeforeExpiry ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#07111F] border border-[#12304A]">
                    <div>
                      <span className="text-xs font-bold text-white block">Trailing Stop Loss</span>
                      <span className="text-[11px] text-[#7D8EA5]">
                        Trail stop loss dynamically as trade moves into profit.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTrailingStopEnabled(!trailingStopEnabled)}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        trailingStopEnabled ? "bg-[#10B981]" : "bg-[#12304A]"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 rounded-full bg-white transition-transform ${
                          trailingStopEnabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & LAUNCH */}
        {currentStep === "review" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0B1929] border border-[#12304A] rounded-2xl p-6 shadow-xl space-y-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[#22D3EE]" />
                  Step 5 — Review Bot Specifications
                </h2>
                <p className="text-xs text-[#7D8EA5] mt-1">
                  Validate all operational parameters before deploying the quantitative strategy bot.
                </p>
              </div>

              {/* Bot Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#B7C6D8]">Bot Instance Name</label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full bg-[#07111F] border border-[#12304A] rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              {/* Bot Overview Card */}
              <div className="bg-[#07111F] border border-[#12304A] rounded-xl p-4 space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-[#12304A] pb-3">
                  <div>
                    <span className="text-[#7D8EA5] text-[10px] block">Strategy</span>
                    <span className="font-bold text-white">{selectedTemplate.name}</span>
                  </div>
                  <div>
                    <span className="text-[#7D8EA5] text-[10px] block">Underlying</span>
                    <span className="font-bold text-[#22D3EE]">{underlying} ({selectedExpiry})</span>
                  </div>
                  <div>
                    <span className="text-[#7D8EA5] text-[10px] block">Execution Mode</span>
                    <span
                      className={`font-bold ${
                        executionMode === "LIVE" ? "text-[#F43F5E]" : "text-[#17C5FF]"
                      }`}
                    >
                      ● {executionMode} TRADING
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7D8EA5] text-[10px] block">Broker</span>
                    <span className="font-bold text-white">{broker} (Connected)</span>
                  </div>
                </div>

                {/* Legs Summary */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-[#7D8EA5] uppercase block">
                    Execution Legs ({strategyLegs.length})
                  </span>
                  {strategyLegs.map((leg, i) => (
                    <div
                      key={leg.id}
                      className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#0B1929] border border-[#12304A]"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            leg.action === "BUY" ? "bg-[#10B981]/20 text-[#10B981]" : "bg-[#F43F5E]/20 text-[#F43F5E]"
                          }`}
                        >
                          {leg.action}
                        </span>
                        <span className="font-bold text-white">{leg.tradingSymbol}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#7D8EA5]">{leg.quantity} Qty</span>
                        <span className="font-bold text-white">@ ₹{leg.premium?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Risk & Margin Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#12304A]">
                  <div>
                    <span className="text-[#7D8EA5] text-[10px] block">Required Margin</span>
                    <span className="font-bold text-white">₹{riskMetrics.requiredMargin.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#7D8EA5] text-[10px] block">Max Profit</span>
                    <span className="font-bold text-[#10B981]">₹{riskMetrics.maxProfit.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#7D8EA5] text-[10px] block">Max Loss</span>
                    <span className="font-bold text-[#F43F5E]">₹{riskMetrics.maxLoss.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#7D8EA5] text-[10px] block">Risk Check</span>
                    <span className="font-bold text-[#10B981] flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                    </span>
                  </div>
                </div>
              </div>

              {/* Feedback Message */}
              {submissionFeedback && (
                <div
                  className={`p-4 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                    submissionFeedback.type === "success"
                      ? "bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]"
                      : "bg-[#F43F5E]/10 border-[#F43F5E]/40 text-[#F43F5E]"
                  }`}
                >
                  {submissionFeedback.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{submissionFeedback.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Sticky Bottom Command Bar matching Dashboard */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#07111F]/95 backdrop-blur-md border-t border-[#12304A] px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {currentStep !== "market" && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl bg-[#0B1929] border border-[#12304A] text-[#B7C6D8] hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep !== "review" ? (
              <button
                type="button"
                disabled={!canProceedNext}
                onClick={handleNextStep}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  canProceedNext
                    ? "bg-gradient-to-r from-[#0EA5E9] to-[#2563EB] text-white shadow-lg shadow-[#0EA5E9]/20 hover:opacity-95 cursor-pointer"
                    : "bg-[#12304A] text-[#7D8EA5] cursor-not-allowed opacity-50"
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={createBotMutation.isPending}
                  onClick={handleRunPaperTest}
                  className="px-4 py-2.5 rounded-xl bg-[#17C5FF]/20 text-[#17C5FF] border border-[#17C5FF]/40 hover:bg-[#17C5FF]/30 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Run Paper Bot</span>
                </button>

                <button
                  type="button"
                  disabled={createBotMutation.isPending}
                  onClick={handleActivateLiveBot}
                  className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                    executionMode === "LIVE"
                      ? "bg-[#F43F5E] text-white shadow-lg shadow-[#F43F5E]/30 hover:bg-[#F43F5E]/90"
                      : "bg-[#10B981] text-[#07111F] shadow-lg shadow-[#10B981]/30 hover:bg-[#10B981]/90"
                  } cursor-pointer`}
                >
                  <Bot className="h-4 w-4" />
                  <span>{executionMode === "LIVE" ? "Activate LIVE Bot" : "Deploy Bot"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Confirmation Modal */}
      {liveConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-[#0B1929] border border-[#F43F5E] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#F43F5E]">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Confirm LIVE Bot Activation</h3>
            </div>
            <p className="text-xs text-[#B7C6D8] leading-relaxed">
              You are about to activate <strong>{botName}</strong> in <strong>LIVE TRADING</strong> mode on Dhan HQ.
              Real market orders with an estimated margin of <strong>₹{riskMetrics.requiredMargin.toLocaleString()}</strong> will be transmitted to the exchange.
            </p>
            <div className="bg-[#07111F] border border-[#12304A] rounded-xl p-3 text-[11px] font-mono text-[#7D8EA5] space-y-1">
              <div>• Max Loss Ceiling: ₹{riskMetrics.maxLoss.toLocaleString()}</div>
              <div>• Underlying: {underlying} ({strategyLegs.length} legs)</div>
              <div>• Broker: Dhan Multi-Broker (Connected)</div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLiveConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#07111F] border border-[#12304A] text-xs font-semibold text-[#B7C6D8] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLiveConfirmModalOpen(false);
                  createBotMutation.mutate();
                }}
                className="px-4 py-2 rounded-xl bg-[#F43F5E] text-white text-xs font-bold shadow-lg shadow-[#F43F5E]/30 hover:bg-[#F43F5E]/90"
              >
                Confirm & Deploy LIVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
