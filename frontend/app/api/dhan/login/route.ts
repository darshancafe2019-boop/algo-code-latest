import { NextRequest, NextResponse } from "next/server";
import { dhanAuth } from "@/lib/brokers/dhan/auth";
import { DhanAuthError } from "@/lib/brokers/dhan/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const consent = await dhanAuth.generateConsent();
    const shouldRedirect = req.nextUrl.searchParams.get("redirect") === "true";

    if (shouldRedirect && consent.loginUrl) {
      return NextResponse.redirect(consent.loginUrl);
    }

    return NextResponse.json({
      success: true,
      consentAppId: consent.consentAppId,
      consentAppStatus: consent.consentAppStatus,
      loginUrl: consent.loginUrl,
    });
  } catch (err: any) {
    const status = err instanceof DhanAuthError ? err.statusCode : 500;
    const errorCode = err instanceof DhanAuthError ? err.errorCode : "DHAN_LOGIN_ERROR";
    const message = err instanceof DhanAuthError ? err.safeMessage : err.message;

    return NextResponse.json(
      {
        success: false,
        errorCode,
        error: message,
      },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
