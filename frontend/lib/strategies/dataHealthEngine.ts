/**
 * QUANT.OS DATA HEALTH VERIFIER
 * =============================
 * Validates market data feed availability, latency, and synchronization before
 * evaluating any strategy conditions.
 *
 * Rules:
 * 1. If any required data feed is missing or stale, the strategy engine WILL NOT evaluate signals.
 * 2. Emits "DATA INSUFFICIENT" with exact missing data elements.
 * 3. Never fakes or interpolates missing crypto derivatives or dominance feeds.
 */

import { CryptoStrategyDefinition } from "./crypto30Strategies";

export interface FeedHealthStatus {
  feedName: string;
  isAvailable: boolean;
  latencyMs: number;
  lastUpdatedIso: string;
  isStale: boolean; // Stale if older than 60 seconds for live feeds
}

export interface StrategyDataHealthReport {
  strategyNumber: string;
  strategyId: string;
  status: "HEALTHY" | "DATA_INSUFFICIENT" | "STALE_DATA";
  canEvaluate: boolean;
  missingFeeds: string[];
  staleFeeds: string[];
  feedDetails: FeedHealthStatus[];
  evaluatedAt: string;
}

export class DataHealthEngine {
  /**
   * Evaluates data health for a given strategy against available live feeds.
   */
  public verifyStrategyDataHealth(
    strategy: CryptoStrategyDefinition,
    availableFeeds: Record<string, { available: boolean; latencyMs: number; lastUpdated: number }>
  ): StrategyDataHealthReport {
    const missingFeeds: string[] = [];
    const staleFeeds: string[] = [];
    const feedDetails: FeedHealthStatus[] = [];
    const now = Date.now();

    // Map strategy requirements to standard feed identifiers
    const requiredFeedKeys = this._mapRequirementsToFeeds(strategy);

    for (const feedKey of requiredFeedKeys) {
      const feed = availableFeeds[feedKey];
      if (!feed || !feed.available) {
        missingFeeds.push(feedKey);
        feedDetails.push({
          feedName: feedKey,
          isAvailable: false,
          latencyMs: -1,
          lastUpdatedIso: "N/A",
          isStale: true,
        });
      } else {
        const isStale = now - feed.lastUpdated > 60000; // > 60s is stale
        if (isStale) {
          staleFeeds.push(feedKey);
        }
        feedDetails.push({
          feedName: feedKey,
          isAvailable: true,
          latencyMs: feed.latencyMs,
          lastUpdatedIso: new Date(feed.lastUpdated).toISOString(),
          isStale,
        });
      }
    }

    const canEvaluate = missingFeeds.length === 0 && staleFeeds.length === 0;
    let status: "HEALTHY" | "DATA_INSUFFICIENT" | "STALE_DATA" = "HEALTHY";

    if (missingFeeds.length > 0) {
      status = "DATA_INSUFFICIENT";
    } else if (staleFeeds.length > 0) {
      status = "STALE_DATA";
    }

    return {
      strategyNumber: strategy.number,
      strategyId: strategy.id,
      status,
      canEvaluate,
      missingFeeds,
      staleFeeds,
      feedDetails,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private _mapRequirementsToFeeds(strategy: CryptoStrategyDefinition): string[] {
    const feeds = new Set<string>(["OHLCV_PRICE", "VOLUME"]);

    if (strategy.number === "26") {
      feeds.add("SPOT_INDEX_FEED");
      feeds.add("PERP_FUTURES_FEED");
      feeds.add("FUNDING_RATE_FEED");
    } else if (strategy.number === "27") {
      feeds.add("AGGREGATED_OPEN_INTEREST");
      feeds.add("FUNDING_RATE_FEED");
    } else if (strategy.number === "28") {
      feeds.add("LIQUIDATION_FEED");
      feeds.add("AGGREGATED_OPEN_INTEREST");
    } else if (strategy.number === "29") {
      feeds.add("BTC_DOMINANCE_INDEX");
      feeds.add("BTC_USDT_BENCHMARK");
    } else if (strategy.number === "30") {
      feeds.add("BTC_DOMINANCE_INDEX");
      feeds.add("AGGREGATED_OPEN_INTEREST");
      feeds.add("FUNDING_RATE_FEED");
    }

    // Add indicator feeds
    for (const ind of strategy.indicators) {
      if (ind.name.includes("EMA")) feeds.add("INDICATOR_EMA");
      if (ind.name.includes("RSI")) feeds.add("INDICATOR_RSI");
      if (ind.name.includes("Bollinger")) feeds.add("INDICATOR_BOLLINGER");
      if (ind.name.includes("VWAP") || ind.name.includes("AVWAP")) feeds.add("INDICATOR_VWAP");
      if (ind.name.includes("OBV")) feeds.add("INDICATOR_OBV");
      if (ind.name.includes("ATR")) feeds.add("INDICATOR_ATR");
      if (ind.name.includes("Donchian")) feeds.add("INDICATOR_DONCHIAN");
    }

    return Array.from(feeds);
  }
}

export const dataHealthEngine = new DataHealthEngine();
