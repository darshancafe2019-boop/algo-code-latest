import { NextRequest, NextResponse } from "next/server";
import { getBackendConfigStatus } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export interface ProxyOptions {
  timeoutMs?: number;
  apiPrefix?: string; // e.g. "/api/v2" or "/api"
  cacheTtlMs?: number;
  allowRetries?: boolean;
}

interface CacheEntry {
  status: number;
  body: ArrayBuffer;
  contentType: string;
  timestamp: number;
}

const proxyMicroCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 300;

/**
 * Universal, loopback-safe, resilient proxy forwarder to the Quant.OS Engine.
 */
export async function proxyToBackend(
  req: NextRequest,
  subPath: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const {
    timeoutMs = 12000,
    apiPrefix = "/api/v2",
    cacheTtlMs = 1000,
    allowRetries = true,
  } = options;

  const config = getBackendConfigStatus();
  const requestId =
    req.headers.get("x-request-id") ||
    `proxy_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = performance.now();

  // Fail-closed immediately if backend URL is unconfigured or set to an invalid loopback address in production
  if (!config.valid) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        status: "error",
        data: null,
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message:
            config.reason ||
            "Quant.OS Engine backend URL is not configured. In production (Vercel), configure BACKEND_INTERNAL_URL or BACKEND_API_URL in project environment settings.",
          retryable: false,
        },
        requestId,
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      },
      {
        status: 503,
        headers: {
          "X-Request-Id": requestId,
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  const backendBase = config.url;
  const cleanSubPath = subPath.replace(/^\/+/, "");
  const prefix = apiPrefix.replace(/\/+$/, "");
  const url = new URL(req.url);
  const targetUrl = `${backendBase}${prefix ? `${prefix}/` : "/"}${cleanSubPath}${url.search}`;
  const cacheKey = `${req.method}:${prefix}/${cleanSubPath}${url.search}`;

  // Invalidate cache on mutations
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (isMutation) {
    proxyMicroCache.clear();
  }

  // Check micro-cache for idempotent GET
  if (req.method === "GET" && cacheTtlMs > 0) {
    const cached = proxyMicroCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      const responseHeaders = new Headers();
      responseHeaders.set("X-Cache-Hit", "true");
      responseHeaders.set("X-Response-Time-Ms", "0");
      responseHeaders.set("X-Request-Id", requestId);
      if (cached.contentType) {
        responseHeaders.set("Content-Type", cached.contentType);
      }
      return new NextResponse(cached.body.slice(0), {
        status: cached.status,
        headers: responseHeaders,
      });
    }
  }

  const forwardHeaders = getForwardHeaders(req, requestId);

  // Read body for state-modifying HTTP methods
  let bodyData: BodyInit | null = null;
  if (isMutation) {
    try {
      const clonedReq = req.clone();
      bodyData = await clonedReq.arrayBuffer();
    } catch {
      bodyData = null;
    }
  }

  // Idempotent GET allows 1 bounded retry; mutating calls NEVER retry
  const maxAttempts = req.method === "GET" && allowRetries ? 2 : 1;
  let lastError: any = null;
  let lastStatus = 503;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    if (req.signal) {
      req.signal.addEventListener("abort", () => {
        try {
          controller.abort();
        } catch {}
      });
    }

    try {
      const backendRes = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: bodyData,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutTimer);

      // If upstream gave a 502/503/504 on first GET attempt, retry once after short backoff
      if (req.method === "GET" && [502, 503, 504].includes(backendRes.status) && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const contentType = backendRes.headers.get("content-type") || "";
      const latencyMs = Math.round(performance.now() - startTime);

      const responseHeaders = new Headers();
      responseHeaders.set("X-Request-Id", requestId);
      responseHeaders.set("X-Response-Time-Ms", latencyMs.toString());
      responseHeaders.set("X-Cache-Hit", "false");
      if (contentType) {
        responseHeaders.set("Content-Type", contentType);
      }

      if (typeof (backendRes.headers as any).getSetCookie === "function") {
        const cookies: string[] = (backendRes.headers as any).getSetCookie();
        for (const cookie of cookies) {
          responseHeaders.append("set-cookie", cookie);
        }
      } else {
        const setCookie = backendRes.headers.get("set-cookie");
        if (setCookie) {
          responseHeaders.set("set-cookie", setCookie);
        }
      }

      const rawBody = await backendRes.arrayBuffer();

      // Micro-cache successful GET responses
      if (req.method === "GET" && backendRes.ok && cacheTtlMs > 0) {
        if (proxyMicroCache.size > MAX_CACHE_SIZE) {
          proxyMicroCache.clear();
        }
        proxyMicroCache.set(cacheKey, {
          status: backendRes.status,
          body: rawBody,
          contentType,
          timestamp: Date.now(),
        });
      }

      return new NextResponse(rawBody, {
        status: backendRes.status,
        headers: responseHeaders,
      });
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      lastError = err;

      if (err?.name === "AbortError") {
        lastStatus = 504;
      } else {
        lastStatus = 503;
      }

      if (req.method === "GET" && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
    }
  }

  // Handle final failure
  const latencyMs = Math.round(performance.now() - startTime);
  const isTimeout = lastError?.name === "AbortError" || lastStatus === 504;
  const statusCode = isTimeout ? 504 : 503;
  const errorCode = isTimeout ? "GATEWAY_TIMEOUT" : "BACKEND_UNAVAILABLE";
  const errorMessage = isTimeout
    ? `Backend request to ${prefix}/${cleanSubPath} timed out after ${timeoutMs}ms`
    : `Quant.OS Engine backend is unreachable at ${backendBase}.`;

  console.error(
    `[Quant.OS Proxy Error] ${req.method} ${targetUrl} failed with ${errorCode}: ${lastError?.message || lastError}`
  );

  return NextResponse.json(
    {
      ok: false,
      success: false,
      status: "error",
      data: null,
      error: {
        code: errorCode,
        message: errorMessage,
        retryable: true,
        details: lastError?.message || String(lastError),
      },
      requestId,
      timestamp: new Date().toISOString(),
      latencyMs,
    },
    {
      status: statusCode,
      headers: {
        "X-Request-Id": requestId,
        "X-Response-Time-Ms": latencyMs.toString(),
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
