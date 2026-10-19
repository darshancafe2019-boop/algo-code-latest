import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, CANONICAL_CLOUD_BACKEND_URL } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const backendBase = getBackendBaseUrl() || CANONICAL_CLOUD_BACKEND_URL;
  const targetUrl = `${backendBase.replace(/\/+$/, "")}/api/market/snapshot?${searchParams.toString()}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantOS-NextJS-Proxy",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      {
        status: "error",
        quotes: {},
        data: {},
        message: `Backend responded with HTTP ${res.status}`,
      },
      { status: res.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        quotes: {},
        data: {},
        message: `Failed to connect to backend snapshot: ${err?.message || err}`,
      },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const backendBase = getBackendBaseUrl() || CANONICAL_CLOUD_BACKEND_URL;
  let symbolsStr = "";
  try {
    const body = await req.json();
    const symbols = Array.isArray(body.symbols) ? body.symbols.map((s: string) => s.toUpperCase()) : [];
    symbolsStr = symbols.join(",");
  } catch {
    // If empty body
  }

  const targetUrl = `${backendBase.replace(/\/+$/, "")}/api/market/snapshot?symbols=${encodeURIComponent(symbolsStr)}`;

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantOS-NextJS-Proxy",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      {
        status: "error",
        quotes: {},
        data: {},
        message: `Backend responded with HTTP ${res.status}`,
      },
      { status: res.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        quotes: {},
        data: {},
        message: `Failed to connect to backend snapshot: ${err?.message || err}`,
      },
      { status: 503 }
    );
  }
}
