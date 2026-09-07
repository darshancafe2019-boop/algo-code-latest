/**
 * Upstox API v2 Funds, Margin, Positions, and Holdings
 */
import { UpstoxClient } from "./client";
import { AccountFunds, Position, Holding } from "../types";

export class UpstoxFunds {
  private client: UpstoxClient;

  constructor(client: UpstoxClient) {
    this.client = client;
  }

  public async getFunds(): Promise<AccountFunds> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "user/get-funds-and-margin",
      });

      const equity = resp.data?.equity || {};
      const avail = Number(equity.available_margin ?? 0);
      const used = Number(equity.used_margin ?? 0);

      return {
        broker: "upstox",
        connected: true,
        availableBalance: avail,
        availableMargin: avail,
        usedMargin: used,
        collateral: 0,
        withdrawable: avail,
        currency: "INR",
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        broker: "upstox",
        connected: false,
        availableBalance: 0,
        availableMargin: 0,
        usedMargin: 0,
        collateral: 0,
        withdrawable: 0,
        currency: "INR",
        lastUpdated: Date.now(),
      };
    }
  }
}

export class UpstoxPositions {
  private client: UpstoxClient;

  constructor(client: UpstoxClient) {
    this.client = client;
  }

  public async getPositions(): Promise<Position[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "portfolio/short-term-positions",
      });

      const list = resp.data || [];
      return list.map((item: any) => ({
        broker: "upstox",
        symbol: item.trading_symbol || item.symbol || "UNKNOWN",
        instrumentId: item.instrument_token || item.instrument_key || "",
        side: Number(item.quantity || 0) < 0 ? "SELL" : "BUY",
        quantity: Math.abs(Number(item.quantity || 0)),
        averagePrice: Number(item.average_price ?? item.buy_price ?? 0),
        ltp: Number(item.last_price ?? item.ltp ?? 0),
        unrealizedPnl: Number(item.unrealised ?? item.pnl ?? 0),
        realizedPnl: Number(item.realised ?? 0),
        productType: item.product || "D",
        exchange: item.exchange || "NSE",
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
        path: "portfolio/long-term-holdings",
      });

      const list = resp.data || [];
      return list.map((item: any) => ({
        broker: "upstox",
        symbol: item.trading_symbol || item.symbol || "UNKNOWN",
        isin: item.isin,
        quantity: Number(item.quantity ?? 0),
        averagePrice: Number(item.average_price ?? 0),
        currentPrice: Number(item.last_price ?? 0),
        pnl: Number(item.pnl ?? 0),
        pnlPercentage: Number(item.pnl_percentage ?? 0),
        exchange: item.exchange || "NSE",
      }));
    } catch {
      return [];
    }
  }
}
