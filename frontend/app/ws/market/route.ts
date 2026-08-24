/**
 * WebSocket Gateway Status & Metadata Endpoint: /ws/market
 * ==========================================================
 * Next.js BFF endpoint providing direct Market Data Gateway WebSocket connection details.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GATEWAY_WS_URL = (process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051")
  .replace("http://", "ws://")
  .replace("https://", "wss://");

export async function GET(): Promise<Response> {
  return NextResponse.json(
    {
      status: "ACTIVE",
      service: "MarketDataGateway",
      direct_ws_url: `${GATEWAY_WS_URL}/ws`,
      recommended_client_target: "ws://127.0.0.1:5051/ws",
      transport: "DirectWebSocket",
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
