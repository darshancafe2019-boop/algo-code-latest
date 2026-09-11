import { NextRequest, NextResponse } from "next/server";
import { dhanAuth } from "@/lib/brokers/dhan/auth";
import { dhanLiveFeed } from "@/lib/market-data/dhan-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const tokenId = url.searchParams.get("tokenId") || url.searchParams.get("token_id") || url.searchParams.get("token");

  if (!tokenId) {
    console.warn("[DhanCallback] Missing tokenId in callback query parameters.");
    return NextResponse.redirect(new URL("/settings?broker=dhan&auth=error&reason=MISSING_TOKEN_ID", req.url));
  }

  try {
    // 1. Consume Consent and acquire 24-hr access token
    const consentResult = await dhanAuth.consumeConsent(tokenId);
    console.log(`[DhanCallback] Consent consumed successfully for client: ${consentResult.dhanClientId}`);

    // 2. Validate Profile and check genuine data plan
    const profile = await dhanAuth.validateProfile().catch((err) => {
      console.warn("[DhanCallback] Profile verification notice:", err.message);
      return null;
    });

    // 3. Connect Live Dhan Market Feed with the freshly acquired token
    try {
      dhanLiveFeed.connect();
    } catch (wsErr) {
      console.warn("[DhanCallback] Dhan live feed connection scheduled:", wsErr);
    }

    // 4. Clean Redirect (ZERO token leakage in URL bar)
    const successUrl = new URL("/settings", req.url);
    successUrl.searchParams.set("broker", "dhan");
    successUrl.searchParams.set("auth", "success");
    if (profile?.dataPlanActive) {
      successUrl.searchParams.set("dataPlan", "active");
    }

    return NextResponse.redirect(successUrl);
  } catch (err: any) {
    console.error("[DhanCallback] Authentication failed:", err.message);
    const errorUrl = new URL("/settings", req.url);
    errorUrl.searchParams.set("broker", "dhan");
    errorUrl.searchParams.set("auth", "error");
    errorUrl.searchParams.set("errorCode", err.errorCode || "AUTH_FAILED");
    return NextResponse.redirect(errorUrl);
  }
}
