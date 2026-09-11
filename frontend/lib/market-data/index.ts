/**
 * Centralized Live Market Data Engine - Barrel Export & React Client Hooks
 */

export * from "./types";
export * from "./constants";
export * from "./config";
export * from "./instrument-master";
export * from "./binary-decoder";
export * from "./validator";
export * from "./freshness";
export * from "./normalizer";
export * from "./cache";
export * from "./redis";
export * from "./market-state";
export * from "./subscription-manager";
export * from "./websocket-manager";
export * from "./dhan-feed";
export * from "./candle-engine";
export * from "./option-chain-engine";
export * from "./orderbook-engine";
export * from "./metrics";
export * from "./health";
export * from "./core/event-bus";
export * from "./core/market-data-engine";
export * from "./providers/dhan/dhan-provider";
export * from "./providers/upstox/upstox-provider";
export * from "./providers/delta/delta-provider";

import { useState, useEffect, useCallback, useMemo } from "react";
import { marketState } from "./market-state";
import { subscriptionManager } from "./subscription-manager";
import { marketHealthMonitor } from "./health";
import { MarketFreshnessEngine } from "./freshness";
import { instrumentMaster } from "./instrument-master";
import {
  CandleTimeframe,
  ConnectionState,
  FreshnessStatus,
  MarketDepth,
  MarketTick,
  NormalizedQuote,
  OHLCVCandle,
  OptionChainSnapshot,
  ProviderHealthEntry,
} from "./types";

/**
 * Hook to subscribe to real-time NormalizedQuote for a symbol.
 */
export function useLiveQuote(symbol: string | null | undefined, reason: string = "CHART_VIEW") {
  const sym = symbol ? symbol.toUpperCase() : null;
  const [quote, setQuote] = useState<NormalizedQuote | null>(() =>
    sym ? marketState.getQuote(sym) || null : null
  );

  useEffect(() => {
    if (!sym) {
      setQuote(null);
      return;
    }

    subscriptionManager.subscribe(sym, reason);
    const unsub = marketState.subscribeQuote(sym, (newQuote) => {
      setQuote(newQuote);
    });

    return () => {
      subscriptionManager.unsubscribe(sym, reason);
      unsub();
    };
  }, [sym, reason]);

  const freshness = useMemo(() => {
    if (!quote) return "MISSING" as FreshnessStatus;
    return quote.freshness_status;
  }, [quote]);

  return {
    quote,
    lastPrice: quote?.last_price || 0,
    isLive: quote?.freshness_status === "LIVE" || quote?.freshness_status === "FRESH",
    isStale: quote?.is_stale || false,
    freshness,
  };
}

/**
 * Hook to subscribe to full live ticks for a symbol.
 */
export function useLiveTick(symbol: string | null | undefined, reason: string = "STRATEGY") {
  const sym = symbol ? symbol.toUpperCase() : null;
  const [tick, setTick] = useState<MarketTick | null>(() =>
    sym ? marketState.getTick(sym) || null : null
  );

  useEffect(() => {
    if (!sym) {
      setTick(null);
      return;
    }

    subscriptionManager.subscribe(sym, reason);
    const unsub = marketState.subscribeSymbol(sym, (newTick) => {
      setTick(newTick);
    });

    return () => {
      subscriptionManager.unsubscribe(sym, reason);
      unsub();
    };
  }, [sym, reason]);

  const isSafeToTrade = useMemo(() => {
    return MarketFreshnessEngine.isSafeForLiveTrading(tick);
  }, [tick]);

  return {
    tick,
    isSafeToTrade,
  };
}

/**
 * Hook to subscribe to real-time market depth / order book.
 */
export function useMarketDepth(symbol: string | null | undefined) {
  const sym = symbol ? symbol.toUpperCase() : null;
  const [depth, setDepth] = useState<MarketDepth | null>(() =>
    sym ? marketState.getDepth(sym) || null : null
  );

  useEffect(() => {
    if (!sym) {
      setDepth(null);
      return;
    }

    const unsub = marketState.subscribeSymbol(sym, (t) => {
      if (t.marketDepth) {
        setDepth(t.marketDepth);
      }
    });

    return () => {
      unsub();
    };
  }, [sym]);

  return depth;
}

/**
 * Hook to subscribe to option chain snapshots.
 */
export function useLiveOptionChain(underlying: string | null | undefined) {
  const und = underlying ? underlying.toUpperCase() : null;
  const [chain, setChain] = useState<OptionChainSnapshot | null>(() =>
    und ? marketState.getOptionChain(und) || null : null
  );

  useEffect(() => {
    if (!und) return;
    const initial = marketState.getOptionChain(und);
    if (initial) setChain(initial);
  }, [und]);

  return chain;
}

/**
 * Hook to get overall system health telemetry.
 */
export function useMarketHealth() {
  const [systemState, setSystemState] = useState<ConnectionState>(() =>
    marketHealthMonitor.getOverallSystemState()
  );
  const [providers, setProviders] = useState<ProviderHealthEntry[]>(() =>
    marketHealthMonitor.getAllProvidersHealth()
  );

  return {
    systemState,
    providers,
    isLive: systemState === "LIVE",
  };
}

// Canonical aliases and convenience hooks
export const useMarketQuote = useLiveQuote;
export const useOptionChain = useLiveOptionChain;
export const useProviderHealth = useMarketHealth;

/**
 * Hook to retrieve normalized candles for a symbol.
 */
export function useMarketCandles(symbol: string | null | undefined, timeframe: CandleTimeframe = "15m", limit: number = 100) {
  const sym = symbol ? symbol.toUpperCase() : null;
  const [candles, setCandles] = useState<OHLCVCandle[]>(() =>
    sym ? marketState.getCandles(sym, timeframe).slice(-limit) : []
  );

  useEffect(() => {
    if (!sym) {
      setCandles([]);
      return;
    }
    setCandles(marketState.getCandles(sym, timeframe).slice(-limit));
    const unsub = marketState.subscribeSymbol(sym, () => {
      setCandles(marketState.getCandles(sym, timeframe).slice(-limit));
    });
    return () => unsub();
  }, [sym, timeframe, limit]);

  return candles;
}

/**
 * Hook to resolve canonical instrument details.
 */
export function useInstrument(symbol: string | null | undefined) {
  const sym = symbol ? symbol.toUpperCase() : null;
  return useMemo(() => {
    if (!sym) return null;
    return instrumentMaster.resolve(sym);
  }, [sym]);
}

/**
 * Hook to manage watchlist subscriptions and quotes efficiently.
 */
export function useWatchlist(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, NormalizedQuote>>(() => {
    const initial: Record<string, NormalizedQuote> = {};
    for (const s of symbols) {
      const q = marketState.getQuote(s.toUpperCase());
      if (q) initial[s.toUpperCase()] = q;
    }
    return initial;
  });

  const symbolsKey = symbols.map((s) => s.toUpperCase()).join(",");

  useEffect(() => {
    if (!symbolsKey) return;
    const cleanSymbols = symbolsKey.split(",").filter(Boolean);

    for (const s of cleanSymbols) {
      subscriptionManager.subscribe(s, "WATCHLIST");
    }

    const unsubs = cleanSymbols.map((sym) => {
      return marketState.subscribeQuote(sym, (q) => {
        setQuotes((prev) => ({ ...prev, [sym]: q }));
      });
    });

    return () => {
      for (const s of cleanSymbols) {
        subscriptionManager.unsubscribe(s, "WATCHLIST");
      }
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [symbolsKey]);

  return quotes;
}

/**
 * High-performance selective tick hook for virtualized rows.
 * Only triggers re-render when the exact observed symbol receives an update.
 */
export function useSelectiveTick(symbol: string) {
  const sym = symbol.toUpperCase();
  const [tick, setTick] = useState<MarketTick | null>(() => marketState.getTick(sym) || null);

  useEffect(() => {
    subscriptionManager.subscribe(sym, "ROW_VIRTUAL");
    const unsub = marketState.subscribeSymbol(sym, (newTick) => {
      setTick(newTick);
    });

    return () => {
      subscriptionManager.unsubscribe(sym, "ROW_VIRTUAL");
      unsub();
    };
  }, [sym]);

  return tick;
}


