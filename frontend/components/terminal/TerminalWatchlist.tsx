"use client";

import React, { useState, useMemo } from "react";
import { Search, Star, ArrowUpRight, ArrowDownRight, RefreshCw, Zap } from "lucide-react";
import { useActiveBot } from "@/context/ActiveBotContext";
import { useWatchlist } from "@/hooks/useWatchlist";
import { WatchlistStarButton } from "@/components/watchlists/WatchlistStarButton";
import Link from "next/link";

export function TerminalWatchlist() {
  const { activeSymbol, setActiveSymbol } = useActiveBot();
  const {
    watchedItems,
    watchedCount,
    isLoading,
    refetch,
  } = useWatchlist("wl_main");

  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("ALL");

  const filteredList = useMemo(() => {
    let list = [...watchedItems];
    if (filterClass !== "ALL") {
      list = list.filter((i) => (i.asset_class || "CRYPTO").toUpperCase() === filterClass);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (i) =>
          (i.symbol && i.symbol.toLowerCase().includes(q)) ||
          (i.canonical_symbol && i.canonical_symbol.toLowerCase().includes(q)) ||
          (i.name && i.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [watchedItems, filterClass, search]);

  return (
    <div className="flex flex-col h-full bg-[var(--theme-surface)] border-l border-[var(--theme-border)] select-none font-sans">
      {/* Header & Search */}
      <div className="p-3 border-b border-[var(--theme-border)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-[var(--theme-accent)]" />
            <h2 className="text-xs font-bold text-[var(--theme-text-primary)] tracking-wide uppercase font-mono">
              Watchlist
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--theme-elevated)] text-[var(--theme-text-secondary)] font-mono">
              {filteredList.length}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors"
            title="Refresh Watchlist"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter saved..."
            className="w-full pl-8 pr-3 py-1.5 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-xs font-mono text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-accent)] transition-all"
          />
        </div>

        {/* Asset Class Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none text-[10px] font-mono">
          {["ALL", "CRYPTO", "EQUITIES", "INDICES", "FOREX"].map((cls) => (
            <button
              key={cls}
              onClick={() => setFilterClass(cls)}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                filterClass === cls
                  ? "bg-[var(--theme-accent)] text-[var(--theme-bg)] font-bold"
                  : "text-[var(--theme-text-secondary)] hover:bg-[var(--theme-elevated)]"
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--theme-border-subtle)]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--theme-text-muted)] font-mono">
            Loading watchlist...
          </div>
        ) : watchedCount === 0 ? (
          <div className="p-6 text-center space-y-2.5 font-mono">
            <Star className="h-6 w-6 mx-auto text-[var(--theme-accent)] opacity-60" />
            <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed">
              Your watchlist is empty. Search the markets and select the star icon to add instruments.
            </p>
            <Link
              href="/watchlists"
              className="inline-block px-3 py-1 text-[11px] font-bold rounded-lg bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] hover:bg-[var(--theme-accent)]/20 transition-all border border-[var(--theme-accent)]/30"
            >
              Manage Watchlist
            </Link>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--theme-text-muted)] font-mono">
            No instruments match filter
          </div>
        ) : (
          filteredList.map((inst) => {
            const sym = inst.canonical_symbol || inst.symbol;
            const isSelected = activeSymbol === sym;
            const isPos = (inst.change_24h || 0) >= 0;
            const currSymbol = inst.currency === "INR" ? "₹" : "$";

            return (
              <div
                key={inst.instrument_id || sym}
                onClick={() => setActiveSymbol(sym)}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors group ${
                  isSelected
                    ? "bg-[var(--theme-accent)]/15 border-l-2 border-[var(--theme-accent)]"
                    : "hover:bg-[var(--theme-elevated)]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div onClick={(e) => e.stopPropagation()}>
                    <WatchlistStarButton instrument={inst} size="sm" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--theme-text-primary)] font-mono group-hover:text-[var(--theme-accent)] transition-colors truncate">
                        {sym}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--theme-text-muted)] truncate max-w-[110px]">
                      {inst.name || inst.exchange || "Instrument"}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <div className="text-xs font-bold text-[var(--theme-text-primary)]">
                    {inst.last_price ? `${currSymbol}${inst.last_price.toLocaleString()}` : "—"}
                  </div>
                  <div
                    className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${
                      isPos ? "text-[var(--theme-profit)]" : "text-[var(--theme-loss)]"
                    }`}
                  >
                    {isPos ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {isPos ? "+" : ""}
                    {(inst.change_24h || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
