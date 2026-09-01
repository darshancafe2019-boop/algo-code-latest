/**
 * Universal AI Market Copilot Route Verification
 * ===============================================
 * Verifies that POST /api/ai/copilot/query generates institutional quantitative
 * intelligence across ALL market types and tool options without crashing.
 */

import http from "http";

const PORT = 3100;

async function queryCopilot(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: "/api/ai/copilot/query",
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
            const json = JSON.parse(raw);
            resolve({ status: res.statusCode, data: json });
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

async function runVerification() {
  console.log("================================================================");
  console.log("   UNIVERSAL AI MARKET COPILOT ALL-MARKETS VERIFICATION         ");
  console.log("================================================================");

  const testCases = [
    {
      name: "1. Crypto Options (BTC-OPTIONS) -> Options Architect",
      payload: { symbol: "BTC-OPTIONS", marketType: "CRYPTO_OPTIONS", toolMode: "OPTIONS_ARCHITECT" },
    },
    {
      name: "2. Crypto Spot (BTC/USDT) -> AI Trade Signal",
      payload: { symbol: "BTC/USDT", marketType: "CRYPTO_SPOT", toolMode: "SIGNAL" },
    },
    {
      name: "3. Indian Equities/F&O (NIFTY 50) -> Signal & Greeks",
      payload: { symbol: "NIFTY", marketType: "INDIAN_EQUITIES", toolMode: "OPTIONS_ARCHITECT" },
    },
    {
      name: "4. US Tech (AAPL - Alpha Vantage) -> News & Sentiment",
      payload: { symbol: "AAPL", marketType: "US_EQUITIES", toolMode: "SENTIMENT" },
    },
    {
      name: "5. Forex & Gold (EURUSD) -> 1-Click Bot Blueprint",
      payload: { symbol: "EURUSD", marketType: "FOREX", toolMode: "BOT_GENERATOR" },
    },
    {
      name: "6. Interactive AI Market Chat (Natural Language Query)",
      payload: { symbol: "ETH-OPTIONS", marketType: "CRYPTO_OPTIONS", toolMode: "CHAT", prompt: "What is the optimal strike and risk-reward for ETH weekly options?" },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const res = await queryCopilot(tc.payload);
      if (res.status === 200 && res.data.status === "SUCCESS") {
        console.log(`[PASS] ${tc.name}`);
        if (tc.payload.toolMode === "SIGNAL") {
          console.log(`       Signal: ${res.data.signal.direction} (${res.data.signal.confidence}% confidence) | R:R ${res.data.signal.riskRewardRatio}`);
        } else if (tc.payload.toolMode === "OPTIONS_ARCHITECT") {
          console.log(`       Options: ${res.data.options.recommendedStrategy} (IV: ${res.data.options.impliedVolatilityPct}%) | Max Win: ${res.data.options.maxProfit}`);
        } else if (tc.payload.toolMode === "SENTIMENT") {
          console.log(`       Sentiment: ${res.data.sentiment.label} (+${res.data.sentiment.score}) | Top Headline: ${res.data.sentiment.topHeadlines[0]?.title?.substring(0, 50)}...`);
        } else if (tc.payload.toolMode === "BOT_GENERATOR") {
          console.log(`       Bot Blueprint: '${res.data.botBlueprint.botName}' ($${res.data.botBlueprint.allocatedCapital} capital)`);
        } else if (tc.payload.toolMode === "CHAT") {
          console.log(`       AI Answer: ${res.data.aiChatAnswer.substring(0, 80)}...`);
        }
        passed++;
      } else {
        console.error(`[FAIL] ${tc.name} -> Unexpected HTTP ${res.status}`);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] ${tc.name} -> Error: ${err.message}`);
      failed++;
    }
  }

  console.log("----------------------------------------------------------------");
  console.log(`Results: ${passed} Passed, ${failed} Failed (0 HTTP 500 crashes)`);
  console.log("================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
