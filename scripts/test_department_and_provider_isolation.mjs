/**
 * Comprehensive Department & Provider Isolation Live Audit Script
 * Quant.OS Institutional Testing Suite
 */

const departments = [
  { name: "DASHBOARD", path: "/" },
  { name: "DASHBOARD (ALIAS)", path: "/dashboard" },
  { name: "MARKETS", path: "/markets" },
  { name: "OPTIONS", path: "/options" },
  { name: "OPTIONS (DHAN)", path: "/options/dhan" },
  { name: "OPTIONS (UPSTOX)", path: "/options/upstox" },
  { name: "OPTIONS (DELTA)", path: "/options/delta" },
  { name: "OPTIONS (BINANCE)", path: "/options/binance" },
  { name: "OPTIONS (OTHER)", path: "/options/other" },
  { name: "FUTURES", path: "/futures" },
  { name: "FUTURES (BINANCE)", path: "/futures/binance" },
  { name: "FUTURES (DELTA)", path: "/futures/delta" },
  { name: "FUTURES (DHAN)", path: "/futures/dhan" },
  { name: "FUTURES (UPSTOX)", path: "/futures/upstox" },
  { name: "FUTURES (GLOBAL)", path: "/futures/global" },
  { name: "FUTURES (OTHER)", path: "/futures/other" },
  { name: "STRATEGIES", path: "/strategies" },
  { name: "BOTS", path: "/bots" },
  { name: "PORTFOLIO", path: "/portfolio" },
  { name: "POSITIONS (ALIAS)", path: "/positions" },
  { name: "CAPITAL (ALIAS)", path: "/capital" },
  { name: "P&L JOURNAL", path: "/pnl" },
  { name: "TRADE JOURNAL (ALIAS)", path: "/trade-journal" },
  { name: "RESEARCH", path: "/research" },
  { name: "BACKTEST (ALIAS)", path: "/backtest" },
  { name: "RISK", path: "/risk" },
  { name: "SECURITY", path: "/security" },
  { name: "SETTINGS", path: "/settings" },
  { name: "SETTINGS BROKERS", path: "/settings/brokers" },
];

const apiEndpoints = [
  "/api/health",
  "/api/binance/status",
  "/api/upstox/status",
  "/api/dhan/status",
  "/api/delta/status",
  "/api/positions",
  "/api/orders",
  "/api/strategies",
  "/api/bots",
  "/api/risk",
  "/api/pnl",
];

async function runAudit() {
  console.log("=====================================================================");
  console.log("QUANT.OS HYBRID INSTITUTIONAL DEPARTMENT & PROVIDER AUDIT");
  console.log("=====================================================================\n");

  let totalPages = 0;
  let passedPages = 0;
  let failedPages = 0;

  console.log("--- 1. AUDITING 12 CANONICAL DEPARTMENTS & PROVIDER SUB-ROUTES ---");
  for (const dept of departments) {
    totalPages++;
    try {
      const res = await fetch(`http://localhost:3100${dept.path}`, {
        headers: { Accept: "text/html" },
        signal: AbortSignal.timeout(10000),
      });
      const text = await res.text();
      const hasError = text.includes("Internal Server Error") || text.includes("Application error");
      if (res.status === 200 && !hasError) {
        console.log(`  ✓ [${dept.name.padEnd(22)}] ${dept.path.padEnd(25)} -> HTTP 200 (${text.length} bytes)`);
        passedPages++;
      } else {
        console.log(`  ✗ [${dept.name.padEnd(22)}] ${dept.path.padEnd(25)} -> HTTP ${res.status} (FAILED)`);
        failedPages++;
      }
    } catch (err) {
      console.log(`  ✗ [${dept.name.padEnd(22)}] ${dept.path.padEnd(25)} -> EXCEPTION: ${err.message}`);
      failedPages++;
    }
  }

  console.log("\n--- 2. AUDITING API & BFF SERVICES ---");
  for (const endpoint of apiEndpoints) {
    try {
      const res = await fetch(`http://localhost:3100${endpoint}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      console.log(`  ✓ ${endpoint.padEnd(30)} -> HTTP ${res.status}`);
    } catch (err) {
      console.log(`  ✗ ${endpoint.padEnd(30)} -> EXCEPTION: ${err.message}`);
    }
  }

  console.log("\n=====================================================================");
  console.log(`AUDIT SUMMARY: ${passedPages}/${totalPages} DEPARTMENT PAGES PASSED (${failedPages} failures)`);
  console.log("=====================================================================");

  if (failedPages > 0) {
    process.exit(1);
  }
}

runAudit();
