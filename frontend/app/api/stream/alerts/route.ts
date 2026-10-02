import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const upstreamUrl = `${BACKEND_URL}/api/stream/alerts`;

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
            type: "INCIDENTS_STREAM",
            incidents: [],
            summary: { active_incidents: 0, critical: 0, error: 0, unacknowledged: 0 },
            system_health: { overall_status: "HEALTHY", checks: [] },
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
