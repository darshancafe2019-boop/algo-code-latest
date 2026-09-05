"use client";
/**
 * useMarketGateway
 * ================
 * Hook for a single symbol subscription via the MarketGatewayContext.
 * Automatically subscribes on mount and unsubscribes on unmount.
 *
 * @example
 *   const { quote, isStale, connectionStatus } = useMarketGateway("BTC/USDT", "CHART_VIEW");
 */
import { useState, useEffect, useMemo } from "react";
import {
  useMarketGatewayContext,
  NormalizedQuote,
  ConnectionStatus,
  SubscriptionReason,
} from "@/context/MarketGatewayContext";

export interface MarketGatewayResult {
  /** Latest normalized quote for the symbol, or null if not yet received */
  quote: NormalizedQuote | null;
  /** True when last_price > 0 but data is older than 10 seconds */
  isStale: boolean;
  /** Current WebSocket connection status */
  connectionStatus: ConnectionStatus;
  /** True when a live quote is available and fresh */
  isLive: boolean;
  /** Price formatted as a string with appropriate decimal places */
  formattedPrice: string;
  /** Change % formatted as "+1.23%" or "-0.45%" */
  formattedChangePct: string;
}

export function useMarketGateway(
  symbol: string | null | undefined,
  reason: SubscriptionReason = "CHART_VIEW"
): MarketGatewayResult {
  const { subscribe, unsubscribe, connectionStatus, getQuote, subscribeSymbolQuote } = useMarketGatewayContext();

  const sym = symbol?.toUpperCase() ?? null;
  const [quote, setQuote] = useState<NormalizedQuote | null>(() => (sym && getQuote ? getQuote(sym) : null));

  useEffect(() => {
    if (!sym) {
      setQuote(null);
      return;
    }
    subscribe(sym, reason);
    if (getQuote) {
      setQuote(getQuote(sym));
    }
    const unsub = subscribeSymbolQuote
      ? subscribeSymbolQuote(sym, (newQuote) => {
          setQuote(newQuote);
        })
      : undefined;

    return () => {
      unsubscribe(sym, reason);
      if (unsub) unsub();
    };
  }, [sym, reason, subscribe, unsubscribe, subscribeSymbolQuote, getQuote]);

  const formattedPrice = useMemo(() => {
    if (!quote) return "—";
    const p = quote.last_price;
    if (p >= 10000) return p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    if (p >= 0.01) return p.toFixed(4);
    return p.toFixed(8);
  }, [quote]);

  const formattedChangePct = useMemo(() => {
    if (!quote || quote.change_pct == null) return "—";
    const sign = quote.change_pct >= 0 ? "+" : "";
    return `${sign}${quote.change_pct.toFixed(2)}%`;
  }, [quote]);

  return {
    quote,
    isStale: quote?.is_stale ?? false,
    connectionStatus,
    isLive: !!quote && !quote.is_stale && connectionStatus === "LIVE",
    formattedPrice,
    formattedChangePct,
  };
}

/**
 * useMultiMarketGateway
 * =====================
 * Subscribe to multiple symbols at once.
 *
 * @example
 *   const quotes = useMultiMarketGateway(["BTC/USDT", "ETH/USDT"], "WATCHLIST");
 */
export function useMultiMarketGateway(
  symbols: string[],
  reason: SubscriptionReason = "WATCHLIST"
): Map<string, NormalizedQuote> {
  const { quotes, subscribe, unsubscribe } = useMarketGatewayContext();

  const symbolsKey = useMemo(() => {
    return symbols.map((s) => s.toUpperCase()).sort().join(",");
  }, [symbols]);

  useEffect(() => {
    symbols.forEach((sym) => subscribe(sym.toUpperCase(), reason));
    return () => {
      symbols.forEach((sym) => unsubscribe(sym.toUpperCase(), reason));
    };
  }, [symbolsKey, reason, subscribe, unsubscribe, symbols]);

  return useMemo(() => {
    const result = new Map<string, NormalizedQuote>();
    symbols.forEach((sym) => {
      const q = quotes.get(sym.toUpperCase());
      if (q) result.set(sym.toUpperCase(), q);
    });
    return result;
  }, [quotes, symbols]);
}
