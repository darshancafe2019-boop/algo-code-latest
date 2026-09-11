import { NextRequest, NextResponse } from "next/server";
import { dhanAuth } from "@/lib/brokers/dhan/auth";
import { dhanTokenManager } from "@/lib/brokers/dhan/token-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    const profile = await dhanAuth.validateProfile();
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      success: true,
      connected: true,
      environment: "LIVE",
      latencyMs,
      dhanClientId: profile.dhanClientId,
      dataPlanActive: profile.dataPlanActive,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return NextResponse.json(
      {
        success: false,
        connected: false,
        latencyMs,
        message: err.safeMessage || err.message || "Failed to reach Dhan API endpoint",
      },
      { status: 200 }
    );
  }
}
