/**
 * Dhan HQ API v2 Positions & Holdings Service
 */
import { DhanClient } from "./client";
import { Position, Holding } from "../types";

export class DhanPositions {
  private client: DhanClient;

  constructor(client: DhanClient) {
    this.client = client;
  }

  public async getPositions(): Promise<Position[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "positions",
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.data || [];
      return list.map((item: any) => ({
        broker: "dhan",
        symbol: item.tradingSymbol || item.customSymbol || item.symbol || "UNKNOWN",
        instrumentId: String(item.securityId || item.instrumentId || ""),
        side: (item.positionType || item.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: Math.abs(Number(item.netQty ?? item.quantity ?? 0)),
        averagePrice: Number(item.buyAvg ?? item.averagePrice ?? item.costPrice ?? 0),
        ltp: Number(item.lastPrice ?? item.ltp ?? 0),
        unrealizedPnl: Number(item.unrealizedProfit ?? item.unrealizedPnl ?? item.m2m ?? 0),
        realizedPnl: Number(item.realizedProfit ?? item.realizedPnl ?? 0),
        productType: item.productType || "CNC",
        exchange: item.exchangeSegment || item.exchange || "NSE",
        updatedAt: Date.now(),
      }));
    } catch {
      return [];
    }
  }

  public async getHoldings(): Promise<Holding[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "holdings",
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.data || [];
      return list.map((item: any) => ({
        broker: "dhan",
        symbol: item.tradingSymbol || item.symbol || "UNKNOWN",
        isin: item.isin,
        quantity: Number(item.totalQty ?? item.quantity ?? 0),
        averagePrice: Number(item.avgCostPrice ?? item.averagePrice ?? 0),
        currentPrice: Number(item.lastTradedPrice ?? item.ltp ?? 0),
        pnl: Number(item.pnl ?? 0),
        pnlPercentage: Number(item.pnlPercentage ?? 0),
        exchange: item.exchange || "NSE",
      }));
    } catch {
      return [];
    }
  }
}
