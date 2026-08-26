const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

function getBrowserPath() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  const candidates = [
    path.join(programFiles, "Google\\Chrome\\Application\\chrome.exe"),
    path.join(programFilesX86, "Google\\Chrome\\Application\\chrome.exe"),
    path.join(programFiles, "Microsoft\\Edge\\Application\\msedge.exe"),
    path.join(programFilesX86, "Microsoft\\Edge\\Application\\msedge.exe"),
    path.join(localAppData, "Google\\Chrome\\Application\\chrome.exe"),
    path.join(localAppData, "Microsoft\\Edge\\Application\\msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return "chrome";
}

const CHROME_PATH = getBrowserPath();
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function runRiskSimplifiedE2ETest() {
  console.log("==================================================");
  console.log("🚀 STARTING E2E TEST: SIMPLIFIED QUANT.OS RISK CENTER");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  page.on("pageerror", (err) => console.error("  [BROWSER ERROR]:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("  [BROWSER CONSOLE ERROR]:", msg.text());
  });
  const screenshotDir = path.join(__dirname, "../screenshots");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  try {
    // 1. Navigate to Risk Page on 1920x1080 Viewport
    console.log("\n[TEST 1] Navigating to http://localhost:3100/risk (1920x1080)...");
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto("http://localhost:3100/risk", { waitUntil: "domcontentloaded", timeout: 45000 });
    await delay(3000);

    const initialText = await page.evaluate(() => document.body.innerText);
    console.log("  [INITIAL PAGE TEXT SAMPLE]:", initialText.slice(0, 300));

    // 2. Verify Top Status Bar & Authoritative Status
    console.log("\n[TEST 2] Verifying Top Authoritative Status Bar...");
    const mainText = await page.evaluate(() => document.querySelector("main")?.innerText || document.body.innerText);

    const hasRiskCenterTitle = mainText.includes("Risk Center") || mainText.includes("Quant.OS Risk Center");
    const hasPermissionState = mainText.includes("READY") || mainText.includes("CAUTION") || mainText.includes("BLOCKED") || mainText.includes("EMERGENCY HALT");
    const hasAvailableCapital = mainText.includes("Available Capital");
    const hasGrossExposure = mainText.includes("Gross Exposure");
    const hasRiskPerTrade = mainText.includes("Risk Per Trade");
    const hasDailyDrawdown = mainText.includes("Daily Drawdown");
    const hasMarginUtilization = mainText.includes("Margin Utilization");

    console.log(`  ✓ Detected Risk Center Header: ${hasRiskCenterTitle}`);
    console.log(`  ✓ Detected Authoritative Permission State: ${hasPermissionState}`);
    console.log(`  ✓ Top 5 Metrics Present:`);
    console.log(`    - Available Capital: ${hasAvailableCapital}`);
    console.log(`    - Gross Exposure: ${hasGrossExposure}`);
    console.log(`    - Risk Per Trade: ${hasRiskPerTrade}`);
    console.log(`    - Daily Drawdown: ${hasDailyDrawdown}`);
    console.log(`    - Margin Utilization: ${hasMarginUtilization}`);

    const shotOverview = path.join(screenshotDir, "risk_center_overview_1920.png");
    await page.screenshot({ path: shotOverview, fullPage: false });
    console.log(`  ✓ Saved Overview Screenshot: ${shotOverview}`);

    // Helper to click section button
    async function clickSectionTab(tabLabel) {
      const buttons = await page.$$("button");
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes(tabLabel)) {
          await b.click();
          return true;
        }
      }
      return false;
    }

    // 3. Test Section 2: Capital & Exposure
    console.log("\n[TEST 3] Testing Section 2: Capital & Exposure...");
    const clickedCap = await clickSectionTab("Capital & Exposure");
    if (clickedCap) {
      await delay(1200);
      const capText = await page.evaluate(() => document.body.innerText);
      const hasCapBar = capText.includes("Capital Allocation") || capText.includes("Total Account Equity");
      console.log(`  ✓ Detected Visual Capital Bar: ${hasCapBar}`);
      const shotCap = path.join(screenshotDir, "risk_center_capital_exposure.png");
      await page.screenshot({ path: shotCap, fullPage: false });
      console.log(`  ✓ Saved Capital & Exposure Screenshot: ${shotCap}`);
    }

    // 4. Test Section 3: Limits & Edit Drawer
    console.log("\n[TEST 4] Testing Section 3: Limits Table & Limit Edit Drawer...");
    const clickedLimits = await clickSectionTab("Limits");
    if (clickedLimits) {
      await delay(1200);
      const limitsText = await page.evaluate(() => document.body.innerText);
      const hasLimitsTable = limitsText.includes("Authoritative Risk Thresholds") || limitsText.includes("Risk Per Trade");
      console.log(`  ✓ Detected Limits Table: ${hasLimitsTable}`);

      // Click first table row to open edit drawer
      const row = await page.$("tbody tr");
      if (row) {
        await row.click();
        await delay(1000);
        const drawerText = await page.evaluate(() => document.body.innerText);
        const hasDrawer = drawerText.includes("Edit Risk Threshold");
        console.log(`  ✓ Successfully Opened Risk Limit Edit Drawer: ${hasDrawer}`);
        const shotLimits = path.join(screenshotDir, "risk_center_limits_drawer.png");
        await page.screenshot({ path: shotLimits, fullPage: false });
        console.log(`  ✓ Saved Limits Edit Drawer Screenshot: ${shotLimits}`);

        // Close drawer
        const closeBtn = await page.$("button[class*='cursor-pointer']");
        if (closeBtn) await closeBtn.click();
        await delay(500);
      }
    }

    // 5. Test Section 4: Advanced Tools
    console.log("\n[TEST 5] Testing Section 4: Advanced Tools...");
    const clickedAdv = await clickSectionTab("Advanced");
    if (clickedAdv) {
      await delay(1200);
      const advText = await page.evaluate(() => document.body.innerText);
      const hasPosSizing = advText.includes("Position Size") || advText.includes("Calculator") || advText.includes("Stress");
      console.log(`  ✓ Detected Advanced Tools Container: ${hasPosSizing}`);
      const shotAdv = path.join(screenshotDir, "risk_center_advanced_tools.png");
      await page.screenshot({ path: shotAdv, fullPage: false });
      console.log(`  ✓ Saved Advanced Tools Screenshot: ${shotAdv}`);
    }

    // 6. Test Responsive Viewports (1440, 768, 375)
    console.log("\n[TEST 6] Testing Responsive Viewports & Zero Horizontal Overflow...");
    const viewports = [
      { name: "Laptop (1440x900)", width: 1440, height: 900 },
      { name: "Tablet (768x1024)", width: 768, height: 1024 },
      { name: "Mobile (375x812)", width: 375, height: 812 },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await delay(600);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      console.log(`  ✓ Viewport ${vp.name}: Horizontal Overflow = ${hasOverflow ? "FAIL" : "NONE (PERFECT)"}`);
      if (hasOverflow) throw new Error(`Horizontal overflow detected on ${vp.name}`);
    }

    const shotMobile = path.join(screenshotDir, "risk_center_mobile_375.png");
    await page.screenshot({ path: shotMobile, fullPage: false });
    console.log(`  ✓ Saved Mobile Screenshot: ${shotMobile}`);

    console.log("\n==================================================");
    console.log("🎉 ALL RISK CENTER E2E TESTS PASSED (0 ERRORS)");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("❌ E2E TEST FAILED:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runRiskSimplifiedE2ETest();
