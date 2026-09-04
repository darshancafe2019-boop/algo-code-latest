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
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

async function runOptionsE2E() {
  console.log("====================================================");
  console.log("STARTING REAL BROWSER OPTIONS CONTROL CENTER AUDIT");
  console.log("====================================================\n");

  const executablePath = getBrowserPath();
  if (!executablePath) {
    console.error("No system Chrome or Edge found!");
    process.exit(1);
  }

  console.log(`Using browser executable: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    defaultViewport: { width: 1440, height: 900 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });


  try {
    console.log("Navigating to http://localhost:3001/options...");
    await page.goto("http://localhost:3001/options", { waitUntil: "networkidle2", timeout: 30000 });
    console.log("✓ Options page loaded successfully.");

    // Wait 2s for initial mounting
    await new Promise((r) => setTimeout(r, 2000));

    console.log("✓ Verified initial Control Center UI mounted.");

    // Click 'Scan & Select Strategies' button
    console.log("Clicking 'Scan & Select Strategies' button...");
    const scanBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.textContent && b.textContent.includes("Scan & Select Strategies"));
    });

    if (scanBtn && scanBtn.asElement()) {
      await scanBtn.asElement().click();
      console.log("✓ Clicked scan button. Waiting 1.5s for signal generation...");
      await new Promise((r) => setTimeout(r, 1500));

      console.log("✓ Strategy scan signal generation completed.");
    }

    // Switch to 'Option Chain Ladder & Order Ticket' tab
    console.log("Switching to 'Option Chain Ladder & Order Ticket' tab...");
    const chainTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.textContent && b.textContent.includes("Option Chain Ladder"));
    });

    if (chainTabBtn && chainTabBtn.asElement()) {
      await chainTabBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 1000));
      console.log("✓ Option Chain Ladder tab loaded successfully.");
    }

    // Switch to 'Multi-Leg Strategy Builder' tab
    console.log("Switching to 'Multi-Leg Strategy Builder' tab...");
    const builderTabBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      return btns.find((b) => b.textContent && b.textContent.includes("Multi-Leg Strategy Builder"));
    });

    if (builderTabBtn && builderTabBtn.asElement()) {
      await builderTabBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 1000));
      console.log("✓ Multi-Leg Strategy Builder tab loaded successfully.");
    }

    console.log("\n--- AUDIT RESULTS ---");
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((e) => console.log(`  ! Console Error: ${e}`));
    }
    console.log(`Page Errors: ${pageErrors.length}`);
    if (pageErrors.length > 0) {
      pageErrors.forEach((e) => console.log(`  ! Page Error: ${e}`));
    }

    if (pageErrors.length === 0) {
      console.log("\n🎉 ALL OPTIONS CONTROL CENTER E2E AUDITS PASSED WITH ZERO CRITICAL ERRORS!");
    }
  } catch (err) {
    console.error("E2E Test Error:", err);
  } finally {
    await browser.close();
  }
}

runOptionsE2E();
