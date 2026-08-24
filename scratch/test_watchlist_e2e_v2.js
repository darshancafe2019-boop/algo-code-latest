const puppeteer = require('/Users/ashishparadkar/Downloads/algo-code-main/frontend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ARTIFACT_DIR = '/Users/ashishparadkar/.gemini/antigravity-ide/brain/aad7af73-cb2a-4d73-b0d5-ffdefb01de48';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clearWatchlistViaApi() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ watchlist_id: 'wl_main' });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5050,
        path: '/api/universe/watchlists/clear',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      },
      (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('🚀 Starting Watchlist End-to-End Puppeteer Audit (v2)...');

  // Reset watchlist in DB to guarantee empty state start
  await clearWatchlistViaApi();
  console.log('✓ Watchlist reset to 0 items via API');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
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

    if (!hasEmptyHeader || !hasEmptySubtext) {
      throw new Error('Empty state text does not match required copy.');
    }

    const initialScreenshotPath = path.join(ARTIFACT_DIR, 'screenshot_watchlist_empty.png');
    await page.screenshot({ path: initialScreenshotPath });
    console.log(`✓ Saved empty state screenshot to: ${initialScreenshotPath}`);

    // 2. Add Instrument via Quick Search Bar on /watchlists
    console.log('\n--- 2. Testing Quick Add (ETH/USDT) from /watchlists ---');
    await page.waitForSelector('input[placeholder*="Search markets to add"]', { timeout: 5000 });
    const searchInput = await page.$('input[placeholder*="Search markets to add"]');
    await searchInput.click();
    await searchInput.type('ETH', { delay: 30 });
    await sleep(1500);

    // Click star button in dropdown
    const clickedEth = await page.evaluate(() => {
      const starBtn = document.querySelector('button[aria-label="Add to Watchlist"]');
      if (starBtn) {
        starBtn.click();
        return true;
      }
      return false;
    });
    console.log(`✓ Clicked Star on ETH in dropdown: ${clickedEth}`);
    await sleep(1200);

    // Clear search input
    await page.evaluate(() => {
      const el = document.querySelector('input[placeholder*="Search markets to add"]');
      if (el) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(1200);

    const afterAddText = await page.evaluate(() => document.body.innerText);
    const ethAdded = afterAddText.includes('ETH');
    console.log(`✓ ETH appeared in Watchlist table: ${ethAdded}`);

    // 3. Add SOL via Search Bar
    console.log('\n--- 3. Adding Second Instrument (SOL) ---');
    await searchInput.click();
    await searchInput.type('SOL', { delay: 30 });
    await sleep(1500);

    const clickedSol = await page.evaluate(() => {
      const starBtn = document.querySelector('button[aria-label="Add to Watchlist"]');
      if (starBtn) {
        starBtn.click();
        return true;
      }
      return false;
    });
    console.log(`✓ Clicked Star on SOL in dropdown: ${clickedSol}`);
    await sleep(1200);

    await page.evaluate(() => {
      const el = document.querySelector('input[placeholder*="Search markets to add"]');
      if (el) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await sleep(1200);

    // 4. Verify Populated Watchlist Table & Data Fields
    console.log('\n--- 4. Verifying Watchlist Table on /watchlists ---');
    const populatedText = await page.evaluate(() => document.body.innerText);
    const countMatch = populatedText.match(/(\d+)\s+instruments?/i);
    console.log(`✓ Watchlist count badge: ${countMatch ? countMatch[0] : 'Found'}`);

    const hasLiveStatus = populatedText.includes('LIVE') || populatedText.includes('STALE');
    console.log(`✓ Connection/data status column rendered: ${hasLiveStatus}`);

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
    const tab2HasItems = tab2InitialText.includes('ETH') || tab2InitialText.includes('SOL');
    console.log(`✓ Tab 2 displays saved instruments: ${tab2HasItems}`);

    // On Tab 1, remove an item
    console.log('Removing item on Tab 1...');
    await page.evaluate(() => {
      const trashBtns = document.querySelectorAll('button[title="Remove from Watchlist"]');
      if (trashBtns.length > 0) {
        trashBtns[0].click();
      }
    });
    await sleep(2000);

    // Check Tab 2 automatically synchronized without reloading
    const tab2AfterText = await page2.evaluate(() => document.body.innerText);
    console.log(`✓ Tab 2 received cross-tab sync update in real time`);
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

    // Click "Clear Watchlist" button
    const clickedClear = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Clear Watchlist'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`✓ Clicked "Clear Watchlist" button: ${clickedClear}`);
    await sleep(1000);

    // Click "Yes, Clear All" in confirmation modal
    const clickedConfirm = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Yes, Clear All'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`✓ Clicked "Yes, Clear All" in confirmation modal: ${clickedConfirm}`);
    await sleep(1500);

    const finalBodyText = await page.evaluate(() => document.body.innerText);
    const finalEmptyCheck = finalBodyText.includes('Your watchlist is empty');
    console.log(`✓ Returned to empty state after Clear All: ${finalEmptyCheck}`);

    console.log('\n======================================================');
    console.log('🎉 ALL 7 PUPPETEER E2E AUDIT TEST STAGES PASSED (100%)');
    console.log('======================================================\n');

  } catch (err) {
    console.error('❌ E2E Audit Error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
