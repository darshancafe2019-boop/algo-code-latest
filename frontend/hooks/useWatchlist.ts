"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { MarketInstrument, UserWatchlist } from "@/types/market-universe";

const WATCHLIST_CHANNEL_NAME = "quantos_watchlist_sync";
const LOCAL_STORAGE_CACHE_KEY = "quantos_watchlist_offline_cache_v2";

export function getInstrumentKey(inst: Partial<MarketInstrument> | string): string {
  if (typeof inst === "string") {
    return inst.trim().toUpperCase();
  }
  if (inst.instrument_id) return inst.instrument_id.trim().toUpperCase();
  if (inst.canonical_symbol) return inst.canonical_symbol.trim().toUpperCase();
  if (inst.provider_symbol) return inst.provider_symbol.trim().toUpperCase();
  if (inst.symbol) return inst.symbol.trim().toUpperCase();
  return "UNKNOWN";
}

export function useWatchlist(watchlistId: string = "wl_main") {
  const queryClient = useQueryClient();
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize Cross-Tab Broadcast Channel
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if ("BroadcastChannel" in window) {
        channelRef.current = new BroadcastChannel(WATCHLIST_CHANNEL_NAME);
        channelRef.current.onmessage = (event) => {
          if (event.data && event.data.type === "WATCHLIST_MUTATION") {
            queryClient.invalidateQueries({ queryKey: ["userWatchlistsMaster"] });
          }
        };
      }
    } catch {
      // BroadcastChannel unavailable in some sandbox environments
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_CACHE_KEY) {
        queryClient.invalidateQueries({ queryKey: ["userWatchlistsMaster"] });
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [queryClient]);

  const broadcastMutation = useCallback(() => {
    try {
      if (channelRef.current) {
        channelRef.current.postMessage({ type: "WATCHLIST_MUTATION", timestamp: Date.now() });
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, String(Date.now()));
      }
    } catch {
      // Ignore broadcast errors
    }
  }, []);

  // 1. Fetch User Watchlists from database
  const {
    data: watchlistsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<{ status: string; watchlists: UserWatchlist[] }>({
    queryKey: ["userWatchlistsMaster"],
    queryFn: async () => {
      const res = await apiClient.get<{ status: string; watchlists: UserWatchlist[] }>(
        "/api/universe/watchlists",
        { timeoutMs: 5000 }
      );
      if (!res.ok) throw new Error(res.error?.message || "Failed to load watchlists");
      const payload = res.data as { status: string; watchlists: UserWatchlist[] };

      // Cache snapshot for offline mode
      try {
        if (typeof window !== "undefined" && payload.watchlists) {
          sessionStorage.setItem("quantos_last_known_watchlists", JSON.stringify(payload.watchlists));
        }
      } catch {}

      return payload;
    },
    staleTime: 4000,
  });

  const watchlists: UserWatchlist[] = useMemo(() => {
    if (Array.isArray(watchlistsData?.watchlists) && watchlistsData.watchlists.length > 0) {
      return watchlistsData.watchlists;
    }
    // Check fallback session storage if network failed
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("quantos_last_known_watchlists");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [
      {
        id: "wl_main",
        watchlist_id: "wl_main",
        name: "My Watchlist",
        description: "Primary active trading watchlist",
        folder: "General",
        is_default: 1,
        items: [],
        items_count: 0,
      },
    ];
  }, [watchlistsData]);

  const activeWatchlist = useMemo(() => {
    return watchlists.find((w) => w.id === watchlistId || w.watchlist_id === watchlistId) || watchlists[0];
  }, [watchlists, watchlistId]);

  const watchedItems: MarketInstrument[] = useMemo(() => {
    return Array.isArray(activeWatchlist?.items) ? activeWatchlist.items : [];
  }, [activeWatchlist]);

  // Set of watched keys for fast O(1) lookup
  const watchedKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const it of watchedItems) {
      if (it.instrument_id) set.add(it.instrument_id.trim().toUpperCase());
      if (it.canonical_symbol) set.add(it.canonical_symbol.trim().toUpperCase());
      if (it.provider_symbol) set.add(it.provider_symbol.trim().toUpperCase());
      if (it.symbol) set.add(it.symbol.trim().toUpperCase());
    }
    return set;
  }, [watchedItems]);

  const isWatched = useCallback(
    (instOrSymbol: Partial<MarketInstrument> | string | null | undefined): boolean => {
      if (!instOrSymbol) return false;
      const key = getInstrumentKey(instOrSymbol);
      return watchedKeySet.has(key);
    },
    [watchedKeySet]
  );

  // 2. Add Mutation with Optimistic Update
  const addMutation = useMutation({
    mutationFn: async ({
      instrument,
      notes = "",
      tags = [],
    }: {
      instrument: Partial<MarketInstrument> | string;
      notes?: string;
      tags?: string[];
    }) => {
      const instId =
        typeof instrument === "string"
          ? instrument
          : instrument.instrument_id ||
            instrument.canonical_symbol ||
            instrument.symbol ||
            "";
      const res = await apiClient.post<any>("/api/universe/watchlists/add", {
        watchlist_id: activeWatchlist?.id || "wl_main",
        instrument_id: instId,
        notes,
        tags,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to add to watchlist");
      return res.data;
    },
    onMutate: async ({ instrument, notes = "" }: { instrument: Partial<MarketInstrument> | string; notes?: string }) => {
      await queryClient.cancelQueries({ queryKey: ["userWatchlistsMaster"] });
      const previousData = queryClient.getQueryData(["userWatchlistsMaster"]) as
        | { status: string; watchlists: UserWatchlist[] }
        | undefined;

      const instObj: MarketInstrument =
        typeof instrument === "string"
          ? ({
              instrument_id: instrument,
              symbol: instrument,
              canonical_symbol: instrument,
              provider_symbol: instrument,
              display_symbol: instrument,
              company_name: instrument,
              name: instrument,
              exchange: "BINANCE",
              mic: "XTURN",
              country: "GLOBAL",
              currency: "USD",
              asset_class: "CRYPTO",
              instrument_type: "SPOT",
              lot_size: 1.0,
              tick_size: 0.01,
              contract_size: 1.0,
              price_multiplier: 1.0,
              segment: "CASH",
              market_status: "OPEN",
              tradability: "TRADABLE",
              data_status: "LIVE",
              data_source: "SYSTEM",
              contract_status: "ACTIVE",
              paper_enabled: 1,
              live_enabled: 0,
              strategy_enabled: 1,
              last_price: 0,
              change_24h: 0,
              volume_24h: 0,
              notes,
            } as MarketInstrument)
          : ({
              ...instrument,
              instrument_id:
                instrument.instrument_id ||
                instrument.canonical_symbol ||
                instrument.symbol ||
                "UNKNOWN",
              symbol:
                instrument.symbol || instrument.canonical_symbol || "UNKNOWN",
              canonical_symbol:
                instrument.canonical_symbol || instrument.symbol || "UNKNOWN",
              provider_symbol:
                instrument.provider_symbol ||
                instrument.symbol ||
                instrument.canonical_symbol ||
                "UNKNOWN",
              display_symbol:
                instrument.display_symbol ||
                instrument.symbol ||
                instrument.canonical_symbol ||
                "UNKNOWN",
              company_name:
                instrument.company_name || instrument.symbol || "Asset",
              name: instrument.name || instrument.symbol || "Asset",
              exchange: instrument.exchange || "BINANCE",
              mic: instrument.mic || "XTURN",
              country: instrument.country || "GLOBAL",
              currency: instrument.currency || "USD",
              asset_class: instrument.asset_class || "CRYPTO",
              instrument_type: instrument.instrument_type || "SPOT",
              lot_size: instrument.lot_size || 1.0,
              tick_size: instrument.tick_size || 0.01,
              contract_size: instrument.contract_size || 1.0,
              price_multiplier: instrument.price_multiplier || 1.0,
              segment: instrument.segment || "CASH",
              market_status: instrument.market_status || "OPEN",
              tradability: instrument.tradability || "TRADABLE",
              data_status: instrument.data_status || "LIVE",
              data_source: instrument.data_source || "SYSTEM",
              contract_status: instrument.contract_status || "ACTIVE",
              paper_enabled: instrument.paper_enabled ?? 1,
              live_enabled: instrument.live_enabled ?? 0,
              strategy_enabled: instrument.strategy_enabled ?? 1,
              last_price: instrument.last_price || 0,
              change_24h: instrument.change_24h || 0,
              volume_24h: instrument.volume_24h || 0,
              notes,
            } as MarketInstrument);

      queryClient.setQueryData(
        ["userWatchlistsMaster"],
        (old: { status: string; watchlists: UserWatchlist[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            watchlists: old.watchlists.map((w) => {
              if (w.id === (activeWatchlist?.id || "wl_main")) {
                const existing = w.items || [];
                const exists = existing.some(
                  (i) =>
                    i.instrument_id === instObj.instrument_id ||
                    i.canonical_symbol === instObj.canonical_symbol
                );
                if (exists) return w;
                return {
                  ...w,
                  items: [instObj, ...existing],
                  items_count: existing.length + 1,
                };
              }
              return w;
            }),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["userWatchlistsMaster"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userWatchlistsMaster"] });
      broadcastMutation();
    },
  });

  // 3. Remove Mutation with Optimistic Update
  const removeMutation = useMutation({
    mutationFn: async (instOrSymbol: Partial<MarketInstrument> | string) => {
      const instId =
        typeof instOrSymbol === "string"
          ? instOrSymbol
          : instOrSymbol.instrument_id ||
            instOrSymbol.canonical_symbol ||
            instOrSymbol.symbol ||
            "";
      const res = await apiClient.post<any>("/api/universe/watchlists/remove", {
        watchlist_id: activeWatchlist?.id || "wl_main",
        instrument_id: instId,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to remove from watchlist");
      return res.data;
    },
    onMutate: async (instOrSymbol) => {
      await queryClient.cancelQueries({ queryKey: ["userWatchlistsMaster"] });
      const previousData = queryClient.getQueryData(["userWatchlistsMaster"]) as
        | { status: string; watchlists: UserWatchlist[] }
        | undefined;
      const key = getInstrumentKey(instOrSymbol);

      queryClient.setQueryData(
        ["userWatchlistsMaster"],
        (old: { status: string; watchlists: UserWatchlist[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            watchlists: old.watchlists.map((w) => {
              if (w.id === (activeWatchlist?.id || "wl_main")) {
                const filtered = (w.items || []).filter(
                  (i) =>
                    getInstrumentKey(i) !== key &&
                    i.instrument_id !== key &&
                    i.canonical_symbol !== key &&
                    i.symbol !== key
                );
                return {
                  ...w,
                  items: filtered,
                  items_count: filtered.length,
                };
              }
              return w;
            }),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["userWatchlistsMaster"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userWatchlistsMaster"] });
      broadcastMutation();
    },
  });

  // 4. Clear Watchlist Mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<any>("/api/universe/watchlists/clear", {
        watchlist_id: activeWatchlist?.id || "wl_main",
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to clear watchlist");
      return res.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["userWatchlistsMaster"] });
      const previousData = queryClient.getQueryData(["userWatchlistsMaster"]) as
        | { status: string; watchlists: UserWatchlist[] }
        | undefined;

      queryClient.setQueryData(
        ["userWatchlistsMaster"],
        (old: { status: string; watchlists: UserWatchlist[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            watchlists: old.watchlists.map((w) => {
              if (w.id === (activeWatchlist?.id || "wl_main")) {
                return { ...w, items: [], items_count: 0 };
              }
              return w;
            }),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["userWatchlistsMaster"], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userWatchlistsMaster"] });
      broadcastMutation();
    },
  });

  // 5. Reorder Mutation
  const reorderMutation = useMutation({
    mutationFn: async (orderedInstrumentIds: string[]) => {
      const res = await apiClient.post<any>("/api/universe/watchlists/reorder", {
        watchlist_id: activeWatchlist?.id || "wl_main",
        order: orderedInstrumentIds,
      });
      if (!res.ok) throw new Error(res.error?.message || "Failed to reorder watchlist");
      return res.data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userWatchlistsMaster"] });
      broadcastMutation();
    },
  });

  const toggleWatchlist = useCallback(
    (instrument: Partial<MarketInstrument> | string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isWatched(instrument)) {
        removeMutation.mutate(instrument);
      } else {
        addMutation.mutate({ instrument });
      }
    },
    [isWatched, addMutation, removeMutation]
  );

  return {
    watchlists,
    activeWatchlist,
    watchedItems,
    watchedCount: watchedItems.length,
    isWatched,
    toggleWatchlist,
    addToWatchlist: (inst: Partial<MarketInstrument> | string, notes?: string, tags?: string[]) =>
      addMutation.mutate({ instrument: inst, notes, tags }),
    removeFromWatchlist: (inst: Partial<MarketInstrument> | string) => removeMutation.mutate(inst),
    reorderWatchlist: (orderedIds: string[]) => reorderMutation.mutate(orderedIds),
    clearWatchlist: () => clearMutation.mutate(),
    isLoading,
    isError,
    error,
    refetch,
    isMutating: addMutation.isPending || removeMutation.isPending || clearMutation.isPending,
  };
}
