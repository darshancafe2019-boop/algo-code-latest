/**
 * Centralized Live Market Data Engine - Comprehensive Unit Test Suite
 * Explicitly validates isolated subsystem logic with synthetic packets and deterministic fixtures.
 */

import {
  DhanBinaryDecoder,
  DHAN_RESPONSE_CODES,
  instrumentMaster,
  InstrumentResolver,
  DhanInstrumentResolver,
  MarketDataValidator,
  MarketFreshnessEngine,
  MarketDataNormalizer,
  marketState,
  subscriptionManager,
  liveCandleEngine,
  liveOptionChainEngine,
  liveOrderBookEngine,
  marketHealthMonitor,
  marketMetrics,
} from "../lib/market-data";

function runUnitTests() {
  console.log("==================================================================");
  console.log("  QUANT.OS CENTRALIZED MARKET DATA ENGINE [UNIT TESTS]            ");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] [UNIT TEST] ${testName} ${detail ? `-> ${detail}` : ""}`);
    } else {
      console.error(`  [FAIL] [UNIT TEST] ${testName} ${detail ? `-> ${detail}` : ""}`);
      process.exit(1);
    }
  }

  // ── TEST 1: Instrument Master & Dhan Resolver ──────────────────────────────
  const niftyInst = DhanInstrumentResolver.resolve("NIFTY");
  assert(niftyInst.securityId === "13", "NIFTY Index Dynamic Resolution", `SecID: ${niftyInst.securityId}, Segment: ${niftyInst.exchangeSegment}`);

  const bnfInst = DhanInstrumentResolver.resolve("BANKNIFTY");
  assert(bnfInst.securityId === "25", "BANKNIFTY Index Dynamic Resolution", `SecID: ${bnfInst.securityId}`);

  const relInst = DhanInstrumentResolver.resolve("RELIANCE");
  assert(relInst.securityId === "2885", "RELIANCE Equity Dynamic Resolution", `SecID: ${relInst.securityId}`);

  const optInst = DhanInstrumentResolver.resolve("NIFTY 24500 CE");
  assert(optInst.strike === 24500 && optInst.optionType === "CE", "Option Contract Dynamic Resolution", `Symbol: ${optInst.symbol}`);

  const futInst = DhanInstrumentResolver.resolve("NIFTY-FUT");
  assert(futInst.instrumentType === "FUTURES", "Futures Dynamic Resolution", `Symbol: ${futInst.symbol}`);

  let caughtUnresolved = false;
  try {
    DhanInstrumentResolver.resolve("UNKNOWN_XYZ_99999");
  } catch (err: any) {
    if (err.message.includes("INSTRUMENT_NOT_FOUND")) caughtUnresolved = true;
  }
  assert(caughtUnresolved, "Unresolvable Instrument Throws INSTRUMENT_NOT_FOUND");

  // ── TEST 2: DhanHQ V2 Binary Packet Decoder (All Codes) ───────────────────
  const currentUnixSec = Math.floor(Date.now() / 1000);

  // 2A: Response Code 1 (Index)
  const idxBuf = new ArrayBuffer(20);
  const idxView = new DataView(idxBuf);
  idxView.setUint8(0, DHAN_RESPONSE_CODES.INDEX); // Code 1
  idxView.setUint16(1, 20, true);
  idxView.setUint8(3, 0); // IDX_I
  idxView.setUint32(4, 13, true); // NIFTY
  idxView.setFloat32(8, 24350.5, true); // LTP
  idxView.setUint32(12, currentUnixSec, true);
  idxView.setFloat32(16, 24300.0, true); // Prev Close
  const decodedIndex = DhanBinaryDecoder.decode(idxBuf);
  assert(decodedIndex?.responseCode === 1 && decodedIndex?.ltp === 24350.5 && decodedIndex?.previousClose === 24300.0, "Code 1 Index Binary Frame Decoder", `LTP: ${decodedIndex?.ltp}, PrevClose: ${decodedIndex?.previousClose}`);

  // 2B: Response Code 2 (Ticker / LTP)
  const tickerBuf = new ArrayBuffer(16);
  const tickerView = new DataView(tickerBuf);
  tickerView.setUint8(0, DHAN_RESPONSE_CODES.TICKER); // Code 2
  tickerView.setUint16(1, 16, true);
  tickerView.setUint8(3, 1); // NSE_EQ
  tickerView.setUint32(4, 13, true);
  tickerView.setFloat32(8, 24355.0, true);
  tickerView.setUint32(12, currentUnixSec, true);
  const decodedTicker = DhanBinaryDecoder.decode(tickerBuf);
  assert(decodedTicker?.responseCode === 2 && decodedTicker?.ltp === 24355.0, "Code 2 Ticker Binary Frame Decoder", `LTP: ${decodedTicker?.ltp}`);

  // 2C: Response Code 4 (Quote)
  const quoteBuf = new ArrayBuffer(50);
  const quoteView = new DataView(quoteBuf);
  quoteView.setUint8(0, DHAN_RESPONSE_CODES.QUOTE); // Code 4
  quoteView.setUint16(1, 50, true);
  quoteView.setUint8(3, 1);
  quoteView.setUint32(4, 2885, true); // RELIANCE
  quoteView.setFloat32(8, 2980.0, true); // LTP
  quoteView.setUint16(12, 50, true); // LTQ
  quoteView.setUint32(14, currentUnixSec, true); // LTT
  quoteView.setFloat32(18, 2975.0, true); // Avg Price
  quoteView.setUint32(22, 120000, true); // Volume
  quoteView.setUint32(26, 45000, true); // Total Sell Qty
  quoteView.setUint32(30, 55000, true); // Total Buy Qty
  quoteView.setFloat32(34, 2960.0, true); // Open
  quoteView.setFloat32(38, 2965.0, true); // Close
  quoteView.setFloat32(42, 2990.0, true); // High
  quoteView.setFloat32(46, 2955.0, true); // Low
  const decodedQuote = DhanBinaryDecoder.decode(quoteBuf);
  assert(decodedQuote?.responseCode === 4 && decodedQuote?.ltp === 2980.0 && decodedQuote?.volume === 120000, "Code 4 Quote Binary Frame Decoder", `LTP: ${decodedQuote?.ltp}, Vol: ${decodedQuote?.volume}`);

  // 2D: Response Code 5 (Open Interest)
  const oiBuf = new ArrayBuffer(12);
  const oiView = new DataView(oiBuf);
  oiView.setUint8(0, DHAN_RESPONSE_CODES.OPEN_INTEREST); // Code 5
  oiView.setUint16(1, 12, true);
  oiView.setUint8(3, 2); // NSE_FNO
  oiView.setUint32(4, 24500, true);
  oiView.setUint32(8, 450000, true); // OI
  const decodedOI = DhanBinaryDecoder.decode(oiBuf);
  assert(decodedOI?.openInterest === 450000, "Code 5 Open Interest Binary Frame Decoder", `OI: ${decodedOI?.openInterest}`);

  // 2E: Response Code 6 (Prev Close)
  const prevCloseBuf = new ArrayBuffer(16);
  const prevCloseView = new DataView(prevCloseBuf);
  prevCloseView.setUint8(0, DHAN_RESPONSE_CODES.PREV_CLOSE); // Code 6
  prevCloseView.setUint16(1, 16, true);
  prevCloseView.setUint8(3, 1);
  prevCloseView.setUint32(4, 2885, true);
  prevCloseView.setFloat32(8, 2965.0, true); // Prev Close
  prevCloseView.setUint32(12, 100000, true); // Prev OI
  const decodedPrevClose = DhanBinaryDecoder.decode(prevCloseBuf);
  assert(decodedPrevClose?.previousClose === 2965.0, "Code 6 Previous Close Binary Frame Decoder", `PrevClose: ${decodedPrevClose?.previousClose}`);

  // 2F: Response Code 50 (Disconnect)
  const discBuf = new ArrayBuffer(10);
  const discView = new DataView(discBuf);
  discView.setUint8(0, DHAN_RESPONSE_CODES.DISCONNECT); // Code 50
  discView.setUint16(1, 10, true);
  discView.setUint8(3, 1);
  discView.setUint32(4, 0, true);
  discView.setUint16(8, 805, true); // Disconnect Code
  const decodedDisc = DhanBinaryDecoder.decode(discBuf);
  assert(decodedDisc?.disconnectCode === 805, "Code 50 Disconnect Binary Frame Decoder", `DisconnectCode: ${decodedDisc?.disconnectCode}`);

  // ── TEST 3: Validation Engine ─────────────────────────────────────────────
  const validTick = MarketDataNormalizer.fromDhanPacket(decodedQuote!);
  const validRes = MarketDataValidator.validateTick(validTick);
  assert(validRes.isValid, "Validator Valid Tick Evaluation");

  const invalidTick = { ...validTick, ltp: -50 };
  const invalidRes = MarketDataValidator.validateTick(invalidTick);
  assert(!invalidRes.isValid, "Validator Negative Price Rejection", `Reason: ${invalidRes.reason}`);

  // ── TEST 4: Freshness & Stale Guard Engine ────────────────────────────────
  const now = Date.now();
  const liveEval = MarketFreshnessEngine.evaluate(now - 500, now);
  const staleEval = MarketFreshnessEngine.evaluate(now - 8000, now);
  const expiredEval = MarketFreshnessEngine.evaluate(now - 25000, now);

  assert(liveEval.status === "LIVE" && liveEval.isLive, "Freshness Live Status Evaluation", `Status: ${liveEval.status}`);
  assert(staleEval.status === "STALE" && staleEval.isStale, "Freshness Stale Status Evaluation", `Status: ${staleEval.status}`);
  assert(expiredEval.status === "EXPIRED" && expiredEval.isStale, "Freshness Expired Status Evaluation", `Status: ${expiredEval.status}`);

  const safeForTrade = MarketFreshnessEngine.isSafeForLiveTrading(validTick);
  const staleTick = { ...validTick, freshness: "STALE" as const };
  const blockedFromTrade = MarketFreshnessEngine.isSafeForLiveTrading(staleTick);
  assert(safeForTrade && !blockedFromTrade, "Trading Safety Guard (Stale Blocked / Fresh Safe)");

  // ── TEST 5: Central Market State & Normalizer ─────────────────────────────
  let tickReceived = false;
  const unsub = marketState.subscribeSymbol("RELIANCE", () => {
    tickReceived = true;
  });
  marketState.updateTick(validTick);
  unsub();

  const cachedQuote = marketState.getQuote("RELIANCE");
  assert(tickReceived && cachedQuote?.last_price === 2980.0, "Central Market State Ingestion & Notification", `LTP: ${cachedQuote?.last_price}`);

  // ── TEST 6: Subscription Manager Reference Counting ──────────────────────
  subscriptionManager.subscribe("NIFTY", "BOT_1");
  subscriptionManager.subscribe("NIFTY", "CHART_VIEW");
  const subCountBefore = subscriptionManager.getSubscribedCount();
  subscriptionManager.unsubscribe("NIFTY", "BOT_1");
  const subCountMiddle = subscriptionManager.getSubscribedCount();
  subscriptionManager.unsubscribe("NIFTY", "CHART_VIEW");
  const subCountAfter = subscriptionManager.getSubscribedCount();

  assert(subCountBefore === 1 && subCountMiddle === 1 && subCountAfter === 0, "Subscription Manager Reference Counting");

  // ── TEST 7: Multi-Timeframe Real-time Candle Engine ───────────────────────
  const cTick1: any = {
    provider: "dhan",
    exchange: "NSE_EQ",
    securityId: "13",
    symbol: "NIFTY",
    timestamp: 1700000000000,
    exchangeTimestamp: 1700000000000,
    receivedTimestamp: 1700000000000,
    ltp: 24300.0,
    volume: 100,
    freshness: "LIVE",
    ageMs: 10,
    isValid: true,
  };
  liveCandleEngine.processTick(cTick1);

  const cTick2: any = {
    ...cTick1,
    timestamp: 1700000030000,
    exchangeTimestamp: 1700000030000,
    ltp: 24350.0,
    volume: 200,
  };
  liveCandleEngine.processTick(cTick2);

  const forming = liveCandleEngine.getFormingCandle("NIFTY", "1m");
  assert(forming?.open === 24300.0 && forming?.high === 24350.0 && forming?.close === 24350.0 && forming?.volume === 300, "Real-Time Forming Candle Calculations", `O: ${forming?.open}, H: ${forming?.high}, C: ${forming?.close}, V: ${forming?.volume}`);

  // ── TEST 8: Option Chain Engine & PCR / Max Pain ──────────────────────────
  const strikes = [
    {
      strikePrice: 24200,
      isATM: false,
      distancePct: -0.6,
      call: { symbol: "NIFTY24200CE", securityId: "opt1", ltp: 180, bid: 179, ask: 181, volume: 50000, openInterest: 100000, oiChange: 5000 },
      put: { symbol: "NIFTY24200PE", securityId: "opt2", ltp: 40, bid: 39, ask: 41, volume: 20000, openInterest: 40000, oiChange: -2000 },
    },
    {
      strikePrice: 24350,
      isATM: true,
      distancePct: 0.0,
      call: { symbol: "NIFTY24350CE", securityId: "opt3", ltp: 75, bid: 74, ask: 76, volume: 150000, openInterest: 250000, oiChange: 15000 },
      put: { symbol: "NIFTY24350PE", securityId: "opt4", ltp: 70, bid: 69, ask: 71, volume: 140000, openInterest: 230000, oiChange: 12000 },
    },
    {
      strikePrice: 24500,
      isATM: false,
      distancePct: 0.6,
      call: { symbol: "NIFTY24500CE", securityId: "opt5", ltp: 25, bid: 24, ask: 26, volume: 60000, openInterest: 180000, oiChange: 20000 },
      put: { symbol: "NIFTY24500PE", securityId: "opt6", ltp: 160, bid: 159, ask: 161, volume: 30000, openInterest: 60000, oiChange: 1000 },
    },
  ];

  const optionChain = liveOptionChainEngine.updateChainSnapshot("NIFTY", 24350.0, "2026-09-15", ["2026-09-15", "2026-09-22"], strikes);
  assert(optionChain && optionChain.pcr.pcrOI > 0 && optionChain.maxPain === 24350, "Option Chain Engine (PCR & Max Pain)", `PCR: ${optionChain.pcr.pcrOI}, MaxPain: ${optionChain.maxPain}`);

  // ── TEST 9: Order Book Depth Engine ───────────────────────────────────────
  const depth = liveOrderBookEngine.updateDepth(
    "NIFTY",
    [{ price: 24349.5, quantity: 500, ordersCount: 12 }, { price: 24349.0, quantity: 1200, ordersCount: 25 }],
    [{ price: 24350.5, quantity: 600, ordersCount: 15 }, { price: 24351.0, quantity: 1500, ordersCount: 30 }]
  );
  assert(depth.spread === 1.0 && depth.totalBidQty === 1700 && depth.totalAskQty === 2100, "Order Book Depth Engine Calculations", `Spread: ${depth.spread}, TotalBidQty: ${depth.totalBidQty}`);

  // ── TEST 10: Health Monitor & Metrics Collector ───────────────────────────
  marketMetrics.recordTick(50, 14.5, false);
  const metrics = marketMetrics.getMetrics();
  const sysHealth = marketHealthMonitor.getAllProvidersHealth();
  assert(metrics.ticksReceivedTotal >= 1 && sysHealth.length >= 3, "Health Monitor & Metrics Telemetry", `TicksRecorded: ${metrics.ticksReceivedTotal}, Providers: ${sysHealth.length}`);

  console.log(`\n==================================================================`);
  console.log(`  ALL ${passed}/${total} CENTRALIZED MARKET DATA UNIT TESTS PASSED!`);
  console.log(`==================================================================\n`);
  process.exit(0);
}

runUnitTests();
