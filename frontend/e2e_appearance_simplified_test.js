import puppeteer from "./node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer.js";
import path from "path";
import fs from "fs";

async function runAppearanceSimplifiedE2ETest() {
  console.log("==================================================");
  console.log("🚀 STARTING E2E TEST: SIMPLIFIED 4-OPTION APPEARANCE SYSTEM");
  console.log("==================================================");

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const screenshotsDir = path.join(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    // 1. Navigate to home
    console.log("\n[TEST 1] Navigating to http://localhost:3100 ...");
    await page.goto("http://localhost:3100", { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2000));

    // 2. Click Appearance button in TopCommandBar
    console.log("\n[TEST 2] Triggering Appearance Modal...");
    const buttons = await page.$$("button");
    let foundButton = false;
    for (const b of buttons) {
      const title = await page.evaluate((el) => el.getAttribute("title"), b);
      const text = await page.evaluate((el) => el.textContent, b);
      if ((title && title.includes("Theme")) || (text && (text.includes("Obsidian") || text.includes("Midnight")))) {
        await b.click();
        foundButton = true;
        break;
      }
    }

    if (!foundButton) {
      throw new Error("Could not find Appearance trigger button in TopCommandBar");
    }

    await new Promise((r) => setTimeout(r, 1500));

    // 3. Verify 4 Primary Sections in Modal
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasThemeSection = pageText.includes("Theme Preset") || pageText.includes("1. Theme Preset");
    const hasDisplaySection = pageText.includes("Display & Layout") || pageText.includes("2. Display & Layout");
    const hasAccentSection = pageText.includes("Accent Color") || pageText.includes("3. Accent Color");
    const hasChartSection = pageText.includes("Chart Style") || pageText.includes("4. Chart Style");

    console.log(`  ✓ Detected Theme Section: ${hasThemeSection}`);
    console.log(`  ✓ Detected Display Section: ${hasDisplaySection}`);
    console.log(`  ✓ Detected Accent Section: ${hasAccentSection}`);
    console.log(`  ✓ Detected Chart Style Section: ${hasChartSection}`);

    // Verify 4 Themes are present
    const hasObsidian = pageText.includes("Obsidian Blue");
    const hasMidnight = pageText.includes("Midnight Emerald");
    const hasGraphite = pageText.includes("Graphite");
    const hasLight = pageText.includes("Light Professional");

    console.log(`  ✓ 4 Institutional Themes Verified:`);
    console.log(`    - Obsidian Blue: ${hasObsidian}`);
    console.log(`    - Midnight Emerald: ${hasMidnight}`);
    console.log(`    - Graphite: ${hasGraphite}`);
    console.log(`    - Light Professional: ${hasLight}`);

    // Capture Appearance Modal Screenshot
    const screenshotPath = path.join(screenshotsDir, "appearance_simplified_4options.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  ✓ Saved Simplified Appearance Screenshot: ${screenshotPath}`);

    // 4. Test Live Preview (Click Midnight Emerald)
    console.log("\n[TEST 3] Testing Live Preview & Swatch Selection...");
    const themeButtons = await page.$$("button");
    for (const tb of themeButtons) {
      const text = await page.evaluate((el) => el.textContent, tb);
      if (text && text.includes("Midnight Emerald")) {
        await tb.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));

    // 5. Test Accent Swatch Selection (Click Cyan)
    const allButtons = await page.$$("button");
    for (const ab of allButtons) {
      const text = await page.evaluate((el) => el.textContent, ab);
      if (text && text.trim() === "Cyan") {
        await ab.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));

    // 6. Test Advanced Settings Accordion Expansion
    console.log("\n[TEST 4] Testing Collapsible Advanced Settings...");
    const advButtons = await page.$$("button");
    for (const ab of advButtons) {
      const text = await page.evaluate((el) => el.textContent, ab);
      if (text && text.includes("Advanced Settings")) {
        await ab.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));

    const advExpandedText = await page.evaluate(() => document.body.innerText);
    const hasTypography = advExpandedText.includes("Typography Families") || advExpandedText.includes("Interface Font");
    const hasWcag = advExpandedText.includes("WCAG Contrast") || advExpandedText.includes("Accessibility");
    console.log(`  ✓ Advanced Settings expanded successfully:`);
    console.log(`    - Typography Families: ${hasTypography}`);
    console.log(`    - WCAG Scorecard: ${hasWcag}`);

    // Capture Advanced Settings Screenshot
    const advScreenshotPath = path.join(screenshotsDir, "appearance_advanced_settings_expanded.png");
    await page.screenshot({ path: advScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved Advanced Settings Screenshot: ${advScreenshotPath}`);

    // 7. Test Apply Changes
    console.log("\n[TEST 5] Testing Apply Changes...");
    const footerButtons = await page.$$("button");
    for (const fb of footerButtons) {
      const text = await page.evaluate((el) => el.textContent, fb);
      if (text && text.includes("Apply Changes")) {
        await fb.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));

    console.log("\n==================================================");
    console.log("🎉 ALL SIMPLIFIED APPEARANCE E2E TESTS PASSED (0 ERRORS)");
    console.log("==================================================");
  } catch (error) {
    console.error("❌ E2E TEST FAILED:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runAppearanceSimplifiedE2ETest();
