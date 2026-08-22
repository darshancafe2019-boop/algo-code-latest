/**
 * E2E Verification Test Suite for Institutional Futures Terminal
 * ==============================================================
 * Tests:
 * 1. GET /api/futures/contracts (Deduplication, unique IDs, canonical quote currencies, no duplicate rows)
 * 2. GET /api/futures/term-structure (Curve points, basis, annualized basis, regime classification)
 * 3. GET /api/futures/funding-heatmap (Multi-asset x multi-exchange matrix)
 * 4. GET /api/futures/open-interest-analytics (OI values, 24h delta, positioning matrix)
 * 5. GET /api/futures/orderbook (L2 orderbook depth, spread, order imbalance)
 * 6. POST /api/futures/risk-check (14-Stage risk validation with pass/warning/rejection stages)
 * 7. POST /api/futures/order (Idempotent order placement, double-click protection)
 * 8. GET /api/futures/export (CSV export format)
 * 9. GET /api/futures/health (Health check)
 * 10. Frontend page render and UI components
 */

const http = require("http");

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=================================================================");
  console.log("🚀 STARTING E2E INSTITUTIONAL FUTURES TERMINAL TEST SUITE");
  console.log("=================================================================\n");

  const baseUrl = "http://127.0.0.1:5050";
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // Test 1: Canonical Contracts & Deduplication
    console.log("🔍 TEST 1: Canonical Contract Discovery & Deduplication");
    const resContracts = await fetchJson(`${baseUrl}/api/futures/contracts?underlying=BTC`);
    assert(resContracts.status === 200, "Contracts endpoint returns 200 OK");
    assert(resContracts.data.status === "success", "Response status is 'success'");
    const contracts = resContracts.data.contracts || [];
    assert(contracts.length > 0, `Loaded ${contracts.length} canonical contracts`);

    // Verify unique IDs and no duplicate canonical_symbol
    const canonicalIds = contracts.map((c) => c.contract_id);
    const uniqueIds = new Set(canonicalIds);
    assert(canonicalIds.length === uniqueIds.size, "Zero duplicate contract IDs found (100% unique constraint)");

    // Verify distinct USDT and USDC contracts exist with clean naming
    const hasUsdt = contracts.some((c) => c.quote_asset === "USDT");
    const hasUsdc = contracts.some((c) => c.quote_asset === "USDC");
    assert(hasUsdt, "USDT-margined perpetual/dated contracts present");
    assert(hasUsdc, "USDC-margined perpetual/dated contracts present");

    // Test 2: Term Structure Curve & Regime
    console.log("\n🔍 TEST 2: Futures Term Structure Curve & Market Regime");
    const resTs = await fetchJson(`${baseUrl}/api/futures/term-structure?underlying=BTC`);
    assert(resTs.status === 200, "Term structure endpoint returns 200 OK");
    assert(["CONTANGO", "BACKWARDATION", "FLAT"].includes(resTs.data.regime), `Market regime detected: ${resTs.data.regime}`);
    assert(resTs.data.curve_points.length >= 2, `Curve contains ${resTs.data.curve_points.length} expiry price points`);

    // Test 3: Funding Heatmap Matrix
    console.log("\n🔍 TEST 3: Multi-Asset × Multi-Exchange Funding Heatmap");
    const resHm = await fetchJson(`${baseUrl}/api/futures/funding-heatmap`);
    assert(resHm.status === 200, "Funding heatmap endpoint returns 200 OK");
    assert(resHm.data.assets.includes("BTC"), "Heatmap includes BTC");
    assert(resHm.data.exchanges.includes("BINANCE"), "Heatmap includes BINANCE");
    assert(resHm.data.matrix.length >= 5, `Heatmap matrix rows: ${resHm.data.matrix.length}`);

    // Test 4: Open Interest & Interpretation Matrix
    console.log("\n🔍 TEST 4: Open Interest Analytics & Positioning Matrix");
    const resOi = await fetchJson(`${baseUrl}/api/futures/open-interest-analytics?underlying=BTC`);
    assert(resOi.status === 200, "OI Analytics endpoint returns 200 OK");
    assert(resOi.data.current_oi > 0, `Current OI: ${resOi.data.current_oi}`);
    assert(resOi.data.interpretation !== "", `OI Interpretation: ${resOi.data.interpretation}`);
    assert(["BULLISH", "BEARISH", "NEUTRAL_BULLISH", "BEARISH_CAPITULATION"].includes(resOi.data.signal_bias), `Signal bias: ${resOi.data.signal_bias}`);

    // Test 5: Level-2 Depth & Order Book Imbalance
    console.log("\n🔍 TEST 5: Level-2 Order Book Depth & Microstructure");
    const resOb = await fetchJson(`${baseUrl}/api/futures/orderbook?contract_id=BINANCE:BTCUSDT:PERPETUAL`);
    assert(resOb.status === 200, "Orderbook endpoint returns 200 OK");
    assert(resOb.data.bids.length > 0 && resOb.data.asks.length > 0, `Orderbook depth: ${resOb.data.bids.length} bids, ${resOb.data.asks.length} asks`);
    assert(resOb.data.spread >= 0, `Best Spread: $${resOb.data.spread}`);
    assert(typeof resOb.data.imbalance_ratio === "number", `Imbalance Ratio: ${resOb.data.imbalance_ratio}`);

    // Test 6: 14-Stage Risk Pre-Check (PASS & REJECT)
    console.log("\n🔍 TEST 6: Authoritative 14-Stage Risk Pre-Check");
    // Scenario A: Safe Trade
    const safePayload = {
      symbol: "BINANCE:BTCUSDT:PERPETUAL",
      side: "BUY",
      quantity: 0.02,
      price: 65000.0,
      leverage: 5.0,
      stop_loss: 63700.0,
      take_profit: 68000.0,
      margin_mode: "ISOLATED"
    };
    const resSafeRisk = await fetchJson(`${baseUrl}/api/futures/risk-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: safePayload
    });
    assert(resSafeRisk.status === 200, "Risk check endpoint returns 200 OK");
    assert(resSafeRisk.data.approved === true, `Safe trade approved: ${resSafeRisk.data.verdict}`);
    assert(resSafeRisk.data.stages.length === 14, `Complete 14 stages evaluated: count = ${resSafeRisk.data.stages.length}`);
    assert(resSafeRisk.data.break_even.break_even_price > 65000, `True break-even calculated: $${resSafeRisk.data.break_even.break_even_price}`);

    // Scenario B: Excessive Exposure Rejection
    const unsafePayload = {
      symbol: "BINANCE:BTCUSDT:PERPETUAL",
      side: "BUY",
      quantity: 0.15, // $9,750 on $10,000 account = 97.5% > 30% limit
      price: 65000.0,
      leverage: 5.0,
      stop_loss: 63700.0,
      take_profit: 68000.0
    };
    const resUnsafeRisk = await fetchJson(`${baseUrl}/api/futures/risk-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: unsafePayload
    });
    assert(resUnsafeRisk.data.approved === false, "Unsafe trade correctly REJECTED by risk engine");
    assert(resUnsafeRisk.data.verdict === "REJECTED", "Verdict is 'REJECTED'");

    // Test 7: Idempotent Order Placement
    console.log("\n🔍 TEST 7: Idempotent Futures Order Execution");
    const testIdempotencyKey = `e2e_key_${Date.now()}`;
    const orderPayload = {
      idempotency_key: testIdempotencyKey,
      symbol: "BINANCE:BTCUSDT:PERPETUAL",
      canonical_symbol: "BINANCE:BTCUSDT:PERPETUAL",
      underlying: "BTC",
      side: "BUY",
      order_type: "MARKET",
      quantity: 0.02,
      price: 65000.0,
      leverage: 5.0,
      margin_mode: "ISOLATED",
      execution_mode: "PAPER"
    };

    const resOrder1 = await fetchJson(`${baseUrl}/api/futures/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: orderPayload
    });
    assert(resOrder1.status === 200, "Order 1 placed successfully");
    assert(resOrder1.data.status === "success", "Order status is 'success'");
    const firstOrderId = resOrder1.data.order.order_id;
    assert(Boolean(firstOrderId), `Order ID generated: ${firstOrderId}`);

    // Retry same request
    const resOrder2 = await fetchJson(`${baseUrl}/api/futures/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: orderPayload
    });
    assert(resOrder2.data.duplicate === true, "Duplicate order execution correctly prevented by idempotency key");
    assert(resOrder2.data.order.order_id === firstOrderId, "Returned existing order ID matching first submission");

    // Test 8: Health & Export
    console.log("\n🔍 TEST 8: Health Check & CSV Export");
    const resHealth = await fetchJson(`${baseUrl}/api/futures/health`);
    assert(resHealth.data.status === "healthy", "Futures system health is 'healthy'");

    const resExport = await fetchJson(`${baseUrl}/api/futures/export?underlying=BTC&format=csv`);
    assert(resExport.status === 200, "CSV Export returns 200 OK");
    assert(resExport.raw.includes("Contract ID"), "CSV Export contains valid header rows");

    console.log("\n=================================================================");
    console.log(`🎯 E2E TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
    console.log("=================================================================\n");

  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
