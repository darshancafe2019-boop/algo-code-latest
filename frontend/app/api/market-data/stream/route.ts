import { NextRequest } from "next/server";
import WebSocket from "ws";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GATEWAY_WS_URL =
  process.env.MARKET_DATA_GATEWAY_WS_URL ||
  process.env.MARKET_GATEWAY_WS_URL ||
  "ws://127.0.0.1:5051/ws";

const GATEWAY_SECRET =
  process.env.MARKET_GATEWAY_SECRET ||
  process.env.MARKET_DATA_GATEWAY_SECRET ||
  "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols") || "";
  const providerFilter = (searchParams.get("provider") || "").toLowerCase().trim();

  const requestedSymbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const encoder = new TextEncoder();

  let ws: WebSocket | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let isCleanedUp = false;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    // 1. Clear heartbeat timer
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    // 2. Safely unsubscribe and close WebSocket connection
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN && requestedSymbols.length > 0) {
          ws.send(
            JSON.stringify({
              action: "unsubscribe",
              symbols: requestedSymbols,
              reason: "SSE_CLIENT_STREAM",
            })
          );
        }
      } catch {
        // ignore send failure during teardown
      }

      try {
        ws.removeAllListeners();
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        // ignore close error
      }
      ws = null;
    }

    // 3. Safely close SSE controller
    if (controllerRef) {
      try {
        controllerRef.close();
      } catch {
        // controller might already be closed/errored
      }
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

      // 1. Send immediate connecting status packet
      safeEnqueue(
        `data: ${JSON.stringify({
          type: "STATUS",
          data: {
            status: "CONNECTING_TO_GATEWAY",
            provider: providerFilter || "ALL",
            subscribedSymbols: requestedSymbols,
            timestamp: new Date().toISOString(),
          },
        })}\n\n`
      );

      // 2. Connect dedicated WebSocket to Python Market Data Gateway
      try {
        const wsUrl = new URL(GATEWAY_WS_URL);
        if (GATEWAY_SECRET) {
          wsUrl.searchParams.set("secret", GATEWAY_SECRET);
        }

        ws = new WebSocket(wsUrl.toString(), {
          headers: GATEWAY_SECRET ? { "X-Gateway-Secret": GATEWAY_SECRET } : undefined,
          handshakeTimeout: 5000,
          perMessageDeflate: false, // Ensure zero native bufferutil/zlib compression issues
        });

        ws.on("open", () => {
          if (isCleanedUp) {
            try {
              ws?.close();
            } catch {}
            return;
          }

          // Notify browser of gateway connection
          safeEnqueue(
            `data: ${JSON.stringify({
              type: "STATUS",
              data: {
                status: "GATEWAY_CONNECTED",
                provider: providerFilter || "ALL",
                subscribedSymbols: requestedSymbols,
                timestamp: new Date().toISOString(),
              },
            })}\n\n`
          );

          // Subscribe to requested symbols on the gateway
          if (requestedSymbols.length > 0 && ws && ws.readyState === WebSocket.OPEN) {
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
                if (providerFilter === "dhan" && quoteProvider !== "dhan" && quoteProvider !== "dhan_ws") {
                  return;
                }
                if (providerFilter === "delta" && quoteProvider !== "delta" && quoteProvider !== "delta_options_ws") {
                  return;
                }
                if (providerFilter === "binance" && quoteProvider !== "binance" && quoteProvider !== "binance_ws") {
                  return;
                }
                if (providerFilter === "upstox" && quoteProvider !== "upstox" && quoteProvider !== "upstox_ws") {
                  return;
                }
              }

              // Symbol filtering if specific symbols were requested
              if (requestedSymbols.length > 0) {
                const matches = requestedSymbols.some((s) => {
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
                  if (providerFilter === "dhan" && quoteProvider !== "dhan" && quoteProvider !== "dhan_ws") {
                    continue;
                  }
                  if (providerFilter === "delta" && quoteProvider !== "delta" && quoteProvider !== "delta_options_ws") {
                    continue;
                  }
                  if (providerFilter === "binance" && quoteProvider !== "binance" && quoteProvider !== "binance_ws") {
                    continue;
                  }
                  if (providerFilter === "upstox" && quoteProvider !== "upstox" && quoteProvider !== "upstox_ws") {
                    continue;
                  }
                }
                filtered[s] = quoteObj;
              }

              if (Object.keys(filtered).length > 0) {
                safeEnqueue(`data: ${JSON.stringify({ type: "SNAPSHOT", data: filtered })}\n\n`);
              }
            } else if (msg.type === "STATUS") {
              safeEnqueue(`data: ${JSON.stringify(msg)}\n\n`);
            }
          } catch {
            // non-JSON or malformed message safely ignored
          }
        });

        ws.on("error", (err: Error) => {
          if (isCleanedUp) return;
          safeEnqueue(
            `data: ${JSON.stringify({
              type: "STATUS",
              data: {
                status: "GATEWAY_ERROR",
                message: err?.message || "Gateway WebSocket error",
                timestamp: new Date().toISOString(),
              },
            })}\n\n`
          );
        });

        ws.on("close", () => {
          if (!isCleanedUp) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: "STATUS",
                data: {
                  status: "GATEWAY_DISCONNECTED",
                  timestamp: new Date().toISOString(),
                },
              })}\n\n`
            );
            cleanup();
          }
        });
      } catch (err: any) {
        safeEnqueue(
          `data: ${JSON.stringify({
            type: "STATUS",
            data: {
              status: "GATEWAY_UNREACHABLE",
              message: err?.message || "Failed to initialize gateway WebSocket",
              timestamp: new Date().toISOString(),
            },
          })}\n\n`
        );
        cleanup();
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

      // 4. Request Abort Signal Listener
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
      // 5. ReadableStream cancellation (e.g. client disconnects, curl aborted)
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
