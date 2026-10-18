/**
 * WebSocket Gateway Status & Metadata Endpoint: /ws/market
 * ==========================================================
 * Next.js BFF endpoint providing direct Market Data Gateway WebSocket connection details.
 * In production (Vercel), browser clients use /api/market-data/stream (SSE) because
 * browser-native WebSocket cannot transmit the required X-Gateway-Secret header.
 */
import { NextResponse } from "next/server";
import { getGatewayWsUrl, isProduction } from "@/lib/config/gatewayConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const isProd = isProduction();
  const wsUrl = getGatewayWsUrl();

  if (isProd) {
    return NextResponse.json(
      {
        status: wsUrl ? "ACTIVE" : "UNCONFIGURED",
        service: "MarketDataGateway",
        transport: "ServerSentEvents",
        recommended_client_target: "/api/market-data/stream",
        direct_ws_available: false,
        note: "Direct browser WebSocket requires server-side authentication header. Use /api/market-data/stream for browser streaming.",
        timestamp: new Date().toISOString(),
      },
      { status: wsUrl ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!wsUrl) {
    return NextResponse.json(
      {
        status: "UNCONFIGURED",
        service: "MarketDataGateway",
        message: "Market Data Gateway WebSocket is not configured in production.",
        transport: "DirectWebSocket",
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      status: "ACTIVE",
      service: "MarketDataGateway",
      direct_ws_url: wsUrl,
      recommended_client_target: wsUrl,
      transport: "DirectWebSocket",
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
