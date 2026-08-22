/**
 * Quant.OS Central Authoritative Resilient API Client
 *
 * Capabilities:
 * 1. Single in-flight request deduplication for identical concurrent GET requests.
 * 2. Exponential backoff with random jitter for idempotent GET requests.
 * 3. Circuit breaker protecting backend against request storms during restarts/outages.
 * 4. Tab visibility awareness (pauses/slows requests when document is hidden).
 * 5. Safe content-type detection & JSON parsing preventing unhandled syntax exceptions.
 * 6. Server/Client environment isolation: uses relative paths on browser, BACKEND_INTERNAL_URL on server.
 * 7. Standardized ApiResponse envelope with request correlation IDs and audit timestamps.
 */

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
  statusCode?: number;
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
interface CircuitState {
  failures: number;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  lastFailureTime: number;
  nextAttemptTime: number;
}

class ResilientApiClient {
  private inFlightRequests: Map<string, Promise<ApiResponse<any>>> = new Map();
  private circuitBreakers: Map<string, CircuitState> = new Map();
  private maxConsecutiveFailures = 4;
  private circuitCooldownMs = 6000; // 6s cooldown before half-open probe

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
   * Resolves target URL ensuring same-origin relative paths on client
   */
  private resolveUrl(path: string): string {
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

    // HALF_OPEN allows a single probe attempt
    return { allowed: true };
  }

  /**
   * Record circuit success or failure
   */
  private recordCircuitResult(endpointKey: string, success: boolean) {
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
    } else {
      state.failures += 1;
      state.lastFailureTime = now;
      if (state.failures >= this.maxConsecutiveFailures || state.state === "HALF_OPEN") {
        state.state = "OPEN";
        state.nextAttemptTime = now + this.circuitCooldownMs;
      }
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
        ...options,
        headers: {
          ...headers,
          ...(options.headers as Record<string, string> || {}),
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
          // Non-JSON response (e.g. plain text 500 error or HTML)
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
        const errorMsg =
          parsedData?.error?.message ||
          parsedData?.error ||
          parsedData?.message ||
          `HTTP Error ${response.status}`;

        return {
          ok: false,
          data: parsedData,
          error: {
            code: parsedData?.error?.code || `HTTP_${response.status}`,
            message: typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg),
            details: parsedData,
            statusCode: response.status,
            retryable: response.status >= 500 || response.status === 429,
          },
          requestId,
          timestamp: new Date().toISOString(),
          latencyMs,
        };
      }

      // Check if backend returned structured error envelope with ok: false / success: false
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
    const maxRetries = isIdempotent ? (options.retries !== undefined ? options.retries : 2) : 0;
    const requestId = this.generateRequestId();

    // Check circuit breaker for idempotent reads
    if (!options.skipCircuitBreaker && isIdempotent) {
      const circuit = this.checkCircuitBreaker(endpointKey);
      if (!circuit.allowed) {
        return {
          ok: false,
          data: null,
          error: {
            code: "CIRCUIT_BREAKER_OPEN",
            message: circuit.reason || "Circuit breaker open: backend is temporarily unavailable",
            retryable: true,
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
        // Tab visibility backoff: if document is hidden, add a short delay
        if (typeof document !== "undefined" && document.visibilityState === "hidden" && isIdempotent) {
          await new Promise((r) => setTimeout(r, 200));
        }

        const result = await this.executeFetch<T>(resolvedUrl, options, requestId);

        if (result.ok) {
          this.recordCircuitResult(endpointKey, true);
          return result;
        }

        lastResult = result;

        // Only retry if error is retryable and we have remaining attempts
        if (result.error?.retryable && attempt < maxRetries) {
          attempt++;
          // Exponential backoff with random jitter (e.g. 300ms, 600ms, 1200ms)
          const baseDelay = 300 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * 150);
          const delay = Math.min(3000, baseDelay + jitter);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        break;
      }

      this.recordCircuitResult(endpointKey, false);
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

  // Convenience methods
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
}

export const apiClient = new ResilientApiClient();
