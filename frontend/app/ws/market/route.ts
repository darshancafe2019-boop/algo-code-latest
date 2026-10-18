/**
 * WebSocket Gateway Status & Metadata Endpoint: /ws/market
 * ==========================================================
 * Next.js BFF endpoint providing direct Market Data Gateway WebSocket connection details.
 */
import { NextResponse } from "next/server";
import { getGatewayWsUrl } from "@/lib/config/gatewayConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const wsUrl = getGatewayWsUrl();

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
