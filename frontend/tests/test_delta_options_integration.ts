/**
 * Delta Exchange Options Integration Test Suite
 * Tests REST endpoints, Expiry discovery, Contract resolution, and Schema validation.
 */

import http from "http";

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`JSON parse error on ${url}: ${e}`));
          }
        });
      })
      .on("error", (err) => reject(err));
  });
}

async function runIntegrationTests() {
  console.log("==================================================================");
  console.log("          DELTA OPTIONS INTEGRATION TEST SUITE                    ");
  console.log("==================================================================\n");

  const baseUrl = "http://localhost:5050";
  let passed = 0;
  let failed = 0;

  function assertTest(name: string, condition: boolean, details: string = "") {
    if (condition) {
      console.log(`[✅ PASS] ${name} ${details ? "-> " + details : ""}`);
      passed++;
    } else {
      console.log(`[❌ FAIL] ${name} ${details ? "-> " + details : ""}`);
      failed++;
    }
  }

  try {
    // 1. Health Endpoint
    const health = await fetchJson(`${baseUrl}/api/delta/options/health`);
    assertTest("GET /api/delta/options/health", health.status === "HEALTHY", `Status: ${health.status}`);

    // 2. Expiries Endpoint
    const expiriesRes = await fetchJson(`${baseUrl}/api/delta/options/expiries?underlying=BTC`);
    const expList = expiriesRes.expiries || [];
    assertTest("GET /api/delta/options/expiries", expList.length > 0, `Active Expiries Count: ${expList.length}`);

    const nearest = expiriesRes.nearest_expiry || expList[0]?.expiry_date;
    assertTest("Nearest Future Expiry Populated", Boolean(nearest), `Selected: ${nearest}`);

    // 3. Contracts Endpoint
    const contractsRes = await fetchJson(`${baseUrl}/api/delta/options/contracts?underlying=BTC&expiry=${nearest}`);
    const contractList = contractsRes.contracts || [];
    assertTest("GET /api/delta/options/contracts", contractList.length > 0, `Contracts Listed: ${contractList.length}`);

    // 4. Option Chain Snapshot Endpoint
    const chainRes = await fetchJson(`${baseUrl}/api/delta/options/chain?underlying=BTC&expiry=${nearest}`);
    const strikes = chainRes.strikes || [];
    assertTest(
      "GET /api/delta/options/chain",
      strikes.length > 0 && chainRes.spot_price > 0,
      `Strikes Ladder: ${strikes.length} rows, Spot: $${chainRes.spot_price}`
    );

    // 5. Schema Validation: No fake PCR, proper null handling
    const pcr = chainRes.pcr;
    const isPcrValid = pcr === null || pcr?.pcr_oi === null || typeof pcr?.pcr_oi === "number";
    assertTest("PCR Schema Strict Null / Numeric", isPcrValid, `PCR: ${JSON.stringify(pcr)}`);

    const maxPain = chainRes.max_pain;
    const isMaxPainValid = maxPain === null || typeof maxPain === "number";
    assertTest("Max Pain Schema Strict Null / Numeric", isMaxPainValid, `Max Pain: ${maxPain}`);

  } catch (err: any) {
    console.error("Integration test error:", err.message);
    failed++;
  }

  console.log("\n------------------------------------------------------------------");
  console.log(`INTEGRATION TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("------------------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationTests();
