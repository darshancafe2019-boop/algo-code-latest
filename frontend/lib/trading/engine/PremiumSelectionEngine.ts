/**
 * Client-Side Intelligent Premium Selection Engine
 * ================================================
 * Matches options strikes, deltas, moneyness, and spreads with
 * conservative bid/ask pricing, liquidity filtering, and explainability.
 */

export interface OptionQuoteData {
  strike: number;
  optionType: "CE" | "PE";
  bid: number;
  ask: number;
  lastPrice: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  volume: number;
  oi: number;
}

export interface OptionStrikeRowData {
  strike: number;
  is_atm: boolean;
  distance_pct: number;
  ce: OptionQuoteData;
  pe: OptionQuoteData;
}

export interface PremiumMatchClientResult {
  strike: number;
  optionType: "CE" | "PE";
  targetCriteria: string;
  matchedPremium: number;
  targetValue: number;
  difference: number;
  delta: number;
  bid: number;
  ask: number;
  spread: number;
  volume: number;
  oi: number;
  score: number;
  explanation: string;
}

export class PremiumSelectionClientEngine {
  public static matchSingleContract(
    strikes: OptionStrikeRowData[],
    optionType: "CE" | "PE",
    action: "BUY" | "SELL",
    method: "EXACT" | "NEAREST" | "RANGE" | "DELTA" | "MONEYNESS",
    targetValue: number,
    options?: {
      minRange?: number;
      maxRange?: number;
      minVolume?: number;
      minOi?: number;
      maxSpreadPct?: number;
    }
  ): PremiumMatchClientResult[] {
    const isBuy = action === "BUY";
    const minVol = options?.minVolume ?? 0;
    const minOi = options?.minOi ?? 0;
    const maxSpread = options?.maxSpreadPct ?? 0.25;

    const matches: PremiumMatchClientResult[] = [];

    for (const row of strikes) {
      const quote = optionType === "CE" ? row.ce : row.pe;
      if (!quote) continue;

      const execPrice = isBuy
        ? quote.ask > 0 ? quote.ask : quote.lastPrice
        : quote.bid > 0 ? quote.bid : quote.lastPrice;

      if (execPrice <= 0.01) continue;

      const bid = quote.bid > 0 ? quote.bid : execPrice * 0.98;
      const ask = quote.ask > 0 ? quote.ask : execPrice * 1.02;
      const spread = Math.max(0.01, ask - bid);
      const spreadPct = spread / Math.max(0.01, execPrice);

      if (quote.volume < minVol || quote.oi < minOi) continue;
      if (spreadPct > maxSpread) continue;

      let score = 100;
      let diff = 0;

      if (method === "EXACT" || method === "NEAREST") {
        diff = Math.abs(execPrice - targetValue);
        score -= diff * 2.0;
      } else if (method === "RANGE") {
        const minV = options?.minRange ?? 0;
        const maxV = options?.maxRange ?? Infinity;
        if (execPrice < minV || execPrice > maxV) continue;
        diff = Math.abs(execPrice - (minV + maxV) / 2);
        score -= diff;
      } else if (method === "DELTA") {
        const targetDelta = Math.abs(targetValue);
        const actualDelta = Math.abs(quote.delta);
        diff = Math.abs(actualDelta - targetDelta);
        score -= diff * 300;
      } else if (method === "MONEYNESS") {
        diff = Math.abs(row.distance_pct - targetValue);
        score -= diff * 10;
      }

      score -= spreadPct * 50;
      if (quote.oi > 1000) score += 5;
      if (quote.volume > 500) score += 5;

      const explanation = `Strike ${row.strike} ${optionType} @ ${execPrice.toFixed(2)} (${action} via ${
        isBuy ? "Ask" : "Bid"
      }), Delta: ${quote.delta.toFixed(2)}, Spread: ${spread.toFixed(2)} (${(spreadPct * 100).toFixed(1)}%), OI: ${quote.oi.toLocaleString()}`;

      matches.push({
        strike: row.strike,
        optionType,
        targetCriteria: method,
        matchedPremium: execPrice,
        targetValue,
        difference: diff,
        delta: quote.delta,
        bid,
        ask,
        spread,
        volume: quote.volume,
        oi: quote.oi,
        score,
        explanation,
      });
    }

    matches.sort((a, b) => b.score - a.score);
    return matches;
  }
}
