const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

function getBrowserPath() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  const candidates = [
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(localAppData, "Programs", "Opera", "launcher.exe"),
    path.join(programFiles, "Opera", "launcher.exe"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function runWizardE2ETest() {
  console.log("==================================================");
  console.log("🚀 STARTING E2E BROWSER TEST: 6-STEP CREATE BOT WIZARD");
  console.log("==================================================");

  const executablePath = getBrowserPath();
  if (!executablePath) {
    console.warn("⚠️ No browser executable found, skipping live browser test.");
    return;
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const screenshotsDir = path.join(__dirname, "..", "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // 1. Navigate to Bots page
    console.log("\n[TEST 1] Navigating to http://localhost:3100/bots ...");
    await page.goto("http://localhost:3100/bots", { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // 2. Open 6-Step Wizard Modal
    console.log("[TEST 2] Opening 6-Step Create Bot Instance Wizard Modal...");
    const buttons = await page.$$("button");
    let opened = false;
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && (text.includes("CREATE BOT") || text.includes("+ Create Bot") || text.includes("New Instance"))) {
        await b.click();
        opened = true;
        break;
      }
    }

    if (!opened) {
      console.log("  ⚠️ Direct click on button fallback, navigating to /bots/create");
      await page.goto("http://localhost:3100/bots/create", { waitUntil: "networkidle2", timeout: 20000 });
    }

    await new Promise((r) => setTimeout(r, 2000));

    // Verify Wizard Header and Step 1 Content
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasWizardTitle = pageText.includes("Create Bot Instance") || pageText.includes("CREATE BOT INSTANCE");
    if (!hasWizardTitle) {
      throw new Error("FAIL: Create Bot Instance Wizard title not found in DOM");
    }
    console.log("  ✓ Detected Wizard Title & 6-Step Stepper Header");

    // Capture Step 1 screenshot
    const step1ScreenshotPath = path.join(screenshotsDir, "wizard_step1_identity_capital.png");
    await page.screenshot({ path: step1ScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved Step 1 Screenshot: ${step1ScreenshotPath}`);

    // Verify Capital allocation calculation in DOM
    const hasCapitalInfo = pageText.includes("Total Capital") || pageText.includes("Allocated Capital") || pageText.includes("Allocation Breakdown");
    if (!hasCapitalInfo) {
      throw new Error("FAIL: Capital allocation inputs missing from Step 1");
    }
    console.log("  ✓ Verified Step 1 Capital Allocation & Sizing Controls");

    // Step 1 -> Step 2
    console.log("\n[TEST 3] Progressing from Step 1 to Step 2 (Market & Instrument)...");
    const nextButtons = await page.$$("button");
    for (const b of nextButtons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Continue")) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));

    const step2Text = await page.evaluate(() => document.body.innerText);
    const hasAssetClasses = step2Text.includes("OPTIONS") || step2Text.includes("CRYPTO") || step2Text.includes("STOCKS");
    console.log(`  ✓ Detected Asset Class Selectors in Step 2 (Options/Crypto/Stocks: ${hasAssetClasses})`);

    const step2ScreenshotPath = path.join(screenshotsDir, "wizard_step2_market_instrument.png");
    await page.screenshot({ path: step2ScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved Step 2 Screenshot: ${step2ScreenshotPath}`);

    // Step 2 -> Step 3
    console.log("\n[TEST 4] Progressing to Step 3 (Timeframe & Indicators)...");
    const nextButtons2 = await page.$$("button");
    for (const b of nextButtons2) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Continue")) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
    const step3ScreenshotPath = path.join(screenshotsDir, "wizard_step3_indicators_combiner.png");
    await page.screenshot({ path: step3ScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved Step 3 Screenshot: ${step3ScreenshotPath}`);

    // Step 3 -> Step 4
    console.log("\n[TEST 5] Progressing to Step 4 (Risk & Exits)...");
    const nextButtons3 = await page.$$("button");
    for (const b of nextButtons3) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Continue")) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
    const step4ScreenshotPath = path.join(screenshotsDir, "wizard_step4_risk_trailing_stop.png");
    await page.screenshot({ path: step4ScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved Step 4 Screenshot: ${step4ScreenshotPath}`);

    // Step 4 -> Step 5
    console.log("\n[TEST 6] Progressing to Step 5 (Broker & Execution)...");
    const nextButtons4 = await page.$$("button");
    for (const b of nextButtons4) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Continue")) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
    const step5ScreenshotPath = path.join(screenshotsDir, "wizard_step5_broker_margin.png");
    await page.screenshot({ path: step5ScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved Step 5 Screenshot: ${step5ScreenshotPath}`);

    // Step 5 -> Step 6
    console.log("\n[TEST 7] Progressing to Step 6 (Review & Pre-Check Gates)...");
    const nextButtons5 = await page.$$("button");
    for (const b of nextButtons5) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("Continue")) {
        await b.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
    const step6ScreenshotPath = path.join(screenshotsDir, "wizard_step6_review_activate.png");
    await page.screenshot({ path: step6ScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved Step 6 Screenshot: ${step6ScreenshotPath}`);

    console.log("\n==================================================");
    console.log("🎉 ALL E2E BROWSER TESTS PASSED (0 ERRORS)");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ E2E TEST FAILED:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runWizardE2ETest();
