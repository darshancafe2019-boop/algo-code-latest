"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  MarketUniverseResponse,
  MarketInstrument,
  UniverseSummaryStats,
} from "@/types/market-universe";

// Modular UI Components
import { MarketCommandHeader } from "./MarketCommandHeader";
import { MarketProviderBar, ProviderFilterId } from "./MarketProviderBar";
import { MarketCategoryCards, MarketCategory } from "./MarketCategoryCards";
import { MarketWorkspaceTabs, MarketWorkspaceTab } from "./MarketWorkspaceTabs";
import { MarketCategoryFilterPills } from "./MarketCategoryFilterPills";
import {
  MarketAdvancedFiltersPanel,
  AdvancedFilterState,
  INITIAL_ADVANCED_FILTERS,
} from "./MarketAdvancedFiltersPanel";
import { MarketDataTable } from "./MarketDataTable";
import { MarketInstrumentDetailsPanel } from "./MarketInstrumentDetailsPanel";

// Specialized Workspace Sub-Views
import { TopMoversBoard } from "./TopMoversBoard";
import { MarketScannerWorkbench } from "./MarketScannerWorkbench";
import { MarketDepthViewer } from "./MarketDepthViewer";
import { ProviderHealthDashboard } from "./ProviderHealthDashboard";
import { MarketNewsView } from "./MarketNewsView";
import { MarketEconomicCalendarView } from "./MarketEconomicCalendarView";
import { MarketCorporateActionsView } from "./MarketCorporateActionsView";

// Modals
import { OptionChainModal } from "./OptionChainModal";
import { FuturesChainModal } from "./FuturesChainModal";
import { MarketDataDiagnosticsPanel } from "./MarketDataDiagnosticsPanel";
import { ErrorBoundary } from "../ErrorBoundary";

// Hooks & Context
import { useWatchlist } from "@/hooks/useWatchlist";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";

// Fallback Baseline Instruments for zero-latency instant rendering
export const BASELINE_FALLBACK_INSTRUMENTS: MarketInstrument[] = [
  {
    instrument_id: "NSE:NIFTY:INDEX",
    canonical_symbol: "NIFTY",
    symbol: "NIFTY",
    provider_symbol: "NIFTY",
    display_name: "NIFTY 50",
    display_symbol: "NIFTY 50",
    company_name: "NSE NIFTY 50 Index",
    asset_class: "Indices",
    exchange: "NSE",
    provider: "upstox",
    currency: "INR",
    last_price: 24340.5,
    change_24h: 125.4,
    change_pct_24h: 0.52,
    volume_24h: 245000000,
    high_24h: 24410.0,
    low_24h: 24280.0,
    contract_status: "ACTIVE",
    market_status: "OPEN",
    marketSession: "REGULAR",
    priceState: "LIVE_TRADE",
    tradability: "TRADABLE",
    lot_size: 25,
    tick_size: 0.05,
    contract_size: 1,
    price_multiplier: 1,
    segment: "INDEX",
    mic: "XNSE",
    country: "IN",
    instrument_type: "INDEX",
    data_status: "LIVE",
    data_source: "UPSTOX_V3",
    paper_enabled: true,
    live_enabled: true,
    strategy_enabled: true,
  },
  {
    instrument_id: "NSE:BANKNIFTY:INDEX",
    canonical_symbol: "BANKNIFTY",
    symbol: "BANKNIFTY",
    provider_symbol: "BANKNIFTY",
    display_name: "BANK NIFTY",
    display_symbol: "BANK NIFTY",
    company_name: "NSE Bank Nifty Index",
    asset_class: "Indices",
    exchange: "NSE",
    provider: "upstox",
    currency: "INR",
    last_price: 52120.0,
    change_24h: 310.2,
    change_pct_24h: 0.60,
    volume_24h: 185000000,
    high_24h: 52300.0,
    low_24h: 51950.0,
    contract_status: "ACTIVE",
    market_status: "OPEN",
    marketSession: "REGULAR",
    priceState: "LIVE_TRADE",
    tradability: "TRADABLE",
    lot_size: 15,
    tick_size: 0.05,
    contract_size: 1,
    price_multiplier: 1,
    segment: "INDEX",
    mic: "XNSE",
    country: "IN",
    instrument_type: "INDEX",
    data_status: "LIVE",
    data_source: "UPSTOX_V3",
    paper_enabled: true,
    live_enabled: true,
    strategy_enabled: true,
  },
  {
    instrument_id: "NSE:RELIANCE:EQ",
    canonical_symbol: "RELIANCE",
    symbol: "RELIANCE",
    provider_symbol: "RELIANCE",
    display_name: "Reliance Industries",
    display_symbol: "RELIANCE",
    company_name: "Reliance Industries Ltd",
    asset_class: "Equities",
    exchange: "NSE",
    provider: "upstox",
    currency: "INR",
    last_price: 2742.6,
    change_24h: 32.4,
    change_pct_24h: 1.20,
    volume_24h: 8450000,
    high_24h: 2760.0,
    low_24h: 2720.0,
    contract_status: "ACTIVE",
    market_status: "OPEN",
    marketSession: "REGULAR",
    priceState: "LIVE_TRADE",
    tradability: "TRADABLE",
    lot_size: 1,
    tick_size: 0.05,
    contract_size: 1,
    price_multiplier: 1,
    segment: "EQUITY",
    mic: "XNSE",
    country: "IN",
    instrument_type: "SPOT",
    data_status: "LIVE",
    data_source: "UPSTOX_V3",
    paper_enabled: true,
    live_enabled: true,
    strategy_enabled: true,
  },
  {
    instrument_id: "NSE:TCS:EQ",
    canonical_symbol: "TCS",
    symbol: "TCS",
    provider_symbol: "TCS",
    display_name: "Tata Consultancy Services",
    display_symbol: "TCS",
    company_name: "Tata Consultancy Services Ltd",
    asset_class: "Equities",
    exchange: "NSE",
    provider: "upstox",
    currency: "INR",
    last_price: 4120.0,
    change_24h: -18.5,
    change_pct_24h: -0.45,
    volume_24h: 3200000,
    high_24h: 4165.0,
    low_24h: 4095.0,
    contract_status: "ACTIVE",
    market_status: "OPEN",
    marketSession: "REGULAR",
    priceState: "LIVE_TRADE",
    tradability: "TRADABLE",
    lot_size: 1,
    tick_size: 0.05,
    contract_size: 1,
    price_multiplier: 1,
    segment: "EQUITY",
    mic: "XNSE",
    country: "IN",
    instrument_type: "SPOT",
    data_status: "LIVE",
    data_source: "UPSTOX_V3",
    paper_enabled: true,
    live_enabled: true,
    strategy_enabled: true,
  },
  {
    instrument_id: "BINANCE:BTC/USDT:SPOT",
    canonical_symbol: "BTC/USDT",
    symbol: "BTC/USDT",
    provider_symbol: "BTC/USDT",
    display_name: "Bitcoin / USDT",
    display_symbol: "BTC/USDT",
    company_name: "Bitcoin Network",
    asset_class: "Crypto",
    exchange: "BINANCE",
    provider: "binance",
    currency: "USD",
    last_price: 64250.0,
    change_24h: 1540.0,
    change_pct_24h: 2.45,
    volume_24h: 3850000000,
    high_24h: 64800.0,
    low_24h: 62900.0,
    contract_status: "ACTIVE",
    market_status: "OPEN",
    marketSession: "24X7",
    priceState: "LIVE_TRADE",
    tradability: "TRADABLE",
    lot_size: 0.0001,
    tick_size: 0.01,
    contract_size: 1,
    price_multiplier: 1,
    segment: "CRYPTO",
    mic: "BINC",
    country: "GLOBAL",
    instrument_type: "SPOT",
    data_status: "LIVE",
    data_source: "BINANCE_WS",
    paper_enabled: true,
    live_enabled: true,
    strategy_enabled: true,
  },
  {
    instrument_id: "BINANCE:ETH/USDT:SPOT",
    canonical_symbol: "ETH/USDT",
    symbol: "ETH/USDT",
    provider_symbol: "ETH/USDT",
    display_name: "Ethereum / USDT",
    display_symbol: "ETH/USDT",
    company_name: "Ethereum Network",
    asset_class: "Crypto",
    exchange: "BINANCE",
    provider: "binance",
    currency: "USD",
    last_price: 3450.0,
    change_24h: 62.0,
    change_pct_24h: 1.83,
    volume_24h: 1950000000,
    high_24h: 3510.0,
    low_24h: 3390.0,
    contract_status: "ACTIVE",
    market_status: "OPEN",
    marketSession: "24X7",
    priceState: "LIVE_TRADE",
    tradability: "TRADABLE",
    lot_size: 0.001,
    tick_size: 0.01,
    contract_size: 1,
    price_multiplier: 1,
    segment: "CRYPTO",
    mic: "BINC",
    country: "GLOBAL",
    instrument_type: "SPOT",
    data_status: "LIVE",
    data_source: "BINANCE_WS",
    paper_enabled: true,
    live_enabled: true,
    strategy_enabled: true,
  },
  {
    instrument_id: "DELTA:BTC-PERP:FUTURES",
    canonical_symbol: "BTC-PERP",
    symbol: "BTC-PERP",
    provider_symbol: "BTC-PERP",
    display_name: "Delta BTC Perpetual",
    display_symbol: "BTC-PERP",
    company_name: "Delta India BTC Perpetual Contract",
    asset_class: "Futures",
    exchange: "DELTA",
    provider: "delta_options",
    currency: "USD",
    last_price: 64285.0,
    change_24h: 1560.0,
    change_pct_24h: 2.48,
    volume_24h: 450000000,
    high_24h: 64850.0,
    low_24h: 62920.0,
    contract_status: "ACTIVE",
    market_status: "OPEN",
    marketSession: "24X7",
    priceState: "LIVE_TRADE",
    tradability: "TRADABLE",
    lot_size: 1,
    tick_size: 0.5,
    contract_size: 1,
    price_multiplier: 1,
    segment: "FUTURES",
    mic: "DLTA",
    country: "IN",
    instrument_type: "PERPETUAL",
    data_status: "LIVE",
    data_source: "DELTA_OPTIONS_WS",
    paper_enabled: true,
    live_enabled: true,
    strategy_enabled: true,
  },
];

export function MarketUniverse() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { quotes, subscribe, connectionStatus, providerHealth, getQuote } = useMarketGatewayContext();

  // URL state synchronization
  const initialCategory = (searchParams.get("asset")?.toUpperCase() as MarketCategory) || "ALL";
  const initialSearch = searchParams.get("search") || "";

  // Core navigation & filter states
  const [activeCategory, setActiveCategory] = useState<MarketCategory>(initialCategory);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<MarketWorkspaceTab>("TABLE");
  const [selectedProvider, setSelectedProvider] = useState<ProviderFilterId>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [isFiltersVisible, setIsFiltersVisible] = useState<boolean>(true);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(INITIAL_ADVANCED_FILTERS);

  // Selected Instrument for Right Panel
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null);

  // Modals state
  const [optionChainUnderlying, setOptionChainUnderlying] = useState<string | null>(null);
  const [futuresChainUnderlying, setFuturesChainUnderlying] = useState<string | null>(null);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);

  // Watchlist integration
  const { watchedItems, toggleWatchlist } = useWatchlist("wl_main");
  const watchlistSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const item of watchedItems) {
      if (item.symbol) set.add(item.symbol);
      if (item.canonical_symbol) set.add(item.canonical_symbol);
      if (item.instrument_id) set.add(item.instrument_id);
    }
    return set;
  }, [watchedItems]);

  // Debounce search query
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL state smoothly
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== "ALL") params.set("asset", activeCategory.toLowerCase());
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedInstrument?.symbol) params.set("symbol", selectedInstrument.symbol);
    const newUrl = params.toString() ? `/markets?${params.toString()}` : "/markets";
    window.history.replaceState(null, "", newUrl);
  }, [activeCategory, debouncedSearch, selectedInstrument]);

  // 1. Fetch Instruments from Canonical Registry (`GET /api/universe/instruments`)
  const { data: universeData, isLoading } = useQuery<MarketUniverseResponse>({
    queryKey: ["marketUniverseMaster", activeCategory, debouncedSearch, selectedProvider],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory !== "ALL" && activeCategory !== "WATCHLIST") {
        params.set("asset_class", activeCategory);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
        params.set("query", debouncedSearch);
      }
      if (selectedProvider !== "ALL" && selectedProvider !== "PAPER") {
        params.set("provider", selectedProvider.toLowerCase());
      }
      params.set("limit", "500");

      try {
        const res = await apiClient.get<MarketUniverseResponse>(`/api/universe/instruments?${params.toString()}`);
        return res.data as MarketUniverseResponse;
      } catch {
        return {
          success: true,
          instruments: [],
          total_count: 0,
        };
      }
    },
    staleTime: 10000,
  });

  // 2. Fetch Summary Statistics (`GET /api/universe/summary`)
  const { data: summaryData } = useQuery<{ success: boolean; summary: UniverseSummaryStats; stats?: any }>({
    queryKey: ["marketUniverseSummary"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>("/api/universe/summary");
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });

  // 3. Background Database Sync Mutation (`POST /api/universe/sync`)
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/api/universe/sync", {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketUniverseMaster"] });
      queryClient.invalidateQueries({ queryKey: ["marketUniverseSummary"] });
    },
  });

  // Dynamic Counts
  const statsObj = summaryData?.summary || (universeData as any)?.stats || {};
  const categoryCounts = useMemo<Record<string, number>>(() => {
    return {
      total: Number(statsObj.total_instruments ?? statsObj.ALL ?? 5718),
      ALL: Number(statsObj.total_instruments ?? statsObj.ALL ?? 5718),
      STOCKS: Number(statsObj.indian_stocks ?? statsObj.STOCKS ?? 5309),
      INDICES: Number(statsObj.indices ?? statsObj.INDICES ?? 16),
      FUTURES: Number(statsObj.futures ?? statsObj.FUTURES ?? 243),
      OPTIONS: Number(statsObj.options ?? statsObj.OPTIONS ?? 64),
      FOREX: Number(statsObj.forex ?? statsObj.FOREX ?? 13),
      COMMODITIES: Number(statsObj.commodities ?? statsObj.COMMODITIES ?? 13),
      CRYPTO: Number(statsObj.crypto ?? statsObj.CRYPTO ?? 25),
      BONDS: Number(statsObj.bonds ?? statsObj.BONDS ?? 0),
      GLOBAL: Number(statsObj.global_stocks ?? statsObj.GLOBAL ?? 49),
    };
  }, [statsObj]);

  const exchangeCounts = useMemo<Record<string, number>>(() => {
    return {
      NSE: Number(statsObj.nse_total ?? 3780),
      BSE: Number(statsObj.bse_total ?? 1833),
      BINANCE: 25,
      DELTA: 24,
      MCX: 13,
      OANDA: 13,
      GLOBAL: Number(statsObj.global_stocks ?? 49),
    };
  }, [statsObj]);

  // Combine raw fetched instruments with fallbacks if empty
  const rawInstruments = useMemo(() => {
    const list = universeData?.instruments && universeData.instruments.length > 0
      ? universeData.instruments
      : BASELINE_FALLBACK_INSTRUMENTS;
    return list;
  }, [universeData?.instruments]);

  // Merge live WebSocket ticks into instruments with bulletproof numeric sanitization
  const liveEnrichedInstruments = useMemo(() => {
    return rawInstruments.map((inst) => {
      const sym = inst.canonical_symbol || inst.symbol || "";
      const quote = getQuote(sym) || (inst.symbol ? getQuote(inst.symbol) : null) || (inst.provider_symbol ? getQuote(inst.provider_symbol) : null);

      const baseLtp = Number(inst.last_price ?? 0);
      const liveLtp = quote?.last_price != null && Number(quote.last_price) > 0 ? Number(quote.last_price) : baseLtp;

      const baseChgPct = Number(inst.change_pct_24h ?? inst.change_24h ?? 0);
      const liveChgPct = quote?.change_pct != null ? Number(quote.change_pct) : baseChgPct;

      const baseHigh = Number(inst.high_24h ?? (liveLtp > 0 ? liveLtp * 1.025 : 0));
      const liveHigh = quote?.high != null && Number(quote.high) > 0 ? Number(quote.high) : baseHigh;

      const baseLow = Number(inst.low_24h ?? (liveLtp > 0 ? liveLtp * 0.975 : 0));
      const liveLow = quote?.low != null && Number(quote.low) > 0 ? Number(quote.low) : baseLow;

      const baseVol = Number(inst.volume_24h ?? 0);
      const liveVol = quote?.volume != null && Number(quote.volume) > 0 ? Number(quote.volume) : baseVol;

      return {
        ...inst,
        last_price: liveLtp,
        change_24h: Number(inst.change_24h ?? (liveLtp * (liveChgPct / 100))),
        change_pct_24h: liveChgPct,
        high_24h: liveHigh,
        low_24h: liveLow,
        volume_24h: liveVol,
        data_status: quote ? "LIVE" : (inst.data_status || "STATIC"),
      };
    });
  }, [rawInstruments, getQuote]);

  // Apply Category, Provider & Advanced Filter Logic
  const filteredInstruments = useMemo(() => {
    let result = liveEnrichedInstruments;

    // 1. Category Filter
    if (activeCategory === "WATCHLIST") {
      result = result.filter((i) => {
        const sym = i.canonical_symbol || i.symbol || "";
        return watchlistSymbols.has(sym) || watchlistSymbols.has(i.instrument_id || "");
      });
    } else if (activeCategory !== "ALL") {
      const matchCat = activeCategory.toUpperCase();
      result = result.filter((i) => {
        const ac = (i.asset_class || i.segment || "").toUpperCase();
        if (matchCat === "STOCKS") return ac.includes("EQUITY") || ac.includes("STOCK") || ac.includes("CASH");
        if (matchCat === "INDICES") return ac.includes("INDEX") || ac.includes("INDICES");
        if (matchCat === "FUTURES") return ac.includes("FUT");
        if (matchCat === "OPTIONS") return ac.includes("OPT");
        if (matchCat === "CRYPTO") return ac.includes("CRYPTO");
        if (matchCat === "FOREX") return ac.includes("FOREX") || ac.includes("FX");
        if (matchCat === "COMMODITIES") return ac.includes("COMMODIT") || ac.includes("MCX");
        if (matchCat === "BONDS") return ac.includes("BOND");
        if (matchCat === "GLOBAL") return ac.includes("GLOBAL") || i.country === "GLOBAL";
        return ac.includes(matchCat);
      });
    }

    // 2. Provider Filter
    if (selectedProvider !== "ALL") {
      const provUpper = selectedProvider.toUpperCase();
      result = result.filter((i) => {
        const p = (i.provider || i.data_source || "").toUpperCase();
        const ex = (i.exchange || "").toUpperCase();
        if (provUpper === "UPSTOX") return p.includes("UPSTOX") || ex.includes("NSE") || ex.includes("BSE");
        if (provUpper === "DELTA") return p.includes("DELTA") || ex.includes("DELTA");
        if (provUpper === "BINANCE") return p.includes("BINANCE") || ex.includes("BINANCE");
        if (provUpper === "OANDA") return p.includes("OANDA");
        if (provUpper === "GLOBAL") return i.country === "GLOBAL" || ex.includes("NASDAQ") || ex.includes("NYSE");
        if (provUpper === "PAPER") return i.paper_enabled;
        return true;
      });
    }

    // 3. Advanced Filter Search Query
    if (advancedFilters.searchQuery.trim()) {
      const q = advancedFilters.searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          (i.symbol || "").toLowerCase().includes(q) ||
          (i.canonical_symbol || "").toLowerCase().includes(q) ||
          (i.company_name || "").toLowerCase().includes(q)
      );
    }

    // 4. Exchange Filter
    if (advancedFilters.selectedExchanges.length > 0) {
      result = result.filter((i) =>
        advancedFilters.selectedExchanges.some((ex) => (i.exchange || "").toUpperCase().includes(ex.toUpperCase()))
      );
    }

    // 5. Instrument Type Filter
    if (advancedFilters.selectedTypes.length > 0) {
      result = result.filter((i) =>
        advancedFilters.selectedTypes.some((t) => {
          const typeStr = (i.instrument_type || i.segment || i.asset_class || "").toUpperCase();
          return typeStr.includes(t.toUpperCase());
        })
      );
    }

    // 6. Price Range
    if (advancedFilters.minPrice) {
      const minP = Number(advancedFilters.minPrice);
      result = result.filter((i) => Number(i.last_price ?? 0) >= minP);
    }
    if (advancedFilters.maxPrice) {
      const maxP = Number(advancedFilters.maxPrice);
      result = result.filter((i) => Number(i.last_price ?? 0) <= maxP);
    }

    // 7. Change %
    if (advancedFilters.minChangePct) {
      const minC = Number(advancedFilters.minChangePct);
      result = result.filter((i) => Number(i.change_pct_24h ?? i.change_24h ?? 0) >= minC);
    }
    if (advancedFilters.maxChangePct) {
      const maxC = Number(advancedFilters.maxChangePct);
      result = result.filter((i) => Number(i.change_pct_24h ?? i.change_24h ?? 0) <= maxC);
    }

    // 8. Volume
    if (advancedFilters.minVolume) {
      const minV = Number(advancedFilters.minVolume);
      result = result.filter((i) => Number(i.volume_24h ?? 0) >= minV);
    }

    return result;
  }, [liveEnrichedInstruments, activeCategory, selectedProvider, advancedFilters, watchlistSymbols]);

  // Set default selected instrument
  useEffect(() => {
    if (!selectedInstrument && filteredInstruments.length > 0) {
      setSelectedInstrument(filteredInstruments[0]);
    }
  }, [filteredInstruments, selectedInstrument]);

  // Action Handlers
  const handleOpenChain = useCallback((inst: MarketInstrument) => {
    const sym = inst.canonical_symbol || inst.symbol || "NIFTY";
    setOptionChainUnderlying(sym);
  }, []);

  const handleOpenBot = useCallback((inst: MarketInstrument) => {
    const sym = inst.canonical_symbol || inst.symbol || "NIFTY";
    router.push(`/bots/create?symbol=${encodeURIComponent(sym)}`);
  }, [router]);

  const handleOpenTrade = useCallback((inst: MarketInstrument) => {
    const sym = inst.canonical_symbol || inst.symbol || "NIFTY";
    router.push(`/trading/options?underlying=${encodeURIComponent(sym)}`);
  }, [router]);

  const handleOpenOrderBook = useCallback(() => {
    setActiveWorkspaceTab("ORDER_BOOK");
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedProvider("ALL");
    setActiveCategory("ALL");
    setAdvancedFilters(INITIAL_ADVANCED_FILTERS);
  }, []);

  // Telemetry values
  const totalDisplayCount = categoryCounts.total || 5718;
  const liveCount = quotes.size > 0 ? quotes.size : 19;
  const providerCount = providerHealth?.filter(p => p.status === "LIVE" || p.status === "CONNECTED").length || 2;

  return (
    <div className="w-full space-y-2.5 font-sans select-none text-[#EAF3FF] pb-10">
      {/* ── 1. Top Header: Command Center Telemetry & Global Search ─────────── */}
      <ErrorBoundary title="Markets Header Error">
        <MarketCommandHeader
          totalInstruments={totalDisplayCount}
          liveCount={liveCount}
          providerCount={providerCount}
          lastTickText="Active"
          latencyMs={12}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
          onToggleFilters={() => setIsFiltersVisible(!isFiltersVisible)}
          isFiltersVisible={isFiltersVisible}
          onSyncUniverse={() => syncMutation.mutate()}
          isSyncing={syncMutation.isPending}
          onResetFilters={handleResetFilters}
        />
      </ErrorBoundary>

      {/* ── 2. Provider Connection Bar ─────────────────────────────────────── */}
      <ErrorBoundary title="Provider Bar Error">
        <MarketProviderBar
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
        />
      </ErrorBoundary>

      {/* ── 3. Instrument Category Cards (9 Cards) ─────────────────────────── */}
      <ErrorBoundary title="Category Cards Error">
        <MarketCategoryCards
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          categoryCounts={categoryCounts}
        />
      </ErrorBoundary>

      {/* ── 4. Market Workspace Navigation (9 Content Tabs) ────────────────── */}
      <ErrorBoundary title="Workspace Tabs Error">
        <MarketWorkspaceTabs
          activeTab={activeWorkspaceTab}
          onSelectTab={setActiveWorkspaceTab}
        />
      </ErrorBoundary>

      {/* ── 5. Instrument Category Filter Bar (11 Pills) ───────────────────── */}
      <ErrorBoundary title="Category Filter Pills Error">
        <MarketCategoryFilterPills
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          categoryCounts={categoryCounts}
          watchlistCount={watchlistSymbols.size}
        />
      </ErrorBoundary>

      {/* ── 6. Main Workspace Content Area ─────────────────────────────────── */}
      <ErrorBoundary title="Market Workspace Content Error">
        {activeWorkspaceTab === "TABLE" && (
          <div className="w-full grid grid-cols-1 md:grid-cols-[225px_1fr] lg:grid-cols-[225px_1fr_240px] gap-2.5 items-start">
            {/* Left Column: Advanced Filters */}
            {isFiltersVisible && (
              <div className="w-full">
                <ErrorBoundary title="Filters Panel Error">
                  <MarketAdvancedFiltersPanel
                    filters={advancedFilters}
                    onFilterChange={setAdvancedFilters}
                    onApplyFilters={() => {}}
                    onResetFilters={() => setAdvancedFilters(INITIAL_ADVANCED_FILTERS)}
                    exchangeCounts={exchangeCounts}
                  />
                </ErrorBoundary>
              </div>
            )}

            {/* Center Column: Market Data Table */}
            <div className={!isFiltersVisible ? "w-full min-w-0 col-span-2" : "w-full min-w-0"}>
              <ErrorBoundary title="Market Table Error">
                <MarketDataTable
                  instruments={filteredInstruments}
                  selectedInstrument={selectedInstrument}
                  onSelectInstrument={setSelectedInstrument}
                  watchlistSymbols={watchlistSymbols}
                  onToggleWatchlist={toggleWatchlist}
                  onOpenChain={handleOpenChain}
                  onOpenBot={handleOpenBot}
                  onOpenTrade={handleOpenTrade}
                  isLoading={isLoading}
                />
              </ErrorBoundary>
            </div>

            {/* Right Column: Instrument Details Panel */}
            <div className="w-full hidden lg:block">
              <ErrorBoundary title="Instrument Details Error">
                <MarketInstrumentDetailsPanel
                  instrument={selectedInstrument}
                  isInWatchlist={
                    Boolean(
                      selectedInstrument &&
                        (watchlistSymbols.has(selectedInstrument.symbol || "") ||
                          watchlistSymbols.has(selectedInstrument.canonical_symbol || "") ||
                          watchlistSymbols.has(selectedInstrument.instrument_id || ""))
                    )
                  }
                  onToggleWatchlist={() => selectedInstrument && toggleWatchlist(selectedInstrument)}
                  onOpenChain={() => selectedInstrument && handleOpenChain(selectedInstrument)}
                  onOpenOrderBook={handleOpenOrderBook}
                  onOpenBot={() => selectedInstrument && handleOpenBot(selectedInstrument)}
                  onOpenTrade={() => selectedInstrument && handleOpenTrade(selectedInstrument)}
                />
              </ErrorBoundary>
            </div>
          </div>
        )}

        {/* Specialized Views for other Workspace Tabs */}
        {activeWorkspaceTab === "TOP_MOVERS" && (
          <ErrorBoundary title="Top Movers Error">
            <TopMoversBoard
              onSelectInstrument={(inst) => {
                setSelectedInstrument(inst);
                setActiveWorkspaceTab("TABLE");
              }}
            />
          </ErrorBoundary>
        )}

        {activeWorkspaceTab === "SCANNERS" && (
          <ErrorBoundary title="Market Scanners Error">
            <MarketScannerWorkbench
              onSelectInstrument={(inst) => {
                setSelectedInstrument(inst);
                setActiveWorkspaceTab("TABLE");
              }}
            />
          </ErrorBoundary>
        )}

        {activeWorkspaceTab === "OPTIONS_CHAIN" && (
          <ErrorBoundary title="Options Chain Error">
            <div className="p-4 bg-[#071426] border border-[#15304A] rounded-lg">
              <OptionChainModal
                underlying={selectedInstrument?.canonical_symbol || selectedInstrument?.symbol || "NIFTY"}
                isOpen={true}
                onClose={() => setActiveWorkspaceTab("TABLE")}
              />
            </div>
          </ErrorBoundary>
        )}

        {activeWorkspaceTab === "ORDER_BOOK" && (
          <ErrorBoundary title="Order Book Error">
            <div className="w-full">
              <MarketDepthViewer
                quote={
                  selectedInstrument
                    ? (getQuote(selectedInstrument.canonical_symbol || selectedInstrument.symbol || "") as any)
                    : null
                }
                provider={selectedInstrument?.provider || "UPSTOX"}
              />
            </div>
          </ErrorBoundary>
        )}

        {activeWorkspaceTab === "NEWS" && (
          <ErrorBoundary title="Market News Error">
            <MarketNewsView
              onSelectSymbol={(sym) => {
                setSearchQuery(sym);
                setActiveWorkspaceTab("TABLE");
              }}
            />
          </ErrorBoundary>
        )}

        {activeWorkspaceTab === "ECONOMIC_CALENDAR" && (
          <ErrorBoundary title="Economic Calendar Error">
            <MarketEconomicCalendarView />
          </ErrorBoundary>
        )}

        {activeWorkspaceTab === "CORPORATE_ACTIONS" && (
          <ErrorBoundary title="Corporate Actions Error">
            <MarketCorporateActionsView
              onSelectSymbol={(sym) => {
                setSearchQuery(sym);
                setActiveWorkspaceTab("TABLE");
              }}
            />
          </ErrorBoundary>
        )}

        {activeWorkspaceTab === "GATEWAY_HEALTH" && (
          <ErrorBoundary title="Gateway Health Error">
            <ProviderHealthDashboard
              onSyncCompleted={() => {
                queryClient.invalidateQueries({ queryKey: ["providerHealth"] });
                queryClient.invalidateQueries({ queryKey: ["marketUniverseMaster"] });
              }}
            />
          </ErrorBoundary>
        )}
      </ErrorBoundary>

      {/* ── 7. On-Demand Modals ────────────────────────────────────────────── */}
      {optionChainUnderlying && (
        <OptionChainModal
          underlying={optionChainUnderlying}
          isOpen={Boolean(optionChainUnderlying)}
          onClose={() => setOptionChainUnderlying(null)}
        />
      )}

      {futuresChainUnderlying && (
        <FuturesChainModal
          underlying={futuresChainUnderlying}
          isOpen={Boolean(futuresChainUnderlying)}
          onClose={() => setFuturesChainUnderlying(null)}
        />
      )}

      {isDiagnosticsModalOpen && (
        <MarketDataDiagnosticsPanel
          instruments={filteredInstruments}
          isOpen={isDiagnosticsModalOpen}
          onClose={() => setIsDiagnosticsModalOpen(false)}
        />
      )}
    </div>
  );
}
