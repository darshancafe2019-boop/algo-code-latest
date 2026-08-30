const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

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
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return "chrome";
}

const routesToTest = [
  "/",
  "/dashboard",
  "/markets",
  "/options",
  "/crypto",
  "/crypto/futures",
  "/crypto/options",
  "/crypto/options-chain",
  "/scanner",
  "/settings",
  "/settings/brokers",
  "/strategies",
  "/strategy-builder",
  "/trade-journal",
  "/system-health",
  "/diagnostics",
  "/logs",
  "/orders",
  "/positions",
  "/pnl",
  "/risk",
  "/watchlists",
  "/indicators",
  "/backtest",
  "/bots",
  "/live-trading",
  "/paper-trading",
  "/nse",
  "/option-chain",
  "/providers",
  "/orderbook"
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage();
  
  const errors = [];

  page.on("pageerror", (err) => {
    console.error("[PAGE_ERROR]", err.message, err.stack);
    errors.push({ type: "pageerror", message: err.message, stack: err.stack });
  });

  page.on("error", (err) => {
    console.error("[ERROR]", err.message);
    errors.push({ type: "error", message: err.message });
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[CONSOLE_ERROR]", msg.text());
      errors.push({ type: "console_error", text: msg.text() });
    }
  });

  for (const r of routesToTest) {
    console.log(`Checking http://localhost:3100${r}...`);
    try {
      const res = await page.goto(`http://localhost:3100${r}`, {
        waitUntil: "networkidle2",
        timeout: 15000
      });
      console.log(`  Status: ${res ? res.status() : 'null'}`);
      await new Promise(res => setTimeout(res, 1000));
    } catch (e) {
      console.error(`  Failed on ${r}: ${e.message}`);
    }
  }

  await browser.close();

  console.log("\n==========================================");
  console.log(`TOTAL ERRORS CAUGHT: ${errors.length}`);
  if (errors.length > 0) {
    console.log(JSON.stringify(errors, null, 2));
  }
  console.log("==========================================");
}

run().catch(console.error);
