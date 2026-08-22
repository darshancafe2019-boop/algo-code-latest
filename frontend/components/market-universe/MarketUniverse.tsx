"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import {
  MarketUniverseResponse,
  MarketInstrument,
  UniverseSummaryStats,
  UserWatchlist,
} from "@/types/market-universe";
import { GlobalMarketStatusBar } from "./GlobalMarketStatusBar";
import { GlobalMarketClock } from "./GlobalMarketClock";
import { MarketCategoryNavigation } from "./MarketCategoryNavigation";
import { WatchlistManagerBar } from "./WatchlistManagerBar";
import { ContextualActionBar } from "./ContextualActionBar";
import { GlobalMarketCommandTable } from "./GlobalMarketCommandTable";
import { TopMoversBoard } from "./TopMoversBoard";
import { GlobalMarketHeatmap } from "./GlobalMarketHeatmap";
import { MarketScannerWorkbench } from "./MarketScannerWorkbench";
import { OptionsCommandCenter } from "./OptionsCommandCenter";
import { FuturesCommandCenter } from "./FuturesCommandCenter";
import { InstrumentDetailDrawer } from "./InstrumentDetailDrawer";
import { OptionChainModal } from "./OptionChainModal";
import { FuturesChainModal } from "./FuturesChainModal";
import { MarketSkeleton } from "./MarketSkeleton";
import { ErrorBoundary } from "../ErrorBoundary";

export function MarketUniverse() {
  const queryClient = useQueryClient();
  const [, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState<MarketInstrument | null>(null);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>("wl_main");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [optionChainUnderlying, setOptionChainUnderlying] = useState<string | null>(null);
  const [futuresChainUnderlying, setFuturesChainUnderlying] = useState<string | null>(null);
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set(["BTC/USDT", "NIFTY", "ETH/USDT", "RELIANCE", "AAPL"]));

  // 1. Fetch Instruments from Canonical Registry (`GET /api/universe/instruments`)
  const {
    data: universeData,
    isLoading,
    error,
  } = useQuery<MarketUniverseResponse>({
    queryKey: ["marketUniverseMaster", activeCategory, searchQuery],
    queryFn: async () => {
      const assetClassParam =
        activeCategory === "CRYPTO"
          ? "Crypto"
          : activeCategory === "INDIA" || activeCategory === "GLOBAL INDICES"
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

  // 2. Fetch User Watchlists (`GET /api/universe/watchlists`)
  const { data: watchlistsData } = useQuery<{ status: string; watchlists: UserWatchlist[] }>({
    queryKey: ["userWatchlistsMaster"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; watchlists: UserWatchlist[] }>("/api/universe/watchlists", {
        timeoutMs: 6000,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load user watchlists");
      return res.data as { status: string; watchlists: UserWatchlist[] };
    },
    staleTime: 6000,
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });

  const watchlists = useMemo(() => {
    return Array.isArray(watchlistsData?.watchlists) ? watchlistsData.watchlists : [];
  }, [watchlistsData]);

  // 3. Fetch Universe Summary Stats (`GET /api/universe/summary`)
  const { data: summaryData } = useQuery<{ status: string; summary: UniverseSummaryStats }>({
    queryKey: ["universeSummaryStats"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; summary: UniverseSummaryStats }>("/api/universe/summary", {
        timeoutMs: 6000,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to load summary stats");
      return res.data as { status: string; summary: UniverseSummaryStats };
    },
    staleTime: 6000,
    refetchInterval: 12000,
    placeholderData: (prev) => prev,
  });

  // 4. Sync Universe Mutation (`POST /api/universe/sync`)
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

  // 5. Add / Remove Watchlist Item Mutation
  const toggleWatchlistMutation = useMutation({
    mutationFn: async (inst: MarketInstrument) => {
      const sym = inst.canonical_symbol || inst.symbol || inst.instrument_id;
      const isWatched = watchlistSymbols.has(sym) || watchlistSymbols.has(inst.instrument_id);

      const endpoint = isWatched ? "/api/universe/watchlists/remove" : "/api/universe/watchlists/add";
      const res = await apiClient.post(endpoint, {
        watchlist_id: activeWatchlistId,
        instrument_id: inst.instrument_id,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to toggle watchlist");
      return { isWatched, sym, instId: inst.instrument_id };
    },
    onSuccess: ({ isWatched, sym, instId }) => {
      setWatchlistSymbols((prev) => {
        const next = new Set(prev);
        if (isWatched) {
          next.delete(sym);
          next.delete(instId);
        } else {
          next.add(sym);
          next.add(instId);
        }
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["userWatchlistsMaster"] });
    },
  });

  const rawInstruments: MarketInstrument[] = useMemo(() => {
    return Array.isArray(universeData?.instruments) ? universeData.instruments : [];
  }, [universeData]);

  // Filter for watchlist if in WATCHLISTS mode
  const displayedInstruments = useMemo(() => {
    if (activeCategory === "WATCHLISTS") {
      const activeWl = watchlists.find((w) => w.id === activeWatchlistId);
      if (activeWl && activeWl.items && activeWl.items.length > 0) {
        return activeWl.items;
      }
      return rawInstruments.filter(
        (i) =>
          watchlistSymbols.has(i.canonical_symbol) ||
          watchlistSymbols.has(i.provider_symbol) ||
          watchlistSymbols.has(i.symbol || "") ||
          watchlistSymbols.has(i.instrument_id)
      );
    }
    return rawInstruments;
  }, [rawInstruments, activeCategory, activeWatchlistId, watchlists, watchlistSymbols]);

  // Default active selected instrument
  const activeSelected = selectedInstrument || (displayedInstruments.length > 0 ? displayedInstruments[0] : null);

  const handleOpenAnalysis = (inst: MarketInstrument) => {
    setSelectedInstrument(inst);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-4 font-sans select-none text-slate-100 pb-12">
      {/* 1. GLOBAL MARKET STATUS BAR */}
      <ErrorBoundary title="Status Bar Error">
        <GlobalMarketStatusBar
          stats={summaryData?.summary}
          isSyncing={syncMutation.isPending}
          onSyncUniverse={() => syncMutation.mutate()}
        />
      </ErrorBoundary>

      {/* 2. GLOBAL MARKET CLOCK */}
      <ErrorBoundary title="Market Clock Error">
        <GlobalMarketClock />
      </ErrorBoundary>

      {/* 3. CATEGORY NAVIGATION & UNIVERSAL SEARCH */}
      <ErrorBoundary title="Category Nav Error">
        <MarketCategoryNavigation
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </ErrorBoundary>

      {/* 4. WATCHLIST MANAGER BAR (Shown in Watchlists tab or by default) */}
      {activeCategory === "WATCHLISTS" && (
        <ErrorBoundary title="Watchlist Manager Error">
          <WatchlistManagerBar
            watchlists={watchlists}
            activeWatchlistId={activeWatchlistId}
            onSelectWatchlist={setActiveWatchlistId}
          />
        </ErrorBoundary>
      )}

      {/* 5. TOP MOVERS VIEW (Shown when in TOP MOVERS tab) */}
      {activeCategory === "TOP MOVERS" && (
        <ErrorBoundary title="Top Movers Error">
          <TopMoversBoard onSelectInstrument={setSelectedInstrument} />
        </ErrorBoundary>
      )}

      {/* 6. GLOBAL HEATMAP VIEW (Shown when in HEATMAP tab) */}
      {activeCategory === "HEATMAP" && (
        <ErrorBoundary title="Heatmap Error">
          <GlobalMarketHeatmap onSelectInstrument={setSelectedInstrument} />
        </ErrorBoundary>
      )}

      {/* 7. SERVER-SIDE QUANTITATIVE SCANNER (Shown when in SCANNER tab) */}
      {activeCategory === "SCANNER" && (
        <ErrorBoundary title="Scanner Error">
          <MarketScannerWorkbench onSelectInstrument={setSelectedInstrument} />
        </ErrorBoundary>
      )}

      {/* 8. DEDICATED DERIVATIVES CENTERS */}
      {activeCategory === "OPTIONS" && (
        <ErrorBoundary title="Options Command Error">
          <OptionsCommandCenter
            underlyingSymbol={activeSelected?.canonical_symbol || "NIFTY"}
          />
        </ErrorBoundary>
      )}

      {activeCategory === "FUTURES" && (
        <ErrorBoundary title="Futures Command Error">
          <FuturesCommandCenter
            underlyingSymbol={activeSelected?.canonical_symbol || "BTC/USDT"}
          />
        </ErrorBoundary>
      )}

      {/* 9. CONTEXTUAL ACTION BAR */}
      <ErrorBoundary title="Action Bar Error">
        <ContextualActionBar
          instrument={activeSelected}
          isInWatchlist={Boolean(
            activeSelected &&
              (watchlistSymbols.has(activeSelected.canonical_symbol) ||
                watchlistSymbols.has(activeSelected.symbol || "") ||
                watchlistSymbols.has(activeSelected.instrument_id))
          )}
          onToggleWatchlist={() => activeSelected && toggleWatchlistMutation.mutate(activeSelected)}
          onOpenAnalysis={() => activeSelected && handleOpenAnalysis(activeSelected)}
          onOpenOptions={setOptionChainUnderlying}
          onOpenFutures={setFuturesChainUnderlying}
        />
      </ErrorBoundary>

      {/* 10. MAIN GLOBAL MARKET COMMAND TABLE */}
      <ErrorBoundary title="Market Command Table Error">
        {isLoading && !universeData ? (
          <MarketSkeleton />
        ) : error && !universeData ? (
          <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-xs text-rose-300 font-mono">
            <span>Failed to load market universe: {(error as Error).message}</span>
          </div>
        ) : (
          <GlobalMarketCommandTable
            instruments={displayedInstruments}
            selectedInstrument={activeSelected}
            onSelectInstrument={setSelectedInstrument}
            onOpenOptions={setOptionChainUnderlying}
            onOpenFutures={setFuturesChainUnderlying}
            onOpenAnalysis={handleOpenAnalysis}
            onToggleWatchlist={(inst) => toggleWatchlistMutation.mutate(inst)}
            watchlistSymbols={watchlistSymbols}
          />
        )}
      </ErrorBoundary>

      {/* 11. SLIDE-OUT 11-TAB INSTRUMENT DETAIL DRAWER */}
      <InstrumentDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        instrument={selectedInstrument}
      />

      {/* 12. MODALS */}
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
    </div>
  );
}
