/**
 * Centralized Live Market Data Engine - Health & Multi-Broker Telemetry Suite
 * Validates provider health reporting, Upstox provider adapter, and freshness states.
 */

import {
  marketHealthMonitor,
  upstoxProvider,
  MarketFreshnessEngine,
  MarketDataValidator,
  centralMarketEngine,
  marketState,
} from "../lib/market-data";

function runHealthTests() {
  console.log("==================================================================");
  console.log("  QUANT.OS MARKET DATA HEALTH & PROVIDER TELEMETRY SUITE          ");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${testName} ${detail ? `-> ${detail}` : ""}`);
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `-> ${detail}` : ""}`);
      process.exit(1);
    }
  }

  // 1. Provider Registration
  centralMarketEngine.registerProvider(upstoxProvider);
  const upstoxRegistered = centralMarketEngine.getProvider("upstox");
  assert(Boolean(upstoxRegistered), "Upstox Provider Registration", `Provider: ${upstoxRegistered?.name}`);

  // 2. Upstox Health Reporting
  const health = upstoxProvider.getHealth();
  assert(health.provider === "upstox", "Upstox Health Provider ID", `State: ${health.state}`);

  // 3. Upstox Tick Normalization (Truth-in-Data: No fake zeros for missing OI)
  const sampleTick = upstoxProvider.normalizeUpstoxTick({
    symbol: "NIFTY",
    securityId: "NSE_INDEX|Nifty 50",
    ltp: 24850.25,
    close: 24790.0,
    timestamp: Date.now(),
  });
  assert(sampleTick.ltp === 24850.25, "Upstox Normalized LTP", `LTP: ${sampleTick.ltp}`);
  assert(sampleTick.openInterest === undefined, "Missing OI Stays Undefined (Not Fake 0)", `OI: ${sampleTick.openInterest}`);
  assert(sampleTick.provider === "upstox", "Normalized Provider Tag", `Provider: ${sampleTick.provider}`);

  // 4. Tick Validation
  const valResult = MarketDataValidator.validateTick(sampleTick);
  assert(valResult.isValid, "Upstox Normalized Tick Passes Quality Validation");

  // 5. Negative Price Rejection
  const invalidTick = { ...sampleTick, ltp: -100 };
  const invalidResult = MarketDataValidator.validateTick(invalidTick);
  assert(!invalidResult.isValid, "Negative Price Rejected by Quality Engine", `Reason: ${invalidResult.reason}`);

  // 6. Freshness State Transitions
  const now = Date.now();
  const liveEval = MarketFreshnessEngine.evaluate(now - 500, now);
  assert(liveEval.status === "LIVE", "Freshness <2s Evaluates to LIVE", `Age: ${liveEval.ageMs}ms`);

  const recentEval = MarketFreshnessEngine.evaluate(now - 3500, now);
  assert(recentEval.status === "RECENT", "Freshness 2-5s Evaluates to RECENT", `Age: ${recentEval.ageMs}ms`);

  const staleEval = MarketFreshnessEngine.evaluate(now - 8000, now);
  assert(staleEval.status === "STALE", "Freshness 5-15s Evaluates to STALE", `Age: ${staleEval.ageMs}ms`);

  const expiredEval = MarketFreshnessEngine.evaluate(now - 35000, now);
  assert(expiredEval.status === "EXPIRED", "Freshness >15s Evaluates to EXPIRED", `Age: ${expiredEval.ageMs}ms`);

  // 7. Trading Safety Guard
  assert(MarketFreshnessEngine.isSafeForLiveTrading(sampleTick), "LIVE Tick Is Safe For Trading");
  const staleTick = { ...sampleTick, freshness: "STALE" as const };
  assert(!MarketFreshnessEngine.isSafeForLiveTrading(staleTick), "STALE Tick Blocks Trading (Fail-closed Safety)");

  console.log("\n==================================================================");
  console.log(`  ALL ${passed}/${total} HEALTH & TELEMETRY TESTS PASSED [100% SUCCESS]`);
  console.log("==================================================================\n");
}

runHealthTests();
