/**
 * Centralized Live Market Data Engine - Multi-Broker Normalizer
 */

import { DecodedDhanPacket } from "./binary-decoder";
import { MarketFreshnessEngine } from "./freshness";
import { MarketDataValidator } from "./validator";
import {
  BrokerProvider,
  ExchangeSegment,
  MarketTick,
  NormalizedQuote,
} from "./types";

export class MarketDataNormalizer {
  /**
   * Normalizes a decoded Dhan binary packet into a standard MarketTick.
   */
  public static fromDhanPacket(packet: DecodedDhanPacket): MarketTick {
    const now = Date.now();
    const exchTime = packet.lastTradedTime ? packet.lastTradedTime * 1000 : now;
    const ltp = packet.ltp || 0;
    const prevClose = packet.previousClose || packet.close || ltp;

    let change = 0;
    let changePct = 0;
    if (prevClose > 0 && ltp > 0) {
      change = parseFloat((ltp - prevClose).toFixed(2));
      changePct = parseFloat(((change / prevClose) * 100).toFixed(2));
    }

    const freshnessEval = MarketFreshnessEngine.evaluate(exchTime, now);

    const tick: MarketTick = {
      provider: "dhan",
      exchange: (packet.exchangeSegment as ExchangeSegment) || "NSE_EQ",
      securityId: packet.securityId,
      symbol: packet.symbol,
      timestamp: now,
      exchangeTimestamp: exchTime,
      receivedTimestamp: now,

      ltp,
      lastTradedQuantity: packet.lastTradedQuantity,
      averagePrice: packet.averagePrice,

      open: packet.open,
      high: packet.high,
      low: packet.low,
      close: packet.close,
      previousClose: packet.previousClose,
      change,
      changePct,

      volume: packet.volume || 0,
      openInterest: packet.openInterest,
      oiHigh: packet.oiHigh,
      oiLow: packet.oiLow,

      marketDepth: packet.depth,

      source: "WEBSOCKET",
      freshness: freshnessEval.status,
      ageMs: freshnessEval.ageMs,
      isValid: true,
    };

    const val = MarketDataValidator.validateTick(tick);
    if (!val.isValid) {
      tick.isValid = false;
      tick.freshness = "INVALID";
    }

    return tick;
  }

  /**
   * Converts a generic raw JSON feed (Delta / Binance / REST) into a normalized MarketTick.
   */
  public static fromGenericJson(
    provider: BrokerProvider,
    symbol: string,
    data: Record<string, any>,
    exchange: ExchangeSegment = "NSE_EQ"
  ): MarketTick {
    const now = Date.now();
    const ltp = parseFloat(data.last_price || data.price || data.close || data.ltp || 0);
    const prevClose = parseFloat(data.previous_close || data.prev_close || data.open || ltp);
    const volume = parseFloat(data.volume_24h || data.volume || data.vol || 0);

    let change = parseFloat(data.change || 0);
    let changePct = parseFloat(data.change_24h || data.change_pct || 0);

    if (changePct === 0 && prevClose > 0 && ltp > 0) {
      change = parseFloat((ltp - prevClose).toFixed(2));
      changePct = parseFloat(((change / prevClose) * 100).toFixed(2));
    }

    const exchTime = data.timestamp ? new Date(data.timestamp).getTime() : now;
    const freshnessEval = MarketFreshnessEngine.evaluate(exchTime, now);

    const tick: MarketTick = {
      provider,
      exchange,
      securityId: data.security_id || data.product_id?.toString() || symbol,
      symbol,
      timestamp: now,
      exchangeTimestamp: exchTime,
      receivedTimestamp: now,

      ltp,
      open: data.open ? parseFloat(data.open) : undefined,
      high: data.high ? parseFloat(data.high) : undefined,
      low: data.low ? parseFloat(data.low) : undefined,
      close: data.close ? parseFloat(data.close) : undefined,
      previousClose: prevClose,
      change,
      changePct,

      volume,
      bid: data.bid ? parseFloat(data.bid) : undefined,
      ask: data.ask ? parseFloat(data.ask) : undefined,
      openInterest: data.open_interest || data.oi ? parseFloat(data.open_interest || data.oi) : undefined,

      source: "WEBSOCKET",
      freshness: freshnessEval.status,
      ageMs: freshnessEval.ageMs,
      isValid: true,
    };

    const val = MarketDataValidator.validateTick(tick);
    if (!val.isValid) {
      tick.isValid = false;
      tick.freshness = "INVALID";
    }

    return tick;
  }

  /**
   * Converts a MarketTick to a client-facing NormalizedQuote.
   */
  public static toNormalizedQuote(tick: MarketTick): NormalizedQuote {
    return {
      symbol: tick.symbol,
      exchange: tick.exchange,
      provider: tick.provider,
      last_price: tick.ltp,
      bid: tick.bid || tick.marketDepth?.bids[0]?.price || tick.ltp,
      ask: tick.ask || tick.marketDepth?.asks[0]?.price || tick.ltp,
      volume: tick.volume,
      high: tick.high ?? null,
      low: tick.low ?? null,
      open: tick.open ?? null,
      close: tick.close ?? null,
      change_pct: tick.changePct ?? null,
      vwap: tick.averagePrice ?? null,
      open_interest: tick.openInterest,
      event_timestamp: new Date(tick.exchangeTimestamp || tick.timestamp || Date.now()).toISOString(),
      received_timestamp: new Date(tick.receivedTimestamp || tick.timestamp || Date.now()).toISOString(),
      feed_latency_ms: tick.ageMs || 0,
      data_mode: "REAL_TIME",
      is_stale: tick.freshness === "STALE" || tick.freshness === "EXPIRED" || tick.freshness === "MISSING",
      age_seconds: parseFloat(((tick.ageMs || 0) / 1000).toFixed(1)),
      freshness_status: tick.freshness,
    };
  }
}
