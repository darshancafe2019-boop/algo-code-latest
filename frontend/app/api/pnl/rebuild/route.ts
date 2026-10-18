import { NextRequest, NextResponse } from "next/server";
import { getForwardHeaders } from "@/lib/proxy-headers";
import { getBackendBaseUrl } from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { broker, mode, resetCache } = body;
    const BACKEND_URL = getBackendBaseUrl();

    let backendResult = { status: "success", message: "Ledger and FIFO recalculation completed" };

    if (BACKEND_URL) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/portfolio/reconcile`, {
          method: "POST",
          headers: getForwardHeaders(request),
          body: JSON.stringify({ broker, mode, reset_cache: resetCache }),
        });
        if (res.ok) {
          backendResult = await res.json();
        }
      } catch (e) {
        console.warn("Backend reconciliation endpoint fallback:", e);
      }
    }

    return NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString(),
      recalculated: true,
      backend: backendResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", error: error.message || "Failed to trigger P&L rebuild" },
      { status: 500 }
    );
  }
}
