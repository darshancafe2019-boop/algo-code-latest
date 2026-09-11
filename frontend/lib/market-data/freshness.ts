/**
 * Centralized Live Market Data Engine - Freshness & Stale Guard Engine
 */

import { FRESHNESS_THRESHOLDS_MS } from "./constants";
import { FreshnessStatus, MarketTick, NormalizedQuote } from "./types";

export interface FreshnessEvaluation {
  status: FreshnessStatus;
  ageMs: number;
  isStale: boolean;
  isLive: boolean;
}

export class MarketFreshnessEngine {
  /**
   * Evaluates the freshness of a given timestamp compared to current system clock.
   */
  public static evaluate(timestampMs: number, nowMs: number = Date.now()): FreshnessEvaluation {
    if (!timestampMs || timestampMs <= 0 || isNaN(timestampMs)) {
      return {
        status: "MISSING",
        ageMs: Infinity,
        isStale: true,
        isLive: false,
      };
    }

    const ageMs = Math.max(0, nowMs - timestampMs);

    if (ageMs <= FRESHNESS_THRESHOLDS_MS.LIVE_MAX_MS) {
      return { status: "LIVE", ageMs, isStale: false, isLive: true };
    }

    if (ageMs <= FRESHNESS_THRESHOLDS_MS.FRESH_MAX_MS) {
      return { status: "RECENT", ageMs, isStale: false, isLive: true };
    }

    if (ageMs <= FRESHNESS_THRESHOLDS_MS.STALE_MAX_MS) {
      return { status: "STALE", ageMs, isStale: true, isLive: false };
    }

    return { status: "EXPIRED", ageMs, isStale: true, isLive: false };
  }

  /**
   * Evaluates a full MarketTick object.
   */
  public static evaluateTick(tick: MarketTick, nowMs: number = Date.now()): FreshnessEvaluation {
    const time = tick.exchangeTimestamp || tick.timestamp || tick.receivedTimestamp;
    return this.evaluate(time, nowMs);
  }

  /**
   * Strict Safety Gate: Returns true ONLY if data is LIVE or RECENT/FRESH.
   * If data is STALE or EXPIRED, Strategy and Risk engines MUST block new live orders.
   */
  public static isSafeForLiveTrading(item: MarketTick | NormalizedQuote | null | undefined): boolean {
    if (!item) return false;

    if ("freshness" in item) {
      const isValid = (item as any).isValid ?? (item.status === "VALID");
      return Boolean(isValid) && (item.freshness === "LIVE" || item.freshness === "RECENT" || item.freshness === "FRESH");
    }

    if ("freshness_status" in item) {
      return !item.is_stale && (item.freshness_status === "LIVE" || item.freshness_status === "RECENT" || item.freshness_status === "FRESH");
    }

    return false;
  }
}
