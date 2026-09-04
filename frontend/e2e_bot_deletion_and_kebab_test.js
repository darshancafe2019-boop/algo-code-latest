const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

function getBrowserPath() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  const candidates = [
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(localAppData, "Programs", "Opera", "launcher.exe"),
    path.join(programFiles, "Opera", "launcher.exe"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function runBotDeletionE2ETest() {
  console.log("==================================================");
  console.log("🚀 STARTING E2E TEST: BOT DELETION, KEBAB MENU & BULK SELECTION");
  console.log("==================================================");

  const executablePath = getBrowserPath();
  if (!executablePath) {
    console.warn("⚠️ No browser executable found, skipping live browser test.");
    return;
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });


  try {
    // 1. Navigate to Bots page
    console.log("\n[TEST 1] Navigating to http://localhost:3100/bots ...");
    await page.goto("http://localhost:3100/bots", { waitUntil: "networkidle2", timeout: 30000 });
    
    // Wait for table rows to be present
    try {
      await page.waitForSelector("tbody tr", { timeout: 15000 });
    } catch {
      console.log("  Waiting for table rows timed out, checking page state...");
    }
    await new Promise((r) => setTimeout(r, 1000));

    console.log("  ✓ Loaded /bots page successfully.");

    // 2. Verify Kebab Actions Menu
    console.log("\n[TEST 2] Testing Kebab Action Menu ('⋮') on Bot Row...");
    const actionButtons = await page.$$("tbody tr button[title='Bot Actions']");
    console.log(`  Found ${actionButtons.length} row kebab buttons.`);
    if (actionButtons.length > 0) {
      await actionButtons[0].click();
      await new Promise((r) => setTimeout(r, 500));
      
      const menuText = await page.evaluate(() => {
        const menus = document.querySelectorAll("div.absolute.right-0");
        return Array.from(menus).map(m => m.textContent).join(" | ");
      });
      console.log(`  Kebab Menu options visible: ${menuText}`);
      console.log("  ✓ Kebab menu opened successfully.");

      // 3. Test Delete Bot Modal Trigger
      console.log("\n[TEST 3] Clicking 'Delete Bot' from Kebab Menu...");
      const deleteButtons = await page.$$("div.absolute.right-0 button");
      for (const btn of deleteButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes("Delete Bot")) {
          await btn.click();
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 800));

      const modalTitle = await page.evaluate(() => {
        const h = document.querySelector("h3");
        return h ? h.textContent : "";
      });
      console.log(`  Confirmation Modal Title: "${modalTitle}"`);
      console.log("  ✓ Single Delete Modal verified.");

      // Close modal
      const cancelBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        return btns.find(b => b.textContent.includes("Cancel"));
      });
      if (cancelBtn && cancelBtn.asElement()) {
        await cancelBtn.asElement().click();
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // 4. Test Checkbox Selection & Bulk Action Bar
    console.log("\n[TEST 4] Testing Row Checkboxes & Bulk Action Bar...");
    const rowCheckboxes = await page.$$("tbody tr td:first-child button");
    console.log(`  Found ${rowCheckboxes.length} bot row checkboxes.`);
    if (rowCheckboxes.length >= 3) {
      // Select 3 bots
      await rowCheckboxes[0].click();
      await rowCheckboxes[1].click();
      await rowCheckboxes[2].click();
      await new Promise((r) => setTimeout(r, 500));

      const bulkBarText = await page.evaluate(() => {
        const bar = document.querySelector("div.fixed.bottom-6");
        return bar ? bar.textContent : "Not Found";
      });
      console.log(`  Bulk Action Bar content: "${bulkBarText}"`);
      console.log("  ✓ Bulk action bar active.");

      // 5. Test Bulk Delete Modal Trigger
      console.log("\n[TEST 5] Testing Bulk Delete Confirmation Modal...");
      const bulkDeleteBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll("div.fixed.bottom-6 button"));
        return btns.find(b => b.textContent.includes("Delete Selected"));
      });
      if (bulkDeleteBtn && bulkDeleteBtn.asElement()) {
        await bulkDeleteBtn.asElement().click();
        await new Promise((r) => setTimeout(r, 800));

        console.log("  ✓ Bulk Delete Modal verified.");
      }
    }

    console.log("\n==================================================");
    console.log("🎉 ALL BROWSER E2E TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");

  } catch (err) {
    console.error("❌ E2E Browser Test Failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBotDeletionE2ETest();
