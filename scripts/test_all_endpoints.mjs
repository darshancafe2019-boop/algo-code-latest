const routes = [
  // Backend direct on 5050
  'http://localhost:5050/api/status',
  'http://localhost:5050/api/health',
  'http://localhost:5050/api/portfolio/snapshot',
  'http://localhost:5050/api/portfolio/equity-curve',
  'http://localhost:5050/api/portfolio/performance/bars',
  'http://localhost:5050/api/portfolio/performance/day-details',
  'http://localhost:5050/api/pnl/summary',
  'http://localhost:5050/api/trades',
  'http://localhost:5050/api/bots',
  'http://localhost:5050/api/orders',
  'http://localhost:5050/api/positions',
  'http://localhost:5050/api/analytics',
  'http://localhost:5050/api/options/chain',
  'http://localhost:5050/api/upstox/status',
  'http://localhost:5050/api/delta/status',

  // Frontend Next.js API routes on 3100
  'http://localhost:3100/api/upstox/status',
  'http://localhost:3100/api/upstox/health',
  'http://localhost:3100/api/upstox/funds',
  'http://localhost:3100/api/upstox/holdings',
  'http://localhost:3100/api/upstox/instruments',
  'http://localhost:3100/api/upstox/instruments/search?query=RELIANCE',
  'http://localhost:3100/api/upstox/ltp?symbols=NSE_EQ%7CINE002A01018',
  'http://localhost:3100/api/upstox/market-status',
  'http://localhost:3100/api/upstox/options/chain?instrument_key=NSE_INDEX%7CNifty%2050',
  'http://localhost:3100/api/upstox/orders',
  'http://localhost:3100/api/upstox/pnl',
  'http://localhost:3100/api/upstox/positions',
  'http://localhost:3100/api/upstox/profile',
  'http://localhost:3100/api/upstox/trades',
  'http://localhost:3100/api/delta/status',
  'http://localhost:3100/api/delta/ping',
  'http://localhost:3100/api/binance/ping',
  
  // Frontend pages on 3100
  'http://localhost:3100/',
  'http://localhost:3100/pnl',
  'http://localhost:3100/performance',
  'http://localhost:3100/bots',
  'http://localhost:3100/markets',
  'http://localhost:3100/options',
  'http://localhost:3100/settings'
];

async function main() {
  console.log('--- Probing all endpoints on Backend (5050) and Frontend (3100) ---');
  let errCount = 0;
  for (const url of routes) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const text = await res.text();
      const preview = text.slice(0, 100).replace(/\r?\n/g, ' ');
      if (res.status >= 500) {
        console.error(`[500 ERROR] Status ${res.status}: ${url}`);
        console.error(`            Response: ${preview}`);
        errCount++;
      } else {
        console.log(`[STATUS ${res.status}] ${url}`);
      }
    } catch (e) {
      console.warn(`[CONN FAIL] ${url}: ${e.message}`);
      errCount++;
    }
  }
  console.log(`\nCompleted. Found ${errCount} error(s).`);
}

main();
