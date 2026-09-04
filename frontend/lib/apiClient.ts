/**
 * Quant.OS Central Authoritative Resilient API Client & Streaming Engine
 * =====================================================================
 * Capabilities:
 * 1. Single in-flight request deduplication for identical concurrent GET requests.
 * 2. Exponential backoff with random jitter for idempotent GET requests.
 * 3. Authoritative global & endpoint circuit breaker protecting backend from request storms.
 * 4. Automatic background health probe & self-healing recovery loop.
 * 5. Resilient EventSource / SSE connection engine with exponential backoff & single-instance management.
 * 6. Tab visibility awareness & browser online/offline listeners.
 * 7. Safe content-type detection & JSON parsing preventing unhandled syntax exceptions.
 * 8. Server/Client environment isolation: uses relative paths on browser, BACKEND_INTERNAL_URL on server.
 * 9. Standardized ApiResponse envelope with request correlation IDs and audit timestamps.
 */

export type ConnectionState = "HEALTHY" | "UNSTABLE" | "BACKEND_UNAVAILABLE";

export type ApiErrorCode =
  | "BACKEND_UNREACHABLE"
  | "AUTHENTICATION_REQUIRED"
  | "AUTHORIZATION_DENIED"
  | "RATE_LIMITED"
  | "BACKEND_INTERNAL_ERROR"
  | "PROVIDER_DEGRADED"
  | "DATABASE_DEGRADED"
  | "CIRCUIT_BREAKER_OPEN"
  | "REQUEST_TIMEOUT"
  | "NETWORK_ERROR"
  | "BUSINESS_LOGIC_ERROR"
  | string;

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: any;
  retryable?: boolean;
  statusCode?: number;
}

export function classifyHttpError(
  status: number,
  data?: any
): { code: ApiErrorCode; message: string; isNetworkFailure: boolean } {
  if (status === 401) {
    return {
      code: "AUTHENTICATION_REQUIRED",
      message: data?.error?.message || data?.message || "Authentication required. Please sign in.",
      isNetworkFailure: false,
    };
  }
  if (status === 403) {
    return {
      code: "AUTHORIZATION_DENIED",
      message: data?.error?.message || data?.message || "Access denied. Insufficient privileges.",
      isNetworkFailure: false,
    };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      message: data?.error?.message || data?.message || "Rate limit reached. Please wait before retrying.",
      isNetworkFailure: false,
    };
  }
  if (status === 503 || status === 504) {
    const isProvider = data?.error?.code === "PROVIDER_DEGRADED" || data?.provider;
    const isDb = data?.error?.code === "DATABASE_DEGRADED" || data?.database === "ERROR" || data?.database === false;
    if (isProvider) {
      return {
        code: "PROVIDER_DEGRADED",
        message: data?.error?.message || data?.message || "Market data provider is degraded.",
        isNetworkFailure: false,
      };
    }
    if (isDb) {
      return {
        code: "DATABASE_DEGRADED",
        message: data?.error?.message || data?.message || "Database storage is currently degraded.",
        isNetworkFailure: false,
      };
    }
    return {
      code: "BACKEND_UNREACHABLE",
      message: data?.error?.message || data?.message || "Backend service is unreachable.",
      isNetworkFailure: true,
    };
  }
  if (status >= 500) {
    return {
      code: "BACKEND_INTERNAL_ERROR",
      message: data?.error?.message || data?.message || `Server internal error (${status})`,
      isNetworkFailure: false,
    };
  }
  return {
    code: data?.error?.code || `HTTP_${status}`,
    message: data?.error?.message || data?.message || `Request failed with status ${status}`,
    isNetworkFailure: false,
  };
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data: T | null;
  error: ApiError | null;
  requestId: string;
  timestamp: string;
  latencyMs?: number;
  isStale?: boolean;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  deduplicate?: boolean;
  skipCircuitBreaker?: boolean;
  idempotencyKey?: string;
  customHeaders?: Record<string, string>;
}

// Circuit Breaker State
export interface CircuitState {
  failures: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  lastFailureTime: number;
  nextAttemptTime: number;
}

export interface ResilientEventSourceOptions {
  key?: string;
  maxBackoffMs?: number;
  initialBackoffMs?: number;
  onOpen?: () => void;
  onMessage?: (data: any, event: MessageEvent) => void;
  onError?: (err: any) => void;
  onStateChange?: (state: "CONNECTING" | "OPEN" | "CLOSED" | "RECONNECTING") => void;
}

export interface ResilientEventSourceHandle {
  close: () => void;
  reconnect: () => void;
  isConnected: () => boolean;
}


class ResilientApiClient {
  private inFlightRequests: Map<string, Promise<ApiResponse<any>>> = new Map();
  private circuitBreakers: Map<string, CircuitState> = new Map();
  private activeEventSources: Map<string, ResilientEventSourceHandle> = new Map();
  private maxConsecutiveFailures = 3;
  private circuitCooldownMs = 6000;
  private isBackendOffline = false;
  private lastConnectedTimestamp = Date.now();
  private lastLoggedFailureEpisode = 0;

  // Dedicated 3-Stage State Machine for Liveness
  private connectionState: ConnectionState = "HEALTHY";
  private consecutiveLivenessFailures = 0;
  private consecutiveLivenessSuccesses = 0;
  private backoffIndex = 0;
  private readonly backoffDelaysMs = [1000, 2000, 5000, 10000, 15000, 30000];
  private readonly normalPollingIntervalMs = 5000;
  private healthPollingTimer: any = null;
  private activeProbeController: AbortController | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.probeHealth();
      });
      window.addEventListener("offline", () => {
        this.connectionState = "BACKEND_UNAVAILABLE";
        this.isBackendOffline = true;
        this.notifyOffline({ statusCode: 0, reason: "Browser offline" });
      });

      // Start the single continuous background health polling loop
      this.startHealthPolling();
    }
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Generates a unique correlation request ID
   */
  public generateRequestId(): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `req_${ts}_${rand}`;
  }

  /**
   * Generates a strict idempotency key for state-changing commands
   */
  public generateIdempotencyKey(action: string, targetId?: string): string {
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    return `IDEM_${action}_${targetId || "SYS"}_${ts}_${rand}`;
  }

  /**
   * Returns current backend offline state
   */
  public isOffline(): boolean {
    return this.isBackendOffline || this.connectionState === "BACKEND_UNAVAILABLE";
  }

  /**
   * Returns timestamp of last successful connection
   */
  public getLastConnectedTime(): number {
    return this.lastConnectedTimestamp;
  }

  /**
   * Resolves target URL ensuring same-origin relative paths on client
   */
  public resolveUrl(path: string): string {
    if (typeof window !== "undefined") {
      // Browser environment: always use same-origin relative path
      if (path.startsWith("http://") || path.startsWith("https://")) {
        try {
          const parsed = new URL(path);
          return `${parsed.pathname}${parsed.search}`;
        } catch {
          return path;
        }
      }
      return path.startsWith("/") ? path : `/${path}`;
    }

    // Server-side environment (SSR/Route Handlers): use server-only internal URL
    const backendBase = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${backendBase}${cleanPath}`;
  }

  /**
   * Check circuit breaker status for an endpoint key
   */
  private checkCircuitBreaker(endpointKey: string): { allowed: boolean; reason?: string } {
    const isHealthProbe = endpointKey.startsWith("GET:/api/health") || endpointKey.startsWith("GET:/health");
    if (this.isBackendOffline && !isHealthProbe) {
      return {
        allowed: false,
        reason: "Backend is currently unavailable. Circuit breaker OPEN to prevent request storm.",
      };
    }

    const state = this.circuitBreakers.get(endpointKey);
    if (!state || state.state === "CLOSED") {
      return { allowed: true };
    }

    const now = Date.now();
    if (state.state === "OPEN") {
      if (now >= state.nextAttemptTime) {
        state.state = "HALF_OPEN";
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Circuit breaker OPEN for ${endpointKey}. Cooling down until ${new Date(state.nextAttemptTime).toISOString()}`,
      };
    }

    // HALF_OPEN allows single probe attempt
    return { allowed: true };
  }

  /**
   * Record circuit success or failure and notify window event bus
   */
  private recordCircuitResult(endpointKey: string, success: boolean, statusCode?: number) {
    let state = this.circuitBreakers.get(endpointKey);
    if (!state) {
      state = {
        failures: 0,
        state: "CLOSED",
        lastFailureTime: 0,
        nextAttemptTime: 0,
      };
      this.circuitBreakers.set(endpointKey, state);
    }

    const now = Date.now();

    if (success) {
      state.failures = 0;
      state.state = "CLOSED";
      this.lastConnectedTimestamp = now;
    } else {
      // 401, 403, 429, and client 4xx errors are NOT endpoint circuit trips or backend outages
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        return;
      }

      state.failures += 1;
      state.lastFailureTime = now;

      if (state.failures >= this.maxConsecutiveFailures || state.state === "HALF_OPEN") {
        state.state = "OPEN";
        state.nextAttemptTime = now + this.circuitCooldownMs;
      }

      // If genuine network transport or gateway failure occurred, trigger health probe immediately
      if (statusCode === 503 || statusCode === 504 || statusCode === 0) {
        this.probeHealth();
      }
    }
  }

  private notifyOffline(details?: any) {
    if (typeof window !== "undefined") {
      const now = Date.now();
      if (now - this.lastLoggedFailureEpisode > 10000) {
        this.lastLoggedFailureEpisode = now;
        console.warn("[Quant.OS Client] Backend unavailable. Entering protected circuit-breaker mode.");
      }
      window.dispatchEvent(new CustomEvent("quantos:offline", { detail: details || {} }));
    }
  }

  private notifyOnline() {
    if (typeof window !== "undefined") {
      console.info("[Quant.OS Client] Backend connection recovered. Normal operations resumed.");
      window.dispatchEvent(new CustomEvent("quantos:online"));
    }
  }

  /**
   * Start the single continuous background health polling loop
   */
  public startHealthPolling() {
    if (this.healthPollingTimer) return;
    this.scheduleNextProbe(this.normalPollingIntervalMs);
  }

  public stopHealthPolling() {
    if (this.healthPollingTimer) {
      clearTimeout(this.healthPollingTimer);
      this.healthPollingTimer = null;
    }
    if (this.activeProbeController) {
      this.activeProbeController.abort();
      this.activeProbeController = null;
    }
  }

  private scheduleNextProbe(explicitDelayMs?: number) {
    if (this.healthPollingTimer) {
      clearTimeout(this.healthPollingTimer);
      this.healthPollingTimer = null;
    }

    const nextDelay =
      explicitDelayMs !== undefined
        ? explicitDelayMs
        : this.connectionState === "HEALTHY"
        ? this.normalPollingIntervalMs
        : this.backoffDelaysMs[Math.min(this.backoffIndex, this.backoffDelaysMs.length - 1)];

    this.healthPollingTimer = setTimeout(async () => {
      this.healthPollingTimer = null;
      await this.probeHealth();
      this.scheduleNextProbe();
    }, nextDelay);
  }

  /**
   * Dedicated 3-Stage Liveness State Machine:
   * Polls /api/health/live.
   * - 1 failure: silent retry, stay in current state (no red banner).
   * - 2 consecutive failures: UNSTABLE, continue retrying.
   * - 3 consecutive failures: BACKEND_UNAVAILABLE, activate fail-closed protection, dispatch quantos:offline.
   * - Recovery: requires 2 consecutive HTTP 200 responses before returning to HEALTHY.
   */
  public async probeHealth(): Promise<boolean> {
    if (typeof window === "undefined") return true;

    if (this.activeProbeController) {
      this.activeProbeController.abort();
    }
    const controller = new AbortController();
    this.activeProbeController = controller;
    const timer = setTimeout(() => controller.abort(), 3500);

    const url = this.resolveUrl("/api/health/live");
    let isSuccess = false;
    let statusCode = 0;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Request-Id": this.generateRequestId(),
        },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      this.activeProbeController = null;
      statusCode = res.status;
      if (res.ok) {
        isSuccess = true;
      }
    } catch {
      clearTimeout(timer);
      this.activeProbeController = null;
      isSuccess = false;
    }

    if (isSuccess) {
      this.lastConnectedTimestamp = Date.now();
      this.consecutiveLivenessFailures = 0;
      this.consecutiveLivenessSuccesses += 1;

      // Require 2 consecutive HTTP 200 liveness responses before returning to HEALTHY
      if (this.consecutiveLivenessSuccesses >= 2 || this.connectionState === "HEALTHY") {
        if (this.connectionState !== "HEALTHY") {
          this.connectionState = "HEALTHY";
          this.isBackendOffline = false;
          this.backoffIndex = 0;
          this.circuitBreakers.clear();
          this.notifyOnline();
          // Trigger authoritative state reconciliation upon recovery
          window.dispatchEvent(new CustomEvent("quantos:reconcile"));
        }
      }
      return true;
    } else {
      this.consecutiveLivenessSuccesses = 0;
      this.consecutiveLivenessFailures += 1;

      if (this.consecutiveLivenessFailures === 1) {
        // One failed request: silent retry, do not show global red outage banner
      } else if (this.consecutiveLivenessFailures === 2) {
        // Two consecutive failures: mark connection unstable, continue retrying
        this.connectionState = "UNSTABLE";
      } else if (this.consecutiveLivenessFailures >= 3) {
        // Three consecutive liveness failures: enter BACKEND_UNAVAILABLE state
        const wasOffline = this.isBackendOffline;
        this.connectionState = "BACKEND_UNAVAILABLE";
        this.isBackendOffline = true;
        if (!wasOffline) {
          this.notifyOffline({ statusCode, reason: "3 consecutive liveness failures" });
        }
      }

      if (this.backoffIndex < this.backoffDelaysMs.length - 1) {
        this.backoffIndex += 1;
      }

      return false;
    }
  }

  /**
   * Resets circuit breaker manually and restores normal state
   */
  public resetCircuit() {
    this.circuitBreakers.clear();
    this.consecutiveLivenessFailures = 0;
    this.consecutiveLivenessSuccesses = 2;
    this.connectionState = "HEALTHY";
    this.isBackendOffline = false;
    this.backoffIndex = 0;
    this.notifyOnline();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("quantos:reconcile"));
    }
  }

  /**
   * Safe fetch with timeout, content parsing, and error normalization
   */
  private async executeFetch<T>(
    url: string,
    options: RequestOptions,
    requestId: string
  ): Promise<ApiResponse<T>> {
    const timeoutMs = options.timeoutMs || 8000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Request-Id": requestId,
      ...(options.customHeaders || {}),
    };


    if (options.idempotencyKey) {
      headers["X-Idempotency-Key"] = options.idempotencyKey;
    }

    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const startTime = performance.now();

    try {
      const response = await fetch(url, {
        credentials: options.credentials || "include",
        ...options,
        headers: {
          ...headers,
          ...((options.headers as Record<string, string>) || {}),
        },
        signal: options.signal || controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - startTime);
      const rawText = await response.text();

      let parsedData: any = null;
      if (rawText && rawText.trim().length > 0) {
        try {
          parsedData = JSON.parse(rawText);
        } catch {
          if (!response.ok) {
            return {
              ok: false,
              data: null,
              error: {
                code: `HTTP_${response.status}`,
                message: rawText.substring(0, 300) || `Request failed with HTTP status ${response.status}`,
                statusCode: response.status,
                retryable: response.status >= 500,
              },
              requestId,
              timestamp: new Date().toISOString(),
              latencyMs,
            };
          }
          parsedData = rawText;
        }
      }

      if (!response.ok) {
        const classified = classifyHttpError(response.status, parsedData);
        return {
          ok: false,
          data: parsedData,
          error: {
            code: classified.code,
            message: classified.message,
            details: parsedData,
            statusCode: response.status,
            retryable: response.status >= 500 || response.status === 429,
          },
          requestId,
          timestamp: new Date().toISOString(),
          latencyMs,
        };
      }

      if (parsedData && typeof parsedData === "object") {
        if (parsedData.ok === false || parsedData.success === false || parsedData.status === "error") {
          return {
            ok: false,
            data: parsedData.data !== undefined ? parsedData.data : parsedData,
            error: {
              code: parsedData.error?.code || parsedData.code || "BUSINESS_LOGIC_ERROR",
              message: parsedData.error?.message || parsedData.error || parsedData.message || "Operation failed",
              details: parsedData,
              statusCode: 400,
              retryable: false,
            },
            requestId,
            timestamp: new Date().toISOString(),
            latencyMs,
          };
        }
      }

      return {
        ok: true,
        data: parsedData as T,
        error: null,
        requestId,
        timestamp: new Date().toISOString(),
        latencyMs,
      };
    } catch (err: any) {
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - startTime);
      const isAbort = err.name === "AbortError";

      return {
        ok: false,
        data: null,
        error: {
          code: isAbort ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
          message: isAbort ? `Request timed out after ${timeoutMs}ms` : err.message || "Network connection failed",
          details: err,
          retryable: true,
          statusCode: isAbort ? 504 : 503,
        },
        requestId,
        timestamp: new Date().toISOString(),
        latencyMs,
      };
    }
  }

  /**
   * Main request method with deduplication, retries, and circuit breaker
   */
  public async request<T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const method = (options.method || "GET").toUpperCase();
    const resolvedUrl = this.resolveUrl(path);
    const endpointKey = `${method}:${path.split("?")[0]}`;
    const isIdempotent = method === "GET" || method === "HEAD";
    const shouldDeduplicate = options.deduplicate !== false && isIdempotent;
    const maxRetries = isIdempotent ? (options.retries !== undefined ? options.retries : 1) : 0;
    const requestId = this.generateRequestId();

    // Strict fail-closed execution protection: block non-idempotent order/bot execution while backend is offline
    if (this.isOffline() && !options.skipCircuitBreaker && !isIdempotent) {
      return {
        ok: false,
        data: null,
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Execution blocked: Fail-closed trading protection active while backend is offline.",
          retryable: false,
          statusCode: 503,
        },
        requestId,
        timestamp: new Date().toISOString(),
      };
    }

    // Check circuit breaker
    if (!options.skipCircuitBreaker) {
      const circuit = this.checkCircuitBreaker(endpointKey);
      if (!circuit.allowed) {
        return {
          ok: false,
          data: null,
          error: {
            code: "CIRCUIT_BREAKER_OPEN",
            message: circuit.reason || "Circuit breaker open: backend is temporarily unavailable",
            retryable: true,
            statusCode: 503,
          },
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Check in-flight deduplication
    if (shouldDeduplicate && this.inFlightRequests.has(resolvedUrl)) {
      return this.inFlightRequests.get(resolvedUrl) as Promise<ApiResponse<T>>;
    }

    const executionPromise = (async () => {
      let attempt = 0;
      let lastResult: ApiResponse<T> | null = null;

      while (attempt <= maxRetries) {
        if (typeof document !== "undefined" && document.visibilityState === "hidden" && isIdempotent) {
          await new Promise((r) => setTimeout(r, 200));
        }

        const result = await this.executeFetch<T>(resolvedUrl, options, requestId);

        if (result.ok) {
          this.recordCircuitResult(endpointKey, true);
          return result;
        }

        lastResult = result;

        if (result.error?.retryable && attempt < maxRetries && !this.isBackendOffline) {
          attempt++;
          const baseDelay = 300 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * 150);
          const delay = Math.min(2500, baseDelay + jitter);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        break;
      }

      this.recordCircuitResult(endpointKey, false, lastResult?.error?.statusCode);
      return lastResult!;
    })();

    if (shouldDeduplicate) {
      this.inFlightRequests.set(resolvedUrl, executionPromise);
      executionPromise.finally(() => {
        this.inFlightRequests.delete(resolvedUrl);
      });
    }

    return executionPromise;
  }

  /**
   * Resilient EventSource helper with bounded exponential backoff & single instance ownership
   */
  public createResilientEventSource(
    path: string,
    options: ResilientEventSourceOptions = {}
  ): ResilientEventSourceHandle {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return { close: () => {}, reconnect: () => {}, isConnected: () => false };
    }

    const resolvedUrl = this.resolveUrl(path);
    const streamKey = options.key || resolvedUrl;

    // Close any prior active instance for this streamKey
    if (this.activeEventSources.has(streamKey)) {
      this.activeEventSources.get(streamKey)?.close();
      this.activeEventSources.delete(streamKey);
    }

    let es: EventSource | null = null;
    let reconnectTimer: any = null;
    let attemptCount = 0;
    let isExplicitlyClosed = false;
    const maxBackoff = options.maxBackoffMs || 15000;
    const initialBackoff = options.initialBackoffMs || 1500;

    const cleanupCurrentSource = () => {
      if (es) {
        es.onopen = null;
        es.onmessage = null;
        es.onerror = null;
        es.close();
        es = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connect = () => {
      if (isExplicitlyClosed) return;
      cleanupCurrentSource();

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        options.onStateChange?.("CLOSED");
        return;
      }

      if (this.isBackendOffline) {
        options.onStateChange?.("RECONNECTING");
        scheduleReconnect();
        return;
      }

      try {
        options.onStateChange?.("CONNECTING");
        es = new EventSource(resolvedUrl);

        es.onopen = () => {
          attemptCount = 0;
          options.onStateChange?.("OPEN");
          options.onOpen?.();
          this.recordCircuitResult(`SSE:${streamKey}`, true);
        };

        es.onmessage = (event) => {
          this.lastConnectedTimestamp = Date.now();
          if (options.onMessage) {
            try {
              const parsed = JSON.parse(event.data);
              options.onMessage(parsed, event);
            } catch {
              options.onMessage(event.data, event);
            }
          }
        };

        es.onerror = (err) => {
          options.onStateChange?.("RECONNECTING");
          options.onError?.(err);
          this.recordCircuitResult(`SSE:${streamKey}`, false);
          cleanupCurrentSource();
          if (!isExplicitlyClosed) {
            scheduleReconnect();
          }
        };
      } catch (err) {
        cleanupCurrentSource();
        if (!isExplicitlyClosed) {
          scheduleReconnect();
        }
      }
    };

    const scheduleReconnect = () => {
      if (isExplicitlyClosed || reconnectTimer) return;
      attemptCount++;
      const baseDelay = Math.min(maxBackoff, initialBackoff * Math.pow(1.5, attemptCount - 1));
      const jitter = Math.floor(Math.random() * 400);
      const delay = baseDelay + jitter;

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!isExplicitlyClosed) {
          connect();
        }
      }, delay);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isExplicitlyClosed && !es) {
        connect();
      }
    };

    const onOnline = () => {
      if (!isExplicitlyClosed && !es) {
        connect();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    connect();

    const handle: ResilientEventSourceHandle = {
      close: () => {
        isExplicitlyClosed = true;
        cleanupCurrentSource();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("online", onOnline);
        this.activeEventSources.delete(streamKey);
        options.onStateChange?.("CLOSED");
      },
      reconnect: () => {
        isExplicitlyClosed = false;
        attemptCount = 0;
        connect();
      },
      isConnected: () => es !== null && es.readyState === EventSource.OPEN,
    };

    this.activeEventSources.set(streamKey, handle);
    return handle;
  }

  // Convenience HTTP methods
  public get<T = any>(path: string, options: Omit<RequestOptions, "method"> = {}) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  public post<T = any>(path: string, body?: any, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body || {}),
    });
  }

  public put<T = any>(path: string, body?: any, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body || {}),
    });
  }

  public delete<T = any>(path: string, options: Omit<RequestOptions, "method"> = {}) {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  public patch<T = any>(path: string, body?: any, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return this.request<T>(path, {
      ...options,
      method: "PATCH",
      body: typeof body === "string" ? body : JSON.stringify(body || {}),
    });
  }
}

export const apiClient = new ResilientApiClient();
