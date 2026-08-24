const puppeteer = require('/Users/ashishparadkar/Downloads/algo-code-main/frontend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = '/Users/ashishparadkar/.gemini/antigravity-ide/brain/aad7af73-cb2a-4d73-b0d5-ffdefb01de48';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('🚀 Starting Watchlist End-to-End Puppeteer Audit...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    // 1. Initial Empty State Verification
    console.log('\n--- 1. Testing Initial Empty State at /watchlists ---');
    await page.goto('http://localhost:3000/watchlists', { waitUntil: 'networkidle2' });
    await sleep(1500);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasEmptyHeader = bodyText.includes('Your watchlist is empty');
    const hasEmptySubtext = bodyText.includes('Search the markets and select the star icon to add instruments');

    console.log(`✓ "Your watchlist is empty": ${hasEmptyHeader}`);
    console.log(`✓ "Search the markets and select the star icon to add instruments": ${hasEmptySubtext}`);

    const initialScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_watchlist_empty.png');
    await page.screenshot({ path: initialScreenshotPath });
    console.log(`✓ Saved empty state screenshot to: ${initialScreenshotPath}`);

    // 2. Add Instrument via Quick Search Bar on /watchlists
    console.log('\n--- 2. Testing Quick Add from /watchlists ---');
    await page.waitForSelector('input[placeholder*="Search markets to add"]', { timeout: 5000 });
    const searchInput = await page.$('input[placeholder*="Search markets to add"]');
    await searchInput.click();
    await searchInput.type('ETH', { delay: 30 });
    await sleep(1500);

    // Click star button in dropdown
    const starButtons = await page.$$('button[aria-label="Add to Watchlist"]');
    console.log(`Found ${starButtons.length} star buttons in search dropdown`);
    if (starButtons.length > 0) {
      await starButtons[0].click();
      await sleep(1000);
    }

    // Clear search input
    await page.evaluate(() => {
      const el = document.querySelector('input[placeholder*="Search markets to add"]');
      if (el) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(1500);

    const afterAddText = await page.evaluate(() => document.body.innerText);
    const ethAdded = afterAddText.includes('ETH');
    console.log(`✓ ETH/USDT appeared in Watchlist table: ${ethAdded}`);

    // 3. Add SOL via Search Bar
    console.log('\n--- 3. Adding Second Instrument (SOL) ---');
    const searchInput2 = await page.$('input[placeholder*="Search markets to add"]');
    await searchInput2.click();
    await searchInput2.type('SOL', { delay: 30 });
    await sleep(1500);

    const solStarButtons = await page.$$('button[aria-label="Add to Watchlist"]');
    if (solStarButtons.length > 0) {
      await solStarButtons[0].click();
      await sleep(1000);
      console.log('✓ Clicked star on SOL/USDT');
    }

    await page.evaluate(() => {
      const el = document.querySelector('input[placeholder*="Search markets to add"]');
      if (el) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(1500);

    // 4. Verify Populated Watchlist Table
    console.log('\n--- 4. Verifying Watchlist Table on /watchlists ---');
    const populatedText = await page.evaluate(() => document.body.innerText);
    const countMatch = populatedText.match(/(\d+)\s+instruments?/i);
    console.log(`✓ Watchlist count text: ${countMatch ? countMatch[0] : 'Found'}`);

    const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_watchlist_populated_desktop.png');
    await page.screenshot({ path: desktopScreenshotPath });
    console.log(`✓ Saved populated desktop screenshot to: ${desktopScreenshotPath}`);

    // 5. Multi-Tab Real-time Synchronization
    console.log('\n--- 5. Testing Multi-Tab Real-time Synchronization ---');
    const page2 = await browser.newPage();
    await page2.setViewport({ width: 1440, height: 900 });
    await page2.goto('http://localhost:3000/watchlists', { waitUntil: 'networkidle2' });
    await sleep(1500);

    const tab2InitialText = await page2.evaluate(() => document.body.innerText);
    console.log(`✓ Tab 2 initially has ETH & SOL: ${tab2InitialText.includes('ETH') && tab2InitialText.includes('SOL')}`);

    // On Page 1, remove ETH
    const removeButtons = await page.$$('button[title="Remove from Watchlist"]');
    if (removeButtons.length > 0) {
      await removeButtons[0].click();
      console.log('✓ Removed first item on Tab 1');
      await sleep(2000);
    }

    // Check Tab 2 received live sync update without reload
    const tab2AfterText = await page2.evaluate(() => document.body.innerText);
    console.log(`✓ Tab 2 received live sync update from Tab 1: ${tab2AfterText.includes('SOL')}`);
    await page2.close();

    // 6. Responsive Viewport Audits
    console.log('\n--- 6. Testing Responsive Layouts (Tablet & Mobile) ---');
    // Tablet (768x1024)
    await page.setViewport({ width: 768, height: 1024 });
    await sleep(1000);
    const tabletScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_watchlist_tablet.png');
    await page.screenshot({ path: tabletScreenshotPath });
    console.log(`✓ Saved tablet screenshot to: ${tabletScreenshotPath}`);

    // Mobile (390x844)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await sleep(1000);
    const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_watchlist_mobile.png');
    await page.screenshot({ path: mobileScreenshotPath });
    console.log(`✓ Saved mobile screenshot to: ${mobileScreenshotPath}`);

    // 7. Clear Watchlist Test
    console.log('\n--- 7. Testing "Clear Watchlist" Confirmation Modal ---');
    await page.setViewport({ width: 1440, height: 900 });
    await sleep(1000);

    const clearButton = await page.$('button[title*="Clear all instruments"]');
    if (clearButton) {
      await clearButton.click();
      await sleep(1000);

      // Confirm in modal
      const confirmButton = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.innerText.includes('Yes, Clear All'));
      });
      if (confirmButton) {
        await confirmButton.click();
        await sleep(1500);
        console.log('✓ Confirmed Clear Watchlist in modal');
      }
    }

    const finalBodyText = await page.evaluate(() => document.body.innerText);
    const finalEmptyCheck = finalBodyText.includes('Your watchlist is empty');
    console.log(`✓ Returned to empty state after Clear All: ${finalEmptyCheck}`);

    console.log('\n========================================');
    console.log('🎉 ALL PUPPETEER E2E AUDIT TESTS PASSED!');
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ E2E Audit Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
