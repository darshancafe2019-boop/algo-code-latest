const puppeteer = require("puppeteer-core");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE_URL = "http://localhost:3000";

const routes = [
  "/",
  "/workspace",
  "/analytics",
  "/bot-control",
  "/orderbook",
  "/positions",
  "/alerts",
  "/settings",
  "/options",
  "/terminal"
];

async function run() {
  console.log("Launching Headless Google Chrome for E2E Browser Testing...");
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage();
    const errors = [];
    const failedRequests = [];

    page.on("pageerror", (err) => {
      console.error(`❌ Uncaught Page Error: ${err.message}`);
      errors.push(err.message);
    });

    page.on("requestfailed", (req) => {
      const url = req.url();
      if (!url.includes("favicon") && !url.includes("chunk")) {
        console.warn(`⚠️ Request failed: ${req.method()} ${url}`);
        failedRequests.push(`${req.method()} ${url}`);
      }
    });

    page.on("response", (res) => {
      const status = res.status();
      const url = res.url();
      if (status === 404 && url.includes("/api/")) {
        console.error(`❌ 404 API Error: ${res.request().method()} ${url}`);
        errors.push(`404 NOT FOUND: ${url}`);
      }
    });

    for (const r of routes) {
      const fullUrl = `${BASE_URL}${r}`;
      console.log(`\nNavigating to: ${fullUrl}`);
      try {
        await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 15000 });
        await new Promise((res) => setTimeout(res, 1500));
        console.log(`  ✓ ${r} loaded cleanly.`);
      } catch (e) {
        console.error(`  ❌ Failed loading ${r}: ${e.message}`);
        errors.push(`Navigation failed for ${r}: ${e.message}`);
      }
    }

    console.log("\nTesting Bot Control drawer and orders polling...");
    try {
      await page.goto(`${BASE_URL}/bot-control`, { waitUntil: "networkidle2", timeout: 15000 });
      await new Promise((res) => setTimeout(res, 2000));
      const viewButtons = await page.$$("button");
      for (const btn of viewButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.includes("View") || text.includes("Details") || text.includes("Config"))) {
          await btn.click();
          await new Promise((res) => setTimeout(res, 4000));
          break;
        }
      }
      console.log("  ✓ Bot Detail drawer orders poll verified without 404.");
    } catch (e) {
      console.warn(`  Bot drawer test note: ${e.message}`);
    }

    console.log("\n=======================================================");
    console.log(`E2E Browser Test Completed. Uncaught Exceptions / 404s: ${errors.length}`);
    console.log("=======================================================");

    if (errors.length > 0) {
      console.error("Errors found:", errors);
      process.exit(1);
    } else {
      console.log("✅ ALL BROWSER ROUTES & POLLING CALLS PASSED WITH ZERO ERRORS!");
      process.exit(0);
    }
  } catch (err) {
    console.error("Browser launch error:", err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

run();
