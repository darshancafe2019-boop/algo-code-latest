import { NextRequest, NextResponse } from "next/server";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_API_URL ||
  "http://127.0.0.1:5050";

export async function POST(req: NextRequest) {
  const requestId =
    req.headers.get("x-request-id") ||
    `del_all_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const forwardHeaders = getForwardHeaders(req, requestId);
    if (!forwardHeaders.has("content-type")) {
      forwardHeaders.set("Content-Type", "application/json");
    }
    if (!forwardHeaders.has("accept")) {
      forwardHeaders.set("Accept", "application/json");
    }

    const upstreamRes = await fetch(`${BACKEND_URL}/api/bots/delete-all`, {
      method: "POST",
      headers: forwardHeaders,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });

    const data = await upstreamRes.json().catch(() => null);

    return NextResponse.json(
      data || { success: upstreamRes.ok, status: upstreamRes.ok ? "success" : "error" },
      {
        status: upstreamRes.status,
        headers: { "X-Request-Id": requestId },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: {
          code: "DELETE_ALL_FAILED",
          message: err?.message || "Failed to communicate with quantitative engine backend",
        },
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
