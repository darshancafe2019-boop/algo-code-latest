import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get("symbols") || "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";

  try {
    const url = symbols.length > 0
      ? `${GATEWAY_URL}/api/v1/snapshot?symbols=${encodeURIComponent(symbols.join(","))}`
      : `${GATEWAY_URL}/api/v1/snapshot`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Gateway fallback
  }

  return NextResponse.json({
    status: "success",
    timestamp: Date.now(),
    quotes: {},
    totalCount: 0,
    source: "SNAPSHOT_EMPTY",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbols = Array.isArray(body.symbols) ? body.symbols : [];

    const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";

    const res = await fetch(`${GATEWAY_URL}/api/v1/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Gateway fallback
  }

  return NextResponse.json({
    status: "success",
    timestamp: Date.now(),
    quotes: {},
    totalCount: 0,
  });
}
