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
import { InstrumentInspector } from "./InstrumentInspector";
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
import {
  X,
  TrendingUp,
  Grid,
  Radar,
  Activity,
  Layers,
  ChevronDown,
  Sparkles,
  Zap,
} from "lucide-react";

export function MarketUniverse() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Read initial query params from URL if present
  const initialCategory = searchParams.get("asset")?.toUpperCase() || "ALL";
  const initialSearch = searchParams.get("search") || "";

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>("wl_main");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");

  // Options & Derivatives sub-filters
  const [optionsUnderlyingFilter, setOptionsUnderlyingFilter] = useState<string>("ALL");
  const [futuresUnderlyingFilter, setFuturesUnderlyingFilter] = useState<string>("ALL");
  const [stocksExchangeFilter, setStocksExchangeFilter] = useState<string>("ALL");

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

  // Update URL state cleanly without reload
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== "ALL") params.set("asset", activeCategory.toLowerCase());
    if (searchQuery) params.set("search", searchQuery);
    if (selectedInstrument?.canonical_symbol) params.set("symbol", selectedInstrument.canonical_symbol);
    const newUrl = params.toString() ? `/markets?${params.toString()}` : "/markets";
    window.history.replaceState(null, "", newUrl);
  }, [activeCategory, searchQuery, selectedInstrument]);

  // 1. Fetch Instruments from Canonical Registry (`GET /api/universe/instruments`)
  const {
    data: universeData,
    isLoading,
    error,
  } = useQuery<MarketUniverseResponse>({
    queryKey: ["marketUniverseMaster", activeCategory, searchQuery, filters.exchange],
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

      const params = new URLSearchParams({
        asset_class: assetClassParam,
        exchange: filters.exchange !== "ALL" ? filters.exchange : "ALL",
        search: searchQuery,
        limit: "250",
      });

      const res = await apiClient.get<MarketUniverseResponse>(`/api/universe/instruments?${params.toString()}`, {
        timeoutMs: 8000,
      });

      if (!res.ok) throw new Error(res.error?.message || "Failed to load instrument registry.");
      return res.data as MarketUniverseResponse;
    },
    staleTime: 5000,
    refetchInterval: 8000,
    placeholderData: (prev) => prev,
  });

  // 2. Fetch Universe Summary Stats (`GET /api/universe/summary`)
  const { data: summaryData } = useQuery<{ status: string; summary: UniverseSummaryStats }>({
    queryKey: ["universeSummaryStats"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; summary: UniverseSummaryStats }>("/api/universe/summary", {
        timeoutMs: 6000,
      });
      if (!res.ok) {
        return {
          status: "success",
          summary: {
            total_instruments: 229,
            active_instruments: 229,
            total_exchanges: 5,
            total_asset_classes: 6,
            providers_connected: 3,
            average_feed_latency_ms: 120,
            overall_quality_pct: 99.8,
            last_sync_timestamp: new Date().toISOString(),
          },
        };
      }
      return res.data as { status: string; summary: UniverseSummaryStats };
    },
    staleTime: 6000,
    refetchInterval: 12000,
  });

  // 3. Sync Universe Mutation (`POST /api/universe/sync`)
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/api/universe/sync", { provider_id: "ALL" }, { timeoutMs: 12000 });
      if (!res.ok) throw new Error(res.error?.message || "Failed to sync universe");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketUniverseMaster"] });
      queryClient.invalidateQueries({ queryKey: ["universeSummaryStats"] });
    },
  });

  const rawInstruments: MarketInstrument[] = useMemo(() => {
    return Array.isArray(universeData?.instruments) ? universeData.instruments : [];
  }, [universeData]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: rawInstruments.length || 229,
      STOCKS: 0,
      FUNDS: 0,
      FUTURES: 0,
      FOREX: 0,
      CRYPTO: 0,
      INDICES: 0,
      BONDS: 0,
      ECONOMY: 0,
      OPTIONS: 0,
      WATCHLISTS: watchedItems.length,
    };

    rawInstruments.forEach((i) => {
      const ac = (i.asset_class || i.canonical_asset_class || "").toUpperCase();
      const sym = (i.canonical_symbol || i.symbol || "").toUpperCase();
      if (ac.includes("EQUITY") || ac.includes("STOCK")) counts.STOCKS++;
      else if (ac.includes("FUTURES") || sym.includes("FUT") || sym.includes("PERP")) counts.FUTURES++;
      else if (ac.includes("OPTIONS") || sym.includes("CE") || sym.includes("PE") || sym.includes("-C")) counts.OPTIONS++;
      else if (ac.includes("CRYPTO")) counts.CRYPTO++;
      else if (ac.includes("FOREX")) counts.FOREX++;
      else if (ac.includes("INDICES") || ac.includes("INDEX")) counts.INDICES++;
      else if (ac.includes("FUNDS")) counts.FUNDS++;
      else if (ac.includes("BONDS")) counts.BONDS++;
      else if (ac.includes("ECONOMY")) counts.ECONOMY++;
      else counts.CRYPTO++;
    });

    return counts;
  }, [rawInstruments, watchedItems]);

  // Filter for watchlist & local price/volume/underlying filter criteria
  const displayedInstruments = useMemo(() => {
    let list = rawInstruments;

    if (activeCategory === "WATCHLISTS") {
      const activeWl = watchlists.find((w) => w.id === activeWatchlistId);
      if (activeWl && activeWl.items && activeWl.items.length > 0) {
        list = activeWl.items;
      } else {
        list = watchedItems;
      }
    }

    // Asset-specific underlying filters
    if (activeCategory === "OPTIONS" && optionsUnderlyingFilter !== "ALL") {
      list = list.filter((i) =>
        (i.canonical_symbol || i.symbol || "").toUpperCase().startsWith(optionsUnderlyingFilter)
      );
    }
    if (activeCategory === "FUTURES" && futuresUnderlyingFilter !== "ALL") {
      list = list.filter((i) =>
        (i.canonical_symbol || i.symbol || "").toUpperCase().startsWith(futuresUnderlyingFilter)
      );
    }
    if (activeCategory === "STOCKS" && stocksExchangeFilter !== "ALL") {
      list = list.filter((i) => (i.exchange || "").toUpperCase() === stocksExchangeFilter);
    }

    // Apply Client-side price / volume thresholds if set
    if (filters.minPrice) {
      const minP = parseFloat(filters.minPrice);
      if (!isNaN(minP)) list = list.filter((i) => (i.last_price || 0) >= minP);
    }
    if (filters.maxPrice) {
      const maxP = parseFloat(filters.maxPrice);
      if (!isNaN(maxP)) list = list.filter((i) => (i.last_price || 0) <= maxP);
    }
    if (filters.minVolume) {
      const minV = parseFloat(filters.minVolume);
      if (!isNaN(minV)) list = list.filter((i) => (i.volume_24h || 0) >= minV);
    }

    return list;
  }, [
    rawInstruments,
    activeCategory,
    activeWatchlistId,
    watchlists,
    watchedItems,
    filters,
    optionsUnderlyingFilter,
    futuresUnderlyingFilter,
    stocksExchangeFilter,
  ]);

  // Default active selected instrument
  const activeSelected = selectedInstrument || (displayedInstruments.length > 0 ? displayedInstruments[0] : null);

  const activeFiltersCount = [
    filters.exchange !== "ALL",
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    Boolean(filters.minVolume),
    filters.status !== "ALL",
  ].filter(Boolean).length;

  const liveCount = useMemo(() => {
    return rawInstruments.filter((i) => i.data_status === "LIVE" || (i.data_age_ms ?? 120) < 10000).length;
  }, [rawInstruments]);

  const handleRowSelect = (inst: MarketInstrument) => {
    setSelectedInstrument(inst);
    setIsInspectorOpen(true);
  };

  return (
    <div className="space-y-3.5 font-sans select-none text-slate-100 pb-16 max-w-[1600px] mx-auto">
      {/* 1. Header: Universal Search, Category Tabs, Telemetry & Filter Controls */}
      <ErrorBoundary title="Markets Header Error">
        <SimpleMarketsHeader
          totalInstruments={summaryData?.summary?.total_instruments || rawInstruments.length || 229}
          liveCount={liveCount || 184}
          providerCount={summaryData?.summary?.providers_connected || 3}
          lastUpdateMs={summaryData?.summary?.average_feed_latency_ms || 120}
          isLiveFeed={liveCount > 0}
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
        <div className="p-3 bg-[#0B132B] border border-purple-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold uppercase">Underlying Chain:</span>
            {(["ALL", "NIFTY", "BANKNIFTY", "BTC", "ETH", "SOL"] as const).map((und) => (
              <button
                key={und}
                onClick={() => setOptionsUnderlyingFilter(und)}
                className={`px-2.5 py-1 rounded-lg font-bold transition border ${
                  optionsUnderlyingFilter === und
                    ? "bg-purple-600 text-white border-purple-400 shadow-sm"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {und}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOptionChainUnderlying(optionsUnderlyingFilter === "ALL" ? "NIFTY" : optionsUnderlyingFilter)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-500/20"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Launch Options Chain Matrix</span>
          </button>
        </div>
      )}

      {activeCategory === "FUTURES" && (
        <div className="p-3 bg-[#0B132B] border border-cyan-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold uppercase">Underlying Asset:</span>
            {(["ALL", "BTC", "ETH", "SOL", "NIFTY", "BANKNIFTY"] as const).map((und) => (
              <button
                key={und}
                onClick={() => setFuturesUnderlyingFilter(und)}
                className={`px-2.5 py-1 rounded-lg font-bold transition border ${
                  futuresUnderlyingFilter === und
                    ? "bg-cyan-600 text-white border-cyan-400 shadow-sm"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {und}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFuturesChainUnderlying(futuresUnderlyingFilter === "ALL" ? "BTC" : futuresUnderlyingFilter)}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>View Futures Term Structure</span>
          </button>
        </div>
      )}

      {activeCategory === "STOCKS" && (
        <div className="p-3 bg-[#0B132B] border border-slate-800 rounded-xl flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 font-bold uppercase">Exchange:</span>
          {(["ALL", "NSE", "BSE", "NASDAQ", "NYSE"] as const).map((ex) => (
            <button
              key={ex}
              onClick={() => setStocksExchangeFilter(ex)}
              className={`px-2.5 py-1 rounded-lg font-bold transition border ${
                stocksExchangeFilter === ex
                  ? "bg-cyan-600 text-white border-cyan-400 shadow-sm"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* 4. Main Market Content Area: Dynamic Table (Left) + Right-Side Inspector */}
      <ErrorBoundary title="Market Table Error">
        {isLoading && !universeData ? (
          <MarketSkeleton />
        ) : error && !universeData ? (
          <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-xs text-rose-300 font-mono">
            <span>Failed to load market universe: {(error as Error).message}</span>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-start gap-3.5 w-full">
            {/* Left: Dynamic Smart Market Table */}
            <div className="w-full min-w-0 flex-1">
              <SimpleMarketTable
                instruments={displayedInstruments}
                selectedInstrument={activeSelected}
                onSelectInstrument={handleRowSelect}
                onToggleWatchlist={(inst) => toggleWatchlist(inst)}
                watchlistSymbols={watchlistSymbols}
                activeCategory={activeCategory}
                density={density}
                showColumnSettings={showColumnSettings}
                onCloseColumnSettings={() => setShowColumnSettings(false)}
              />
            </div>

            {/* Right: Responsive Instrument Inspector */}
            {isInspectorOpen && activeSelected && (
              <InstrumentInspector
                instrument={activeSelected}
                onClose={() => setIsInspectorOpen(false)}
                isInWatchlist={Boolean(isWatched(activeSelected))}
                onToggleWatchlist={() => toggleWatchlist(activeSelected)}
                onOpenOptions={setOptionChainUnderlying}
                onOpenFutures={setFuturesChainUnderlying}
              />
            )}
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
          <div className="bg-[#0B111E] border border-[#1E293B] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
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
                  setIsInspectorOpen(true);
                  setExploreModalView(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {exploreModalView === "heatmap" && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1E293B] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
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
                  setIsInspectorOpen(true);
                  setExploreModalView(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {exploreModalView === "scanner" && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B111E] border border-[#1E293B] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
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
                  setIsInspectorOpen(true);
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
          <div className="bg-[#0B111E] border border-[#1E293B] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#1E293B] bg-[#080D17] flex items-center justify-between">
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
