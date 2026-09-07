/**
 * Dhan Instrument Resolver & Scrip Master mapping
 */
import { Instrument, MarketPrice, OHLC } from "../types";
import { DhanClient } from "./client";

export const DHAN_OFFICIAL_SCRIP_MAP: Record<string, { securityId: string; segment: string; exchange: string }> = {
  NIFTY: { securityId: "13", segment: "IDX_I", exchange: "NSE" },
  BANKNIFTY: { securityId: "25", segment: "IDX_I", exchange: "NSE" },
  FINNIFTY: { securityId: "27", segment: "IDX_I", exchange: "NSE" },
  MIDCPNIFTY: { securityId: "44", segment: "IDX_I", exchange: "NSE" },
  SENSEX: { securityId: "51", segment: "IDX_I", exchange: "BSE" },
  RELIANCE: { securityId: "2885", segment: "NSE_EQ", exchange: "NSE" },
  TCS: { securityId: "11536", segment: "NSE_EQ", exchange: "NSE" },
  HDFCBANK: { securityId: "1333", segment: "NSE_EQ", exchange: "NSE" },
  INFY: { securityId: "1594", segment: "NSE_EQ", exchange: "NSE" },
  ICICIBANK: { securityId: "4963", segment: "NSE_EQ", exchange: "NSE" },
  SBIN: { securityId: "3045", segment: "NSE_EQ", exchange: "NSE" },
  BHARTIARTL: { securityId: "10604", segment: "NSE_EQ", exchange: "NSE" },
  ITC: { securityId: "1660", segment: "NSE_EQ", exchange: "NSE" },
  KOTAKBANK: { securityId: "1922", segment: "NSE_EQ", exchange: "NSE" },
  LT: { securityId: "11483", segment: "NSE_EQ", exchange: "NSE" },
};

export class DhanInstruments {
  private client: DhanClient;

  constructor(client: DhanClient) {
    this.client = client;
  }

  public resolveInstrument(symbol: string): Instrument | null {
    const cleanSym = symbol.toUpperCase().replace(/^NSE:/, "").trim();
    const mapped = DHAN_OFFICIAL_SCRIP_MAP[cleanSym];
    if (mapped) {
      return {
        broker: "dhan",
        symbol: cleanSym,
        instrumentId: mapped.securityId,
        securityId: mapped.securityId,
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
      const payload: Record<string, number[]> = {};
      for (const inst of instruments) {
        const seg = inst.segment || "NSE_EQ";
        if (!payload[seg]) payload[seg] = [];
        payload[seg].push(Number(inst.instrumentId));
      }

      const resp = await this.client.request({
        method: "POST",
        path: "marketfeed/ltp",
        data: payload,
      });

      const results: MarketPrice[] = [];
      if (resp && typeof resp === "object") {
        for (const inst of instruments) {
          const segData = resp[inst.segment || "NSE_EQ"];
          const ltpVal = segData?.[inst.instrumentId]?.last_price ?? segData?.[inst.instrumentId]?.ltp ?? 0;
          if (ltpVal > 0) {
            results.push({
              instrumentId: inst.instrumentId,
              symbol: inst.symbol,
              ltp: Number(ltpVal),
              timestamp: Date.now(),
            });
          }
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
        method: "POST",
        path: "charts/historical",
        data: {
          securityId: instrument.instrumentId,
          exchangeSegment: instrument.segment || "NSE_EQ",
          instrument: "EQUITY",
          expiryCode: 0,
          fromDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
          toDate: new Date().toISOString().split("T")[0],
        },
      });

      if (resp?.open && Array.isArray(resp.open)) {
        return resp.open.slice(-count).map((o: number, i: number) => ({
          timestamp: (resp.timestamp?.[i] || Date.now()) * 1000,
          open: Number(o),
          high: Number(resp.high?.[i] || o),
          low: Number(resp.low?.[i] || o),
          close: Number(resp.close?.[i] || o),
          volume: Number(resp.volume?.[i] || 0),
        }));
      }
      return [];
    } catch {
      return [];
    }
  }
}
