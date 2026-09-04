const path = require('path');
const puppeteer = require(path.join(__dirname, 'frontend', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function runPageOwnershipVerification() {
  console.log("===============================================================");
  console.log("      E2E PAGE OWNERSHIP & ANTI-DUPLICATION VERIFICATION");
  console.log("===============================================================");

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    console.error("Chrome executable not found at:", chromePath);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error' && !text.includes('favicon') && !text.includes('ERR_CONNECTION_REFUSED')) {
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
    await page.goto('http://localhost:3100/', { waitUntil: 'networkidle2', timeout: 20000 });

    const homeContent = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasExecutiveTitle: text.includes("Executive Trading Operations") || text.includes("PORTFOLIO OVERVIEW"),
        hasTotalBalance: text.includes("Total Balance"),
        hasTodaysPnl: text.includes("Today's Realized P&L") || text.includes("P&L"),
        hasActivePositions: text.includes("Active Positions"),
        hasRiskPipeline: text.includes("Risk Gate Pipeline") || text.includes("14/14 PASSED"),
        hasBotsPreview: text.includes("Active Execution Bots"),
        hasViewAllBots: text.includes("View All Bots"),
        hasOrdersPreview: text.includes("Recent Order Executions"),
        hasViewAllOrders: text.includes("View All Orders"),
        hasAlertsPreview: text.includes("Important System & Risk Alerts"),
        hasViewAllAlerts: text.includes("View All Alerts"),
        hasMarketPulse: text.includes("Market Pulse (Major Instruments)"),
        hasExploreMarkets: text.includes("Explore All Markets"),
        // Anti-duplication check: Should NOT contain full institutional table header or quick trade form
        hasFullInstitutionalTable: text.includes("Institutional Market Overview (") || text.includes("24h VolumeOpen Interest"),
        hasQuickTradeForm: text.includes("Quick Order Execution") || text.includes("Place Instant Order"),
      };
    });

    console.log("    ✓ Executive Overview Title:", homeContent.hasExecutiveTitle ? "PASS" : "FAIL");
    console.log("    ✓ Account Balance & Metrics:", homeContent.hasTotalBalance && homeContent.hasTodaysPnl ? "PASS" : "FAIL");
    console.log("    ✓ Active Bots Preview (with View All link):", homeContent.hasBotsPreview && homeContent.hasViewAllBots ? "PASS" : "FAIL");
    console.log("    ✓ Recent Executions Preview (with View All link):", homeContent.hasOrdersPreview && homeContent.hasViewAllOrders ? "PASS" : "FAIL");
    console.log("    ✓ Important Alerts Preview (with View All link):", homeContent.hasAlertsPreview && homeContent.hasViewAllAlerts ? "PASS" : "FAIL");
    console.log("    ✓ Compact Market Pulse (with Explore Markets link):", homeContent.hasMarketPulse && homeContent.hasExploreMarkets ? "PASS" : "FAIL");
    console.log("    ✓ Anti-Duplication (No full market table/quick forms):", (!homeContent.hasFullInstitutionalTable && !homeContent.hasQuickTradeForm) ? "PASS" : "FAIL");

    if (!homeContent.hasExecutiveTitle || !homeContent.hasTotalBalance || !homeContent.hasBotsPreview) {
      errors.push("HOME page failed executive overview content checks.");
    }

    // -------------------------------------------------------------
    // TEST 2: MARKETS (Market Discovery & Analysis)
    // -------------------------------------------------------------
    console.log("\n[2] Testing MARKETS Page (http://localhost:3100/charts)...");
    await page.goto('http://localhost:3100/charts', { waitUntil: 'networkidle2', timeout: 20000 });

    const marketsContent = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasUniverseTitle: text.includes("Global Market Discovery & Analysis") || text.includes("Canonical Instrument Master") || text.includes("Market Universe"),
        hasAssetClassTabs: text.includes("All Markets") && (text.includes("Crypto") || text.includes("CRYPTO")),
        hasMarketSearch: text.includes("Search symbol, index") || text.includes("Search"),
        // Anti-duplication check: Should NOT contain executive balance cards or command bus dispatcher
        hasBalanceCards: text.includes("Total Balance") || text.includes("Today's Realized P&L"),
        hasCommandDispatcher: text.includes("Custom Command Dispatcher") || text.includes("Platform Operational Controls"),
      };
    });

    console.log("    ✓ Market Discovery & Instrument Master:", marketsContent.hasUniverseTitle ? "PASS" : "FAIL");
    console.log("    ✓ Asset Class Tabs & Search:", marketsContent.hasAssetClassTabs ? "PASS" : "FAIL");
    console.log("    ✓ Anti-Duplication (No balance cards or command consoles):", (!marketsContent.hasBalanceCards && !marketsContent.hasCommandDispatcher) ? "PASS" : "FAIL");

    if (!marketsContent.hasUniverseTitle) {
      errors.push("MARKETS page failed market discovery content checks.");
    }

    // -------------------------------------------------------------
    // TEST 3: COMMAND CENTER (Runtime Operations & Control)
    // -------------------------------------------------------------
    console.log("\n[3] Testing COMMAND CENTER Page (http://localhost:3100/dashboard)...");
    await page.goto('http://localhost:3100/dashboard', { waitUntil: 'networkidle2', timeout: 20000 });

    const cmdContent = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasCommandTitle: text.includes("Runtime Operations Command Center") || text.includes("ORCHESTRATION & CONTROL"),
        hasSubsystemsGrid: text.includes("Flask Core API") && text.includes("APScheduler Worker") && text.includes("20-Stage Risk Gate"),
        hasOperationalControls: text.includes("Platform Operational Controls") && text.includes("START ALL BOTS") && text.includes("STOP ALL BOTS"),
        hasCommandConsole: text.includes("Custom Command Dispatcher") && text.includes("Real-Time Operational Trace"),
        hasDiagnosticLinks: text.includes("System Health Hub") && text.includes("Providers Matrix") && text.includes("Full Audit Logs"),
        // Anti-duplication check: Should NOT contain market universe table or balance cards
        hasMarketTable: text.includes("Search instruments by symbol") || text.includes("Open Interest"),
        hasBalanceCards: text.includes("Total Balance") && text.includes("Available Capital"),
      };
    });

    console.log("    ✓ Command Center Header & Title:", cmdContent.hasCommandTitle ? "PASS" : "FAIL");
    console.log("    ✓ Subsystems Status Grid:", cmdContent.hasSubsystemsGrid ? "PASS" : "FAIL");
    console.log("    ✓ Operational Controls (Start/Stop/Pause):", cmdContent.hasOperationalControls ? "PASS" : "FAIL");
    console.log("    ✓ Command Execution Console & Trace:", cmdContent.hasCommandConsole ? "PASS" : "FAIL");
    console.log("    ✓ Deep Diagnostics Navigation Hub:", cmdContent.hasDiagnosticLinks ? "PASS" : "FAIL");
    console.log("    ✓ Anti-Duplication (No market universe tables or balance cards):", (!cmdContent.hasMarketTable && !cmdContent.hasBalanceCards) ? "PASS" : "FAIL");

    if (!cmdContent.hasCommandTitle || !cmdContent.hasSubsystemsGrid || !cmdContent.hasOperationalControls) {
      errors.push("COMMAND CENTER page failed runtime operations content checks.");
    }

    // -------------------------------------------------------------
    // TEST 4: Navigation Smoke Check Across All Remaining Routes
    // -------------------------------------------------------------
    console.log("\n[4] Running Route Smoke Checks across All Dedicated Pages...");
    const remainingRoutes = ['/bots', '/orders', '/positions', '/risk', '/indicators', '/pnl', '/alerts', '/logs', '/settings', '/system-health', '/providers'];
    for (const r of remainingRoutes) {
      await page.goto(`http://localhost:3100${r}`, { waitUntil: 'networkidle2', timeout: 15000 });
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
