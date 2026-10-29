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

      const bodyText = await upstreamRes.text().catch(() => "");
      if (bodyText && upstreamRes.headers.get("content-type")?.includes("application/json")) {
        try {
          const jsonBody = JSON.parse(bodyText);
          return NextResponse.json(jsonBody, { status: upstreamRes.status });
        } catch {}
      }

      return NextResponse.json(
        {
          ok: false,
          success: false,
          status: "error",
          error: {
            code: upstreamRes.status === 401 ? "UNAUTHORIZED" : "STREAM_UNAVAILABLE",
            message: `Portfolio stream unavailable (HTTP ${upstreamRes.status}).`,
          },
        },
        { status: upstreamRes.status || 503, headers: { "X-Request-Id": req.headers.get("x-request-id") || "portfolio-stream" } }
      );
    } catch (err: any) {
      clearTimeout(connectTimer);
      return NextResponse.json(
        {
          ok: false,
          success: false,
          status: "error",
          error: {
            code: "STREAM_ERROR",
            message: err?.message || "Failed to connect to portfolio stream.",
          },
        },
        { status: 503, headers: { "X-Request-Id": req.headers.get("x-request-id") || "portfolio-stream" } }
      );
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
