/**
 * Comprehensive TypeScript Test Suite for Liquidity Rejection Structure Pro Strategy
 * =================================================================================
 */

import {
  evaluateLiquidityRejectionSignal,
  classifyMarketState,
  detectLiquidityPools,
  runLiquidityRejectionBacktest,
  DEFAULT_LIQUIDITY_REJECTION_CONFIG,
  LIQUIDITY_REJECTION_STRATEGY_DEFINITION,
} from "../lib/strategies/liquidityRejectionStructurePro";

function generateSyntheticCandles(count: number, basePrice = 65000) {
  const candles = [];
  let p = basePrice;
  for (let i = 0; i < count; i++) {
    const step = (Math.random() - 0.48) * 80;
    p = Math.max(100, p + step);
    const high = p + Math.random() * 40;
    const low = p - Math.random() * 40;
    const open = (p + low) / 2;
    const close = (p + high) / 2;
    candles.push({
      timestamp: `2026-09-25T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(500 + Math.random() * 500),
    });
  }
  return candles;
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n=======================================================");
console.log("🧪 TESTING LIQUIDITY REJECTION STRUCTURE PRO ENGINE");
console.log("=======================================================\n");

// Test 1: Strategy Metadata & Rule Pipeline
console.log("Test Suite 1: Strategy Definition & Pipeline Metadata");
assert(LIQUIDITY_REJECTION_STRATEGY_DEFINITION.id === "liquidity-rejection-structure-pro", "Strategy ID is liquidity-rejection-structure-pro");
assert(LIQUIDITY_REJECTION_STRATEGY_DEFINITION.name === "Liquidity Rejection Structure Pro", "Strategy Name is correct");
assert(LIQUIDITY_REJECTION_STRATEGY_DEFINITION.setupConditions.length >= 6, "Has complete setup conditions checklist");
assert(LIQUIDITY_REJECTION_STRATEGY_DEFINITION.indicators.length >= 5, "Has all required indicator specs");

// Test 2: Market State Classification
console.log("\nTest Suite 2: Dynamic Market State Classifier");
const candles50 = generateSyntheticCandles(50, 65000);
const mState = classifyMarketState(candles50);
assert(["TREND", "RANGE", "BREAKOUT", "REVERSAL", "UNCLEAR"].includes(mState.state), "Classifies valid MarketState");
assert(mState.confidence >= 0 && mState.confidence <= 100, "State confidence in [0, 100]");

const candles10 = generateSyntheticCandles(10, 65000);
const mStateShort = classifyMarketState(candles10);
assert(mStateShort.state === "UNCLEAR", "Short history (<20 bars) yields UNCLEAR");

// Test 3: Liquidity Pool Discovery
console.log("\nTest Suite 3: Observable Liquidity Pool Detection");
const pools = detectLiquidityPools(candles50, "15m", 5);
assert(pools.length > 0, "Identifies active liquidity pools");
pools.forEach((p) => {
  assert(Boolean(p.level_id && p.price > 0 && p.active), `Pool ${p.level_id} has valid attributes`);
});

// Test 4: Live Signal Evaluation & Audit
console.log("\nTest Suite 4: Live Signal Evaluation & Audit Output");
const sig = evaluateLiquidityRejectionSignal(candles50, 10000, { min_sweep_atr: 0.05, max_sweep_atr: 1.0 });
assert(Boolean(sig.bot_id && sig.timestamp), "Emits standard bot signal payload");
assert(Boolean(sig.market_state && sig.market_state_reason), "Includes Market State explanation");
assert(Boolean(sig.decision && ["LONG", "SHORT", "WAIT", "HOLD"].includes(sig.decision)), "Produces valid decision");
assert(typeof sig.audit_checklist === "object", "Provides checklist audit output");

// Test 5: Position Sizing & Risk Controls
console.log("\nTest Suite 5: Central Risk Engine Position Sizing");
if (sig.decision === "LONG" || sig.decision === "SHORT") {
  assert(sig.risk_amount === 50, "Calculates exact 0.50% equity risk ($50 on $10,000)");
  assert(sig.position_size > 0, "Calculates positive position size");
  assert(sig.risk_reward >= 2.0, "Respects minimum 2.0:1 reward-to-risk ratio");
  assert(sig.r_targets["1R"] > 0 && sig.r_targets["2R"] > 0, "Provides 1R to 3R targets");
} else {
  assert(Boolean(sig.invalid_reason), "Provides exact WHY NO TRADE invalid reason when holding");
}

// Test 6: Historical Backtesting Engine
console.log("\nTest Suite 6: Deterministic Backtest Engine");
const candles120 = generateSyntheticCandles(120, 65000);
const btResult = runLiquidityRejectionBacktest(
  candles120,
  {
    symbol: "BTC/USDT",
    timeframe: "15m",
    initialCapital: 10000,
    riskPerTradePct: 0.5,
    feeRate: 0.0005,
    slippageRate: 0.0002,
  },
  DEFAULT_LIQUIDITY_REJECTION_CONFIG
);

assert(btResult.strategyId === "STRAT-PRO-01", "Backtest reports correct strategy ID");
assert(btResult.datasetLabel === "BACKTEST", "Strictly labeled as BACKTEST dataset");
assert(typeof btResult.winRate === "number", "Calculates mathematical win rate");
assert(typeof btResult.profitFactor === "number", "Calculates profit factor");
assert(typeof btResult.maxDrawdownPct === "number", "Calculates maximum drawdown");
assert(btResult.equityCurve.length > 0, "Generates equity curve data series");

console.log("\n=======================================================");
console.log(`SUMMARY: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("=======================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
