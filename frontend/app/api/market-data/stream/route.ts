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

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let ws: WebSocket | null = null;
      let heartbeatTimer: NodeJS.Timeout | null = null;

      const safeEnqueue = (payloadStr: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(payloadStr));
        } catch {
          isClosed = true;
        }
      };

      const closeAll = () => {
        if (isClosed) return;
        isClosed = true;

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }

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
          } catch {}

          try {
            ws.close();
          } catch {}
          ws = null;
        }

        try {
          controller.close();
        } catch {}
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

      // 2. Connect to Python Market Data Gateway WebSocket
      try {
        const wsUrl = new URL(GATEWAY_WS_URL);
        if (GATEWAY_SECRET) {
          wsUrl.searchParams.set("secret", GATEWAY_SECRET);
        }

        ws = new WebSocket(wsUrl.toString(), {
          headers: GATEWAY_SECRET ? { "X-Gateway-Secret": GATEWAY_SECRET } : undefined,
          handshakeTimeout: 5000,
        });

        ws.on("open", () => {
          if (isClosed) {
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
          if (requestedSymbols.length > 0) {
            ws?.send(
              JSON.stringify({
                action: "subscribe",
                symbols: requestedSymbols,
                reason: "SSE_CLIENT_STREAM",
              })
            );
          }
        });

        ws.on("message", (rawData: WebSocket.RawData) => {
          if (isClosed) return;
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
              }

              // Symbol filtering if specific symbols were requested
              if (requestedSymbols.length > 0) {
                const matches = requestedSymbols.some((s) => {
                  return s === sym || s === sym.replace("/", "") || s.replace("/", "") === sym;
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
            // non-JSON message ignored
          }
        });

        ws.on("error", (err: Error) => {
          if (isClosed) return;
          safeEnqueue(
            `data: ${JSON.stringify({
              type: "STATUS",
              data: {
                status: "GATEWAY_ERROR",
                message: err.message,
                timestamp: new Date().toISOString(),
              },
            })}\n\n`
          );
        });

        ws.on("close", () => {
          if (!isClosed) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: "STATUS",
                data: {
                  status: "GATEWAY_DISCONNECTED",
                  timestamp: new Date().toISOString(),
                },
              })}\n\n`
            );
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
      }

      // 3. Heartbeat keepalive timer
      heartbeatTimer = setInterval(() => {
        if (isClosed) return;
        safeEnqueue(
          `data: ${JSON.stringify({
            type: "HEARTBEAT",
            timestamp: new Date().toISOString(),
          })}\n\n`
        );
      }, 15000);

      // 4. Client disconnect cleanup
      req.signal.addEventListener("abort", () => {
        closeAll();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
