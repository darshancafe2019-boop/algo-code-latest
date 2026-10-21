import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getBackendBaseUrl, getGatewaySecret, isProduction } from "@/lib/config/gatewayConfig";
import { getForwardHeaders } from "@/lib/proxy-headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Short-lived Gateway Token Endpoint
 * ==================================
 * Issues a signed, 60-second HMAC-SHA256 token for WebSocket authentication.
 * - Requires a valid user session (validated against backend /api/auth/me).
 * - Payload: `${userId}:${expiresAt}`.
 * - Signed with server-side MARKET_GATEWAY_SECRET. Secret is never sent to browser.
 */
export async function GET(req: NextRequest) {
  return generateGatewayToken(req);
}

export async function POST(req: NextRequest) {
  return generateGatewayToken(req);
}

async function generateGatewayToken(req: NextRequest) {
  const secret = getGatewaySecret();
  if (!secret) {
    return NextResponse.json(
      { ok: false, token: null, error: "GATEWAY_SECRET_NOT_CONFIGURED", disabled: true },
      { status: 200 }
    );
  }

  const backendUrl = getBackendBaseUrl();
  let userId: string | null = null;

  // 1. Validate session against backend /api/auth/me
  if (backendUrl) {
    try {
      const authRes = await fetch(`${backendUrl}/api/auth/me`, {
        method: "GET",
        headers: getForwardHeaders(req),
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (authRes.ok) {
        const data = await authRes.json().catch(() => ({}));
        if (data.authenticated !== false && data.user) {
          userId = String(data.user.id || data.user.username || "authenticated_user");
        }
      }
    } catch (err: any) {
      console.warn("[GATEWAY_TOKEN] Auth check error:", err?.message || err);
    }
  }

  // In development only: fallback to dev-user if backend is unavailable
  if (!userId && !isProduction()) {
    userId = "dev-user";
  }

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Authentication required: valid session is required" },
      { status: 401 }
    );
  }

  // 2. Generate short-lived HMAC-SHA256 token (~60s TTL)
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = nowSec + 60;
  const payload = `${userId}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const token = `${payload}:${signature}`;

  return NextResponse.json(
    {
      ok: true,
      token,
      expires_at: expiresAt,
      user_id: userId,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
