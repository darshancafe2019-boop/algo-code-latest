/**
 * Delta Exchange India Auth, Profile & Wallet
 */
import { DeltaClient } from "./client";
import { AccountProfile, AccountFunds } from "../types";

export class DeltaAuth {
  private client: DeltaClient;

  constructor(client: DeltaClient) {
    this.client = client;
  }

  public async getProfile(): Promise<AccountProfile> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "v2/profile",
      });

      const cid = String(resp.id || resp.user_id || "DELTA_USER");
      const masked = cid.length >= 8 ? `${cid.slice(0, 4)}...${cid.slice(-4)}` : cid;

      return {
        broker: "delta",
        clientId: cid,
        clientIdMasked: masked,
        accountName: resp.email || "Delta Exchange India Account",
        email: resp.email,
        tradingMode: "LIVE",
        connected: true,
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        broker: "delta",
        clientId: "NOT_CONFIGURED",
        clientIdMasked: "NOT_CONFIGURED",
        tradingMode: "PAPER",
        connected: false,
        lastUpdated: Date.now(),
      };
    }
  }
}

export class DeltaWallet {
  private client: DeltaClient;

  constructor(client: DeltaClient) {
    this.client = client;
  }

  public async getFunds(): Promise<AccountFunds> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "v2/wallet/balances",
      });

      const balances: any[] = Array.isArray(resp) ? resp : resp?.result || [];
      const inrBal = balances.find((b: any) => b.asset_symbol === "INR" || b.asset_symbol === "USDT") || balances[0] || {};

      const avail = Number(inrBal.available_balance ?? inrBal.balance ?? 0);
      const used = Number(inrBal.order_margin ?? inrBal.position_margin ?? 0);

      return {
        broker: "delta",
        connected: true,
        availableBalance: avail,
        availableMargin: avail,
        usedMargin: used,
        collateral: 0,
        withdrawable: Number(inrBal.withdrawable_balance ?? avail),
        currency: inrBal.asset_symbol || "INR",
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        broker: "delta",
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
