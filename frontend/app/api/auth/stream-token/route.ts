import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleStreamToken(req);
}

export async function POST(req: NextRequest) {
  return handleStreamToken(req);
}

async function handleStreamToken(req: NextRequest) {
  const backendUrl = getBackendBaseUrl();
  if (!backendUrl) {
    return NextResponse.json(
      { status: "error", error: "Backend service URL not configured." },
      { status: 503 }
    );
  }

  const upstreamUrl = `${backendUrl}/api/auth/stream-token`;
  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        ...getForwardHeaders(req),
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    const data = await upstreamRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstreamRes.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: "Failed to connect to backend stream token service",
        message: err.message,
      },
      { status: 502 }
    );
  }
}
