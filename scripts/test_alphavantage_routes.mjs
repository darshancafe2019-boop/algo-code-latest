/**
 * Alpha Vantage End-to-End Route Resilience & 500 Crash Protection Verification
 * ============================================================================
 * Tests:
 * 1. GET  /api/alphavantage/status (Returns 200 OK with masked key and telemetry)
 * 2. POST /api/alphavantage/ping   (Returns 200 OK diagnostic ping response)
 * 3. GET  /api/alphavantage/quotes (Returns 200 OK normalized quote or controlled status)
 * 4. GET  /api/alphavantage/candles (Returns 200 OK normalized candles)
 * 5. GET  /api/alphavantage/indicators (Returns 200 OK technical indicators)
 * 6. GET  /api/alphavantage/sentiment (Returns 200 OK market sentiment)
 * 7. Verifies that no route crashes or returns HTTP 500.
 */

import http from "http";

const PORT = 3100;

async function fetchRoute(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path,
        method,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(raw);
            resolve({ status: res.statusCode, data: json });
          } catch {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function runVerification() {
  console.log("================================================================");
  console.log("    ALPHA VANTAGE REST API & RESILIENCE VERIFICATION SUITE       ");
  console.log("================================================================");

  const tests = [
    { name: "Alpha Vantage Status Endpoint", path: "/api/alphavantage/status", method: "GET" },
    { name: "Alpha Vantage Ping Diagnostic", path: "/api/alphavantage/ping", method: "POST" },
    { name: "Alpha Vantage Global Quote (AAPL)", path: "/api/alphavantage/quotes?symbol=AAPL", method: "GET" },
    { name: "Alpha Vantage Intraday Candles (5m)", path: "/api/alphavantage/candles?symbol=AAPL&timeframe=5m", method: "GET" },
    { name: "Alpha Vantage Daily Candles", path: "/api/alphavantage/candles?symbol=AAPL&timeframe=1d", method: "GET" },
    { name: "Alpha Vantage RSI Indicator", path: "/api/alphavantage/indicators?symbol=AAPL&indicator=RSI", method: "GET" },
    { name: "Alpha Vantage News & Sentiment", path: "/api/alphavantage/sentiment?topics=technology", method: "GET" },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await fetchRoute(t.path, t.method);
      if (res.status === 200) {
        console.log(`[PASS] ${t.name} -> HTTP ${res.status} OK`);
        if (t.path.includes("status")) {
          console.log(`       Masked Key: ${res.data.apiKeyMasked} | Role: ${res.data.providerRole}`);
        }
        passed++;
      } else {
        console.error(`[FAIL] ${t.name} -> Unexpected HTTP ${res.status}`);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] ${t.name} -> Request failed: ${err.message}`);
      failed++;
    }
  }

  console.log("----------------------------------------------------------------");
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
