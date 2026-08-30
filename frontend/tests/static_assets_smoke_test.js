#!/usr/bin/env node
/**
 * Quant.OS Next.js Static Asset & Chunk Integrity Smoke Test
 * ==========================================================
 * Verifies that all referenced /_next/static CSS & JS chunks:
 * 1. Return HTTP 200 OK.
 * 2. Return accurate Content-Type headers (text/css or application/javascript).
 * 3. Never return an HTML fallback or 404/500 error page.
 * 4. Verify across multiple application routes.
 */

const http = require("http");
const { URL } = require("url");

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const TEST_ROUTES = ["/", "/options", "/crypto", "/scanner", "/trade-journal"];

function fetchUrl(targetUrl, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          "User-Agent": "QuantOS-StaticAssetSmokeTest/1.0",
          Accept: "*/*",
          ...headers,
        },
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: rawData,
          });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.setTimeout(35000, () => {
      req.destroy(new Error(`Timeout fetching ${targetUrl}`));
    });
    req.end();
  });
}

function extractStaticAssetUrls(html, baseUrl) {
  const assetUrls = new Set();

  // 1. Match script src="/_next/static/..."
  const scriptRegex = /<script[^>]+src=["'](\/_next\/static\/[^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    assetUrls.add(new URL(match[1], baseUrl).toString());
  }

  // 2. Match link rel="stylesheet" href="/_next/static/..."
  const cssRegex = /<link[^>]+href=["'](\/_next\/static\/[^"']+)["'][^>]*>/gi;
  while ((match = cssRegex.exec(html)) !== null) {
    assetUrls.add(new URL(match[1], baseUrl).toString());
  }

  // 3. Match preload links
  const preloadRegex = /<link[^>]+href=["'](\/_next\/static\/[^"']+)["'][^>]*rel=["'](?:preload|modulepreload)["']/gi;
  while ((match = preloadRegex.exec(html)) !== null) {
    assetUrls.add(new URL(match[1], baseUrl).toString());
  }

  // 4. Match any raw /_next/static chunk references embedded in HTML scripts
  const rawStaticRegex = /["'](\/_next\/static\/(?:chunks|css|media)\/[^"']+\.(?:js|css))["']/gi;
  while ((match = rawStaticRegex.exec(html)) !== null) {
    assetUrls.add(new URL(match[1], baseUrl).toString());
  }

  return Array.from(assetUrls);
}

async function runSmokeTest() {
  console.log("\n============================================================");
  console.log("  QUANT.OS NEXT.JS STATIC ASSETS & CHUNKS SMOKE TEST");
  console.log(`  Target Host: ${BASE_URL}`);
  console.log("============================================================\n");

  let totalAssetsTested = 0;
  let passedAssets = 0;
  const failures = [];
  const testedAssetUrls = new Set();

  for (const route of TEST_ROUTES) {
    const pageUrl = `${BASE_URL}${route}`;
    process.stdout.write(`[*] Checking route ${route.padEnd(16)} ... `);

    let pageRes;
    try {
      pageRes = await fetchUrl(pageUrl, { Accept: "text/html" });
    } catch (err) {
      console.log(`\x1b[31mFAILED (Cannot connect: ${err.message})\x1b[0m`);
      failures.push({ url: pageUrl, error: `Connection failed: ${err.message}` });
      continue;
    }

    if (pageRes.statusCode !== 200) {
      console.log(`\x1b[31mFAILED (HTTP ${pageRes.statusCode})\x1b[0m`);
      failures.push({ url: pageUrl, error: `Page returned HTTP ${pageRes.statusCode}` });
      continue;
    }

    const assets = extractStaticAssetUrls(pageRes.body, BASE_URL);
    console.log(`\x1b[32mOK (HTTP 200, ${assets.length} assets discovered)\x1b[0m`);

    for (const assetUrl of assets) {
      if (testedAssetUrls.has(assetUrl)) continue;
      testedAssetUrls.add(assetUrl);
      totalAssetsTested++;

      const isCss = assetUrl.endsWith(".css") || assetUrl.includes("/css/");
      const isJs = assetUrl.endsWith(".js") || assetUrl.includes("/chunks/");

      try {
        const assetRes = await fetchUrl(assetUrl);
        const contentType = (assetRes.headers["content-type"] || "").toLowerCase();

        // 1. Status must be 200
        if (assetRes.statusCode !== 200) {
          failures.push({
            url: assetUrl,
            error: `HTTP ${assetRes.statusCode} (Expected 200 OK)`,
          });
          continue;
        }

        // 2. Must not be HTML fallback
        if (contentType.includes("text/html") || assetRes.body.trim().startsWith("<!DOCTYPE") || assetRes.body.trim().startsWith("<html")) {
          failures.push({
            url: assetUrl,
            error: `Returned HTML document instead of static chunk (Content-Type: ${contentType})`,
          });
          continue;
        }

        // 3. Validate content type
        if (isCss && !contentType.includes("text/css")) {
          failures.push({
            url: assetUrl,
            error: `CSS file returned non-CSS Content-Type: ${contentType}`,
          });
          continue;
        }

        if (isJs && !contentType.includes("javascript") && !contentType.includes("octet-stream")) {
          failures.push({
            url: assetUrl,
            error: `JavaScript file returned invalid Content-Type: ${contentType}`,
          });
          continue;
        }

        passedAssets++;
      } catch (err) {
        failures.push({
          url: assetUrl,
          error: `Network fetch error: ${err.message}`,
        });
      }
    }
  }

  console.log("\n------------------------------------------------------------");
  console.log(`  Static Asset Verification Summary:`);
  console.log(`  Total Unique Assets Verified: ${totalAssetsTested}`);
  console.log(`  Passed Assets (HTTP 200 OK) : ${passedAssets}`);
  console.log(`  Failed Assets               : ${failures.length}`);
  console.log("------------------------------------------------------------\n");

  if (failures.length > 0) {
    console.error("\x1b[31m[!] STATIC ASSET SMOKE TEST FAILED with errors:\x1b[0m");
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. ${f.url}`);
      console.error(`     -> Error: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log("\x1b[32m[+] SUCCESS: All static CSS & JS chunks resolved with HTTP 200 and valid MIME types.\x1b[0m\n");
    process.exit(0);
  }
}

runSmokeTest();
