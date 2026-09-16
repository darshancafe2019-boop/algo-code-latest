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
import { MarketSkeleton } from "./MarketSkeleton";
import { ErrorBoundary } from "../ErrorBoundary";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useMarketGatewayContext } from "@/context/MarketGatewayContext";
import { StocksUniverseView } from "@/src/features/markets/stocks";
import {
  X,
  TrendingUp,
  Grid,
  Radar,
  Activity,
  Layers,
  Zap,
} from "lucide-react";

export function MarketUniverse() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { quotes, subscribe, unsubscribe, connectionStatus, providerHealth, getQuote } = useMarketGatewayContext();

  // Read initial query params from URL if present
  const initialCategory = searchParams.get("asset")?.toUpperCase() || "ALL";
  const initialSearch = searchParams.get("search") || "";

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
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
      params.set("limit", "150");

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
          success: true,
          summary: {
            total_instruments: 229,
            asset_classes_covered: 10,
            active_markets: 7,
            providers_connected: 3,
            average_feed_latency_ms: 120,
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
    return universeData?.instruments || [];
  }, [universeData]);

  useEffect(() => {
    if (rawInstruments.length === 0) return;
    const symbolsToSub = rawInstruments
      .slice(0, 30)
      .map((it) => it.canonical_symbol || it.provider_symbol || it.symbol)
      .filter((s): s is string => Boolean(s));

    symbolsToSub.forEach((sym) => subscribe(sym, "WATCHLIST"));
    return () => {
      symbolsToSub.forEach((sym) => unsubscribe(sym, "WATCHLIST"));
    };
  }, [rawInstruments, subscribe, unsubscribe]);

  // Client-side Filtering & Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: rawInstruments.length };
    for (const it of rawInstruments) {
      const cls = it.asset_class?.toUpperCase() || "OTHER";
      counts[cls] = (counts[cls] || 0) + 1;
    }
    counts["WATCHLISTS"] = watchlistSymbols.size;
    return counts;
  }, [rawInstruments, watchlistSymbols]);

  const displayedInstruments = useMemo(() => {
    let list = [...rawInstruments];

    if (activeCategory === "WATCHLISTS") {
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
    optionsUnderlyingFilter,
    futuresUnderlyingFilter,
    filters,
    watchlistSymbols,
  ]);

  const activeFiltersCount = [
    filters.exchange !== "ALL",
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
        const status = (p.status || "").toUpperCase();
        const isOk = ["LIVE", "UP", "ACTIVE", "READY", "AUTHENTICATED", "PUBLIC_FEED"].includes(status);
        if (isOk) {
          const id = (p.provider_id || "").toLowerCase();
          if (id.includes("dhan")) active.add("DHAN");
          else if (id.includes("upstox")) active.add("UPSTOX");
          else if (id.includes("delta")) active.add("DELTA");
          else if (id.includes("binance")) active.add("BINANCE");
        }
      });
    }

    // Also check active quotes
    quotes.forEach((q) => {
      if (q && !q.is_stale && (q.age_seconds ?? 0) < 60) {
        const p = (q.provider || "").toLowerCase();
        if (p.includes("dhan")) active.add("DHAN");
        else if (p.includes("upstox")) active.add("UPSTOX");
        else if (p.includes("delta")) active.add("DELTA");
        else if (p.includes("binance")) active.add("BINANCE");
      }
    });

    return active;
  }, [providerHealth, quotes]);

  const providerCount = healthyProviders.size;

  const liveCount = useMemo(() => {
    let count = 0;
    rawInstruments.forEach((inst) => {
      const sym = inst.canonical_symbol || inst.symbol || inst.provider_symbol || "";
      const isCrypto = (inst.asset_class || "").toUpperCase() === "CRYPTO" || ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE"].some((c) => sym.toUpperCase().includes(c));
      const isMarketOpen = isCrypto || inst.market_status !== "CLOSED";

      if (sym && isMarketOpen) {
        const q = getQuote(sym) || (inst.symbol ? getQuote(inst.symbol) : null) || (inst.provider_symbol ? getQuote(inst.provider_symbol) : null);
        if (q && !q.last_price && q.last_price !== 0) return;
        if (q && !q.is_stale && (q.age_seconds ?? 0) < 30) {
          count++;
        }
      }
    });
    return count;
  }, [rawInstruments, quotes, getQuote]);

  const feedStatus = useMemo((): "LIVE" | "PARTIAL" | "MARKETS CLOSED" | "RECONNECTING" | "STALE" | "OFFLINE" => {
    if (connectionStatus === "RECONNECTING" || connectionStatus === "CONNECTING") return "RECONNECTING";
    if (providerCount === 0 && connectionStatus === "DISCONNECTED") return "OFFLINE";
    if (liveCount > 0) return "LIVE";
    if (providerCount > 0) {
      if (connectionStatus === "STALE") return "STALE";
      return "MARKETS CLOSED";
    }
    return "STALE";
  }, [connectionStatus, providerCount, liveCount]);

  const averageFeedLatencyMs = useMemo(() => {
    let total = 0;
    let count = 0;
    quotes.forEach((q) => {
      if (q && (q.provider.includes("dhan") || q.provider.includes("delta") || q.provider.includes("upstox") || q.provider.includes("binance"))) {
        if (q.feed_latency_ms != null && q.feed_latency_ms >= 0) {
          total += q.feed_latency_ms;
          count++;
        }
      }
    });
    return count > 0 ? Math.round(total / count) : 0;
  }, [quotes]);

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
    <div className="space-y-3.5 font-sans select-none text-slate-100 pb-16 w-full max-w-[1750px] mx-auto px-2 sm:px-4">
      {/* 1. Header: Universal Search, Category Tabs, Telemetry & Filter Controls */}
      <ErrorBoundary title="Markets Header Error">
        <SimpleMarketsHeader
          totalInstruments={displayedInstruments.length || rawInstruments.length}
          liveCount={liveCount}
          providerCount={providerCount}
          lastUpdateMs={averageFeedLatencyMs}
          isLiveFeed={liveCount > 0 && connectionStatus === "LIVE"}
          feedStatus={feedStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          categoryCounts={categoryCounts}
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

      {/* 4. Main Market Content Area: Unified Full-Width Table */}
      <ErrorBoundary title="Market Table Error">
        {isLoading && !universeData ? (
          <MarketSkeleton />
        ) : error && !universeData ? (
          <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-xs text-rose-300 font-mono">
            <span>Failed to load market universe: {(error as Error).message}</span>
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

      {/* Diagnostics Modal */}
      {isDiagnosticsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1A2A3F] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1A2A3F] bg-[#080D17] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-sans">Market Data Ingestion &amp; Provider Status</h3>
              </div>
              <button
                onClick={() => setIsDiagnosticsModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#141E33] hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-[75vh] overflow-y-auto">
              <ProviderHealthDashboard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
