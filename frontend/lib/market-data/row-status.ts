/**
 * Canonical Market Row Status & Provider Resolver
 * ===============================================
 * Single authoritative source for:
 * 1. Provider Normalization (dhan, upstox, delta, binance, etc.)
 * 2. Real-time Exchange Market Sessions (OPEN, CLOSED, 24X7)
 * 3. Provider Resolution & Failover Routing
 * 4. Deterministic Market Row Status (LIVE, LAST TRADED, STALE, RECONNECTING, NO LIVE PROVIDER)
 */

import { MarketInstrument } from "@/types/market-universe";
import { NormalizedQuote } from "./types";

export type CanonicalProviderId =
  | "dhan"
  | "upstox"
  | "delta"
  | "binance"
  | "fyers"
  | "twelve_data";

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

  const isCrypto =
    ex === "DELTA" ||
    ex === "BINANCE" ||
    ac === "CRYPTO" ||
    ac.includes("CRYPTO") ||
    ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "PEPE", "SHIB", "AVAX", "LINK"].some((c) =>
      sym.includes(c)
    );

  // 1. If real-time quote specifies provider, respect it
  if (rawQuote?.provider) {
    const norm = normalizeProvider(rawQuote.provider);
    if (norm) {
      return { provider: norm, providerLabel: norm.toUpperCase() };
    }
  }

  // 2. Crypto Instruments -> Delta primary (if healthy or default), Binance secondary
  if (isCrypto) {
    const isDeltaHealthy =
      healthyProvidersSet?.has("DELTA") ||
      healthyProvidersSet?.has("DELTA_OPTIONS_WS") ||
      healthyProvidersSet?.has("DELTA_WS");

    const isBinanceHealthy =
      healthyProvidersSet?.has("BINANCE") ||
      healthyProvidersSet?.has("BINANCE_WS");

    // If Delta is healthy or no provider health filter given, prioritize DELTA
    if (isDeltaHealthy || ex === "DELTA" || (!isBinanceHealthy && (!healthyProvidersSet || healthyProvidersSet.size === 0))) {
      return { provider: "delta", providerLabel: "DELTA" };
    }
    if (isBinanceHealthy || ex === "BINANCE") {
      return { provider: "binance", providerLabel: "BINANCE" };
    }
    return { provider: "delta", providerLabel: "DELTA" };
  }

  // 3. If instrument master explicitly has provider for non-crypto
  if ((instrument as any).provider) {
    const norm = normalizeProvider((instrument as any).provider);
    if (norm) {
      return { provider: norm, providerLabel: norm.toUpperCase() };
    }
  }

  // 4. Indian Equities & Indices (NSE/BSE) -> Dhan primary, Upstox failover
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
    if (healthyProvidersSet?.has("DHAN")) {
      return { provider: "dhan", providerLabel: "DHAN" };
    }
    if (healthyProvidersSet?.has("UPSTOX")) {
      return { provider: "upstox", providerLabel: "UPSTOX" };
    }
    // If Upstox or Dhan are in healthy set under any alias or default Indian provider
    return { provider: "upstox", providerLabel: "UPSTOX" };
  }

  // 5. Global / US Equities -> Twelve Data
  if (ex === "NASDAQ" || ex === "NYSE" || ac.includes("GLOBAL") || ac.includes("US")) {
    return { provider: "twelve_data", providerLabel: "TWELVE DATA" };
  }

  return { provider: null, providerLabel: null };
}

/**
 * Computes truthful market row status badge, labels, and state models.
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
  const hasLivePrice =
    (rawQuote != null && rawQuote.last_price != null && rawQuote.last_price > 0) ||
    (instrument.last_price != null && instrument.last_price > 0);

  // If no provider resolved and no usable real quote
  if (!provider && !hasLivePrice) {
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

  const pLabel = providerLabel || (provider ? provider.toUpperCase() : "CONNECTED");

  // 1. Reconnecting State
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

  // 2. Closed Market State (NSE/BSE / US after hours)
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

  // 3. Open market with stale tick
  if (isStaleTick) {
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

  // 4. Open market / 24x7 with fresh tick
  if (rawQuote != null && rawQuote.last_price != null && rawQuote.last_price > 0) {
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

  // 5. Connected session with last known snapshot price
  if (hasLivePrice) {
    return {
      label: `${pLabel} • ${marketSession === "24X7" ? "LIVE" : "CONNECTED"}`,
      state: marketSession === "24X7" ? "live" : "connected",
      provider,
      providerLabel: pLabel,
      marketSession,
      priceState: marketSession === "24X7" ? "LIVE_TRADE" : "LAST_TRADED",
      isLive: marketSession === "24X7",
      isStale: false,
    };
  }

  return {
    label: `${pLabel} • CONNECTED`,
    state: "connected",
    provider,
    providerLabel: pLabel,
    marketSession,
    priceState: "LAST_TRADED",
    isLive: false,
    isStale: false,
  };
}
