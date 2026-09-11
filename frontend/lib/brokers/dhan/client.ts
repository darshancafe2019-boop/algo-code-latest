/**
 * Dhan HQ API v2 Typed Client (Sandbox & Live)
 * Features:
 * - Dynamic token resolution from DhanTokenManager
 * - Structured Dhan error code mappings
 * - Rate limit & timeout protection
 * - Zero token leakage in error dumps
 */

import { dhanTokenManager } from "./token-manager";
import { DhanAuthError } from "./types";

export interface DhanRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  data?: any;
  accessToken?: string;
  clientId?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class DhanClient {
  private baseUrl: string;
  private overrideToken?: string;
  private overrideClientId?: string;

  constructor(accessToken?: string, clientId?: string, baseUrl?: string) {
    this.overrideToken = accessToken;
    this.overrideClientId = clientId;
    const isSandbox =
      process.env.DHAN_SANDBOX === "true" ||
      process.env.DHAN_ENV?.toUpperCase() === "SANDBOX";
    this.baseUrl =
      baseUrl ||
      process.env.DHAN_BASE_URL ||
      (isSandbox ? "https://sandbox.dhan.co/v2" : "https://api.dhan.co/v2");
  }

  public setCredentials(accessToken: string, clientId?: string, baseUrl?: string) {
    this.overrideToken = accessToken.trim();
    if (clientId !== undefined) this.overrideClientId = clientId.trim();
    if (baseUrl) this.baseUrl = baseUrl.trim();
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public isSandbox(): boolean {
    return this.baseUrl.includes("sandbox");
  }

  public hasToken(): boolean {
    return Boolean(this.getAccessToken());
  }

  public getClientId(): string {
    return this.overrideClientId || dhanTokenManager.getClientId() || process.env.DHAN_CLIENT_ID || "";
  }

  public getAccessToken(): string {
    return this.overrideToken || dhanTokenManager.getAccessToken() || process.env.DHAN_ACCESS_TOKEN || "";
  }

  public async request<T = any>(options: DhanRequestOptions): Promise<T> {
    const token = options.accessToken || this.getAccessToken();
    const cid = options.clientId || this.getClientId();
    const base = options.baseUrl || this.baseUrl;
    const method = options.method || "GET";
    const timeoutMs = options.timeoutMs || 8000;

    if (!token) {
      throw new DhanAuthError("DHAN_AUTH_REQUIRED", "Dhan Access Token is not configured.", 401);
    }

    const cleanPath = options.path.replace(/^\//, "");
    const url = `${base.replace(/\/$/, "")}/${cleanPath}`;

    const headers: Record<string, string> = {
      "access-token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (cid) {
      headers["client-id"] = cid;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.data && method !== "GET" ? JSON.stringify(options.data) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errBody: any;
        try {
          errBody = await response.json();
        } catch {
          errBody = { message: `HTTP ${response.status}` };
        }

        const rawCode = errBody?.errorCode || errBody?.errorType || errBody?.code || `HTTP_${response.status}`;
        const rawMsg = errBody?.errorMessage || errBody?.message || errBody?.error || `Dhan API error (${response.status})`;

        if (response.status === 401 || response.status === 403 || rawCode === "DH-901" || rawCode === "807") {
          dhanTokenManager.invalidateToken("Dhan API returned 401/403 Unauthorized");
        }

        throw new DhanAuthError(rawCode, rawMsg, response.status, response.status >= 500);
      }

      const resJson = await response.json();
      return resJson as T;
    } catch (error: any) {
      clearTimeout(timer);
      if (error instanceof DhanAuthError) {
        throw error;
      }
      if (error.name === "AbortError") {
        throw new DhanAuthError("DHAN_TIMEOUT", `Request to Dhan timed out after ${timeoutMs}ms.`, 408, true);
      }
      throw new DhanAuthError("DHAN_NETWORK_ERROR", error.message || "Failed to reach Dhan API", 500, true);
    }
  }
}

export const dhanClient = new DhanClient();
