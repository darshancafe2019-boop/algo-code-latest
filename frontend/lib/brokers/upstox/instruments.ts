/**
 * Upstox Market Data & Instrument Resolver
 */
import { UpstoxClient } from "./client";
import { Instrument, MarketPrice, OHLC } from "../types";

export const UPSTOX_OFFICIAL_KEYS: Record<string, { instrumentKey: string; segment: string; exchange: string }> = {
  NIFTY: { instrumentKey: "NSE_INDEX|Nifty 50", segment: "NSE_INDEX", exchange: "NSE" },
  BANKNIFTY: { instrumentKey: "NSE_INDEX|Nifty Bank", segment: "NSE_INDEX", exchange: "NSE" },
  FINNIFTY: { instrumentKey: "NSE_INDEX|Nifty Fin Service", segment: "NSE_INDEX", exchange: "NSE" },
  MIDCPNIFTY: { instrumentKey: "NSE_INDEX|NIFTY MID SELECT", segment: "NSE_INDEX", exchange: "NSE" },
  SENSEX: { instrumentKey: "BSE_INDEX|SENSEX", segment: "BSE_INDEX", exchange: "BSE" },
  RELIANCE: { instrumentKey: "NSE_EQ|INE002A01018", segment: "NSE_EQ", exchange: "NSE" },
  TCS: { instrumentKey: "NSE_EQ|INE467B01029", segment: "NSE_EQ", exchange: "NSE" },
  HDFCBANK: { instrumentKey: "NSE_EQ|INE040A01034", segment: "NSE_EQ", exchange: "NSE" },
  INFY: { instrumentKey: "NSE_EQ|INE009A01021", segment: "NSE_EQ", exchange: "NSE" },
  ICICIBANK: { instrumentKey: "NSE_EQ|INE090A01021", segment: "NSE_EQ", exchange: "NSE" },
  SBIN: { instrumentKey: "NSE_EQ|INE062A01020", segment: "NSE_EQ", exchange: "NSE" },
};

export class UpstoxInstruments {
  private client: UpstoxClient;

  constructor(client: UpstoxClient) {
    this.client = client;
  }

  public resolveInstrument(symbol: string): Instrument | null {
    const cleanSym = symbol.toUpperCase().replace(/^NSE:/, "").trim();
    const mapped = UPSTOX_OFFICIAL_KEYS[cleanSym];
    if (mapped) {
      return {
        broker: "upstox",
        symbol: cleanSym,
        instrumentId: mapped.instrumentKey,
        instrumentKey: mapped.instrumentKey,
        segment: mapped.segment,
        exchange: mapped.exchange,
        lotSize: cleanSym === "NIFTY" ? 25 : cleanSym === "BANKNIFTY" ? 15 : 1,
        tickSize: 0.05,
      };
    }
    return null;
  }

  public async getLTP(instruments: Instrument[]): Promise<MarketPrice[]> {
    if (!instruments.length) return [];
    try {
      const keys = instruments.map((i) => i.instrumentId || i.instrumentKey).join(",");
      const resp = await this.client.request({
        method: "GET",
        path: `market-quote/ltp?instrument_key=${encodeURIComponent(keys)}`,
      });

      const results: MarketPrice[] = [];
      const data = resp.data || {};
      for (const inst of instruments) {
        const item = data[inst.instrumentId] || data[inst.symbol];
        if (item) {
          results.push({
            instrumentId: inst.instrumentId,
            symbol: inst.symbol,
            ltp: Number(item.last_price ?? 0),
            timestamp: Date.now(),
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  public async getOHLC(instrument: Instrument, timeframe: string = "5minute", count: number = 100): Promise<OHLC[]> {
    try {
      const key = encodeURIComponent(instrument.instrumentId);
      const toDate = new Date().toISOString().split("T")[0];
      const fromDate = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const resp = await this.client.request({
        method: "GET",
        path: `historical-candle/${key}/${timeframe}/${toDate}/${fromDate}`,
      });

      const candles = resp.data?.candles || [];
      return candles.slice(-count).map((c: any[]) => ({
        timestamp: new Date(c[0]).getTime(),
        open: Number(c[1]),
        high: Number(c[2]),
        low: Number(c[3]),
        close: Number(c[4]),
        volume: Number(c[5] || 0),
      }));
    } catch {
      return [];
    }
  }
}
