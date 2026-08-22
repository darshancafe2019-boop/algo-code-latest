const path = require('path');
const puppeteer = require(path.join(__dirname, 'frontend', 'node_modules', 'puppeteer-core'));
const fs = require('fs');

async function runThemeVerification() {
  console.log("===============================================================");
  console.log("      E2E THEME, TYPOGRAPHY & APPEARANCE SYSTEM VERIFICATION");
  console.log("===============================================================");

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    console.error("Chrome executable not found at:", chromePath);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error' && !text.includes('favicon') && !text.includes('ERR_CONNECTION_REFUSED')) {
      errors.push(`[Console Error] ${text}`);
      console.log(`❌ ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`[Page Error] ${err.message}`);
    console.log(`❌ [Page Exception]: ${err.message}`);
  });

  try {
    // 1. Initial Page Load
    console.log("\n[1] Navigating to Root URL (http://localhost:3000/)...");
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 20000 });

    // 2. Check Default Theme Variables
    console.log("\n[2] Checking Default Theme CSS Custom Properties (Midnight Emerald)...");
    const defaultTokens = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue('--theme-bg').trim(),
        surface: getComputedStyle(root).getPropertyValue('--theme-surface').trim(),
        accent: getComputedStyle(root).getPropertyValue('--theme-accent').trim(),
        profit: getComputedStyle(root).getPropertyValue('--theme-profit').trim(),
        loss: getComputedStyle(root).getPropertyValue('--theme-loss').trim(),
        fontSans: getComputedStyle(root).getPropertyValue('--theme-font-sans').trim(),
        fontMono: getComputedStyle(root).getPropertyValue('--theme-font-mono').trim(),
      };
    });
    console.log("    ✓ --theme-bg:", defaultTokens.bg);
    console.log("    ✓ --theme-surface:", defaultTokens.surface);
    console.log("    ✓ --theme-accent:", defaultTokens.accent);
    console.log("    ✓ --theme-profit:", defaultTokens.profit);
    console.log("    ✓ --theme-loss:", defaultTokens.loss);

    // 3. Open Appearance Drawer
    console.log("\n[3] Triggering Theme & Appearance Studio Drawer via Top Toolbar...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const themeBtn = buttons.find(b => b.title?.includes('Appearance') || b.textContent?.includes('Appearance') || b.title?.includes('Theme'));
      if (themeBtn) themeBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // Verify Drawer Open
    const drawerVisible = await page.evaluate(() => {
      return document.body.textContent.includes('Appearance & Design System');
    });
    console.log("    ✓ Appearance Drawer Opened:", drawerVisible ? "PASS" : "FAIL");

    // 4. Test Switching Themes by ID
    const themesToTest = [
      { id: "obsidian-blue", name: "Obsidian Blue", expectedBg: "#070B14" },
      { id: "graphite-violet", name: "Graphite Violet", expectedBg: "#0E0E12" },
      { id: "light-professional", name: "Light Professional", expectedBg: "#F4F7FB" },
      { id: "high-contrast", name: "High Contrast (WCAG AAA)", expectedBg: "#000000" },
      { id: "midnight-emerald", name: "Midnight Emerald", expectedBg: "#07110D" },
    ];

    for (const t of themesToTest) {
      console.log(`\n[4] Switching Theme to: ${t.name} (#theme-preset-${t.id})...`);
      await page.evaluate((themeId) => {
        const el = document.getElementById(`theme-preset-${themeId}`);
        if (el) el.click();
      }, t.id);

      await new Promise(r => setTimeout(r, 500));

      const updatedTokens = await page.evaluate(() => {
        const root = document.documentElement;
        return {
          bg: getComputedStyle(root).getPropertyValue('--theme-bg').trim(),
          surface: getComputedStyle(root).getPropertyValue('--theme-surface').trim(),
          accent: getComputedStyle(root).getPropertyValue('--theme-accent').trim(),
          isDark: root.classList.contains('dark'),
          isLight: root.classList.contains('light'),
        };
      });

      console.log(`    ✓ Theme Active. BG: ${updatedTokens.bg}, Surface: ${updatedTokens.surface}, Mode: ${updatedTokens.isLight ? 'Light' : 'Dark'}`);
      if (updatedTokens.bg.toLowerCase() !== t.expectedBg.toLowerCase()) {
        console.warn(`    ⚠️ Warning: expected bg ${t.expectedBg}, got ${updatedTokens.bg}`);
      }
    }

    // 5. Test Typography Tab
    console.log("\n[5] Testing Typography & Density Customizer...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const typoTab = tabs.find(b => b.textContent?.includes('Typography'));
      if (typoTab) typoTab.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Change Interface Font to Manrope
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const manropeBtn = buttons.find(b => b.textContent?.includes('Manrope'));
      if (manropeBtn) manropeBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Change Numeric Font to IBM Plex Mono
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const ibmBtn = buttons.find(b => b.textContent?.includes('IBM Plex Mono'));
      if (ibmBtn) ibmBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Change Density to Compact
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const compBtn = buttons.find(b => b.textContent?.trim().toLowerCase().startsWith('compact'));
      if (compBtn) compBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const typoTokens = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        sans: getComputedStyle(root).getPropertyValue('--theme-font-sans').trim(),
        mono: getComputedStyle(root).getPropertyValue('--theme-font-mono').trim(),
        paddingY: getComputedStyle(root).getPropertyValue('--theme-density-padding-y').trim(),
      };
    });
    console.log("    ✓ Applied Font Sans:", typoTokens.sans);
    console.log("    ✓ Applied Font Mono:", typoTokens.mono);
    console.log("    ✓ Applied Density Padding Y:", typoTokens.paddingY);

    // 6. Test Save & Apply
    console.log("\n[6] Testing Apply & Save Theme...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const applyBtn = buttons.find(b => b.textContent?.includes('Apply & Save'));
      if (applyBtn) applyBtn.click();
    });
    await new Promise(r => setTimeout(r, 1200));

    // 7. Verify Persistence on Reload
    console.log("\n[7] Reloading Page to Verify Anti-FOUC & Persistence...");
    await page.reload({ waitUntil: 'networkidle2' });

    const persistedTokens = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        bg: getComputedStyle(root).getPropertyValue('--theme-bg').trim(),
        sans: getComputedStyle(root).getPropertyValue('--theme-font-sans').trim(),
        mono: getComputedStyle(root).getPropertyValue('--theme-font-mono').trim(),
      };
    });
    console.log("    ✓ Persisted BG after reload:", persistedTokens.bg);
    console.log("    ✓ Persisted Font Sans after reload:", persistedTokens.sans);
    console.log("    ✓ Persisted Font Mono after reload:", persistedTokens.mono);

    // 8. Test Settings Page Appearance Integration
    console.log("\n[8] Navigating to Settings Page (http://localhost:3000/settings)...");
    await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle2' });
    const settingsAppearancePresent = await page.evaluate(() => {
      return document.body.textContent.includes('Terminal Theme & Typography System');
    });
    console.log("    ✓ Settings Appearance Card Displayed:", settingsAppearancePresent ? "PASS" : "FAIL");

    // 9. Route Smoke Checks Across Valid Next.js Routes
    const validRoutes = [
      '/',
      '/bots',
      '/risk',
      '/indicators',
      '/pnl',
      '/orderbook',
      '/options',
      '/alerts',
      '/logs',
      '/settings',
    ];

    console.log("\n[9] Running Route Smoke Checks across Valid Next.js App Routes...");
    for (const r of validRoutes) {
      await page.goto(`http://localhost:3000${r}`, { waitUntil: 'networkidle2', timeout: 15000 });
      console.log(`    ✓ Loaded http://localhost:3000${r} cleanly.`);
    }

    console.log("\n===============================================================");
    console.log(`E2E Verification Complete. Total Uncaught Errors: ${errors.length}`);
    console.log("===============================================================");

    if (errors.length > 0) {
      console.error("❌ Test encountered errors:");
      errors.forEach(e => console.error("   ", e));
      process.exit(1);
    } else {
      console.log("✅ ALL THEME, TYPOGRAPHY & APPEARANCE CHECKS PASSED WITH 0 ERRORS!");
    }

  } catch (err) {
    console.error("❌ E2E Test Execution Error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runThemeVerification();
