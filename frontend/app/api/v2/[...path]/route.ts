import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dedicated Next.js Route Handler for Quant.OS Data Core v2 API (/api/v2/*)
 * Forwards requests cleanly to the authoritative Quant.OS backend engine.
 */
async function handleV2Proxy(
  req: NextRequest,
  ctx: { params?: { path: string[] } | Promise<{ path: string[] }> }
) {
  let pathSegments: string[] = [];
  try {
    if (ctx?.params) {
      const resolved = ctx.params instanceof Promise ? await ctx.params : ctx.params;
      if (Array.isArray(resolved?.path)) {
        pathSegments = resolved.path;
      }
    }
  } catch {}

  if (pathSegments.length === 0) {
    const urlObj = new URL(req.url);
    const cleanPath = urlObj.pathname.replace(/^\/api\/v2\/?/, "");
    pathSegments = cleanPath.split("/").filter(Boolean);
  }

  const subPath = pathSegments.join("/");
  return proxyToBackend(req, subPath, {
    apiPrefix: "/api/v2",
    timeoutMs: 15000,
    cacheTtlMs: 1000,
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function POST(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: { path: string[] } }
) {
  return handleV2Proxy(req, ctx);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Request-Id, X-Idempotency-Key, X-Step-Up-Token, X-CSRF-Token",
    },
  });
}
