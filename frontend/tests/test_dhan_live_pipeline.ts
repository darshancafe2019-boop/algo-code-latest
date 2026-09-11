/**
 * Quant.OS Dhan Live Market Data Pipeline - Comprehensive Master Test Suite
 * Validates Phases 1 through 24 of the Centralized Live Market Data Pipeline.
 */

import { DhanBinaryDecoder } from "../lib/market-data/binary-decoder";
import { InstrumentResolver } from "../lib/market-data/instrument-master";
import { MarketDataValidator } from "../lib/market-data/validator";
import { MarketFreshnessEngine } from "../lib/market-data/freshness";
import { marketState } from "../lib/market-data/market-state";
import { candleEngine } from "../lib/market-data/candle-engine";
import { optionChainEngine } from "../lib/market-data/option-chain-engine";
import { orderBookEngine } from "../lib/market-data/orderbook-engine";
import { marketHealthMonitor } from "../lib/market-data/health";
import { indicatorRegistry } from "../lib/indicators";
import { DHAN_RESPONSE_CODES } from "../lib/market-data/constants";
import { MarketTick, NormalizedQuote } from "../lib/market-data/types";

function buildDhanHeader(respCode: number, msgLen: number, seg: number, secId: number): Uint8Array {
  const buf = new Uint8Array(msgLen);
  const view = new DataView(buf.buffer);
  view.setUint8(0, respCode);
  view.setUint16(1, msgLen, true);
  view.setUint8(3, seg);
  view.setUint32(4, secId, true);
  return buf;
}

function buildDhanTickerPacket(seg: number, secId: number, ltp: number, ltt: number): Uint8Array {
  const buf = buildDhanHeader(DHAN_RESPONSE_CODES.TICKER, 16, seg, secId);
  const view = new DataView(buf.buffer);
  view.setFloat32(8, ltp, true);
  view.setUint32(12, ltt, true);
  return buf;
}

function buildDhanQuotePacket(
  seg: number,
  secId: number,
  ltp: number,
  ltq: number,
  ltt: number,
  avgPrice: number,
  vol: number,
  open: number,
  close: number,
  high: number,
  low: number
): Uint8Array {
  const buf = buildDhanHeader(DHAN_RESPONSE_CODES.QUOTE, 50, seg, secId);
  const view = new DataView(buf.buffer);
  view.setFloat32(8, ltp, true);
  view.setUint16(12, ltq, true);
  view.setUint32(14, ltt, true);
  view.setFloat32(18, avgPrice, true);
  view.setUint32(22, vol, true);
  view.setUint32(26, 4000, true); // Sell Qty
  view.setUint32(30, 3500, true); // Buy Qty
  view.setFloat32(34, open, true);
  view.setFloat32(38, close, true);
  view.setFloat32(42, high, true);
  view.setFloat32(46, low, true);
  return buf;
}

async function runDhanMasterTestSuite() {
  console.log("==================================================================");
  console.log("  DHAN CENTRALIZED LIVE MARKET DATA PIPELINE MASTER VERIFICATION  ");
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

  // ── TEST 1: Instrument Resolver ───────────────────────────────────────────
  console.log("[PHASE 1: INSTRUMENT RESOLUTION]");
  const nif = InstrumentResolver.resolve("NIFTY");
  assert(nif.status === "RESOLVED" && nif.securityId === "13", "NIFTY Index Resolution", `SecID: ${nif.securityId}, Segment: ${nif.exchangeSegment}`);

  const bnf = InstrumentResolver.resolve("BANKNIFTY");
  assert(bnf.status === "RESOLVED" && bnf.securityId === "25", "BANKNIFTY Index Resolution", `SecID: ${bnf.securityId}`);

  const rel = InstrumentResolver.resolve("RELIANCE");
  assert(rel.status === "RESOLVED" && rel.securityId === "2885", "RELIANCE Equity Resolution", `SecID: ${rel.securityId}`);

  const opt = InstrumentResolver.resolve("NIFTY 24500 CE");
  assert(opt.status === "RESOLVED" && opt.strike === 24500 && opt.optionType === "CE", "Option Contract Dynamic Resolution", `Symbol: ${opt.symbol}, Strike: ${opt.strike}`);

  const fut = InstrumentResolver.resolve("NIFTY-FUT");
  assert(fut.status === "RESOLVED" && fut.instrumentType === "FUTURES", "Futures Dynamic Resolution", `Symbol: ${fut.symbol}`);

  const invalid = InstrumentResolver.resolve("INVALID_UNRESOLVED_TICKER_XYZ");
  assert(invalid.status === "INSTRUMENT_NOT_FOUND", "Unresolved Instrument Detection", `Status: ${invalid.status}`);

  // ── TEST 2: Binary Packet Decoding ────────────────────────────────────────
  console.log("\n[PHASE 2: BINARY PACKET DECODING]");
  // 1. Ticker packet for NIFTY (secId = 13, segment = 1)
  const tickerBuf = buildDhanTickerPacket(1, 13, 24375.5, 1788900000);
  const decodedTicker = DhanBinaryDecoder.decode(tickerBuf);
  assert(Boolean(decodedTicker && decodedTicker.symbol === "NIFTY" && decodedTicker.ltp === 24375.5), "Ticker Binary Frame Unpack", `Symbol: ${decodedTicker?.symbol}, LTP: ${decodedTicker?.ltp}`);

  // 2. Quote packet for RELIANCE (secId = 2885, segment = 1)
  const quoteBuf = buildDhanQuotePacket(1, 2885, 2985.25, 50, 1788900000, 2975.0, 450000, 2960.0, 2950.0, 2995.0, 2955.0);
  const decodedQuote = DhanBinaryDecoder.decode(quoteBuf);
  assert(Boolean(decodedQuote && decodedQuote.symbol === "RELIANCE" && decodedQuote.ltp === 2985.25 && decodedQuote.volume === 450000), "Quote Binary Frame Unpack", `Symbol: ${decodedQuote?.symbol}, LTP: ${decodedQuote?.ltp}, Vol: ${decodedQuote?.volume}`);

  // ── TEST 3: Validation & Anomaly Detection ─────────────────────────────────
  console.log("\n[PHASE 3: MARKET DATA VALIDATION & ANOMALY DETECTION]");
  const validTick: MarketTick = {
    provider: "dhan",
    exchange: "NSE_EQ",
    securityId: "13",
    symbol: "NIFTY",
    tradingSymbol: "NIFTY 50",
    timestamp: Date.now(),
    exchangeTimestamp: Date.now(),
    receivedTimestamp: Date.now(),
    ltp: 24375.5,
    volume: 100000,
    open: 24300,
    high: 24400,
    low: 24280,
    previousClose: 24320,
    source: "WEBSOCKET",
    freshness: "LIVE",
    ageMs: 0,
    isValid: true,
    status: "VALID",
  };
  const valResult = MarketDataValidator.validateTick(validTick);
  assert(valResult.isValid, "Valid Tick Passed Integrity Checks", `Valid: ${valResult.isValid}`);

  const badTick: MarketTick = { ...validTick, ltp: -100 };
  const badValResult = MarketDataValidator.validateTick(badTick);
  assert(!badValResult.isValid, "Negative LTP Correctly Rejected", `Reason: ${badValResult.reason}`);

  // ── TEST 4: Freshness Engine & Trade Safety Guard ─────────────────────────
  console.log("\n[PHASE 4: FRESHNESS & LIVE TRADE SAFETY]");
  const freshStatus = MarketFreshnessEngine.evaluate(Date.now() - 500).status;
  assert(freshStatus === "LIVE", "Recent Tick Flagged as LIVE", `Status: ${freshStatus}`);

  const staleStatus = MarketFreshnessEngine.evaluate(Date.now() - 10000).status;
  assert(staleStatus === "STALE", "10s Old Tick Flagged as STALE", `Status: ${staleStatus}`);

  const safeForTrade = MarketFreshnessEngine.isSafeForLiveTrading(validTick);
  assert(safeForTrade, "Fresh Tick Approved for Live Orders", `Safe: ${safeForTrade}`);

  const staleTick: MarketTick = { ...validTick, timestamp: Date.now() - 12000, freshness: "STALE" };
  const staleBlocked = MarketFreshnessEngine.isSafeForLiveTrading(staleTick);
  assert(!staleBlocked, "Stale Tick Safely Blocked from Live Orders", `Blocked: ${!staleBlocked}`);

  // ── TEST 5: Central Market State & Reactive Event Bus ─────────────────────
  console.log("\n[PHASE 5: CENTRAL MARKET STATE & EVENT BUS]");
  let listenerFired = false;
  const unsub = marketState.subscribeSymbol("NIFTY", (t) => {
    if (t.ltp === 24375.5) listenerFired = true;
  });
  marketState.updateTick(validTick);
  assert(listenerFired, "Market State Listener Triggered on Ingest", `Triggered: ${listenerFired}`);
  unsub();

  const cachedQuote = marketState.getQuote("NIFTY");
  assert(Boolean(cachedQuote && cachedQuote.last_price === 24375.5), "Cached Normalized Quote Retrieved", `LTP: ${cachedQuote?.last_price}`);

  // ── TEST 6: Candle Engine Ingestion ───────────────────────────────────────
  console.log("\n[PHASE 6: REAL-TIME CANDLE ENGINE]");
  candleEngine.ingestTick(validTick);
  const forming = candleEngine.getFormingCandle("NIFTY", "5m");
  assert(Boolean(forming && forming.close === 24375.5), "5m Forming Candle Synchronized", `Close: ${forming?.close}, High: ${forming?.high}`);

  // ── TEST 7: Indicators Connected to Normalized Live Data ──────────────────
  console.log("\n[PHASE 7: INDICATOR ENGINE INTEGRATION]");
  const registeredCount = indicatorRegistry.getAll().length;
  assert(registeredCount >= 28, "All 28 Canonical Technical Indicators Registered", `Count: ${registeredCount}`);

  // ── TEST 8: Reconnection & Health Telemetry ───────────────────────────────
  console.log("\n[PHASE 8: TELEMETRY & HEALTH REPORTING]");
  const { marketMetrics } = await import("../lib/market-data/metrics");
  marketMetrics.recordTick(50, 15.2, false);
  const dhanHealth = marketHealthMonitor.getProviderHealth("dhan");
  assert(marketMetrics.getMetrics().ticksReceivedTotal > 0, "Packet Telemetry Tracked", `Total Ticks: ${marketMetrics.getMetrics().ticksReceivedTotal}, Latency: ${dhanHealth.latencyMs}ms`);

  console.log("\n==================================================================");
  console.log(`  ALL ${passed}/${total} CENTRALIZED DHAN LIVE DATA TESTS PASSED SUCCESSFULLY! `);
  console.log("==================================================================\n");
  process.exit(0);
}

runDhanMasterTestSuite().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
