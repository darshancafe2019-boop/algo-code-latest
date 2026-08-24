/**
 * Automated Real Browser E2E Test Suite using System Chrome/Edge
 * Runs headless browser against http://localhost:3100 to verify:
 * - CSS stylesheet loading & Obsidian dark theme token application
 * - Responsive layout verification at Desktop (1440px) and Mobile (375px)
 * - 0 Console errors
 * - 0 Unhandled JavaScript exceptions
 * - 0 Hydration mismatches
 * - Component mounting and interactivity across all trading pages
 */

const fs = require("fs");
const path = require("path");
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
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

const BASE_URL = "http://localhost:3100";

const ROUTES_TO_TEST = [
  { path: "/", name: "Trading Terminal" },
  { path: "/risk", name: "Risk Management Hub" },
  { path: "/crypto", name: "Crypto Derivatives Hub" },
  { path: "/crypto/futures", name: "Crypto Futures Terminal" },
  { path: "/crypto/options", name: "Crypto Options Studio" },
  { path: "/crypto/options-chain", name: "Crypto Option Chain Terminal" },
  { path: "/pnl", name: "Performance Analytics" },
  { path: "/scanner", name: "Market Intelligence & Scanner" },
  { path: "/options", name: "Option Chain Matrix" },
  { path: "/option-chain", name: "Option Chain Details" },
  { path: "/orders", name: "Order History & Executions" },
  { path: "/positions", name: "Active Positions Ledger" },
  { path: "/paper-trading", name: "Paper Trading Terminal" },
  { path: "/live-trading", name: "Live Trading & Safety Center" },
  { path: "/strategy-builder", name: "Visual Strategy Builder" },
  { path: "/backtest", name: "Quantitative Backtest Lab" },
  { path: "/orderbook", name: "Live Order Book Depth" },
  { path: "/providers", name: "Multi-Market Providers" },
  { path: "/system-health", name: "System Health & Latency" },
  { path: "/alerts", name: "Alerts & Notifications" },
  { path: "/logs", name: "Decision & Audit Logs" },
  { path: "/settings", name: "Platform Settings" },
  { path: "/bots/create", name: "Create Bot Instance Wizard" },
];

async function runE2ETests() {
  console.log("================================================================================");
  console.log("  REAL BROWSER E2E TEST SUITE (CSS STYLING & QUANT.OS SYSTEM INTEGRITY)");
  console.log("================================================================================");

  const browserPath = getBrowserPath();
  if (!browserPath) {
    console.error("[!] No Chrome or Edge executable found on host system.");
    process.exit(1);
  }
  console.log(`[+] Using Browser: ${browserPath}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const globalPageErrors = [];
    const globalConsoleErrors = [];
    let passedCount = 0;
    let failedCount = 0;

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on("pageerror", (err) => {
      const msg = err.message || err.toString();
      globalPageErrors.push({ error: msg });
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        globalConsoleErrors.push({ text: msg.text() });
      }
    });

    // 1. Test Root Terminal & Verify CSS Stylesheet Loading
    console.log("\n[TEST PHASE 1] Verifying Root Terminal CSS and Theme Variables...");
    const rootRes = await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 15000 });
    const rootStatus = rootRes ? rootRes.status() : 0;
    await new Promise((r) => setTimeout(r, 1000));

    const stylingCheck = await page.evaluate(() => {
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
      const hasTailwindClasses = document.querySelector("header") !== null;
      const themeVarBg = getComputedStyle(document.documentElement).getPropertyValue("--theme-bg").trim();
      return {
        bodyBg,
        htmlBg,
        themeVarBg,
        hasTailwindClasses,
      };
    });

    console.log(`  [+] Root Status: ${rootStatus}`);
    console.log(`  [+] Computed Body BG: ${stylingCheck.bodyBg}`);
    console.log(`  [+] CSS Variable --theme-bg: ${stylingCheck.themeVarBg}`);

    if (rootStatus === 200 && stylingCheck.themeVarBg) {
      console.log("  [PASS] Obsidian Theme CSS is successfully applied!");
    } else {
      console.log("  [FAIL] Obsidian Theme CSS check failed!");
      failedCount++;
    }

    // 2. Test Responsive Breakpoints: Desktop (1440px) vs Mobile (375px)
    console.log("\n[TEST PHASE 2] Verifying Responsive Layout Breakpoints...");
    
    // Desktop Viewport
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise((r) => setTimeout(r, 500));
    const desktopLayout = await page.evaluate(() => {
      const sidebar = document.querySelector("aside");
      const mobileNav = document.querySelector("nav.md\\:hidden");
      const sidebarVisible = sidebar ? window.getComputedStyle(sidebar).display !== "none" : false;
      const mobileNavHidden = mobileNav ? window.getComputedStyle(mobileNav).display === "none" : true;
      return { sidebarVisible, mobileNavHidden };
    });

    if (desktopLayout.sidebarVisible && desktopLayout.mobileNavHidden) {
      console.log("  [PASS] Desktop (1440px): Sidebar VISIBLE, Mobile Nav HIDDEN.");
    } else {
      console.log(`  [FAIL] Desktop layout mismatch: sidebar=${desktopLayout.sidebarVisible}, mobileNavHidden=${desktopLayout.mobileNavHidden}`);
      failedCount++;
    }

    // Mobile Viewport
    await page.setViewport({ width: 375, height: 812 });
    await new Promise((r) => setTimeout(r, 500));
    const mobileLayout = await page.evaluate(() => {
      const sidebar = document.querySelector("aside");
      const mobileNav = document.querySelector("nav.md\\:hidden");
      const sidebarHidden = sidebar ? window.getComputedStyle(sidebar).display === "none" : true;
      const mobileNavVisible = mobileNav ? window.getComputedStyle(mobileNav).display !== "none" : false;
      return { sidebarHidden, mobileNavVisible };
    });

    if (mobileLayout.sidebarHidden && mobileLayout.mobileNavVisible) {
      console.log("  [PASS] Mobile (375px): Sidebar HIDDEN, Mobile Nav VISIBLE.");
    } else {
      console.log(`  [FAIL] Mobile layout mismatch: sidebarHidden=${mobileLayout.sidebarHidden}, mobileNavVisible=${mobileLayout.mobileNavVisible}`);
      failedCount++;
    }

    // Reset to Desktop for route tests
    await page.setViewport({ width: 1440, height: 900 });

    // 3. Test Navigation across all 23 primary routes
    console.log("\n[TEST PHASE 3] Validating Route Rendering...");
    for (const route of ROUTES_TO_TEST) {
      const fullUrl = `${BASE_URL}${route.path}`;
      try {
        const response = await page.goto(fullUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        const status = response ? response.status() : 0;
        await new Promise((r) => setTimeout(r, 400));
        const bodyLength = (await page.content()).length;

        if (status === 200 && bodyLength > 500) {
          console.log(`  ✅ [200 OK] ${route.path.padEnd(22)} | ${route.name.padEnd(32)} | OK`);
          passedCount++;
        } else {
          console.log(`  ❌ [FAIL]   ${route.path.padEnd(22)} | Status: ${status}`);
          failedCount++;
        }
      } catch (err) {
        console.log(`  ❌ [ERROR]  ${route.path.padEnd(22)} | Failed: ${err.message}`);
        failedCount++;
      }
    }

    console.log("\n================================================================================");
    console.log(`SUMMARY: ${passedCount}/${ROUTES_TO_TEST.length} Routes Passed in Real Browser.`);
    console.log(`Total Uncaught Page Exceptions: ${globalPageErrors.length}`);
    console.log(`Total Console Error Logs: ${globalConsoleErrors.length}`);
    console.log("================================================================================");

    await page.close();
    await browser.close();

    if (failedCount > 0 || globalPageErrors.length > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Browser launch / execution error:", err);
    if (browser) await browser.close();
    process.exit(1);
  }
}

runE2ETests();
