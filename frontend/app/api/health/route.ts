import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    ok: true,
    success: true,
    service: "quantos-frontend",
    timestamp: new Date().toISOString(),
  });
}
