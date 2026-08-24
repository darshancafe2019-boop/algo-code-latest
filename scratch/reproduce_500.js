const puppeteer = require('/Users/ashishparadkar/Downloads/algo-code-main/frontend/node_modules/puppeteer-core');
const http = require('http');

const FRONTEND_ROUTES = [
  '/',
  '/alerts',
  '/backtest',
  '/bots',
  '/bots/bot-1',
  '/bots/bot-1/edit',
  '/bots/create',
  '/charts',
  '/crypto',
  '/crypto/futures',
  '/crypto/options',
  '/crypto/options-chain',
  '/dashboard',
  '/diagnostics',
  '/indicators',
  '/intelligence',
  '/journal/trades/1',
  '/live-trading',
  '/logs',
  '/option-chain',
  '/options',
  '/orderbook',
  '/orders',
  '/paper-trading',
  '/pnl',
  '/positions',
  '/providers',
  '/risk',
  '/scanner',
  '/settings',
  '/strategies',
  '/strategy-builder',
  '/system-health',
  '/trade-journal',
  '/trade-journal/1',
  '/watchlists',
];

async function checkRoute(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, bodyLength: body.length, bodyPreview: body.slice(0, 200) });
      });
    }).on('error', (err) => {
      resolve({ status: 'ERROR', error: err.message });
    });
  });
}

(async () => {
  console.log('=== 1. HTTP GET TEST ON ALL 36 FRONTEND ROUTES ===');
  const failures = [];
  for (const r of FRONTEND_ROUTES) {
    const res = await checkRoute(`http://localhost:3000${r}`);
    const is500 = res.status >= 500;
    if (is500 || res.status === 'ERROR') {
      console.error(`❌ [${res.status}] http://localhost:3000${r} - ${res.bodyPreview || res.error}`);
      failures.push({ route: r, res });
    } else {
      console.log(`✓ [${res.status}] http://localhost:3000${r}`);
    }
  }

  console.log('\n=== 2. PUPPETEER FULL DOM & BROWSER CONSOLE/NETWORK AUDIT ===');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const network500s = [];
  const consoleErrors = [];

  page.on('response', (response) => {
    if (response.status() >= 500) {
      network500s.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
      console.error(`🚨 [NETWORK 500]: ${response.status()} ${response.url()}`);
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
      console.error(`[CONSOLE ERROR]: ${msg.text()}`);
    }
  });

  for (const r of FRONTEND_ROUTES) {
    console.log(`Navigating to: http://localhost:3000${r}`);
    try {
      const resp = await page.goto(`http://localhost:3000${r}`, { waitUntil: 'networkidle2', timeout: 8000 });
      const status = resp ? resp.status() : 'NO_RESP';
      const pageText = await page.evaluate(() => document.body.innerText);
      const is500Page = pageText.includes('500') && pageText.includes('Internal Server Error');
      if (status >= 500 || is500Page) {
        console.error(`🚨 PAGE 500 DETECTED ON ${r}: Status=${status}`);
        failures.push({ route: r, reason: 'Page rendered 500' });
      }
    } catch (e) {
      console.warn(`Warning on ${r}: ${e.message}`);
    }
  }

  await browser.close();

  console.log('\n=== SUMMARY OF FAILURES ===');
  console.log(`Total 500 / Error routes found: ${failures.length}`);
  console.log(`Total Network 500 requests: ${network500s.length}`);
  console.log(JSON.stringify({ failures, network500s }, null, 2));
})();
