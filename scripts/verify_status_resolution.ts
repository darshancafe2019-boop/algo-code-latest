import { getMarketRowStatus, resolveInstrumentProvider } from "../frontend/lib/market-data/row-status";

function runTests() {
  console.log("=== Testing Provider Resolution & Truthful Status Engine ===");

  let passCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, msg: string) {
    totalCount++;
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
    }
  }

  const healthyProviders = new Set(["DELTA", "BINANCE", "DHAN"]);

  // Test 1: BINANCE:BTC/USDT with null quote (Initial page load from seed data)
  const binanceSeedInst = {
    symbol: "BTC/USDT",
    canonical_symbol: "BINANCE:BTC/USDT",
    exchange: "Binance",
    last_price: 64250.0,
    asset_class: "Crypto",
  };
  const res1 = getMarketRowStatus({
    instrument: binanceSeedInst,
    rawQuote: null,
    healthyProviders,
    connectionStatus: "LIVE",
  });
  assert(res1.provider === "binance", `Res 1 Provider is binance (got: ${res1.provider})`);
  assert(res1.isLive === false, `Res 1 isLive is FALSE on seed price (got: ${res1.isLive})`);
  assert(res1.label === "BINANCE • LAST TRADED", `Res 1 Label is BINANCE • LAST TRADED (got: ${res1.label})`);
  assert(res1.state === "closed", `Res 1 State is closed (got: ${res1.state})`);

  // Test 2: BINANCE:BTC/USDT with fresh live tick from Binance WS
  const binanceLiveQuote = {
    symbol: "BTC/USDT",
    exchange: "BINANCE",
    provider: "binance_ws",
    last_price: 65432.10,
    bid: 65430.0,
    ask: 65434.0,
    age_seconds: 0.12,
    is_stale: false,
  };
  const res2 = getMarketRowStatus({
    instrument: binanceSeedInst,
    rawQuote: binanceLiveQuote,
    healthyProviders,
    connectionStatus: "LIVE",
  });
  assert(res2.provider === "binance", `Res 2 Provider is binance (got: ${res2.provider})`);
  assert(res2.isLive === true, `Res 2 isLive is TRUE on fresh tick (got: ${res2.isLive})`);
  assert(res2.label === "BINANCE • LIVE", `Res 2 Label is BINANCE • LIVE (got: ${res2.label})`);
  assert(res2.state === "live", `Res 2 State is live (got: ${res2.state})`);

  // Test 3: DELTA:BTCUSD with fresh live tick from Delta Options WS
  const deltaInst = {
    symbol: "BTCUSD",
    canonical_symbol: "DELTA:BTCUSD",
    exchange: "DELTA",
    last_price: 65440.0,
    asset_class: "Crypto",
  };
  const deltaLiveQuote = {
    symbol: "BTCUSD",
    exchange: "DELTA",
    provider: "delta_options_ws",
    last_price: 65440.0,
    age_seconds: 0.25,
    is_stale: false,
  };
  const res3 = getMarketRowStatus({
    instrument: deltaInst,
    rawQuote: deltaLiveQuote,
    healthyProviders,
    connectionStatus: "LIVE",
  });
  assert(res3.provider === "delta", `Res 3 Provider is delta (got: ${res3.provider})`);
  assert(res3.isLive === true, `Res 3 isLive is TRUE (got: ${res3.isLive})`);
  assert(res3.label === "DELTA • LIVE", `Res 3 Label is DELTA • LIVE (got: ${res3.label})`);

  // Test 4: OANDA forex pair (GBPJPY=X) with no live tick
  const oandaInst = {
    symbol: "GBPJPY",
    canonical_symbol: "GBPJPY=X",
    exchange: "OANDA",
    asset_class: "Forex",
    last_price: 196.60,
  };
  const res4 = getMarketRowStatus({
    instrument: oandaInst,
    rawQuote: null,
    healthyProviders,
    connectionStatus: "LIVE",
  });
  assert(res4.provider === "oanda", `Res 4 Provider is oanda (got: ${res4.provider})`);
  assert(res4.isLive === false, `Res 4 isLive is FALSE (got: ${res4.isLive})`);
  assert(!res4.label.includes("TWELVE"), `Res 4 Label does NOT mention TWELVE (got: ${res4.label})`);
  assert(res4.label.startsWith("OANDA"), `Res 4 Label starts with OANDA (got: ${res4.label})`);

  // Test 5: Stale tick (> 30 seconds age)
  const staleQuote = {
    symbol: "BTC/USDT",
    exchange: "BINANCE",
    provider: "binance_ws",
    last_price: 65432.10,
    age_seconds: 45.0,
    is_stale: true,
  };
  const res5 = getMarketRowStatus({
    instrument: binanceSeedInst,
    rawQuote: staleQuote,
    healthyProviders,
    connectionStatus: "LIVE",
  });
  assert(res5.isLive === false, `Res 5 isLive is FALSE on stale quote (got: ${res5.isLive})`);
  assert(res5.label === "BINANCE • STALE", `Res 5 Label is BINANCE • STALE (got: ${res5.label})`);
  assert(res5.state === "stale", `Res 5 State is stale (got: ${res5.state})`);

  // Test 6: Reconnecting gateway state
  const res6 = getMarketRowStatus({
    instrument: binanceSeedInst,
    rawQuote: binanceLiveQuote,
    healthyProviders,
    connectionStatus: "RECONNECTING",
  });
  assert(res6.isLive === false, `Res 6 isLive is FALSE during reconnecting (got: ${res6.isLive})`);
  assert(res6.label === "BINANCE • RECONNECTING", `Res 6 Label is BINANCE • RECONNECTING (got: ${res6.label})`);

  console.log(`\nResults: ${passCount}/${totalCount} tests passed.`);
  if (passCount !== totalCount) {
    process.exit(1);
  }
}

runTests();
