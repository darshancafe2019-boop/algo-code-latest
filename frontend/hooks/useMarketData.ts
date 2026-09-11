"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  NormalizedQuote,
  MarketTick,
  OHLCVCandle,
  OptionChainSnapshot,
  MarketDepth,
  CandleTimeframe,
  ConnectionState,
  ProviderHealthEntry,
} from "@/lib/market-data/types";

// Global In-Browser SSE Event Bus for Single-Connection Multiplexing
class ClientStreamMultiplexer {
  private static instance: ClientStreamMultiplexer | null = null;
  private eventSource: EventSource | null = null;
  private subscribedSymbols: Set<string> = new Set();
  private listeners: Map<string, Set<(quote: NormalizedQuote) => void>> = new Map();
  private globalListeners: Set<(quote: NormalizedQuote) => void> = new Set();
  private isConnected: boolean = false;
  private reconnectTimeout: any = null;

  public static getInstance(): ClientStreamMultiplexer {
    if (!ClientStreamMultiplexer.instance) {
      ClientStreamMultiplexer.instance = new ClientStreamMultiplexer();
    }
    return ClientStreamMultiplexer.instance;
  }

  public subscribe(symbol: string, callback: (quote: NormalizedQuote) => void): () => void {
    const sym = symbol.toUpperCase().trim();
    if (!this.listeners.has(sym)) {
      this.listeners.set(sym, new Set());
    }
    this.listeners.get(sym)!.add(callback);
    this.subscribedSymbols.add(sym);
    this.ensureStream();

    return () => {
      const set = this.listeners.get(sym);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(sym);
          this.subscribedSymbols.delete(sym);
        }
      }
    };
  }

  private ensureStream() {
    if (typeof window === "undefined") return;
    if (this.eventSource && this.isConnected) return;

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }
      const symbolsParam = Array.from(this.subscribedSymbols).slice(0, 50).join(",");
      const url = `/api/market-data/stream${symbolsParam ? `?symbols=${encodeURIComponent(symbolsParam)}` : ""}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "QUOTE" && parsed.data) {
            const q = parsed.data as NormalizedQuote;
            const sym = q.symbol.toUpperCase();
            const set = this.listeners.get(sym);
            if (set) {
              set.forEach((cb) => cb(q));
            }
            this.globalListeners.forEach((cb) => cb(q));
          }
        } catch {}
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        this.reconnectTimeout = setTimeout(() => this.ensureStream(), 5000);
      };
    } catch {}
  }
}

const multiplexer = typeof window !== "undefined" ? ClientStreamMultiplexer.getInstance() : null;

/**
 * Universal Hook: useMarketData
 * Subscribes to live quotes for a list of symbols with deduplicated streaming.
 */
export function useMarketData(symbols: string[] = ["NIFTY", "BANKNIFTY", "RELIANCE"]) {
  const [quotes, setQuotes] = useState<Record<string, NormalizedQuote>>({});
  const [isStreaming, setIsStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!multiplexer || symbols.length === 0) return;

    const unsubs = symbols.map((sym) =>
      multiplexer.subscribe(sym, (q) => {
        setQuotes((prev) => ({ ...prev, [q.symbol]: q }));
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [symbols.join(",")]);

  return {
    quotes,
    isStreaming,
    error,
    getQuote: (sym: string) => quotes[sym.toUpperCase()] || null,
    getPrice: (sym: string) => quotes[sym.toUpperCase()]?.last_price || null,
  };
}

/**
 * Hook: useLivePrice
 * Real-time LTP for a single symbol without high-frequency polling.
 */
export function useLivePrice(symbol: string | null | undefined) {
  const sym = symbol ? symbol.toUpperCase() : null;
  const [price, setPrice] = useState<number | null>(null);
  const [quote, setQuote] = useState<NormalizedQuote | null>(null);

  // Seed with initial snapshot query (no periodic polling loop)
  const { data: initialQuote } = useQuery({
    queryKey: ["quoteSnapshot", sym],
    queryFn: async () => {
      if (!sym) return null;
      const res = await fetch(`/api/market-data/quote?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.quote as NormalizedQuote;
    },
    enabled: Boolean(sym),
    staleTime: 10000,
  });

  useEffect(() => {
    if (initialQuote && !quote) {
      setQuote(initialQuote);
      setPrice(initialQuote.last_price);
    }
  }, [initialQuote]);

  useEffect(() => {
    if (!multiplexer || !sym) return;

    const unsub = multiplexer.subscribe(sym, (q) => {
      setQuote(q);
      setPrice(q.last_price);
    });

    return unsub;
  }, [sym]);

  return {
    price: price ?? initialQuote?.last_price ?? null,
    quote: quote ?? initialQuote ?? null,
    isLive: (quote || initialQuote)?.freshness_status === "LIVE" || (quote || initialQuote)?.freshness_status === "FRESH",
  };
}

/**
 * Hook: useQuote
 * Real-time Quote object for a single symbol.
 */
export function useQuote(symbol: string | null | undefined) {
  const sym = symbol ? symbol.toUpperCase() : null;
  const { price, quote, isLive } = useLivePrice(sym);

  return useQuery<NormalizedQuote | null>({
    queryKey: ["marketQuote", sym],
    queryFn: async () => {
      if (!sym) return null;
      const res = await fetch(`/api/market-data/quote?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.quote as NormalizedQuote;
    },
    enabled: Boolean(sym),
    initialData: quote || undefined,
    staleTime: 5000,
  });
}

/**
 * Hook: useCandles
 * Real-time and historical candles for a symbol.
 */
export function useCandles(symbol: string | null | undefined, timeframe: CandleTimeframe = "5m", limit: number = 100) {
  const sym = symbol ? symbol.toUpperCase() : null;
  return useQuery<{ count: number; candles: OHLCVCandle[]; formingCandle: OHLCVCandle | null }>({
    queryKey: ["marketCandles", sym, timeframe, limit],
    queryFn: async () => {
      if (!sym) return { count: 0, candles: [], formingCandle: null };
      const res = await fetch(
        `/api/market-data/candles?symbol=${encodeURIComponent(sym)}&timeframe=${timeframe}&limit=${limit}`
      );
      if (!res.ok) return { count: 0, candles: [], formingCandle: null };
      return await res.json();
    },
    enabled: Boolean(sym),
    refetchInterval: 10000,
    staleTime: 5000,
  });
}

/**
 * Hook: useOptionChain
 * Option Chain snapshot for underlying.
 */
export function useOptionChain(underlying: string | null | undefined, expiry?: string) {
  const und = underlying ? underlying.toUpperCase() : null;
  return useQuery<OptionChainSnapshot | null>({
    queryKey: ["marketOptionChain", und, expiry],
    queryFn: async () => {
      if (!und) return null;
      const url = expiry
        ? `/api/market-data/options?underlying=${encodeURIComponent(und)}&expiry=${encodeURIComponent(expiry)}`
        : `/api/market-data/options?underlying=${encodeURIComponent(und)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      return json.chain as OptionChainSnapshot;
    },
    enabled: Boolean(und),
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

/**
 * Hook: useOrderBook
 * Market depth (Level 2) order book.
 */
export function useOrderBook(symbol: string | null | undefined) {
  const sym = symbol ? symbol.toUpperCase() : null;
  return useQuery<MarketDepth | null>({
    queryKey: ["marketOrderBook", sym],
    queryFn: async () => {
      if (!sym) return null;
      const res = await fetch(`/api/market-data/orderbook?symbol=${encodeURIComponent(sym)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.orderbook as MarketDepth;
    },
    enabled: Boolean(sym),
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

/**
 * Hook: useMarketHealth
 * Overall market health, provider status, latency, and packet rates.
 */
export function useMarketHealth() {
  return useQuery({
    queryKey: ["marketDataHealth"],
    queryFn: async () => {
      const res = await fetch("/api/market-data/health");
      if (!res.ok) throw new Error("Health endpoint error");
      return await res.json();
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
