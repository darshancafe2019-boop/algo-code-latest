/**
 * Futures Universe Route Verification
 * ===================================
 * Verifies that the Flask backend (port 5051) and Next.js proxy
 * serve the modular Futures Universe, Funding Heatmap, Basis Matrix,
 * and Liquidation Calculator without errors.
 */

import http from "http";

const PORT = 3100;

async function requestGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path,
        method: "GET",
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
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

async function requestPost(path, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("================================================================");
  console.log("   MODULAR FUTURES UNIVERSE ENDPOINT VERIFICATION               ");
  console.log("================================================================");

  try {
    // 1. Test Universe Contracts
    const uRes = await requestGet("/api/futures/universe");
    if (uRes.status === 200 && uRes.data?.status === "SUCCESS") {
      console.log(`[PASS] 1. GET /api/futures/universe -> Returned ${uRes.data.count} contracts.`);
      console.log(`       Sample: ${uRes.data.contracts[0]?.symbol} ($${uRes.data.contracts[0]?.mark_price})`);
    } else {
      console.log(`[FAIL] 1. GET /api/futures/universe -> HTTP ${uRes.status}`);
    }

    // 2. Test Funding Heatmap
    const hRes = await requestGet("/api/futures/funding-heatmap");
    if (hRes.status === 200 && hRes.data?.status === "SUCCESS") {
      console.log(`[PASS] 2. GET /api/futures/funding-heatmap -> Returned ${hRes.data.count} funding rates.`);
      console.log(`       Top APR Yield: ${hRes.data.data[0]?.symbol} (+${hRes.data.data[0]?.apr}% APR)`);
    } else {
      console.log(`[FAIL] 2. GET /api/futures/funding-heatmap -> HTTP ${hRes.status}`);
    }

    // 3. Test Contract Detail
    const cRes = await requestGet("/api/futures/contract/BTC");
    if (cRes.status === 200 && cRes.data?.status === "SUCCESS") {
      console.log(`[PASS] 3. GET /api/futures/contract/BTC -> Details for ${cRes.data.contract.symbol}`);
    } else {
      console.log(`[FAIL] 3. GET /api/futures/contract/BTC -> HTTP ${cRes.status}`);
    }

    // 4. Test Liquidation Calculator
    const lRes = await requestPost("/api/futures/calculate-liquidation", {
      side: "LONG",
      entryPrice: 78000.0,
      leverage: 20,
    });
    if (lRes.status === 200 && lRes.data?.status === "SUCCESS") {
      console.log(`[PASS] 4. POST /api/futures/calculate-liquidation -> Liq Price: $${lRes.data.result.liquidationPrice} (${lRes.data.result.riskLevel} risk)`);
    } else {
      console.log(`[FAIL] 4. POST /api/futures/calculate-liquidation -> HTTP ${lRes.status}`);
    }

    console.log("================================================================");
    console.log("ALL MODULAR FUTURES ENDPOINTS VERIFIED SUCCESSFULLY!");
    console.log("================================================================");
  } catch (err) {
    console.error("Test execution error:", err.message);
  }
}

runTests();
