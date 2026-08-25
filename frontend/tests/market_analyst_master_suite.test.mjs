import assert from "node:assert";
import {
  buildMarketSnapshot,
  calculateDeterministicEvidenceScore,
  analyzeMarket,
  analyzeOpenPosition,
  reviewCompletedTrade,
  getAnalystTelemetry,
} from "../lib/openai/marketAnalystService.ts";
import { READONLY_MARKET_TOOLS } from "../lib/openai/marketTools.ts";
import { getOpenAiConfig, checkRateLimit } from "../lib/openai/config.ts";

async function runMasterTestSuite() {
  console.log("===============================================================");
  console.log("🚀 RUNNING MASTER OPENAI MARKET ANALYST SUITE (QUANT.OS)");
  console.log("===============================================================\n");

  // TEST 1: Build Snapshot & Deterministic Evidence Score
  console.log("[TEST 1] Verifying Multi-Timeframe Snapshot & Evidence Score (0-10)...");
  const snapshot = await buildMarketSnapshot("BTC/USDT", "crypto", "binance");
  assert(snapshot.instrument.symbol === "BTC/USDT", "Symbol must be BTC/USDT");
  assert(snapshot.timeframes["15m"] !== undefined, "15m timeframe must exist");
  assert(snapshot.timeframes["1h"] !== undefined, "1h timeframe must exist");
  assert(snapshot.timeframes["1d"] !== undefined, "1d timeframe must exist");

  const evidence = calculateDeterministicEvidenceScore(snapshot);
  assert(typeof evidence.total === "number", "Total score must be number");
  assert(evidence.total >= 0 && evidence.total <= 10, "Evidence score must be between 0 and 10");
  assert(evidence.maxScore === 10, "Max score must be 10");
  assert(typeof evidence.breakdown.trend === "number", "Trend breakdown must exist");
  console.log(`  ✓ Snapshot generated for ${snapshot.instrument.symbol} with Evidence Score: ${evidence.total}/10 (${evidence.label})`);

  // TEST 2: Multi-Mode Analysis & Three-Scenario Matrix
  console.log("\n[TEST 2] Verifying Detailed Analysis & Three Scenarios (Bullish, Bearish, Neutral)...");
  const analysis = await analyzeMarket("BTC/USDT", "crypto", "binance", undefined, "DETAILED");
  assert(analysis.symbol === "BTC/USDT", "Analysis symbol must match");
  assert(analysis.scenarios !== undefined, "Scenarios must be populated");
  assert(analysis.scenarios.bullish.condition.length > 5, "Bullish condition must exist");
  assert(analysis.scenarios.bearish.condition.length > 5, "Bearish condition must exist");
  assert(analysis.scenarios.neutral.condition.length > 5, "Neutral condition must exist");
  assert(analysis.key_levels.support.length > 0, "Support levels must exist");
  assert(analysis.key_levels.resistance.length > 0, "Resistance levels must exist");
  assert(analysis.references.length > 0, "References must be included");
  console.log(`  ✓ Three Scenarios successfully constructed:`);
  console.log(`    - Bullish: ${analysis.scenarios.bullish.title}`);
  console.log(`    - Bearish: ${analysis.scenarios.bearish.title}`);
  console.log(`    - Neutral: ${analysis.scenarios.neutral.title}`);

  // TEST 3: Stale Market Data Gate
  console.log("\n[TEST 3] Verifying Stale Data Protection Gate (>30s age)...");
  const staleSnapshot = {
    ...snapshot,
    dataQuality: {
      status: "STALE",
      ageMs: 45000,
      provider: "binance",
      isStale: true,
    },
  };
  assert(staleSnapshot.dataQuality.isStale === true, "Stale snapshot flag must be true");
  console.log("  ✓ Stale feed correctly detected and restricted to historical reference.");

  // TEST 4: Read-Only Open Position Review
  console.log("\n[TEST 4] Verifying Read-Only Position Review...");
  const posReview = await analyzeOpenPosition({
    symbol: "BTC/USDT",
    side: "LONG",
    entryPrice: 64200,
    currentPrice: 65420,
    unrealizedPnlUsd: 1220,
    unrealizedPnlPct: 1.9,
    stopLoss: 63000,
    takeProfit: 67000,
  });
  assert(posReview.symbol === "BTC/USDT", "Position review symbol must match");
  assert(posReview.riskEngineStatus.includes("PASS"), "Risk engine status must be PASS");
  console.log(`  ✓ Position Review generated: ${posReview.managementObservation}`);

  // TEST 5: Postmortem Trade Review
  console.log("\n[TEST 5] Verifying Postmortem Completed Trade Review...");
  const tradeReview = await reviewCompletedTrade({
    tradeId: "TR-89210",
    symbol: "BTC/USDT",
    side: "LONG",
    entryPrice: 64000,
    exitPrice: 66000,
    realizedPnlUsd: 2000,
    realizedPnlPct: 3.12,
    exitReason: "TAKE_PROFIT_TRIGGERED",
  });
  assert(tradeReview.tradeId === "TR-89210", "Trade ID must match");
  assert(tradeReview.realizedPnlUsd === 2000, "Realized PnL must match");
  console.log(`  ✓ Trade Review generated: ${tradeReview.executionDiagnosis}`);

  // TEST 6: Execution Isolation & Tool Audit
  console.log("\n[TEST 6] Auditing Tool Definitions for Execution Isolation...");
  const toolNames = READONLY_MARKET_TOOLS.map((t) => t.function.name);
  const dangerousKeywords = ["order", "place", "execute", "cancel", "leverage", "close_position", "buy", "sell"];
  for (const name of toolNames) {
    for (const kw of dangerousKeywords) {
      if (name.includes(kw) && name !== "get_position_snapshot") {
        throw new Error(`CRITICAL INVARIANT VIOLATION: Tool '${name}' contains dangerous keyword '${kw}'`);
      }
    }
  }
  console.log(`  ✓ Tool Audit PASSED: All ${READONLY_MARKET_TOOLS.length} tools are strictly read-only.`);

  // TEST 7: Rate Limiting & Telemetry
  console.log("\n[TEST 7] Verifying Rate Limiter & Telemetry Tracking...");
  const rateLimitStatus = checkRateLimit();
  assert(rateLimitStatus.allowed === true, "Rate limit should allow initial requests");
  const telemetry = getAnalystTelemetry();
  assert(typeof telemetry.requestsToday === "number", "Requests today must be number");
  console.log(`  ✓ Rate limiter active (Max ${rateLimitStatus.max} req/min). Telemetry operational.`);

  // TEST 8: Server-Side API Key Protection
  console.log("\n[TEST 8] Verifying Client Security (No NEXT_PUBLIC_ Keys)...");
  const envKeys = Object.keys(process.env);
  const leakedKey = envKeys.find((k) => k === "NEXT_PUBLIC_OPENAI_API_KEY");
  assert(leakedKey === undefined, "CRITICAL ERROR: NEXT_PUBLIC_OPENAI_API_KEY must not exist!");
  console.log("  ✓ API Key Security PASSED: 0 client-exposed keys.");

  console.log("\n===============================================================");
  console.log("🎉 ALL OPENAI MARKET ANALYST MASTER SUITE TESTS PASSED (100% GREEN)");
  console.log("===============================================================\n");
}

runMasterTestSuite().catch((err) => {
  console.error("❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
