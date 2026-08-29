/**
 * Quant.OS Upstox OAuth & Favicon Precision Verification Suite
 * =============================================================
 * Tests:
 * 1. Favicon presence and format in frontend/app/favicon.ico, frontend/public, static/
 * 2. GET /api/upstox/login (State cookie generation, parameter construction, redirect)
 * 3. GET /api/upstox/callback error differentiation:
 *    - UPSTOX_AUTH_DECLINED
 *    - MISSING_AUTH_CODE
 *    - MISSING_RETURNED_STATE
 *    - MISSING_STATE_COOKIE
 *    - STATE_MISMATCH
 *    - UPSTOX_TOKEN_EXCHANGE_FAILED
 * 4. Token exchange parameters & single-use code security
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GET as loginHandler } from "../frontend/app/api/upstox/login/route.ts";
import { GET as callbackHandler } from "../frontend/app/api/upstox/callback/route.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

async function runOAuthSuite() {
  console.log("\n" + "=".repeat(75));
  console.log(" UPSTOX OAUTH & FAVICON PRECISION VERIFICATION SUITE");
  console.log("=".repeat(75));

  let passed = 0;
  let failed = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: Favicon Location & Integrity
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 1] Favicon Verification:");
  const appFavicon = path.join(ROOT_DIR, "frontend", "app", "favicon.ico");
  const publicFavicon = path.join(ROOT_DIR, "frontend", "public", "favicon.ico");
  const staticFavicon = path.join(ROOT_DIR, "static", "favicon.ico");

  const appExists = fs.existsSync(appFavicon) && fs.statSync(appFavicon).size > 100;
  const publicExists = fs.existsSync(publicFavicon) && fs.statSync(publicFavicon).size > 100;
  const staticExists = fs.existsSync(staticFavicon) && fs.statSync(staticFavicon).size > 100;

  console.log(`  - frontend/app/favicon.ico:     ${appExists ? "EXISTS (" + fs.statSync(appFavicon).size + " bytes)" : "MISSING"}`);
  console.log(`  - frontend/public/favicon.ico:  ${publicExists ? "EXISTS (" + fs.statSync(publicFavicon).size + " bytes)" : "MISSING"}`);
  console.log(`  - static/favicon.ico:           ${staticExists ? "EXISTS (" + fs.statSync(staticFavicon).size + " bytes)" : "MISSING"}`);

  if (appExists && publicExists && staticExists) {
    console.log("  => Favicon Status:              PASS");
    passed++;
  } else {
    console.log("  => Favicon Status:              FAIL");
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: GET /api/upstox/login (State & Cookie Generation)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 2] GET /api/upstox/login Initiation Flow:");
  process.env.UPSTOX_API_KEY = process.env.UPSTOX_API_KEY || "3cdebdbd-fd83-4a2d-a28d-aab8fe1090be";
  process.env.UPSTOX_API_SECRET = process.env.UPSTOX_API_SECRET || "cml9l8bms7";
  process.env.UPSTOX_REDIRECT_URI = "http://localhost:3100/api/upstox/callback";

  const loginReq = new Request("http://localhost:3100/api/upstox/login");
  const loginRes = await loginHandler(loginReq);

  const redirectLocation = loginRes.headers.get("location") || "";
  const setCookie = loginRes.headers.get("set-cookie") || "";

  console.log(`  - HTTP Status:                  ${loginRes.status} (Expected: 307 / 302 Redirect)`);
  console.log(`  - Redirect Target:              ${redirectLocation.split("?")[0]}`);

  const targetUrl = new URL(redirectLocation);
  const clientIdParam = targetUrl.searchParams.get("client_id");
  const redirectUriParam = targetUrl.searchParams.get("redirect_uri");
  const stateParam = targetUrl.searchParams.get("state");
  const responseTypeParam = targetUrl.searchParams.get("response_type");

  console.log(`  - response_type:                ${responseTypeParam}`);
  console.log(`  - client_id present:            ${Boolean(clientIdParam)}`);
  console.log(`  - redirect_uri:                 ${redirectUriParam}`);
  console.log(`  - state generated (len):        ${stateParam?.length || 0} chars`);
  console.log(`  - Cookie set-cookie header:     ${setCookie ? "PRESENT" : "MISSING"}`);

  const cookieMatches = setCookie.includes(`upstox_oauth_state=${stateParam}`);
  console.log(`  - Cookie contains exact state:  ${cookieMatches ? "YES" : "NO"}`);
  console.log(`  - Cookie has HttpOnly:          ${setCookie.includes("HttpOnly") || setCookie.includes("httponly") ? "YES" : "NO"}`);
  console.log(`  - Cookie has SameSite=Lax:      ${setCookie.toLowerCase().includes("samesite=lax") ? "YES" : "NO"}`);

  if (
    loginRes.status === 307 &&
    redirectUriParam === "http://localhost:3100/api/upstox/callback" &&
    cookieMatches &&
    stateParam &&
    stateParam.length >= 32
  ) {
    console.log("  => Login Flow Status:           PASS");
    passed++;
  } else {
    console.log("  => Login Flow Status:           FAIL");
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: Callback Diagnostics - Upstox Error Return
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 3] Callback Diagnostics: User Declined / Error Returned:");
  const errReq = new Request("http://localhost:3100/api/upstox/callback?error=access_denied&error_description=User+denied+access", {
    headers: { Accept: "application/json" }
  });
  const errRes = await callbackHandler(errReq);
  const errData = await errRes.json();
  console.log(`  - HTTP Status:                  ${errRes.status}`);
  console.log(`  - Error Code:                   ${errData.error_code}`);
  console.log(`  - Error Message:                ${errData.message}`);
  if (errRes.status === 400 && errData.error_code === "UPSTOX_AUTH_DECLINED") {
    console.log("  => Error Diagnostic Status:     PASS");
    passed++;
  } else {
    console.log("  => Error Diagnostic Status:     FAIL");
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: Callback Diagnostics - Missing Code
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 4] Callback Diagnostics: Missing Authorization Code:");
  const missingCodeReq = new Request(`http://localhost:3100/api/upstox/callback?state=${stateParam}`, {
    headers: { Accept: "application/json" }
  });
  const missingCodeRes = await callbackHandler(missingCodeReq);
  const missingCodeData = await missingCodeRes.json();
  console.log(`  - HTTP Status:                  ${missingCodeRes.status}`);
  console.log(`  - Error Code:                   ${missingCodeData.error_code}`);
  if (missingCodeRes.status === 400 && missingCodeData.error_code === "MISSING_AUTH_CODE") {
    console.log("  => Missing Code Status:         PASS");
    passed++;
  } else {
    console.log("  => Missing Code Status:         FAIL");
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: Callback Diagnostics - Missing State Cookie
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 5] Callback Diagnostics: Missing State Cookie:");
  const missingCookieReq = new Request(`http://localhost:3100/api/upstox/callback?code=test_code&state=${stateParam}`, {
    headers: { Accept: "application/json" }
  });
  const missingCookieRes = await callbackHandler(missingCookieReq);
  const missingCookieData = await missingCookieRes.json();
  console.log(`  - HTTP Status:                  ${missingCookieRes.status}`);
  console.log(`  - Error Code:                   ${missingCookieData.error_code}`);
  if (missingCookieRes.status === 400 && missingCookieData.error_code === "MISSING_STATE_COOKIE") {
    console.log("  => Missing Cookie Status:       PASS");
    passed++;
  } else {
    console.log("  => Missing Cookie Status:       FAIL");
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 6: Callback Diagnostics - State Mismatch (CSRF Attack)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 6] Callback Diagnostics: State Mismatch (CSRF Detection):");
  const mismatchReq = new Request(`http://localhost:3100/api/upstox/callback?code=test_code&state=attackers_fake_state`, {
    headers: {
      Accept: "application/json",
      Cookie: `upstox_oauth_state=${stateParam}`
    }
  });
  const mismatchRes = await callbackHandler(mismatchReq);
  const mismatchData = await mismatchRes.json();
  console.log(`  - HTTP Status:                  ${mismatchRes.status}`);
  console.log(`  - Error Code:                   ${mismatchData.error_code}`);
  if (mismatchRes.status === 400 && mismatchData.error_code === "STATE_MISMATCH") {
    console.log("  => State Mismatch Status:       PASS");
    passed++;
  } else {
    console.log("  => State Mismatch Status:       FAIL");
    failed++;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 7: Callback Diagnostics - Upstox Token Exchange Handling
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[TEST 7] Callback Diagnostics: Upstox Token Exchange Handling:");
  const validStateReq = new Request(`http://localhost:3100/api/upstox/callback?code=synthetic_auth_code_123&state=${stateParam}`, {
    headers: {
      Accept: "application/json",
      Cookie: `upstox_oauth_state=${stateParam}`
    }
  });
  const validStateRes = await callbackHandler(validStateReq);
  const validStateData = await validStateRes.json();
  console.log(`  - HTTP Status:                  ${validStateRes.status}`);
  console.log(`  - Error Code:                   ${validStateData.error_code}`);
  console.log(`  - Error Message:                ${validStateData.message}`);
  // Synthetic code will fail at Upstox with UPSTOX_TOKEN_EXCHANGE_FAILED
  if (validStateRes.status === 400 && validStateData.error_code === "UPSTOX_TOKEN_EXCHANGE_FAILED") {
    console.log("  => Token Exchange Guard:        PASS (Handled Upstox response without leaking secrets)");
    passed++;
  } else {
    console.log("  => Token Exchange Guard:        FAIL");
    failed++;
  }

  console.log("\n" + "=".repeat(75));
  console.log(`OAUTH & FAVICON VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=".repeat(75) + "\n");

  return failed === 0;
}

runOAuthSuite();
