/**
 * Market Data Normalizer
 */
import { BrokerName, NormalizedTick } from "../brokers/types";

export class MarketDataNormalizer {
  public static normalizeTick(broker: BrokerName, raw: any): NormalizedTick {
    switch (broker) {
      case "dhan":
        return {
          broker: "dhan",
          instrumentId: String(raw.securityId || raw.security_id || raw.instrumentId || ""),
          symbol: String(raw.symbol || raw.tradingSymbol || raw.securityId || ""),
          exchange: raw.exchange || "NSE",
          timestamp: Number(raw.timestamp || Date.now()),
          ltp: Number(raw.ltp ?? raw.last_price ?? raw.lastPrice ?? 0),
          bid: Number(raw.bid ?? raw.bestBid ?? 0),
          ask: Number(raw.ask ?? raw.bestAsk ?? 0),
          volume: Number(raw.volume ?? 0),
          openInterest: Number(raw.openInterest ?? raw.oi ?? 0),
          open: Number(raw.open ?? 0),
          high: Number(raw.high ?? 0),
          low: Number(raw.low ?? 0),
          close: Number(raw.close ?? 0),
        };

      case "upstox":
        return {
          broker: "upstox",
          instrumentId: String(raw.instrument_key || raw.instrument_token || ""),
          symbol: String(raw.symbol || raw.trading_symbol || ""),
          exchange: raw.exchange || "NSE",
          timestamp: Number(raw.timestamp || Date.now()),
          ltp: Number(raw.ltp ?? raw.last_price ?? 0),
          volume: Number(raw.volume ?? 0),
          openInterest: Number(raw.oi ?? 0),
          open: Number(raw.open ?? 0),
          high: Number(raw.high ?? 0),
          low: Number(raw.low ?? 0),
          close: Number(raw.close ?? 0),
        };

      case "delta":
        return {
          broker: "delta",
          instrumentId: String(raw.product_id || raw.symbol || ""),
          symbol: String(raw.symbol || ""),
          exchange: "DELTA_INDIA",
          timestamp: Number(raw.timestamp || Date.now()),
          ltp: Number(raw.mark_price ?? raw.close ?? raw.spot_price ?? 0),
          volume: Number(raw.volume_24h ?? raw.volume ?? 0),
          openInterest: Number(raw.open_interest ?? 0),
        };

      default:
        return {
          broker: "paper",
          instrumentId: String(raw.instrumentId || raw.symbol || ""),
          symbol: String(raw.symbol || "UNKNOWN"),
          exchange: "NSE",
          timestamp: Date.now(),
          ltp: Number(raw.ltp || 0),
        };
    }
  }
}
