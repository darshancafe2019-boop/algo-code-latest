import { NextRequest } from "next/server";

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

  // Ensure Cookie contains algo_session_token if Bearer token is present in Authorization
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const bearerToken = authHeader.substring(7).trim();
    if (bearerToken) {
      const existingCookie = forwardHeaders.get("cookie") || "";
      if (!existingCookie.includes("algo_session_token=")) {
        const cookieVal = existingCookie
          ? `${existingCookie}; algo_session_token=${bearerToken}`
          : `algo_session_token=${bearerToken}`;
        forwardHeaders.set("cookie", cookieVal);
      }
    }
  }

  // Vice versa: if algo_session_token is in cookie but no Authorization header, set Authorization header
  const cookieHeader = forwardHeaders.get("cookie");
  if (cookieHeader && !forwardHeaders.has("authorization")) {
    const match = cookieHeader.match(/algo_session_token=([^;]+)/);
    if (match && match[1]) {
      forwardHeaders.set("Authorization", `Bearer ${match[1].trim()}`);
    }
  }

  if (requestId) {
    forwardHeaders.set("X-Request-Id", requestId);
  }
  const clientIp =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  forwardHeaders.set("X-Forwarded-For", clientIp);

  return forwardHeaders;
}
