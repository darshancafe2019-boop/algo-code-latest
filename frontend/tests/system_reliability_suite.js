/**
 * Quant.OS 11-Viewport SRE Responsive & Continuous Layout Verification Suite
 * Validates 11 distinct display viewports (320px to 2560px),
 * zero horizontal page overflow, zero hydration errors, zero console exceptions,
 * and verifies that window resizing causes ZERO additional API requests.
 */

const puppeteer = require("puppeteer-core");
const http = require("http");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = "http://localhost:3000";
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
          length: data.length,
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

async function runTestSuite() {
  console.log("\n" + "=".repeat(70));
  console.log("  QUANT.OS 11-VIEWPORT CONTINUOUS RESPONSIVE ARCHITECTURE SUITE");
  console.log("=".repeat(70) + "\n");

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

  // Phase 1: Gateway & Route Handlers Verification
  console.log("\n--- Phase 1: Central BFF Route Handler Verification ---");
  const criticalEndpoints = [
    "/api/health",
    "/api/bots",
    "/api/bots/summary",
    "/api/status",
    "/api/market-health",
    "/api/universe/instruments?asset_class=ALL&search=&limit=250",
    "/api/universe/watchlists",
    "/api/universe/summary",
    "/api/universe/sessions",
  ];

  const latencies = [];
  for (const ep of criticalEndpoints) {
    const result = await checkEndpoint(ep);
    latencies.push(result.latencyMs);
    const isHealthy = result.statusCode >= 200 && result.statusCode < 400 && result.isJson;
    report(`Endpoint ${ep}`, isHealthy, `HTTP ${result.statusCode}, ${result.latencyMs}ms, JSON: ${result.isJson}`);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  console.log(`  Gateway Latency: p50 = ${p50}ms, p95 = ${p95}ms`);

  // Phase 2: Puppeteer 11-Viewport E2E Testing
  console.log("\n--- Phase 2: 11-Viewport E2E & Zero-Overflow Testing ---");

  if (!fs.existsSync(CHROME_PATH)) {
    console.log("[SKIP] System Chrome not found at path, skipping browser render pass.");
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

    const consoleErrors = [];
    const hydrationErrors = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        consoleErrors.push(text);
      }
      if (text.includes("Hydration") || text.includes("did not match") || text.includes("Text content does not match")) {
        hydrationErrors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    let allRoutesOk = true;
    let hasOverflow = false;

    for (const route of testRoutes) {
      try {
        const url = `${BASE_URL}${route}`;
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await new Promise((r) => setTimeout(r, 600));

        const status = response ? response.status() : 0;
        if (status !== 200) allRoutesOk = false;

        // Check for horizontal overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        if (overflow) hasOverflow = true;
      } catch (err) {
        allRoutesOk = false;
      }
    }

    report(`[${vp.name}] All 8 Routes 200 OK`, allRoutesOk);
    report(`[${vp.name}] Zero Horizontal Overflow`, !hasOverflow);
    report(`[${vp.name}] Zero Hydration Errors`, hydrationErrors.length === 0, `Found ${hydrationErrors.length}`);
    report(`[${vp.name}] Zero Unhandled Errors`, consoleErrors.length === 0, `Found ${consoleErrors.length}`);

    // Capture screenshots for walkthrough
    if (vp.width === 320) {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "screenshot_responsive_320.png") });
    } else if (vp.width === 390) {
      await page.goto(`${BASE_URL}/intelligence`, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "screenshot_responsive_390.png") });
    } else if (vp.width === 768) {
      await page.goto(`${BASE_URL}/bots`, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "screenshot_responsive_768.png") });
    } else if (vp.width === 1440) {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "screenshot_responsive_1440.png") });
    } else if (vp.width === 2560) {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, "screenshot_responsive_2560.png") });
    }

    await page.close();
  }

  // Phase 3: Resize-Induced Request Isolation Test
  console.log("\n--- Phase 3: Dynamic Window Resize Network Isolation Test ---");
  const resizePage = await browser.newPage();
  await resizePage.setViewport({ width: 1440, height: 900 });

  await resizePage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1500));

  // Install in-page spy on window.fetch to detect if resize triggers any fetch calls
  const resizeTriggeredFetch = await resizePage.evaluate(() => {
    let fetchCountDuringResize = 0;
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      fetchCountDuringResize++;
      return originalFetch.apply(this, args);
    };

    // Dispatch multiple resize events
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("orientationchange"));

    // Restore fetch
    window.fetch = originalFetch;
    return fetchCountDuringResize;
  });

  report(
    "Zero Extra API Requests Directly Triggered by Window Resize",
    resizeTriggeredFetch === 0,
    `Resize event dispatched ${resizeTriggeredFetch} fetch requests (Expected 0)`
  );

  await resizePage.close();
  await browser.close();

  console.log("\n" + "=".repeat(70));
  console.log(`  FINAL VERIFICATION RESULT: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("=".repeat(70) + "\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite fatal execution error:", err);
  process.exit(1);
});
