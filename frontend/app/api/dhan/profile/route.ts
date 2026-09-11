import { NextRequest, NextResponse } from "next/server";
import { dhanAuth } from "@/lib/brokers/dhan/auth";
import { DhanAuthError } from "@/lib/brokers/dhan/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const profile = await dhanAuth.validateProfile();
    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (err: any) {
    const status = err instanceof DhanAuthError ? err.statusCode : 500;
    const errorCode = err instanceof DhanAuthError ? err.errorCode : "DHAN_PROFILE_ERROR";
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
