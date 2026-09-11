/**
 * Centralized Live Market Data Engine - Data Integrity & Packet Validator
 */

import { MarketTick, NormalizedQuote } from "./types";

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export class MarketDataValidator {
  /**
   * Validates a MarketTick object against financial data constraints.
   */
  public static validateTick(tick: Partial<MarketTick>): ValidationResult {
    if (!tick) {
      return { isValid: false, reason: "Null or undefined tick" };
    }

    if (!tick.symbol || typeof tick.symbol !== "string" || tick.symbol.trim() === "") {
      return { isValid: false, reason: "Missing or invalid symbol" };
    }

    // LTP validation
    if (tick.ltp === undefined || tick.ltp === null || isNaN(tick.ltp) || !isFinite(tick.ltp)) {
      return { isValid: false, reason: "Invalid LTP (NaN or non-finite)" };
    }

    if (tick.ltp < 0) {
      return { isValid: false, reason: `Negative LTP (${tick.ltp})` };
    }

    // High / Low consistency
    if (tick.high !== undefined && tick.low !== undefined && tick.high > 0 && tick.low > 0) {
      if (tick.low > tick.high) {
        return { isValid: false, reason: `Inverted High/Low (Low ${tick.low} > High ${tick.high})` };
      }
    }

    // Bid / Ask consistency
    if (tick.bid !== undefined && tick.ask !== undefined && tick.bid > 0 && tick.ask > 0) {
      if (tick.bid > tick.ask) {
        return { isValid: false, reason: `Inverted Spread (Bid ${tick.bid} > Ask ${tick.ask})` };
      }
    }

    // Timestamp sanity: cannot be more than 60s in the future
    const now = Date.now();
    const tickTime = tick.timestamp || tick.exchangeTimestamp || now;
    if (tickTime > now + 60000) {
      return { isValid: false, reason: "Impossible future timestamp (>60s ahead)" };
    }

    return { isValid: true };
  }

  /**
   * Validates a NormalizedQuote object.
   */
  public static validateQuote(quote: Partial<NormalizedQuote>): ValidationResult {
    if (!quote || !quote.symbol) {
      return { isValid: false, reason: "Missing symbol in quote" };
    }

    if (quote.last_price === undefined || isNaN(quote.last_price) || quote.last_price < 0) {
      return { isValid: false, reason: "Invalid last_price in quote" };
    }

    return { isValid: true };
  }
}
