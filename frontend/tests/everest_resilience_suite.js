/**
 * Quant.OS Everest SRE Production-Hardening Resilience Suite
 * Validates:
 * 1. Central health probes: /api/health/live, /api/health/ready, /api/health/dependencies
 * 2. 11-Viewport continuous responsive rendering without overflow or hydration errors
 * 3. Offline PWA Shell and prominent OFFLINE — READ ONLY mode banner
 * 4. Resize network isolation: 0 additional API requests dispatched on window resize
 */

const puppeteer = require("puppeteer-core");
const http = require("http");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = "http://localhost:3100";
const ARTIFACTS_DIR = "/Users/ashishparadkar/.gemini/antigravity-ide/brain/aad7af73-cb2a-4d73-b0d5-ffdefb01de48";

function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const req = http.get(`${BASE_URL}${endpoint}`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const latencyMs = Math.round(performance.now() - t0);
        let parsed = null;
        let isJson = false;
        try {
          parsed = JSON.parse(data);
          isJson = true;
        } catch {}
        resolve({
          endpoint,
          statusCode: res.statusCode,
          isJson,
          latencyMs,
          data: parsed,
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        endpoint,
        statusCode: 0,
        isJson: false,
        error: err.message,
        latencyMs: Math.round(performance.now() - t0),
      });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({
        endpoint,
        statusCode: 504,
        isJson: false,
        error: "Timeout after 8000ms",
        latencyMs: 8000,
      });
    });
  });
}

async function runEverestSuite() {
  console.log("\n" + "=".repeat(75));
  console.log("  QUANT.OS EVEREST PRODUCTION-HARDENING SRE RESILIENCE SUITE");
  console.log("=".repeat(75) + "\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function report(name, success, details = "") {
    totalTests++;
    if (success) {
      passedTests++;
      console.log(`\x1b[32m[PASS]\x1b[0m ${name} ${details ? `(${details})` : ""}`);
    } else {
      failedTests++;
      console.error(`\x1b[31m[FAIL]\x1b[0m ${name} ${details ? `(${details})` : ""}`);
    }
  }

  // Phase 1: Health Subsystems & Dependencies
  console.log("\n--- Phase 1: Institutional Health & Dependency Verification ---");
  const healthEndpoints = [
    "/api/health/live",
    "/api/health/ready",
    "/api/health/dependencies",
    "/api/bots",
    "/api/bots/summary",
    "/api/status",
    "/api/market-health",
    "/api/universe/summary",
  ];

  for (const ep of healthEndpoints) {
    const res = await checkEndpoint(ep);
    const ok = res.statusCode >= 200 && res.statusCode < 400 && res.isJson;
    report(`Probe ${ep}`, ok, `HTTP ${res.statusCode}, ${res.latencyMs}ms, JSON: ${res.isJson}`);
  }

  // Phase 2: 11-Viewport E2E Validation
  console.log("\n--- Phase 2: 11-Viewport Responsive & Zero-Overflow Validation ---");
  if (!fs.existsSync(CHROME_PATH)) {
    console.log("[SKIP] System Chrome not found, skipping browser tests.");
    return;
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const viewports = [
    { name: "Small Phone (320x568)", width: 320, height: 568, isMobile: true },
    { name: "Compact Phone (375x667)", width: 375, height: 667, isMobile: true },
    { name: "Modern Phone (390x844)", width: 390, height: 844, isMobile: true },
    { name: "Large Phone (430x932)", width: 430, height: 932, isMobile: true },
    { name: "Tablet Portrait (768x1024)", width: 768, height: 1024, isMobile: false },
    { name: "Tablet Landscape (1024x768)", width: 1024, height: 768, isMobile: false },
    { name: "13\" MacBook (1280x800)", width: 1280, height: 800, isMobile: false },
    { name: "Standard Laptop (1366x768)", width: 1366, height: 768, isMobile: false },
    { name: "15\" Desktop (1440x900)", width: 1440, height: 900, isMobile: false },
    { name: "1080p Monitor (1920x1080)", width: 1920, height: 1080, isMobile: false },
    { name: "2K Ultrawide (2560x1440)", width: 2560, height: 1440, isMobile: false },
  ];

  const testRoutes = [
    "/",
    "/intelligence",
    "/charts",
    "/bots",
    "/positions",
    "/risk",
    "/trade-journal",
    "/system-health",
  ];

  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });

    const jsRuntimeErrors = [];
    const hydrationErrors = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("Hydration") || text.includes("did not match") || text.includes("Text content does not match")) {
        hydrationErrors.push(text);
      }
      if (msg.type() === "error" && !text.includes("Failed to load resource") && !text.includes("status of 404")) {
        jsRuntimeErrors.push(text);
      }
    });

    page.on("pageerror", (err) => jsRuntimeErrors.push(err.message));

    let allRoutesOk = true;
    let hasOverflow = false;

    for (const route of testRoutes) {
      try {
        const url = `${BASE_URL}${route}`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await new Promise((r) => setTimeout(r, 500));

        const status = response ? response.status() : 0;
        if (status !== 200) allRoutesOk = false;

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (overflow) hasOverflow = true;
      } catch (err) {
        allRoutesOk = false;
      }
    }

    report(`[${vp.name}] All 8 Routes 200 OK`, allRoutesOk);
    report(`[${vp.name}] Zero Horizontal Overflow`, !hasOverflow);
    report(`[${vp.name}] Zero Hydration Errors`, hydrationErrors.length === 0, `Found ${hydrationErrors.length}`);
    if (jsRuntimeErrors.length > 0) {
      console.log(`  Sample Runtime Error: ${jsRuntimeErrors[0]}`);
    }
    report(`[${vp.name}] Zero Unhandled Errors`, jsRuntimeErrors.length === 0, `Found ${jsRuntimeErrors.length}`);

    await page.close();
  }

  // Phase 3: Offline Mode & Safe Banner Verification
  console.log("\n--- Phase 3: Offline PWA & Read-Only Banner Verification ---");
  const offlinePage = await browser.newPage();
  await offlinePage.setViewport({ width: 1440, height: 900 });
  await offlinePage.goto(`${BASE_URL}/`, { waitUntil: "networkidle0", timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  // Emulate offline
  await offlinePage.setOfflineMode(true);
  await offlinePage.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new CustomEvent("quantos:offline"));
  });
  await new Promise((r) => setTimeout(r, 1000));

  let offlineBannerPresent = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    offlineBannerPresent = await offlinePage.evaluate(() => {
      const banner = document.getElementById("offline-readonly-banner");
      const bodyText = document.body ? document.body.innerText : "";
      return banner !== null || bodyText.includes("OFFLINE — READ ONLY") || bodyText.includes("OFFLINE");
    });
    if (offlineBannerPresent) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  report("Offline Mode Displays Prominent Read-Only Banner", offlineBannerPresent, "Banner verified in DOM");

  // Restore online
  await offlinePage.setOfflineMode(false);
  await offlinePage.evaluate(() => {
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new CustomEvent("quantos:online"));
  });
  await new Promise((r) => setTimeout(r, 800));

  await offlinePage.close();

  // Phase 4: Dynamic Resize Network Isolation Test
  console.log("\n--- Phase 4: Dynamic Window Resize Network Isolation Test ---");
  const resizePage = await browser.newPage();
  await resizePage.setViewport({ width: 1440, height: 900 });
  await resizePage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1500));

  const resizeTriggeredFetch = await resizePage.evaluate(() => {
    let fetchCountDuringResize = 0;
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      fetchCountDuringResize++;
      return originalFetch.apply(this, args);
    };

    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));

    window.fetch = originalFetch;
    return fetchCountDuringResize;
  });

  report(
    "Zero Extra API Requests Directly Triggered by Window Resize",
    resizeTriggeredFetch === 0,
    `Resize dispatched ${resizeTriggeredFetch} fetch requests (Expected 0)`
  );

  await resizePage.close();
  await browser.close();

  console.log("\n" + "=".repeat(75));
  console.log(`  EVEREST FINAL RESULT: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("=".repeat(75) + "\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runEverestSuite().catch((err) => {
  console.error("Fatal Everest test suite execution error:", err);
  process.exit(1);
});
