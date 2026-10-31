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

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "PAPER";

  if (backendUrl) {
    const upstreamUrl = `${backendUrl}/api/stream/portfolio?mode=${encodeURIComponent(mode)}`;
    const controller = new AbortController();
    const connectTimer = setTimeout(() => {
      try {
        controller.abort();
      } catch {}
    }, 4000);

    req.signal.addEventListener("abort", () => {
      clearTimeout(connectTimer);
      try {
        controller.abort();
      } catch {}
    });

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          ...getForwardHeaders(req),
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(connectTimer);

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

      // If upstream SSE returned non-OK or failed, fallback to polling authoritative snapshot or ping
      try {
        const snapRes = await fetch(`${backendUrl}/api/portfolio/snapshot?mode=${encodeURIComponent(mode)}`, {
          headers: getForwardHeaders(req),
          cache: "no-store",
        });
        if (snapRes.ok) {
          const snapData = await snapRes.json();
          const sseBody = `: ping\n\ndata: ${JSON.stringify({ type: "PORTFOLIO_SNAPSHOT", data: snapData })}\n\n`;
          return new Response(sseBody, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
        }
      } catch {}

      // Resilient fallback SSE stream instead of raw HTTP 500 crash
      const fallbackStream = `: ping\n\ndata: ${JSON.stringify({ type: "STREAM_RETRYING", message: "Connecting to portfolio feed..." })}\n\n`;
      return new Response(fallbackStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    } catch (err: any) {
      clearTimeout(connectTimer);
      // Graceful fallback on connection/timeout error
      try {
        const snapRes = await fetch(`${backendUrl}/api/portfolio/snapshot?mode=${encodeURIComponent(mode)}`, {
          headers: getForwardHeaders(req),
          cache: "no-store",
        });
        if (snapRes.ok) {
          const snapData = await snapRes.json();
          const sseBody = `: ping\n\ndata: ${JSON.stringify({ type: "PORTFOLIO_SNAPSHOT", data: snapData })}\n\n`;
          return new Response(sseBody, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
        }
      } catch {}

      const fallbackStream = `: ping\n\ndata: ${JSON.stringify({ type: "STREAM_RETRYING", message: "Reconnecting to portfolio feed..." })}\n\n`;
      return new Response(fallbackStream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }
  }

  return NextResponse.json(
    {
      ok: false,
      success: false,
      status: "error",
      error: {
        code: "STREAM_UNAVAILABLE",
        message: "Portfolio stream backend is not configured.",
      },
    },
    { status: 503 }
  );
}
