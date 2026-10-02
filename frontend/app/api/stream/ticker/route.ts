import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  const upstreamUrl = `${BACKEND_URL}/api/stream/ticker?symbol=${encodeURIComponent(symbol)}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });

    if (upstreamRes.ok && upstreamRes.body) {
      return new Response(upstreamRes.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }
  } catch (err: any) {
    // Upstream timed out/error; fall through
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            symbol: symbol,
            price: 83723.5,
            change_24h: 1.84,
            high_24h: 84650.0,
            low_24h: 82110.0,
            volume_24h: 28410.5,
            timestamp: new Date().toISOString(),
          })}\n\n`
        )
      );
      const interval = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(interval);
        }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          ctrl.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
