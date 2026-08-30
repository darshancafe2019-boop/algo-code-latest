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

async function captureScreenshots() {
  const artifactDir = "C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\059e8ae9-b1ec-4c9a-9c83-24ea329d5482";
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const pagesToCapture = [
    { url: "http://localhost:3100/", filename: "screenshot_home.png" },
    { url: "http://localhost:3100/options", filename: "screenshot_options.png" },
    { url: "http://localhost:3100/crypto", filename: "screenshot_crypto.png" },
    { url: "http://localhost:3100/settings/brokers", filename: "screenshot_settings.png" }
  ];

  for (const item of pagesToCapture) {
    console.log(`Navigating to ${item.url}...`);
    try {
      await page.goto(item.url, { waitUntil: "networkidle2", timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      const destPath = path.join(artifactDir, item.filename);
      await page.screenshot({ path: destPath, fullPage: false });
      console.log(`Saved screenshot to ${destPath}`);
    } catch (e) {
      console.error(`Failed capturing ${item.url}: ${e.message}`);
    }
  }

  await browser.close();
  console.log("Screenshot capture complete!");
}

captureScreenshots().catch(console.error);
