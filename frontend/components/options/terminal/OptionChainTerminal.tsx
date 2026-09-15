"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Activity,
  BarChart2,
  Sliders,
  Send,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useGlobalData } from "@/context/GlobalDataContext";
import { dispatchBotCreation } from "@/lib/store/useBotCreationIntentStore";
import {
  OptionTerminalSnapshot,
  OptionStrikeRowData,
  OptionContractQuote,
  ColumnVisibilityConfig,
  OptionFilterConfig,
  TerminalViewMode,
  ActionableOptionContract,
} from "@/types/option-terminal";

import { OptionTerminalHeader } from "./OptionTerminalHeader";
import { OptionMarketSummaryCards } from "./OptionMarketSummaryCards";
import { OptionTerminalControlBar } from "./OptionTerminalControlBar";
import { OptionChainTable } from "./OptionChainTable";
import { OptionFlowTable } from "./OptionFlowTable";
import { OptionAnalyticsPanel } from "./OptionAnalyticsPanel";
import { OptionOrderBook } from "./OptionOrderBook";
import { OptionQuickOrderTicket } from "./OptionQuickOrderTicket";
import {
  ColumnCustomizerModal,
  DEFAULT_COLUMN_CONFIG,
  GREEKS_COLUMN_CONFIG,
  SCALPING_COLUMN_CONFIG,
  FULL_COLUMN_CONFIG,
} from "./ColumnCustomizerModal";
import { OptionFilterModal, DEFAULT_FILTER_CONFIG } from "./OptionFilterModal";
import { SelectedOptionInspectionDrawer } from "../SelectedOptionInspectionDrawer";
import { OptionOrderBookDrawer } from "./OptionOrderBookDrawer";

interface OptionChainTerminalProps {
  initialUnderlying?: string;
  initialSource?: string;
  isSourceLocked?: boolean;
}

const STORAGE_COLUMN_CONFIG = "quantos_option_chain_columns_v3";
const STORAGE_ONE_CLICK_KEY = "quantos_one_click_trading_mode";

export const OptionChainTerminal: React.FC<OptionChainTerminalProps> = ({
  initialUnderlying = "NIFTY",
  initialSource = "DHAN",
  isSourceLocked = false,
}) => {
  const queryClient = useQueryClient();
  const { positions, orders = [], tradingMode, refreshAll } = useGlobalData();

  // Primary State
  const [underlying, setUnderlying] = useState<string>(initialUnderlying);
  const [source, setSource] = useState<string>(initialSource);
  const [environment, setEnvironment] = useState<"LIVE" | "PAPER">("PAPER");
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [strikeRange, setStrikeRange] = useState<number>(20);
  const [customStrikeFrom, setCustomStrikeFrom] = useState<string>("");
  const [customStrikeTo, setCustomStrikeTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<TerminalViewMode>("STANDARD");

  // Sub-tabs
  const [terminalTab, setTerminalTab] = useState<"CHAIN" | "FLOW" | "ANALYTICS">("CHAIN");

  // One Click Trading Mode (Default: OFF)
  const [oneClickMode, setOneClickMode] = useState<boolean>(false);

  // Modals & Drawers
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isOrderBookDrawerOpen, setIsOrderBookDrawerOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnVisibilityConfig>(DEFAULT_COLUMN_CONFIG);
  const [filterConfig, setFilterConfig] = useState<OptionFilterConfig>(DEFAULT_FILTER_CONFIG);

  // Actionable Order Ticket State
  const [isTicketOpen, setIsTicketOpen] = useState<boolean>(false);
  const [ticketContract, setTicketContract] = useState<ActionableOptionContract | null>(null);
  const [ticketSide, setTicketSide] = useState<"BUY" | "SELL">("BUY");

  // Actionable Order Book Depth State
  const [isDepthOpen, setIsDepthOpen] = useState<boolean>(false);
  const [depthContract, setDepthContract] = useState<ActionableOptionContract | null>(null);

  // Selected Option for Legacy Inspection Drawer
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<"CE" | "PE" | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<OptionContractQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ status: "success" | "error" | "warn"; message: string } | null>(null);

  // Load Saved Column Configuration from localStorage
  useEffect(() => {
    try {
      const savedCol = localStorage.getItem(STORAGE_COLUMN_CONFIG);
      if (savedCol) {
        setColumnConfig(JSON.parse(savedCol));
      }
      const savedOneClick = localStorage.getItem(STORAGE_ONE_CLICK_KEY);
      if (savedOneClick) {
        setOneClickMode(savedOneClick === "true");
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const handleToggleOneClickMode = useCallback(() => {
    setOneClickMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_ONE_CLICK_KEY, String(next));
      } catch {}
      setFeedback({
        status: next ? "warn" : "success",
        message: next
          ? "ONE-CLICK TRADING ENABLED: Orders will be submitted immediately without review."
          : "ONE-CLICK TRADING DISABLED: Standard Order Ticket review is active.",
      });
      return next;
    });
  }, []);

  const handleUpdateColumnConfig = (newCfg: ColumnVisibilityConfig) => {
    setColumnConfig(newCfg);
    try {
      localStorage.setItem(STORAGE_COLUMN_CONFIG, JSON.stringify(newCfg));
    } catch {}
  };

  // Sync viewMode changes to column configuration
  const handleViewModeChange = (mode: TerminalViewMode) => {
    setViewMode(mode);
    if (mode === "GREEKS") {
      handleUpdateColumnConfig(GREEKS_COLUMN_CONFIG);
    } else if (mode === "COMPACT") {
      handleUpdateColumnConfig(SCALPING_COLUMN_CONFIG);
    } else if (mode === "FULL") {
      handleUpdateColumnConfig(FULL_COLUMN_CONFIG);
    } else {
      handleUpdateColumnConfig(DEFAULT_COLUMN_CONFIG);
    }
  };

  // 1. Fetch Terminal Snapshot & Option Flow Data
  const { data: snapshotData, isLoading, isFetching, refetch } = useQuery<{ success: boolean; data: OptionTerminalSnapshot }>({
    queryKey: ["optionTerminalSnapshot", underlying, source, selectedExpiry, strikeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        underlying,
        provider: source,
        strike_count: strikeRange.toString(),
      });
      if (selectedExpiry) params.append("expiry", selectedExpiry);

      const res = await apiClient.get<any>(`/api/options/flow?${params.toString()}`, { timeoutMs: 6000 });
      if (!res.ok || !res.data) {
        throw new Error(res.error?.message || "Failed to load option chain snapshot");
      }
      return res.data;
    },
    staleTime: 3000,
    refetchInterval: () => (apiClient.isOffline() ? false : 5000),
    retry: 1,
  });

  const snapshot = snapshotData?.data || null;
  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(underlying);
  const currency = isCrypto ? "$" : "₹";

  const rawStrikes = useMemo(() => snapshot?.strikes || [], [snapshot?.strikes]);

  // Active filter chips and count
  const { activeFilterCount, activeFilterChips } = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];

    // 1. Basic & Option Side
    if (filterConfig.side === "CALLS_ONLY") {
      chips.push({
        id: "side_ce",
        label: "CE Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, side: "ALL" })),
      });
    } else if (filterConfig.side === "PUTS_ONLY") {
      chips.push({
        id: "side_pe",
        label: "PE Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, side: "ALL" })),
      });
    }

    if (filterConfig.moneyness === "ATM_ONLY") {
      chips.push({
        id: "m_atm",
        label: "ATM Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, moneyness: "ALL" })),
      });
    } else if (filterConfig.moneyness === "ITM_ONLY") {
      chips.push({
        id: "m_itm",
        label: "ITM Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, moneyness: "ALL" })),
      });
    } else if (filterConfig.moneyness === "OTM_ONLY") {
      chips.push({
        id: "m_otm",
        label: "OTM Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, moneyness: "ALL" })),
      });
    }

    // 2. Price Filters
    if (filterConfig.minLtp !== undefined && filterConfig.minLtp > 0) {
      chips.push({
        id: "ltp_min",
        label: `LTP ≥ ${filterConfig.minLtp}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, minLtp: undefined })),
      });
    }
    if (filterConfig.maxLtp !== undefined && filterConfig.maxLtp > 0) {
      chips.push({
        id: "ltp_max",
        label: `LTP ≤ ${filterConfig.maxLtp}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, maxLtp: undefined })),
      });
    }
    if (filterConfig.minChangePct !== undefined) {
      chips.push({
        id: "chg_min",
        label: `Chg% ≥ ${filterConfig.minChangePct}%`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, minChangePct: undefined })),
      });
    }
    if (filterConfig.maxChangePct !== undefined) {
      chips.push({
        id: "chg_max",
        label: `Chg% ≤ ${filterConfig.maxChangePct}%`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, maxChangePct: undefined })),
      });
    }

    // 3. Open Interest & Volume
    if (filterConfig.minOI > 0) {
      chips.push({
        id: "oi_min",
        label: `OI ≥ ${filterConfig.minOI.toLocaleString()}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, minOI: 0 })),
      });
    }
    if (filterConfig.maxOI !== undefined && filterConfig.maxOI > 0) {
      chips.push({
        id: "oi_max",
        label: `OI ≤ ${filterConfig.maxOI.toLocaleString()}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, maxOI: undefined })),
      });
    }
    if (filterConfig.minVolume > 0) {
      chips.push({
        id: "vol_min",
        label: `Vol ≥ ${filterConfig.minVolume.toLocaleString()}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, minVolume: 0 })),
      });
    }
    if (filterConfig.maxVolume !== undefined && filterConfig.maxVolume > 0) {
      chips.push({
        id: "vol_max",
        label: `Vol ≤ ${filterConfig.maxVolume.toLocaleString()}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, maxVolume: undefined })),
      });
    }
    if (filterConfig.highOIOnly) {
      chips.push({
        id: "high_oi",
        label: "High OI Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, highOIOnly: false })),
      });
    }
    if (filterConfig.lowOIOnly) {
      chips.push({
        id: "low_oi",
        label: "Low OI Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, lowOIOnly: false })),
      });
    }
    if (filterConfig.highVolumeOnly) {
      chips.push({
        id: "high_vol",
        label: "High Vol Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, highVolumeOnly: false })),
      });
    }
    if (filterConfig.lowVolumeOnly) {
      chips.push({
        id: "low_vol",
        label: "Low Vol Only",
        onRemove: () => setFilterConfig((prev) => ({ ...prev, lowVolumeOnly: false })),
      });
    }

    // 4. Volatility & Greeks
    if (filterConfig.minIV !== undefined && filterConfig.minIV > 0) {
      chips.push({
        id: "iv_min",
        label: `IV ≥ ${filterConfig.minIV}%`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, minIV: undefined })),
      });
    }
    if (filterConfig.maxIV !== undefined && filterConfig.maxIV > 0) {
      chips.push({
        id: "iv_max",
        label: `IV ≤ ${filterConfig.maxIV}%`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, maxIV: undefined })),
      });
    }
    if (filterConfig.minDelta !== undefined) {
      chips.push({
        id: "delta_min",
        label: `Δ ≥ ${filterConfig.minDelta}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, minDelta: undefined })),
      });
    }
    if (filterConfig.maxDelta !== undefined) {
      chips.push({
        id: "delta_max",
        label: `Δ ≤ ${filterConfig.maxDelta}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, maxDelta: undefined })),
      });
    }

    // 5. Structure & Direction
    if (filterConfig.marketDirection && filterConfig.marketDirection !== "ALL") {
      chips.push({
        id: "direction",
        label: `Direction: ${filterConfig.marketDirection}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, marketDirection: "ALL" })),
      });
    }
    if (filterConfig.buildup !== "ALL") {
      chips.push({
        id: "buildup",
        label: `Buildup: ${filterConfig.buildup.replace(/_/g, " ")}`,
        onRemove: () => setFilterConfig((prev) => ({ ...prev, buildup: "ALL" })),
      });
    }

    return { activeFilterCount: chips.length, activeFilterChips: chips };
  }, [filterConfig]);

  // Filtered Strikes calculation with rigorous multi-dimensional criteria
  const displayedStrikes = useMemo(() => {
    // Calculate percentiles for High/Low values
    const oiValues = rawStrikes.map((r) => Math.max(r.call?.oi || 0, r.put?.oi || 0)).filter((v) => v > 0).sort((a, b) => a - b);
    const volValues = rawStrikes.map((r) => Math.max(r.call?.volume || 0, r.put?.volume || 0)).filter((v) => v > 0).sort((a, b) => a - b);
    const ivValues = rawStrikes.map((r) => Math.max(r.call?.iv || 0, r.put?.iv || 0)).filter((v) => v > 0).sort((a, b) => a - b);

    const highOiThreshold = oiValues.length > 0 ? oiValues[Math.floor(oiValues.length * 0.7)] : 0;
    const lowOiThreshold = oiValues.length > 0 ? oiValues[Math.floor(oiValues.length * 0.3)] : 0;
    const highVolThreshold = volValues.length > 0 ? volValues[Math.floor(volValues.length * 0.7)] : 0;
    const lowVolThreshold = volValues.length > 0 ? volValues[Math.floor(volValues.length * 0.3)] : 0;
    const highIvThreshold = ivValues.length > 0 ? ivValues[Math.floor(ivValues.length * 0.7)] : 0;
    const lowIvThreshold = ivValues.length > 0 ? ivValues[Math.floor(ivValues.length * 0.3)] : 0;

    return rawStrikes.filter((row) => {
      const call = row.call;
      const put = row.put;

      // 1. Search Query filter (Strike, Symbol, Security ID, CE/PE)
      if (searchQuery) {
        const q = searchQuery.trim().toLowerCase();
        const strikeStr = row.strike.toString();
        const callSym = call?.symbol?.toLowerCase() || "";
        const putSym = put?.symbol?.toLowerCase() || "";
        const callSecId = call?.securityId?.toString() || "";
        const putSecId = put?.securityId?.toString() || "";

        const matchStrike = strikeStr.includes(q);
        const matchCall = callSym.includes(q) || callSecId.includes(q);
        const matchPut = putSym.includes(q) || putSecId.includes(q);

        if (!matchStrike && !matchCall && !matchPut) {
          if (q === "ce" && !call) return false;
          if (q === "pe" && !put) return false;
          if (q !== "ce" && q !== "pe") return false;
        }
      }

      // 2. Custom Strike From/To filter
      if (customStrikeFrom) {
        const from = parseFloat(customStrikeFrom);
        if (!isNaN(from) && row.strike < from) return false;
      }
      if (customStrikeTo) {
        const to = parseFloat(customStrikeTo);
        if (!isNaN(to) && row.strike > to) return false;
      }

      // 3. Option Side filter
      if (filterConfig.side === "CALLS_ONLY" && !call) return false;
      if (filterConfig.side === "PUTS_ONLY" && !put) return false;

      // 4. Moneyness filter
      if (filterConfig.moneyness === "ITM_ONLY") {
        if (filterConfig.side === "CALLS_ONLY") {
          if (row.moneynessCall !== "ITM") return false;
        } else if (filterConfig.side === "PUTS_ONLY") {
          if (row.moneynessPut !== "ITM") return false;
        } else {
          if (row.moneynessCall !== "ITM" && row.moneynessPut !== "ITM") return false;
        }
      } else if (filterConfig.moneyness === "ATM_ONLY") {
        if (!row.isATM) return false;
      } else if (filterConfig.moneyness === "OTM_ONLY") {
        if (filterConfig.side === "CALLS_ONLY") {
          if (row.moneynessCall !== "OTM") return false;
        } else if (filterConfig.side === "PUTS_ONLY") {
          if (row.moneynessPut !== "OTM") return false;
        } else {
          if (row.moneynessCall !== "OTM" && row.moneynessPut !== "OTM") return false;
        }
      }

      // Helper to evaluate price & greeks condition for target side
      const testContractCondition = (c: typeof call | typeof put) => {
        if (!c) return false;

        // LTP
        if (filterConfig.minLtp !== undefined && c.ltp < filterConfig.minLtp) return false;
        if (filterConfig.maxLtp !== undefined && c.ltp > filterConfig.maxLtp) return false;

        // Change %
        if (filterConfig.minChangePct !== undefined && c.changePercent < filterConfig.minChangePct) return false;
        if (filterConfig.maxChangePct !== undefined && c.changePercent > filterConfig.maxChangePct) return false;

        // Bid / Ask
        if (filterConfig.minBid !== undefined && c.bid < filterConfig.minBid) return false;
        if (filterConfig.maxBid !== undefined && c.bid > filterConfig.maxBid) return false;
        if (filterConfig.minAsk !== undefined && c.ask < filterConfig.minAsk) return false;
        if (filterConfig.maxAsk !== undefined && c.ask > filterConfig.maxAsk) return false;

        // OI
        if (filterConfig.minOI > 0 && c.oi < filterConfig.minOI) return false;
        if (filterConfig.maxOI !== undefined && c.oi > filterConfig.maxOI) return false;
        if (filterConfig.minOIChange !== undefined && c.oiChange < filterConfig.minOIChange) return false;
        if (filterConfig.maxOIChange !== undefined && c.oiChange > filterConfig.maxOIChange) return false;

        // Volume
        if (filterConfig.minVolume > 0 && c.volume < filterConfig.minVolume) return false;
        if (filterConfig.maxVolume !== undefined && c.volume > filterConfig.maxVolume) return false;

        // IV
        if (filterConfig.minIV !== undefined && c.iv < filterConfig.minIV) return false;
        if (filterConfig.maxIV !== undefined && c.iv > filterConfig.maxIV) return false;

        // Greeks
        if (filterConfig.minDelta !== undefined && (c.greeks?.delta ?? 0) < filterConfig.minDelta) return false;
        if (filterConfig.maxDelta !== undefined && (c.greeks?.delta ?? 0) > filterConfig.maxDelta) return false;
        if (filterConfig.minGamma !== undefined && (c.greeks?.gamma ?? 0) < filterConfig.minGamma) return false;
        if (filterConfig.maxGamma !== undefined && (c.greeks?.gamma ?? 0) > filterConfig.maxGamma) return false;
        if (filterConfig.minTheta !== undefined && (c.greeks?.theta ?? 0) < filterConfig.minTheta) return false;
        if (filterConfig.maxTheta !== undefined && (c.greeks?.theta ?? 0) > filterConfig.maxTheta) return false;
        if (filterConfig.minVega !== undefined && (c.greeks?.vega ?? 0) < filterConfig.minVega) return false;
        if (filterConfig.maxVega !== undefined && (c.greeks?.vega ?? 0) > filterConfig.maxVega) return false;

        // Spreads
        const spread = c.ask > 0 && c.bid > 0 ? c.ask - c.bid : 0;
        if (filterConfig.minSpread !== undefined && spread < filterConfig.minSpread) return false;
        if (filterConfig.maxSpread !== undefined && spread > filterConfig.maxSpread) return false;

        // Direction
        if (filterConfig.marketDirection === "POSITIVE" && c.change <= 0) return false;
        if (filterConfig.marketDirection === "NEGATIVE" && c.change >= 0) return false;
        if (filterConfig.marketDirection === "UNCHANGED" && c.change !== 0) return false;

        // Buildup
        if (filterConfig.buildup !== "ALL" && c.oiBuildup !== filterConfig.buildup) return false;

        return true;
      };

      if (filterConfig.side === "CALLS_ONLY") {
        if (!testContractCondition(call)) return false;
      } else if (filterConfig.side === "PUTS_ONLY") {
        if (!testContractCondition(put)) return false;
      } else {
        const callPass = call ? testContractCondition(call) : false;
        const putPass = put ? testContractCondition(put) : false;
        if (!callPass && !putPass) return false;
      }

      // 5. Percentile Flags (High/Low OI, Volume, IV)
      if (filterConfig.highOIOnly && Math.max(call?.oi || 0, put?.oi || 0) < highOiThreshold) return false;
      if (filterConfig.lowOIOnly && Math.max(call?.oi || 0, put?.oi || 0) > lowOiThreshold) return false;
      if (filterConfig.highVolumeOnly && Math.max(call?.volume || 0, put?.volume || 0) < highVolThreshold) return false;
      if (filterConfig.lowVolumeOnly && Math.max(call?.volume || 0, put?.volume || 0) > lowVolThreshold) return false;
      if (filterConfig.highIVOnly && Math.max(call?.iv || 0, put?.iv || 0) < highIvThreshold) return false;
      if (filterConfig.lowIVOnly && Math.max(call?.iv || 0, put?.iv || 0) > lowIvThreshold) return false;

      return true;
    });
  }, [rawStrikes, searchQuery, customStrikeFrom, customStrikeTo, filterConfig]);



  // Direct One-Click Execution Handler
  const executeOneClickTrade = async (side: "BUY" | "SELL", contract: ActionableOptionContract) => {
    const clientOrderId = `OPT_1CLICK_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lotSize = contract.lotSize || 1;
    const price = side === "BUY" ? (contract.ask || contract.ltp) : (contract.bid || contract.ltp);

    try {
      const payload = {
        client_order_id: clientOrderId,
        symbol: contract.symbol,
        direction: side === "BUY" ? "LONG" : "SHORT",
        order_type: "MARKET",
        quantity: lotSize,
        price,
        mode: tradingMode,
        bot_id: "option-one-click",
        strategy: "OPTION_ONE_CLICK",
        provider: contract.source || contract.broker,
        broker: contract.broker,
        broker_account_id: contract.broker === "DELTA" ? "ba_delta_primary" : "ba_dhan_primary",
        instrument_id: contract.instrumentId || contract.symbol,
        product_id: contract.productId,
        underlying: contract.underlying,
        expiry: contract.expiry,
        strike: contract.strike,
        option_type: contract.optionType,
      };

      const res = await fetch("/api/quick-trade/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status === "error") {
        throw new Error(data.message || data.reason || "Execution failed");
      }

      setFeedback({
        status: "success",
        message: `1-Click Trade Placed: ${side} 1 Lot ${contract.symbol} @ ${currency}${price.toFixed(2)} (${tradingMode})`,
      });
      await refreshAll();
    } catch (err: any) {
      setFeedback({
        status: "error",
        message: `1-Click Trade Failed: ${err.message}`,
      });
    }
  };

  const router = useRouter();

  // Action Dispatchers -> Direct Trading Order Ticket & One-Click Execution
  const handleActionBuy = useCallback((contract: ActionableOptionContract) => {
    if (oneClickMode) {
      executeOneClickTrade("BUY", contract);
      return;
    }
    setTicketContract(contract);
    setTicketSide("BUY");
    setIsTicketOpen(true);
  }, [oneClickMode]);

  const handleActionSell = useCallback((contract: ActionableOptionContract) => {
    if (oneClickMode) {
      executeOneClickTrade("SELL", contract);
      return;
    }
    setTicketContract(contract);
    setTicketSide("SELL");
    setIsTicketOpen(true);
  }, [oneClickMode]);

  const handleActionDepth = useCallback((contract: ActionableOptionContract) => {
    setDepthContract(contract);
    setIsDepthOpen(true);
  }, []);

  const handleActionOrderBook = useCallback(() => {
    setIsOrderBookDrawerOpen(true);
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTicketOpen(false);
        setIsDepthOpen(false);
        setIsOrderBookDrawerOpen(false);
        setIsDrawerOpen(false);
        setIsColumnModalOpen(false);
        setIsFilterModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col gap-3 text-slate-100 font-sans w-full max-w-[1700px] mx-auto min-w-0">
      {/* 1. TOP HEADER */}
      <OptionTerminalHeader
        underlying={underlying}
        onChangeUnderlying={(u) => {
          setUnderlying(u);
          setSelectedExpiry("");
          if (["BTC", "ETH", "SOL", "XRP"].includes(u)) {
            setSource("DELTA_INDIA");
          } else if (source === "DELTA_INDIA" || source === "BINANCE") {
            setSource("DHAN");
          }
        }}
        spotPrice={snapshot?.spotPrice || 25420.0}
        spotChange={snapshot?.spotChange || 128.4}
        spotChangePercent={snapshot?.spotChangePercent || 0.51}
        marketStatus={snapshot?.marketStatus || "OPEN"}
        selectedExpiry={snapshot?.selectedExpiry || selectedExpiry}
        onChangeExpiry={(exp) => setSelectedExpiry(exp)}
        availableExpiries={snapshot?.availableExpiries || []}
        source={source}
        onChangeSource={(s) => !isSourceLocked && setSource(s)}
        isSourceLocked={isSourceLocked}
        environment={environment}
        onChangeEnvironment={(env) => setEnvironment(env)}
        freshnessStatus={snapshot?.freshnessStatus || "LIVE"}
        dataAgeMs={snapshot?.dataAgeMs || 100}
        latencyMs={snapshot?.latencyMs || 16}
        isFetching={isFetching}
        onRefresh={() => refetch()}
      />

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 shadow-lg ${
            feedback.status === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : feedback.status === "warn"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.status === "success" ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. MARKET SUMMARY CARDS */}
      <OptionMarketSummaryCards snapshot={snapshot} currency={currency} />

      {/* 3. WORKSTATION SUB-TABS (Option Chain / Options Flow / Analytics) */}
      <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[#090E17] border border-slate-800/90 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-0">
          {[
            { id: "CHAIN", label: "Option Chain Ladder", icon: Layers },
            { id: "FLOW", label: `Options Order Flow (${snapshot?.flowTrades?.length || 0})`, icon: Activity },
            { id: "ANALYTICS", label: "Derivatives Analytics & Heatmap", icon: BarChart2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = terminalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTerminalTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-mono font-bold transition flex-shrink-0 ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsOrderBookDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs sm:text-sm border border-slate-700 transition flex-shrink-0"
            title="Open In-Place Order Book"
          >
            <span>📑 Order Book</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
              {orders.length}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center pr-2 flex-shrink-0 text-slate-400 font-mono text-xs sm:text-sm gap-4">
          <span>Execution: <strong className={tradingMode === "LIVE" ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{tradingMode}</strong></span>
          <span>Underlying: <strong className="text-cyan-300 font-bold">{underlying}</strong></span>
        </div>
      </div>

      {/* 4. TAB VIEW RENDERING */}
      {terminalTab === "CHAIN" && (
        <div className="space-y-3">
          {/* High-density Control Bar with One-Click Trading Toggle */}
          <OptionTerminalControlBar
            strikeRange={strikeRange}
            onChangeStrikeRange={(r) => setStrikeRange(r)}
            customStrikeFrom={customStrikeFrom}
            customStrikeTo={customStrikeTo}
            onChangeCustomFrom={(f) => setCustomStrikeFrom(f)}
            onChangeCustomTo={(t) => setCustomStrikeTo(t)}
            viewMode={viewMode}
            onChangeViewMode={handleViewModeChange}
            onOpenColumnCustomizer={() => setIsColumnModalOpen(true)}
            onOpenFilterModal={() => setIsFilterModalOpen(true)}
            activeFilterCount={activeFilterCount}
            activeFilterChips={activeFilterChips}
            onClearAllFilters={() => setFilterConfig(DEFAULT_FILTER_CONFIG)}
            searchQuery={searchQuery}
            onChangeSearchQuery={(q) => setSearchQuery(q)}
            totalStrikesCount={rawStrikes.length}
            displayedStrikesCount={displayedStrikes.length}
            oneClickMode={oneClickMode}
            onToggleOneClickMode={handleToggleOneClickMode}
          />

          {/* Actionable Option Chain Table */}
          <OptionChainTable
            strikes={displayedStrikes}
            spotPrice={snapshot?.spotPrice || 25420.0}
            atmStrike={snapshot?.atmStrike || 25400}
            currency={currency}
            underlying={underlying}
            selectedExpiry={snapshot?.selectedExpiry || selectedExpiry}
            source={source}
            columnConfig={columnConfig}
            selectedStrike={selectedStrike}
            selectedOptionType={selectedOptionType}
            positions={positions}
            onSelectOption={(k, type, quote) => {
              setSelectedStrike(k);
              setSelectedOptionType(type);
              setSelectedQuote(quote);
              setIsDrawerOpen(true);
            }}
            onActionBuy={handleActionBuy}
            onActionSell={handleActionSell}
            onActionDepth={handleActionDepth}
            onActionOrderBook={handleActionOrderBook}
          />
        </div>
      )}

      {terminalTab === "FLOW" && (
        <OptionFlowTable
          flowTrades={snapshot?.flowTrades || []}
          currency={currency}
          onSelectTrade={(t) => {
            setSelectedStrike(t.strike);
            setSelectedOptionType(t.optionType as any);
            setIsDrawerOpen(true);
          }}
        />
      )}

      {terminalTab === "ANALYTICS" && snapshot && (
        <OptionAnalyticsPanel snapshot={snapshot} currency={currency} />
      )}

      {/* Actionable Quick Order Ticket */}
      <OptionQuickOrderTicket
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        contract={ticketContract}
        initialSide={ticketSide}
        currency={currency}
        onOrderSuccess={() => {
          setIsTicketOpen(false);
          refetch();
        }}
      />

      {/* Actionable Level-2 Order Book Depth Modal */}
      <OptionOrderBook
        isOpen={isDepthOpen}
        onClose={() => setIsDepthOpen(false)}
        contract={depthContract}
        currency={currency}
        onTradeAction={(act, c) => {
          if (act === "BUY") handleActionBuy(c);
          if (act === "SELL") handleActionSell(c);
        }}
      />

      {/* Actionable In-Place Option Order Book Drawer */}
      <OptionOrderBookDrawer
        isOpen={isOrderBookDrawerOpen}
        onClose={() => setIsOrderBookDrawerOpen(false)}
        currency={currency}
      />

      {/* Column Customizer Modal */}
      <ColumnCustomizerModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        config={columnConfig}
        onChangeConfig={handleUpdateColumnConfig}
      />

      {/* Instant Filter Modal */}
      <OptionFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filterConfig}
        onChangeFilters={(f) => setFilterConfig(f)}
        onResetFilters={() => setFilterConfig(DEFAULT_FILTER_CONFIG)}
      />

      {/* Selected Option Inspection Drawer */}
      {isDrawerOpen && selectedStrike && selectedOptionType && selectedQuote && (
        <SelectedOptionInspectionDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          underlying={underlying}
          spotPrice={snapshot?.spotPrice || 25420.0}
          strike={selectedStrike}
          optionType={selectedOptionType}
          quote={selectedQuote as any}
          expiry={snapshot?.selectedExpiry || selectedExpiry}
          currency={currency}
          onExecuteOrder={(side, lots) => {
            setIsDrawerOpen(false);
            if (ticketContract) {
              setTicketSide(side);
              setIsTicketOpen(true);
            }
          }}
        />
      )}
    </div>
  );
};
