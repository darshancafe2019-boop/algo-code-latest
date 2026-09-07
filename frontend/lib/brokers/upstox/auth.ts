/**
 * Upstox OAuth 2.0 Authentication Manager
 */
import { UpstoxClient } from "./client";
import { AccountProfile } from "../types";

export class UpstoxAuth {
  private client: UpstoxClient;

  constructor(client: UpstoxClient) {
    this.client = client;
  }

  /**
   * Generates Upstox OAuth 2.0 Authorization URL
   */
  public getAuthorizationUrl(clientId: string, redirectUri: string, state: string = "quant_os_login"): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://api.upstox.com/v2/login/authorization/dialog?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for Upstox access token
   */
  public async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; userProfile: any }> {
    const url = "https://api.upstox.com/v2/login/authorization/token";
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Upstox OAuth Token Exchange Failed: ${err}`);
    }

    const data = await resp.json();
    return {
      accessToken: data.access_token,
      userProfile: data,
    };
  }

  public async getProfile(): Promise<AccountProfile> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "user/profile",
      });

      const user = resp.data || {};
      const cid = user.user_id || user.client_id || "UPSTOX_USER";
      const masked = cid.length >= 8 ? `${cid.slice(0, 4)}...${cid.slice(-4)}` : cid;

      return {
        broker: "upstox",
        clientId: cid,
        clientIdMasked: masked,
        accountName: user.user_name || "Upstox Primary Account",
        email: user.email,
        tradingMode: "LIVE",
        connected: true,
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        broker: "upstox",
        clientId: "NOT_CONFIGURED",
        clientIdMasked: "NOT_CONFIGURED",
        tradingMode: "PAPER",
        connected: false,
        lastUpdated: Date.now(),
      };
    }
  }
}
