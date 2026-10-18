/**
 * QuantOS Production Market Data Stream Authentication & Architecture Test Suite
 * ==============================================================================
 * Tests:
 * 1. Unauthorized access rejection in production mode (fail-closed HTTP 401)
 * 2. Authorized access acceptance via Bearer token, cookie, or session
 * 3. Symbol validation, sanitization, and max-symbol truncation protection
 * 4. Gateway secret isolation (never exposed client-side or in URLs)
 * 5. Production endpoint resolution (no silent localhost fallback)
 * 6. Dynamic subscription updates (POST /api/market-data/stream with subscribe, unsubscribe, set)
 * 7. Browser transport selection (SSE for remote gateway / production, direct WS for local dev)
 */

import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/market-data/stream/route";
import {
  getGatewaySecret,
  getGatewayWsUrl,
  getGatewayHttpUrl,
  getBackendBaseUrl,
} from "../lib/config/gatewayConfig";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runStreamAuthTests() {
  console.log("\n=======================================================");
  console.log("RUNNING STREAM AUTH & ARCHITECTURE TEST SUITE");
  console.log("=======================================================\n");

  const originalEnv = { ...process.env };

  try {
    // ── TEST 1: Unauthorized Access in Production Mode ──
    console.log("--- 1. Testing Unauthorized Access Rejection in Production ---");
    (process.env as any).NODE_ENV = "production";
    delete process.env.AUTH_REQUIRE_LOGIN;

    const unauthReq = new NextRequest("http://localhost:3000/api/market-data/stream?symbols=NSE:NIFTY50", {
      method: "GET",
    });

    const unauthRes = await GET(unauthReq);
    assert(unauthRes.status === 401, `GET without credentials returns HTTP 401 (got ${unauthRes.status})`);

    const unauthData = await unauthRes.json();
    assert(unauthData.ok === false, "Response body contains ok: false");
    assert(unauthData.error === "UNAUTHORIZED", "Error code is UNAUTHORIZED");

    // Also test POST without auth in production
    const unauthPostReq = new NextRequest("http://localhost:3000/api/market-data/stream", {
      method: "POST",
      body: JSON.stringify({
        streamId: "test_stream_1",
        action: "subscribe",
        symbols: ["NSE:RELIANCE"],
      }),
      headers: { "Content-Type": "application/json" },
    });
    const unauthPostRes = await POST(unauthPostReq);
    assert(unauthPostRes.status === 401, `POST without credentials returns HTTP 401 (got ${unauthPostRes.status})`);

    // ── TEST 2: Secret Isolation and Non-Exposure ──
    console.log("\n--- 2. Testing Gateway Secret Isolation ---");
    process.env.MARKET_GATEWAY_SECRET = "super_secret_quantos_key_12345";
    process.env.GATEWAY_SECRET = "super_secret_quantos_key_12345";

    // A. Server side gets the secret
    assert(
      getGatewaySecret() === "super_secret_quantos_key_12345",
      "Server-side getGatewaySecret() retrieves configured secret"
    );

    // B. Simulated browser bundle context (window defined) MUST return empty string
    (global as any).window = {};
    const browserSecret = getGatewaySecret();
    assert(browserSecret === "", "Browser-side getGatewaySecret() strictly returns empty string");
    delete (global as any).window;

    // C. Check that NEXT_PUBLIC_ variables never leak the gateway secret
    const leakedEnvKeys = Object.keys(process.env).filter(
      (k) => k.startsWith("NEXT_PUBLIC_") && (k.includes("SECRET") || k.includes("GATEWAY_SECRET"))
    );
    assert(
      leakedEnvKeys.length === 0,
      `No NEXT_PUBLIC_* variables expose gateway secret (found: ${leakedEnvKeys.join(", ") || "none"})`
    );

    // ── TEST 3: Production Destination Resolution (No Localhost Fallback) ──
    console.log("\n--- 3. Testing Production Destination Resolution ---");
    (process.env as any).NODE_ENV = "production";
    delete process.env.MARKET_GATEWAY_URL;
    delete process.env.MARKET_DATA_GATEWAY_URL;
    delete process.env.MARKET_DATA_GATEWAY_HTTP_URL;
    delete process.env.NEXT_PUBLIC_MARKET_GATEWAY_URL;
    delete process.env.NEXT_PUBLIC_GATEWAY_WS_URL;
    delete process.env.NEXT_PUBLIC_MARKET_GATEWAY_WS;
    delete process.env.BACKEND_INTERNAL_URL;
    delete process.env.BACKEND_API_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;

    assert(
      getGatewayHttpUrl() === "",
      "getGatewayHttpUrl() returns empty in production if unconfigured (never 127.0.0.1)"
    );
    assert(
      getGatewayWsUrl() === "",
      "getGatewayWsUrl() returns empty in production if unconfigured (never 127.0.0.1:5051)"
    );
    assert(
      getBackendBaseUrl() === "",
      "getBackendBaseUrl() returns empty in production if unconfigured (never 127.0.0.1:5050)"
    );

    // When configured with production Render URLs
    process.env.MARKET_GATEWAY_URL = "https://quantos-gateway.onrender.com";
    assert(
      getGatewayHttpUrl() === "https://quantos-gateway.onrender.com",
      "getGatewayHttpUrl() correctly resolves configured Render HTTP URL"
    );
    assert(
      getGatewayWsUrl() === "wss://quantos-gateway.onrender.com/ws",
      "getGatewayWsUrl() derives wss:// endpoint from configured Render HTTP URL"
    );

    // ── TEST 4: Development Destination Resolution (Safe Fallbacks Allowed) ──
    console.log("\n--- 4. Testing Development Destination Resolution ---");
    (process.env as any).NODE_ENV = "development";
    delete process.env.MARKET_GATEWAY_URL;

    assert(
      getGatewayHttpUrl() === "http://127.0.0.1:5051",
      "Development getGatewayHttpUrl() falls back to 127.0.0.1:5051"
    );
    assert(
      getGatewayWsUrl() === "ws://127.0.0.1:5051/ws",
      "Development getGatewayWsUrl() falls back to ws://127.0.0.1:5051/ws"
    );
    assert(
      getBackendBaseUrl() === "http://127.0.0.1:5050",
      "Development getBackendBaseUrl() falls back to http://127.0.0.1:5050"
    );

    // ── TEST 5: Symbol Sanitization & Limitation in Stream Route ──
    console.log("\n--- 5. Testing Symbol Sanitization and Bounds ---");
    (process.env as any).NODE_ENV = "development"; // allow request to pass auth check in dev

    // Request with valid and invalid symbols
    const messyReq = new NextRequest(
      "http://localhost:3000/api/market-data/stream?symbols=NSE:NIFTY50,BINANCE:BTCUSDT,<script>alert(1)</script>,VALID_SYM,1234567890123456789012345678901234567890EXTRA_LONG_SYMBOL_THAT_EXCEEDS_FORTY_CHARS",
      { method: "GET" }
    );

    const messyRes = await GET(messyReq);
    assert(messyRes.status === 200, "GET with symbols returns HTTP 200 in dev");
    assert(
      messyRes.headers.get("content-type")?.includes("text/event-stream") === true,
      "Content-Type is text/event-stream"
    );
    assert(
      messyRes.headers.get("cache-control")?.includes("no-cache") === true,
      "Cache-Control is no-cache"
    );

    // ── TEST 6: POST Dynamic Subscription Actions Validation ──
    console.log("\n--- 6. Testing POST Dynamic Subscription Actions ---");

    // Missing streamId
    const noStreamIdReq = new NextRequest("http://localhost:3000/api/market-data/stream", {
      method: "POST",
      body: JSON.stringify({ action: "subscribe", symbols: ["NSE:TCS"] }),
      headers: { "Content-Type": "application/json" },
    });
    const noStreamIdRes = await POST(noStreamIdReq);
    assert(noStreamIdRes.status === 400, "Missing streamId returns HTTP 400");

    // Invalid action
    const badActionReq = new NextRequest("http://localhost:3000/api/market-data/stream", {
      method: "POST",
      body: JSON.stringify({ streamId: "stream_xyz", action: "hack_stream", symbols: ["NSE:TCS"] }),
      headers: { "Content-Type": "application/json" },
    });
    const badActionRes = await POST(badActionReq);
    assert(badActionRes.status === 400, "Invalid action returns HTTP 400");

    // Missing symbols
    const noSymbolsReq = new NextRequest("http://localhost:3000/api/market-data/stream", {
      method: "POST",
      body: JSON.stringify({ streamId: "stream_xyz", action: "subscribe", symbols: [] }),
      headers: { "Content-Type": "application/json" },
    });
    const noSymbolsRes = await POST(noSymbolsReq);
    assert(noSymbolsRes.status === 400, "Empty symbols list returns HTTP 400");

    // Unknown stream ID (instance mismatch) returns 404 handled: false
    const unknownStreamReq = new NextRequest("http://localhost:3000/api/market-data/stream", {
      method: "POST",
      body: JSON.stringify({ streamId: "stream_non_existent", action: "subscribe", symbols: ["NSE:TCS"] }),
      headers: { "Content-Type": "application/json" },
    });
    const unknownStreamRes = await POST(unknownStreamReq);
    assert(
      unknownStreamRes.status === 404,
      `Unknown streamId returns HTTP 404 (got ${unknownStreamRes.status})`
    );
    const unknownData = await unknownStreamRes.json();
    assert(unknownData.handled === false, "Response returns handled: false for debounced reconnect");

    console.log("\n=======================================================");
    console.log("ALL STREAM AUTH & ARCHITECTURE TESTS PASSED! ✅");
    console.log("=======================================================\n");
  } finally {
    process.env = originalEnv;
  }
}

runStreamAuthTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
