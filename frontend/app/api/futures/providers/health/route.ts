import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const BACKEND_URL = getBackendBaseUrl();
  const requestId = req.headers.get("x-request-id") || `fut_h_${Date.now()}`;

  if (BACKEND_URL) {
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/futures/providers/health`, {
        method: "GET",
        headers: getForwardHeaders(req, requestId),
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data, { status: 200 });
      }
    } catch (err) {
      // Backend offline
    }
  }

  return NextResponse.json({
    status: isProduction() && !BACKEND_URL ? "UNAVAILABLE" : "DEGRADED",
    count: 7,
    live_providers_count: 0,
    total_providers_count: 6,
    overall_status: "OFFLINE",
    providers: [
      {
        provider: "BINANCE_USDM",
        display_name: "Binance USD-M Futures",
        configured: Boolean(process.env.BINANCE_API_KEY),
        rest_status: "DISCONNECTED",
        websocket_status: "DISCONNECTED",
        subscription_status: "IDLE",
        decoder_status: "STANDBY",
        instrument_count: 0,
        first_tick_received: false,
        last_real_tick_at: null,
        last_tick_age_ms: null,
        status: "DISCONNECTED",
        error_code: null,
        error_details: BACKEND_URL ? "Backend offline" : "Backend unconfigured",
        reconnect_count: 0,
      },
      {
        provider: "BINANCE_COINM",
        display_name: "Binance COIN-M Futures",
        configured: Boolean(process.env.BINANCE_API_KEY),
        rest_status: "DISCONNECTED",
        websocket_status: "DISCONNECTED",
        subscription_status: "IDLE",
        decoder_status: "STANDBY",
        instrument_count: 0,
        first_tick_received: false,
        last_real_tick_at: null,
        last_tick_age_ms: null,
        status: "DISCONNECTED",
        error_code: null,
        error_details: BACKEND_URL ? "Backend offline" : "Backend unconfigured",
        reconnect_count: 0,
      },
      {
        provider: "DELTA_INDIA",
        display_name: "Delta Exchange India",
        configured: Boolean(process.env.DELTA_API_KEY),
        rest_status: "DISCONNECTED",
        websocket_status: "DISCONNECTED",
        subscription_status: "IDLE",
        decoder_status: "STANDBY",
        instrument_count: 0,
        first_tick_received: false,
        last_real_tick_at: null,
        last_tick_age_ms: null,
        status: "DISCONNECTED",
        error_code: null,
        error_details: BACKEND_URL ? "Backend offline" : "Backend unconfigured",
        reconnect_count: 0,
      },
      {
        provider: "UPSTOX",
        display_name: "Upstox Futures (NSE)",
        configured: Boolean(process.env.UPSTOX_API_KEY || process.env.UPSTOX_ACCESS_TOKEN),
        rest_status: "AUTH_REQUIRED",
        websocket_status: "DISCONNECTED",
        subscription_status: "IDLE",
        decoder_status: "NOT_APPLICABLE",
        instrument_count: 0,
        first_tick_received: false,
        last_real_tick_at: null,
        last_tick_age_ms: null,
        status: "TOKEN_EXPIRED",
        error_code: "TOKEN_EXPIRED",
        error_details: "Upstox OAuth token expired or authentication required",
        reconnect_count: 0,
      },
      {
        provider: "DHAN",
        display_name: "Dhan Futures (NSE)",
        configured: Boolean(process.env.DHAN_CLIENT_ID && process.env.DHAN_ACCESS_TOKEN),
        rest_status: "AUTH_REQUIRED",
        websocket_status: "DISCONNECTED",
        subscription_status: "IDLE",
        decoder_status: "NOT_APPLICABLE",
        instrument_count: 0,
        first_tick_received: false,
        last_real_tick_at: null,
        last_tick_age_ms: null,
        status: "TOKEN_EXPIRED",
        error_code: "TOKEN_EXPIRED",
        error_details: "Dhan API access token expired or authentication required",
        reconnect_count: 0,
      },
      {
        provider: "CME",
        display_name: "CME / Global Futures",
        configured: false,
        rest_status: "NOT_CONFIGURED",
        websocket_status: "NOT_CONFIGURED",
        subscription_status: "NOT_APPLICABLE",
        decoder_status: "NOT_APPLICABLE",
        instrument_count: 0,
        first_tick_received: false,
        last_real_tick_at: null,
        last_tick_age_ms: null,
        status: "NOT_CONFIGURED",
        error_code: "NOT_CONFIGURED",
        error_details: "CME licensed data feed credentials not configured in environment",
        reconnect_count: 0,
      },
      {
        provider: "PAPER_SIM",
        display_name: "Paper Simulator Engine",
        configured: true,
        rest_status: "STANDBY",
        websocket_status: "DISCONNECTED",
        subscription_status: "IDLE",
        decoder_status: "STANDBY",
        instrument_count: 0,
        first_tick_received: false,
        last_real_tick_at: null,
        last_tick_age_ms: null,
        status: "STANDBY",
        error_code: null,
        error_details: null,
        reconnect_count: 0,
      },
    ],
  });
}
