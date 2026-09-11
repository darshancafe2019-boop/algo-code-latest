/**
 * Test Suite: Option Chain & Options Flow Terminal Analytics & Mathematics
 */

import {
  normCdf,
  calculateBlackScholesGreeks,
  calculateIntrinsicAndTimeValue,
  classifyOIBuildup,
  getATMStrike,
  classifyMoneyness,
  calculatePCRMetrics,
  calculateMaxPain,
  findSupportResistanceZones,
  getIndianMarketStatus,
  classifyTradeFlow,
  formatIndianCurrency,
  formatIndianQuantity,
} from "../lib/options/options-analytics-engine";
import { OptionStrikeRowData } from "../types/option-terminal";

function runTests() {
  console.log("==================================================");
  console.log("RUNNING OPTION TERMINAL ANALYTICS & MATH TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details: string = "") {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  // 1. Black-Scholes Greeks Calculation
  const callGreeks = calculateBlackScholesGreeks("CE", 25000, 25000, 7 / 365, 0.15, 0.065);
  assert(callGreeks.delta > 0.45 && callGreeks.delta < 0.55, "ATM Call Delta is approximately ~0.50", `Got ${callGreeks.delta}`);
  assert(callGreeks.gamma > 0, "Call Gamma is strictly positive", `Got ${callGreeks.gamma}`);
  assert(callGreeks.theta < 0, "Call Theta represents negative time decay", `Got ${callGreeks.theta}`);
  assert(callGreeks.vega > 0, "Call Vega is positive", `Got ${callGreeks.vega}`);

  const putGreeks = calculateBlackScholesGreeks("PE", 25000, 25000, 7 / 365, 0.15, 0.065);
  assert(putGreeks.delta < -0.45 && putGreeks.delta > -0.55, "ATM Put Delta is approximately ~ -0.50", `Got ${putGreeks.delta}`);
  assert(putGreeks.theta < 0, "Put Theta represents negative time decay", `Got ${putGreeks.theta}`);

  // 2. Intrinsic and Time Value Calculation
  const itmCallVal = calculateIntrinsicAndTimeValue("CE", 25420, 25000, 480);
  assert(itmCallVal.intrinsic === 420, "ITM Call intrinsic value = Spot - Strike", `Got ${itmCallVal.intrinsic}`);
  assert(itmCallVal.timeValue === 60, "ITM Call time value = LTP - Intrinsic", `Got ${itmCallVal.timeValue}`);

  const otmCallVal = calculateIntrinsicAndTimeValue("CE", 25420, 25800, 50);
  assert(otmCallVal.intrinsic === 0, "OTM Call intrinsic value = 0", `Got ${otmCallVal.intrinsic}`);
  assert(otmCallVal.timeValue === 50, "OTM Call time value = LTP", `Got ${otmCallVal.timeValue}`);

  // 3. ATM Detection and Moneyness
  const strikes = [25200, 25300, 25400, 25500, 25600];
  const atm = getATMStrike(25420, strikes);
  assert(atm === 25400, "ATM Strike for Spot 25,420 is 25,400", `Got ${atm}`);

  assert(classifyMoneyness("CE", 25300, 25420, 25400) === "ITM", "Call with strike < spot is ITM");
  assert(classifyMoneyness("CE", 25400, 25420, 25400) === "ATM", "Call with strike == atm is ATM");
  assert(classifyMoneyness("CE", 25500, 25420, 25400) === "OTM", "Call with strike > spot is OTM");

  assert(classifyMoneyness("PE", 25500, 25420, 25400) === "ITM", "Put with strike > spot is ITM");
  assert(classifyMoneyness("PE", 25400, 25420, 25400) === "ATM", "Put with strike == atm is ATM");
  assert(classifyMoneyness("PE", 25300, 25420, 25400) === "OTM", "Put with strike < spot is OTM");

  // 4. Open Interest Buildup Matrix
  assert(classifyOIBuildup(15, 5000) === "LONG_BUILDUP", "Price ↑ + OI ↑ is LONG_BUILDUP");
  assert(classifyOIBuildup(-20, 8000) === "SHORT_BUILDUP", "Price ↓ + OI ↑ is SHORT_BUILDUP");
  assert(classifyOIBuildup(-15, -4000) === "LONG_UNWINDING", "Price ↓ + OI ↓ is LONG_UNWINDING");
  assert(classifyOIBuildup(25, -6000) === "SHORT_COVERING", "Price ↑ + OI ↓ is SHORT_COVERING");

  // 5. PCR and Max Pain Calculation on Sample Strikes
  const sampleStrikes: OptionStrikeRowData[] = [
    {
      strike: 25200,
      isATM: false,
      distanceFromSpot: -220,
      distancePct: -0.87,
      moneynessCall: "ITM",
      moneynessPut: "OTM",
      call: {
        symbol: "NIFTY 25200 CE",
        underlying: "NIFTY",
        expiry: "18 Sep 2026",
        strike: 25200,
        optionType: "CE",
        ltp: 280,
        change: 25,
        changePercent: 9.8,
        bid: 279,
        ask: 281,
        bidQty: 500,
        askQty: 500,
        volume: 20000,
        oi: 50000,
        oiChange: 5000,
        oiChangePercent: 11.1,
        moneyness: "ITM",
        intrinsicValue: 220,
        timeValue: 60,
        oiBuildup: "LONG_BUILDUP",
        volumeOiRatio: 0.4,
      },
      put: {
        symbol: "NIFTY 25200 PE",
        underlying: "NIFTY",
        expiry: "18 Sep 2026",
        strike: 25200,
        optionType: "PE",
        ltp: 35,
        change: -12,
        changePercent: -25.5,
        bid: 34,
        ask: 36,
        bidQty: 500,
        askQty: 500,
        volume: 45000,
        oi: 120000,
        oiChange: 15000,
        oiChangePercent: 14.2,
        moneyness: "OTM",
        intrinsicValue: 0,
        timeValue: 35,
        oiBuildup: "SHORT_BUILDUP",
        volumeOiRatio: 0.375,
      },
    },
    {
      strike: 25400,
      isATM: true,
      distanceFromSpot: -20,
      distancePct: -0.08,
      moneynessCall: "ATM",
      moneynessPut: "ATM",
      call: {
        symbol: "NIFTY 25400 CE",
        underlying: "NIFTY",
        expiry: "18 Sep 2026",
        strike: 25400,
        optionType: "CE",
        ltp: 130,
        change: 18,
        changePercent: 16.0,
        bid: 129,
        ask: 131,
        bidQty: 1000,
        askQty: 1000,
        volume: 80000,
        oi: 150000,
        oiChange: 20000,
        oiChangePercent: 15.3,
        moneyness: "ATM",
        intrinsicValue: 20,
        timeValue: 110,
        oiBuildup: "LONG_BUILDUP",
        volumeOiRatio: 0.53,
      },
      put: {
        symbol: "NIFTY 25400 PE",
        underlying: "NIFTY",
        expiry: "18 Sep 2026",
        strike: 25400,
        optionType: "PE",
        ltp: 90,
        change: -15,
        changePercent: -14.2,
        bid: 89,
        ask: 91,
        bidQty: 1000,
        askQty: 1000,
        volume: 75000,
        oi: 160000,
        oiChange: 18000,
        oiChangePercent: 12.6,
        moneyness: "ATM",
        intrinsicValue: 0,
        timeValue: 90,
        oiBuildup: "SHORT_BUILDUP",
        volumeOiRatio: 0.46,
      },
    },
    {
      strike: 25600,
      isATM: false,
      distanceFromSpot: 180,
      distancePct: 0.71,
      moneynessCall: "OTM",
      moneynessPut: "ITM",
      call: {
        symbol: "NIFTY 25600 CE",
        underlying: "NIFTY",
        expiry: "18 Sep 2026",
        strike: 25600,
        optionType: "CE",
        ltp: 40,
        change: 5,
        changePercent: 14.2,
        bid: 39,
        ask: 41,
        bidQty: 1200,
        askQty: 1200,
        volume: 120000,
        oi: 200000,
        oiChange: 35000,
        oiChangePercent: 21.2,
        moneyness: "OTM",
        intrinsicValue: 0,
        timeValue: 40,
        oiBuildup: "LONG_BUILDUP",
        volumeOiRatio: 0.6,
      },
      put: {
        symbol: "NIFTY 25600 PE",
        underlying: "NIFTY",
        expiry: "18 Sep 2026",
        strike: 25600,
        optionType: "PE",
        ltp: 210,
        change: -28,
        changePercent: -11.7,
        bid: 209,
        ask: 211,
        bidQty: 600,
        askQty: 600,
        volume: 30000,
        oi: 40000,
        oiChange: -5000,
        oiChangePercent: -11.1,
        moneyness: "ITM",
        intrinsicValue: 180,
        timeValue: 30,
        oiBuildup: "LONG_UNWINDING",
        volumeOiRatio: 0.75,
      },
    },
  ];

  const pcrMetrics = calculatePCRMetrics(sampleStrikes);
  assert(pcrMetrics.pcrOI !== null && pcrMetrics.pcrOI > 0, "PCR OI is calculated correctly", `Got ${pcrMetrics.pcrOI}`);
  assert(pcrMetrics.totalCallOI === 400000, "Total Call OI matches sum", `Got ${pcrMetrics.totalCallOI}`);
  assert(pcrMetrics.totalPutOI === 320000, "Total Put OI matches sum", `Got ${pcrMetrics.totalPutOI}`);

  const { maxPain } = calculateMaxPain(sampleStrikes);
  assert(maxPain !== null && maxPain >= 25200 && maxPain <= 25600, "Max Pain is within active strike range", `Got ${maxPain}`);

  const { supportZone, resistanceZone } = findSupportResistanceZones(sampleStrikes);
  assert(supportZone?.strike === 25400, "Support zone matches highest Put OI strike (160k @ 25400)", `Got ${supportZone?.strike}`);
  assert(resistanceZone?.strike === 25600, "Resistance zone matches highest Call OI strike (200k @ 25600)", `Got ${resistanceZone?.strike}`);

  // 6. Flow Trade Classification & Sentiment Scoring
  const buyCallTrade = classifyTradeFlow("CE", "BUY", 131, 129, 131, 5000, 150000, 655000, 128);
  assert(buyCallTrade.sentiment === "BULLISH", "Buying Call @ Ask is classified as BULLISH");
  assert(buyCallTrade.confidence >= 70, "Bullish flow confidence score >= 70%", `Got ${buyCallTrade.confidence}%`);

  const buyPutTrade = classifyTradeFlow("PE", "BUY", 91, 89, 91, 6000, 160000, 546000, -50);
  assert(buyPutTrade.sentiment === "BEARISH", "Buying Put @ Ask with negative spot change is BEARISH");

  // 7. Unusual Activity Detector
  const unusualTrade = classifyTradeFlow("CE", "BUY", 145, 143, 145, 50000, 10000, 7250000, 150);
  assert(unusualTrade.signalType === "UNUSUAL_ACTIVITY", "Trade with Vol/OI 5.0x and ₹72.5L premium is UNUSUAL_ACTIVITY", `Got ${unusualTrade.signalType}`);

  // 8. Indian Currency and Number Formatting
  assert(formatIndianCurrency(25420.35, "₹") === "₹25.42 K", "Indian currency format 25.42 K", `Got ${formatIndianCurrency(25420.35, "₹")}`);
  assert(formatIndianCurrency(1284000, "₹") === "₹12.84 L", "Indian currency format Lakhs (12.84 L)", `Got ${formatIndianCurrency(1284000, "₹")}`);
  assert(formatIndianCurrency(153100000, "₹") === "₹15.31 Cr", "Indian currency format Crores (15.31 Cr)", `Got ${formatIndianCurrency(153100000, "₹")}`);
  assert(formatIndianQuantity(12840000) === "1.28 Cr", "Indian quantity Crores (1.28 Cr)", `Got ${formatIndianQuantity(12840000)}`);
  assert(formatIndianQuantity(145000) === "1.45 L", "Indian quantity Lakhs (1.45 L)", `Got ${formatIndianQuantity(145000)}`);

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
