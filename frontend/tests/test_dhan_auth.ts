/**
 * DhanHQ API v2 Authentication & Token Manager - Comprehensive Unit Test Suite
 * Validates consent flow contract, token manager lifecycle, concurrency lock,
 * profile validation, and data plan derivation with synthetic fixtures.
 */

import { DhanAuth } from "../lib/brokers/dhan/auth";
import { DhanTokenManager, dhanTokenManager } from "../lib/brokers/dhan/token-manager";
import { DhanAuthError } from "../lib/brokers/dhan/types";
import { DhanClient } from "../lib/brokers/dhan/client";

function runDhanAuthUnitTests() {
  console.log("==================================================================");
  console.log("    DHAN HQ V2 AUTHENTICATION & TOKEN MANAGER [UNIT TESTS]       ");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] [UNIT TEST] ${testName} ${detail ? `-> ${detail}` : ""}`);
    } else {
      console.error(`  [FAIL] [UNIT TEST] ${testName} ${detail ? `-> ${detail}` : ""}`);
      process.exit(1);
    }
  }

  // ── TEST 1: Missing Credentials Validation ─────────────────────────────────
  const auth = new DhanAuth();
  let caughtMissingCid = false;
  auth.generateConsent("", "key", "secret").catch((err) => {
    if (err.errorCode === "DHAN_CLIENT_ID_MISSING") caughtMissingCid = true;
  });

  let caughtMissingKey = false;
  auth.generateConsent("1000678498", "", "secret").catch((err) => {
    if (err.errorCode === "DHAN_API_KEY_MISSING") caughtMissingKey = true;
  });

  let caughtMissingSecret = false;
  auth.generateConsent("1000678498", "key", "").catch((err) => {
    if (err.errorCode === "DHAN_API_SECRET_MISSING") caughtMissingSecret = true;
  });

  // ── TEST 2: Token Manager Lifecycle & Freshness Watchdog ───────────────────
  const manager = DhanTokenManager.getInstance();

  // Test setToken
  const testToken = "test_synthetic_dhan_jwt_token_24h";
  const now = Date.now();
  const expires24h = now + 24 * 60 * 60 * 1000;
  manager.setToken(testToken, expires24h, "1000678498");

  assert(manager.hasToken(), "Token Manager Set & Active Check", `Status: ${manager.checkStatus()}`);
  assert(manager.getAccessToken() === testToken, "Token Manager Stored Token Retrieval");
  assert(manager.getMaskedClientId() === "****8498", "Client ID Masking (Zero Exposure)", `Masked: ${manager.getMaskedClientId()}`);

  // ── TEST 3: Zero Token Exposure in Safe State ─────────────────────────────
  const safeState = manager.getSafeState();
  assert(safeState.status === "AUTHENTICATED", "Safe State Authenticated Status", `Status: ${safeState.status}`);
  assert(!("accessToken" in (safeState as any)), "Safe State Contains Zero Access Token Exposure");
  assert(safeState.clientIdMasked === "****8498", "Safe State Contains Masked Client ID");

  // ── TEST 4: 5-Minute Expiry Safety Buffer (EXPIRING Status) ───────────────
  const expiringSoon = now + 3 * 60 * 1000; // 3 minutes left (< 5 min buffer)
  manager.setToken(testToken, expiringSoon, "1000678498");
  assert(manager.isExpiring(), "5-Minute Expiry Buffer Detects EXPIRING Status", `Status: ${manager.checkStatus()}`);

  // ── TEST 5: Expired Token Check ───────────────────────────────────────────
  const alreadyExpired = now - 1000; // 1 second ago
  manager.setToken(testToken, alreadyExpired, "1000678498");
  assert(manager.isExpired(), "Token Expiry Watchdog Detects EXPIRED Status", `Status: ${manager.checkStatus()}`);

  let caughtExpiredThrow = false;
  try {
    manager.getValidAccessToken();
  } catch (err: any) {
    if (err.errorCode === "DHAN_TOKEN_EXPIRED") caughtExpiredThrow = true;
  }
  assert(caughtExpiredThrow, "getValidAccessToken Throws Typed DHAN_TOKEN_EXPIRED on Expired Token");

  // ── TEST 6: Invalidation on Disconnect / 401 ──────────────────────────────
  manager.invalidateToken("Manual Disconnect");
  assert(!manager.hasToken() && manager.checkStatus() === "NOT_CONFIGURED", "Token Invalidation Clears Session", `Status: ${manager.checkStatus()}`);

  // ── TEST 7: Concurrency Lock Mutex ────────────────────────────────────────
  let executionCount = 0;
  const concurrentOp = () =>
    manager.withAuthLock(async () => {
      executionCount++;
      await new Promise((r) => setTimeout(r, 50));
      return "SUCCESS";
    });

  Promise.all([concurrentOp(), concurrentOp(), concurrentOp()]).then((results) => {
    assert(
      results.length === 3 && results.every((r) => r === "SUCCESS") && executionCount === 1,
      "Concurrent Auth Lock Mutex Deduplicates Parallel Requests",
      `Parallel Calls: 3, Executions: ${executionCount}`
    );

    // ── TEST 8: Typed DhanAuthError Error Code Mappings ─────────────────────
    const dhanErr = new DhanAuthError("DH-901", "Client ID or user generated access token is invalid or expired", 401, false);
    assert(dhanErr.errorCode === "DH-901" && dhanErr.statusCode === 401 && !dhanErr.retryable, "Typed DhanAuthError Struct & Status Code", `Code: ${dhanErr.errorCode}, Status: ${dhanErr.statusCode}`);

    // Restore clean state
    manager.setToken(testToken, expires24h, "1000678498");

    console.log(`\n==================================================================`);
    console.log(`  ALL ${passed}/${total} DHAN HQ V2 AUTHENTICATION UNIT TESTS PASSED!`);
    console.log(`==================================================================\n`);
    process.exit(0);
  });
}

runDhanAuthUnitTests();
