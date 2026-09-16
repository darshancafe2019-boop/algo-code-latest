import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") || "";

  const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:5050";
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {}

  return NextResponse.json({
    status: "success",
    timestamp: Date.now(),
    orders: [],
    count: 0,
    filter: statusFilter || "ALL",
  });
}
