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
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

async function verifyNoOfflineBanner() {
  const browserPath = getBrowserPath();
  if (!browserPath) {
    console.error("No browser found");
    process.exit(1);
  }

  console.log(`[+] Launching browser from ${browserPath}...`);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const consoleMessages = [];
    page.on("console", msg => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    console.log("[+] Navigating to http://localhost:3100/ ...");
    await page.goto("http://localhost:3100/", { waitUntil: "networkidle2", timeout: 30000 });

    // Wait 4 seconds for liveness probe and initial queries to settle
    await new Promise(r => setTimeout(r, 4000));

    // Check DOM for offline banner
    const pageContent = await page.content();
    const hasOfflineBannerText = pageContent.includes("BACKEND UNAVAILABLE — RECONNECTING SAFELY") ||
                                 pageContent.includes("Fail-Closed Protection Active");

    console.log(`[+] Page Title: ${await page.title()}`);
    console.log(`[+] Offline Banner Present: ${hasOfflineBannerText ? "YES (FAIL)" : "NO (PASS)"}`);

    // Check status pill in top command bar if present
    const statusPillText = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="connection-status"], .status-indicator, [title*="Backend"]');
      return el ? el.textContent : "Not found";
    });
    console.log(`[+] Status element text: ${statusPillText}`);

    if (hasOfflineBannerText) {
      console.error("[!] FAILURE: Offline banner is still present on http://localhost:3100/");
      process.exit(1);
    } else {
      console.log("[✓] SUCCESS: No false offline banner detected! Terminal is healthy.");
    }
  } finally {
    await browser.close();
  }
}

verifyNoOfflineBanner().catch(err => {
  console.error("Error running test:", err);
  process.exit(1);
});
