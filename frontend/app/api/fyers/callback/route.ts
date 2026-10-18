import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBackendBaseUrl, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const authCode = searchParams.get("auth_code") || searchParams.get("code");
  const error = searchParams.get("error") || searchParams.get("message");

  if (error || !authCode) {
    return NextResponse.redirect(new URL(`/settings/brokers?fyers_error=${encodeURIComponent(error || "Missing auth_code")}`, req.url));
  }

  const appId = (process.env.FYERS_APP_ID || process.env.FYERS_CLIENT_ID || (isProduction() ? "" : "CMQYDMNBL9-200")).trim();
  const secretId = (process.env.FYERS_SECRET_ID || process.env.FYERS_SECRET_KEY || (isProduction() ? "" : "qHOdqxDGXOTFLGgU")).trim();

  if (!appId || !secretId) {
    return NextResponse.redirect(new URL(`/settings/brokers?fyers_error=${encodeURIComponent("FYERS credentials not configured")}`, req.url));
  }

  try {
    const appIdHash = crypto.createHash("sha256").update(`${appId}:${secretId}`).digest("hex");

    const payload = {
      grant_type: "authorization_code",
      appIdHash,
      code: authCode.trim(),
    };

    const validateRes = await fetch("https://api-t1.fyers.in/api/v3/validate-authcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await validateRes.json();

    if (data.s === "ok" && data.access_token) {
      process.env.FYERS_ACCESS_TOKEN = data.access_token;
      // Also notify Python backend
      const backendUrl = getBackendBaseUrl();
      if (backendUrl) {
        await fetch(`${backendUrl}/api/fyers/credentials`, {
          method: "POST",
          headers: {
            ...getForwardHeaders(req),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_id: appId,
            secret_id: secretId,
            access_token: data.access_token,
          }),
        }).catch(() => {});
      }

      return NextResponse.redirect(new URL("/settings/brokers?fyers_status=connected", req.url));
    } else {
      return NextResponse.redirect(new URL(`/settings/brokers?fyers_error=${encodeURIComponent(data.message || "Failed to validate auth code")}`, req.url));
    }
  } catch (err: any) {
    return NextResponse.redirect(new URL(`/settings/brokers?fyers_error=${encodeURIComponent(err.message)}`, req.url));
  }
}
