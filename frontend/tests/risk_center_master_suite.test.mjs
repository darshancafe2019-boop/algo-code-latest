/**
 * Quant.OS Risk Center Master Test Suite
 * =====================================
 * Validates:
 * 1. Contradictory risk state invariants (No HALTED + canTrade=true).
 * 2. Strict 5-state safety precedence (EMERGENCY_HALT > UNAVAILABLE > BLOCKED > CAUTION > READY).
 * 3. Financial calculation correctness (Margin Utilization % vs Effective Leverage vs Gross Exposure).
 * 4. Capital conservation equation (Equity = Available + Margin Used).
 * 5. Daily drawdown buffer consistency.
 * 6. 14-point safety gate completeness.
 */

import assert from "node:assert/strict";
import {
  evaluateTradingPermission,
  assertRiskInvariants,
  deriveCanonicalRiskSnapshot,
  evaluateAllRiskGates,
  CANONICAL_RISK_GATES,
} from "../lib/risk/tradingPermission.ts";

console.log("===============================================================");
console.log("🚀 RUNNING MASTER RISK CENTER & TRADING PERMISSION SUITE");
console.log("===============================================================\n");

let passedTests = 0;

// -----------------------------------------------------------------------------
// [TEST 1] Contradictory State Invariants
// -----------------------------------------------------------------------------
console.log("[TEST 1] Verifying Contradictory State Invariant Protections...");
{
  // 1. EMERGENCY_HALT with canTrade=true must throw
  assert.throws(
    () => assertRiskInvariants("EMERGENCY_HALT", true, 0, true),
    /CRITICAL RISK INVARIANT VIOLATION/
  );

  // 2. BLOCKED with canTrade=true must throw
  assert.throws(
    () => assertRiskInvariants("BLOCKED", true, 1, false),
    /CRITICAL RISK INVARIANT VIOLATION/
  );

  // 3. UNAVAILABLE with canTrade=true must throw
  assert.throws(
    () => assertRiskInvariants("UNAVAILABLE", true, 0, false),
    /CRITICAL RISK INVARIANT VIOLATION/
  );

  // 4. Failed critical gates with canTrade=true must throw
  assert.throws(
    () => assertRiskInvariants("READY", true, 2, false),
    /CRITICAL RISK INVARIANT VIOLATION/
  );

  console.log("  ✓ Contradictory states (e.g. HALTED + canTrade=true) are impossible at runtime.");
  passedTests++;
}

// -----------------------------------------------------------------------------
// [TEST 2] Emergency Kill Switch Precedence
// -----------------------------------------------------------------------------
console.log("\n[TEST 2] Verifying Emergency Kill Switch Absolute Precedence...");
{
  const mockOverview = {
    account_balance: 10000.0,
    available_capital: 6800.0,
    margin_used: 3200.0,
    gross_exposure: 46210.0,
    daily_drawdown_pct: 1.0,
    kill_switch_active: true, // ENGAGED
    active_limits: {
      max_daily_loss_pct: 5.0,
      max_portfolio_risk_pct: 70.0,
    },
  };

  const permission = evaluateTradingPermission(mockOverview);
  assert.equal(permission.status, "EMERGENCY_HALT");
  assert.equal(permission.canTrade, false);
  assert.match(permission.primaryReason, /Kill Switch/i);
  assert.equal(permission.primaryBlocker?.id, "gate_kill_switch");

  console.log("  ✓ Kill Switch forces EMERGENCY_HALT and blocks all trading (canTrade=false).");
  passedTests++;
}

// -----------------------------------------------------------------------------
// [TEST 3] Critical Gate Failure (Margin Ceiling Exceeded)
// -----------------------------------------------------------------------------
console.log("\n[TEST 3] Verifying Critical Gate Failure (Margin Ceiling Exceeded)...");
{
  const mockOverview = {
    account_balance: 10000.0,
    available_capital: 1800.0,
    margin_used: 8200.0, // 82% margin utilization > 70% limit
    gross_exposure: 46210.0,
    daily_drawdown_pct: 1.0,
    kill_switch_active: false,
    active_limits: {
      max_daily_loss_pct: 5.0,
      max_portfolio_risk_pct: 70.0,
    },
  };

  const permission = evaluateTradingPermission(mockOverview);
  assert.equal(permission.status, "BLOCKED");
  assert.equal(permission.canTrade, false);
  assert.equal(permission.primaryBlocker?.id, "gate_margin_util");
  assert.match(permission.primaryReason, /Margin Utilization/i);

  console.log("  ✓ Exceeded Margin Ceiling immediately sets status=BLOCKED and canTrade=false.");
  passedTests++;
}

// -----------------------------------------------------------------------------
// [TEST 4] Critical Gate Failure (Daily Drawdown Exceeded)
// -----------------------------------------------------------------------------
console.log("\n[TEST 4] Verifying Critical Gate Failure (Daily Drawdown Exceeded)...");
{
  const mockOverview = {
    account_balance: 10000.0,
    available_capital: 6800.0,
    margin_used: 3200.0,
    gross_exposure: 46210.0,
    daily_drawdown_pct: 5.4, // Exceeds 5.0% limit
    kill_switch_active: false,
    active_limits: {
      max_daily_loss_pct: 5.0,
      max_portfolio_risk_pct: 70.0,
    },
  };

  const permission = evaluateTradingPermission(mockOverview);
  assert.equal(permission.status, "BLOCKED");
  assert.equal(permission.canTrade, false);
  assert.equal(permission.primaryBlocker?.id, "gate_daily_loss");

  console.log("  ✓ Daily Drawdown breach immediately engages lockout (BLOCKED, canTrade=false).");
  passedTests++;
}

// -----------------------------------------------------------------------------
// [TEST 5] Market Feed Stale / Broker Disconnect Precedence
// -----------------------------------------------------------------------------
console.log("\n[TEST 5] Verifying Market Feed / Broker Disconnect Precedence...");
{
  const mockOverview = {
    account_balance: 10000.0,
    available_capital: 6800.0,
    margin_used: 3200.0,
    gross_exposure: 46210.0,
    daily_drawdown_pct: 1.0,
    kill_switch_active: false,
  };

  const permission = evaluateTradingPermission(mockOverview, { isStaleFeed: true, dataAgeSeconds: 85 });
  assert.equal(permission.status, "UNAVAILABLE");
  assert.equal(permission.canTrade, false);
  assert.match(permission.primaryReason, /Market data/i);

  console.log("  ✓ Stale feed (>60s) safely transitions to UNAVAILABLE with canTrade=false.");
  passedTests++;
}

// -----------------------------------------------------------------------------
// [TEST 6] Cautionary Warning State
// -----------------------------------------------------------------------------
console.log("\n[TEST 6] Verifying Cautionary Warning State...");
{
  const mockOverview = {
    account_balance: 10000.0,
    available_capital: 6800.0,
    margin_used: 3200.0,
    gross_exposure: 46210.0,
    daily_drawdown_pct: 4.0, // 80% of 5.0% limit
    kill_switch_active: false,
    active_limits: {
      max_daily_loss_pct: 5.0,
      max_portfolio_risk_pct: 70.0,
    },
  };

  const permission = evaluateTradingPermission(mockOverview);
  assert.equal(permission.status, "CAUTION");
  assert.equal(permission.canTrade, true);
  assert.equal(permission.warnings.length > 0, true);

  console.log("  ✓ Elevated risk within buffer sets status=CAUTION with canTrade=true.");
  passedTests++;
}

// -----------------------------------------------------------------------------
// [TEST 7] Normal Operation (READY)
// -----------------------------------------------------------------------------
console.log("\n[TEST 7] Verifying Normal Operation (READY)...");
{
  const mockOverview = {
    account_balance: 10000.0,
    available_capital: 6800.0,
    margin_used: 3200.0,
    gross_exposure: 25000.0, // 50% of 50k max exposure cap
    daily_drawdown_pct: 1.8,
    kill_switch_active: false,
    active_limits: {
      max_daily_loss_pct: 5.0,
      max_portfolio_risk_pct: 70.0,
      max_leverage: 5.0,
    },
  };

  const permission = evaluateTradingPermission(mockOverview);
  assert.equal(permission.status, "READY");
  assert.equal(permission.canTrade, true);
  assert.equal(permission.passedCount, 14);
  assert.equal(permission.totalCount, 14);

  console.log("  ✓ 14/14 clear gates correctly authorizes trading with status=READY.");
  passedTests++;
}

// -----------------------------------------------------------------------------
// [TEST 8] Mathematical Precision: Margin Utilization vs Gross Exposure
// -----------------------------------------------------------------------------
console.log("\n[TEST 8] Auditing Financial & Mathematical Formulas...");
{
  const equity = 10000.0;
  const grossExposure = 46210.0;
  const marginUsed = 3200.0;

  const mockOverview = {
    account_balance: equity,
    available_capital: equity - marginUsed,
    margin_used: marginUsed,
    gross_exposure: grossExposure,
    daily_drawdown_pct: 1.8,
    active_limits: { max_leverage: 5.0, max_portfolio_risk_pct: 70.0 },
  };

  const snapshot = deriveCanonicalRiskSnapshot(mockOverview);

  // 1. Margin Utilization % MUST be (3,200 / 10,000) * 100 = 32.0%, NEVER 462.1%
  assert.equal(snapshot.margin.marginUtilizationPct, 32.0);
  assert.notEqual(snapshot.margin.marginUtilizationPct, 462.1);

  // 2. Effective Leverage MUST be 46,210 / 10,000 = 4.62x
  assert.equal(snapshot.exposure.effectiveLeverage, 4.62);

  // 3. Capital Conservation: Equity = Available + Margin Used
  assert.equal(snapshot.capital.accountEquity, snapshot.capital.availableCash + snapshot.capital.marginUsed);

  // 4. Daily Loss Buffer: Remaining Buffer = Max Daily Loss - Daily Drawdown
  assert.equal(
    snapshot.dailyRisk.remainingBufferPct,
    Number((snapshot.dailyRisk.maxDailyLossPct - snapshot.dailyRisk.dailyDrawdownPct).toFixed(1))
  );

  console.log("  ✓ Margin Utilization (32.0%) correctly distinguished from Effective Leverage (4.62x).");
  console.log("  ✓ Capital conservation equation verified ($10,000 = $6,800 + $3,200).");
  console.log("  ✓ Daily Loss remaining buffer verified (5.0% - 1.8% = 3.2%).");
  passedTests++;
}

// -----------------------------------------------------------------------------
// [TEST 9] 14 Canonical Institutional Gates Inventory
// -----------------------------------------------------------------------------
console.log("\n[TEST 9] Verifying 14 Institutional Gates Completeness...");
{
  assert.equal(CANONICAL_RISK_GATES.length, 14);
  const gates = evaluateAllRiskGates({ account_balance: 10000, margin_used: 3200 });
  assert.equal(gates.length, 14);

  const criticalGates = gates.filter((g) => g.isCritical);
  assert.equal(criticalGates.length >= 7, true);

  console.log(`  ✓ All ${gates.length} institutional risk gates present and typed.`);
  passedTests++;
}

console.log("\n===============================================================");
console.log(`🎉 ALL ${passedTests} RISK CENTER MASTER SUITE TESTS PASSED (100% GREEN)`);
console.log("===============================================================");
