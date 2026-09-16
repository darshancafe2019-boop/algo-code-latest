import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5050";

export async function GET(req: NextRequest, { params }: { params: { route?: string[] } }) {
  const path = (params.route || []).join("/");
  const url = `${BACKEND_URL}/api/providers_v2/${path}${req.nextUrl.search}`;

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: `Failed proxying providers GET: ${error.message}` },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { route?: string[] } }) {
  const path = (params.route || []).join("/");
  const url = `${BACKEND_URL}/api/providers_v2/${path}`;

  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: `Failed proxying providers POST: ${error.message}` },
      { status: 502 }
    );
  }
}
