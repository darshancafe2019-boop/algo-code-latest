/**
 * Dhan HQ API v2 Authentication & Consent Management
 */
import { DhanClient } from "./client";
import { AccountProfile } from "../types";

export interface DhanConsentResponse {
  consentId: string;
  loginUrl: string;
}

export class DhanAuth {
  private client: DhanClient;

  constructor(client: DhanClient) {
    this.client = client;
  }

  /**
   * Generates Consent URL for official browser-based Dhan login
   * API: POST /v2/consent/generate
   */
  public async generateConsent(apiKey: string, apiSecret: string, redirectUrl: string): Promise<DhanConsentResponse> {
    try {
      const resp = await this.client.request({
        method: "POST",
        path: "consent/generate",
        data: {
          apiKey,
          apiSecret,
          redirectUrl,
        },
      });
      return {
        consentId: resp.consentId || resp.data?.consentId || "",
        loginUrl: resp.loginUrl || resp.data?.loginUrl || `https://auth.dhan.co/login?consentId=${resp.consentId}`,
      };
    } catch {
      // Fallback for direct token authentication
      return {
        consentId: "direct_token",
        loginUrl: "https://dhan.co",
      };
    }
  }

  /**
   * Consumes tokenId received on redirect callback to acquire Access Token
   * API: POST /v2/consent/consume
   */
  public async consumeConsent(apiKey: string, apiSecret: string, tokenId: string): Promise<{ accessToken: string; expiryUtc: string }> {
    const resp = await this.client.request({
      method: "POST",
      path: "consent/consume",
      data: {
        apiKey,
        apiSecret,
        tokenId,
      },
    });

    return {
      accessToken: resp.accessToken || resp.data?.accessToken,
      expiryUtc: resp.expiryUtc || resp.data?.expiryUtc || new Date(Date.now() + 86400000).toISOString(),
    };
  }

  /**
   * Validates active session via GET /v2/fundlimit, GET /v2/profile, or GET /v2/orders
   */
  public async getProfile(): Promise<AccountProfile> {
    try {
      // Try orders or fundlimit for robust sandbox & live validation
      const endpoint = this.client.isSandbox() ? "orders" : "fundlimit";
      const resp = await this.client.request({
        method: "GET",
        path: endpoint,
      });

      const clientId = resp.dhanClientId || resp.clientId || (this.client.isSandbox() ? "SANDBOX" : "DHAN_USER");
      const masked = clientId.length >= 8 ? `${clientId.slice(0, 4)}...${clientId.slice(-4)}` : clientId;

      return {
        broker: "dhan",
        clientId,
        clientIdMasked: masked,
        accountName: `Dhan HQ ${this.client.isSandbox() ? "Sandbox" : "Primary"}`,
        tradingMode: this.client.isSandbox() ? "PAPER" : "LIVE",
        connected: true,
        dataPlanActive: true,
        lastUpdated: Date.now(),
      };
    } catch (err: any) {
      return {
        broker: "dhan",
        clientId: "NOT_CONFIGURED",
        clientIdMasked: "NOT_CONFIGURED",
        tradingMode: "PAPER",
        connected: false,
        lastUpdated: Date.now(),
      };
    }
  }
}
