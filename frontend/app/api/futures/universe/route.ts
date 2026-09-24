import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = `${BACKEND_URL}/api/futures/universe${url.search}`;

  try {
    const backendRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-Request-Id": req.headers.get("x-request-id") || `fut_${Date.now()}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: 200 });
    }
  } catch (err) {
    console.warn("Backend futures universe fetch error:", err);
  }

  // Fallback to /api/futures/contracts
  try {
    const res2 = await fetch(`${BACKEND_URL}/api/futures/contracts${url.search}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (res2.ok) {
      const data2 = await res2.json();
      return NextResponse.json(data2, { status: 200 });
    }
  } catch {}

  return NextResponse.json({
    status: "ERROR",
    count: 0,
    contracts: [],
    message: "Futures backend service currently unreachable",
  }, { status: 503 });
}
