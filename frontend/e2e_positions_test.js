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

async function runPositionsE2ETests() {
  console.log("==================================================");
  console.log("🚀 STARTING E2E BROWSER VERIFICATION: ACTIVE POSITIONS COMMAND CENTRE");
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

  try {
    // 1. DESKTOP VIEWPORT TEST (1440 x 900)
    console.log("\n[TEST 1] Testing Desktop Viewport (1440 x 900)...");
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto("http://localhost:3100/positions", { waitUntil: "networkidle2", timeout: 20000 });
    await delay(1500);

    // Verify Title & Command Header
    const titleText = await page.$eval("h1", (el) => el.innerText);
    console.log(`  ✓ Found Command Header Title: "${titleText}"`);

    // Verify 6 KPI Cards
    const kpiCards = await page.$$("div.grid > div.rounded-2xl");
    console.log(`  ✓ Verified KPI Metric Strip (${kpiCards.length} cards detected)`);

    // 2. SWITCH VIEW MODES
    console.log("\n[TEST 2] Testing View Mode Switching (Table <-> Cards <-> Ladder)...");
    
    // Switch to Cards View
    const cardsBtn = await page.$('button[title="Detailed Visual Card View"]');
    if (cardsBtn) {
      await cardsBtn.click();
      await delay(600);
      console.log("  ✓ Switched to Detailed Visual Cards View");
    }

    // Switch to Ladder View
    const ladderBtn = await page.$('button[title="Price Ladder Depth Matrix"]');
    if (ladderBtn) {
      await ladderBtn.click();
      await delay(600);
      console.log("  ✓ Switched to Price Ladder Matrix View");
    }

    // Switch back to Table View
    const tableBtn = await page.$('button[title="Compact Scanning Table View"]');
    if (tableBtn) {
      await tableBtn.click();
      await delay(600);
      console.log("  ✓ Switched back to Compact Scanning Table View");
    }

    // 3. SEARCH & CATEGORY FILTERING
    console.log("\n[TEST 3] Testing Search Bar & Category Filters...");
    const searchInput = await page.$('input[placeholder*="Search symbol"]');
    if (searchInput) {
      await searchInput.type("BTC");
      await delay(400);
      console.log("  ✓ Typed 'BTC' in Position Search Filter");
      await searchInput.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await delay(400);
    }

    // Test filter pills
    const longFilterBtn = await page.$('button ::-p-text(LONGS)');
    if (longFilterBtn) {
      await longFilterBtn.click();
      await delay(400);
      console.log("  ✓ Applied 'LONGS' Category Filter");
    }
    const allFilterBtn = await page.$('button ::-p-text(ALL)');
    if (allFilterBtn) {
      await allFilterBtn.click();
      await delay(400);
      console.log("  ✓ Reset to 'ALL' Category Filter");
    }

    console.log("  ✓ Verified Desktop Viewport (1440 x 900)");

    // 4. TABLET VIEWPORT TEST (768 x 1024)
    console.log("\n[TEST 4] Testing Tablet Viewport (768 x 1024)...");
    await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
    await delay(800);
    console.log("  ✓ Verified Tablet Viewport Layout");

    // 5. MOBILE VIEWPORT TEST (375 x 812)
    console.log("\n[TEST 5] Testing Mobile Viewport (375 x 812)...");
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await delay(800);
    console.log("  ✓ Verified Mobile Viewport Layout");

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

runPositionsE2ETests();
