const routes = [
  "/",
  "/favicon.ico",
  "/settings",
  "/settings/brokers",
  "/markets",
  "/options",
  "/crypto",
  "/dashboard",
  "/api/binance/status",
  "/api/upstox/status",
  "/api/health",
];

async function checkRoutes() {
  console.log("Testing live routes on http://localhost:3100:\n");
  for (const r of routes) {
    try {
      const res = await fetch(`http://localhost:3100${r}`, {
        signal: AbortSignal.timeout(8000),
      });
      console.log(`  ✓ http://localhost:3100${r.padEnd(25)} -> HTTP ${res.status}`);
      if (r === "/api/binance/status") {
        const binanceData = await res.json();
        console.log(`    - Binance Network:   ${binanceData.network}`);
        console.log(`    - Binance Connected: ${binanceData.connected}`);
        console.log(`    - Binance Ping:      ${binanceData.latencyMs}ms`);
        console.log(`    - Masked API Key:    ${binanceData.apiKeyMasked}`);
      }
    } catch (err) {
      console.log(`  ✗ http://localhost:3100${r.padEnd(25)} -> ERROR: ${err.message}`);
    }
  }

  // Also test POST /api/binance/ping
  try {
    const pingRes = await fetch("http://localhost:3100/api/binance/ping", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
    });
    const pingData = await pingRes.json();
    console.log(`\n  ✓ POST /api/binance/ping -> HTTP ${pingRes.status} (${pingData.latencyMs}ms, ${pingData.message})`);
  } catch (err) {
    console.log(`\n  ✗ POST /api/binance/ping -> ERROR: ${err.message}`);
  }
}

checkRoutes();
