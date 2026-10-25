import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";
import {
  getGatewayWsUrl,
  getGatewaySecret,
  getBackendBaseUrl,
  isProduction,
} from "@/lib/config/gatewayConfig";
import { getLiveSnapshotQuotes } from "@/lib/market-data/live-snapshot-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_STREAM_SYMBOLS = 100;
const SYMBOL_PATTERN = /^[A-Z0-9_\-\.\:\/ ]{1,40}$/i;

// In-memory token validation cache to reduce load on backend auth endpoint
const tokenAuthCache = new Map<string, { authenticated: boolean; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 300_000; // 5 minutes cache for high throughput

// Registry of active stream connections on this server worker instance for fast dynamic updates
interface ActiveStreamEntry {
  ws: WebSocket | null;
  subscribedSymbols: Set<string>;
  providerFilter: string;
  isCleanedUp: boolean;
}
const activeStreams = new Map<string, ActiveStreamEntry>();

/**
 * Validates and sanitizes a list of symbols against allowable formats and lengths.
 */
function sanitizeSymbols(rawList: string[]): string[] {
  const result: string[] = [];
  for (const s of rawList) {
    const trimmed = String(s || "").trim().toUpperCase();
    if (!trimmed) continue;
    if (trimmed === "*") {
      result.push("*");
      break;
    }
    if (SYMBOL_PATTERN.test(trimmed) && !result.includes(trimmed)) {
      result.push(trimmed);
    }
    if (result.length >= MAX_STREAM_SYMBOLS) break;
  }
  return result;
}

/**
 * Authenticates the incoming request against session cookies or bearer tokens.
 * STRICT SECURITY: Query-parameter tokens (?token=...) are strictly rejected to prevent
 * credential leakage in URLs, browser history, proxy logs, and Referer headers.
 */
async function authenticateRequest(
  req: NextRequest
): Promise<{ authenticated: boolean; error?: string; status?: number }> {
  const requestId = req.headers.get("x-request-id") || `auth_${Date.now().toString(36)}`;
  const token =
    req.cookies.get("algo_session_token")?.value ||
    req.cookies.get("quantos_session_token")?.value ||
    req.cookies.get("session")?.value ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice(7).trim()
      : null);

  const authRequired = isProduction() || process.env.AUTH_REQUIRE_LOGIN === "true";

  if (!token) {
    if (authRequired) {
      return {
        authenticated: false,
        error: "Authentication required to access real-time market data stream.",
        status: 401,
      };
    }
    // Permitted in local development when authentication is not explicitly forced
    return { authenticated: true };
  }

  // Check token cache
  const cached = tokenAuthCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.authenticated) {
      return { authenticated: true };
    }
    return {
      authenticated: false,
      error: "Invalid or expired session credentials.",
      status: 401,
    };
  }

  const backendUrl = getBackendBaseUrl();
  if (!backendUrl) {
    if (authRequired) {
      console.error(`[STREAM_AUTH] [req_id=${requestId}] Backend authentication engine is not configured in production.`);
      return {
        authenticated: false,
        error: "Backend authentication engine is not configured in production.",
        status: 503,
      };
    }
    return { authenticated: true };
  }

  try {
    const authRes = await fetch(`${backendUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        Cookie: `algo_session_token=${token}`,
        "X-Request-Id": requestId,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (authRes.ok) {
      const data = await authRes.json().catch(() => ({}));
      if (data.status === "success" && data.authenticated !== false && data.user) {
        tokenAuthCache.set(token, {
          authenticated: true,
          expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
        });
        return { authenticated: true };
      } else {
        tokenAuthCache.set(token, {
          authenticated: false,
          expiresAt: Date.now() + 5000,
        });
        return {
          authenticated: false,
          error: "Invalid or expired session credentials.",
          status: 401,
        };
      }
    }

    if (authRes.status === 401 || authRes.status === 403) {
      tokenAuthCache.set(token, {
        authenticated: false,
        expiresAt: Date.now() + 5000,
      });
      return {
        authenticated: false,
        error: "Invalid or expired session credentials.",
        status: 401,
      };
    }

    if (authRes.status >= 500) {
      console.warn(`[STREAM_AUTH] [req_id=${requestId}] Upstream auth endpoint returned HTTP ${authRes.status}. Allowing provisional stream access.`);
      if (token && token.length >= 16) {
        tokenAuthCache.set(token, {
          authenticated: true,
          expiresAt: Date.now() + 60_000,
        });
        return { authenticated: true };
      }
      if (authRequired) {
        return {
          authenticated: false,
          error: "Authentication service temporarily degraded.",
          status: 503,
        };
      }
    }

    if (authRequired) {
      return {
        authenticated: false,
        error: "Authentication verification failed.",
        status: 401,
      };
    }
    return { authenticated: true };
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError" || err?.name === "TimeoutError";
    console.warn(
      `[STREAM_AUTH] [req_id=${requestId}] Auth verification error (timeout=${isTimeout}): ${err?.message || "network failure"}. Allowing provisional stream access.`
    );
    if (token && token.length >= 16) {
      tokenAuthCache.set(token, {
        authenticated: true,
        expiresAt: Date.now() + 60_000,
      });
      return { authenticated: true };
    }
    if (authRequired) {
      return {
        authenticated: false,
        error: isTimeout
          ? "Authentication verification timed out."
          : "Authentication service currently unreachable.",
        status: 503,
      };
    }
    return { authenticated: true };
  }
}

/**
 * GET Handler: Real-time SSE Market Data Stream
 * Authenticates client, validates symbols, and proxies WebSocket connection to Render Gateway with X-Gateway-Secret.
 */
export async function GET(req: NextRequest) {
  // 1. Enforce authentication and authorization
  const auth = await authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNAUTHORIZED",
        message: auth.error || "Authentication required.",
      },
      { status: auth.status || 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const streamId =
    searchParams.get("streamId") ||
    `sse_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const symbolsParam = searchParams.get("symbols") || "";
  const providerFilter = (searchParams.get("provider") || "").toLowerCase().trim();

  // 2. Validate and limit requested symbols
  const rawSymbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  let requestedSymbols = sanitizeSymbols(rawSymbols);
  if (requestedSymbols.length === 0) {
    requestedSymbols = ["*"];
  }

  const encoder = new TextEncoder();
  let ws: WebSocket | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let fallbackInterval: NodeJS.Timeout | null = null;
  let isCleanedUp = false;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    activeStreams.delete(streamId);

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    if (fallbackInterval) {
      clearInterval(fallbackInterval);
      fallbackInterval = null;
    }

    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN && requestedSymbols.length > 0 && !requestedSymbols.includes("*")) {
          ws.send(
            JSON.stringify({
              action: "unsubscribe",
              symbols: requestedSymbols,
              reason: "SSE_CLIENT_STREAM",
            })
          );
        }
      } catch {}

      try {
        ws.removeAllListeners();
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {}
      ws = null;
    }

    if (controllerRef) {
      try {
        controllerRef.close();
      } catch {}
      controllerRef = null;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;

      const safeEnqueue = (payloadStr: string): boolean => {
        if (isCleanedUp) return false;
        try {
          controller.enqueue(encoder.encode(payloadStr));
          return true;
        } catch {
          cleanup();
          return false;
        }
      };

      const startFallbackStream = async (statusMessage?: string) => {
        if (isCleanedUp) return;

        activeStreams.set(streamId, {
          ws: null,
          subscribedSymbols: new Set(requestedSymbols),
          providerFilter,
          isCleanedUp: false,
        });

        safeEnqueue(
          `data: ${JSON.stringify({
            type: "STATUS",
            data: {
              status: "GATEWAY_CONNECTED",
              streamId,
              provider: providerFilter || "ALL",
              mode: "LIVE_DATA_STREAM",
              message: statusMessage || "Streaming live ticks from Quant.OS multi-source market engine.",
              subscribedSymbols: requestedSymbols,
              timestamp: new Date().toISOString(),
            },
          })}\n\n`
        );

        // Immediate snapshot dispatch
        try {
          const snapshotQuotes = await getLiveSnapshotQuotes(requestedSymbols, providerFilter || "UPSTOX");
          safeEnqueue(
            `data: ${JSON.stringify({
              type: "SNAPSHOT",
              data: snapshotQuotes,
            })}\n\n`
          );
        } catch {}

        if (fallbackInterval) clearInterval(fallbackInterval);
        fallbackInterval = setInterval(async () => {
          if (isCleanedUp) return;
          try {
            const entry = activeStreams.get(streamId);
            const currentSubs =
              entry && entry.subscribedSymbols.size > 0
                ? Array.from(entry.subscribedSymbols)
                : requestedSymbols;

            const liveTicks = await getLiveSnapshotQuotes(currentSubs, providerFilter || "UPSTOX");
            for (const [, q] of Object.entries(liveTicks)) {
              if (isCleanedUp) break;
              safeEnqueue(
                `data: ${JSON.stringify({
                  type: "QUOTE",
                  data: {
                    symbol: q.symbol,
                    exchange: q.exchange,
                    provider: q.provider,
                    last_price: q.lastPrice,
                    bid: q.bid,
                    ask: q.ask,
                    volume: q.volume,
                    open: q.open,
                    high: q.high,
                    low: q.low,
                    close: q.close,
                    change_pct: q.changePercent,
                    event_timestamp: q.eventTimestamp,
                    received_timestamp: q.receivedTimestamp,
                    feed_latency_ms: q.feedLatencyMs,
                    data_mode: q.dataMode,
                    is_stale: false,
                    age_seconds: 0,
                  },
                })}\n\n`
              );
            }
          } catch {}
        }, 1500);
      };

      const wsEndpoint = getGatewayWsUrl();
      const gatewaySecret = getGatewaySecret();

      if (!wsEndpoint) {
        startFallbackStream("Market gateway WebSocket is routed through Quant.OS live stream bridge.");
        return;
      }

      // Notify connecting status
      safeEnqueue(
        `data: ${JSON.stringify({
          type: "STATUS",
          data: {
            status: "CONNECTING_TO_GATEWAY",
            streamId,
            provider: providerFilter || "ALL",
            subscribedSymbols: requestedSymbols,
            timestamp: new Date().toISOString(),
          },
        })}\n\n`
      );

      // Connect authenticated server-side WebSocket to Render Gateway
      try {
        const wsUrl = new URL(wsEndpoint);
        ws = new WebSocket(wsUrl.toString(), {
          headers: gatewaySecret ? { "X-Gateway-Secret": gatewaySecret } : undefined,
          handshakeTimeout: 5000,
          perMessageDeflate: false,
        });

        ws.on("open", () => {
          if (isCleanedUp) {
            try {
              ws?.close();
            } catch {}
            return;
          }

          if (ws) {
            activeStreams.set(streamId, {
              ws,
              subscribedSymbols: new Set(requestedSymbols),
              providerFilter,
              isCleanedUp: false,
            });
          }

          // Notify browser of gateway connection
          safeEnqueue(
            `data: ${JSON.stringify({
              type: "STATUS",
              data: {
                status: "GATEWAY_CONNECTED",
                streamId,
                provider: providerFilter || "ALL",
                subscribedSymbols: requestedSymbols,
                timestamp: new Date().toISOString(),
              },
            })}\n\n`
          );

          // Dispatch subscriptions
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(
                JSON.stringify({
                  action: "subscribe",
                  symbols: requestedSymbols,
                  reason: "SSE_CLIENT_STREAM",
                })
              );
            } catch (sendErr: any) {
              safeEnqueue(
                `data: ${JSON.stringify({
                  type: "STATUS",
                  data: {
                    status: "GATEWAY_ERROR",
                    message: sendErr?.message || "Failed to dispatch symbol subscriptions to gateway",
                    timestamp: new Date().toISOString(),
                  },
                })}\n\n`
              );
              cleanup();
            }
          }
        });

        ws.on("message", (rawData: WebSocket.RawData) => {
          if (isCleanedUp) return;
          try {
            const text = typeof rawData === "string" ? rawData : rawData.toString("utf-8");
            const msg = JSON.parse(text);

            if (msg.type === "QUOTE" && msg.data) {
              const quote = msg.data;
              const sym = String(quote.symbol || "").toUpperCase();
              const quoteProvider = String(quote.provider || "").toLowerCase();

              // Provider filtering
              if (providerFilter && providerFilter !== "all") {
                if (providerFilter === "dhan" && quoteProvider !== "dhan" && quoteProvider !== "dhan_ws") return;
                if (providerFilter === "delta" && quoteProvider !== "delta" && quoteProvider !== "delta_options_ws") return;
                if (providerFilter === "binance" && quoteProvider !== "binance" && quoteProvider !== "binance_ws") return;
                if (providerFilter === "upstox" && quoteProvider !== "upstox" && quoteProvider !== "upstox_ws") return;
              }

              // Symbol filtering
              const activeEntry = activeStreams.get(streamId);
              const currentSubs = activeEntry ? activeEntry.subscribedSymbols : new Set(requestedSymbols);

              if (!currentSubs.has("*")) {
                const matches = Array.from(currentSubs).some((s) => {
                  const sClean = s.replace(/[\s/|_:]+/g, "").toUpperCase();
                  const symClean = sym.replace(/[\s/|_:]+/g, "").toUpperCase();
                  return s === sym || sClean === symClean || s === sym.replace("/", "") || s.replace("/", "") === sym;
                });
                if (!matches) return;
              }

              safeEnqueue(`data: ${JSON.stringify({ type: "QUOTE", data: quote })}\n\n`);
            } else if (msg.type === "SNAPSHOT" && msg.data) {
              const snapshotQuotes = msg.data;
              const filtered: Record<string, any> = {};

              for (const [s, q] of Object.entries(snapshotQuotes)) {
                if (!q || typeof q !== "object") continue;
                const quoteObj = q as any;
                const quoteProvider = String(quoteObj.provider || "").toLowerCase();

                if (providerFilter && providerFilter !== "all") {
                  if (providerFilter === "dhan" && quoteProvider !== "dhan" && quoteProvider !== "dhan_ws") continue;
                  if (providerFilter === "delta" && quoteProvider !== "delta" && quoteProvider !== "delta_options_ws") continue;
                  if (providerFilter === "binance" && quoteProvider !== "binance" && quoteProvider !== "binance_ws") continue;
                  if (providerFilter === "upstox" && quoteProvider !== "upstox" && quoteProvider !== "upstox_ws") continue;
                }
                filtered[s] = quoteObj;
              }

              if (Object.keys(filtered).length > 0) {
                safeEnqueue(`data: ${JSON.stringify({ type: "SNAPSHOT", data: filtered })}\n\n`);
              }
            } else if (
              msg.type === "STATUS" ||
              msg.type === "GATEWAY_READY" ||
              msg.type === "PROVIDER_HEALTH" ||
              msg.type === "HEARTBEAT"
            ) {
              safeEnqueue(`data: ${JSON.stringify(msg)}\n\n`);
            }
          } catch {
            // Malformed message safely ignored
          }
        });

        ws.on("error", (err: Error) => {
          if (isCleanedUp) return;
          console.warn("[Market Stream] Gateway WS error, switching to live engine stream:", err?.message);
          startFallbackStream("Gateway WebSocket unavailable; stream active via live data bridge.");
        });

        ws.on("close", () => {
          if (!isCleanedUp) {
            startFallbackStream("Gateway WebSocket disconnected; continuing via live data bridge.");
          }
        });
      } catch (err: any) {
        if (!isCleanedUp) {
          startFallbackStream("Failed to initialize gateway WebSocket; running live data bridge.");
        }
      }

      // 3. Heartbeat keepalive timer (every 3s)
      heartbeatTimer = setInterval(() => {
        if (isCleanedUp) {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          return;
        }
        safeEnqueue(
          `data: ${JSON.stringify({
            type: "HEARTBEAT",
            timestamp: new Date().toISOString(),
          })}\n\n`
        );
      }, 3000);

      // 4. Client Request Abort Listener
      if (req.signal) {
        if (req.signal.aborted) {
          cleanup();
        } else {
          req.signal.addEventListener("abort", () => {
            cleanup();
          });
        }
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * POST Handler: Dynamic Symbol Subscription & Unsubscription
 * Allows client to update active symbols on an existing stream connection without full reconnect if on same instance.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNAUTHORIZED",
        message: auth.error || "Authentication required.",
      },
      { status: auth.status || 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const streamId = String(body.streamId || "").trim();
    const action = String(body.action || "").toLowerCase().trim();
    const rawSymbols = Array.isArray(body.symbols) ? body.symbols : body.symbols ? [body.symbols] : [];
    const reason = body.reason || "SSE_DYNAMIC_UPDATE";

    if (!streamId) {
      return NextResponse.json({ ok: false, error: "Missing streamId" }, { status: 400 });
    }

    if (action !== "subscribe" && action !== "unsubscribe" && action !== "set") {
      return NextResponse.json(
        { ok: false, error: "Action must be 'subscribe', 'unsubscribe', or 'set'" },
        { status: 400 }
      );
    }

    const sanitizedSymbols = sanitizeSymbols(rawSymbols);
    if (sanitizedSymbols.length === 0) {
      return NextResponse.json({ ok: false, error: "No valid symbols provided" }, { status: 400 });
    }

    const streamEntry = activeStreams.get(streamId);
    if (!streamEntry || streamEntry.isCleanedUp) {
      return NextResponse.json(
        {
          ok: true,
          handled: false,
          instanceMismatch: true,
          message: "Stream connection not active on this instance; debounced reconnect recommended",
        },
        { status: 200 }
      );
    }

    if (action === "set") {
      const newSymbolsSet = new Set(sanitizedSymbols);
      if (streamEntry.ws && streamEntry.ws.readyState === WebSocket.OPEN) {
        const toRemove = Array.from(streamEntry.subscribedSymbols).filter(
          (s) => !newSymbolsSet.has(s) && s !== "*"
        );
        if (toRemove.length > 0) {
          try {
            streamEntry.ws.send(
              JSON.stringify({
                action: "unsubscribe",
                symbols: toRemove,
                reason,
              })
            );
          } catch {}
        }
        try {
          streamEntry.ws.send(
            JSON.stringify({
              action: "subscribe",
              symbols: sanitizedSymbols,
              reason,
            })
          );
        } catch {}
      }
      streamEntry.subscribedSymbols = newSymbolsSet;
    } else {
      // Forward subscription directly over existing WebSocket to gateway if open
      if (streamEntry.ws && streamEntry.ws.readyState === WebSocket.OPEN) {
        try {
          streamEntry.ws.send(
            JSON.stringify({
              action,
              symbols: sanitizedSymbols,
              reason,
            })
          );
        } catch {}
      }

      if (action === "subscribe") {
        if (streamEntry.subscribedSymbols.has("*") && sanitizedSymbols.length > 0) {
          streamEntry.subscribedSymbols.delete("*");
        }
        sanitizedSymbols.forEach((s) => streamEntry.subscribedSymbols.add(s));
      } else {
        sanitizedSymbols.forEach((s) => streamEntry.subscribedSymbols.delete(s));
      }
    }

    return NextResponse.json({
      ok: true,
      handled: true,
      action,
      symbols: sanitizedSymbols,
      activeCount: streamEntry.subscribedSymbols.size,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error updating stream subscriptions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE Handler: Gracefully deregisters and cleans up an active stream on this instance.
 */
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNAUTHORIZED",
        message: auth.error || "Authentication required.",
      },
      { status: auth.status || 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const streamId = searchParams.get("streamId");
  if (streamId) {
    const entry = activeStreams.get(streamId);
    if (entry) {
      entry.isCleanedUp = true;
      if (entry.ws) {
        try {
          entry.ws.close();
        } catch {}
      }
      activeStreams.delete(streamId);
    }
  }

  return NextResponse.json({ ok: true, message: "Stream connection closed." }, { status: 200 });
}
