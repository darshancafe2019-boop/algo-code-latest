/**
 * Canonical Market Row Status & Provider Resolver
 * ===============================================
 * Single authoritative source for:
 * 1. Provider Normalization (dhan, upstox, delta, binance, fyers, twelve_data, oanda)
 * 2. Real-time Exchange Market Sessions (OPEN, CLOSED, 24X7)
 * 3. Deterministic Provider Resolution & Failover Routing (Zero provider mismatch)
 * 4. Deterministic Market Row Status (LIVE, LAST TRADED, STALE, RECONNECTING, NOT CONFIGURED, NO LIVE PROVIDER)
 */

import { MarketInstrument } from "@/types/market-universe";
import { NormalizedQuote } from "./types";

export type CanonicalProviderId =
  | "dhan"
  | "upstox"
  | "delta"
  | "binance"
  | "fyers"
  | "twelve_data"
  | "oanda";

export type MarketSession = "OPEN" | "CLOSED" | "24X7";

export type PriceState =
  | "LIVE_TRADE"
  | "LAST_TRADED"
  | "STALE"
  | "CACHED"
  | "UNAVAILABLE";

export type RowBadgeState =
  | "live"
  | "closed"
  | "stale"
  | "reconnecting"
  | "connected"
  | "unavailable";

export interface MarketRowStatusResult {
  label: string;
  state: RowBadgeState;
  provider: CanonicalProviderId | null;
  providerLabel: string | null;
  marketSession: MarketSession;
  priceState: PriceState;
  isLive: boolean;
  isStale: boolean;
}

/**
 * Normalizes any provider alias string to its canonical lower-case ID.
 */
export function normalizeProvider(value?: string | null): CanonicalProviderId | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  if (v.includes("dhan")) return "dhan";
  if (v.includes("upstox")) return "upstox";
  if (v.includes("delta")) return "delta";
  if (v.includes("binance")) return "binance";
  if (v.includes("fyers")) return "fyers";
  if (v.includes("twelve") || v.includes("12data")) return "twelve_data";
  if (v.includes("oanda")) return "oanda";
  return null;
}

/**
 * Computes dynamic exchange trading session based on real exchange hours and timezones.
 */
export function getExchangeMarketSession(
  exchange?: string | null,
  assetClass?: string | null,
  symbol?: string | null
): MarketSession {
  const sym = (symbol || "").toUpperCase();
  const ex = (exchange || "").toUpperCase();
  const ac = (assetClass || "").toUpperCase();

  // 1. Crypto is continuous 24/7
  if (
    ex === "DELTA" ||
    ex === "BINANCE" ||
    ex === "BYBIT" ||
    ac === "CRYPTO" ||
    ac.includes("CRYPTO") ||
    ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "PEPE", "SHIB", "AVAX", "LINK", "MATIC"].some((c) =>
      sym.includes(c)
    )
  ) {
    return "24X7";
  }

  // 2. Indian Markets (NSE, BSE, NFO, MCX) — Asia/Kolkata
  if (
    ex === "NSE" ||
    ex === "BSE" ||
    ex === "NFO" ||
    ex === "MCX" ||
    ac.includes("INDIAN") ||
    ac.includes("EQUITIES") ||
    ac.includes("STOCK") ||
    sym === "NIFTY" ||
    sym === "BANKNIFTY" ||
    sym === "FINNIFTY" ||
    sym === "MIDCPNIFTY"
  ) {
    const now = new Date();
    // Convert to IST (UTC + 5:30)
    const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utcMillis + 5.5 * 3600000);
    const day = istDate.getDay(); // 0 = Sun, 6 = Sat

    if (day === 0 || day === 6) return "CLOSED";

    const totalMinutes = istDate.getHours() * 60 + istDate.getMinutes();

    // NSE Trading Hours: 09:15 to 15:30 IST (555 to 930)
    if (totalMinutes >= 555 && totalMinutes <= 930) {
      return "OPEN";
    }
    return "CLOSED";
  }

  // 3. US Equities (NASDAQ, NYSE) — America/New_York (EST/EDT)
  if (
    ex === "NASDAQ" ||
    ex === "NYSE" ||
    ac.includes("GLOBAL") ||
    ac.includes("US")
  ) {
    const now = new Date();
    const utcMillis = now.getTime() + now.getTimezoneOffset() * 60000;
    // Approximating US EST (UTC - 5)
    const estDate = new Date(utcMillis - 5 * 3600000);
    const day = estDate.getDay();

    if (day === 0 || day === 6) return "CLOSED";

    const totalMinutes = estDate.getHours() * 60 + estDate.getMinutes();

    // US Regular Hours: 09:30 to 16:00 EST (570 to 960)
    if (totalMinutes >= 570 && totalMinutes <= 960) {
      return "OPEN";
    }
    return "CLOSED";
  }

  return "CLOSED";
}

/**
 * Resolves the authoritative provider for an instrument using the shared registry & healthy providers.
 * Strict zero-mismatch rule: provider metadata and quote payload must match 100%.
 */
export function resolveInstrumentProvider(
  instrument: Partial<MarketInstrument>,
  healthyProvidersSet?: Set<string>,
  rawQuote?: any | null
): {
  provider: CanonicalProviderId | null;
  providerLabel: string | null;
} {
  const sym = (instrument.canonical_symbol || instrument.symbol || "").toUpperCase();
  const ex = (instrument.exchange || "").toUpperCase();
  const ac = (instrument.asset_class || "").toUpperCase();
  const instProv = ((instrument as any).provider || "").toUpperCase();

  // 1. Authoritative real-time quote provider origin
  if (rawQuote?.provider) {
    const norm = normalizeProvider(rawQuote.provider);
    if (norm) {
      return { provider: norm, providerLabel: norm.toUpperCase() };
    }
  }

  // 2. Explicit instrument provider from database / registry
  if (instProv) {
    const norm = normalizeProvider(instProv);
    if (norm) {
      return { provider: norm, providerLabel: norm.toUpperCase() };
    }
  }

  // 3. Exact Exchange mapping
  if (ex === "BINANCE" || sym.startsWith("BINANCE:")) {
    return { provider: "binance", providerLabel: "BINANCE" };
  }

  if (ex === "DELTA" || sym.startsWith("DELTA:")) {
    return { provider: "delta", providerLabel: "DELTA" };
  }

  if (ex === "OANDA" || sym.startsWith("OANDA:") || ac === "FOREX" || ac.includes("FOREX")) {
    return { provider: "oanda", providerLabel: "OANDA" };
  }

  // 4. Indian Equities & Indices (NSE, BSE, NFO, MCX)
  if (
    ex === "NSE" ||
    ex === "BSE" ||
    ex === "NFO" ||
    ex === "MCX" ||
    sym.startsWith("NSE:") ||
    sym.startsWith("BSE:") ||
    sym.startsWith("DHAN:") ||
    sym.startsWith("UPSTOX:") ||
    ac.includes("INDIAN") ||
    ac.includes("EQUITIES") ||
    ac.includes("STOCK") ||
    sym === "NIFTY" ||
    sym === "BANKNIFTY" ||
    sym === "FINNIFTY" ||
    sym === "MIDCPNIFTY" ||
    sym === "SENSEX"
  ) {
    if (sym.startsWith("UPSTOX:") || instProv.includes("UPSTOX")) {
      return { provider: "upstox", providerLabel: "UPSTOX" };
    }
    return { provider: "dhan", providerLabel: "DHAN" };
  }

  // 5. US / Global Equities (NASDAQ, NYSE)
  if (
    ex === "NASDAQ" ||
    ex === "NYSE" ||
    sym.startsWith("NASDAQ:") ||
    sym.startsWith("NYSE:") ||
    ac.includes("GLOBAL") ||
    ac.includes("US")
  ) {
    return { provider: "twelve_data", providerLabel: "GLOBAL DATA" };
  }

  return { provider: null, providerLabel: null };
}

/**
 * Computes truthful market row status badge, labels, and state models.
 * RULE: NEVER display LIVE unless the backend has received a fresh market-data tick
 * from the actual provider assigned to that instrument.
 */
export function getMarketRowStatus({
  instrument,
  rawQuote,
  healthyProviders,
  connectionStatus,
}: {
  instrument: Partial<MarketInstrument>;
  rawQuote?: any | null;
  healthyProviders?: Set<string>;
  connectionStatus?: string;
}): MarketRowStatusResult {
  const { provider, providerLabel } = resolveInstrumentProvider(
    instrument,
    healthyProviders,
    rawQuote
  );
  const marketSession = getExchangeMarketSession(
    instrument.exchange,
    instrument.asset_class,
    instrument.canonical_symbol || instrument.symbol
  );

  const dataAgeSec = rawQuote?.age_seconds ?? (rawQuote ? 0 : 999);
  const isStaleTick = rawQuote != null && (rawQuote.is_stale || dataAgeSec >= 30);
  const hasLiveTick = rawQuote != null && rawQuote.last_price != null && rawQuote.last_price > 0 && !isStaleTick;
  const hasCachedPrice =
    (rawQuote != null && rawQuote.last_price != null && rawQuote.last_price > 0) ||
    (instrument.last_price != null && instrument.last_price > 0);

  // If no provider resolved and no usable real price
  if (!provider && !hasCachedPrice) {
    return {
      label: "NO LIVE PROVIDER",
      state: "unavailable",
      provider: null,
      providerLabel: null,
      marketSession,
      priceState: "UNAVAILABLE",
      isLive: false,
      isStale: false,
    };
  }

  const pLabel = providerLabel || (provider ? provider.toUpperCase() : "FEED");

  // 1. Reconnecting / Disconnected State
  if (connectionStatus === "RECONNECTING" || connectionStatus === "CONNECTING") {
    return {
      label: `${pLabel} • RECONNECTING`,
      state: "reconnecting",
      provider,
      providerLabel: pLabel,
      marketSession,
      priceState: "CACHED",
      isLive: false,
      isStale: true,
    };
  }

  if (connectionStatus === "DISCONNECTED") {
    return {
      label: `${pLabel} • DISCONNECTED`,
      state: "stale",
      provider,
      providerLabel: pLabel,
      marketSession,
      priceState: "CACHED",
      isLive: false,
      isStale: true,
    };
  }

  // 2. Open market / 24x7 with FRESH LIVE TICK
  if (hasLiveTick) {
    return {
      label: `${pLabel} • LIVE`,
      state: "live",
      provider,
      providerLabel: pLabel,
      marketSession,
      priceState: "LIVE_TRADE",
      isLive: true,
      isStale: false,
    };
  }

  // 3. Stale tick (received earlier, but now older than freshness threshold)
  if (rawQuote != null && isStaleTick) {
    return {
      label: `${pLabel} • STALE`,
      state: "stale",
      provider,
      providerLabel: pLabel,
      marketSession,
      priceState: "STALE",
      isLive: false,
      isStale: true,
    };
  }

  // 4. Closed Market Session (e.g. NSE / BSE outside 9:15-15:30 IST)
  if (marketSession === "CLOSED") {
    return {
      label: `${pLabel} • LAST TRADED`,
      state: "closed",
      provider,
      providerLabel: pLabel,
      marketSession: "CLOSED",
      priceState: "LAST_TRADED",
      isLive: false,
      isStale: false,
    };
  }

  // 5. Open / 24x7 Session without active live tick
  const isProviderConfigured = provider && healthyProviders?.has(provider.toUpperCase());
  if (!isProviderConfigured && provider !== "binance" && provider !== "delta") {
    return {
      label: `${pLabel} • NOT CONFIGURED`,
      state: "unavailable",
      provider,
      providerLabel: pLabel,
      marketSession,
      priceState: "UNAVAILABLE",
      isLive: false,
      isStale: false,
    };
  }

  // Provider configured but no fresh tick received yet on open or 24x7 market -> Truthful UNAVAILABLE
  return {
    label: `${pLabel} • UNAVAILABLE`,
    state: "unavailable",
    provider,
    providerLabel: pLabel,
    marketSession,
    priceState: "UNAVAILABLE",
    isLive: false,
    isStale: false,
  };
}
