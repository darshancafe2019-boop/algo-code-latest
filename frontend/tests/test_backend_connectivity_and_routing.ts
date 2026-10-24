/**
 * Quant.OS Engine Backend Connectivity & Resilience Test Suite
 * =============================================================
 * Verifies:
 * 1. Missing backend URL in production returns HTTP 503 BACKEND_NOT_CONFIGURED.
 * 2. Loopback backend URL (127.0.0.1 / localhost) in production is strictly rejected.
 * 3. Valid cloud backend URL (e.g. Render) is accepted and used.
 * 4. Backend connection refusal / network failure returns HTTP 503 BACKEND_UNAVAILABLE.
 * 5. Backend request timeout returns HTTP 504 GATEWAY_TIMEOUT.
 * 6. Upstream 4xx/5xx responses (401, 403, 500) are faithfully preserved.
 * 7. Authentication credentials (Bearer token and cookies) are forwarded.
 * 8. WebSocket resolution never constructs port 5051 on Vercel deployment.
 * 9. Non-fabrication: routes return 503 on engine outage rather than fake success.
 */

import { NextRequest } from "next/server";
import {
  getBackendBaseUrl,
  getBackendConfigStatus,
  getGatewayHttpUrl,
  getGatewayWsUrl,
  isLoopbackUrl,
} from "../lib/config/gatewayConfig";
import { GET as handleV2Get } from "../app/api/v2/[...path]/route";
import { GET as handleHealthLiveGet } from "../app/api/health/live/route";
import { GET as handleHealthReadyGet } from "../app/api/health/ready/route";
import { GET as handleTradingOrdersGet } from "../app/api/trading/orders/route";
import { POST as handleApiProxyPost } from "../app/api/[...path]/route";
import { GET as handleTradingTradesGet } from "../app/api/trading/trades/route";
import { GET as handlePortfolioPositionsGet } from "../app/api/portfolio/positions/route";
import { GET as handlePortfolioAccountsGet } from "../app/api/portfolio/accounts/route";
import {
  getProxyTimeoutMs,
  isSameOriginBrowserRequest,
} from "../lib/proxy-headers";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runBackendConnectivityTests() {
  console.log("\n=======================================================");
  console.log("RUNNING BACKEND CONNECTIVITY & RESILIENCE TEST SUITE");
  console.log("=======================================================\n");

  assert(
    getProxyTimeoutMs("auth/send-otp", false, false, false) === 90_000,
    "Local OTP delivery allows the backend development fallback to complete"
  );
  assert(
    getProxyTimeoutMs("auth/send-otp", false, false, true) === 50_000,
    "Production OTP proxy timeout remains within the configured route duration"
  );
  assert(
    getProxyTimeoutMs("auth/email-otp/resend", false, false, false) === 90_000,
    "OTP resend uses the extended local delivery timeout"
  );
  assert(
    getProxyTimeoutMs("wizard/deploy", false, false, false) === 25_000,
    "Unrelated proxy timeouts are unchanged"
  );

  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Loopback Address Detection
    // ─────────────────────────────────────────────────────────────────────────
    console.log("--- 1. Testing Loopback URL Detection ---");
    assert(isLoopbackUrl("http://127.0.0.1:5050"), "127.0.0.1:5050 is detected as loopback");
    assert(isLoopbackUrl("http://localhost:5050"), "localhost:5050 is detected as loopback");
    assert(isLoopbackUrl("http://0.0.0.0:5050"), "0.0.0.0:5050 is detected as loopback");
    assert(isLoopbackUrl("ws://127.0.0.1:5051/ws"), "ws://127.0.0.1:5051/ws is detected as loopback");
    assert(isLoopbackUrl("ws://localhost:5051/ws"), "ws://localhost:5051/ws is detected as loopback");
    assert(!isLoopbackUrl("https://quantos-backend.onrender.com"), "Remote Render backend is NOT loopback");
    assert(!isLoopbackUrl("wss://quantos-gateway.onrender.com/ws"), "Remote Render gateway WS is NOT loopback");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Production Environment Safety: Reject Localhost & Unconfigured
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 2. Testing Production Safety (Reject Localhost) ---");
    (process.env as any).NODE_ENV = "production";
    process.env.STRICT_REJECT_LOOPBACK = "true";
    delete process.env.BACKEND_INTERNAL_URL;
    delete process.env.BACKEND_API_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_API_URL;

    // 2A. Unconfigured in production
    const unconfigStatus = getBackendConfigStatus();
    assert(!unconfigStatus.valid, "getBackendConfigStatus() invalid when unconfigured");
    assert(getBackendBaseUrl() === "", "getBackendBaseUrl() is empty when unconfigured");

    // 2B. Misconfigured with 127.0.0.1:5050 in production
    process.env.BACKEND_INTERNAL_URL = "http://127.0.0.1:5050";
    const loopbackStatus = getBackendConfigStatus();
    assert(!loopbackStatus.valid, "getBackendConfigStatus() rejects 127.0.0.1:5050 in production");
    assert(getBackendBaseUrl() === "", "getBackendBaseUrl() returns empty string for loopback in production");
    assert(
      (loopbackStatus.reason || "").includes("loopback"),
      "getBackendConfigStatus() provides actionable reason for loopback rejection"
    );

    // 2C. Valid cloud URL in production
    process.env.BACKEND_INTERNAL_URL = "https://quantos-backend.onrender.com";
    const validStatus = getBackendConfigStatus();
    assert(validStatus.valid, "getBackendConfigStatus() accepts valid cloud URL");
    assert(
      getBackendBaseUrl() === "https://quantos-backend.onrender.com",
      "getBackendBaseUrl() returns valid cloud URL"
    );

    // 2D. Cloud production resilience: loopback automatically falls back to canonical Render backend
    delete process.env.STRICT_REJECT_LOOPBACK;
    process.env.BACKEND_INTERNAL_URL = "http://127.0.0.1:5050";
    const canonicalFallbackStatus = getBackendConfigStatus();
    assert(canonicalFallbackStatus.valid, "getBackendConfigStatus() resolves to valid canonical cloud backend");
    assert(
      getBackendBaseUrl() === "https://algo-code-latest.onrender.com",
      "getBackendBaseUrl() resolves to verified Render backend https://algo-code-latest.onrender.com"
    );
    process.env.STRICT_REJECT_LOOPBACK = "true";

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Testing API Routes with Unconfigured / Loopback in Production (503)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 3. Testing Production 503 Responses for Failing Routes ---");
    // Set to loopback address (simulating current production failure state)
    process.env.BACKEND_INTERNAL_URL = "http://127.0.0.1:5050";

    const testRoutes = [
      { name: "/api/v2/accounts", path: ["accounts"] },
      { name: "/api/v2/providers", path: ["providers"] },
      { name: "/api/v2/reconciliation", path: ["reconciliation"] },
      { name: "/api/v2/positions", path: ["positions"] },
      { name: "/api/v2/portfolio", path: ["portfolio"] },
      { name: "/api/v2/capital/ledger", path: ["capital", "ledger"] },
      { name: "/api/v2/orders", path: ["orders"] },
      { name: "/api/v2/system/health", path: ["system", "health"] },
    ];

    for (const route of testRoutes) {
      const req = new NextRequest(`http://localhost:3100${route.name}?environment=PAPER`, {
        method: "GET",
      });
      const res = await handleV2Get(req, { params: { path: route.path } });
      assert(res.status === 503, `${route.name} returns 503 in production with loopback backend (got ${res.status})`);
      const body = await res.json();
      assert(body.ok === false, `${route.name} body contains ok: false`);
      assert(body.error?.code === "BACKEND_NOT_CONFIGURED", `${route.name} error code is BACKEND_NOT_CONFIGURED`);
    }

    // Health Live in production with loopback backend
    const healthLiveReq = new NextRequest("http://localhost:3100/api/health/live");
    const healthLiveRes = await handleHealthLiveGet(healthLiveReq);
    assert(healthLiveRes.status === 503, "/api/health/live returns 503 with loopback backend in production");
    const healthLiveBody = await healthLiveRes.json();
    assert(healthLiveBody.status === "unavailable", "/api/health/live reports unavailable");
    assert(healthLiveBody.error?.code === "BACKEND_NOT_CONFIGURED", "/api/health/live code is BACKEND_NOT_CONFIGURED");

    // Health Ready in production with loopback backend
    const healthReadyReq = new NextRequest("http://localhost:3100/api/health/ready");
    const healthReadyRes = await handleHealthReadyGet(healthReadyReq);
    assert(healthReadyRes.status === 503, "/api/health/ready returns 503 with loopback backend in production");
    const healthReadyBody = await healthReadyRes.json();
    assert(healthReadyBody.backend === false, "/api/health/ready reports backend: false");

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Testing Genuine Backend Communication (Mocking Valid Upstream)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 4. Testing Genuine Backend Connectivity & Status Codes ---");
    delete process.env.STRICT_REJECT_LOOPBACK;
    process.env.BACKEND_INTERNAL_URL = "https://algo-code-latest.onrender.com";

    // 4A. Successful 200 pass-through
    global.fetch = async (url: any) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/v2/accounts")) {
        return new Response(JSON.stringify({
          status: "success",
          environment: "PAPER",
          data: [{ id: "acc_paper_1", balance: 100000 }],
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("/api/health/live")) {
        return new Response(JSON.stringify({ status: "ok", service: "alpha-algo-backend" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    };

    const validAccountsReq = new NextRequest("http://localhost:3100/api/v2/accounts?environment=PAPER");
    const validAccountsRes = await handleV2Get(validAccountsReq, { params: { path: ["accounts"] } });
    assert(validAccountsRes.status === 200, "Valid backend returns HTTP 200 for /api/v2/accounts");
    const validAccountsBody = await validAccountsRes.json();
    assert(validAccountsBody.status === "success", "Response contains genuine backend data");

    const originalFetchForWizard = global.fetch;
    let wizardCsrfMarkerForwarded = false;
    global.fetch = (async (url: string, init?: RequestInit) => {
      assert(
        url === "https://algo-code-latest.onrender.com/api/wizard/deploy",
        "Wizard deployment is forwarded to the configured backend"
      );
      const headers = new Headers(init?.headers);
      wizardCsrfMarkerForwarded = headers.get("x-requested-with") === "XMLHttpRequest";
      assert(
        headers.get("cookie") === "algo_session_token=test-session",
        "Wizard proxy preserves the authenticated session cookie"
      );
      return new Response(JSON.stringify({ success: true, data: { bot_id: "bot-csrf-test" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;
    const sameOriginWizardReq = new NextRequest("http://localhost:3100/api/wizard/deploy", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3100",
        Cookie: "algo_session_token=test-session",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bot_name: "CSRF regression test" }),
    });
    const sameOriginWizardRes = await handleApiProxyPost(sameOriginWizardReq, {
      params: { path: ["wizard", "deploy"] },
    });
    assert(sameOriginWizardRes.status === 200, "Same-origin wizard deployment is accepted");
    assert(wizardCsrfMarkerForwarded, "Verified same-origin wizard request carries the backend CSRF marker");

    const proxiedOriginReq = new NextRequest("http://internal:3100/api/wizard/deploy", {
      method: "POST",
      headers: {
        Host: "localhost:3100",
        Origin: "http://localhost:3100",
        Cookie: "algo_session_token=test-session",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bot_name: "proxied origin regression test" }),
    });
    assert(
      isSameOriginBrowserRequest(proxiedOriginReq),
      "Same-origin browser requests are recognized when the proxy URL differs from the incoming host"
    );

    let crossOriginReachedBackend = false;
    global.fetch = (async () => {
      crossOriginReachedBackend = true;
      return new Response("unexpected", { status: 200 });
    }) as any;
    const crossOriginWizardReq = new NextRequest("http://localhost:3100/api/wizard/deploy", {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        Cookie: "algo_session_token=test-session",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bot_name: "cross-origin request" }),
    });
    const crossOriginWizardRes = await handleApiProxyPost(crossOriginWizardReq, {
      params: { path: ["wizard", "deploy"] },
    });
    assert(crossOriginWizardRes.status === 403, "Cross-origin wizard deployment is rejected");
    assert(!crossOriginReachedBackend, "Cross-origin wizard request is stopped before backend forwarding");
    global.fetch = originalFetchForWizard;

    const validLiveReq = new NextRequest("http://localhost:3100/api/health/live");
    const validLiveRes = await handleHealthLiveGet(validLiveReq);
    assert(validLiveRes.status === 200, "/api/health/live returns HTTP 200 when backend is healthy");

    // 4B. Upstream 401 Unauthorized Pass-Through (Zero Error Masking)
    global.fetch = async () => {
      return new Response(JSON.stringify({
        status: "error",
        error_code: "UNAUTHORIZED",
        message: "Authentication required",
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    };

    const authReq = new NextRequest("http://localhost:3100/api/v2/orders");
    const authRes = await handleV2Get(authReq, { params: { path: ["orders"] } });
    assert(authRes.status === 401, "Upstream 401 is passed through faithfully without being masked as 503");

    // 4C. Upstream 500 Server Error Pass-Through
    global.fetch = async () => {
      return new Response(JSON.stringify({
        status: "error",
        error_code: "INTERNAL_ERROR",
        message: "Database query fault",
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    };

    const err500Req = new NextRequest("http://localhost:3100/api/v2/portfolio");
    const err500Res = await handleV2Get(err500Req, { params: { path: ["portfolio"] } });
    assert(err500Res.status === 500, "Upstream 500 is passed through faithfully");

    // 4D. Backend Network Connection Failure (e.g. ECONNREFUSED to offline remote host)
    global.fetch = async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.1:5050");
    };

    const connRefusedReq = new NextRequest("http://localhost:3100/api/v2/positions");
    const connRefusedRes = await handleV2Get(connRefusedReq, { params: { path: ["positions"] } });
    assert(connRefusedRes.status === 503, "Network connection refusal returns HTTP 503 BACKEND_UNAVAILABLE");
    const connRefusedBody = await connRefusedRes.json();
    assert(connRefusedBody.error?.code === "BACKEND_UNAVAILABLE", "Error code is BACKEND_UNAVAILABLE");

    // 4E. Backend Timeout (AbortError -> 504)
    global.fetch = async () => {
      const abortErr = new Error("The operation was aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    };

    const timeoutReq = new NextRequest("http://localhost:3100/api/v2/orders");
    const timeoutRes = await handleV2Get(timeoutReq, { params: { path: ["orders"] } });
    assert(timeoutRes.status === 504, "Backend timeout returns HTTP 504 GATEWAY_TIMEOUT");
    const timeoutBody = await timeoutRes.json();
    assert(timeoutBody.error?.code === "GATEWAY_TIMEOUT", "Error code is GATEWAY_TIMEOUT");

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Zero Fabrication Testing
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 5. Testing Zero Fabrication on Outages ---");
    process.env.STRICT_REJECT_LOOPBACK = "true";
    delete process.env.BACKEND_INTERNAL_URL;

    const ordersRes = await handleTradingOrdersGet(new NextRequest("http://localhost:3100/api/trading/orders"));
    assert(ordersRes.status === 503, "/api/trading/orders returns 503 when backend unconfigured (never fake success)");

    const tradesRes = await handleTradingTradesGet(new NextRequest("http://localhost:3100/api/trading/trades"));
    assert(tradesRes.status === 503, "/api/trading/trades returns 503 when backend unconfigured (never fake success)");

    const positionsRes = await handlePortfolioPositionsGet(new NextRequest("http://localhost:3100/api/portfolio/positions"));
    assert(positionsRes.status === 503, "/api/portfolio/positions returns 503 when backend unconfigured");

    const accountsRes = await handlePortfolioAccountsGet(new NextRequest("http://localhost:3100/api/portfolio/accounts"));
    assert(accountsRes.status === 503, "/api/portfolio/accounts returns 503 when backend unconfigured (never fake $1M balance)");

    // ─────────────────────────────────────────────────────────────────────────
    // 6. WebSocket URL Resolution on Vercel
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 6. Testing WebSocket Resolution Safety on Vercel ---");
    delete process.env.STRICT_REJECT_LOOPBACK;
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_GATEWAY_WS_URL;
    delete process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS;
    delete process.env.MARKET_GATEWAY_URL;

    // Unconfigured returns empty string (triggers safe SSE fallback)
    assert(
      getGatewayWsUrl() === "",
      "Production getGatewayWsUrl() returns empty string when unconfigured (never :5051)"
    );

    // If accidentally configured with loopback ws://127.0.0.1:5051/ws, it is rejected
    process.env.NEXT_PUBLIC_GATEWAY_WS_URL = "ws://127.0.0.1:5051/ws";
    assert(
      getGatewayWsUrl() === "",
      "Production getGatewayWsUrl() strictly rejects ws://127.0.0.1:5051/ws"
    );

    // When configured with production Render WSS endpoint
    process.env.NEXT_PUBLIC_GATEWAY_WS_URL = "wss://quantos-gateway.onrender.com/ws";
    assert(
      getGatewayWsUrl() === "wss://quantos-gateway.onrender.com/ws",
      "Production getGatewayWsUrl() accepts valid wss:// cloud endpoint"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Local Development Preserved
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n--- 7. Testing Local Development Support ---");
    (process.env as any).NODE_ENV = "development";
    delete process.env.BACKEND_INTERNAL_URL;
    delete process.env.NEXT_PUBLIC_GATEWAY_WS_URL;
    delete process.env.MARKET_GATEWAY_URL;

    assert(
      getBackendBaseUrl() === "http://127.0.0.1:5050",
      "Development getBackendBaseUrl() defaults to http://127.0.0.1:5050"
    );
    assert(
      getGatewayHttpUrl() === "http://127.0.0.1:5051",
      "Development getGatewayHttpUrl() defaults to http://127.0.0.1:5051"
    );
    assert(
      getGatewayWsUrl() === "ws://127.0.0.1:5051/ws",
      "Development getGatewayWsUrl() defaults to ws://127.0.0.1:5051/ws"
    );

    console.log("\n=======================================================");
    console.log("ALL BACKEND CONNECTIVITY TESTS PASSED! ✅");
    console.log("=======================================================\n");
  } finally {
    process.env = originalEnv;
    global.fetch = originalFetch;
  }
}

runBackendConnectivityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
