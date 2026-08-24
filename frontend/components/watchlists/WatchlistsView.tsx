"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Star,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Plus,
  Radio,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  WifiOff,
  Globe,
  Sliders,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { WatchlistStarButton } from "./WatchlistStarButton";
import { MarketInstrument } from "@/types/market-universe";
import { apiClient } from "@/lib/apiClient";
import { useActiveBot } from "@/context/ActiveBotContext";
import Link from "next/link";

interface TickerMap {
  [symbol: string]: {
    last: number;
    change_pct: number;
    high: number;
    low: number;
    volume: number;
    provider: string;
    is_stale: boolean;
    data_status: string;
  };
}

export function WatchlistsView() {
  const {
    activeWatchlist,
    watchedItems,
    watchedCount,
    isWatched,
    removeFromWatchlist,
    addToWatchlist,
    reorderWatchlist,
    clearWatchlist,
    isLoading,
    isError,
    error,
    refetch,
    isMutating,
  } = useWatchlist("wl_main");

  const { setActiveSymbol } = useActiveBot();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssetClass, setFilterAssetClass] = useState("ALL");
  const [sortField, setSortField] = useState<"symbol" | "price" | "change" | "order">("order");
  const [sortAsc, setSortAsc] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [isSearchingAdd, setIsSearchingAdd] = useState(false);
  const [liveTickers, setLiveTickers] = useState<TickerMap>({});

  // 1. Live Market Instrument Search for Quick-Add Bar
  const { data: searchResults, isLoading: isSearchLoading } = useQuery<MarketInstrument[]>({
    queryKey: ["instrumentSearch", addSearchQuery],
    queryFn: async () => {
      if (!addSearchQuery.trim()) return [];
      const res = await apiClient.get<any>(
        `/api/universe/instruments?search=${encodeURIComponent(addSearchQuery.trim())}&limit=8`
      );
      if (!res.ok) return [];
      return (res.data?.instruments || res.data?.data || []) as MarketInstrument[];
    },
    enabled: addSearchQuery.trim().length >= 1,
    staleTime: 10000,
  });

  // 2. Controlled Ticker Fetch for currently watched items
  useEffect(() => {
    if (watchedItems.length === 0) return;

    let isMounted = true;
    const controller = new AbortController();

    async function pollVisibleTickers() {
      try {
        const symbolsToFetch = watchedItems.map(
          (it) => it.canonical_symbol || it.symbol || it.instrument_id
        );
        // Batch poll ticker data for watched items
        const results: TickerMap = {};
        for (const sym of symbolsToFetch.slice(0, 15)) {
          if (!isMounted) break;
          try {
            const res = await fetch(`/api/ticker?symbol=${encodeURIComponent(sym)}`, {
              signal: controller.signal,
              headers: { Accept: "application/json" },
            });
            if (res.ok) {
              const json = await res.json();
              const raw = json.data || json.ticker || json;
              const p = parseFloat(raw.price || raw.last || 0);
              if (p > 0) {
                results[sym] = {
                  last: p,
                  change_pct: parseFloat(raw.change_pct || 0),
                  high: parseFloat(raw.high || p * 1.01),
                  low: parseFloat(raw.low || p * 0.99),
                  volume: parseFloat(raw.volume || 0),
                  provider: raw.provider || "ccxt",
                  is_stale: Boolean(raw.is_stale),
                  data_status: raw.data_status || "LIVE",
                };
              }
            }
          } catch {
            // Ignore individual aborted fetches
          }
        }
        if (isMounted && Object.keys(results).length > 0) {
          setLiveTickers((prev) => ({ ...prev, ...results }));
        }
      } catch {
        // Silent catch
      }
    }

    pollVisibleTickers();
    const interval = setInterval(pollVisibleTickers, 6000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [watchedItems]);

  // 3. Move items up or down
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= watchedItems.length) return;

    const newOrder = [...watchedItems];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;

    const orderedIds = newOrder.map((i) => i.instrument_id || i.canonical_symbol || i.symbol);
    reorderWatchlist(orderedIds);
  };

  // 4. Sorted & Filtered Items
  const displayedItems = useMemo(() => {
    let list = [...watchedItems];

    // Filter by asset class
    if (filterAssetClass !== "ALL") {
      list = list.filter((i) => (i.asset_class || "CRYPTO").toUpperCase() === filterAssetClass);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          (i.symbol && i.symbol.toLowerCase().includes(q)) ||
          (i.canonical_symbol && i.canonical_symbol.toLowerCase().includes(q)) ||
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.exchange && i.exchange.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortField !== "order") {
      list.sort((a, b) => {
        if (sortField === "symbol") {
          const symA = a.canonical_symbol || a.symbol || "";
          const symB = b.canonical_symbol || b.symbol || "";
          return sortAsc ? symA.localeCompare(symB) : symB.localeCompare(symA);
        }
        if (sortField === "price") {
          const symA = a.canonical_symbol || a.symbol || "";
          const symB = b.canonical_symbol || b.symbol || "";
          const pA = liveTickers[symA]?.last || a.last_price || 0;
          const pB = liveTickers[symB]?.last || b.last_price || 0;
          return sortAsc ? pA - pB : pB - pA;
        }
        if (sortField === "change") {
          const symA = a.canonical_symbol || a.symbol || "";
          const symB = b.canonical_symbol || b.symbol || "";
          const cA = liveTickers[symA]?.change_pct ?? a.change_24h ?? 0;
          const cB = liveTickers[symB]?.change_pct ?? b.change_24h ?? 0;
          return sortAsc ? cA - cB : cB - cA;
        }
        return 0;
      });
    }

    return list;
  }, [watchedItems, filterAssetClass, searchQuery, sortField, sortAsc, liveTickers]);

  const assetClasses = ["ALL", "CRYPTO", "EQUITIES", "INDICES", "FOREX", "COMMODITIES", "DERIVATIVES"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4 font-sans select-none">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] border border-[var(--theme-accent)]/30">
              <Star className="h-5 w-5 fill-[var(--theme-accent)] text-[var(--theme-accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold font-mono tracking-tight text-[var(--theme-text-primary)]">
                  My Watchlist
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--theme-elevated)] border border-[var(--theme-border)] font-mono text-[var(--theme-accent)] font-bold">
                  {watchedCount} {watchedCount === 1 ? "instrument" : "instruments"}
                </span>
              </div>
              <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
                User-curated market watchdesk with persistent SQLite storage & live telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading || isMutating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] text-xs font-mono text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all"
            title="Refresh Watchlist Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading || isMutating ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {watchedCount > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--theme-loss)]/30 bg-[var(--theme-loss)]/10 hover:bg-[var(--theme-loss)]/20 text-xs font-mono text-[var(--theme-loss)] font-bold transition-all"
              title="Clear all instruments from Watchlist"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Watchlist</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Search & Add Bar + Category Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Quick Add Bar with Autocomplete Dropdown */}
        <div className="relative lg:col-span-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[var(--theme-accent)]" />
            <input
              type="text"
              value={addSearchQuery}
              onChange={(e) => {
                setAddSearchQuery(e.target.value);
                setIsSearchingAdd(true);
              }}
              onFocus={() => setIsSearchingAdd(true)}
              placeholder="Search markets to add instruments (e.g. BTC, ETH, SOL, NIFTY, AAPL)..."
              className="w-full pl-10 pr-10 py-2.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 focus:border-[var(--theme-accent)] rounded-xl text-xs font-mono text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none transition-all shadow-sm"
            />
            {addSearchQuery && (
              <button
                onClick={() => setAddSearchQuery("")}
                className="absolute right-3 text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown Results */}
          {isSearchingAdd && addSearchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-2xl z-30 divide-y divide-[var(--theme-border-subtle)] max-h-72 overflow-y-auto">
              <div className="p-1.5 flex items-center justify-between text-[10px] font-mono text-[var(--theme-text-muted)] uppercase">
                <span>Matching Markets</span>
                <span>Select Star to Save</span>
              </div>
              {isSearchLoading ? (
                <div className="p-4 text-center text-xs font-mono text-[var(--theme-text-muted)]">
                  Searching canonical instruments...
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                searchResults.map((inst) => {
                  const sym = inst.canonical_symbol || inst.symbol;
                  const watched = isWatched(inst);
                  const currSymbol = inst.currency === "INR" ? "₹" : "$";

                  return (
                    <div
                      key={inst.instrument_id || sym}
                      className="p-2.5 rounded-xl hover:bg-[var(--theme-elevated)] flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <WatchlistStarButton instrument={inst} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--theme-text-primary)] font-mono">
                              {sym}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-secondary)] font-mono uppercase">
                              {inst.exchange || "VENUE"}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] font-mono uppercase">
                              {inst.asset_class || "ASSET"}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--theme-text-muted)]">
                            {inst.name || inst.company_name || "Canonical Instrument"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs text-right">
                        <div>
                          <div className="font-bold text-[var(--theme-text-primary)]">
                            {currSymbol}
                            {inst.last_price ? inst.last_price.toLocaleString() : "—"}
                          </div>
                          <div
                            className={`text-[10px] ${
                              (inst.change_24h || 0) >= 0
                                ? "text-[var(--theme-profit)]"
                                : "text-[var(--theme-loss)]"
                            }`}
                          >
                            {(inst.change_24h || 0) >= 0 ? "+" : ""}
                            {(inst.change_24h || 0).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs font-mono text-[var(--theme-text-muted)]">
                  No matching instruments found for &quot;{addSearchQuery}&quot;.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter Watchlist by Search within watched list */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter your saved items..."
            className="w-full px-3.5 py-2.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:border-[var(--theme-accent)]/50 focus:border-[var(--theme-accent)] rounded-xl text-xs font-mono text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 font-mono text-xs">
        {assetClasses.map((ac) => (
          <button
            key={ac}
            onClick={() => setFilterAssetClass(ac)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              filterAssetClass === ac
                ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] shadow-sm"
                : "bg-[var(--theme-surface)] hover:bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] border border-[var(--theme-border)]"
            }`}
          >
            {ac}
          </button>
        ))}
      </div>

      {/* 4. Watchlist Content Table / Cards */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] space-y-3 font-mono">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[var(--theme-accent)]" />
          <p className="text-xs text-[var(--theme-text-secondary)]">Loading your personal watchlist...</p>
        </div>
      ) : isError ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-loss)]/30 space-y-3 font-mono">
          <AlertCircle className="h-6 w-6 mx-auto text-[var(--theme-loss)]" />
          <p className="text-xs text-[var(--theme-loss)] font-bold">Failed to load watchlist from database</p>
          <p className="text-[11px] text-[var(--theme-text-muted)]">{(error as any)?.message}</p>
          <button
            onClick={() => refetch()}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--theme-elevated)] border border-[var(--theme-border)] text-xs text-[var(--theme-text-primary)] hover:bg-[var(--theme-surface)]"
          >
            Retry Connection
          </button>
        </div>
      ) : watchedCount === 0 ? (
        /* EXACT EMPTY STATE REQUIREMENT */
        <div className="p-12 sm:p-16 text-center rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-lg space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20 flex items-center justify-center mx-auto text-[var(--theme-accent)]">
            <Star className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-base font-bold text-[var(--theme-text-primary)] font-mono">
              Your watchlist is empty.
            </h2>
            <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed">
              Search the markets and select the star icon to add instruments.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/charts"
              className="px-4 py-2 rounded-xl bg-[var(--theme-accent)] text-[var(--theme-bg)] text-xs font-mono font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-md"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Explore Market Charts</span>
            </Link>
            <Link
              href="/scanner"
              className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-primary)] text-xs font-mono font-bold transition-all flex items-center gap-2"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Open Quantitative Scanner</span>
            </Link>
          </div>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] font-mono text-xs text-[var(--theme-text-muted)]">
          No saved instruments match your search or category filter.
        </div>
      ) : (
        /* 5. Authoritative Watchlist Table (Desktop & Tablet) & Cards (Mobile) */
        <div className="rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-md overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] text-[11px]">
                  <th className="py-3 px-3.5 w-10 text-center">#</th>
                  <th className="py-3 px-2 w-10 text-center">Star</th>
                  <th
                    onClick={() => {
                      if (sortField === "symbol") setSortAsc(!sortAsc);
                      else {
                        setSortField("symbol");
                        setSortAsc(true);
                      }
                    }}
                    className="py-3 px-4 cursor-pointer hover:text-[var(--theme-text-primary)] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Symbol & Name</span>
                      {sortField === "symbol" && (
                        <span>{sortAsc ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 w-28">Exchange</th>
                  <th className="py-3 px-3 w-24">Market Type</th>
                  <th
                    onClick={() => {
                      if (sortField === "price") setSortAsc(!sortAsc);
                      else {
                        setSortField("price");
                        setSortAsc(false);
                      }
                    }}
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--theme-text-primary)] transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Live Price</span>
                      {sortField === "price" && (
                        <span>{sortAsc ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (sortField === "change") setSortAsc(!sortAsc);
                      else {
                        setSortField("change");
                        setSortAsc(false);
                      }
                    }}
                    className="py-3 px-4 text-right cursor-pointer hover:text-[var(--theme-text-primary)] transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>24h Change</span>
                      {sortField === "change" && (
                        <span>{sortAsc ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 w-24 text-center">Data Status</th>
                  <th className="py-3 px-3 w-24 text-center">Reorder</th>
                  <th className="py-3 px-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border-subtle)]">
                {displayedItems.map((item, idx) => {
                  const sym = item.canonical_symbol || item.symbol;
                  const live = liveTickers[sym];
                  const price = live?.last ?? item.last_price ?? 0;
                  const changePct = live?.change_pct ?? item.change_24h ?? 0;
                  const isPos = changePct >= 0;
                  const isStale = live?.is_stale || (!live && price === 0);
                  const currSymbol = item.currency === "INR" ? "₹" : "$";
                  const exchange = item.exchange || "BINANCE";
                  const marketType = item.segment || item.asset_class || "SPOT";

                  return (
                    <tr
                      key={item.instrument_id || sym || idx}
                      className="hover:bg-[var(--theme-elevated)] transition-colors group cursor-pointer"
                      onClick={() => setActiveSymbol(sym)}
                    >
                      {/* Row Index */}
                      <td className="py-3.5 px-3.5 text-center text-[var(--theme-text-muted)] text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Star Button */}
                      <td className="py-3.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <WatchlistStarButton instrument={item} size="sm" />
                      </td>

                      {/* Symbol & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--theme-text-primary)] group-hover:text-[var(--theme-accent)] transition-colors">
                            {sym}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--theme-text-muted)] truncate max-w-xs">
                          {item.name || item.company_name || sym}
                        </div>
                      </td>

                      {/* Exchange */}
                      <td className="py-3.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-secondary)] uppercase">
                          {exchange}
                        </span>
                      </td>

                      {/* Market Type */}
                      <td className="py-3.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] uppercase">
                          {marketType}
                        </span>
                      </td>

                      {/* Live Price */}
                      <td className="py-3.5 px-4 text-right font-bold text-[var(--theme-text-primary)]">
                        {price > 0 ? (
                          <span>
                            {currSymbol}
                            {price.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: price < 1 ? 4 : 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-[var(--theme-text-muted)]">—</span>
                        )}
                      </td>

                      {/* 24h Change */}
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] ${
                            isPos
                              ? "text-[var(--theme-profit)] bg-[var(--theme-profit)]/10"
                              : "text-[var(--theme-loss)] bg-[var(--theme-loss)]/10"
                          }`}
                        >
                          {isPos ? "+" : ""}
                          {changePct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Data / Connection Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            isStale
                              ? "bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] border border-[var(--theme-warning)]/30"
                              : "bg-[var(--theme-live)]/15 text-[var(--theme-live)] border border-[var(--theme-live)]/30"
                          }`}
                        >
                          {isStale ? "STALE" : "LIVE"}
                        </span>
                      </td>

                      {/* Reorder Up/Down */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleMove(idx, "up")}
                            disabled={idx === 0}
                            className="p-1 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] disabled:opacity-20 transition-all"
                            title="Move Up"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(idx, "down")}
                            disabled={idx === displayedItems.length - 1}
                            className="p-1 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] disabled:opacity-20 transition-all"
                            title="Move Down"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Remove Action */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => removeFromWatchlist(item)}
                          className="p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-loss)] hover:bg-[var(--theme-loss)]/10 transition-all"
                          title="Remove from Watchlist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="md:hidden divide-y divide-[var(--theme-border-subtle)]">
            {displayedItems.map((item, idx) => {
              const sym = item.canonical_symbol || item.symbol;
              const live = liveTickers[sym];
              const price = live?.last ?? item.last_price ?? 0;
              const changePct = live?.change_pct ?? item.change_24h ?? 0;
              const isPos = changePct >= 0;
              const isStale = live?.is_stale || (!live && price === 0);
              const currSymbol = item.currency === "INR" ? "₹" : "$";
              const exchange = item.exchange || "BINANCE";

              return (
                <div
                  key={item.instrument_id || sym || idx}
                  onClick={() => setActiveSymbol(sym)}
                  className="p-4 space-y-2.5 active:bg-[var(--theme-elevated)] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <WatchlistStarButton instrument={item} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--theme-text-primary)] font-mono">
                            {sym}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-secondary)] font-mono uppercase">
                            {exchange}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--theme-text-muted)] truncate max-w-[180px]">
                          {item.name || sym}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-[var(--theme-text-primary)]">
                        {price > 0 ? `${currSymbol}${price.toLocaleString()}` : "—"}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${
                          isPos ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                        }`}
                      >
                        {isPos ? "+" : ""}
                        {changePct.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--theme-border-subtle)] text-[10px] font-mono text-[var(--theme-text-muted)]">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        isStale
                          ? "text-[var(--theme-warning)] bg-[var(--theme-warning)]/10"
                          : "text-[var(--theme-live)] bg-[var(--theme-live)]/10"
                      }`}
                    >
                      {isStale ? "STALE" : "LIVE"}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(idx, "up");
                        }}
                        disabled={idx === 0}
                        className="px-2 py-0.5 rounded bg-[var(--theme-elevated)] border border-[var(--theme-border)] disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(idx, "down");
                        }}
                        disabled={idx === displayedItems.length - 1}
                        className="px-2 py-0.5 rounded bg-[var(--theme-elevated)] border border-[var(--theme-border)] disabled:opacity-20"
                      >
                        ▼
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(item);
                        }}
                        className="px-2 py-0.5 rounded bg-[var(--theme-loss)]/10 text-[var(--theme-loss)] border border-[var(--theme-loss)]/30 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Clear All Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn font-sans">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--theme-loss)]/15 text-[var(--theme-loss)] border border-[var(--theme-loss)]/30">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--theme-text-primary)] font-mono">
                  Clear Entire Watchlist?
                </h3>
                <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
                  This will remove all {watchedCount} instruments from your saved watchlist.
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--theme-text-secondary)] bg-[var(--theme-elevated)] p-3 rounded-xl border border-[var(--theme-border)] font-mono leading-relaxed">
              Your watchlist will be reset to empty. You can add instruments again anytime from Global Search, Market Tables, Scanner, or Charts.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--theme-elevated)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] text-xs font-mono text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearWatchlist();
                  setShowClearModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--theme-loss)] text-white hover:opacity-90 text-xs font-mono font-bold transition-all shadow-md"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
