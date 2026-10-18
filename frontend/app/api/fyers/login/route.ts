import { NextRequest, NextResponse } from "next/server";
import { isProduction } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appId = (process.env.FYERS_APP_ID || process.env.FYERS_CLIENT_ID || (isProduction() ? "" : "CMQYDMNBL9-200")).trim();
  
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || (isProduction() ? "" : "localhost:3100");
  const proto = req.headers.get("x-forwarded-proto") || (isProduction() ? "https" : "http");
  const defaultRedirectUri = host ? `${proto}://${host}/api/fyers/callback` : "";
  const redirectUri = (process.env.FYERS_REDIRECT_URI || defaultRedirectUri).trim();

  if (!appId) {
    const origin = req.nextUrl?.origin || (host ? `${proto}://${host}` : "/");
    return NextResponse.redirect(new URL("/settings/brokers?fyers_error=" + encodeURIComponent("FYERS_APP_ID is not configured"), origin));
  }

  const state = "quantos_fyers_auth_" + Date.now();
  const authUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(authUrl);
}
