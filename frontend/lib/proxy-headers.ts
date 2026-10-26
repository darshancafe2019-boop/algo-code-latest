import { NextRequest } from "next/server";

export function isSameOriginBrowserRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const targetOrigin = req.nextUrl.origin;
    if (originUrl.origin === targetOrigin) {
      return true;
    }

    // Support host/port equivalence when accessing via 127.0.0.1 vs localhost
    const originHost = originUrl.hostname.toLowerCase();
    const targetHost = req.nextUrl.hostname.toLowerCase();
    const originPort = originUrl.port || (originUrl.protocol === "https:" ? "443" : "80");
    const targetPort = req.nextUrl.port || (req.nextUrl.protocol === "https:" ? "443" : "80");

    const isOriginLoopback = originHost === "localhost" || originHost === "127.0.0.1";
    const isTargetLoopback = targetHost === "localhost" || targetHost === "127.0.0.1";

    if (isOriginLoopback && isTargetLoopback && originPort === targetPort) {
      return true;
    }

    // Check against Host / X-Forwarded-Host header
    const hostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host");
    if (hostHeader) {
      const [hostName, hostPort = originUrl.protocol === "https:" ? "443" : "80"] = hostHeader.split(":");
      const isHeaderLoopback = hostName.toLowerCase() === "localhost" || hostName.toLowerCase() === "127.0.0.1";
      if (
        (originHost === hostName.toLowerCase() || (isOriginLoopback && isHeaderLoopback)) &&
        originPort === hostPort
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function getForwardHeaders(req: NextRequest, requestId?: string): Headers {
  const forwardHeaders = new Headers();
  req.headers.forEach((val, key) => {
    const lowerKey = key.toLowerCase();
    if (
      ![
        "host",
        "connection",
        "content-length",
        "transfer-encoding",
      ].includes(lowerKey)
    ) {
      forwardHeaders.set(key, val);
    }
  });

  // Next.js: ensure cookies from req.cookies are preserved in the cookie header
  try {
    const rawCookies = req.cookies.getAll();
    if (rawCookies && rawCookies.length > 0) {
      const existingCookie = forwardHeaders.get("cookie") || "";
      const cookieParts = existingCookie ? [existingCookie] : [];
      for (const c of rawCookies) {
        if (!existingCookie.includes(`${c.name}=`)) {
          cookieParts.push(`${c.name}=${c.value}`);
        }
      }
      if (cookieParts.length > 0) {
        forwardHeaders.set("cookie", cookieParts.join("; "));
      }
    }
  } catch {}

  // Synchronize Bearer token and both session cookies (algo_session_token & quantos_session_token)
  const authHeader = req.headers.get("authorization");
  let bearerToken = "";
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    bearerToken = authHeader.substring(7).trim();
  }

  let cookieHeader = forwardHeaders.get("cookie") || "";
  const algoMatch = cookieHeader.match(/algo_session_token=([^;]+)/);
  const quantosMatch = cookieHeader.match(/quantos_session_token=([^;]+)/);
  const detectedToken = bearerToken || (algoMatch ? algoMatch[1].trim() : "") || (quantosMatch ? quantosMatch[1].trim() : "");

  if (detectedToken) {
    if (!forwardHeaders.has("authorization")) {
      forwardHeaders.set("Authorization", `Bearer ${detectedToken}`);
    }
    const cookieParts = cookieHeader ? [cookieHeader] : [];
    if (!cookieHeader.includes("algo_session_token=")) {
      cookieParts.push(`algo_session_token=${detectedToken}`);
    }
    if (!cookieHeader.includes("quantos_session_token=")) {
      cookieParts.push(`quantos_session_token=${detectedToken}`);
    }
    forwardHeaders.set("cookie", cookieParts.join("; "));
  }

  if (requestId) {
    forwardHeaders.set("X-Request-Id", requestId);
    forwardHeaders.set("X-Correlation-Id", requestId);
  }
  const clientIp =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  forwardHeaders.set("X-Forwarded-For", clientIp);

  return forwardHeaders;
}
