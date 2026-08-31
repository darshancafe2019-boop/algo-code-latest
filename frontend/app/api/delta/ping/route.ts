import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DELTA_INDIA_BASE = "https://api.india.delta.exchange";
const DELTA_GLOBAL_BASE = "https://api.delta.exchange";

/**
 * POST /api/delta/ping
 * Performs a live real-time latency ping against Delta Exchange products endpoint.
 */
export async function POST(req: NextRequest) {
  const isIndia = process.env.DELTA_EXCHANGE_REGION !== "GLOBAL";
  const baseUrl = (process.env.DELTA_REST_URL || (isIndia ? DELTA_INDIA_BASE : DELTA_GLOBAL_BASE)).replace(/\/$/, "");

  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/v2/products?contract_types=perpetual_futures`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "QuantOS-NextJS/2.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      return NextResponse.json({
        connected: true,
        latencyMs,
        network: isIndia ? "DELTA_INDIA" : "DELTA_GLOBAL",
        baseUrl,
        message: `Delta REST API Ping: ${latencyMs}ms (${isIndia ? "India" : "Global"} 200 OK). Connection healthy.`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        connected: false,
        latencyMs,
        message: `Delta Exchange API returned HTTP ${res.status}`,
      },
      { status: 502 }
    );
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return NextResponse.json(
      {
        connected: false,
        latencyMs,
        message: `Ping diagnostic timeout or network error: ${err.message}`,
      },
      { status: 504 }
    );
  }
}
