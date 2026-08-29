const routes = [
  "/",
  "/favicon.ico",
  "/settings",
  "/markets",
  "/options",
  "/crypto",
  "/dashboard",
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
      console.log(`  ✓ http://localhost:3100${r.padEnd(22)} -> HTTP ${res.status}`);
    } catch (err) {
      console.log(`  ✗ http://localhost:3100${r.padEnd(22)} -> ERROR: ${err.message}`);
    }
  }
}

checkRoutes();
