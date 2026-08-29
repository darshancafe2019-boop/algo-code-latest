/**
 * Upstox Custom Error Classes
 * ============================
 * Provides explicit, human-readable error categorization without exposing secrets.
 */

export class UpstoxError extends Error {
  public statusCode?: number;
  public errorCode: string;
  public code: string;

  constructor(message: string, errorCode: string = "UPSTOX_ERROR", statusCode?: number) {
    super(message);
    this.name = "UpstoxError";
    this.errorCode = errorCode;
    this.code = errorCode;
    this.statusCode = statusCode;
  }
}

export class UpstoxAuthError extends UpstoxError {
  constructor(message: string = "Upstox authentication required or access token expired.") {
    super(message, "UPSTOX_AUTH_ERROR", 401);
    this.name = "UpstoxAuthError";
  }
}

export class UpstoxRateLimitError extends UpstoxError {
  public retryAfterSeconds?: number;

  constructor(message: string = "Upstox API rate limit exceeded.", retryAfter?: number) {
    super(message, "UPSTOX_RATE_LIMIT", 429);
    this.name = "UpstoxRateLimitError";
    this.retryAfterSeconds = retryAfter;
  }
}

export class UpstoxNetworkError extends UpstoxError {
  constructor(message: string = "Network failure while communicating with Upstox API.") {
    super(message, "UPSTOX_NETWORK_ERROR", 503);
    this.name = "UpstoxNetworkError";
  }
}

export class UpstoxProtobufDecodeError extends UpstoxError {
  constructor(message: string = "Failed to decode binary Protobuf frame from Upstox V3 feed.") {
    super(message, "UPSTOX_PROTOBUF_DECODE_ERROR", 500);
    this.name = "UpstoxProtobufDecodeError";
  }
}

export class UpstoxValidationError extends UpstoxError {
  constructor(message: string = "Invalid instrument key or parameter provided.") {
    super(message, "UPSTOX_VALIDATION_ERROR", 400);
    this.name = "UpstoxValidationError";
  }
}

export class UpstoxTradingDisabledError extends UpstoxError {
  constructor(message: string = "Real live automated trading is disabled by safety policy (UPSTOX_TRADING_ENABLED=false).") {
    super(message, "UPSTOX_TRADING_DISABLED", 403);
    this.name = "UpstoxTradingDisabledError";
  }
}
