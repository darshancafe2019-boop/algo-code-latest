import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appId = (process.env.FYERS_APP_ID || process.env.FYERS_CLIENT_ID || "CMQYDMNBL9-200").trim();
  const redirectUri = (process.env.FYERS_REDIRECT_URI || "http://localhost:3100/api/fyers/callback").trim();
  const state = "quantos_fyers_auth_" + Date.now();

  const authUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(authUrl);
}
