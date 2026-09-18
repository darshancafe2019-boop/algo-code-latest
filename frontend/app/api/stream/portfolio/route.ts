import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "PAPER";
  const upstreamUrl = `${BACKEND_URL}/api/stream/portfolio?mode=${encodeURIComponent(mode)}`;

  const controller = new AbortController();
  req.signal.addEventListener("abort", () => {
    try {
      controller.abort();
    } catch {}
  });

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return new Response(
        `data: ${JSON.stringify({ type: "STREAM_UNAVAILABLE", status: upstreamRes.status })}\n\n`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        }
      );
    }

    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(
      `data: ${JSON.stringify({ type: "STREAM_ERROR", message: err.message || "Failed to connect to portfolio stream" })}\n\n`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }
}
