"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  OptionLeg,
  StrategyEvaluationResult,
  WorkstationRiskSummary,
  ActiveStrategyInstance,
} from "@/types/options-workstation";
import { PairAnalysisResult, PairOptionStructureResult } from "@/types/pairs-trading";
import { apiClient } from "@/lib/apiClient";

export interface NormalizedUnderlying {
  symbol: string;
  name: string;
  market: "India" | "Global" | "Crypto" | "Commodities";
  exchange: string;
  assetClass: "INDEX" | "STOCK" | "ETF" | "CRYPTO_PERP" | "COMMODITY";
  spotPrice: number;
  step: number;
  lotSize: number;
  multiplier: number;
  currency: string;
  currencySymbol: string;
}

export const CANONICAL_UNDERLYINGS: NormalizedUnderlying[] = [
  // India (NSE / BSE / Upstox)
  { symbol: "NIFTY", name: "NIFTY 50 Index Options", market: "India", exchange: "NSE / Upstox", assetClass: "INDEX", spotPrice: 24800.0, step: 50, lotSize: 25, multiplier: 25, currency: "INR", currencySymbol: "₹" },
  { symbol: "BANKNIFTY", name: "BANK NIFTY Index Options", market: "India", exchange: "NSE / Upstox", assetClass: "INDEX", spotPrice: 51200.0, step: 100, lotSize: 15, multiplier: 15, currency: "INR", currencySymbol: "₹" },
  { symbol: "FINNIFTY", name: "FINNIFTY Index Options", market: "India", exchange: "NSE / Upstox", assetClass: "INDEX", spotPrice: 23600.0, step: 50, lotSize: 40, multiplier: 40, currency: "INR", currencySymbol: "₹" },
  { symbol: "MIDCPNIFTY", name: "NIFTY MIDCAP Options", market: "India", exchange: "NSE / Upstox", assetClass: "INDEX", spotPrice: 12850.0, step: 25, lotSize: 75, multiplier: 75, currency: "INR", currencySymbol: "₹" },
  { symbol: "SENSEX", name: "BSE SENSEX Options", market: "India", exchange: "BSE", assetClass: "INDEX", spotPrice: 79800.0, step: 100, lotSize: 10, multiplier: 10, currency: "INR", currencySymbol: "₹" },
  { symbol: "RELIANCE", name: "Reliance Industries Options", market: "India", exchange: "NSE", assetClass: "STOCK", spotPrice: 2980.0, step: 20, lotSize: 250, multiplier: 250, currency: "INR", currencySymbol: "₹" },
  { symbol: "TCS", name: "Tata Consultancy Services Options", market: "India", exchange: "NSE", assetClass: "STOCK", spotPrice: 4190.0, step: 20, lotSize: 175, multiplier: 175, currency: "INR", currencySymbol: "₹" },
  { symbol: "HDFCBANK", name: "HDFC Bank Options", market: "India", exchange: "NSE", assetClass: "STOCK", spotPrice: 1640.0, step: 10, lotSize: 550, multiplier: 550, currency: "INR", currencySymbol: "₹" },
  { symbol: "ICICIBANK", name: "ICICI Bank Options", market: "India", exchange: "NSE", assetClass: "STOCK", spotPrice: 1150.0, step: 10, lotSize: 700, multiplier: 700, currency: "INR", currencySymbol: "₹" },
  { symbol: "INFY", name: "Infosys Ltd Options", market: "India", exchange: "NSE", assetClass: "STOCK", spotPrice: 1820.0, step: 10, lotSize: 400, multiplier: 400, currency: "INR", currencySymbol: "₹" },

  // Global / US (Alpha Vantage / CBOE / NASDAQ / OPRA)
  { symbol: "SPY", name: "SPDR S&P 500 ETF Options", market: "Global", exchange: "NYSE / Alpha Vantage", assetClass: "ETF", spotPrice: 562.0, step: 1, lotSize: 100, multiplier: 100, currency: "USD", currencySymbol: "$" },
  { symbol: "QQQ", name: "Invesco QQQ Trust Options", market: "Global", exchange: "NASDAQ / Alpha Vantage", assetClass: "ETF", spotPrice: 485.0, step: 1, lotSize: 100, multiplier: 100, currency: "USD", currencySymbol: "$" },
  { symbol: "AAPL", name: "Apple Inc. Options", market: "Global", exchange: "NASDAQ / Alpha Vantage", assetClass: "STOCK", spotPrice: 316.85, step: 2.5, lotSize: 100, multiplier: 100, currency: "USD", currencySymbol: "$" },
  { symbol: "NVDA", name: "NVIDIA Corp. Options", market: "Global", exchange: "NASDAQ / Alpha Vantage", assetClass: "STOCK", spotPrice: 125.5, step: 2.5, lotSize: 100, multiplier: 100, currency: "USD", currencySymbol: "$" },
  { symbol: "MSFT", name: "Microsoft Corp. Options", market: "Global", exchange: "NASDAQ / Alpha Vantage", assetClass: "STOCK", spotPrice: 418.2, step: 2.5, lotSize: 100, multiplier: 100, currency: "USD", currencySymbol: "$" },
  { symbol: "TSLA", name: "Tesla Inc. Options", market: "Global", exchange: "NASDAQ / Alpha Vantage", assetClass: "STOCK", spotPrice: 215.0, step: 2.5, lotSize: 100, multiplier: 100, currency: "USD", currencySymbol: "$" },

  // Crypto Options (Delta Exchange / Deribit)
  { symbol: "BTC-OPTIONS", name: "Bitcoin Options Chain", market: "Crypto", exchange: "Delta Exchange / Deribit", assetClass: "CRYPTO_PERP", spotPrice: 78520.0, step: 500, lotSize: 0.1, multiplier: 1, currency: "USD", currencySymbol: "$" },
  { symbol: "ETH-OPTIONS", name: "Ethereum Options Chain", market: "Crypto", exchange: "Delta Exchange / Deribit", assetClass: "CRYPTO_PERP", spotPrice: 3480.0, step: 50, lotSize: 1, multiplier: 1, currency: "USD", currencySymbol: "$" },
  { symbol: "SOL-OPTIONS", name: "Solana Options Chain", market: "Crypto", exchange: "Delta Exchange / Deribit", assetClass: "CRYPTO_PERP", spotPrice: 188.0, step: 5, lotSize: 10, multiplier: 1, currency: "USD", currencySymbol: "$" },
  { symbol: "BTC/USDT", name: "Bitcoin Perpetual Options", market: "Crypto", exchange: "Binance", assetClass: "CRYPTO_PERP", spotPrice: 78520.0, step: 1000, lotSize: 1, multiplier: 1, currency: "USDT", currencySymbol: "USDT " },
  { symbol: "ETH/USDT", name: "Ethereum Perpetual Options", market: "Crypto", exchange: "Binance", assetClass: "CRYPTO_PERP", spotPrice: 3480.0, step: 50, lotSize: 1, multiplier: 1, currency: "USDT", currencySymbol: "USDT " },

  // Commodities & Macro (Gold / Silver / Crude)
  { symbol: "GOLD", name: "Gold Spot/Options (XAU/USD)", market: "Commodities", exchange: "Global / CME", assetClass: "COMMODITY", spotPrice: 2510.0, step: 10, lotSize: 100, multiplier: 100, currency: "USD", currencySymbol: "$" },
  { symbol: "SILVER", name: "Silver Spot/Options (XAG/USD)", market: "Commodities", exchange: "Global / CME", assetClass: "COMMODITY", spotPrice: 29.5, step: 0.5, lotSize: 5000, multiplier: 5000, currency: "USD", currencySymbol: "$" },
  { symbol: "CRUDE_OIL", name: "WTI Crude Oil Options", market: "Commodities", exchange: "NYMEX / CME", assetClass: "COMMODITY", spotPrice: 76.5, step: 0.5, lotSize: 1000, multiplier: 1000, currency: "USD", currencySymbol: "$" },
];

export type WorkstationPrimarySection = "build" | "analyze" | "monitor" | "backtest" | "system";
export type StrategyWorkflowState = "DRAFT" | "READY" | "ACTIVE" | "PAUSED" | "ERROR";
export type MarketDataFeedStatus = "LIVE" | "DELAYED" | "DISCONNECTED";
export type BrokerAccountStatus = "CONNECTED" | "AUTH_REQUIRED" | "UNCONFIGURED";

interface OptionsMarketContextType {
  // 1. Unified Market & Instrument Snapshot
  market: "India" | "Global" | "Crypto" | "Commodities";
  selectedUnderlying: NormalizedUnderlying;
  underlyingsList: NormalizedUnderlying[];
  spotPrice: number;
  quoteTimestamp: string;
  quoteAgeSeconds: number;
  dataStatus: MarketDataFeedStatus;
  executionMode: "PAPER" | "LIVE";
  accountStatus: BrokerAccountStatus;
  providerName: string;
  brokerName: string;

  // 2. Expiries
  availableExpiries: string[];
  selectedExpiry: string;

  // 3. Draft Strategy State (Build Workflow)
  activeSection: WorkstationPrimarySection;
  builderStep: 1 | 2 | 3 | 4;
  strategyWorkflowState: StrategyWorkflowState;
  selectedStrategyId: string;
  draftLegs: OptionLeg[];
  isContractLocked: boolean;
  strategyEvaluation: StrategyEvaluationResult | null;
  riskParameters: {
    allocatedCapital: number;
    lots: number;
    maxLossDollars: number;
    stopLossPct: number;
    profitTargetPct: number;
    trailingStopPct: number;
    timeExitDte: number;
  };

  // 4. Analysis & Pairs State
  selectedPair: PairAnalysisResult | null;
  pairOptionStructure: PairOptionStructureResult | null;

  // 5. Active Monitoring Ledger & Risk Gates
  activeStrategies: ActiveStrategyInstance[];
  openPositions: any[];
  orderAuditLogs: any[];
  riskSummary: WorkstationRiskSummary | null;
  statusNotification: { text: string; type: "success" | "warn" | "info" } | null;

  // 6. Universal Action Dispatchers
  setMarket: (market: "India" | "Global" | "Crypto" | "Commodities") => void;
  setSelectedUnderlyingSymbol: (symbol: string) => void;
  setSelectedExpiry: (expiry: string) => void;
  setExecutionMode: (mode: "PAPER" | "LIVE") => void;
  setActiveSection: (section: WorkstationPrimarySection) => void;
  setBuilderStep: (step: 1 | 2 | 3 | 4) => void;
  setSelectedStrategyId: (id: string) => void;
  setDraftLegs: (legs: OptionLeg[]) => void;
  addDraftLeg: (leg: OptionLeg) => void;
  removeDraftLeg: (index: number) => void;
  updateDraftLeg: (index: number, leg: Partial<OptionLeg>) => void;
  setIsContractLocked: (locked: boolean) => void;
  updateRiskParameters: (params: Partial<OptionsMarketContextType["riskParameters"]>) => void;
  setSelectedPair: (pair: PairAnalysisResult | null) => void;
  setPairOptionStructure: (struct: PairOptionStructureResult | null) => void;
  evaluateDraftStrategy: () => Promise<void>;
  executePaperStrategy: () => Promise<boolean>;
  executeLiveStrategy: () => Promise<boolean>;
  controlStrategy: (instanceId: string, action: string) => Promise<boolean>;
  squareOffPortfolio: () => Promise<boolean>;
  triggerEmergencyKillSwitch: () => Promise<boolean>;
  dismissNotification: () => void;
  refreshMarketSnapshot: () => Promise<void>;
}

const OptionsMarketContext = createContext<OptionsMarketContextType | null>(null);

export function OptionsMarketProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarketState] = useState<"India" | "Global" | "Crypto" | "Commodities">("India");
  const [selectedUnderlying, setSelectedUnderlying] = useState<NormalizedUnderlying>(CANONICAL_UNDERLYINGS[0]);
  const [spotPrice, setSpotPrice] = useState<number>(CANONICAL_UNDERLYINGS[0].spotPrice);
  const [quoteTimestamp, setQuoteTimestamp] = useState<string>(new Date().toISOString());
  const [quoteAgeSeconds, setQuoteAgeSeconds] = useState<number>(1);
  const [dataStatus, setDataStatus] = useState<MarketDataFeedStatus>("LIVE");
  const [executionMode, setExecutionMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [accountStatus, setAccountStatus] = useState<BrokerAccountStatus>("CONNECTED");

  const [availableExpiries] = useState<string[]>([
    "28-SEP-2026",
    "05-OCT-2026",
    "12-OCT-2026",
    "29-OCT-2026",
    "26-NOV-2026",
  ]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("28-SEP-2026");

  // Navigation & Builder State
  const [activeSection, setActiveSection] = useState<WorkstationPrimarySection>("build");
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3 | 4>(1);
  const [strategyWorkflowState, setStrategyWorkflowState] = useState<StrategyWorkflowState>("DRAFT");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("bull-call-spread");
  const [draftLegs, setDraftLegs] = useState<OptionLeg[]>([]);
  const [isContractLocked, setIsContractLocked] = useState<boolean>(false);
  const [strategyEvaluation, setStrategyEvaluation] = useState<StrategyEvaluationResult | null>(null);

  const [riskParameters, setRiskParameters] = useState({
    allocatedCapital: 50000,
    lots: 1,
    maxLossDollars: 10000,
    stopLossPct: 50,
    profitTargetPct: 100,
    trailingStopPct: 20,
    timeExitDte: 1,
  });

  // Pairs State
  const [selectedPair, setSelectedPair] = useState<PairAnalysisResult | null>(null);
  const [pairOptionStructure, setPairOptionStructure] = useState<PairOptionStructureResult | null>(null);

  // Active Monitoring State
  const [activeStrategies, setActiveStrategies] = useState<ActiveStrategyInstance[]>([]);
  const [openPositions, setOpenPositions] = useState<any[]>([]);
  const [orderAuditLogs, setOrderAuditLogs] = useState<any[]>([]);
  const [riskSummary, setRiskSummary] = useState<WorkstationRiskSummary | null>(null);
  const [statusNotification, setStatusNotification] = useState<{ text: string; type: "success" | "warn" | "info" } | null>(null);

  // Filtered underlyings for current market
  const underlyingsList = useMemo(() => {
    return CANONICAL_UNDERLYINGS.filter((u) => u.market === market);
  }, [market]);

  const providerName = useMemo(() => {
    if (market === "India") return "NSE/BSE Native Adapter";
    if (market === "Global") return "IBKR / Global Broker Adapter";
    return "Binance Crypto Feed Adapter";
  }, [market]);

  const brokerName = useMemo(() => {
    if (executionMode === "PAPER") return "Quant.OS Virtual Sandbox";
    if (market === "India") return "Indian Broker Gateway";
    if (market === "Global") return "Interactive Brokers";
    return "Binance REST API";
  }, [executionMode, market]);

  // Set market and auto-select first underlying in that market
  const setMarket = useCallback((newMarket: "India" | "Global" | "Crypto") => {
    setMarketState(newMarket);
    const firstInMarket = CANONICAL_UNDERLYINGS.find((u) => u.market === newMarket);
    if (firstInMarket) {
      setSelectedUnderlying(firstInMarket);
      setSpotPrice(firstInMarket.spotPrice);
    }
  }, []);

  const setSelectedUnderlyingSymbol = useCallback((symbol: string) => {
    const found = CANONICAL_UNDERLYINGS.find((u) => u.symbol === symbol);
    if (found) {
      setSelectedUnderlying(found);
      setSpotPrice(found.spotPrice);
      setQuoteTimestamp(new Date().toISOString());
      setQuoteAgeSeconds(1);
    }
  }, []);

  // Sync draft legs when strategy ID or spot price changes
  const loadPresetStrategy = useCallback(async (stratId: string, currentSpot: number) => {
    try {
      const res = await fetch(
        `/api/options/strategy/preset?name=${stratId}&underlying=${selectedUnderlying.symbol}&spot=${currentSpot}&expiry=${selectedExpiry}`
      );
      if (res.ok) {
        const data = await res.json();
        setDraftLegs(data.legs || []);
        setStrategyEvaluation(data);
        setStrategyWorkflowState("READY");
      }
    } catch (err) {
      console.error("Preset load error:", err);
    }
  }, [selectedExpiry, selectedUnderlying.symbol]);

  useEffect(() => {
    if (!isContractLocked) {
      loadPresetStrategy(selectedStrategyId, spotPrice);
    }
  }, [selectedStrategyId, selectedUnderlying.symbol, isContractLocked, loadPresetStrategy, spotPrice]);

  const evaluateDraftStrategy = useCallback(async () => {
    if (draftLegs.length === 0) return;
    try {
      const res = await fetch("/api/options/strategy/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_name: selectedStrategyId,
          underlying: selectedUnderlying.symbol,
          spot_price: spotPrice,
          legs: draftLegs,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStrategyEvaluation(data);
        setStrategyWorkflowState("READY");
      }
    } catch (err) {
      console.error("Evaluation error:", err);
    }
  }, [draftLegs, selectedStrategyId, selectedUnderlying.symbol, spotPrice]);

  // Draft Leg Mutators
  const addDraftLeg = useCallback((leg: OptionLeg) => {
    setDraftLegs((prev) => [...prev, leg]);
    setStrategyWorkflowState("DRAFT");
  }, []);

  const removeDraftLeg = useCallback((index: number) => {
    setDraftLegs((prev) => prev.filter((_, i) => i !== index));
    setStrategyWorkflowState("DRAFT");
  }, []);

  const updateDraftLeg = useCallback((index: number, updated: Partial<OptionLeg>) => {
    setDraftLegs((prev) =>
      prev.map((leg, i) => (i === index ? { ...leg, ...updated } : leg))
    );
    setStrategyWorkflowState("DRAFT");
  }, []);

  const updateRiskParameters = useCallback((params: Partial<typeof riskParameters>) => {
    setRiskParameters((prev) => ({ ...prev, ...params }));
  }, []);

  // Fetch monitoring data with circuit breaker & visibility throttling
  const refreshMonitoringData = useCallback(async () => {
    if (apiClient.isOffline()) return;
    try {
      const [stratRes, posRes, riskRes] = await Promise.all([
        apiClient.get<any>("/api/options/active-strategies", { timeoutMs: 5000 }),
        apiClient.get<any>("/api/options/positions", { timeoutMs: 5000 }),
        apiClient.get<any>("/api/options/risk/summary", { timeoutMs: 5000 }),
      ]);
      if (stratRes.ok && stratRes.data) {
        setActiveStrategies(stratRes.data.strategies || []);
      }
      if (posRes.ok && posRes.data) {
        setOpenPositions(posRes.data.positions || []);
      }
      if (riskRes.ok && riskRes.data) {
        setRiskSummary(riskRes.data.risk || null);
      }
    } catch {
      // Safe fallback
    }
  }, []);

  useEffect(() => {
    refreshMonitoringData();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible" && !apiClient.isOffline()) {
        refreshMonitoringData();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [refreshMonitoringData]);

  // Execution Dispatches
  const executePaperStrategy = useCallback(async (): Promise<boolean> => {
    if (apiClient.isOffline()) {
      setStatusNotification({ text: "Execution blocked: Backend is currently unavailable.", type: "warn" });
      return false;
    }
    setStatusNotification({ text: "Submitting strategy to Paper Multi-Market Sandbox...", type: "info" });
    try {
      const res = await apiClient.post<any>("/api/options/order/execute", {
        underlying: selectedUnderlying.symbol,
        execution_mode: "PAPER",
        broker_key: "paper",
        strategy_name: selectedStrategyId.toUpperCase(),
        legs: draftLegs,
        lots: riskParameters.lots,
      });
      if (res.ok) {
        setStatusNotification({ text: `✓ Paper Trade Executed: Strategy ${selectedStrategyId} is now active in Monitor tab.`, type: "success" });
        refreshMonitoringData();
        return true;
      }
      setStatusNotification({ text: res.error?.message || "Paper trade execution was rejected by order engine.", type: "warn" });
      return false;
    } catch {
      setStatusNotification({ text: "Failed to execute paper trade.", type: "warn" });
      return false;
    }
  }, [draftLegs, refreshMonitoringData, riskParameters.lots, selectedStrategyId, selectedUnderlying.symbol]);

  const executeLiveStrategy = useCallback(async (): Promise<boolean> => {
    if (apiClient.isOffline()) {
      setStatusNotification({ text: "Live execution blocked: Backend is currently unavailable.", type: "warn" });
      return false;
    }
    setStatusNotification({ text: "Live order authorization required: Verifying broker credentials & risk gates...", type: "info" });
    try {
      const res = await apiClient.post<any>("/api/options/order/validate", {
        underlying: selectedUnderlying.symbol,
        execution_mode: "LIVE",
        legs: draftLegs,
      });
      if (res.ok && res.data) {
        const data = res.data;
        if (data.can_execute) {
          setStatusNotification({ text: "✓ Live strategy order approved and routed to live broker.", type: "success" });
          return true;
        } else {
          setStatusNotification({ text: `Live Execution Blocked: ${data.blocking_reason || "Risk limits exceeded."}`, type: "warn" });
          return false;
        }
      }
      return false;
    } catch {
      setStatusNotification({ text: "Live execution request failed.", type: "warn" });
      return false;
    }
  }, [draftLegs, selectedUnderlying.symbol]);

  const controlStrategy = useCallback(async (instanceId: string, action: string): Promise<boolean> => {
    if (apiClient.isOffline()) {
      setStatusNotification({ text: "Action blocked: Backend is currently unavailable.", type: "warn" });
      return false;
    }
    try {
      const res = await apiClient.post<any>(`/api/options/strategy/${instanceId}/control`, { action });
      if (res.ok) {
        setStatusNotification({ text: `✓ Strategy action ${action} executed successfully.`, type: "success" });
        refreshMonitoringData();
        return true;
      }
      return false;
    } catch {
      setStatusNotification({ text: `Failed to execute ${action}.`, type: "warn" });
      return false;
    }
  }, [refreshMonitoringData]);

  const squareOffPortfolio = useCallback(async (): Promise<boolean> => {
    if (apiClient.isOffline()) {
      setStatusNotification({ text: "Kill-switch blocked: Backend is currently unavailable.", type: "warn" });
      return false;
    }
    setStatusNotification({ text: "Initiating graceful Portfolio Square-Off across all open options/pairs...", type: "info" });
    try {
      const res = await apiClient.post<any>("/api/options/kill-switch");
      if (res.ok) {
        setStatusNotification({ text: "✓ All open strategy positions reconciled and closed.", type: "success" });
        refreshMonitoringData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshMonitoringData]);
  const triggerEmergencyKillSwitch = useCallback(async (): Promise<boolean> => {
    if (apiClient.isOffline()) {
      setStatusNotification({ text: "Emergency kill-switch blocked: Backend is currently unavailable.", type: "warn" });
      return false;
    }
    setStatusNotification({ text: "🚨 EMERGENCY KILL SWITCH ACTIVATED: Halting all execution and cancelling pending orders...", type: "warn" });
    try {
      const res = await apiClient.post<any>("/api/options/kill-switch");
      if (res.ok) {
        setStatusNotification({ text: "🚨 System Locked: All active bots paused and orders cancelled.", type: "warn" });
        refreshMonitoringData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [refreshMonitoringData]);

  const dismissNotification = useCallback(() => {
    setStatusNotification(null);
  }, []);

  const refreshMarketSnapshot = useCallback(async () => {
    setQuoteTimestamp(new Date().toISOString());
    setQuoteAgeSeconds(0);
    setDataStatus("LIVE");
  }, []);

  return (
    <OptionsMarketContext.Provider
      value={{
        market,
        selectedUnderlying,
        underlyingsList,
        spotPrice,
        quoteTimestamp,
        quoteAgeSeconds,
        dataStatus,
        executionMode,
        accountStatus,
        providerName,
        brokerName,
        availableExpiries,
        selectedExpiry,
        activeSection,
        builderStep,
        strategyWorkflowState,
        selectedStrategyId,
        draftLegs,
        isContractLocked,
        strategyEvaluation,
        riskParameters,
        selectedPair,
        pairOptionStructure,
        activeStrategies,
        openPositions,
        orderAuditLogs,
        riskSummary,
        statusNotification,
        setMarket,
        setSelectedUnderlyingSymbol,
        setSelectedExpiry,
        setExecutionMode,
        setActiveSection,
        setBuilderStep,
        setSelectedStrategyId,
        setDraftLegs,
        addDraftLeg,
        removeDraftLeg,
        updateDraftLeg,
        setIsContractLocked,
        updateRiskParameters,
        setSelectedPair,
        setPairOptionStructure,
        evaluateDraftStrategy,
        executePaperStrategy,
        executeLiveStrategy,
        controlStrategy,
        squareOffPortfolio,
        triggerEmergencyKillSwitch,
        dismissNotification,
        refreshMarketSnapshot,
      }}
    >
      {children}
    </OptionsMarketContext.Provider>
  );
}

export function useOptionsMarketContext() {
  const context = useContext(OptionsMarketContext);
  if (!context) {
    throw new Error("useOptionsMarketContext must be used within an OptionsMarketProvider");
  }
  return context;
}
