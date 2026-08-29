/**
 * Upstox Historical & Intraday Candle Service
 * ===========================================
 * Fetches and normalizes multi-timeframe candles from Upstox Historical API V2.
 * Strictly maps supported intervals (1m, 5m, 15m, 30m, 1h, 1d).
 */

import { upstoxFetch } from "./client";
import { NormalizedCandle, UpstoxCandleInterval } from "./types";
import { resolveInstrumentKey } from "./instruments";
import { UpstoxValidationError } from "./errors";

const INTERVAL_MAP: Record<UpstoxCandleInterval, string> = {
  "1m": "1minute",
  "5m": "5minute",
  "15m": "15minute",
  "30m": "30minute",
  "1h": "60minute",
  "1d": "day",
};

export async function getHistoricalCandles(
  instrumentKeyOrSymbol: string,
  interval: UpstoxCandleInterval = "15m",
  fromDate?: string,
  toDate?: string,
  oauthToken?: string | null
): Promise<NormalizedCandle[]> {
  const instrumentKey = resolveInstrumentKey(instrumentKeyOrSymbol) || instrumentKeyOrSymbol;

  if (!instrumentKey || !instrumentKey.includes("|")) {
    throw new UpstoxValidationError(
      `Invalid instrument key '${instrumentKeyOrSymbol}'. Format must be 'EXCHANGE|SYMBOL'.`
    );
  }

  const mappedInterval = INTERVAL_MAP[interval] || "30minute";
  const encodedKey = encodeURIComponent(instrumentKey);

  let endpoint = "";
  if (toDate && fromDate) {
    endpoint = `/historical-candle/${encodedKey}/${mappedInterval}/${toDate}/${fromDate}`;
  } else if (toDate) {
    endpoint = `/historical-candle/${encodedKey}/${mappedInterval}/${toDate}`;
  } else {
    // Intraday endpoint accepts 1minute or 30minute
    const intradayInterval = interval === "1m" || interval === "5m" || interval === "15m" ? "1minute" : "30minute";
    endpoint = `/historical-candle/intraday/${encodedKey}/${intradayInterval}`;
  }

  const response = await upstoxFetch<any>(endpoint, { oauthToken });
  const rawCandles = response?.data?.candles || [];

  const normalized: NormalizedCandle[] = rawCandles.map((c: any[]) => {
    // Upstox candle format: [timestamp, open, high, low, close, volume, open_interest]
    return {
      timestamp: typeof c[0] === "string" ? c[0] : new Date(c[0]).toISOString(),
      open: typeof c[1] === "number" ? c[1] : 0,
      high: typeof c[2] === "number" ? c[2] : 0,
      low: typeof c[3] === "number" ? c[3] : 0,
      close: typeof c[4] === "number" ? c[4] : 0,
      volume: typeof c[5] === "number" ? c[5] : 0,
      oi: typeof c[6] === "number" ? c[6] : undefined,
    };
  });

  return normalized;
}
