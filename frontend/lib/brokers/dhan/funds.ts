/**
 * Dhan HQ API v2 Funds & Margin Service
 */
import { DhanClient } from "./client";
import { AccountFunds } from "../types";

export class DhanFunds {
  private client: DhanClient;

  constructor(client: DhanClient) {
    this.client = client;
  }

  public async getFunds(): Promise<AccountFunds> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "fundlimit",
      });

      const avail = Number(resp.availMargin ?? resp.availabelBalance ?? resp.availableBalance ?? 0);
      const utilized = Number(resp.utilizedAmount ?? resp.usedMargin ?? 0);
      const collateral = Number(resp.collateralAmount ?? resp.collateral ?? 0);
      const withdrawable = Number(resp.withdrawableBalance ?? resp.withdrawable ?? 0);

      return {
        broker: "dhan",
        connected: true,
        availableBalance: avail,
        availableMargin: avail,
        usedMargin: utilized,
        collateral,
        withdrawable,
        currency: "INR",
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        broker: "dhan",
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
