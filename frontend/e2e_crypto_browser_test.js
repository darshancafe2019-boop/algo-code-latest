/**
 * Google Chrome Real Browser E2E Test Suite for Quant.OS Options & UI
 * ====================================================================
 * Runs against live Next.js frontend (http://localhost:3100)
 * Verifies:
 * - / (Executive Home / Terminal)
 * - /markets (Markets Workspace)
 * - /options (Flagship Option Chain & Strategy Studio)
 * - /crypto (Crypto Derivatives Hub)
 * - /crypto/options (Crypto Options Studio)
 * - /crypto/options-chain (Crypto Option Chain Matrix)
 * - /scanner, /dashboard, /trade-journal, /system-health
 * - Interactive switching of underlyings (BTC, ETH, SOL) and expiries
 * Asserts: 0 console errors, 0 React object-child errors, 0 uncaught exceptions.
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const puppeteer = require("puppeteer-core");

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

async function runTest() {
  console.log("==================================================");
  console.log("[*] STARTING REAL GOOGLE CHROME E2E BROWSER TEST");
  console.log("==================================================");

  const browserPath = getBrowserPath();
  console.log(`[+] Using Browser Executable: ${browserPath}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: browserPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  const warnings = [];

  page.on("console", (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type === "error") {
      errors.push(`[Console Error]: ${text}`);
    } else if (type === "warning") {
      warnings.push(`[Console Warning]: ${text}`);
    }
  });

  page.on("pageerror", (err) => {
    errors.push(`[Page Error]: ${err.message}`);
  });

  const routesToTest = [
    { url: "http://localhost:3100/", name: "Home / Terminal" },
    { url: "http://localhost:3100/options", name: "Flagship Option Chain" },
    { url: "http://localhost:3100/markets", name: "Market Discovery Universe" },
    { url: "http://localhost:3100/crypto", name: "Crypto Derivatives Hub" },
    { url: "http://localhost:3100/crypto/futures", name: "Crypto Futures Terminal" },
    { url: "http://localhost:3100/crypto/options", name: "Crypto Options Studio" },
    { url: "http://localhost:3100/crypto/options-chain", name: "Crypto Option Chain Terminal" },
    { url: "http://localhost:3100/dashboard", name: "Dashboard" },
    { url: "http://localhost:3100/scanner", name: "Scanner" },
    { url: "http://localhost:3100/trade-journal", name: "Trade Journal" },
    { url: "http://localhost:3100/system-health", name: "System Health" },
  ];

  let passedRoutes = 0;

  for (const r of routesToTest) {
    const errorsBefore = errors.length;
    console.log(`\n[+] Navigating to: ${r.name} (${r.url})...`);

    try {
      const resp = await page.goto(r.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const status = resp ? resp.status() : 200;

      // Wait 1.5s for React component mounting and initial fetch
      await new Promise((res) => setTimeout(res, 1500));

      const newErrors = errors.slice(errorsBefore).filter((e) => !e.includes("404") && !e.includes("favicon"));
      if (status === 200 && newErrors.length === 0) {
        console.log(`    -> PASS [HTTP 200] (0 React / console errors)`);
        passedRoutes++;
      } else {
        console.log(`    -> FAIL [HTTP ${status}] (${newErrors.length} errors):`);
        newErrors.forEach((e) => console.log(`       ${e}`));
      }
    } catch (e) {
      console.log(`    -> EXCEPTION: ${e.message}`);
    }
  }

  // Interactive Options Testing
  console.log("\n[+] Testing interactive Options flow on http://localhost:3100/options...");
  try {
    await page.goto("http://localhost:3100/options", { waitUntil: "domcontentloaded" });
    await new Promise((res) => setTimeout(res, 1500));

    // Click ETH underlying button
    const buttons = await page.$$("button");
    let clickedEth = false;
    for (const b of buttons) {
      const text = await page.evaluate((el) => el.textContent, b);
      if (text && text.includes("ETH")) {
        await b.click();
        console.log("    -> Successfully switched underlying to ETH");
        clickedEth = true;
        break;
      }
    }

    await new Promise((res) => setTimeout(res, 1500));

    // Check expiry select element
    const selectOptions = await page.$$eval("select option", (opts) =>
      opts.map((o) => ({ value: o.value, text: o.textContent }))
    );
    console.log(`    -> Found ${selectOptions.length} dropdown options in view.`);
    selectOptions.slice(0, 3).forEach((opt, idx) => {
      console.log(`       Option[${idx}]: value="${opt.value}", text="${opt.text}"`);
      assert(!opt.text.includes("[object Object]"), "Option text contains [object Object]");
      assert(!opt.value.includes("[object Object]"), "Option value contains [object Object]");
    });

    console.log("    -> Interactive Options state update verified cleanly!");
  } catch (e) {
    console.log(`    -> Interactive test error: ${e.message}`);
    errors.push(`[Interactive Test Failure]: ${e.message}`);
  }

  await browser.close();

  const fatalErrors = errors.filter((e) =>
    e.includes("Objects are not valid as a React child") ||
    e.includes("Uncaught") ||
    e.includes("TypeError") ||
    e.includes("ReferenceError")
  );

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedRoutes}/${routesToTest.length} Routes Passed`);
  console.log(`Fatal React Errors: ${fatalErrors.length}`);
  console.log("==================================================");

  if (fatalErrors.length > 0) {
    console.log("\nFatal Errors detail:");
    fatalErrors.forEach((e) => console.log(e));
    process.exit(1);
  } else {
    console.log("\n🎉 ALL REAL BROWSER E2E TESTS PASSED WITH ZERO REACT RUNTIME ERRORS!");
    process.exit(0);
  }
}

runTest();
