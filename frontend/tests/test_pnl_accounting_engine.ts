import {
  FeeCalculator,
  FifoAccountingEngine,
  calculatePnlSummary,
} from "../lib/pnl/pnl-accounting-engine";
import { FillRecord, TradeRecord } from "../types/pnl-journal";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("=== Running P&L Accounting Engine Test Suite ===");

  // -------------------------------------------------------------
  // Test 1: Indian Statutory Fee Calculations
  // -------------------------------------------------------------
  console.log("1. Testing FeeCalculator for Indian Options & Equity...");
  
  // Options: 1 Lot NIFTY (Buy @ 100 * 50 = 5000, Sell @ 150 * 50 = 7500)
  const optionsFees = FeeCalculator.calculateIndianCharges({
    turnover: 12500,
    buyValue: 5000,
    sellValue: 7500,
    assetClass: "OPTIONS",
    isIntraday: true,
    orderCount: 2,
  });

  // Brokerage: ₹20 * 2 orders = ₹40
  assert(optionsFees.brokerage === 40, `Expected brokerage 40, got ${optionsFees.brokerage}`);
  // STT on Options Sell: 0.1% on premium turnover (0.001 * 7500 = 7.50)
  assert(optionsFees.stt === 7.5, `Expected STT 7.5, got ${optionsFees.stt}`);
  // GST: 18% on (Brokerage + Exchange + SEBI)
  assert(optionsFees.gst > 0, `Expected positive GST, got ${optionsFees.gst}`);
  assert(optionsFees.totalCharges > 45, `Expected total charges > 45, got ${optionsFees.totalCharges}`);

  console.log("   ✓ Options fee schedules verified correctly.");

  // -------------------------------------------------------------
  // Test 2: FIFO Multi-Entry Partial-Exit Fill Matching
  // -------------------------------------------------------------
  console.log("2. Testing FifoAccountingEngine for multi-entry partial-exit...");

  const fills: FillRecord[] = [
    {
      fillId: "f-1",
      orderId: "ord-1",
      symbol: "NIFTY24SEP25000CE",
      assetClass: "OPTIONS",
      broker: "DHAN",
      account: "PRIMARY",
      side: "BUY",
      price: 100,
      quantity: 100, // Lot 1
      timestamp: "2026-09-10T09:30:00Z",
    },
    {
      fillId: "f-2",
      orderId: "ord-2",
      symbol: "NIFTY24SEP25000CE",
      assetClass: "OPTIONS",
      broker: "DHAN",
      account: "PRIMARY",
      side: "BUY",
      price: 110,
      quantity: 100, // Lot 2
      timestamp: "2026-09-10T10:00:00Z",
    },
    {
      fillId: "f-3",
      orderId: "ord-3",
      symbol: "NIFTY24SEP25000CE",
      assetClass: "OPTIONS",
      broker: "DHAN",
      account: "PRIMARY",
      side: "SELL",
      price: 130,
      quantity: 150, // Closes all 100 of Lot 1 @ 100, and 50 of Lot 2 @ 110
      timestamp: "2026-09-10T11:00:00Z",
    },
  ];

  const { closedTrades, openPositions } = FifoAccountingEngine.matchFillsFifo(fills);

  // Closed trade 1: 100 qty entered @ 100, exited @ 130 -> Gross PnL = (130 - 100) * 100 = +3000
  // Closed trade 2: 50 qty entered @ 110, exited @ 130 -> Gross PnL = (130 - 110) * 50 = +1000
  // Total closed trades count = 2
  assert(closedTrades.length === 2, `Expected 2 closed trades, got ${closedTrades.length}`);
  const totalGrossClosed = closedTrades.reduce((acc, t) => acc + t.grossPnl, 0);
  assert(totalGrossClosed === 4000, `Expected total gross PnL 4000, got ${totalGrossClosed}`);

  // Open Position: 50 qty remaining from Lot 2 @ 110
  assert(openPositions.length === 1, `Expected 1 open position, got ${openPositions.length}`);
  assert(openPositions[0].quantity === 50, `Expected 50 open qty, got ${openPositions[0].quantity}`);
  assert(openPositions[0].averageEntryPrice === 110, `Expected avg price 110, got ${openPositions[0].averageEntryPrice}`);

  console.log("   ✓ FIFO matching & partial exit resolution verified perfectly.");

  // -------------------------------------------------------------
  // Test 3: Statistical Metrics & P&L Summary Computation
  // -------------------------------------------------------------
  console.log("3. Testing calculatePnlSummary statistics (Expectancy, Drawdown, Profit Factor)...");

  const sampleTrades: TradeRecord[] = [
    {
      id: "t-1",
      symbol: "BANKNIFTY",
      assetClass: "OPTIONS",
      broker: "DHAN",
      account: "PRIMARY",
      mode: "LIVE",
      side: "BUY",
      entryTimestamp: "2026-09-01T09:30:00Z",
      exitTimestamp: "2026-09-01T10:30:00Z",
      entryPrice: 200,
      exitPrice: 300,
      quantity: 30,
      status: "CLOSED",
      grossPnl: 3000,
      netPnl: 2900,
      totalCharges: 100,
      feeBreakdown: { brokerage: 40, stt: 30, exchangeCharges: 10, sebiCharges: 2, gst: 10, stampDuty: 8, ipft: 0, dpCharges: 0, totalCharges: 100 },
      strategy: "BREAKOUT",
      rMultiple: 2.0,
      holdingDurationSeconds: 3600,
    },
    {
      id: "t-2",
      symbol: "BANKNIFTY",
      assetClass: "OPTIONS",
      broker: "DHAN",
      account: "PRIMARY",
      mode: "LIVE",
      side: "BUY",
      entryTimestamp: "2026-09-02T09:30:00Z",
      exitTimestamp: "2026-09-02T10:00:00Z",
      entryPrice: 250,
      exitPrice: 200,
      quantity: 30,
      status: "CLOSED",
      grossPnl: -1500,
      netPnl: -1600,
      totalCharges: 100,
      feeBreakdown: { brokerage: 40, stt: 30, exchangeCharges: 10, sebiCharges: 2, gst: 10, stampDuty: 8, ipft: 0, dpCharges: 0, totalCharges: 100 },
      strategy: "BREAKOUT",
      rMultiple: -1.0,
      holdingDurationSeconds: 1800,
    },
    {
      id: "t-3",
      symbol: "NIFTY",
      assetClass: "FUTURES",
      broker: "DHAN",
      account: "PRIMARY",
      mode: "LIVE",
      side: "BUY",
      entryTimestamp: "2026-09-03T09:30:00Z",
      exitTimestamp: "2026-09-03T14:30:00Z",
      entryPrice: 25000,
      exitPrice: 25100,
      quantity: 50,
      status: "CLOSED",
      grossPnl: 5000,
      netPnl: 4800,
      totalCharges: 200,
      feeBreakdown: { brokerage: 40, stt: 80, exchangeCharges: 30, sebiCharges: 5, gst: 25, stampDuty: 20, ipft: 0, dpCharges: 0, totalCharges: 200 },
      strategy: "TREND_FOLLOWING",
      rMultiple: 2.5,
      holdingDurationSeconds: 18000,
    },
  ];

  const summary = calculatePnlSummary(sampleTrades, 1000000);

  assert(summary.totalTrades === 3, `Expected 3 trades, got ${summary.totalTrades}`);
  assert(summary.winningTradesCount === 2, `Expected 2 wins, got ${summary.winningTradesCount}`);
  assert(summary.losingTradesCount === 1, `Expected 1 loss, got ${summary.losingTradesCount}`);
  assert(Math.round(summary.winRate) === 67, `Expected 67% win rate, got ${summary.winRate}`);

  // Net PnL: 2900 - 1600 + 4800 = 6100
  assert(summary.netPnl === 6100, `Expected net PnL 6100, got ${summary.netPnl}`);
  // Realized PnL: 6100
  assert(summary.realizedPnl === 6100, `Expected realized PnL 6100, got ${summary.realizedPnl}`);
  // Total Charges: 100 + 100 + 200 = 400
  assert(summary.totalCharges === 400, `Expected total charges 400, got ${summary.totalCharges}`);
  // Profit Factor: Total Gains (2900 + 4800 = 7700) / Total Losses (1600) = 4.8125
  assert(summary.profitFactor > 4.8 && summary.profitFactor < 4.9, `Expected profit factor ~4.81, got ${summary.profitFactor}`);
  // Expectancy: 6100 / 3 = 2033.33
  assert(Math.round(summary.tradeExpectancy) === 2033, `Expected expectancy 2033, got ${summary.tradeExpectancy}`);

  console.log("   ✓ Summary statistics & expectancy metrics verified correctly.");

  console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! (3/3 test suites) <<<");
}

try {
  runTests();
} catch (err: any) {
  console.error("Test failed with error:", err);
  process.exit(1);
}
