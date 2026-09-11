/**
 * Dhan HQ API v2 Authentication & Profile Types
 * Official Source of Truth for DhanHQ V2 API-Key Authentication Flow
 */

export interface DhanGenerateConsentResponse {
  consentAppId: string;
  consentAppStatus?: string;
  status: string;
  loginUrl?: string;
}

export interface DhanConsumeConsentResponse {
  dhanClientId: string;
  dhanClientName?: string;
  dhanClientUcc?: string;
  givenPowerOfAttorney?: boolean;
  accessToken: string;
  expiryTime?: string;
}

export interface DhanProfileResponse {
  dhanClientId?: string;
  tokenValidity?: string;
  activeSegment?: string;
  ddpi?: string;
  mtf?: string;
  dataPlan?: string;
  dataValidity?: string;
  status?: string;
  remarks?: string;
}

export interface DhanProfile {
  dhanClientId: string;
  clientIdMasked: string;
  tokenValidity?: string;
  activeSegment?: string;
  ddpi?: string;
  mtf?: string;
  dataPlan?: string;
  dataValidity?: string;
  dataPlanActive: boolean;
  raw?: DhanProfileResponse;
}

export type DhanAuthStatusType =
  | "NOT_CONFIGURED"
  | "AUTHENTICATING"
  | "AUTHENTICATED"
  | "EXPIRING"
  | "EXPIRED"
  | "INVALID"
  | "ERROR";

export type DhanMarketDataStatusType =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "SUBSCRIBING"
  | "LIVE"
  | "STALE"
  | "DEGRADED";

export type DhanTradingReadinessType = "READY" | "BLOCKED" | "ERROR";

export interface DhanAuthStatus {
  authentication: DhanAuthStatusType;
  marketData: DhanMarketDataStatusType;
  trading: DhanTradingReadinessType;
  clientIdMasked: string;
  dataPlanActive: boolean;
  dataValidity?: string;
  expiresAt: string | null;
  expiresInSeconds?: number;
  lastUpdated: number;
  latencyMs?: number;
  errorMessage?: string | null;
}

export class DhanAuthError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly safeMessage: string;
  public readonly retryable: boolean;

  constructor(
    errorCode: string,
    safeMessage: string,
    statusCode: number = 400,
    retryable: boolean = false
  ) {
    super(`[${errorCode}] ${safeMessage}`);
    this.name = "DhanAuthError";
    this.errorCode = errorCode;
    this.safeMessage = safeMessage;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}
