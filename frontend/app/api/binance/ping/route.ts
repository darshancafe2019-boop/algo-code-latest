import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BINANCE_TESTNET_BASE = "https://testnet.binance.vision";
const BINANCE_MAINNET_BASE = "https://api.binance.com";

/**
 * POST /api/binance/ping
 * Executes an active REST ping test against the configured Binance network.
 */
export async function POST(req: NextRequest) {
  const isTestnet =
    process.env.BINANCE_TESTNET === "true" ||
    process.env.BINANCE_TESTNET === "1" ||
    Boolean(process.env.BINANCE_TESTNET_API_KEY);

  const baseUrl = isTestnet ? BINANCE_TESTNET_BASE : BINANCE_MAINNET_BASE;
  const apiKey = (
    (isTestnet
      ? process.env.BINANCE_TESTNET_API_KEY || process.env.BINANCE_API_KEY
      : process.env.BINANCE_API_KEY || process.env.BINANCE_TESTNET_API_KEY) || ""
  ).trim();

  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/api/v3/ping`, {
      method: "GET",
      headers: {
        "X-MBX-APIKEY": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      return NextResponse.json({
        ok: true,
        status: "success",
        connected: true,
        latencyMs,
        network: isTestnet ? "TESTNET" : "MAINNET",
        message: `Successfully reached Binance ${isTestnet ? "Testnet" : "Mainnet"} in ${latencyMs}ms.`,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        ok: false,
        status: "error",
        connected: false,
        latencyMs,
        message: `Binance returned HTTP ${res.status}`,
      },
      { status: res.status }
    );
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        connected: false,
        latencyMs,
        message: err.name === "AbortError" ? "Ping timed out" : err.message,
      },
      { status: 504 }
    );
  }
}
