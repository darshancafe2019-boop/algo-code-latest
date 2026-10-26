"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  MarketUniverseResponse,
  MarketInstrument,
  UniverseSummaryStats,
} from "@/types/market-universe";

import { SimpleMarketsHeader } from "./SimpleMarketsHeader";
import { SimpleMarketClock } from "./SimpleMarketClock";
import { SimpleMarketTable } from "./SimpleMarketTable";
import { MarketFilterDrawer, MarketFilterState } from "./MarketFilterDrawer";
import { OptionChainModal } from "./OptionChainModal";
import { FuturesChainModal } from "./FuturesChainModal";
import { TopMoversBoard } from "./TopMoversBoard";
import { GlobalMarketHeatmap } from "./GlobalMarketHeatmap";
import { MarketScannerWorkbench } from "./MarketScannerWorkbench";
import { ProviderHealthDashboard } from "./ProviderHealthDashboard";
import { MarketDataDiagnosticsPanel } from "./MarketDataDiagnosticsPanel";
import { MarketSkeleton } from "./MarketSkeleton";
import { ErrorBoundary } from "../ErrorBoundary";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { StocksUniverseView } from "@/src/features/markets/stocks";
import { MarketStreamObservatory } from "./MarketStreamObservatory";
import { MarketDepthViewer } from "./MarketDepthViewer";
import {
  X,
  TrendingUp,
  Grid,
  Radar,
  Activity,
  Layers,
  Zap,
} from "lucide-react";

export const BASELINE_FALLBACK_INSTRUMENTS: MarketInstrument[] = (
  [
    {
      instrument_id: "BINANCE:BTC/USDT:SPOT",
      canonical_symbol: "BINANCE:BTC/USDT",
      symbol: "BINANCE:BTC/USDT",
      provider_symbol: "BTC/USDT",
      display_name: "Bitcoin / USDT",
      display_symbol: "BTC/USDT",
      company_name: "Bitcoin Network",
      asset_class: "Crypto",
      exchange: "Binance",
      provider: "binance",
      currency: "USD",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "OPEN",
      marketSession: "24X7",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 0.0001,
    },
    {
      instrument_id: "BINANCE:ETH/USDT:SPOT",
      canonical_symbol: "BINANCE:ETH/USDT",
      symbol: "BINANCE:ETH/USDT",
      provider_symbol: "ETH/USDT",
      display_name: "Ethereum / USDT",
      display_symbol: "ETH/USDT",
      company_name: "Ethereum Network",
      asset_class: "Crypto",
      exchange: "Binance",
      provider: "binance",
      currency: "USD",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "OPEN",
      marketSession: "24X7",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 0.001,
    },
    {
      instrument_id: "BINANCE:SOL/USDT:SPOT",
      canonical_symbol: "BINANCE:SOL/USDT",
      symbol: "BINANCE:SOL/USDT",
      provider_symbol: "SOL/USDT",
      display_name: "Solana / USDT",
      display_symbol: "SOL/USDT",
      company_name: "Solana Network",
      asset_class: "Crypto",
      exchange: "Binance",
      provider: "binance",
      currency: "USD",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "OPEN",
      marketSession: "24X7",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 0.01,
    },
    {
      instrument_id: "NSE:NIFTY:INDEX",
      canonical_symbol: "NSE:NIFTY",
      symbol: "NIFTY",
      provider_symbol: "NIFTY",
      display_name: "NIFTY 50",
      display_symbol: "NIFTY 50",
      company_name: "NSE NIFTY 50 Index",
      asset_class: "Indices",
      exchange: "NSE",
      provider: "upstox",
      currency: "INR",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "CLOSED",
      marketSession: "CLOSED",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 25,
    },
    {
      instrument_id: "NSE:BANKNIFTY:INDEX",
      canonical_symbol: "NSE:BANKNIFTY",
      symbol: "BANKNIFTY",
      provider_symbol: "BANKNIFTY",
      display_name: "BANK NIFTY",
      display_symbol: "BANK NIFTY",
      company_name: "NSE Bank Nifty Index",
      asset_class: "Indices",
      exchange: "NSE",
      provider: "upstox",
      currency: "INR",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "CLOSED",
      marketSession: "CLOSED",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 15,
    },
    {
      instrument_id: "BSE:SENSEX:INDEX",
      canonical_symbol: "BSE:SENSEX",
      symbol: "SENSEX",
      provider_symbol: "SENSEX",
      display_name: "SENSEX",
      display_symbol: "SENSEX",
      company_name: "BSE SENSEX 30 Index",
      asset_class: "Indices",
      exchange: "BSE",
      provider: "upstox",
      currency: "INR",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "CLOSED",
      marketSession: "CLOSED",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 10,
    },
    {
      instrument_id: "NSE:RELIANCE:EQ",
      canonical_symbol: "NSE:RELIANCE",
      symbol: "RELIANCE",
      provider_symbol: "RELIANCE",
      display_name: "Reliance Industries",
      display_symbol: "RELIANCE",
      company_name: "Reliance Industries Ltd",
      asset_class: "Equities",
      exchange: "NSE",
      provider: "upstox",
      currency: "INR",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "CLOSED",
      marketSession: "CLOSED",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 1,
    },
    {
      instrument_id: "NSE:TCS:EQ",
      canonical_symbol: "NSE:TCS",
      symbol: "TCS",
      provider_symbol: "TCS",
      display_name: "Tata Consultancy Services",
      display_symbol: "TCS",
      company_name: "Tata Consultancy Services Ltd",
      asset_class: "Equities",
      exchange: "NSE",
      provider: "upstox",
      currency: "INR",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "CLOSED",
      marketSession: "CLOSED",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 1,
    },
    {
      instrument_id: "NASDAQ:NVDA:EQ",
      canonical_symbol: "NASDAQ:NVDA",
      symbol: "NVDA",
      provider_symbol: "NVDA",
      display_name: "NVIDIA Corp.",
      display_symbol: "NVDA",
      company_name: "NVIDIA Corporation",
      asset_class: "Global Equities",
      exchange: "NASDAQ",
      provider: "twelve_data",
      currency: "USD",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "OPEN",
      marketSession: "OPEN",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 1,
    },
    {
      instrument_id: "OANDA:EURUSD:FX",
      canonical_symbol: "OANDA:EURUSD",
      symbol: "EURUSD",
      provider_symbol: "EURUSD",
      display_name: "EUR / USD",
      display_symbol: "EUR / USD",
      company_name: "Euro / US Dollar",
      asset_class: "Forex",
      exchange: "OANDA",
      provider: "oanda",
      currency: "USD",
      last_price: null,
      change_24h: null,
      change_pct_24h: null,
      volume_24h: null,
      high_24h: null,
      low_24h: null,
      contract_status: "ACTIVE",
      market_status: "OPEN",
      marketSession: "24X7",
      priceState: "NO_DATA",
      tradability: "TRADABLE",
      lot_size: 1000,
    },
  ] as Partial<MarketInstrument>[]
).map((p) => ({
  mic: "XOFF",
  country: "GLOBAL",
  instrument_type: "SPOT",
  lot_size: 1,
  tick_size: 0.01,
  contract_size: 1,
  price_multiplier: 1,
  segment: "EQUITY",
  market_status: "OPEN",
  tradability: "TRADABLE",
  data_status: "CONNECTING",
  data_source: "SYSTEM_CORE",
  contract_status: "ACTIVE",
  paper_enabled: true,
  live_enabled: false,
  strategy_enabled: true,
  ...p,
})) as MarketInstrument[];

export function MarketUniverse() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { quotes, subscribe, unsubscribe, connectionStatus, providerHealth, getQuote } = useMarketGatewayContext();

  // Read initial query params from URL if present
  const initialCategory = searchParams.get("asset")?.toUpperCase() || "ALL";
  const initialSearch = searchParams.get("search") || "";

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [activeView, setActiveView] = useState<"TABLE" | "TOP_MOVERS" | "HEATMAP" | "STREAM" | "DEPTH" | "DIAGNOSTICS">("TABLE");
  const [selectedProvider, setSelectedProvider] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>("wl_main");
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");

  // Options & Derivatives sub-filters
  const [optionsUnderlyingFilter, setOptionsUnderlyingFilter] = useState<string>("ALL");
  const [futuresUnderlyingFilter, setFuturesUnderlyingFilter] = useState<string>("ALL");

  // Drawers and Modals
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [exploreModalView, setExploreModalView] = useState<"top_movers" | "heatmap" | "scanner" | null>(null);

  // Derivatives modals
  const [optionChainUnderlying, setOptionChainUnderlying] = useState<string | null>(null);
  const [futuresChainUnderlying, setFuturesChainUnderlying] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<MarketFilterState>({
    exchange: "ALL",
    minPrice: "",
    maxPrice: "",
    minVolume: "",
    status: "ALL",
  });

  const handleResetAllFilters = () => {
    setSearchQuery("");
    setSelectedProvider("ALL");
    setFilters({
      exchange: "ALL",
      minPrice: "",
      maxPrice: "",
      minVolume: "",
      status: "ALL",
    });
    setOptionsUnderlyingFilter("ALL");
    setFuturesUnderlyingFilter("ALL");
    if (activeCategory === "WATCHLISTS" || activeCategory === "WATCHLIST") {
      setActiveCategory("ALL");
    }
  };

  // Watchlist Hook
  const {
    watchlists,
    activeWatchlist,
    watchedItems,
    isWatched,
    toggleWatchlist,
  } = useWatchlist(activeWatchlistId);

  const watchlistSymbols = useMemo(() => {
    const set = new Set<string>();
    for (const it of watchedItems) {
      if (it.instrument_id) set.add(it.instrument_id);
      if (it.canonical_symbol) set.add(it.canonical_symbol);
      if (it.provider_symbol) set.add(it.provider_symbol);
      if (it.symbol) set.add(it.symbol);
    }
    return set;
  }, [watchedItems]);

  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL state cleanly without reload
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== "ALL") params.set("asset", activeCategory.toLowerCase());
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedInstrument?.canonical_symbol) params.set("symbol", selectedInstrument.canonical_symbol);
    const newUrl = params.toString() ? `/markets?${params.toString()}` : "/markets";
    window.history.replaceState(null, "", newUrl);
  }, [activeCategory, debouncedSearch, selectedInstrument]);

  // 1. Fetch Instruments from Canonical Registry (`GET /api/universe/instruments`)
  const {
    data: universeData,
    isLoading,
    error,
  } = useQuery<MarketUniverseResponse>({
    queryKey: ["marketUniverseMaster", activeCategory, debouncedSearch, filters.exchange],
    queryFn: async () => {
      const assetClassParam =
        activeCategory === "CRYPTO"
          ? "Crypto"
          : activeCategory === "INDICES"
          ? "Indices"
          : activeCategory === "STOCKS"
          ? "Equities"
          : activeCategory === "GLOBAL"
          ? "Global"
          : activeCategory === "FUNDS"
          ? "Funds"
          : activeCategory === "BONDS"
          ? "Bonds"
          : activeCategory === "ECONOMY"
          ? "Economy"
          : activeCategory === "FOREX"
          ? "Forex"
          : activeCategory === "COMMODITIES"
          ? "Commodities"
          : activeCategory === "OPTIONS"
          ? "Options"
          : activeCategory === "FUTURES"
          ? "Futures"
          : "ALL";

      const params = new URLSearchParams();
      if (assetClassParam !== "ALL") params.set("asset_class", assetClassParam);
      if (debouncedSearch) params.set("query", debouncedSearch);
      if (filters.exchange !== "ALL") params.set("exchange", filters.exchange);
      params.set("limit", "1500");

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
  const { data: summaryData } = useQuery<{ success: boolean; summary: UniverseSummaryStats }>({
    queryKey: ["marketUniverseSummary"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ success: boolean; summary: UniverseSummaryStats }>("/api/universe/summary");
        return res.data as { success: boolean; summary: UniverseSummaryStats };
      } catch {
        return {
          success: false,
          summary: {
            total_instruments: 0,
            asset_classes_covered: 0,
            active_markets: 0,
            providers_connected: 0,
            average_feed_latency_ms: 0,
            timestamp: new Date().toISOString(),
          },
        };
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

  // 4. WebSocket Active Subscriptions Management
  const rawInstruments = useMemo(() => {
    if (universeData?.instruments && universeData.instruments.length > 0) {
      return universeData.instruments;
    }
    if (debouncedSearch) {
      return [];
    }
    if (activeCategory === "ALL") return BASELINE_FALLBACK_INSTRUMENTS;
    return BASELINE_FALLBACK_INSTRUMENTS.filter(
      (it) => it.asset_class?.toUpperCase() === activeCategory || (activeCategory === "STOCKS" && it.asset_class === "Equities")
    );
  }, [universeData, debouncedSearch, activeCategory]);

  // Authoritative category counts utilizing server statistics with client fallback
  const categoryCounts = useMemo(() => {
    const s = (summaryData?.summary as any) || {};
    const counts: Record<string, number> = {
      ALL: s.total_instruments ?? s.ALL ?? rawInstruments.length,
      STOCKS: s.indian_stocks ?? s.STOCKS ?? 0,
      INDICES: s.indices ?? s.INDICES ?? 0,
      GLOBAL: s.global_stocks ?? s.GLOBAL ?? 0,
      FUTURES: s.futures ?? s.FUTURES ?? 0,
      OPTIONS: s.options ?? s.OPTIONS ?? 0,
      CRYPTO: s.crypto ?? s.CRYPTO ?? 0,
      FOREX: s.forex ?? s.FOREX ?? 0,
      COMMODITIES: s.commodities ?? s.COMMODITIES ?? 0,
      BONDS: s.bonds ?? s.BONDS ?? 0,
    };
    counts["WATCHLISTS"] = watchlistSymbols.size;
    counts["WATCHLIST"] = watchlistSymbols.size;
    return counts;
  }, [summaryData, rawInstruments.length, watchlistSymbols]);

  const displayedInstruments = useMemo(() => {
    let list = [...rawInstruments];

    if (activeCategory === "WATCHLISTS" || activeCategory === "WATCHLIST") {
      list = list.filter(
        (it) =>
          watchlistSymbols.has(it.canonical_symbol) ||
          watchlistSymbols.has(it.instrument_id) ||
          watchlistSymbols.has(it.symbol || "")
      );
    } else if (activeCategory === "OPTIONS") {
      list = list.filter((it) => {
        if (optionsUnderlyingFilter === "ALL") return true;
        const sym = it.canonical_symbol || it.symbol || "";
        return sym.toUpperCase().startsWith(optionsUnderlyingFilter);
      });
    } else if (activeCategory === "FUTURES") {
      list = list.filter((it) => {
        if (futuresUnderlyingFilter === "ALL") return true;
        const sym = it.canonical_symbol || it.symbol || "";
        return sym.toUpperCase().startsWith(futuresUnderlyingFilter);
      });
    }

    // Provider filter
    if (selectedProvider !== "ALL") {
      const pFilter = selectedProvider.toLowerCase();
      list = list.filter((it) => {
        const prov = (it.provider || "").toLowerCase();
        const ex = (it.exchange || "").toLowerCase();
        if (pFilter === "upstox" || pFilter === "dhan") return prov.includes("upstox") || ex === "upstox" || prov.includes("dhan") || ex === "nse" || ex === "bse";
        if (pFilter === "delta") return prov.includes("delta") || ex === "delta";
        if (pFilter === "binance") return prov.includes("binance") || ex === "binance";
        if (pFilter === "oanda") return prov.includes("oanda") || ex === "oanda";
        if (pFilter === "paper") return prov.includes("paper") || ex === "paper";
        if (pFilter === "global") return prov.includes("global") || ex === "nasdaq" || ex === "nyse";
        return true;
      });
    }

    // Price range filters
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      if (!isNaN(min)) list = list.filter((it) => (it.last_price || 0) >= min);
    }
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      if (!isNaN(max)) list = list.filter((it) => (it.last_price || 0) <= max);
    }

    // Volume filter
    if (filters.minVolume) {
      const minV = parseFloat(filters.minVolume);
      if (!isNaN(minV)) list = list.filter((it) => (it.volume_24h || 0) >= minV);
    }

    // Status filter
    if (filters.status !== "ALL") {
      list = list.filter((it) => it.market_status === filters.status);
    }

    return list;
  }, [
    rawInstruments,
    activeCategory,
    selectedProvider,
    optionsUnderlyingFilter,
    futuresUnderlyingFilter,
    filters,
    watchlistSymbols,
  ]);

  // Dynamically subscribe to ALL currently displayed market universe symbols (No arbitrary 80 limit)
  useEffect(() => {
    if (displayedInstruments.length === 0) return;
    const symbolsToSub = displayedInstruments
      .map((it) => it.canonical_symbol || it.provider_symbol || it.symbol)
      .filter((s): s is string => Boolean(s));

    const uniqueSymbols = Array.from(new Set(symbolsToSub));

    uniqueSymbols.forEach((sym) => subscribe(sym, "WATCHLIST"));
    return () => {
      uniqueSymbols.forEach((sym) => unsubscribe(sym, "WATCHLIST"));
    };
  }, [displayedInstruments, subscribe, unsubscribe]);

  const activeFiltersCount = [
    filters.exchange !== "ALL",
    selectedProvider !== "ALL",
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    Boolean(filters.minVolume),
    filters.status !== "ALL",
  ].filter(Boolean).length;

  const healthyProviders = useMemo(() => {
    const active = new Set<string>();
    
    // Check providerHealth returned from backend/gateway
    if (providerHealth && providerHealth.length > 0) {
      providerHealth.forEach((p) => {
        const s = (p.status || "").toUpperCase();
        if (s === "LIVE" || s === "CONNECTED" || s === "OK" || s === "READY" || s === "AUTHENTICATED" || s === "PUBLIC_FEED") {
          active.add(p.provider_name?.toUpperCase() || p.provider_id.toUpperCase());
        }
      });
    }

    // Also check live quotes from store
    quotes.forEach((q) => {
      if (q && q.last_price && q.last_price > 0 && !q.is_stale) {
        const p = q.provider.toLowerCase();
        if (p.includes("upstox") || p.includes("dhan")) active.add("UPSTOX");
        else if (p.includes("delta")) active.add("DELTA");
        else if (p.includes("binance")) active.add("BINANCE");
        else if (p.includes("oanda")) active.add("OANDA");
      }
    });

    return active;
  }, [providerHealth, quotes]);

  const providerCount = healthyProviders.size;

  const { liveCount, newestTickElapsedMs, averageFeedLatencyMs } = useMemo(() => {
    let live = 0;
    let maxTs = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    const now = Date.now();

    displayedInstruments.forEach((inst) => {
      const sym = inst.canonical_symbol || inst.symbol || inst.provider_symbol || "";
      if (sym) {
        const q = getQuote(sym, inst.exchange, inst.provider);
        if (q && q.last_price != null && q.last_price > 0) {
          const tsStr = q.event_timestamp || q.received_timestamp;
          if (tsStr) {
            const ms = new Date(tsStr).getTime();
            if (!isNaN(ms) && ms > maxTs) {
              maxTs = ms;
            }
          }
          const ageSec = q.age_seconds ?? (now - new Date(q.event_timestamp || q.received_timestamp).getTime()) / 1000;
          if (!q.is_stale && ageSec <= 5) {
            live++;
          }
          if (q.feed_latency_ms != null && q.feed_latency_ms >= 0) {
            totalLatency += q.feed_latency_ms;
            latencyCount++;
          }
        }
      }
    });

    const elapsed = maxTs > 0 ? Math.max(0, now - maxTs) : 0;
    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

    return {
      liveCount: live,
      newestTickElapsedMs: elapsed,
      averageFeedLatencyMs: avgLatency,
    };
  }, [displayedInstruments, quotes, getQuote]);

  const feedStatus = useMemo((): "LIVE" | "PARTIAL" | "RECONNECTING" | "STALE" | "OFFLINE" | "POLLING" | "GATEWAY_NOT_CONFIGURED" => {
    if (connectionStatus === "GATEWAY_NOT_CONFIGURED") return "GATEWAY_NOT_CONFIGURED";
    if (connectionStatus === "RECONNECTING" || connectionStatus === "CONNECTING") return "RECONNECTING";
    if (connectionStatus === "DISCONNECTED" && providerCount === 0) return "OFFLINE";
    if (connectionStatus === "CONNECTED" || connectionStatus === "LIVE") {
      return liveCount > 0 ? "LIVE" : "PARTIAL";
    }
    if (connectionStatus === "STALE") return "STALE";
    return "POLLING";
  }, [connectionStatus, providerCount, liveCount]);

  const handleLaunchOptionChainDirect = (underlying: string, exchange?: string, provider?: string) => {
    const params = new URLSearchParams({ underlying });
    if (exchange) params.append("exchange", exchange);
    if (provider) params.append("provider", provider);
    router.push(`/trading/options?${params.toString()}`);
  };

  const handleLaunchTradeDirect = (inst: MarketInstrument) => {
    const sym = inst.canonical_symbol || inst.symbol || "NIFTY";
    router.push(`/trading/options?underlying=${encodeURIComponent(sym)}`);
  };

  return (
    <div className="w-full space-y-5 font-sans select-none text-slate-100 pb-12">
      {/* 1. Header: Universal Search, Category Tabs, Telemetry & Filter Controls */}
      <ErrorBoundary title="Markets Header Error">
        <SimpleMarketsHeader
          totalInstruments={
            activeCategory === "ALL"
              ? (summaryData?.summary?.total_instruments || universeData?.total_count || displayedInstruments.length)
              : (categoryCounts[activeCategory] || displayedInstruments.length)
          }
          liveCount={liveCount}
          providerCount={providerCount}
          lastUpdateMs={newestTickElapsedMs}
          averageLatencyMs={averageFeedLatencyMs}
          isLiveFeed={liveCount > 0 && (connectionStatus === "CONNECTED" || connectionStatus === "LIVE")}
          feedStatus={feedStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          categoryCounts={categoryCounts}
          activeView={activeView}
          onSelectView={setActiveView}
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
          onOpenExplore={(view) => setExploreModalView(view)}
          onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
          onOpenColumnSettings={() => setShowColumnSettings(true)}
          onSyncUniverse={() => syncMutation.mutate()}
          isSyncing={syncMutation.isPending}
          activeFiltersCount={activeFiltersCount}
          density={density}
          onChangeDensity={setDensity}
        />
      </ErrorBoundary>

      {/* 2. Compact Market Session Status Bar */}
      <ErrorBoundary title="Market Clock Error">
        <SimpleMarketClock
          selectedMarket={filters.exchange !== "ALL" ? filters.exchange : undefined}
          onSelectMarket={(mkt) => {
            if (mkt === "CRYPTO") setActiveCategory("CRYPTO");
            else setFilters((prev) => ({ ...prev, exchange: prev.exchange === mkt ? "ALL" : mkt }));
          }}
        />
      </ErrorBoundary>

      {/* 3. Asset-Specific Sub-Filter Controls */}
      {activeCategory === "OPTIONS" && (
        <div className="p-3.5 bg-[#0B132B] border border-purple-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-[13px] font-mono">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-purple-400 font-bold uppercase">Underlying Chain:</span>
            {(["ALL", "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "RELIANCE", "BTC", "ETH"] as const).map((und) => (
              <button
                key={und}
                onClick={() => setOptionsUnderlyingFilter(und)}
                className={`px-3 py-1.5 rounded-lg font-bold transition border ${
                  optionsUnderlyingFilter === und
                    ? "bg-purple-600 text-white border-purple-400 shadow-sm"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                }`}
              >
                {und}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleLaunchOptionChainDirect(optionsUnderlyingFilter === "ALL" ? "NIFTY" : optionsUnderlyingFilter)}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-2 shadow-md shadow-purple-500/20"
          >
            <Layers className="w-4 h-4" />
            <span>Launch Direct Option Chain</span>
          </button>
        </div>
      )}

      {activeCategory === "FUTURES" && (
        <div className="p-3.5 bg-[#0B132B] border border-cyan-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-[13px] font-mono">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-cyan-400 font-bold uppercase">Underlying Asset:</span>
            {(["ALL", "BTC", "ETH", "SOL", "NIFTY", "BANKNIFTY"] as const).map((und) => (
              <button
                key={und}
                onClick={() => setFuturesUnderlyingFilter(und)}
                className={`px-3 py-1.5 rounded-lg font-bold transition border ${
                  futuresUnderlyingFilter === und
                    ? "bg-cyan-600 text-white border-cyan-400 shadow-sm"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                }`}
              >
                {und}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFuturesChainUnderlying(futuresUnderlyingFilter === "ALL" ? "BTC" : futuresUnderlyingFilter)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center gap-2 shadow-md shadow-cyan-500/20"
          >
            <Zap className="w-4 h-4" />
            <span>View Futures Term Structure</span>
          </button>
        </div>
      )}

      {/* 4. Main Market Content Area: Dynamic Sub-Views */}
      <ErrorBoundary title="Market Main View Error">
        {isLoading && !universeData ? (
          <MarketSkeleton />
        ) : error && !universeData ? (
          <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-xs text-rose-300 font-mono">
            <span>Failed to load market universe: {(error as Error).message}</span>
          </div>
        ) : activeView === "TOP_MOVERS" ? (
          <div className="w-full bg-[#0B111E] border border-slate-800 rounded-2xl p-4">
            <TopMoversBoard
              onSelectInstrument={(inst) => {
                setSelectedInstrument(inst);
                setActiveView("TABLE");
              }}
            />
          </div>
        ) : activeView === "HEATMAP" ? (
          <div className="w-full bg-[#0B111E] border border-slate-800 rounded-2xl p-4">
            <GlobalMarketHeatmap
              onSelectInstrument={(inst) => {
                setSelectedInstrument(inst);
                setActiveView("TABLE");
              }}
            />
          </div>
        ) : activeView === "STREAM" ? (
          <div className="w-full">
            <MarketStreamObservatory />
          </div>
        ) : activeView === "DEPTH" ? (
          <div className="w-full">
            <MarketDepthViewer
              quote={
                selectedInstrument
                  ? (getQuote(
                      selectedInstrument.canonical_symbol || selectedInstrument.symbol || "",
                      selectedInstrument.exchange,
                      selectedInstrument.provider
                    ) as any)
                  : (quotes.get("NIFTY") || quotes.get("BTCUSDT") || null as any)
              }
              provider={selectedInstrument?.provider || (selectedInstrument?.exchange === "DELTA" ? "DELTA" : "UPSTOX")}
            />
          </div>
        ) : activeView === "DIAGNOSTICS" ? (
          <div className="w-full bg-[#0B111E] border border-slate-800 rounded-2xl p-4">
            <ProviderHealthDashboard
              onSyncCompleted={() => {
                queryClient.invalidateQueries({ queryKey: ["providerHealth"] });
                queryClient.invalidateQueries({ queryKey: ["marketUniverseMaster"] });
              }}
            />
          </div>
        ) : activeCategory === "STOCKS" ? (
          <div className="w-full min-w-0">
            <StocksUniverseView />
          </div>
        ) : (
          <div className="w-full min-w-0">
            <SimpleMarketTable
              instruments={displayedInstruments}
              selectedInstrument={selectedInstrument}
              onSelectInstrument={setSelectedInstrument}
              onToggleWatchlist={(inst) => toggleWatchlist(inst)}
              watchlistSymbols={watchlistSymbols}
              activeCategory={activeCategory}
              density={density}
              showColumnSettings={showColumnSettings}
              onCloseColumnSettings={() => setShowColumnSettings(false)}
              onOpenOptions={handleLaunchOptionChainDirect}
              onOpenTrade={handleLaunchTradeDirect}
              onResetFilters={handleResetAllFilters}
            />
          </div>
        )}
      </ErrorBoundary>

      {/* --------------------------------------------------------------------- */}
      {/* On-Demand Modals & Drawers */}
      {/* --------------------------------------------------------------------- */}

      {/* Filter Drawer */}
      <MarketFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={() =>
          setFilters({
            exchange: "ALL",
            minPrice: "",
            maxPrice: "",
            minVolume: "",
            status: "ALL",
          })
        }
      />

      {/* Options Chain Modal */}
      {optionChainUnderlying && (
        <OptionChainModal
          underlying={optionChainUnderlying}
          isOpen={Boolean(optionChainUnderlying)}
          onClose={() => setOptionChainUnderlying(null)}
        />
      )}

      {/* Futures Chain Modal */}
      {futuresChainUnderlying && (
        <FuturesChainModal
          underlying={futuresChainUnderlying}
          isOpen={Boolean(futuresChainUnderlying)}
          onClose={() => setFuturesChainUnderlying(null)}
        />
      )}

      {/* Explore View Modals */}
      {exploreModalView === "top_movers" && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1A2A3F] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1A2A3F] bg-[#080D17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white font-sans">Top Market Movers</h3>
              </div>
              <button
                onClick={() => setExploreModalView(null)}
                className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-y-auto">
              <TopMoversBoard
                onSelectInstrument={(inst) => {
                  setSelectedInstrument(inst);
                  setExploreModalView(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {exploreModalView === "heatmap" && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1A2A3F] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1A2A3F] bg-[#080D17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-sans">Global Market Heatmap</h3>
              </div>
              <button
                onClick={() => setExploreModalView(null)}
                className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-y-auto">
              <GlobalMarketHeatmap
                onSelectInstrument={(inst) => {
                  setSelectedInstrument(inst);
                  setExploreModalView(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {exploreModalView === "scanner" && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1A2A3F] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1A2A3F] bg-[#080D17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white font-sans">Quantitative Market Scanner</h3>
              </div>
              <button
                onClick={() => setExploreModalView(null)}
                className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-y-auto">
              <MarketScannerWorkbench
                onSelectInstrument={(inst) => {
                  setSelectedInstrument(inst);
                  setExploreModalView(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Feed Diagnostics Panel */}
      <MarketDataDiagnosticsPanel
        instruments={displayedInstruments.length > 0 ? displayedInstruments : rawInstruments}
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
      />
    </div>
  );
}
