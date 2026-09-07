/**
 * Delta Exchange India Market Data & Instrument Resolver
 */
import { DeltaClient } from "./client";
import { Instrument, MarketPrice, OHLC } from "../types";

export class DeltaInstruments {
  private client: DeltaClient;

  constructor(client: DeltaClient) {
    this.client = client;
  }

  public resolveInstrument(symbol: string): Instrument | null {
    const clean = symbol.toUpperCase().replace(/\//g, "").trim();
    return {
      broker: "delta",
      symbol: clean.includes("USDT") ? clean : `${clean}USDT`,
      instrumentId: clean,
      segment: "CRYPTO_DERIVATIVES",
      exchange: "DELTA_INDIA",
      lotSize: 1,
      tickSize: 0.1,
    };
  }

  public async getLTP(instruments: Instrument[]): Promise<MarketPrice[]> {
    if (!instruments.length) return [];
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "v2/tickers",
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.result || [];
      const results: MarketPrice[] = [];
      for (const inst of instruments) {
        const item = list.find((t: any) => t.symbol === inst.symbol || t.product_id === Number(inst.instrumentId));
        if (item) {
          results.push({
            instrumentId: inst.instrumentId,
            symbol: inst.symbol,
            ltp: Number(item.close ?? item.mark_price ?? item.spot_price ?? 0),
            change: Number(item.price_change_24h ?? 0),
            changePct: Number(item.price_change_percentage_24h ?? 0),
            timestamp: Date.now(),
          });
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  public async getOHLC(instrument: Instrument, timeframe: string = "5m", count: number = 100): Promise<OHLC[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "v2/history/candles",
        query: {
          symbol: instrument.symbol,
          resolution: timeframe,
        },
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.result || [];
      return list.slice(-count).map((c: any) => ({
        timestamp: (c.time || Date.now()) * 1000,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 0),
      }));
    } catch {
      return [];
    }
  }
}
