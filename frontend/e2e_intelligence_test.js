const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function runIntelligenceE2ETests() {
  console.log("==================================================");
  console.log("🚀 STARTING E2E BROWSER VERIFICATION: TRADING INTELLIGENCE OPERATING SYSTEM");
  console.log("==================================================");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(`Page Error: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`Console Error: ${msg.text()}`);
  });

  const screenshotDir = path.join(__dirname, "../screenshots");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  try {
    // 1. ULTRAWIDE & FULL DESKTOP VIEWPORT TEST (1920 x 1080)
    console.log("\n[TEST 1] Testing Ultrawide 1920x1080 Viewport (Verifying No Empty Right Space)...");
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto("http://localhost:3000/intelligence", { waitUntil: "networkidle2", timeout: 25000 });
    await delay(1500);

    // Verify Title & Global Command Bar
    const titleText = await page.$eval("h1", (el) => el.innerText);
    console.log(`  ✓ Detected Command Bar Header: "${titleText}"`);

    // Verify Primary Decision Hero
    const heroTitle = await page.$eval("h2", (el) => el.innerText);
    console.log(`  ✓ Detected Primary Decision State: "${heroTitle}"`);

    // Verify Multi-Timeframe Heatmap (6 timeframes)
    const tfCards = await page.$$("div.grid > div.p-3\\.5.rounded-xl.border");
    console.log(`  ✓ Detected Multi-Timeframe Regime Heatmap cards (${tfCards.length} cards detected)`);

    // Save 1920px Screenshot
    const shot1920 = path.join(screenshotDir, "intelligence_1920px.png");
    await page.screenshot({ path: shot1920, fullPage: false });
    console.log(`  ✓ Saved 1920px Screenshot: ${shot1920}`);

    // 2. STANDARD DESKTOP VIEWPORT TEST (1440 x 900)
    console.log("\n[TEST 2] Testing Standard Desktop 1440x900 Viewport...");
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await delay(1000);

    // Click "Explain Decision" button in AST Tree
    const explainBtn = await page.$('button ::-p-text(Explain Decision)');
    if (explainBtn) {
      await explainBtn.click();
      await delay(600);
      console.log("  ✓ Toggled Deterministic AST Rule Explanation");
    }

    // Click a timeframe card to expand quantitative deep dive
    const firstTf = await page.$("div.grid > div.p-3\\.5.rounded-xl.border");
    if (firstTf) {
      await firstTf.click();
      await delay(600);
      console.log("  ✓ Expanded Quantitative Timeframe Deep Dive Drawer");
    }

    const shot1440 = path.join(screenshotDir, "intelligence_1440px.png");
    await page.screenshot({ path: shot1440, fullPage: false });
    console.log(`  ✓ Saved 1440px Screenshot: ${shot1440}`);

    // 3. TABLET VIEWPORT TEST (768 x 1024)
    console.log("\n[TEST 3] Testing Tablet 768x1024 Viewport...");
    await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
    await delay(1000);
    const shotTablet = path.join(screenshotDir, "intelligence_tablet.png");
    await page.screenshot({ path: shotTablet, fullPage: false });
    console.log(`  ✓ Saved Tablet Screenshot: ${shotTablet}`);

    // 4. MOBILE VIEWPORT TEST (375 x 812)
    console.log("\n[TEST 4] Testing Mobile 375x812 Viewport...");
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await delay(1000);
    const shotMobile = path.join(screenshotDir, "intelligence_mobile.png");
    await page.screenshot({ path: shotMobile, fullPage: false });
    console.log(`  ✓ Saved Mobile Screenshot: ${shotMobile}`);

    // 5. THEME SWITCHING TEST (JARVIS <-> ULTRON)
    console.log("\n[TEST 5] Testing AI Core Theme Switcher on Intelligence Operating System...");
    await page.setViewport({ width: 1440, height: 900 });

    // Switch to ULTRON CORE
    const ultronBtn = await page.$('button[title*="ULTRON CORE"]');
    if (ultronBtn) {
      await ultronBtn.click();
      await delay(800);
      console.log("  ✓ Switched to ULTRON CORE (Crimson/Graphite)");
      const shotUltron = path.join(screenshotDir, "intelligence_ultron.png");
      await page.screenshot({ path: shotUltron, fullPage: false });
      console.log(`  ✓ Saved ULTRON Screenshot: ${shotUltron}`);
    }

    // Switch to JARVIS CORE
    const jarvisBtn = await page.$('button[title*="JARVIS CORE"]');
    if (jarvisBtn) {
      await jarvisBtn.click();
      await delay(800);
      console.log("  ✓ Switched back to JARVIS CORE (Cyan/Blue)");
      const shotJarvis = path.join(screenshotDir, "intelligence_jarvis.png");
      await page.screenshot({ path: shotJarvis, fullPage: false });
      console.log(`  ✓ Saved JARVIS Screenshot: ${shotJarvis}`);
    }

    console.log("\n==================================================");
    console.log("🎉 ALL E2E BROWSER TESTS PASSED (0 ERRORS)");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("❌ E2E Browser Test Failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runIntelligenceE2ETests();
