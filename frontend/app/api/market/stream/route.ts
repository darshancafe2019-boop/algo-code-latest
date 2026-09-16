import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols") || "";

  const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";

  // Create a TransformStream to stream Server-Sent Events to the client
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connection event
  writer.write(
    encoder.encode(
      `data: ${JSON.stringify({
        type: "CONNECTED",
        channel: "market:stream",
        timestamp: Date.now(),
        symbols: symbols ? symbols.split(",") : [],
      })}\n\n`
    )
  );

  // If client provides symbols, forward a subscription query to Gateway if available
  if (symbols) {
    fetch(`${GATEWAY_URL}/api/v1/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: symbols.split(",") }),
    }).catch(() => {});
  }

  // Periodic heartbeat / tick forwarder
  const interval = setInterval(async () => {
    try {
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "HEARTBEAT",
            timestamp: Date.now(),
          })}\n\n`
        )
      );
    } catch {
      clearInterval(interval);
    }
  }, 15000);

  req.signal.addEventListener("abort", () => {
    clearInterval(interval);
    writer.close().catch(() => {});
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
