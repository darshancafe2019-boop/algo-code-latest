import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BotCreationIntent, BotStrategyDirection } from "@/types/bot-creation-intent";
import { useBotCreationIntentStore } from "./store/useBotCreationIntentStore";

/**
 * Authoritative shared entry point function: openBotCreator(instrumentContext, router)
 *
 * Requirements satisfied:
 * 1. Works uniformly from Option Chain, Futures Board, Screener, Scanner, and AI Analysis.
 * 2. Safely transfers all 22+ Option parameters and 15+ Futures parameters.
 * 3. Never makes the user re-enter existing information.
 * 4. Stores non-sensitive context in Zustand + SessionStorage and query params.
 * 5. Strictly avoids direct broker calls in browser code.
 */
export function openBotCreator(
  context: Partial<BotCreationIntent> & { symbol: string; assetClass: BotCreationIntent["assetClass"] },
  router: AppRouterInstance | { push: (url: string) => void }
) {
  const ltp = context.ltp ?? context.currentPrice ?? 0;
  const side = context.side || (context.strategyDirection?.startsWith("SELL") || context.strategyDirection === "SHORT_FUTURE" ? "SELL" : "BUY");

  const fullIntent: BotCreationIntent = {
    symbol: context.symbol,
    canonicalSymbol: context.canonicalSymbol || context.symbol,
    canonicalContractId: context.canonicalContractId,
    tradingSymbol: context.tradingSymbol || context.symbol,
    securityId: context.securityId || context.instrumentId,
    instrumentId: context.instrumentId || context.securityId,

    side,
    strategyDirection: context.strategyDirection,
    assetClass: context.assetClass,
    market: context.market,
    exchange: context.exchange || (context.assetClass.includes("CRYPTO") ? "DELTA" : "NSE"),
    segment: context.segment,

    broker: context.broker || "PAPER",
    marketDataSource: context.marketDataSource || context.broker || "UPSTOX",

    currentPrice: ltp,
    ltp: ltp,
    bid: context.bid ?? null,
    ask: context.ask ?? null,
    markPrice: context.markPrice ?? null,
    spotPrice: context.spotPrice ?? null,

    underlying: context.underlying || "NIFTY",
    expiry: context.expiry ?? null,
    strike: context.strike ?? null,
    optionType: context.optionType ?? null,
    lotSize: context.lotSize ?? 1,
    tickSize: context.tickSize ?? 0.05,
    contractMultiplier: context.contractMultiplier ?? 1,

    openInterest: context.openInterest ?? context.oi ?? null,
    oi: context.oi ?? context.openInterest ?? null,
    changeOi: context.changeOi ?? null,
    oiChangePct: context.oiChangePct ?? null,
    volume: context.volume ?? null,

    iv: context.iv ?? null,
    delta: context.delta ?? null,
    gamma: context.gamma ?? null,
    theta: context.theta ?? null,
    vega: context.vega ?? null,
    pcr: context.pcr ?? null,
    atmDistance: context.atmDistance ?? null,
    underlyingPrice: context.underlyingPrice ?? null,

    basis: context.basis ?? null,
    fundingRate: context.fundingRate ?? null,
    premiumDiscount: context.premiumDiscount ?? null,
    daysToExpiry: context.daysToExpiry ?? null,

    maxLeverage: context.maxLeverage ?? null,
    timeframe: context.timeframe || "5m",

    origin: context.origin || "OPTIONS",
    sourcePage: context.sourcePage,
    mode: context.mode || "new",
    creationIntentId: context.creationIntentId || `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    uiDispatchTimestamp: Date.now(),
    timestamp: Date.now(),
  };

  // Set in central Zustand Store & SessionStorage
  useBotCreationIntentStore.getState().setIntent(fullIntent);

  // Build clean URL query params for deep-linking & refreshing
  const queryParams = new URLSearchParams();
  queryParams.set("symbol", fullIntent.symbol);
  queryParams.set("side", fullIntent.side);
  queryParams.set("assetClass", fullIntent.assetClass);
  queryParams.set("origin", fullIntent.origin);
  if (fullIntent.sourcePage) queryParams.set("source", fullIntent.sourcePage);
  if (fullIntent.strategyDirection) queryParams.set("direction", fullIntent.strategyDirection);
  if (fullIntent.underlying) queryParams.set("underlying", fullIntent.underlying);
  if (fullIntent.expiry) queryParams.set("expiry", fullIntent.expiry);
  if (fullIntent.strike != null) queryParams.set("strike", String(fullIntent.strike));
  if (fullIntent.optionType) queryParams.set("optionType", fullIntent.optionType);
  if (fullIntent.exchange) queryParams.set("exchange", fullIntent.exchange);
  if (fullIntent.securityId) queryParams.set("securityId", fullIntent.securityId);
  if (fullIntent.ltp != null) queryParams.set("ltp", String(fullIntent.ltp));
  if (fullIntent.bid != null) queryParams.set("bid", String(fullIntent.bid));
  if (fullIntent.ask != null) queryParams.set("ask", String(fullIntent.ask));
  if (fullIntent.lotSize != null) queryParams.set("lotSize", String(fullIntent.lotSize));
  if (fullIntent.broker) queryParams.set("broker", fullIntent.broker);
  if (fullIntent.marketDataSource) queryParams.set("marketDataSource", fullIntent.marketDataSource);

  const targetPath = fullIntent.mode === "strategy" ? "/strategy/create" : "/bots/create";
  router.push(`${targetPath}?${queryParams.toString()}`);
}
