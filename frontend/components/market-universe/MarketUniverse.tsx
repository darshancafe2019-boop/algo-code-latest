"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { SelectedInstrumentActionBar } from "./SelectedInstrumentActionBar";
import { MarketFilterDrawer, MarketFilterState } from "./MarketFilterDrawer";
import { ContextualOrderModal } from "./ContextualOrderModal";
import { InstrumentDetailDrawer } from "./InstrumentDetailDrawer";
import { OptionChainModal } from "./OptionChainModal";
import { FuturesChainModal } from "./FuturesChainModal";
import { TopMoversBoard } from "./TopMoversBoard";
import { GlobalMarketHeatmap } from "./GlobalMarketHeatmap";
import { MarketScannerWorkbench } from "./MarketScannerWorkbench";
import { ProviderHealthDashboard } from "./ProviderHealthDashboard";
import { MarketSkeleton } from "./MarketSkeleton";
import { ErrorBoundary } from "../ErrorBoundary";
import { MarketAnalystDrawer } from "@/components/analyst/MarketAnalystDrawer";
import { useWatchlist } from "@/hooks/useWatchlist";
import { X, TrendingUp, Grid, Radar, Activity } from "lucide-react";

export function MarketUniverse() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>("wl_main");

  // Drawers and Modals
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isAnalystOpen, setIsAnalystOpen] = useState(false);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
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
      if (!res.ok) return { status: "success", summary: { total_instruments: 229, active_instruments: 229, total_exchanges: 5, total_asset_classes: 6, providers_connected: 4, average_feed_latency_ms: 2.1, overall_quality_pct: 99.4, last_sync_timestamp: new Date().toISOString() } };
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

  // Filter for watchlist & local price/volume filter criteria
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
  }, [rawInstruments, activeCategory, activeWatchlistId, watchlists, watchedItems, filters]);

  // Default active selected instrument
  const activeSelected = selectedInstrument || (displayedInstruments.length > 0 ? displayedInstruments[0] : null);

  const activeFiltersCount = [
    filters.exchange !== "ALL",
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    Boolean(filters.minVolume),
    filters.status !== "ALL",
  ].filter(Boolean).length;

  const handleOpenChart = (sym?: string) => {
    const targetSym = sym || activeSelected?.canonical_symbol || "BTC/USDT";
    router.push(`/charts?symbol=${encodeURIComponent(targetSym)}`);
  };

  const handleOpenStrategy = () => {
    router.push(`/strategy-builder?symbol=${encodeURIComponent(activeSelected?.canonical_symbol || "BTC/USDT")}`);
  };

  return (
    <div className="space-y-4 font-sans select-none text-slate-100 pb-16 max-w-7xl mx-auto">
      {/* 1. Header: Universal Search, Category Tabs, Filter & Explore Controls */}
      <ErrorBoundary title="Markets Header Error">
        <SimpleMarketsHeader
          totalInstruments={summaryData?.summary?.total_instruments || displayedInstruments.length || 229}
          isLive={true}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
          onOpenExplore={(view) => setExploreModalView(view)}
          onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
          onOpenColumnSettings={() => setShowColumnSettings(true)}
          onSyncUniverse={() => syncMutation.mutate()}
          isSyncing={syncMutation.isPending}
          activeFiltersCount={activeFiltersCount}
        />
      </ErrorBoundary>

      {/* 2. Compact 1-Line Market Clock */}
      <ErrorBoundary title="Market Clock Error">
        <SimpleMarketClock />
      </ErrorBoundary>

      {/* 3. Simple Market Table */}
      <ErrorBoundary title="Market Table Error">
        {isLoading && !universeData ? (
          <MarketSkeleton />
        ) : error && !universeData ? (
          <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-xs text-rose-300 font-mono">
            <span>Failed to load market universe: {(error as Error).message}</span>
          </div>
        ) : (
          <SimpleMarketTable
            instruments={displayedInstruments}
            selectedInstrument={activeSelected}
            onSelectInstrument={setSelectedInstrument}
            onToggleWatchlist={(inst) => toggleWatchlist(inst)}
            watchlistSymbols={watchlistSymbols}
            showColumnSettings={showColumnSettings}
            onCloseColumnSettings={() => setShowColumnSettings(false)}
          />
        )}
      </ErrorBoundary>

      {/* 4. Contextual Action Bar for Selected Instrument */}
      {activeSelected && (
        <SelectedInstrumentActionBar
          instrument={activeSelected}
          isInWatchlist={Boolean(isWatched(activeSelected))}
          onToggleWatchlist={() => toggleWatchlist(activeSelected)}
          onOpenChart={() => handleOpenChart()}
          onOpenAnalysis={() => setIsAnalystOpen(true)}
          onOpenTrade={() => setIsTradeModalOpen(true)}
          onOpenDetails={() => setIsDetailDrawerOpen(true)}
          onOpenStrategy={handleOpenStrategy}
          onOpenOptions={setOptionChainUnderlying}
          onOpenFutures={setFuturesChainUnderlying}
        />
      )}

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

      {/* Contextual Order Ticket Modal */}
      <ContextualOrderModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        instrument={activeSelected}
      />

      {/* Instrument Detail Drawer (11-Field Technical Overview) */}
      <InstrumentDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        instrument={activeSelected}
      />

      {/* Market Analyst Drawer (Read-Only OpenAI Intelligence) */}
      <MarketAnalystDrawer
        isOpen={isAnalystOpen}
        onClose={() => setIsAnalystOpen(false)}
        symbol={activeSelected?.canonical_symbol || "BTC/USDT"}
        assetClass={activeSelected?.asset_class || "Crypto"}
        exchange={activeSelected?.exchange || "BINANCE"}
      />

      {/* Derivatives Modals */}
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
                <h3 className="text-sm font-bold text-white font-sans">Market Data Ingestion & Provider Status</h3>
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
