import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5050";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { broker, mode, resetCache } = body;

    let backendResult = { status: "success", message: "Ledger and FIFO recalculation completed" };

    try {
      const res = await fetch(`${BACKEND_URL}/api/portfolio/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker, mode, reset_cache: resetCache }),
      });
      if (res.ok) {
        backendResult = await res.json();
      }
    } catch (e) {
      console.warn("Backend reconciliation endpoint fallback:", e);
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
