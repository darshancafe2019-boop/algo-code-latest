import { NextRequest } from "next/server";
import { marketState } from "@/lib/market-data/market-state";
import { subscriptionManager } from "@/lib/market-data/subscription-manager";
import { marketHealthMonitor } from "@/lib/market-data/health";
import { NormalizedQuote } from "@/lib/market-data/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols") || "";
  const requestedSymbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const encoder = new TextEncoder();

  // Register subscriptions
  for (const sym of requestedSymbols) {
    subscriptionManager.subscribe(sym, "SSE_CLIENT_STREAM");
  }

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send immediate status packet
      const statusPacket = {
        type: "STATUS",
        data: {
          dhan: marketHealthMonitor.getProviderHealth("dhan"),
          subscribedSymbols: requestedSymbols,
          timestamp: new Date().toISOString(),
        },
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusPacket)}\n\n`));

      // 2. Send initial quotes for all requested symbols
      for (const sym of requestedSymbols) {
        const quote = marketState.getQuote(sym);
        if (quote) {
          const quotePacket = {
            type: "QUOTE",
            data: quote,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(quotePacket)}\n\n`));
        }
      }

      // 3. Listen for live quote updates
      const unsubscribers: (() => void)[] = [];

      for (const sym of requestedSymbols) {
        const unsub = marketState.subscribeQuote(sym, (updatedQuote: NormalizedQuote) => {
          try {
            const quotePacket = {
              type: "QUOTE",
              data: updatedQuote,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(quotePacket)}\n\n`));
          } catch {
            // Stream closed
          }
        });
        unsubscribers.push(unsub);
      }

      // 4. Heartbeat interval
      const heartbeatTimer = setInterval(() => {
        try {
          const hb = {
            type: "HEARTBEAT",
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(hb)}\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        for (const sym of requestedSymbols) {
          subscriptionManager.unsubscribe(sym, "SSE_CLIENT_STREAM");
        }
        for (const unsub of unsubscribers) {
          unsub();
        }
        try {
          controller.close();
        } catch {}
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
