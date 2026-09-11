/**
 * Dhan HQ API v2 Server-Side Token Manager
 * STRICT SERVER-ONLY: Enforces token lifecycle, 24-hr expiry watchdog, concurrency locking, and zero token leakage.
 */

import { DhanAuthStatusType, DhanAuthError } from "./types";

export interface DhanTokenState {
  accessToken: string;
  expiresAt: number | null; // Unix timestamp in ms
  dhanClientId: string;
  authenticatedAt: number | null;
  status: DhanAuthStatusType;
  lastError: string | null;
}

export class DhanTokenManager {
  private static instance: DhanTokenManager | null = null;
  private state: DhanTokenState;
  private authLockPromise: Promise<any> | null = null;
  private readonly EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes safety buffer

  private constructor() {
    const envToken = process.env.DHAN_ACCESS_TOKEN || "";
    const envClientId = process.env.DHAN_CLIENT_ID || "";

    let initialExpiresAt: number | null = null;
    let initialStatus: DhanAuthStatusType = "NOT_CONFIGURED";

    if (envToken) {
      initialStatus = "AUTHENTICATED";
      // Inspect JWT exp if available
      try {
        const parts = envToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload.exp) {
            initialExpiresAt = payload.exp * 1000;
          }
        }
      } catch {}

      // Fallback 24-hr expiry if no exp in payload
      if (!initialExpiresAt) {
        initialExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
      }
    }

    this.state = {
      accessToken: envToken,
      expiresAt: initialExpiresAt,
      dhanClientId: envClientId,
      authenticatedAt: envToken ? Date.now() : null,
      status: initialStatus,
      lastError: null,
    };
  }

  public static getInstance(): DhanTokenManager {
    if (!DhanTokenManager.instance) {
      DhanTokenManager.instance = new DhanTokenManager();
    }
    return DhanTokenManager.instance;
  }

  /**
   * Retrieves the active access token if valid and unexpired.
   * Throws typed DhanAuthError if token is missing or expired.
   */
  public getValidAccessToken(): string {
    const status = this.checkStatus();
    if (status === "EXPIRED") {
      throw new DhanAuthError("DHAN_TOKEN_EXPIRED", "Dhan access token has expired. Please re-authenticate.", 401);
    }
    if (status === "NOT_CONFIGURED" || !this.state.accessToken) {
      throw new DhanAuthError("DHAN_AUTH_REQUIRED", "Dhan credentials not configured.", 401);
    }
    return this.state.accessToken;
  }

  /**
   * Raw access token getter for internal broker clients.
   */
  public getAccessToken(): string {
    return this.state.accessToken;
  }

  public getClientId(): string {
    return this.state.dhanClientId || process.env.DHAN_CLIENT_ID || "";
  }

  public getMaskedClientId(): string {
    const cid = this.getClientId();
    if (!cid) return "NOT_CONFIGURED";
    if (cid.length <= 4) return "****";
    return `****${cid.slice(-4)}`;
  }

  /**
   * Stores freshly acquired access token from consent consumption.
   */
  public setToken(
    accessToken: string,
    expiresAtMs?: number | string,
    clientId?: string
  ): void {
    if (!accessToken || typeof accessToken !== "string") {
      throw new DhanAuthError("INVALID_TOKEN", "Attempted to store empty or invalid Dhan access token");
    }

    let parsedExpiry: number;
    if (typeof expiresAtMs === "number") {
      parsedExpiry = expiresAtMs;
    } else if (typeof expiresAtMs === "string") {
      parsedExpiry = new Date(expiresAtMs).getTime() || Date.now() + 24 * 60 * 60 * 1000;
    } else {
      // Default 24h validity for DhanHQ V2 tokens
      parsedExpiry = Date.now() + 24 * 60 * 60 * 1000;
    }

    const cid = clientId || this.state.dhanClientId || process.env.DHAN_CLIENT_ID || "";

    this.state = {
      accessToken: accessToken.trim(),
      expiresAt: parsedExpiry,
      dhanClientId: cid,
      authenticatedAt: Date.now(),
      status: "AUTHENTICATED",
      lastError: null,
    };

    // Also update server process.env in memory for compatibility with existing modules
    process.env.DHAN_ACCESS_TOKEN = accessToken.trim();
    if (cid) process.env.DHAN_CLIENT_ID = cid;
  }

  /**
   * Invalidates current token session.
   */
  public invalidateToken(reason?: string): void {
    this.state = {
      ...this.state,
      accessToken: "",
      expiresAt: null,
      status: "NOT_CONFIGURED",
      lastError: reason || "Session disconnected",
    };
    delete process.env.DHAN_ACCESS_TOKEN;
  }

  /**
   * Evaluates current token freshness and returns computed status.
   */
  public checkStatus(): DhanAuthStatusType {
    if (!this.state.accessToken) {
      this.state.status = "NOT_CONFIGURED";
      return "NOT_CONFIGURED";
    }

    if (this.state.expiresAt) {
      const now = Date.now();
      if (now >= this.state.expiresAt) {
        this.state.status = "EXPIRED";
        return "EXPIRED";
      }
      if (now >= this.state.expiresAt - this.EXPIRY_BUFFER_MS) {
        this.state.status = "EXPIRING";
        return "EXPIRING";
      }
    }

    this.state.status = "AUTHENTICATED";
    return "AUTHENTICATED";
  }

  public isExpiring(): boolean {
    return this.checkStatus() === "EXPIRING";
  }

  public isExpired(): boolean {
    return this.checkStatus() === "EXPIRED";
  }

  public hasToken(): boolean {
    const status = this.checkStatus();
    return Boolean(this.state.accessToken) && status !== "EXPIRED" && status !== "INVALID";
  }

  /**
   * Concurrency Lock: Wraps an async authentication action so only ONE executes at a time.
   */
  public async withAuthLock<T>(action: () => Promise<T>): Promise<T> {
    if (this.authLockPromise) {
      return this.authLockPromise as Promise<T>;
    }

    this.state.status = "AUTHENTICATING";
    this.authLockPromise = (async () => {
      try {
        const result = await action();
        return result;
      } finally {
        this.authLockPromise = null;
      }
    })();

    return this.authLockPromise as Promise<T>;
  }

  /**
   * Safe status snapshot (ZERO token exposure).
   */
  public getSafeState() {
    const status = this.checkStatus();
    const expiresInSec = this.state.expiresAt
      ? Math.max(0, Math.floor((this.state.expiresAt - Date.now()) / 1000))
      : 0;

    return {
      status,
      clientIdMasked: this.getMaskedClientId(),
      expiresAt: this.state.expiresAt ? new Date(this.state.expiresAt).toISOString() : null,
      expiresInSeconds: expiresInSec,
      authenticatedAt: this.state.authenticatedAt ? new Date(this.state.authenticatedAt).toISOString() : null,
      lastError: this.state.lastError,
    };
  }
}

export const dhanTokenManager = DhanTokenManager.getInstance();
