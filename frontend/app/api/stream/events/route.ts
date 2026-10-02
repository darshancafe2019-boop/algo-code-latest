import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const upstreamUrl = `${BACKEND_URL}/api/stream/events`;

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
    // Upstream unavailable or timed out; fall through to resilient native stream
  }

  // Resilient native SSE stream with heartbeat
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ events: [], timestamp: new Date().toISOString() })}\n\n`));
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
