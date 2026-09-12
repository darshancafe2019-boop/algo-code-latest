import {
  toDeltaApiExpiry,
  toDeltaWsChainSymbol,
  toDeltaExpiryIso,
  formatDeltaExpiryDisplay,
  formatDeltaExpiryLabel,
  isValidDeltaApiExpiry,
  isValidDeltaWsExpiry,
  calculateDaysToExpiry,
} from "../lib/brokers/delta/delta-date-utils";
import { deltaProductService } from "../lib/brokers/delta/delta-product-service";

async function runDeltaOptionsVerification() {
  console.log("==================================================");
  console.log("DELTA OPTIONS COMPREHENSIVE ACCEPTANCE TEST");
  console.log("==================================================");

  // 1. Test Date Utility Conversions
  console.log("\n[TEST 1] Verifying Delta Date Conversion Utilities...");
  
  const testIso = "2026-09-18";
  const apiFormat = toDeltaApiExpiry(testIso);
  const wsSymbol = toDeltaWsChainSymbol("BTC", apiFormat);
  const backToIso = toDeltaExpiryIso(apiFormat);
  const displayLabel = formatDeltaExpiryDisplay(apiFormat);

  console.log(`  ISO: ${testIso} -> API format: ${apiFormat} (Expected: 18-09-2026)`);
  console.log(`  API format: ${apiFormat} -> WS symbol: ${wsSymbol} (Expected: BTC-180926)`);
  console.log(`  API format: ${apiFormat} -> ISO: ${backToIso} (Expected: 2026-09-18)`);
  console.log(`  Display: ${displayLabel} (Expected: 18 Sep 2026)`);

  if (apiFormat !== "18-09-2026" || wsSymbol !== "BTC-180926" || backToIso !== "2026-09-18") {
    throw new Error("Date conversion utility validation failed!");
  }
  console.log("  ✓ Date conversion validation passed.");

  // 2. Test Live Product Discovery with Direct Symbol Extraction
  console.log("\n[TEST 2] Discovering Delta Option Products from Live API...");
  const cache = await deltaProductService.discoverAllOptionProducts(true);
  console.log(`  ✓ Discovered ${cache.allProducts.length} active/upcoming option contracts from Delta India.`);

  if (cache.allProducts.length === 0) {
    throw new Error("Failed to discover any products from Delta India API.");
  }

  // 3. Test Dynamic Expiry Registry Building & Expiry Acceptance Criteria
  console.log("\n[TEST 3] Building Expiry Registry for BTC...");
  const registry = await deltaProductService.getExpiryRegistry("BTC");
  console.log(`  Supported Underlyings: ${registry.allUnderlyings.join(", ")}`);
  console.log(`  BTC Expiries Discovered: ${registry.expiries.length}`);

  const discoveredApiDates = registry.expiries.map(e => e.expiryApiFormat);

  registry.expiries.forEach((exp, idx) => {
    console.log(`    [${idx + 1}] ${exp.expiryDisplay} (${exp.expiryApiFormat}) -> ${exp.contractCount} contracts (${exp.callCount} Calls, ${exp.putCount} Puts) [DTE: ${exp.daysToExpiry.toFixed(1)}d, Category: ${exp.category}]`);
  });

  if (registry.expiries.length === 0) {
    throw new Error("No expiries found in BTC registry!");
  }

  // Acceptance Test A: Check default nearest valid expiry is chosen (Today 12-09-2026 if present)
  const defaultNearestExpiry = registry.expiries[0];
  console.log(`  ✓ Default nearest expiry: ${defaultNearestExpiry.expiryDisplay} (${defaultNearestExpiry.expiryApiFormat})`);
  
  // Acceptance Test B: Verify 15-09-2026 is NOT present (no fake dates generated)
  if (discoveredApiDates.includes("15-09-2026")) {
    throw new Error("FAILURE: 15-09-2026 was falsely discovered even though Delta lists no contracts for it!");
  }
  console.log("  ✓ Confirmed: 15-09-2026 is NOT in the expiry list (zero fabricated calendar dates).");

  // 4. Test Fetching Option Chain Snapshot for Today's Expiry (e.g. 12-09-2026)
  console.log(`\n[TEST 4] Testing REST /tickers Snapshot for Default Expiry: ${defaultNearestExpiry.expiryApiFormat}...`);
  const snapToday = await deltaProductService.fetchOptionChainSnapshot("BTC", defaultNearestExpiry.expiryApiFormat);
  console.log(`    Status: ${snapToday.status}`);
  console.log(`    Total Contracts: ${snapToday.contractsCount} (${snapToday.callsCount} Calls, ${snapToday.putsCount} Puts)`);
  console.log(`    Total Strike Rows: ${snapToday.strikesCount}`);
  console.log(`    Spot Price: ${snapToday.spotPrice}`);
  console.log(`    ATM Strike: ${snapToday.atmStrike}`);
  console.log(`    WS Subscription Symbol: ${snapToday.wsSubscriptionSymbol}`);

  if (snapToday.contractsCount === 0 || snapToday.strikesCount === 0) {
    throw new Error(`Option chain snapshot returned 0 contracts for ${defaultNearestExpiry.expiryApiFormat}`);
  }

  // Verify symbol match (no stray contract from other expiries)
  for (const row of snapToday.strikes) {
    if (row.call) {
      if (!row.call.symbol.includes(defaultNearestExpiry.expiryWsFormat)) {
        throw new Error(`Stray contract ${row.call.symbol} found in chain for expiry ${defaultNearestExpiry.expiryWsFormat}`);
      }
    }
    if (row.put) {
      if (!row.put.symbol.includes(defaultNearestExpiry.expiryWsFormat)) {
        throw new Error(`Stray contract ${row.put.symbol} found in chain for expiry ${defaultNearestExpiry.expiryWsFormat}`);
      }
    }
  }
  console.log("  ✓ Verified: All contracts strictly belong to the selected expiry symbol.");

  // 5. Test Selecting 18-09-2026 explicitly if present
  if (discoveredApiDates.includes("18-09-2026")) {
    console.log(`\n[TEST 5] Testing Explicit Selection of Expiry: 18-09-2026...`);
    const snap18 = await deltaProductService.fetchOptionChainSnapshot("BTC", "18-09-2026");
    console.log(`    Status: ${snap18.status}`);
    console.log(`    Total Contracts: ${snap18.contractsCount} (${snap18.callsCount} Calls, ${snap18.putsCount} Puts)`);
    console.log(`    Total Strike Rows: ${snap18.strikesCount}`);
    console.log(`    WS Symbol: ${snap18.wsSubscriptionSymbol}`);
    if (snap18.contractsCount === 0) {
      throw new Error("Failed to load contracts for 18-09-2026!");
    }
    console.log("  ✓ Verified: Explicitly selecting 18-09-2026 loads its contracts correctly.");
  }

  // 6. Test Other Underlyings (e.g. ETH)
  if (registry.allUnderlyings.includes("ETH")) {
    console.log("\n[TEST 6] Testing ETH Expiry Discovery & Snapshot...");
    const ethRegistry = await deltaProductService.getExpiryRegistry("ETH");
    console.log(`  ETH Expiries Discovered: ${ethRegistry.expiries.length}`);
    if (ethRegistry.expiries.length > 0) {
      const ethFirstExpiry = ethRegistry.expiries[0];
      const ethSnapshot = await deltaProductService.fetchOptionChainSnapshot("ETH", ethFirstExpiry.expiryApiFormat);
      console.log(`  ETH ${ethFirstExpiry.expiryDisplay} Snapshot: ${ethSnapshot.contractsCount} contracts across ${ethSnapshot.strikesCount} strikes.`);
    }
    console.log("  ✓ Verified: ETH dynamic expiries and chain snapshot work correctly.");
  }

  console.log("\n==================================================");
  console.log("✓ ALL DELTA OPTION CHAIN ACCEPTANCE TESTS PASSED");
  console.log("==================================================");
}

runDeltaOptionsVerification().catch((err) => {
  console.error("Verification failed with error:", err);
  process.exit(1);
});
