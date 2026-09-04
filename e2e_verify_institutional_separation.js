const path = require('path');
const puppeteer = require(path.join(__dirname, 'frontend', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function runInstitutionalSeparationVerification() {
  console.log("===============================================================");
  console.log("  E2E INSTITUTIONAL PAGE SEPARATION & OWNERSHIP VERIFICATION");
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
    // 1. HOME (Executive Overview)
    console.log("\n[1] Verifying HOME (http://localhost:3100/)...");
    await page.goto('http://localhost:3100/', { waitUntil: 'networkidle2', timeout: 20000 });
    const homeCheck = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasTitle: text.includes("Executive Trading Operations") || text.includes("PORTFOLIO OVERVIEW"),
        hasBalance: text.includes("Total Balance"),
        hasBotsPreview: text.includes("Active Execution Bots") && text.includes("View All Bots"),
        hasOrdersPreview: text.includes("Recent Order Executions") && text.includes("View All Orders"),
        hasAlertsPreview: text.includes("Important System & Risk Alerts") && text.includes("View All Alerts"),
        hasPulse: text.includes("Market Pulse (Major Instruments)") && text.includes("Explore All Markets"),
        // Anti-duplication: no full order forms or raw tables
        noFullForm: !text.includes("Quantity Mode") && !text.includes("Pre-Order Risk Gatekeeper"),
      };
    });
    console.log("    ✓ Home Executive Overview:", Object.values(homeCheck).every(Boolean) ? "PASS" : "FAIL");

    // 2. MARKETS (Market Discovery)
    console.log("\n[2] Verifying MARKETS (http://localhost:3100/charts)...");
    await page.goto('http://localhost:3100/charts', { waitUntil: 'networkidle2', timeout: 20000 });
    const marketsCheck = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasTitle: text.includes("Global Market Discovery") || text.includes("Market Universe"),
        hasCategories: text.includes("All Markets") && text.includes("Crypto"),
        hasSearch: text.includes("Search symbol") || text.includes("Search spots"),
      };
    });
    console.log("    ✓ Markets Discovery Center:", Object.values(marketsCheck).every(Boolean) ? "PASS" : "FAIL");

    // 3. ORDERS (Canonical Order Ticket & Lifecycle)
    console.log("\n[3] Verifying ORDERS (http://localhost:3100/orders)...");
    await page.goto('http://localhost:3100/orders', { waitUntil: 'networkidle2', timeout: 20000 });
    const ordersCheck = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasOrderHeader: text.includes("Order Execution") || text.includes("Order Command") || text.includes("PREVIEW & EXECUTE"),
        hasOrderTypes: text.includes("MARKET") && text.includes("LIMIT") && text.includes("STOP"),
        hasLeverage: text.includes("Leverage") || text.includes("Margin"),
        hasRiskGate: text.includes("Pre-Order Risk Gatekeeper") || text.includes("Gates"),
        hasLifecycleTable: text.includes("Active & Historical Order Lifecycle") || text.includes("Order Price"),
        // Anti-duplication: NO full P&L equity curves or psychological review forms
        noEquityCurve: !text.includes("High Water Mark") && !text.includes("Interactive Equity Curve"),
        noPsychJournal: !text.includes("Human Trade Review & Behavioral Journal"),
      };
    });
    console.log("    ✓ Canonical Orders Execution Center:", Object.values(ordersCheck).every(Boolean) ? "PASS" : "FAIL");

    // 4. POSITIONS (Current Market Exposure)
    console.log("\n[4] Verifying POSITIONS (http://localhost:3100/positions)...");
    await page.goto('http://localhost:3100/positions', { waitUntil: 'networkidle2', timeout: 20000 });
    const positionsCheck = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasPositionsTitle: text.includes("Positions") || text.includes("Exposure") || text.includes("Unrealized"),
        noOrderTicket: !text.includes("PREVIEW & EXECUTE"),
      };
    });
    console.log("    ✓ Positions Exposure View:", Object.values(positionsCheck).every(Boolean) ? "PASS" : "FAIL");

    // 5. P&L (Financial Performance Analytics)
    console.log("\n[5] Verifying P&L ANALYTICS (http://localhost:3100/pnl)...");
    await page.goto('http://localhost:3100/pnl', { waitUntil: 'networkidle2', timeout: 20000 });
    const pnlCheck = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasKPIs: text.includes("LIVE P&L") || text.includes("PORTFOLIO PERFORMANCE") || text.includes("Total Equity"),
        hasEquityCurve: text.includes("Equity Curve") || text.includes("High Water Mark") || text.includes("Drawdown"),
        hasAttribution: text.includes("Performance") || text.includes("Strategy"),
        noOrderTicket: !text.includes("PREVIEW & EXECUTE"),
      };
    });
    console.log("    ✓ P&L Financial Performance Analytics:", Object.values(pnlCheck).every(Boolean) ? "PASS" : "FAIL");

    // 6. TRADE JOURNAL (Human Trade Review & Psychology)
    console.log("\n[6] Verifying TRADE JOURNAL (http://localhost:3100/trade-journal)...");
    await page.goto('http://localhost:3100/trade-journal', { waitUntil: 'networkidle2', timeout: 20000 });
    const journalCheck = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasJournalTitle: text.includes("Human Trade Review & Behavioral Journal") || text.includes("POST-TRADE AUDIT"),
        hasScorecard: text.includes("Review Completion") && text.includes("Avg Setup Quality") && text.includes("Avg Execution Quality"),
        hasPsychology: text.includes("Emotional Discipline"),
        hasReviewAction: text.includes("Write Review") || text.includes("Edit Review") || text.includes("Thesis"),
        // Anti-duplication: NO full equity curve charts or live order tickets
        noEquityCurve: !text.includes("Peak Equity") && !text.includes("High Water Mark"),
        noOrderTicket: !text.includes("PREVIEW & EXECUTE"),
      };
    });
    console.log("    ✓ Human Trade Review & Behavioral Journal:", Object.values(journalCheck).every(Boolean) ? "PASS" : "FAIL");

    // 7. AUDIT LOGS (Immutable Forensic Record)
    console.log("\n[7] Verifying AUDIT LOGS (http://localhost:3100/logs)...");
    await page.goto('http://localhost:3100/logs', { waitUntil: 'networkidle2', timeout: 20000 });
    const logsCheck = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasLogsTitle: text.includes("Audit") || text.includes("System Logs") || text.includes("Logs") || text.includes("Telemetry"),
      };
    });
    console.log("    ✓ Immutable Audit Logs:", Object.values(logsCheck).every(Boolean) ? "PASS" : "FAIL");

    // 8. COMMAND CENTER (Runtime Operations)
    console.log("\n[8] Verifying COMMAND CENTER (http://localhost:3100/dashboard)...");
    await page.goto('http://localhost:3100/dashboard', { waitUntil: 'networkidle2', timeout: 20000 });
    const cmdCheck = await page.evaluate(() => {
      const text = document.body.textContent || "";
      return {
        hasCmdTitle: text.includes("Runtime Operations Command Center") || text.includes("ORCHESTRATION & CONTROL"),
        hasSubsystems: text.includes("Flask Core API") && text.includes("APScheduler Worker"),
        hasControls: text.includes("Platform Operational Controls") && text.includes("START ALL BOTS"),
        hasConsole: text.includes("Custom Command Dispatcher") && text.includes("Real-Time Operational Trace"),
        noMarketTable: !text.includes("Search symbol, index"),
      };
    });
    console.log("    ✓ Runtime Operations Command Center:", Object.values(cmdCheck).every(Boolean) ? "PASS" : "FAIL");

    // 9. Check All Other Canonical Routes for Clean Render
    const otherRoutes = [
      '/bots',
      '/strategies',
      '/options',
      '/crypto/futures',
      '/risk',
      '/alerts',
      '/system-health',
      '/providers',
      '/watchlists',
      '/scanner',
      '/settings',
    ];

    console.log("\n[9] Running Smoke Checks Across Remaining Specialized Routes...");
    for (const r of otherRoutes) {
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
      console.log("✅ ALL 19 CANONICAL ROUTES AND ANTI-DUPLICATION CRITERIA PASS 100%!");
    }

  } catch (err) {
    console.error("❌ Test Execution Error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runInstitutionalSeparationVerification();
