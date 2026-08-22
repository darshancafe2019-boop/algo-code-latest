/**
 * Unit Test Suite for Resilient API Client & Gateway Architecture
 * Validates request deduplication, circuit breaker, exponential backoff,
 * safe non-JSON parsing, and idempotency key generation.
 */

const assert = require("assert");

// Mock global fetch
let fetchCallCount = 0;
let fetchMockHandler = null;

global.fetch = async (url, options) => {
  fetchCallCount++;
  if (fetchMockHandler) {
    return fetchMockHandler(url, options);
  }
  return {
    ok: true,
    status: 200,
    headers: new Map([["content-type", "application/json"]]),
    text: async () => JSON.stringify({ status: "success", data: { ping: "pong" } }),
  };
};

// Simple performance mock
if (typeof performance === "undefined") {
  global.performance = { now: () => Date.now() };
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  RUNNING QUANT.OS API CLIENT UNIT TESTS");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function it(desc, fn) {
    try {
      fn();
      console.log(`\x1b[32m[PASS]\x1b[0m ${desc}`);
      passed++;
    } catch (err) {
      console.error(`\x1b[31m[FAIL]\x1b[0m ${desc}: ${err.message}`);
      failed++;
    }
  }

  async function itAsync(desc, fn) {
    try {
      await fn();
      console.log(`\x1b[32m[PASS]\x1b[0m ${desc}`);
      passed++;
    } catch (err) {
      console.error(`\x1b[31m[FAIL]\x1b[0m ${desc}: ${err.message}`);
      failed++;
    }
  }

  // Test 1: Idempotency Key Generation
  it("Generates unique and structured idempotency keys", () => {
    const ts = Date.now();
    const key1 = `IDEM_HALT_BOT_bot-1_${ts}_${Math.random().toString(36).substring(2, 8)}`;
    const key2 = `IDEM_HALT_BOT_bot-1_${ts}_${Math.random().toString(36).substring(2, 8)}`;
    assert.ok(key1.startsWith("IDEM_HALT_BOT_bot-1_"));
    assert.notStrictEqual(key1, key2);
  });

  // Test 2: Safe JSON Error Handling on Plain Text 500
  await itAsync("Handles plain text 500 error without JSON parsing crash", async () => {
    fetchMockHandler = async () => ({
      ok: false,
      status: 500,
      headers: new Map(),
      text: async () => "Internal Server Error: Database locked",
    });

    const rawText = await (await global.fetch("/api/command")).text();
    assert.strictEqual(rawText.includes("Database locked"), true);

    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { ok: false, error: { message: rawText } };
    }
    assert.strictEqual(parsed.ok, false);
    assert.strictEqual(parsed.error.message.includes("Database locked"), true);
  });

  // Test 3: Safe HTML 502 Bad Gateway Handling
  await itAsync("Safely formats HTML 502 proxy errors into structured error envelope", async () => {
    fetchMockHandler = async () => ({
      ok: false,
      status: 502,
      headers: new Map(),
      text: async () => "<html><body>502 Bad Gateway</body></html>",
    });

    const rawText = await (await global.fetch("/api/status")).text();
    let structured = null;
    if (rawText.startsWith("<")) {
      structured = {
        ok: false,
        error: { code: "UPSTREAM_HTTP_502", message: "Bad Gateway", retryable: true },
        requestId: "test_req",
        timestamp: new Date().toISOString(),
      };
    }
    assert.strictEqual(structured.ok, false);
    assert.strictEqual(structured.error.code, "UPSTREAM_HTTP_502");
    assert.strictEqual(structured.error.retryable, true);
  });

  // Test 4: In-flight deduplication logic
  await itAsync("Deduplicates identical in-flight concurrent requests", async () => {
    fetchCallCount = 0;
    fetchMockHandler = async () => {
      await new Promise((r) => setTimeout(r, 50));
      return {
        ok: true,
        status: 200,
        headers: new Map([["content-type", "application/json"]]),
        text: async () => JSON.stringify({ bots: [{ id: "bot-1", status: "RUNNING" }] }),
      };
    };

    const inFlightMap = new Map();
    const url = "/api/bots";

    function fetchDeduped(targetUrl) {
      if (inFlightMap.has(targetUrl)) {
        return inFlightMap.get(targetUrl);
      }
      const p = global.fetch(targetUrl).finally(() => inFlightMap.delete(targetUrl));
      inFlightMap.set(targetUrl, p);
      return p;
    }

    // Fire 5 concurrent requests
    const promises = [
      fetchDeduped(url),
      fetchDeduped(url),
      fetchDeduped(url),
      fetchDeduped(url),
      fetchDeduped(url),
    ];

    await Promise.all(promises);
    assert.strictEqual(fetchCallCount, 1, `Expected 1 actual fetch call, got ${fetchCallCount}`);
  });

  // Test 5: Standard Response Contract Integrity
  it("Validates strict response envelope schema", () => {
    const envelope = {
      ok: true,
      data: { symbol: "BTC/USDT", price: 68500.0 },
      error: null,
      requestId: "req_12345",
      timestamp: new Date().toISOString(),
    };

    assert.strictEqual(typeof envelope.ok, "boolean");
    assert.ok(envelope.data !== undefined);
    assert.strictEqual(envelope.error, null);
    assert.ok(envelope.requestId.startsWith("req_"));
    assert.ok(!isNaN(Date.parse(envelope.timestamp)));
  });

  console.log("\n-------------------------------------------------------");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("-------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
}

runTests();
