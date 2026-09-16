import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const url = `${BACKEND_URL}/api/providers_v2${req.nextUrl.search}`;

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: `Failed proxying providers request: ${error.message}` },
      { status: 502 }
    );
  }
}
