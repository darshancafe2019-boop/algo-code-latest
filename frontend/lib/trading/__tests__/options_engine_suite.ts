/**
 * Automated Options Strategy & Trading Engine Test Suite
 * =======================================================
 * Validates:
 * 1. Registration of all 17 options strategies
 * 2. Market State Analyzer regime synthesis
 * 3. Strategy Selector ranking & proposal generation
 * 4. 14 Mandatory RiskEngine pre-trade checks
 * 5. Paper broker execution and atomic multi-leg fill
 * 6. PositionManager P&L tracking & Greeks calculation
 * 7. CommandRouter dispatch contracts
 * 8. Emergency Stop & Kill Switch enforcement
 */

import {
  StrategyRegistry,
  MarketStateAnalyzer,
  StrategySelector,
  RiskEngine,
  globalExecutionEngine,
  globalPositionManager,
  TradingCommandRouter,
} from "../engine/StrategyEngine";
import { MarketContext, TradeProposal } from "../strategies/base/StrategyTypes";
import "../strategies/options"; // Auto-registers 17 strategies

async function runTestSuite() {
  console.log("=================================================");
  console.log("RUNNING OPTIONS TRADING ENGINE VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  // TEST 1: Verify all 17 Strategies Registered
  const allStrategies = StrategyRegistry.getAllStrategies();
  assert(allStrategies.length === 17, `All 17 strategies registered (found ${allStrategies.length})`);

  // TEST 2: Market State Analyzer on Bullish Context
  const bullishContext: MarketContext = {
    underlying: "NIFTY",
    assetClass: "INDEX",
    spotPrice: 24500,
    timestamp: new Date().toISOString(),
    indicators: {
      rsi14: 62.0,
      ema20: 24350,
      ema50: 24100,
      ema200: 23500,
      atr14: 300,
      adx14: 28.0,
    },
    volatility: {
      impliedVol: 0.14,
      ivRank: 42,
    },
    optionChain: {
      selectedExpiry: "2026-09-04",
      availableExpiries: ["2026-09-04", "2026-09-18"],
      maxPain: 24400,
      pcrOi: 1.15,
      pcrVolume: 1.10,
      totalCallOi: 1000000,
      totalPutOi: 1150000,
      atmStrike: 24500,
      stepSize: 100,
      strikes: [],
    },
    dataQuality: {
      spotAvailable: true,
      indicatorsAvailable: true,
      chainAvailable: true,
      isStale: false,
    },
  };

  const state = MarketStateAnalyzer.analyze(bullishContext);
  assert(state.regime === "BULLISH" || state.regime === "STRONG_BULLISH", `Market regime correctly classified as ${state.regime}`);
  assert(state.bias === "BULLISH", `Directional bias classified as ${state.bias}`);

  // TEST 3: Strategy Selection & Ranking
  const selectionResult = await StrategySelector.selectStrategies(bullishContext);
  assert(selectionResult.rankedProposals.length > 0, `Generated ${selectionResult.rankedProposals.length} eligible proposals`);
  const top = selectionResult.primaryRecommendation;
  assert(!!top, `Primary recommendation generated: ${top?.strategyName}`);
  assert(top?.legs.length! >= 1, `Top proposal has ${top?.legs.length} legs`);
  assert(top?.greeks.delta !== undefined, `Greeks calculated: Delta = ${top?.greeks.delta}`);

  // TEST 4: RiskEngine Validation on Top Proposal
  const limits = {
    totalBalance: 100000,
    availableMargin: 90000,
    dailyRealizedPnl: 0,
    maxDailyLossLimit: 2000,
    maxRiskPerTradePercent: 2.0,
    maxAccountMarginUtilizationPercent: 75.0,
    maxSimultaneousPositions: 5,
    maxSameUnderlyingPositions: 2,
    maxBidAskSpreadPercent: 5.0,
    minDaysToExpiry: 0.25,
  };

  const riskReport = RiskEngine.validateTrade(top!, limits, []);
  assert(riskReport.approved, "Trade proposal passed all 14 RiskEngine pre-checks");

  // TEST 5: Paper Execution
  const execResult = await globalExecutionEngine.executeTrade(top!);
  assert(execResult.success, `Trade executed successfully in PAPER mode: ${execResult.message}`);
  assert(!!execResult.position, "Position created and tracked in PositionManager");

  // TEST 6: Position Tracking & Greeks
  const openPositions = globalPositionManager.getOpenPositions();
  assert(openPositions.length >= 1, `Position manager has ${openPositions.length} open position(s)`);

  const portfolioGreeks = globalPositionManager.getAggregatedPortfolioGreeks();
  assert(portfolioGreeks.delta !== undefined, `Portfolio Greeks calculated: Delta ${portfolioGreeks.delta}, Theta ${portfolioGreeks.theta}`);

  // TEST 7: Command Router
  const cmdRes = await TradingCommandRouter.execute({
    type: "ANALYZE_MARKET",
    marketContext: bullishContext,
  });
  assert(cmdRes.success, `CommandRouter executed ANALYZE_MARKET: ${cmdRes.message}`);

  // TEST 8: Emergency Stop & Kill Switch
  const stopRes = await TradingCommandRouter.execute({ type: "EMERGENCY_STOP" });
  assert(stopRes.success, "Emergency stop executed");
  assert(RiskEngine.isKillSwitchActive(), "Kill Switch is now active");
  assert(globalPositionManager.getOpenPositions().length === 0, "All open positions closed on Emergency Stop");

  // Reset Kill Switch for normal operations
  RiskEngine.resetKillSwitch();
  assert(!RiskEngine.isKillSwitchActive(), "Kill Switch successfully reset");

  console.log(`\n=================================================`);
  console.log(`ALL ${passed}/${total} TEST SUITE ASSERTIONS PASSED SUCCESSFULLY!`);
  console.log(`=================================================\n`);
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
