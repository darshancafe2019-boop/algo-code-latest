/**
 * Dhan HQ API v2 Authoritative Authentication & Consent Management
 * Implements the official individual API-key consent flow and profile validation.
 */

import { DhanClient } from "./client";
import { dhanTokenManager } from "./token-manager";
import {
  DhanGenerateConsentResponse,
  DhanConsumeConsentResponse,
  DhanProfile,
  DhanProfileResponse,
  DhanAuthStatus,
  DhanAuthError,
} from "./types";
import { AccountProfile } from "../types";

export class DhanAuth {
  private client: DhanClient;

  constructor(client?: DhanClient) {
    this.client = client || new DhanClient();
  }

  /**
   * Generates Consent ID for official browser-based Dhan login
   * API: POST https://auth.dhan.co/app/generate-consent?client_id={DHAN_CLIENT_ID}
   * Headers: app_id: {DHAN_API_KEY}, app_secret: {DHAN_API_SECRET}
   */
  public async generateConsent(
    clientId?: string,
    apiKey?: string,
    apiSecret?: string
  ): Promise<DhanGenerateConsentResponse> {
    const cid = clientId || process.env.DHAN_CLIENT_ID || "";
    const key = apiKey || process.env.DHAN_API_KEY || "";
    const secret = apiSecret || process.env.DHAN_API_SECRET || "";

    if (!cid) {
      throw new DhanAuthError("DHAN_CLIENT_ID_MISSING", "Dhan Client ID is required for consent generation", 400);
    }
    if (!key) {
      throw new DhanAuthError("DHAN_API_KEY_MISSING", "Dhan API Key (app_id) is required for consent generation", 400);
    }
    if (!secret) {
      throw new DhanAuthError("DHAN_API_SECRET_MISSING", "Dhan API Secret (app_secret) is required for consent generation", 400);
    }

    const url = `https://auth.dhan.co/app/generate-consent?client_id=${encodeURIComponent(cid)}`;

    return dhanTokenManager.withAuthLock(async () => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            app_id: key,
            app_secret: secret,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.consentAppId) {
          const errCode = data.errorCode || "DHAN_CONSENT_GENERATION_FAILED";
          const errMsg = data.errorMessage || data.message || `Dhan consent generation failed with status ${response.status}`;
          throw new DhanAuthError(errCode, errMsg, response.status);
        }

        const consentAppId = data.consentAppId;
        const consentAppStatus = data.consentAppStatus || "PENDING";
        const status = data.status || "SUCCESS";
        const loginUrl = `https://auth.dhan.co/login/consentApp-login?consentAppId=${encodeURIComponent(consentAppId)}`;

        return {
          consentAppId,
          consentAppStatus,
          status,
          loginUrl,
        };
      } catch (err: any) {
        if (err instanceof DhanAuthError) throw err;
        throw new DhanAuthError("DHAN_CONSENT_GENERATION_FAILED", err.message || "Failed to generate Dhan login consent", 500);
      }
    });
  }

  /**
   * Consumes tokenId received on redirect callback to acquire 24-hour Access Token
   * API: POST https://auth.dhan.co/app/consumeApp-consent?tokenId={tokenId}
   * Headers: app_id: {DHAN_API_KEY}, app_secret: {DHAN_API_SECRET}
   */
  public async consumeConsent(
    tokenId: string,
    apiKey?: string,
    apiSecret?: string
  ): Promise<DhanConsumeConsentResponse> {
    if (!tokenId || typeof tokenId !== "string" || !tokenId.trim()) {
      throw new DhanAuthError("INVALID_TOKEN_ID", "Valid tokenId is required to consume Dhan consent", 400);
    }

    const key = apiKey || process.env.DHAN_API_KEY || "";
    const secret = apiSecret || process.env.DHAN_API_SECRET || "";

    if (!key) {
      throw new DhanAuthError("DHAN_API_KEY_MISSING", "Dhan API Key is required to consume consent", 400);
    }
    if (!secret) {
      throw new DhanAuthError("DHAN_API_SECRET_MISSING", "Dhan API Secret is required to consume consent", 400);
    }

    const url = `https://auth.dhan.co/app/consumeApp-consent?tokenId=${encodeURIComponent(tokenId.trim())}`;

    return dhanTokenManager.withAuthLock(async () => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            app_id: key,
            app_secret: secret,
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.accessToken) {
          const errCode = data.errorCode || "DHAN_CONSENT_CONSUMPTION_FAILED";
          const errMsg = data.errorMessage || data.message || `Failed to consume Dhan consent with status ${response.status}`;
          throw new DhanAuthError(errCode, errMsg, response.status);
        }

        const accessToken = data.accessToken;
        const dhanClientId = data.dhanClientId || process.env.DHAN_CLIENT_ID || "";
        const expiryTime = data.expiryTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        // Store in Server-Side Token Manager
        dhanTokenManager.setToken(accessToken, expiryTime, dhanClientId);

        return {
          dhanClientId,
          dhanClientName: data.dhanClientName,
          dhanClientUcc: data.dhanClientUcc,
          givenPowerOfAttorney: Boolean(data.givenPowerOfAttorney),
          accessToken,
          expiryTime,
        };
      } catch (err: any) {
        if (err instanceof DhanAuthError) throw err;
        throw new DhanAuthError("DHAN_CONSENT_CONSUMPTION_FAILED", err.message || "Failed to consume Dhan consent", 500);
      }
    });
  }

  /**
   * Validates active session and checks real Data Plan status via official profile endpoint
   * API: GET https://api.dhan.co/v2/profile
   * Header: access-token: {ACCESS_TOKEN}
   */
  public async validateProfile(): Promise<DhanProfile> {
    const accessToken = dhanTokenManager.getValidAccessToken();
    const url = `${this.client.getBaseUrl().replace(/\/$/, "")}/profile`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "access-token": accessToken,
        "client-id": dhanTokenManager.getClientId(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      let errData: any = {};
      try {
        errData = await response.json();
      } catch {}

      if (response.status === 401 || response.status === 403) {
        dhanTokenManager.invalidateToken("Invalid or expired session returned from /v2/profile");
        throw new DhanAuthError("DH-901", "Dhan authentication expired or invalid (DH-901)", response.status);
      }
      throw new DhanAuthError(
        errData.errorCode || `HTTP_${response.status}`,
        errData.errorMessage || "Failed to validate Dhan profile",
        response.status
      );
    }

    const data: DhanProfileResponse = await response.json();
    const dhanClientId = data.dhanClientId || dhanTokenManager.getClientId();
    const masked = dhanClientId.length <= 4 ? "****" : `****${dhanClientId.slice(-4)}`;

    // Calculate real data plan status (STRICT TRUTH-IN-DATA: never default to true)
    let isDataPlanActive = false;
    if (data.dataPlan && data.dataPlan.toUpperCase() !== "INACTIVE" && data.dataPlan.toUpperCase() !== "NONE") {
      if (data.dataValidity) {
        const validityMs = new Date(data.dataValidity).getTime();
        isDataPlanActive = !isNaN(validityMs) && validityMs > Date.now();
      } else {
        isDataPlanActive = true;
      }
    }

    return {
      dhanClientId,
      clientIdMasked: masked,
      tokenValidity: data.tokenValidity,
      activeSegment: data.activeSegment,
      ddpi: data.ddpi,
      mtf: data.mtf,
      dataPlan: data.dataPlan || "INACTIVE",
      dataValidity: data.dataValidity,
      dataPlanActive: isDataPlanActive,
      raw: data,
    };
  }

  /**
   * Adapter compatibility wrapper returning normalized AccountProfile
   */
  public async getProfile(): Promise<AccountProfile> {
    const rawCid = dhanTokenManager.getClientId();
    const maskedCid = dhanTokenManager.getMaskedClientId();

    if (!dhanTokenManager.hasToken()) {
      return {
        broker: "dhan",
        clientId: rawCid || "NOT_CONFIGURED",
        clientIdMasked: maskedCid,
        tradingMode: "PAPER",
        connected: false,
        dataPlanActive: false,
        lastUpdated: Date.now(),
      };
    }

    try {
      const profile = await this.validateProfile();
      return {
        broker: "dhan",
        clientId: profile.dhanClientId,
        clientIdMasked: profile.clientIdMasked,
        accountName: `Dhan HQ ${this.client.isSandbox() ? "Sandbox" : "Live"}`,
        tradingMode: this.client.isSandbox() ? "PAPER" : "LIVE",
        connected: true,
        dataPlanActive: profile.dataPlanActive,
        tokenExpiryUtc: profile.tokenValidity,
        lastUpdated: Date.now(),
      };
    } catch {
      return {
        broker: "dhan",
        clientId: rawCid || "DHAN_AUTH_FAILED",
        clientIdMasked: maskedCid,
        tradingMode: "PAPER",
        connected: false,
        dataPlanActive: false,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Returns comprehensive system health and separate readiness states
   */
  public async getAuthStatus(): Promise<DhanAuthStatus> {
    const safeState = dhanTokenManager.getSafeState();
    let dataPlanActive = false;
    let dataValidity: string | undefined;
    let latencyMs = 0;
    let errorMessage = safeState.lastError;

    if (safeState.status === "AUTHENTICATED" || safeState.status === "EXPIRING") {
      const start = Date.now();
      try {
        const profile = await this.validateProfile();
        latencyMs = Date.now() - start;
        dataPlanActive = profile.dataPlanActive;
        dataValidity = profile.dataValidity;
      } catch (err: any) {
        latencyMs = Date.now() - start;
        errorMessage = err.safeMessage || err.message;
      }
    }

    const authState = safeState.status;
    const marketDataState = !dhanTokenManager.hasToken()
      ? "DISCONNECTED"
      : !dataPlanActive
      ? "DEGRADED"
      : "CONNECTED";

    const tradingState = authState === "AUTHENTICATED" && !this.client.isSandbox()
      ? "READY"
      : authState === "AUTHENTICATED"
      ? "READY" // Paper/Sandbox ready
      : "BLOCKED";

    return {
      authentication: authState,
      marketData: marketDataState,
      trading: tradingState,
      clientIdMasked: safeState.clientIdMasked,
      dataPlanActive,
      dataValidity,
      expiresAt: safeState.expiresAt,
      expiresInSeconds: safeState.expiresInSeconds,
      lastUpdated: Date.now(),
      latencyMs,
      errorMessage,
    };
  }
}

export const dhanAuth = new DhanAuth();
