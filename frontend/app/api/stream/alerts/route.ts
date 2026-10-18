import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const backendUrl = getBackendBaseUrl();
  if (isProduction() && !backendUrl) {
    return NextResponse.json(
      { error: "Backend service URL is not configured in production environment." },
      { status: 503 }
    );
  }

  if (backendUrl) {
    const upstreamUrl = `${backendUrl}/api/stream/alerts`;
    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          ...getForwardHeaders(req),
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(3000),
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
  }

  // Truthful fallback stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "INCIDENTS_STREAM",
            incidents: [],
            summary: { active_incidents: 0, critical: 0, error: 0, unacknowledged: 0 },
            system_health: { overall_status: "DEGRADED", checks: [] },
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
