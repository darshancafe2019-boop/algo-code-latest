/**
 * Centralized Upstox REST API Client
 * ==================================
 * Executes authenticated HTTP requests to Upstox V2 and V3 endpoints.
 * Handles token injection, rate limits, timeouts, and sanitized error mapping.
 */

import { getUpstoxMarketDataToken } from "./credentials";
import {
  UpstoxAuthError,
  UpstoxRateLimitError,
  UpstoxNetworkError,
  UpstoxValidationError,
  UpstoxError,
} from "./errors";

const UPSTOX_BASE_V2 = "https://api.upstox.com/v2";
const UPSTOX_BASE_V3 = "https://api.upstox.com/v3";

export interface UpstoxRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  params?: Record<string, any>;
  body?: any;
  apiVersion?: "v2" | "v3";
  oauthToken?: string | null;
  timeoutMs?: number;
}

export async function upstoxFetch<T = any>(
  endpoint: string,
  options: UpstoxRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    params,
    body,
    apiVersion = "v2",
    oauthToken,
    timeoutMs = 8000,
  } = options;

  const tokenResolution = getUpstoxMarketDataToken(oauthToken);
  if (!tokenResolution.isValid || !tokenResolution.token) {
    throw new UpstoxAuthError(tokenResolution.error || "Upstox token is missing.");
  }

  const base = apiVersion === "v3" ? UPSTOX_BASE_V3 : UPSTOX_BASE_V2;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${base}${cleanEndpoint}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${tokenResolution.token}`,
    "User-Agent": "QuantOS-Algo-Trading-Platform/1.0",
  };

  if (body && (method === "POST" || method === "PUT")) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg =
        data?.message ||
        data?.error ||
        data?.errors?.[0]?.message ||
        `Upstox API request to ${cleanEndpoint} failed with HTTP ${response.status}.`;

      if (response.status === 401) {
        throw new UpstoxAuthError(errMsg);
      }
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after")) || 5;
        throw new UpstoxRateLimitError(errMsg, retryAfter);
      }
      if (response.status === 400) {
        throw new UpstoxValidationError(errMsg);
      }
      throw new UpstoxError(errMsg, `HTTP_${response.status}`, response.status);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof UpstoxError) {
      throw err;
    }
    if (err.name === "AbortError") {
      throw new UpstoxNetworkError(`Upstox request timed out after ${timeoutMs}ms.`);
    }
    throw new UpstoxNetworkError(err?.message || "Failed to communicate with Upstox API.");
  }
}
