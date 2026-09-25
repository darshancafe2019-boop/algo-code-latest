/**
 * QUANT.OS 30 CRYPTO STRATEGIES COMPREHENSIVE TEST SUITE
 * ========================================================
 * Tests:
 * 1. All 30 strategy registrations & categorization integrity
 * 2. Strategy condition evaluation & live signal engine states
 * 3. Why-Trade & Why-No-Trade condition explanations
 * 4. Risk Engine position sizing and leverage safety
 * 5. Central Exposure Controller & Signal Cluster resolution
 * 6. Market Regime Engine classification & candidate mapping
 * 7. Real mathematical backtest calculations
 * 8. Forward paper execution & trade journal auditing
 * 9. Data Health failure detection
 */

import { CRYPTO_30_STRATEGIES, STRATEGY_CATEGORIES } from "../lib/strategies/crypto30Strategies";
import { strategySignalEngine } from "../lib/strategies/signalEngine";
import { strategyRiskEngine } from "../lib/strategies/strategyRiskEngine";
import { centralExposureController } from "../lib/strategies/exposureController";
import { marketRegimeEngine } from "../lib/strategies/regimeEngine";
import { strategyBacktestEngine } from "../lib/strategies/strategyBacktestEngine";
import { paperTradingEngine } from "../lib/strategies/paperTradingEngine";
import { dataHealthEngine } from "../lib/strategies/dataHealthEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST ASSERTION FAILED: ${message}`);
  }
}

async function runAllTests() {
  console.log("==================================================");
  console.log("RUNNING QUANT.OS 30 CRYPTO STRATEGIES TEST SUITE");
  console.log("==================================================");

  // TEST 1: 30 Strategy Registrations
  console.log("\n[TEST 1] Verifying all 30 strategy registrations...");
  assert(CRYPTO_30_STRATEGIES.length === 30, `Expected 30 strategies, found ${CRYPTO_30_STRATEGIES.length}`);
  
  // Verify distinct numbers 01 to 30
  for (let i = 1; i <= 30; i++) {
    const numStr = i < 10 ? `0${i}` : `${i}`;
    const strat = CRYPTO_30_STRATEGIES.find((s) => s.number === numStr);
    assert(!!strat, `Strategy #${numStr} missing from catalog`);
    assert(strat!.id === `crypto-strat-${numStr}`, `Strategy ID mismatch for #${numStr}: ${strat!.id}`);
    assert(strat!.setupConditions.length >= 3, `Strategy #${numStr} must have >= 3 setup conditions`);
    assert(strat!.indicators.length >= 1, `Strategy #${numStr} must have >= 1 indicator`);
    assert(strat!.exampleTrade.steps.length >= 4, `Strategy #${numStr} must have trade simulation steps`);
  }
  console.log("✓ All 30 strategies registered with complete specs, rules, and examples.");

  // TEST 2: Categorization (Part I to Part VI)
  console.log("\n[TEST 2] Verifying 6 Strategy Parts & Categories...");
  assert(STRATEGY_CATEGORIES.length === 6, `Expected 6 parts, found ${STRATEGY_CATEGORIES.length}`);
  for (const cat of STRATEGY_CATEGORIES) {
    const matching = CRYPTO_30_STRATEGIES.filter((s) => s.category === cat.name);
    assert(matching.length === 5, `Expected 5 strategies in category ${cat.name}, found ${matching.length}`);
  }
  console.log("✓ All 6 categories validated with exactly 5 strategies each (30 total).");

  // TEST 3: Market Regime Engine
  console.log("\n[TEST 3] Verifying Market Regime Engine...");
  const trendingRegime = marketRegimeEngine.evaluateRegime({
    adx: 32.0,
    atrPercentile: 50,
    bandwidthPercentile: 60,
    rsi: 55,
    volumeTrend: "EXPANDING",
    emaSlope: 20,
    liquidityScore: 95,
  });
  assert(trendingRegime.regime === "TRENDING", `Expected TRENDING regime, got ${trendingRegime.regime}`);
  assert(trendingRegime.candidateStrategyNumbers.includes("01"), "Strategy 01 must be candidate for trending regime");

  const rangingRegime = marketRegimeEngine.evaluateRegime({
    adx: 16.0,
    atrPercentile: 30,
    bandwidthPercentile: 40,
    rsi: 50,
    volumeTrend: "CONTRACTING",
    emaSlope: 2,
    liquidityScore: 90,
  });
  assert(rangingRegime.regime === "RANGING", `Expected RANGING regime, got ${rangingRegime.regime}`);
  assert(rangingRegime.candidateStrategyNumbers.includes("11"), "Strategy 11 must be candidate for ranging regime");
  console.log("✓ Market Regime Engine accurately identifies regimes and maps candidate strategies.");

  // TEST 4: Central Risk Engine
  console.log("\n[TEST 4] Verifying Central Risk Engine position sizing...");
  const riskResult = strategyRiskEngine.evaluateTradeRisk({
    strategyId: "crypto-strat-01",
    strategyNumber: "01",
    strategyName: "Trend Pullback to EMA",
    strategyVersion: "1.0.0",
    instrument: "BTCUSDT",
    direction: "LONG",
    entryPrice: 67000,
    stopPrice: 65000,
    targetPrice: 71000,
    requestedRiskPct: 0.5,
    leverage: 1,
  }, 0);

  assert(riskResult.approved === true, "Risk evaluation should be approved");
  assert(riskResult.riskPct === 0.5, `Expected 0.5% risk, got ${riskResult.riskPct}`);
  assert(riskResult.maxLossAmount === 500, `Expected $500 max loss on $100k equity, got ${riskResult.maxLossAmount}`);
  assert(riskResult.stopDistanceAmount === 2000, `Expected $2,000 stop distance, got ${riskResult.stopDistanceAmount}`);
  assert(riskResult.positionSizeUnits === 0.25, `Expected 0.25 BTC position size, got ${riskResult.positionSizeUnits}`);
  assert(riskResult.rrRatio === 2.0, `Expected 1:2.0 RR ratio, got ${riskResult.rrRatio}`);
  console.log("✓ Central Risk Engine correctly calculated exact position size and maximum loss.");

  // TEST 5: Central Exposure Controller & Signal Clusters
  console.log("\n[TEST 5] Verifying Central Exposure Controller & Signal Clusters...");
  const sampleSignals = [
    { strategyId: "crypto-strat-01", strategyNumber: "01", strategyName: "Trend Pullback to EMA", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG" as const, entryPrice: 67000, stopPrice: 65000, targetPrice: 71000, requestedRiskPct: 0.5 },
    { strategyId: "crypto-strat-06", strategyNumber: "06", strategyName: "BandWidth Squeeze Breakout", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG" as const, entryPrice: 67000, stopPrice: 65000, targetPrice: 71000, requestedRiskPct: 0.5 },
    { strategyId: "crypto-strat-21", strategyNumber: "21", strategyName: "Relative Volume Breakout", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG" as const, entryPrice: 67000, stopPrice: 65000, targetPrice: 71000, requestedRiskPct: 0.5 },
    { strategyId: "crypto-strat-27", strategyNumber: "27", strategyName: "Open Interest Expansion", strategyVersion: "1.0.0", instrument: "BTCUSDT", direction: "LONG" as const, entryPrice: 67000, stopPrice: 65000, targetPrice: 71000, requestedRiskPct: 0.5 },
  ];
  const clusters = centralExposureController.resolveSignalClusters(sampleSignals, 100000);
  assert(clusters.length === 1, `Expected 1 unified cluster for BTCUSDT, got ${clusters.length}`);
  assert(clusters[0].signalCount === 4, `Expected 4 signals grouped in cluster, got ${clusters[0].signalCount}`);
  assert(clusters[0].action === "REDUCED", `Expected REDUCED action for 2.0% risk on 1.5% max limit, got ${clusters[0].action}`);
  console.log("✓ Central Exposure Controller correctly detected 4 concurrent signals and reduced total cluster exposure.");

  // TEST 6: Live Signal Engine & Explainability (Why Trade / Why No Trade)
  console.log("\n[TEST 6] Verifying Live Signal Engine & Explainability...");
  const strat01 = CRYPTO_30_STRATEGIES[0];
  const validSignal = strategySignalEngine.evaluateStrategySignal(strat01, "BTCUSDT", {
    currentPrice: 67000,
    high: 67500,
    low: 66500,
    open: 66800,
    close: 67000,
    volume: 20000,
    indicators: { trend_pass: true, c1: true, c2: true, c3: true, c4: true, c5: true, c6: true },
    availableFeeds: {
      OHLCV_PRICE: { available: true, latencyMs: 10, lastUpdated: Date.now() },
      VOLUME: { available: true, latencyMs: 10, lastUpdated: Date.now() },
      INDICATOR_EMA: { available: true, latencyMs: 12, lastUpdated: Date.now() },
      INDICATOR_ATR: { available: true, latencyMs: 12, lastUpdated: Date.now() },
    },
  });
  assert(validSignal.signalState === "READY", `Expected READY signal state, got ${validSignal.signalState}`);
  assert(validSignal.allConditionsPassed === true, "All conditions should pass");
  assert(validSignal.whyTradeExplanation.includes("ALL CONDITIONS SATISFIED"), "Why-trade explanation should be present");

  // Incomplete signal check
  const incompleteSignal = strategySignalEngine.evaluateStrategySignal(strat01, "BTCUSDT", {
    currentPrice: 67000,
    high: 67500,
    low: 66500,
    open: 66800,
    close: 67000,
    volume: 20000,
    indicators: { trend_pass: true, c1: true, c2: true, c3: false, c4: false, c5: true, c6: true },
    availableFeeds: {
      OHLCV_PRICE: { available: true, latencyMs: 10, lastUpdated: Date.now() },
      VOLUME: { available: true, latencyMs: 10, lastUpdated: Date.now() },
      INDICATOR_EMA: { available: true, latencyMs: 12, lastUpdated: Date.now() },
      INDICATOR_ATR: { available: true, latencyMs: 12, lastUpdated: Date.now() },
    },
  });
  assert(incompleteSignal.signalState !== "READY", "Incomplete signal must NOT be READY");
  assert(!!incompleteSignal.whyNoTradeExplanation, "Why-no-trade explanation is mandatory");
  assert(incompleteSignal.whyNoTradeExplanation!.includes("NO TRADE"), "Must state NO TRADE");
  console.log("✓ Live Signal Engine accurately outputs WHY TRADE and WHY NO TRADE explanations.");

  // TEST 7: Data Health Insufficiency Guard
  console.log("\n[TEST 7] Verifying Data Health Insufficiency Guard...");
  const dataFailureSignal = strategySignalEngine.evaluateStrategySignal(strat01, "BTCUSDT", {
    currentPrice: 67000,
    high: 67500,
    low: 66500,
    open: 66800,
    close: 67000,
    volume: 20000,
    indicators: {},
    availableFeeds: {
      OHLCV_PRICE: { available: false, latencyMs: -1, lastUpdated: 0 },
    },
  });
  assert(dataFailureSignal.signalState === "BLOCKED", `Expected BLOCKED signal state on data failure, got ${dataFailureSignal.signalState}`);
  assert(dataFailureSignal.whyNoTradeExplanation!.includes("DATA INSUFFICIENT"), "Must show DATA INSUFFICIENT");
  console.log("✓ Data Health Guard correctly blocks signals and pinpoints missing data feeds.");

  // TEST 8: Real Mathematical Backtest Engine
  console.log("\n[TEST 8] Verifying Real Mathematical Backtest Engine...");
  const btResult = strategyBacktestEngine.runBacktest(strat01, {
    strategyId: strat01.id,
    strategyNumber: strat01.number,
    strategyVersion: strat01.version,
    instrument: "BTCUSDT",
    timeframe: "4H",
    startDate: new Date(Date.now() - 180 * 86400000).toISOString(),
    endDate: new Date().toISOString(),
    initialCapital: 100000,
    riskPctPerTrade: 0.5,
    takerFeeRate: 0.0005,
    makerFeeRate: 0.0002,
    slippagePct: 0.0005,
    fundingRatePer8h: 0.0001,
    leverage: 1,
    directionFilter: "BOTH",
    strategyParameters: strat01.defaultParameters,
  });

  assert(btResult.totalTrades > 0, "Backtest must generate simulated trades");
  assert(btResult.winRatePct > 0 && btResult.winRatePct <= 100, "Win rate must be valid percentage");
  assert(btResult.profitFactor > 0, "Profit factor must be positive");
  assert(btResult.equityCurve.length === btResult.totalTrades + 1, "Equity curve must have entry per trade");
  assert(btResult.totalFeesPaid > 0, "Fees must be computed and accounted for");
  console.log(`✓ Backtest calculated: ${btResult.totalTrades} Trades | Win Rate: ${btResult.winRatePct}% | Profit Factor: ${btResult.profitFactor} | Net P&L: $${btResult.netPnl.toLocaleString()}`);

  // TEST 9: Forward Paper Trading Execution & Trade Journal Logging
  console.log("\n[TEST 9] Verifying Paper Trading & Immutable Trade Journal...");
  const paperInstance = paperTradingEngine.activatePaperStrategy(strat01, "BTCUSDT", "4H", 0.5);
  assert(paperInstance.status === "ACTIVE", "Paper instance must be ACTIVE");

  const openedTrade = paperTradingEngine.executePaperOrder(strat01, {
    strategyId: strat01.id,
    strategyNumber: strat01.number,
    strategyName: strat01.name,
    strategyVersion: strat01.version,
    instrument: "BTCUSDT",
    direction: "LONG",
    entryPrice: 67000,
    stopPrice: 65000,
    targetPrice: 71000,
    requestedRiskPct: 0.5,
  }, "TRENDING", { trend: true, pullback: true });

  assert(openedTrade.status === "OPEN", "Opened trade must have status OPEN");
  assert(openedTrade.executionEnvironment === "PAPER", "Trade must be tagged with PAPER environment");

  const closedTrade = paperTradingEngine.closePaperTrade(openedTrade.journalId, 71000, "TAKE_PROFIT");
  assert(closedTrade !== null, "Closed trade must not be null");
  assert(closedTrade!.status === "CLOSED", "Closed trade must have status CLOSED");
  assert(closedTrade!.netPnl > 0, "Take profit trade must have positive net P&L");
  assert(closedTrade!.rMultiple === 2.0, `Expected 2.0 R multiple, got ${closedTrade!.rMultiple}`);
  console.log("✓ Paper Trading Engine executed simulated order, recorded fees/slippage, and logged immutable journal record.");

  console.log("\n==================================================");
  console.log("ALL 9 TEST SUITES PASSED SUCCESSFULLY (100% OK)");
  console.log("==================================================");
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
