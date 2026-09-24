import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = `${BACKEND_URL}/api/futures/contracts?${searchParams.toString()}`;

  try {
    const res = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        "Accept": "application/json",
        "X-Request-Id": req.headers.get("x-request-id") || `fut_${Date.now()}`,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.warn("Backend futures query error:", err);
  }

  // If backend is momentarily unreachable, try universe endpoint
  try {
    const res2 = await fetch(`${BACKEND_URL}/api/futures/universe?${searchParams.toString()}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (res2.ok) {
      const data2 = await res2.json();
      return NextResponse.json(data2);
    }
  } catch {}

  return NextResponse.json({
    status: "error",
    count: 0,
    contracts: [],
    message: "Backend futures service unavailable",
  }, { status: 503 });
}
