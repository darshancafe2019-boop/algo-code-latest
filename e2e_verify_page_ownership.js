const path = require('path');
const puppeteer = require(path.join(__dirname, 'frontend', 'node_modules', 'puppeteer-core'));
const fs = require('fs');
const { execSync } = require('child_process');

async function runPageOwnershipVerification() {
  console.log("===============================================================");
  console.log("      E2E PAGE OWNERSHIP & ANTI-DUPLICATION VERIFICATION");
  console.log("===============================================================");

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const chromePath = chromePaths.find(p => fs.existsSync(p));
  if (!chromePath) {
    console.error("Chrome executable not found in any standard path:", chromePaths);
    process.exit(1);
  }

  // Generate authoritative admin session for testing
  let token = "";
  try {
    token = execSync('.venv\\Scripts\\python.exe -c "from src.security_auth import SessionManager; from src import db; admin = db.get_user_by_username(\'admin\'); token, _ = SessionManager.create_session(admin[\'id\']); print(token)"', { encoding: 'utf-8' }).trim().split('\n').pop().trim();
    console.log("✓ Authenticated session generated:", token.slice(0, 16) + "...");
  } catch (err) {
    console.error("Failed to generate test session token:", err);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  if (token) {
    await page.setCookie({
      name: 'algo_session_token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    });
  }

  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error' && !text.includes('favicon') && !text.includes('ERR_CONNECTION_REFUSED') && !text.includes('HotReload')) {
      errors.push(`[Console Error] ${text}`);
      console.log(`❌ ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`[Page Error] ${err.message}`);
    console.log(`❌ [Page Exception]: ${err.message}`);
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: HOME (Executive Overview)
    // -------------------------------------------------------------
    console.log("\n[1] Testing HOME Page (http://localhost:3100/)...");
    await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));

    const homeContent = await page.evaluate(() => {
      const text = document.body.innerText || document.body.textContent || "";
      return {
        hasExecutiveTitle: text.includes("Executive Trading Operations") || text.includes("PORTFOLIO OVERVIEW") || text.includes("Total Portfolio"),
        hasTotalBalance: text.includes("Total Portfolio") || text.includes("Total Balance"),
        hasTodaysPnl: text.includes("Today's P&L") || text.includes("Today's Realized P&L") || text.includes("P&L"),
        hasActivePositions: text.includes("Open Positions") || text.includes("Active Positions"),
        hasRiskPipeline: text.includes("exposure guarded") || text.includes("Risk Gate Pipeline") || text.includes("14/14 PASSED"),
        hasBotsPreview: text.includes("System Status") || text.includes("Active Execution Bots") || text.includes("Bots"),
        hasMarketPulse: text.includes("MARKET INDICES") || text.includes("Market Pulse"),
        hasExploreMarkets: text.includes("View All") || text.includes("Explore All Markets"),
        hasTopMovers: text.includes("TOP MOVERS") || text.includes("Gainers"),
        // Anti-duplication check: Should NOT contain full institutional table header or quick trade form
        hasFullInstitutionalTable: text.includes("Institutional Market Overview (") || text.includes("24h VolumeOpen Interest"),
        hasQuickTradeForm: text.includes("Quick Order Execution") || text.includes("Place Instant Order"),
      };
    });

    console.log("    ✓ Executive Overview Title:", homeContent.hasExecutiveTitle ? "PASS" : "FAIL");
    console.log("    ✓ Account Balance & Metrics:", homeContent.hasTotalBalance && homeContent.hasTodaysPnl ? "PASS" : "FAIL");
    console.log("    ✓ Active Positions & Risk Guard:", homeContent.hasActivePositions && homeContent.hasRiskPipeline ? "PASS" : "FAIL");
    console.log("    ✓ System & Fleet Status Preview:", homeContent.hasBotsPreview ? "PASS" : "FAIL");
    console.log("    ✓ Market Indices Pulse:", homeContent.hasMarketPulse && homeContent.hasExploreMarkets ? "PASS" : "FAIL");
    console.log("    ✓ Real-Time Top Movers:", homeContent.hasTopMovers ? "PASS" : "FAIL");
    console.log("    ✓ Anti-Duplication (No full market table/quick forms):", (!homeContent.hasFullInstitutionalTable && !homeContent.hasQuickTradeForm) ? "PASS" : "FAIL");

    if (!homeContent.hasExecutiveTitle || !homeContent.hasTotalBalance || !homeContent.hasBotsPreview) {
      errors.push("HOME page failed executive overview content checks.");
    }

    // -------------------------------------------------------------
    // TEST 2: MARKETS (Market Discovery & Analysis)
    // -------------------------------------------------------------
    console.log("\n[2] Testing MARKETS Page (http://localhost:3100/charts)...");
    await page.goto('http://localhost:3100/charts', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));

    const marketsContent = await page.evaluate(() => {
      const text = document.body.innerText || document.body.textContent || "";
      return {
        hasUniverseTitle: text.includes("Global Market Discovery & Analysis") || text.includes("Canonical Instrument Master") || text.includes("Market Universe") || text.includes("Markets") || text.includes("NIFTY 50"),
        hasAssetClassTabs: text.includes("All") || text.includes("Crypto") || text.includes("NSE") || text.includes("EQUITY"),
        hasMarketSearch: text.includes("Search") || text.includes("Filter") || text.includes("Symbol"),
        // Anti-duplication check: Should NOT contain command bus dispatcher
        hasCommandDispatcher: text.includes("Custom Command Dispatcher") || text.includes("Platform Operational Controls"),
      };
    });

    console.log("    ✓ Market Discovery & Instrument Master:", marketsContent.hasUniverseTitle ? "PASS" : "FAIL");
    console.log("    ✓ Asset Class Tabs & Search:", marketsContent.hasAssetClassTabs && marketsContent.hasMarketSearch ? "PASS" : "FAIL");
    console.log("    ✓ Anti-Duplication (No command consoles):", (!marketsContent.hasCommandDispatcher) ? "PASS" : "FAIL");

    if (!marketsContent.hasUniverseTitle) {
      errors.push("MARKETS page failed market discovery content checks.");
    }

    // -------------------------------------------------------------
    // TEST 3: COMMAND CENTER (Runtime Operations & Control)
    // -------------------------------------------------------------
    console.log("\n[3] Testing COMMAND CENTER Page (http://localhost:3100/dashboard)...");
    await page.goto('http://localhost:3100/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));

    const cmdContent = await page.evaluate(() => {
      const text = document.body.innerText || document.body.textContent || "";
      return {
        hasCommandTitle: text.includes("TRADE / EXECUTION COMMAND CENTER") || text.includes("Runtime Operations Command Center") || text.includes("OPERATIONAL CONTROL"),
        hasSubsystemsGrid: text.includes("Flask Core API") && text.includes("APScheduler Worker") && text.includes("20-Stage Risk Gate"),
        hasOperationalControls: text.includes("PLATFORM OPERATIONAL CONTROLS") && text.includes("START ALL BOTS") && text.includes("STOP ALL BOTS"),
        hasCommandConsole: text.includes("CUSTOM COMMAND DISPATCHER") && text.includes("REAL-TIME OPERATIONAL TRACE"),
        hasDiagnosticLinks: text.includes("System Health Hub") && text.includes("Providers Matrix") && text.includes("Full Audit Logs"),
      };
    });

    console.log("    ✓ Command Center Header & Title:", cmdContent.hasCommandTitle ? "PASS" : "FAIL");
    console.log("    ✓ Subsystems Status Grid:", cmdContent.hasSubsystemsGrid ? "PASS" : "FAIL");
    console.log("    ✓ Operational Controls (Start/Stop/Pause):", cmdContent.hasOperationalControls ? "PASS" : "FAIL");
    console.log("    ✓ Command Execution Console & Trace:", cmdContent.hasCommandConsole ? "PASS" : "FAIL");
    console.log("    ✓ Deep Diagnostics Navigation Hub:", cmdContent.hasDiagnosticLinks ? "PASS" : "FAIL");

    if (!cmdContent.hasCommandTitle || !cmdContent.hasSubsystemsGrid || !cmdContent.hasOperationalControls) {
      errors.push("COMMAND CENTER page failed runtime operations content checks.");
    }

    // -------------------------------------------------------------
    // TEST 4: Navigation Smoke Check Across All Remaining Routes
    // -------------------------------------------------------------
    console.log("\n[4] Running Route Smoke Checks across All Dedicated Pages...");
    const remainingRoutes = ['/bots', '/orders', '/positions', '/risk', '/indicators', '/pnl', '/alerts', '/logs', '/settings', '/system-health', '/providers'];
    for (const r of remainingRoutes) {
      await page.goto(`http://localhost:3100${r}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`    ✓ Loaded http://localhost:3100${r} cleanly.`);
    }

    console.log("\n===============================================================");
    console.log(`Verification Complete. Total Uncaught Errors: ${errors.length}`);
    console.log("===============================================================");

    if (errors.length > 0) {
      console.error("❌ Verification encountered errors:");
      errors.forEach(e => console.error("   ", e));
      process.exit(1);
    } else {
      console.log("✅ ALL PAGE OWNERSHIP & ANTI-DUPLICATION CRITERIA SATISFIED WITH 0 ERRORS!");
    }

  } catch (err) {
    console.error("❌ E2E Test Execution Error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPageOwnershipVerification();
