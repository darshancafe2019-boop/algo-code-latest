import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BINANCE_TESTNET_BASE = "https://testnet.binance.vision";
const BINANCE_MAINNET_BASE = "https://api.binance.com";

/**
 * GET /api/binance/status
 * Returns authoritative Binance connection status, latency, masked API keys,
 * and enabled crypto market capabilities.
 */
export async function GET(req: NextRequest) {
  const isTestnet =
    process.env.BINANCE_TESTNET === "true" ||
    process.env.BINANCE_TESTNET === "1" ||
    Boolean(process.env.BINANCE_TESTNET_API_KEY);

  const apiKey = (
    (isTestnet
      ? process.env.BINANCE_TESTNET_API_KEY || process.env.BINANCE_API_KEY
      : process.env.BINANCE_API_KEY || process.env.BINANCE_TESTNET_API_KEY) || ""
  ).trim();

  const apiSecret = (
    (isTestnet
      ? process.env.BINANCE_TESTNET_SECRET_KEY || process.env.BINANCE_API_SECRET
      : process.env.BINANCE_API_SECRET || process.env.BINANCE_TESTNET_SECRET_KEY) || ""
  ).trim();

  const baseUrl = isTestnet ? BINANCE_TESTNET_BASE : BINANCE_MAINNET_BASE;
  const maskedKey =
    apiKey.length > 8
      ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
      : apiKey ? "••••••••" : "Not Configured";

  const startTime = performance.now();
  let isConnected = false;
  let latencyMs = 0;
  let serverTime: number | null = null;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const pingRes = await fetch(`${baseUrl}/api/v3/time`, {
      method: "GET",
      headers: {
        "X-MBX-APIKEY": apiKey,
        "Accept": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timer);
    latencyMs = Math.round(performance.now() - startTime);

    if (pingRes.ok) {
      const timeData = await pingRes.json();
      serverTime = timeData.serverTime || Date.now();
      isConnected = true;
    } else {
      errorMessage = `Binance endpoint returned HTTP ${pingRes.status}`;
    }
  } catch (err: any) {
    latencyMs = Math.round(performance.now() - startTime);
    errorMessage = err.name === "AbortError" ? "Connection timed out" : err.message;
    isConnected = false;
  }

  return NextResponse.json({
    status: "success",
    connected: isConnected,
    isTestnet,
    network: isTestnet ? "TESTNET" : "MAINNET",
    baseUrl,
    apiKeyMasked: maskedKey,
    hasApiKey: Boolean(apiKey),
    hasApiSecret: Boolean(apiSecret),
    latencyMs,
    serverTime: serverTime ? new Date(serverTime).toISOString() : null,
    supportedMarkets: [
      "Crypto Spot (BTC, ETH, SOL)",
      "USDT-Margined Perpetual Futures",
      "Coin-Margined Futures",
      "European Style Crypto Options",
    ],
    supportedPairsCount: 123,
    tradingMode: process.env.TRADING_MODE || "PAPER",
    errorMessage,
    timestamp: new Date().toISOString(),
  });
}
