import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DELTA_INDIA_BASE = "https://api.india.delta.exchange";
const DELTA_GLOBAL_BASE = "https://api.delta.exchange";

/**
 * GET /api/delta/status
 * Returns authoritative Delta Exchange connection status, latency, masked API keys,
 * and enabled crypto market capabilities.
 */
export async function GET(req: NextRequest) {
  const isIndia = process.env.DELTA_EXCHANGE_REGION !== "GLOBAL";
  const baseUrl = (process.env.DELTA_REST_URL || (isIndia ? DELTA_INDIA_BASE : DELTA_GLOBAL_BASE)).replace(/\/$/, "");
  const apiKey = (process.env.DELTA_API_KEY || "").trim();
  const apiSecret = (process.env.DELTA_API_SECRET || "").trim();

  const maskedKey =
    apiKey.length > 8
      ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
      : apiKey ? "••••••••" : "Not Configured";

  const startTime = performance.now();
  let isConnected = false;
  let latencyMs = 0;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const pingRes = await fetch(`${baseUrl}/v2/products?contract_types=perpetual_futures`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "QuantOS-NextJS/2.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);
    latencyMs = Math.round(performance.now() - startTime);

    if (pingRes.ok) {
      const data = await pingRes.json();
      isConnected = Boolean(data && (data.success || Array.isArray(data.result)));
    } else {
      errorMessage = `Delta endpoint returned HTTP ${pingRes.status}`;
    }
  } catch (err: any) {
    latencyMs = Math.round(performance.now() - startTime);
    errorMessage = err.name === "AbortError" ? "Connection timed out (4s)" : err.message;
  }

  return NextResponse.json({
    status: isConnected ? "CONNECTED" : "DISCONNECTED",
    connected: isConnected,
    broker: "DELTA_EXCHANGE",
    brokerName: isIndia ? "Delta Exchange India" : "Delta Exchange Global",
    network: isIndia ? "DELTA_INDIA" : "DELTA_GLOBAL",
    baseUrl,
    apiKeyMasked: maskedKey,
    hasApiKey: Boolean(apiKey),
    hasApiSecret: Boolean(apiSecret),
    latencyMs: isConnected ? latencyMs : 0,
    supportedMarkets: [
      "Crypto Spot (BTC/ETH/SOL/USDT)",
      "Perpetual Futures (100x Leverage)",
      "Crypto European Options (BTC/ETH Daily, Weekly, Monthly)",
      "Move & Spread Contracts"
    ],
    supportedPairsCount: 180,
    tradingMode: Boolean(apiKey && apiSecret) ? "LIVE_AND_PAPER" : "PAPER_SIMULATION",
    errorMessage,
    timestamp: new Date().toISOString(),
  });
}
