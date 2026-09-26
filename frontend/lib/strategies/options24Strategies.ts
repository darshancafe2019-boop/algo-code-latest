/**
 * QUANT.OS AUTHORITATIVE 24 MULTI-LEG OPTIONS & INCOME STRATEGIES CATALOG
 * =========================================================================
 * Comprehensive multi-leg option architectures for Indian (NIFTY/BANKNIFTY) &
 * Crypto (BTC/ETH Delta/Deribit) derivative markets.
 *
 * Covers:
 * 1. Short Iron Condor (Range-bound 4-leg credit)
 * 2. Long Iron Condor (High-volatility 4-leg breakout)
 * 3. Long Butterfly (Pinpoint low-cost 3/4-leg)
 * 4. Iron Butterfly (ATM volatility crush & theta decay)
 * 5. Bull Call Spread (Defined-risk upside debit spread)
 * 6. Bear Put Spread (Defined-risk downside debit spread)
 * 7. Bull Put Credit Spread (High-probability directional credit)
 * 8. Bear Call Credit Spread (Resistance ceiling credit harvest)
 * 9. Short Straddle (Maximum delta-neutral theta harvest)
 * 10. Long Straddle (Gamma breakout explosion engine)
 * 11. Short Strangle (Wide range statistical premium collection)
 * 12. Long Strangle (Low-cost extreme volatility runner)
 * 13. Long Calendar Spread (Time decay differential / Vega positive)
 * 14. Diagonal Calendar Spread (Dynamic synthetic covered strangle)
 * 15. Ratio Front Spread (3-leg asymmetric income)
 * 16. Call Backspread (Unlimited upside volatility breakout)
 * 17. Put Backspread (Tail-risk crash hedge & downside engine)
 * 18. Covered Call (Underlying holding + monthly yield harvest)
 * 19. Cash-Secured Put (Accumulation discount & credit engine)
 * 20. Collar (Zero-cost downside capital insurance)
 * 21. Synthetic Long Combination (Leveraged underlying surrogate)
 * 22. Jade Lizard / Covered Combination (No-upside-risk premium play)
 * 23. Double Diagonal Spread (Multi-tenor range boundary engine)
 * 24. Delta-Neutral Dynamic Iron Condor (0.15 Delta active scalp)
 */

import {
  CryptoStrategyDefinition,
  StrategyIndicatorSpec,
  SetupConditionRule,
  TradeSimulationExample,
} from "./crypto30Strategies";

export const OPTIONS_24_STRATEGIES: CryptoStrategyDefinition[] = [
  // 1. Short Iron Condor
  {
    number: "31",
    id: "options-strat-01",
    name: "Short Iron Condor Range Income",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H", "1H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Option Chain Greeks", "Implied Volatility Rank (IVR > 35)", "Delta (0.15 - 0.20)", "Theta", "Max Pain"],
    whatItDoes:
      "Sells an OTM Call Spread and an OTM Put Spread simultaneously around a range-bound asset. Collects upfront net credit while capping downside and upside risk with purchased wings.",
    whyItExists:
      "Exploits the mathematical reality that implied volatility exceeds realized volatility over 80% of the time, profiting from time decay (Theta) and IV compression within a defined channel.",
    bestMarketConditions: [
      "Range-bound sideways consolidation",
      "High Implied Volatility Rank (IV Rank > 40) before expected contraction",
      "Far from major structural breakouts or monetary announcements",
    ],
    unfavorableConditions: [
      "Strong directional trending regimes (ADX > 30)",
      "Low IV environments (IV Rank < 20) with thin premiums",
      "Major binary macro events (Budget, CPI, FOMC, Fork)",
    ],
    indicators: [
      { name: "IV Rank", parameter: "> 40", purpose: "Ensures rich options premium collection", defaultSetting: "IV Rank 40" },
      { name: "Delta Filter", parameter: "0.15 - 0.20", purpose: "Short strike selection for 80%+ probability of profit", defaultSetting: "15 Delta" },
      { name: "Wing Width ATR", parameter: "1.0 - 1.5 ATR", purpose: "Long wing hedge strike distance", defaultSetting: "1.2 ATR" },
      { name: "Bollinger Envelope", parameter: "20, 2.5", purpose: "Verifies price is safely inside outer bands", defaultSetting: "BB 20, 2.5" },
    ],
    setupConditions: [
      { id: "c1", name: "High IV Condition", description: "IV Rank >= 35 or IV Percentile >= 40", category: "VOLATILITY", required: true },
      { id: "c2", name: "Regime Confirmation", description: "Market in RANGING or LOW VOLATILITY regime (ADX < 25)", category: "TREND", required: true },
      { id: "c3", name: "Strike Delta Symmetry", description: "Short Call Delta <= 0.20 and Short Put Delta <= 0.20", category: "STRUCTURE", required: true },
      { id: "c4", name: "Credit Threshold", description: "Net Credit collected >= 30% of wing width", category: "RISK", required: true },
      { id: "c5", name: "DTE Window", description: "Days to expiration between 7 and 35 DTE", category: "CRYPTO_SPECIFIC", required: true },
      { id: "c6", name: "Risk Clearance", description: "Max risk <= 2% total account equity per cycle", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY / BTC-OPT",
      direction: "LONG / SHORT",
      entryPrice: 24500,
      stopPrice: 24850,
      targetPrice: 24500,
      riskPct: 1.0,
      rrRatio: "1:2.30",
      positionSizingNote: "4-Leg Wing Defined Risk (2 lots)",
      steps: [
        { step: "SIGNAL", title: "IV Rank 54 & Sideways Channel PASS", detail: "NIFTY trading in 24,200-24,800 band | IV Rank: 54 | ADX: 18.2 | Short Strikes: 24000 PE (0.16 Delta) & 25000 CE (0.16 Delta)" },
        { step: "ENTRY", title: "4-Leg Combo Executed", detail: "Sell 24000 PE @ ₹48, Buy 23800 PE @ ₹22, Sell 25000 CE @ ₹42, Buy 25200 CE @ ₹18. Net Credit Collected: ₹50/share" },
        { step: "STOP_TARGET", title: "Profit & Stop Defined", detail: "Take Profit at 50% max profit (+₹25 credit decay) | Stop Loss triggered if underlying breaks either short strike" },
        { step: "POSITION", title: "Managing Theta Decay", detail: "Positive daily theta +₹620/day | Delta neutral between -0.05 and +0.05" },
        { step: "EXIT", title: "50% Max Profit Target Reached", detail: "Closed combo after 12 days for ₹24 buy-back (+₹26 net profit per unit)" },
        { step: "JOURNAL", title: "Logged Execution", detail: "Audit confirmed full Greek neutrality, IV crush capture, and zero slippage on combo fill" },
      ],
    },
    defaultParameters: { short_delta: 0.16, wing_width_pts: 200, min_iv_rank: 35, profit_target_pct: 50, stop_loss_pct: 150, target_dte: 21 },
    version: "1.0.0",
  },

  // 2. Long Iron Condor
  {
    number: "32",
    id: "options-strat-02",
    name: "Long Iron Condor Volatility Breakout",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["HIGH VOLATILITY", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Option Chain Greeks", "Low IV Rank (< 25)", "Volatility Compression Bandwidth", "Vega", "Gamma"],
    whatItDoes:
      "Buys an OTM Call Spread and an OTM Put Spread with narrow debit cost. Generates maximum profit if the underlying makes a large explosive breakout in either direction while capping debit risk.",
    whyItExists:
      "Capitalizes on extreme volatility expansion from low-IV squeezes (e.g. prior to major earnings or rate decisions) at a fraction of the cost of a long straddle.",
    bestMarketConditions: [
      "Extremely compressed volatility (IV Rank < 20)",
      "Consolidation at multi-week apex of symmetrical triangle",
      "Imminent major macro catalyst with large directional ambiguity",
    ],
    unfavorableConditions: [
      "Ranging flat markets without forthcoming catalysts",
      "High IV Rank where theta decay degrades debit rapidly",
    ],
    indicators: [
      { name: "IV Rank", parameter: "< 25", purpose: "Ensures cheap option premiums at entry", defaultSetting: "IV Rank 20" },
      { name: "Bollinger Squeeze", parameter: "20, 2.0", purpose: "Detects historical volatility compression", defaultSetting: "BB Squeeze" },
      { name: "ATR Percentile", parameter: "< 20%", purpose: "Identifies explosive expansion potential", defaultSetting: "ATR < 20th" },
    ],
    setupConditions: [
      { id: "c1", name: "Low IV Entry", description: "IV Rank <= 25 across near-term expiries", category: "VOLATILITY", required: true },
      { id: "c2", name: "Squeeze Detected", description: "Bollinger Bandwidth at 60-day lows", category: "VOLATILITY", required: true },
      { id: "c3", name: "Debit Limit", description: "Total debit paid <= 25% of spread width", category: "RISK", required: true },
      { id: "c4", name: "Catalyst Clearance", description: "High-impact event scheduled within 14 DTE", category: "DATA", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / NIFTY",
      direction: "LONG / SHORT",
      entryPrice: 65000,
      stopPrice: 65000,
      targetPrice: 71000,
      riskPct: 0.5,
      rrRatio: "1:3.20",
      positionSizingNote: "Defined Risk Debit Combo",
      steps: [
        { step: "SIGNAL", title: "IV Rank 12 & Apex Compression", detail: "BTC volatility compressed at $65,000 | IV Rank: 12 | Debit cost 18% of wing width" },
        { step: "ENTRY", title: "Debit Combo Opened", detail: "Buy 67k CE / Sell 70k CE & Buy 63k PE / Sell 60k PE for $450 total debit" },
        { step: "STOP_TARGET", title: "Defined Payoff", detail: "Max Loss capped at $450 debit | Max Profit $1,550 on move beyond $70k or $60k" },
        { step: "POSITION", title: "Vega Expansion", detail: "Price explodes toward $71,200 | IV expands from 38% to 65%" },
        { step: "EXIT", title: "Target Reached", detail: "Sold combo for $1,420 net credit (+215% ROI on debit)" },
        { step: "JOURNAL", title: "Logged Audit", detail: "Successful gamma/vega expansion capture" },
      ],
    },
    defaultParameters: { long_delta: 0.30, short_delta: 0.15, max_debit_ratio: 0.25, dte: 14 },
    version: "1.0.0",
  },

  // 3. Long Butterfly
  {
    number: "33",
    id: "options-strat-03",
    name: "Long Butterfly Defined Risk",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Option Chain Greeks", "Max Pain Pinpoint Strike", "Theta", "Low Net Debit"],
    whatItDoes:
      "Constructs a 3-strike multi-leg structure (Buy 1 Lower Strike, Sell 2 Body Strikes, Buy 1 Higher Strike). Yields a very high reward-to-risk ratio if the underlying pins near the body strike at expiry.",
    whyItExists:
      "Allows options traders to target high-confidence pin areas (e.g. Max Pain or heavy Open Interest nodes) with extremely low capital at risk and asymmetrical payout ratios (often 4:1 to 8:1).",
    bestMarketConditions: [
      "Asset consolidating near heavy Open Interest concentration",
      "Expected pinning action during expiry week",
      "Moderate to low volatility with clear pin anchor",
    ],
    unfavorableConditions: [
      "Violent breakout market running past outer wing strikes",
      "Excessive bid-ask spreads across 3 separate strike legs",
    ],
    indicators: [
      { name: "Max Pain Strike", parameter: "Option Chain", purpose: "Pin target center strike alignment", defaultSetting: "Max Pain" },
      { name: "Open Interest Wall", parameter: "Top CE + PE Strike", purpose: "Pin boundary confirmation", defaultSetting: "Top OI Strike" },
      { name: "Theta Acceleration", parameter: "< 10 DTE", purpose: "Optimal time decay zone", defaultSetting: "7-10 DTE" },
    ],
    setupConditions: [
      { id: "c1", name: "Pin Target Alignment", description: "Body strike matches Max Pain or major OI peak", category: "STRUCTURE", required: true },
      { id: "c2", name: "High Reward-to-Risk", description: "Max profit / Debit cost >= 4.0", category: "RISK", required: true },
      { id: "c3", name: "Low Net Debit", description: "Net debit <= 15% of wing width", category: "RISK", required: true },
      { id: "c4", name: "Expiries < 14 DTE", description: "Enters inside optimal theta capture window", category: "CRYPTO_SPECIFIC", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY Weekly",
      direction: "LONG / SHORT",
      entryPrice: 24600,
      stopPrice: 24350,
      targetPrice: 24600,
      riskPct: 0.4,
      rrRatio: "1:5.50",
      positionSizingNote: "1-2-1 Butterfly Combo",
      steps: [
        { step: "SIGNAL", title: "Max Pain Pin Target 24,600", detail: "NIFTY at 24,580 | Max Pain at 24,600 with 1.4x Put-Call OI parity | 7 DTE" },
        { step: "ENTRY", title: "1-2-1 Butterfly Filled", detail: "Buy 1x 24400 CE @ ₹220, Sell 2x 24600 CE @ ₹90 each, Buy 1x 24800 CE @ ₹15. Net Debit: ₹55" },
        { step: "STOP_TARGET", title: "Risk Profile", detail: "Max Risk: ₹55/share | Max Potential Profit: ₹145/share at 24,600 pin" },
        { step: "POSITION", title: "Theta Accelerates", detail: "Price hovers around 24,605 | Short body decay outpacing long wings" },
        { step: "EXIT", title: "Expiry Day Closure", detail: "Closed on expiry morning at ₹162 value (+195% gain on debit)" },
        { step: "JOURNAL", title: "Logged Record", detail: "Perfect pin alignment with Max Pain calculation" },
      ],
    },
    defaultParameters: { wing_step_pts: 200, target_dte: 7, max_debit_pts: 60, min_rr: 3.5 },
    version: "1.0.0",
  },

  // 4. Iron Butterfly
  {
    number: "34",
    id: "options-strat-04",
    name: "Iron Butterfly ATM Pin",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Option Chain Greeks", "ATM Implied Volatility", "Theta Decay Acceleration", "IV Rank > 45"],
    whatItDoes:
      "Sells an ATM Call and ATM Put (Straddle) while simultaneously buying an OTM Call and OTM Put for defined protection. Generates substantial credit and maximizes return when price finishes near ATM strike.",
    whyItExists:
      "Offers higher credit collection than an Iron Condor by bringing short strikes directly to the money where theta decay and extrinsic value are highest.",
    bestMarketConditions: [
      "High IV Rank (IVR > 45) with strong mean-reversion expectations",
      "Strong support/resistance confluence directly at the current spot level",
      "Short DTE trading (3-10 days) to maximize theta yield",
    ],
    unfavorableConditions: [
      "Strong trend momentum moving immediately away from ATM strike",
      "Low IV environments where ATM credit is too thin",
    ],
    indicators: [
      { name: "ATM Straddle Price", parameter: "CE + PE ATM", purpose: "Defines expected move threshold", defaultSetting: "ATM Price" },
      { name: "IV Rank", parameter: "> 45", purpose: "Ensures rich ATM premium", defaultSetting: "IV Rank 45" },
      { name: "Delta Neutrality", parameter: "ATM ± 0.05", purpose: "Equalizes call and put risk", defaultSetting: "0.0 Delta" },
    ],
    setupConditions: [
      { id: "c1", name: "High IV Spike", description: "IV Rank >= 45 prior to event or range phase", category: "VOLATILITY", required: true },
      { id: "c2", name: "High Credit Yield", description: "Total credit collected >= 50% of wing width", category: "RISK", required: true },
      { id: "c3", name: "Short Expiry Focus", description: "Optimal DTE between 3 and 10 days", category: "CRYPTO_SPECIFIC", required: true },
      { id: "c4", name: "Risk Clearance", description: "Max loss capped at wing width minus net credit", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / BANKNIFTY",
      direction: "LONG / SHORT",
      entryPrice: 52000,
      stopPrice: 53500,
      targetPrice: 52000,
      riskPct: 1.0,
      rrRatio: "1:1.65",
      positionSizingNote: "Defined Risk ATM 4-Leg Combo",
      steps: [
        { step: "SIGNAL", title: "IV Spike at 52,000 Range Core", detail: "BANKNIFTY at 52,000 | IV Rank: 58 | ATM 52000 Straddle value ₹980" },
        { step: "ENTRY", title: "4-Leg Iron Fly Executed", detail: "Sell 52000 CE & PE @ ₹980 total | Buy 52800 CE & 51200 PE @ ₹360 total | Net Credit ₹620" },
        { step: "STOP_TARGET", title: "Breakevens Defined", detail: "Breakevens at 51,380 and 52,620 | Target: 50% Max Profit (₹310 credit capture)" },
        { step: "POSITION", title: "Rapid Theta Decay", detail: "Underlying stays in 51,800 - 52,200 range | Extrinsic premium melting daily" },
        { step: "EXIT", title: "Target Hit", detail: "Bought back at ₹290 combo value (+₹330 profit per lot)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Clean execution with defined risk safety" },
      ],
    },
    defaultParameters: { wing_width_pts: 800, min_credit_ratio: 0.50, profit_target_pct: 50, target_dte: 7 },
    version: "1.0.0",
  },

  // 5. Bull Call Spread
  {
    number: "35",
    id: "options-strat-05",
    name: "Bull Call Spread Defined Debit",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H", "1H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["TRENDING", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Directional Trend Signals", "Option Chain Greeks", "Delta (0.45 - 0.60)", "IV Rank < 40"],
    whatItDoes:
      "Buys an ATM/ITM Call and sells a higher OTM Call. Provides structured bullish exposure with capped upside and defined maximum loss equal to the net debit paid.",
    whyItExists:
      "Reduces the cost of a long call by 40-60% through selling the upper call, reducing theta drag and lowering the required breakeven price.",
    bestMarketConditions: [
      "Moderate bullish trend continuation or breakout from key resistance",
      "Moderate to low implied volatility",
      "Clear upside resistance target aligned with the short call strike",
    ],
    unfavorableConditions: [
      "High IV Rank where buying options is overpriced",
      "Bearish breakdown or severe chop",
    ],
    indicators: [
      { name: "EMA Trend", parameter: "20 / 50", purpose: "Confirms bullish trend alignment", defaultSetting: "EMA 20 > 50" },
      { name: "RSI Momentum", parameter: "14", purpose: "Bullish momentum > 52", defaultSetting: "RSI > 52" },
      { name: "Delta Long Leg", parameter: "0.50 - 0.55", purpose: "Strong directional participation", defaultSetting: "50 Delta" },
    ],
    setupConditions: [
      { id: "c1", name: "Bullish Trend Confirmation", description: "Price > EMA 50 with higher high structure", category: "TREND", required: true },
      { id: "c2", name: "Moderate IV Environment", description: "IV Rank <= 45 to avoid overpaying for debit", category: "VOLATILITY", required: true },
      { id: "c3", name: "Reward-to-Risk >= 1.5", description: "Spread width minus debit >= 1.5x debit cost", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY / ETH-OPT",
      direction: "LONG",
      entryPrice: 24700,
      stopPrice: 24500,
      targetPrice: 25100,
      riskPct: 0.5,
      rrRatio: "1:1.85",
      positionSizingNote: "Defined Risk Vertical Spread",
      steps: [
        { step: "SIGNAL", title: "Bullish 4H Breakout PASS", detail: "NIFTY breaks above 24,700 resistance | RSI 58 | IV Rank: 28" },
        { step: "ENTRY", title: "Spread Executed", detail: "Buy 24700 CE @ ₹140, Sell 25000 CE @ ₹42. Net Debit: ₹98/share" },
        { step: "STOP_TARGET", title: "Payoff Sized", detail: "Max Risk ₹98 | Max Gain ₹202 (300 width - 98 debit) at or above 25,000" },
        { step: "POSITION", title: "Trending Higher", detail: "NIFTY rallies to 25,050 | Short call caps upside but ensures max value" },
        { step: "EXIT", title: "Target Realized", detail: "Closed spread at ₹265 (+170% on debit capital)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Clean directional execution with zero overnight gamma risk" },
      ],
    },
    defaultParameters: { spread_width_pts: 300, max_debit_ratio: 0.40, target_dte: 14 },
    version: "1.0.0",
  },

  // 6. Bear Put Spread
  {
    number: "36",
    id: "options-strat-06",
    name: "Bear Put Spread Defined Debit",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H", "1H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "SHORT",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["TRENDING", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Bearish Trend Breakdown Signals", "Option Chain Greeks", "Delta Put (0.45 - 0.60)", "IV Rank < 45"],
    whatItDoes:
      "Buys an ATM/ITM Put and sells a lower OTM Put. Provides structured downside profit potential while capping risk strictly to the net debit paid.",
    whyItExists:
      "Mitigates downside put volatility skew by selling the cheaper out-of-the-money put to finance the primary long put position.",
    bestMarketConditions: [
      "Confirmed bearish trend continuation or breakdown through key floor",
      "Moderate implied volatility prior to panic cascades",
      "Clear downside target matching the short put strike",
    ],
    unfavorableConditions: [
      "Strong bullish momentum",
      "Deeply depressed markets ready for sudden short-squeeze reversals",
    ],
    indicators: [
      { name: "EMA Trend", parameter: "20 / 50", purpose: "Bearish trend alignment EMA 20 < 50", defaultSetting: "EMA 20 < 50" },
      { name: "RSI Bearish", parameter: "14", purpose: "RSI < 45 confirming bearish momentum", defaultSetting: "RSI < 45" },
      { name: "Support Breakdown", parameter: "Swing Low", purpose: "Price close below prior support", defaultSetting: "Low Breakdown" },
    ],
    setupConditions: [
      { id: "c1", name: "Bearish Market Structure", description: "Price below EMA 50 with lower lows", category: "TREND", required: true },
      { id: "c2", name: "Debit Cost Constraint", description: "Net debit paid <= 38% of spread width", category: "RISK", required: true },
      { id: "c3", name: "Target Realism", description: "Target strike above major structural demand floor", category: "STRUCTURE", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / BANKNIFTY",
      direction: "SHORT",
      entryPrice: 66000,
      stopPrice: 67800,
      targetPrice: 62000,
      riskPct: 0.5,
      rrRatio: "1:2.10",
      positionSizingNote: "Defined Risk Bear Put Spread",
      steps: [
        { step: "SIGNAL", title: "Daily Breakdown Triggered", detail: "BTC rejects $66,000 resistance | RSI: 41 | IV Rank: 32" },
        { step: "ENTRY", title: "Spread Filled", detail: "Buy 66000 PE @ $1,250, Sell 62000 PE @ $380. Net Debit: $870" },
        { step: "STOP_TARGET", title: "Risk Profile", detail: "Max Risk: $870 | Max Profit: $3,130 ($4,000 width - $870 debit)" },
        { step: "POSITION", title: "Downside Follow-Through", detail: "Price declines to $61,800 | Both puts in the money" },
        { step: "EXIT", title: "Closed for Profit", detail: "Liquidated spread at $3,550 value (+308% return on debit)" },
        { step: "JOURNAL", title: "Audit Logged", detail: "Structured downside capture without unlimited margin liability" },
      ],
    },
    defaultParameters: { spread_width_pts: 4000, max_debit_ratio: 0.35, target_dte: 14 },
    version: "1.0.0",
  },

  // 7. Bull Put Credit Spread
  {
    number: "37",
    id: "options-strat-07",
    name: "Bull Put Credit Spread Support Harvest",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["TRENDING", "RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Support Level Identification", "IV Rank >= 30", "Short Put Delta 0.20-0.25", "Long Wing Delta 0.08-0.12"],
    whatItDoes:
      "Sells an OTM Put below key support and buys a further OTM Put for protection. Collects net credit and yields 100% profit as long as the asset stays above the short put strike.",
    whyItExists:
      "Provides high-probability bullish or neutral income generation with defined loss, allowing the trader to be wrong on direction slightly and still achieve full profitability.",
    bestMarketConditions: [
      "Bullish trend or strong sideways support holding firm",
      "High IV Rank where put skew offers elevated credit",
      "Clear multi-touch horizontal support level below spot",
    ],
    unfavorableConditions: [
      "Aggressive breakdown cascades through support levels",
      "Extremely low IV environments where credit is negligible",
    ],
    indicators: [
      { name: "Support Level", parameter: "Prior Swing Low", purpose: "Strike placement safely below support", defaultSetting: "Key Support" },
      { name: "Short Put Delta", parameter: "0.18 - 0.22", purpose: "80%+ probability of expiring worthless", defaultSetting: "20 Delta" },
      { name: "IV Rank", parameter: "> 30", purpose: "Ensures adequate premium generation", defaultSetting: "IV Rank 30" },
    ],
    setupConditions: [
      { id: "c1", name: "Support Verification", description: "Short strike placed at least 1.5 ATR below current support", category: "STRUCTURE", required: true },
      { id: "c2", name: "Credit Criterion", description: "Credit collected >= 28% of spread width", category: "RISK", required: true },
      { id: "c3", name: "Trend Support", description: "Price > EMA 200 or bouncing off EMA 50", category: "TREND", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY / BTC-OPT",
      direction: "LONG",
      entryPrice: 24800,
      stopPrice: 24350,
      targetPrice: 24800,
      riskPct: 0.8,
      rrRatio: "1:2.50",
      positionSizingNote: "Bullish Vertical Credit Spread",
      steps: [
        { step: "SIGNAL", title: "Support Bounce at 24,650", detail: "NIFTY holds 24,650 support | IV Rank: 38 | ADX: 22" },
        { step: "ENTRY", title: "Credit Spread Sold", detail: "Sell 24400 PE @ ₹55, Buy 24100 PE @ ₹16. Net Credit Collected: ₹39/share" },
        { step: "STOP_TARGET", title: "Risk Sized", detail: "Max Gain: ₹39 | Max Loss: ₹261 (₹300 width - ₹39 credit) | Stop on 24,400 breach" },
        { step: "POSITION", title: "Theta Harvest", detail: "NIFTY drifts between 24,800 and 25,000 | Put values melt toward ₹0" },
        { step: "EXIT", title: "Closed at 80% Profit", detail: "Bought back spread at ₹7/share (+₹32 net profit per unit)" },
        { step: "JOURNAL", title: "Logged Record", detail: "Clean high-probability theta harvest completed" },
      ],
    },
    defaultParameters: { short_delta: 0.20, spread_width_pts: 300, profit_target_pct: 75, target_dte: 14 },
    version: "1.0.0",
  },

  // 8. Bear Call Credit Spread
  {
    number: "38",
    id: "options-strat-08",
    name: "Bear Call Credit Spread Ceiling Harvest",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "SHORT",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["TRENDING", "RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Resistance Ceiling", "IV Rank >= 30", "Short Call Delta 0.18-0.22", "Long Wing Delta 0.08-0.12"],
    whatItDoes:
      "Sells an OTM Call above major resistance and buys a higher OTM Call for safety. Collects upfront credit and keeps 100% of profit if the market remains below the short call strike.",
    whyItExists:
      "Capitalizes on overhead resistance barriers and call premium decay without requiring a violent crash to generate positive returns.",
    bestMarketConditions: [
      "Bearish trend or strong resistance rejection",
      "Overbought technical exhaustion near major resistance ceiling",
      "High IV Rank",
    ],
    unfavorableConditions: [
      "High-momentum bullish breakout through resistance",
      "Very low IV environment",
    ],
    indicators: [
      { name: "Resistance Ceiling", parameter: "Swing High", purpose: "Safe strike placement above structural resistance", defaultSetting: "Major Resistance" },
      { name: "Short Call Delta", parameter: "0.18 - 0.22", purpose: "High probability of expiring OTM", defaultSetting: "20 Delta" },
      { name: "RSI Divergence", parameter: "14", purpose: "Bearish divergence at resistance", defaultSetting: "Bearish Div" },
    ],
    setupConditions: [
      { id: "c1", name: "Ceiling Strike Placement", description: "Short call placed above strong technical resistance ceiling", category: "STRUCTURE", required: true },
      { id: "c2", name: "Credit Constraint", description: "Net credit >= 28% of spread width", category: "RISK", required: true },
      { id: "c3", name: "Bearish/Neutral Alignment", description: "Price rejecting resistance or below EMA 20", category: "TREND", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / NIFTY",
      direction: "SHORT",
      entryPrice: 68000,
      stopPrice: 72000,
      targetPrice: 67000,
      riskPct: 0.8,
      rrRatio: "1:2.40",
      positionSizingNote: "Bearish Vertical Credit Spread",
      steps: [
        { step: "SIGNAL", title: "Resistance Rejection at $68,500", detail: "BTC stalls at $68,500 resistance | IV Rank: 44 | Short Strike: $72,000 CE (0.18 Delta)" },
        { step: "ENTRY", title: "Call Credit Spread Sold", detail: "Sell 72000 CE @ $620, Buy 75000 CE @ $180. Net Credit Collected: $440" },
        { step: "STOP_TARGET", title: "Risk Managed", detail: "Max Risk: $2,560 ($3,000 width - $440 credit) | Target: 75% profit ($330 capture)" },
        { step: "POSITION", title: "Call Premium Collapses", detail: "BTC pulls back to $66,500 | Call options lose delta rapidly" },
        { step: "EXIT", title: "Closed Early", detail: "Bought back at $85 combo cost (+80% profit capture)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Successful resistance harvest executed" },
      ],
    },
    defaultParameters: { short_delta: 0.20, spread_width_pts: 3000, profit_target_pct: 75, target_dte: 14 },
    version: "1.0.0",
  },

  // 9. Short Straddle
  {
    number: "39",
    id: "options-strat-09",
    name: "Short Straddle Delta-Neutral Theta Harvest",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Option Chain Greeks", "Implied Volatility vs Realized Volatility", "Theta Acceleration", "Delta Hedging Tools"],
    whatItDoes:
      "Sells an ATM Call and ATM Put simultaneously with identical strikes and expiration. Generates maximum premium income and theta decay, profiting when the market moves less than the premium collected.",
    whyItExists:
      "Institutional volatility arbitrage strategy designed to harvest the variance risk premium (the structural premium where IV > RV).",
    bestMarketConditions: [
      "Post-event volatility collapse (e.g. immediately after results or major speeches)",
      "Strict sideways consolidation with low realized volatility",
      "Very high IV Rank with impending calmness",
    ],
    unfavorableConditions: [
      "Unanchored trending runs or runaway breakout momentum",
      "Low IV Rank environments offering inadequate premium cushion",
    ],
    indicators: [
      { name: "IV vs RV Spread", parameter: "IV - RV 20D", purpose: "Confirms positive volatility risk premium", defaultSetting: "IV > RV + 5%" },
      { name: "Straddle Breakeven Envelope", parameter: "ATM ± Combined Premium", purpose: "Defines profitable price corridor", defaultSetting: "Breakeven Bounds" },
      { name: "Combined Theta", parameter: "Call + Put Theta", purpose: "Daily time decay earnings rate", defaultSetting: "Max Daily Theta" },
    ],
    setupConditions: [
      { id: "c1", name: "High IV Spike", description: "IV Rank >= 60 with expected volatility collapse", category: "VOLATILITY", required: true },
      { id: "c2", name: "Delta Neutrality", description: "Initial portfolio net delta within ± 0.05", category: "RISK", required: true },
      { id: "c3", name: "Stop Loss Protocol", description: "Strict stop loss set at 1.5x total premium collected", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BANKNIFTY Weekly",
      direction: "LONG / SHORT",
      entryPrice: 51500,
      stopPrice: 52400,
      targetPrice: 51500,
      riskPct: 1.5,
      rrRatio: "1:1.50",
      positionSizingNote: "Delta-Neutral Straddle with Dynamic Delta Hedge",
      steps: [
        { step: "SIGNAL", title: "IV Spike to 68 Post-Macro Surge", detail: "BANKNIFTY at 51,500 | IV Rank: 68 | ATM Straddle premium ₹920 (1.78% of spot)" },
        { step: "ENTRY", title: "ATM Straddle Sold", detail: "Sell 51500 CE @ ₹465 & Sell 51500 PE @ ₹455. Total Credit: ₹920" },
        { step: "STOP_TARGET", title: "Risk Bounds Set", detail: "Breakevens at 50,580 and 52,420 | Stop Loss: ₹1,380 total combo value (1.5x credit)" },
        { step: "POSITION", title: "Theta Capture", detail: "Price fluctuates between 51,300 and 51,700 | ₹140/share daily decay captured" },
        { step: "EXIT", title: "50% Max Profit Achieved", detail: "Closed straddle after 4 days at ₹450 value (+₹470 net gain per unit)" },
        { step: "JOURNAL", title: "Audit Logged", detail: "Clean variance premium harvest with zero delta hedge triggers breached" },
      ],
    },
    defaultParameters: { min_iv_rank: 60, profit_target_pct: 50, stop_multiplier: 1.5, target_dte: 5 },
    version: "1.0.0",
  },

  // 10. Long Straddle
  {
    number: "40",
    id: "options-strat-10",
    name: "Long Straddle Gamma Explosion",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["HIGH VOLATILITY", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Option Chain Greeks", "Low IV Rank (< 20)", "High Gamma Exposure", "Major Binary Catalyst Ahead"],
    whatItDoes:
      "Buys an ATM Call and ATM Put simultaneously. Generates unlimited profit potential if the underlying asset makes a violent move in either direction exceeding the total premium paid.",
    whyItExists:
      "Exploits massive mispriced volatility prior to game-changing catalysts when option premiums are historically dirt cheap.",
    bestMarketConditions: [
      "Extremely low IV Rank (IVR < 20) with market underpricing upcoming risk",
      "Immediate upcoming binary event (court ruling, ETF approval, election, emergency rate change)",
      "Technical multi-month coil ready for explosive directional expansion",
    ],
    unfavorableConditions: [
      "High IV Rank where theta decay erodes premium faster than price moves",
      "Quiet sideways summer trading ranges",
    ],
    indicators: [
      { name: "IV Rank", parameter: "< 20", purpose: "Ensures cheap entry price for options", defaultSetting: "IV Rank < 20" },
      { name: "Historical Bandwidth", parameter: "20", purpose: "Quantifies multi-month volatility compression", defaultSetting: "Bandwidth Lowest 10%" },
      { name: "Catalyst DTE", parameter: "<= 5 DTE", purpose: "Ensures catalyst occurs before theta decay accelerates", defaultSetting: "Event DTE" },
    ],
    setupConditions: [
      { id: "c1", name: "Depressed Volatility Entry", description: "IV Rank <= 20 across target series", category: "VOLATILITY", required: true },
      { id: "c2", name: "Definite High-Impact Catalyst", description: "Confirmed date for major market-moving catalyst", category: "DATA", required: true },
      { id: "c3", name: "Capital Risk Cap", description: "Total straddle cost <= 1.0% of trading portfolio", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / NIFTY",
      direction: "LONG / SHORT",
      entryPrice: 62000,
      stopPrice: 62000,
      targetPrice: 69000,
      riskPct: 1.0,
      rrRatio: "1:2.80",
      positionSizingNote: "Gamma Breakout Combo",
      steps: [
        { step: "SIGNAL", title: "IV at 10-Month Low (IV Rank 14)", detail: "BTC coiling at $62,000 | IV Rank: 14 | Major regulatory decision within 3 days" },
        { step: "ENTRY", title: "ATM Straddle Bought", detail: "Buy 62000 CE @ $1,400 & Buy 62000 PE @ $1,350. Total Cost: $2,750" },
        { step: "STOP_TARGET", title: "Breakeven Thresholds", detail: "Breakevens at $59,250 and $64,750 | Max loss capped at $2,750" },
        { step: "POSITION", title: "Violent Surge", detail: "Asset explodes to $68,800 (+11%) | Call value skyrockets to $7,200 while IV surges 25 points" },
        { step: "EXIT", title: "Target Liquidated", detail: "Closed combo for $7,650 total value (+178% net profit on capital)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Explosive gamma acceleration capture completed" },
      ],
    },
    defaultParameters: { max_iv_rank: 20, max_dte: 10, profit_target_pct: 100, max_holding_days: 4 },
    version: "1.0.0",
  },

  // 11. Short Strangle
  {
    number: "41",
    id: "options-strat-11",
    name: "Short Strangle Range Boundary Collector",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Option Chain Greeks", "0.10 - 0.15 Delta Selection", "IV Rank >= 50", "Margin Buffer & Stop Management"],
    whatItDoes:
      "Sells an OTM Put and an OTM Call at distant strikes outside the expected move. Generates income from theta decay across a very wide profit corridor.",
    whyItExists:
      "Gives traders a wider margin for error than a straddle (often 85%+ win rate) by setting short strikes far away from current price action during elevated IV regimes.",
    bestMarketConditions: [
      "Broad ranging market with well-defined structural boundaries",
      "High IV Rank (IVR > 50) where out-of-the-money options are richly priced",
      "Stable macroeconomic backdrop",
    ],
    unfavorableConditions: [
      "Low IV environments offering meager premium for tail risk",
      "Momentum regime shifts or breakout gap events",
    ],
    indicators: [
      { name: "Delta Selection", parameter: "0.10 - 0.15", purpose: "Ensures strikes are far beyond standard deviation move", defaultSetting: "12 Delta" },
      { name: "IV Rank", parameter: "> 50", purpose: "Rich volatility premium entry filter", defaultSetting: "IV Rank 50" },
      { name: "ATR Multiplier", parameter: "2.5 ATR", purpose: "Strike distance from spot price", defaultSetting: "2.5 ATR Buffer" },
    ],
    setupConditions: [
      { id: "c1", name: "High IV Requirement", description: "IV Rank >= 50 across target month", category: "VOLATILITY", required: true },
      { id: "c2", name: "Symmetric Delta Sizing", description: "Call Delta <= 0.15 and Put Delta <= 0.15", category: "RISK", required: true },
      { id: "c3", name: "Stop Protocol", description: "Stop loss set at 2x credit collected on either individual leg", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY / BTC-OPT",
      direction: "LONG / SHORT",
      entryPrice: 24500,
      stopPrice: 25400,
      targetPrice: 24500,
      riskPct: 1.2,
      rrRatio: "1:1.80",
      positionSizingNote: "Wide 12-Delta Strangle",
      steps: [
        { step: "SIGNAL", title: "IV Rank 58 & Range Confluence", detail: "NIFTY at 24,500 | IV Rank: 58 | 21 DTE | Short Strikes: 23,800 PE (0.12 Delta) & 25,200 CE (0.12 Delta)" },
        { step: "ENTRY", title: "Strangle Sold", detail: "Sell 23800 PE @ ₹52 & Sell 25200 CE @ ₹48. Total Credit: ₹100/share" },
        { step: "STOP_TARGET", title: "Safety Rules Active", detail: "Stop loss if either leg doubles to ₹100 | Target: 50% max profit (₹50 capture)" },
        { step: "POSITION", title: "Theta Harvest", detail: "NIFTY moves within 24,300-24,750 | Both legs decay by 55%" },
        { step: "EXIT", title: "Target Reached", detail: "Closed combo for ₹46 total (+₹54 net profit per share)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Smooth range harvest with low stress" },
      ],
    },
    defaultParameters: { delta: 0.12, min_iv_rank: 50, profit_target_pct: 50, leg_stop_multiplier: 2.0, target_dte: 21 },
    version: "1.0.0",
  },

  // 12. Long Strangle
  {
    number: "42",
    id: "options-strat-12",
    name: "Long Strangle Tail Volatility Runner",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["HIGH VOLATILITY", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Option Chain Greeks", "Low IV Rank (< 20)", "Low Capital Outlay", "Anticipated Giant Range Expansion"],
    whatItDoes:
      "Buys an OTM Call and an OTM Put simultaneously at a very low total debit cost. Generates substantial asymmetric gains if the market experiences an extreme trend shock.",
    whyItExists:
      "Provides a significantly lower cost alternative to a long straddle for capturing tail-risk expansion and massive multi-standard-deviation market swings.",
    bestMarketConditions: [
      "Extremely cheap option premiums (IV Rank < 20)",
      "Prolonged multi-month dead quiet markets awaiting massive catalyst",
      "Expected extreme range expansion (e.g. ETF listings, sovereign debt crises)",
    ],
    unfavorableConditions: [
      "Normal ranging markets where OTM options expire worthless",
      "High IV environments where premiums are inflated",
    ],
    indicators: [
      { name: "IV Rank", parameter: "< 20", purpose: "Cheap option entry pricing", defaultSetting: "IV Rank < 20" },
      { name: "Delta Selection", parameter: "0.25 - 0.30", purpose: "Cost-effective strike distance", defaultSetting: "25 Delta" },
      { name: "Compression Index", parameter: "BB Width < 5%", purpose: "Detects maximum tightness", defaultSetting: "Tight Squeeze" },
    ],
    setupConditions: [
      { id: "c1", name: "Low Volatility Entry", description: "IV Rank <= 20", category: "VOLATILITY", required: true },
      { id: "c2", name: "Debit Cap", description: "Total cost <= 0.6% of account equity", category: "RISK", required: true },
      { id: "c3", name: "Time Horizon", description: "Target DTE between 14 and 35 days", category: "CRYPTO_SPECIFIC", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / BANKNIFTY",
      direction: "LONG / SHORT",
      entryPrice: 60000,
      stopPrice: 60000,
      targetPrice: 68000,
      riskPct: 0.5,
      rrRatio: "1:3.50",
      positionSizingNote: "Asymmetric Volatility Runner",
      steps: [
        { step: "SIGNAL", title: "Apex Squeeze on BTC Daily", detail: "BTC compressed at $60,000 | IV Rank: 16 | 28 DTE" },
        { step: "ENTRY", title: "Strangle Bought", detail: "Buy 64000 CE @ $750 & Buy 56000 PE @ $680. Total Cost: $1,430" },
        { step: "STOP_TARGET", title: "Asymmetric Profile", detail: "Risk capped at $1,430 | Target: 150% profit ($3,575 value)" },
        { step: "POSITION", title: "Major Upside Shock", detail: "BTC surges to $67,500 | 64000 CE goes deep ITM to $4,800 value" },
        { step: "EXIT", title: "Liquidated for Profit", detail: "Sold combo for $5,100 (+256% net return on debit)" },
        { step: "JOURNAL", title: "Audit Verified", detail: "Flawless volatility expansion capture" },
      ],
    },
    defaultParameters: { delta: 0.25, max_iv_rank: 20, profit_target_pct: 150, target_dte: 28 },
    version: "1.0.0",
  },

  // 13. Long Calendar Spread
  {
    number: "43",
    id: "options-strat-13",
    name: "Long Calendar Time Spread (Vega Positive)",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Term Structure Volatility", "Front vs Back Month IV", "ATM Strike Alignment", "Positive Vega"],
    whatItDoes:
      "Sells a near-term ATM option and buys a longer-dated ATM option at the same strike. Profits from the faster theta decay of the front-month option and any subsequent increase in implied volatility.",
    whyItExists:
      "Exploits the non-linear curvature of theta decay (which accelerates exponentially in the final 14 days) while maintaining positive Vega exposure to volatility spikes.",
    bestMarketConditions: [
      "Front-month IV near normal or low levels with expected stability",
      "Asset trading near key psychological support/resistance anchor",
      "Anticipation of future volatility expansion in later months",
    ],
    unfavorableConditions: [
      "Massive immediate directional trends blasting through the calendar tent",
      "Inverted term structure with near-term IV excessively high",
    ],
    indicators: [
      { name: "Term Structure Spread", parameter: "Back IV - Front IV", purpose: "Identifies normal contango term structure", defaultSetting: "Contango Spread" },
      { name: "Theta Differential", parameter: "Front Theta / Back Theta", purpose: "Ensures 2x+ faster front-month decay", defaultSetting: "Theta Ratio > 1.8" },
      { name: "Anchor Strike", parameter: "ATM / Max Pain", purpose: "Center strike alignment", defaultSetting: "ATM Strike" },
    ],
    setupConditions: [
      { id: "c1", name: "Term Structure Favorable", description: "Front month IV <= Back month IV (normal term structure)", category: "VOLATILITY", required: true },
      { id: "c2", name: "Anchor Strike Alignment", description: "Strike placed directly at high-probability consolidation level", category: "STRUCTURE", required: true },
      { id: "c3", name: "Debit Limit", description: "Net debit <= 1.2% of spot price", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY Monthly/Weekly",
      direction: "LONG / SHORT",
      entryPrice: 24600,
      stopPrice: 24200,
      targetPrice: 24600,
      riskPct: 0.5,
      rrRatio: "1:2.10",
      positionSizingNote: "Time Decay & Vega Spread",
      steps: [
        { step: "SIGNAL", title: "Consolidation at 24,600 with Contango IV", detail: "NIFTY at 24,600 | Front Weekly IV: 12.5% | Back Monthly IV: 14.8% | Ratio: 1.18" },
        { step: "ENTRY", title: "Calendar Spread Opened", detail: "Sell 7-DTE 24600 CE @ ₹75, Buy 28-DTE 24600 CE @ ₹220. Net Debit: ₹145/share" },
        { step: "STOP_TARGET", title: "Risk Defined", detail: "Max Risk: ₹145 debit | Target: 40% gain (+₹58/share) upon front-week expiration" },
        { step: "POSITION", title: "Front Month Decay", detail: "NIFTY pins at 24,610 on front expiry | Front call expires to ₹5 | Back call retains ₹210 value" },
        { step: "EXIT", title: "Profit Harvested", detail: "Closed calendar at ₹205 value (+41% return on capital in 7 days)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Clean time-decay capture verified" },
      ],
    },
    defaultParameters: { front_dte: 7, back_dte: 28, profit_target_pct: 40, stop_loss_pct: 50 },
    version: "1.0.0",
  },

  // 14. Diagonal Spread
  {
    number: "44",
    id: "options-strat-14",
    name: "Diagonal Calendar Spread Dynamic Rent",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["TRENDING", "RANGING"],
    dataRequirements: ["Deep ITM Back-Month Call (Delta 0.70-0.80)", "Short OTM Front-Month Call (Delta 0.20-0.30)", "Theta Differential"],
    whatItDoes:
      "Buys a deep ITM long-dated option (simulating stock ownership with low capital) and repeatedly sells short-term OTM options against it to collect weekly cash flow.",
    whyItExists:
      "Acts as a 'Poor Man's Covered Call', giving the trader the exact cash-flow dynamics of a covered call strategy with 70% less capital required.",
    bestMarketConditions: [
      "Moderate long-term bullish bias with short-term consolidation pauses",
      "Steady upward trending market that does not explode vertically too fast",
    ],
    unfavorableConditions: [
      "Violent market crashes that erode the long-dated deep ITM anchor option",
    ],
    indicators: [
      { name: "Long Leg Delta", parameter: "0.75 - 0.85", purpose: "High intrinsic value replacement for underlying", defaultSetting: "80 Delta" },
      { name: "Short Leg Delta", parameter: "0.20 - 0.25", purpose: "Safe weekly rental collection strike", defaultSetting: "20 Delta" },
      { name: "Trend Anchor", parameter: "EMA 200", purpose: "Long-term bullish filter", defaultSetting: "Price > EMA 200" },
    ],
    setupConditions: [
      { id: "c1", name: "Macro Bullish Alignment", description: "Underlying trading above EMA 200 on Daily timeframe", category: "TREND", required: true },
      { id: "c2", name: "Delta Cushion", description: "Long Delta >= 0.75 and Short Delta <= 0.25", category: "RISK", required: true },
      { id: "c3", name: "Net Debit < Stock Cost", description: "Total capital used <= 25% of equivalent 100 shares", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / NIFTY",
      direction: "LONG",
      entryPrice: 65000,
      stopPrice: 61000,
      targetPrice: 70000,
      riskPct: 1.0,
      rrRatio: "1:2.40",
      positionSizingNote: "Synthetic Covered Call Diagonal",
      steps: [
        { step: "SIGNAL", title: "Bullish Trend Anchor PASS", detail: "BTC at $65,000 | Daily trend bullish | 60 DTE long vs 14 DTE short" },
        { step: "ENTRY", title: "Diagonal Position Opened", detail: "Buy 60-DTE 58000 CE (0.80 Delta) @ $9,200 & Sell 14-DTE 68000 CE (0.22 Delta) @ $950. Net Debit: $8,250" },
        { step: "STOP_TARGET", title: "Weekly Cashflow Protocol", detail: "Short call expires worthless or rolled for continuous premium" },
        { step: "POSITION", title: "First Cycle Decay", detail: "BTC rises to $66,800 | 14-DTE short call expires to $60 | Long call appreciates to $10,400" },
        { step: "EXIT", title: "Rolled / Closed with Profit", detail: "Closed cycle for $10,340 (+25.3% cash return on capital in 14 days)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Synthetic covered call mechanics validated" },
      ],
    },
    defaultParameters: { long_delta: 0.80, short_delta: 0.22, long_dte: 60, short_dte: 14 },
    version: "1.0.0",
  },

  // 15. Ratio Front Spread
  {
    number: "45",
    id: "options-strat-15",
    name: "Ratio Front Spread Asymmetric Income",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY", "TRENDING"],
    dataRequirements: ["1x Long ATM Call/Put", "2x Short OTM Call/Put", "Zero or Credit Entry", "Tail Risk Management"],
    whatItDoes:
      "Buys 1 ATM option and sells 2 OTM options for zero debit or a net credit. Yields maximum profit if the asset moves directly to the short strike at expiry, while carrying zero risk if the asset moves the wrong way.",
    whyItExists:
      "Enables traders to take a directional bet with zero loss if wrong on direction, funded completely by the extra out-of-the-money option sold.",
    bestMarketConditions: [
      "Moderate directional bias toward a specific technical ceiling/floor",
      "High implied volatility where OTM options are richly priced",
    ],
    unfavorableConditions: [
      "Violent runaway breakout far beyond the short strikes where naked risk lies",
    ],
    indicators: [
      { name: "Ratio Credit Check", parameter: "2x Short - 1x Long", purpose: "Ensures zero or positive credit on entry", defaultSetting: "Credit >= 0" },
      { name: "Short Strike Delta", parameter: "0.20 - 0.25", purpose: "Safe distance for double short legs", defaultSetting: "20 Delta" },
      { name: "Resistance Target", parameter: "Key Pivot", purpose: "Short strike placement directly at target resistance", defaultSetting: "Target Resistance" },
    ],
    setupConditions: [
      { id: "c1", name: "Net Credit or Zero Cost", description: "Combined entry pricing generates net credit >= 0", category: "RISK", required: true },
      { id: "c2", name: "Pinpoint Target Location", description: "Double short strikes aligned with major structural resistance/support", category: "STRUCTURE", required: true },
      { id: "c3", name: "Uncapped Tail Stop Rule", description: "Strict stop trigger at 1.5x strike distance breach", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY / BTC-OPT",
      direction: "LONG",
      entryPrice: 24500,
      stopPrice: 25300,
      targetPrice: 24900,
      riskPct: 0.8,
      rrRatio: "1:3.00",
      positionSizingNote: "1x2 Call Ratio Spread",
      steps: [
        { step: "SIGNAL", title: "Target Resistance at 24,900 PASS", detail: "NIFTY at 24,500 | Strong resistance at 24,900 | IV Rank: 42" },
        { step: "ENTRY", title: "1x2 Ratio Filled for Credit", detail: "Buy 1x 24500 CE @ ₹160 & Sell 2x 24900 CE @ ₹85 each. Net Credit: ₹10/share" },
        { step: "STOP_TARGET", title: "Asymmetric Payoff", detail: "If market drops: keep ₹10 credit (Zero loss) | If market rises to 24,900: Max profit ₹410/share" },
        { step: "POSITION", title: "Drifts Toward Short Strike", detail: "NIFTY rallies steadily to 24,880 at expiry | Max intrinsic and theta convergence" },
        { step: "EXIT", title: "Closed at Max Value", detail: "Closed position for ₹380/share net profit" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Zero-downside directional ratio trade completed successfully" },
      ],
    },
    defaultParameters: { long_delta: 0.50, short_delta: 0.20, min_credit: 0, target_dte: 14 },
    version: "1.0.0",
  },

  // 16. Call Backspread
  {
    number: "46",
    id: "options-strat-16",
    name: "Call Backspread Volatility Explosion",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["HIGH VOLATILITY", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Sell 1x ITM/ATM Call", "Buy 2x OTM Calls", "Low or Zero Net Debit", "Positive Gamma / Unlimited Upside"],
    whatItDoes:
      "Sells 1 ITM/ATM Call to finance the purchase of 2 (or more) OTM Calls. Provides unlimited upside profit potential with positive gamma during massive bull runs, while carrying zero or negligible risk if the market drops.",
    whyItExists:
      "Allows aggressive upside volatility speculation without the high theta decay penalty of traditional long calls.",
    bestMarketConditions: [
      "Extremely explosive upside momentum anticipated",
      "Low to moderate IV Rank",
    ],
    unfavorableConditions: [
      "Asset stalling directly at the short call strike at expiration (the valley of maximum loss)",
    ],
    indicators: [
      { name: "ADX Trend Strength", parameter: "> 30", purpose: "Confirms powerful directional velocity", defaultSetting: "ADX > 30" },
      { name: "Volume Climax", parameter: "RVOL > 2.0", purpose: "Signals institutional buying expansion", defaultSetting: "RVOL > 2.0" },
    ],
    setupConditions: [
      { id: "c1", name: "High Momentum Trigger", description: "Daily breakout with ADX > 28 and expanding volume", category: "MOMENTUM", required: true },
      { id: "c2", name: "Cost Neutrality Check", description: "Debit paid <= 5% of spread width", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / NIFTY",
      direction: "LONG",
      entryPrice: 64000,
      stopPrice: 63500,
      targetPrice: 74000,
      riskPct: 0.6,
      rrRatio: "1:4.20",
      positionSizingNote: "1x2 Bullish Volatility Backspread",
      steps: [
        { step: "SIGNAL", title: "Institutional Breakout Squeeze PASS", detail: "BTC surges through $64,000 | Volume 2.8x average | Positive Gamma" },
        { step: "ENTRY", title: "Backspread Executed", detail: "Sell 1x 64000 CE @ $3,100 & Buy 2x 67000 CE @ $1,500 each. Net Credit: $100" },
        { step: "STOP_TARGET", title: "Payoff Sized", detail: "Downside risk: $0 (keep $100 credit) | Upside: Unlimited 2x gamma runner" },
        { step: "POSITION", title: "Parabolic Run", detail: "BTC spikes to $74,200 | 2x long calls explode in intrinsic value" },
        { step: "EXIT", title: "Profit Harvested", detail: "Closed for $8,200 net profit on zero-capital-risk structure" },
        { step: "JOURNAL", title: "Audit Logged", detail: "Gamma acceleration maximized" },
      ],
    },
    defaultParameters: { short_delta: 0.50, long_delta: 0.28, ratio: "1:2", target_dte: 21 },
    version: "1.0.0",
  },

  // 17. Put Backspread
  {
    number: "47",
    id: "options-strat-17",
    name: "Put Backspread Crash Hedge & Tail Profit",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["HIGH VOLATILITY", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Sell 1x ITM/ATM Put", "Buy 2x OTM Puts", "Zero/Credit Entry", "Unlimited Downside Gamma"],
    whatItDoes:
      "Sells 1 ITM/ATM Put to finance the purchase of 2 OTM Puts. Yields massive exponential returns during market crashes, while providing positive credit if the market rallies.",
    whyItExists:
      "The ultimate professional crash hedge and black-swan tail risk monetizer, offering free downside insurance that pays if the market rallies and explodes if it collapses.",
    bestMarketConditions: [
      "Elevated macro vulnerability with imminent crash risk",
      "Overextended bullish tops showing distribution signals",
    ],
    unfavorableConditions: [
      "Slow shallow grinding downward drift ending right at the short put strike",
    ],
    indicators: [
      { name: "Distribution Days", parameter: "5 in 20 days", purpose: "Detects institutional distribution", defaultSetting: "Inst. Selling" },
      { name: "VIX / IV Term Squeeze", parameter: "Inversion", purpose: "Crash trigger confirmation", defaultSetting: "Front IV Spike" },
    ],
    setupConditions: [
      { id: "c1", name: "Zero/Credit Entry Cost", description: "Short put premium >= 2x Long put premium", category: "RISK", required: true },
      { id: "c2", name: "Macro Vulnerability Check", description: "Underlying near top of cycle with weakening breadth", category: "STRUCTURE", required: true },
    ],
    exampleTrade: {
      instrument: "BANKNIFTY / BTC-OPT",
      direction: "SHORT",
      entryPrice: 52000,
      stopPrice: 52500,
      targetPrice: 47000,
      riskPct: 0.5,
      rrRatio: "1:5.00",
      positionSizingNote: "1x2 Asymmetric Crash Put Backspread",
      steps: [
        { step: "SIGNAL", title: "Distribution Top Triggered", detail: "BANKNIFTY stalls at 52,000 | Heavy institutional distribution detected" },
        { step: "ENTRY", title: "Put Backspread Positioned", detail: "Sell 1x 52000 PE @ ₹850 & Buy 2x 50000 PE @ ₹410 each. Net Credit: ₹30" },
        { step: "STOP_TARGET", title: "Asymmetry Set", detail: "If market rises: Keep ₹30 credit | If crash below 48,000: Exponential gains" },
        { step: "POSITION", title: "Market Sell-Off", detail: "BANKNIFTY plunges to 47,800 (-8%) | 2x long puts gain huge delta & vega" },
        { step: "EXIT", title: "Closed at Peak Volatility", detail: "Liquidated spread for ₹3,450 net gain per unit" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Black swan hedge monetized cleanly" },
      ],
    },
    defaultParameters: { short_delta: 0.50, long_delta: 0.25, ratio: "1:2", target_dte: 28 },
    version: "1.0.0",
  },

  // 18. Covered Call
  {
    number: "48",
    id: "options-strat-18",
    name: "Covered Call Long Portfolio Yield",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["1W"],
    market: "NIFTY / Stock Futures / BTC / ETH Spot",
    direction: "LONG",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["TRENDING", "RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Long Underlying Position (100 shares / 1 BTC / 1 Lot)", "Short OTM Call (Delta 0.20-0.30)", "IV Rank >= 30"],
    whatItDoes:
      "Holds a long underlying asset and sells an OTM Call option against it. Generates continuous recurring monthly cash flow while capping upside at the short call strike.",
    whyItExists:
      "Enhances portfolio returns and lowers cost basis by monetizing extrinsic volatility premium on long-term holdings.",
    bestMarketConditions: [
      "Mildly bullish, neutral, or slow grinding upward markets",
      "Moderate to high implied volatility",
    ],
    unfavorableConditions: [
      "Severe bear market crashes where underlying drops faster than call premium cushion",
    ],
    indicators: [
      { name: "Short Call Delta", parameter: "0.20 - 0.25", purpose: "Ensures 75-80% probability of retaining asset", defaultSetting: "20 Delta" },
      { name: "Monthly Yield Target", parameter: "1.5 - 3.0%", purpose: "Annualized cashflow metric", defaultSetting: "2% Monthly Yield" },
    ],
    setupConditions: [
      { id: "c1", name: "Long Asset Backing", description: "Trader holds 1 lot / 1 BTC / 100 units of underlying", category: "RISK", required: true },
      { id: "c2", name: "Target Strike Above Basis", description: "Short call strike placed above average purchase price", category: "STRUCTURE", required: true },
    ],
    exampleTrade: {
      instrument: "BTC Spot + BTC-OPT",
      direction: "LONG",
      entryPrice: 65000,
      stopPrice: 58000,
      targetPrice: 72000,
      riskPct: 1.0,
      rrRatio: "1:1.50",
      positionSizingNote: "Cash Flow Covered Call Overlay",
      steps: [
        { step: "SIGNAL", title: "Monthly Yield Cycle Initiated", detail: "Holding 1 BTC at $65,000 | IV Rank: 45 | Target 30-DTE Short Call: $72,000" },
        { step: "ENTRY", title: "Covered Call Sold", detail: "Sell 30-DTE 72000 CE (0.22 Delta) for $1,650 premium (2.54% monthly yield)" },
        { step: "STOP_TARGET", title: "Yield Strategy Rules", detail: "If BTC < $72k: Keep 100% of $1,650 cash | If BTC > $72k: Sell BTC at $72k (+$8,650 total gain)" },
        { step: "POSITION", title: "Theta Decay", detail: "BTC trades at $68,200 | Call premium decays to $180" },
        { step: "EXIT", title: "Expired / Harvested", detail: "Kept $1,650 cash flow; lowered cost basis to $63,350" },
        { step: "JOURNAL", title: "Logged Record", detail: "Systematic portfolio yield enhancement executed" },
      ],
    },
    defaultParameters: { delta: 0.22, min_iv_rank: 30, dte: 30, min_monthly_yield_pct: 2.0 },
    version: "1.0.0",
  },

  // 19. Cash-Secured Put
  {
    number: "49",
    id: "options-strat-19",
    name: "Cash-Secured Put Acquisition & Yield",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["1W"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["TRENDING", "RANGING", "LOW VOLATILITY"],
    dataRequirements: ["100% Cash Collateral", "Short OTM Put (Delta 0.20-0.30)", "Key Support Zone Target"],
    whatItDoes:
      "Sells an OTM Put option backed by 100% cash collateral. Either collects upfront premium yield if price stays above strike, or buys the desired asset at a massive discount.",
    whyItExists:
      "Replaces regular limit orders with a strategy that gets paid cash upfront while waiting to buy blue-chip assets at lower prices.",
    bestMarketConditions: [
      "Bullish to neutral markets with desire to accumulate asset on dips",
      "High IV Rank where put premiums are inflated",
    ],
    unfavorableConditions: [
      "Catastrophic fundamental collapse of the underlying instrument",
    ],
    indicators: [
      { name: "Discount Strike", parameter: "0.20 - 0.25 Delta", purpose: "Placement at key technical demand level", defaultSetting: "20 Delta" },
      { name: "IV Rank", parameter: "> 35", purpose: "Rich put premium collection", defaultSetting: "IV Rank 35" },
    ],
    setupConditions: [
      { id: "c1", name: "Full Cash Backing", description: "100% cash reserved to purchase underlying at strike", category: "RISK", required: true },
      { id: "c2", name: "Desired Acquisition Price", description: "Short strike placed at major structural support", category: "STRUCTURE", required: true },
    ],
    exampleTrade: {
      instrument: "ETH-OPT / NIFTY",
      direction: "LONG",
      entryPrice: 3500,
      stopPrice: 2800,
      targetPrice: 3500,
      riskPct: 1.0,
      rrRatio: "1:1.75",
      positionSizingNote: "Cash Collateralized Put Sale",
      steps: [
        { step: "SIGNAL", title: "Target Accumulation at $3,100 Support", detail: "ETH at $3,500 | Strong support at $3,100 | IV Rank: 48 | 25 DTE" },
        { step: "ENTRY", title: "Cash-Secured Put Sold", detail: "Sell 25-DTE 3100 PE (0.20 Delta) @ $115 premium with $3,100 cash collateral" },
        { step: "STOP_TARGET", title: "Win-Win Outcome", detail: "If ETH stays > $3,100: Keep $115 cash (3.7% return in 25 days) | If assigned: Buy ETH at net $2,985" },
        { step: "POSITION", title: "Support Holds", detail: "ETH dips to $3,280 and bounces | Put decays to $12" },
        { step: "EXIT", title: "Expired Worthless", detail: "Captured $115 full profit without owning spot" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Systematic accumulation yield completed" },
      ],
    },
    defaultParameters: { delta: 0.20, min_iv_rank: 35, dte: 25, profit_target_pct: 85 },
    version: "1.0.0",
  },

  // 20. Collar
  {
    number: "50",
    id: "options-strat-20",
    name: "Collar Zero-Cost Downside Insurance",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["1W"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Spot",
    direction: "LONG",
    complexity: "Introductory",
    status: "READY",
    compatibleRegimes: ["HIGH VOLATILITY", "STRUCTURAL REVERSAL"],
    dataRequirements: ["Long Underlying Position", "Buy OTM Put (Floor)", "Sell OTM Call (Financing)", "Zero Net Cost"],
    whatItDoes:
      "Protects a long asset by buying an OTM Put (downside floor) and simultaneously selling an OTM Call (upside ceiling) to fully finance the put cost.",
    whyItExists:
      "Locks in profits and eliminates downside crash risk completely at zero net cost during turbulent macro environments.",
    bestMarketConditions: [
      "Impending high-risk binary events or macro crises while holding large spot positions",
      "Desire to protect unrealized capital gains without triggering taxable spot sales",
    ],
    unfavorableConditions: [
      "Ultra-bullish runaway parabolic rallies where upside is capped",
    ],
    indicators: [
      { name: "Floor Put Delta", parameter: "0.20 - 0.30", purpose: "Guaranteed maximum downside risk limit", defaultSetting: "25 Delta Put" },
      { name: "Ceiling Call Delta", parameter: "0.20 - 0.30", purpose: "Zero-cost financing match", defaultSetting: "25 Delta Call" },
    ],
    setupConditions: [
      { id: "c1", name: "Cost Neutrality", description: "Short Call Premium >= Long Put Cost (Zero Net Debit)", category: "RISK", required: true },
      { id: "c2", name: "Guaranteed Floor", description: "Max loss on spot position locked <= 5% total", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "BTC Spot / NIFTY",
      direction: "LONG",
      entryPrice: 68000,
      stopPrice: 63000,
      targetPrice: 75000,
      riskPct: 0.2,
      rrRatio: "1:2.00",
      positionSizingNote: "Zero-Cost Capital Protection Collar",
      steps: [
        { step: "SIGNAL", title: "Macro Event Risk Hedge", detail: "Holding BTC at $68,000 | Volatile rate decision ahead | Goal: Zero downside loss" },
        { step: "ENTRY", title: "Collar Executed", detail: "Buy 63000 PE @ $1,850 & Sell 75000 CE @ $1,900. Net Credit: +$50" },
        { step: "STOP_TARGET", title: "Protection Locked", detail: "Max Downside Loss strictly locked at $5,000 ($63k floor) | Upside capped at $75,000" },
        { step: "POSITION", title: "Macro Flash Dip", detail: "BTC drops to $61,500 | 63000 PE pays out dollar-for-dollar offset" },
        { step: "EXIT", title: "Protected Portfolio", detail: "Portfolio value fully protected from 10% draw-down at zero net cost" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Downside insurance collar validated" },
      ],
    },
    defaultParameters: { put_delta: 0.25, call_delta: 0.25, max_debit: 0, dte: 30 },
    version: "1.0.0",
  },

  // 21. Synthetic Long Combination
  {
    number: "51",
    id: "options-strat-21",
    name: "Synthetic Long Combination Capital Leverage",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["TRENDING", "BREAKOUT / EXPANSION"],
    dataRequirements: ["Buy 1x ATM Call", "Sell 1x ATM Put", "Net Zero Cost", "1.00 Combined Delta"],
    whatItDoes:
      "Buys an ATM Call and sells an ATM Put at the same strike and expiration. Mimics 100% of the price action of the underlying asset (100 Delta) with near zero capital outlay.",
    whyItExists:
      "Provides institutional synthetic spot exposure without locking up immense cash collateral, freeing capital for yield generation.",
    bestMarketConditions: [
      "Strong high-conviction bullish trend continuation",
    ],
    unfavorableConditions: [
      "Bearish market crashes (carries the same downside risk as holding spot)",
    ],
    indicators: [
      { name: "Combined Delta", parameter: "1.00 ± 0.02", purpose: "Exact spot price replication", defaultSetting: "1.00 Delta" },
      { name: "Cost Basis", parameter: "Call - Put Premium", purpose: "Zero net debit entry filter", defaultSetting: "Zero Net Cost" },
    ],
    setupConditions: [
      { id: "c1", name: "Bullish Trend Confluence", description: "Daily & 4H trend aligned above EMA 50", category: "TREND", required: true },
      { id: "c2", name: "Strict Stop Loss", description: "Dynamic stop loss order placed on underlying trigger", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY / BTC-OPT",
      direction: "LONG",
      entryPrice: 24750,
      stopPrice: 24450,
      targetPrice: 25500,
      riskPct: 1.0,
      rrRatio: "1:2.50",
      positionSizingNote: "100-Delta Synthetic Spot Asset",
      steps: [
        { step: "SIGNAL", title: "Institutional Bullish Breakout PASS", detail: "NIFTY at 24,750 | RSI: 62 | ADX: 31 | Bullish trend continuation" },
        { step: "ENTRY", title: "Synthetic Long Combo", detail: "Buy 24750 CE @ ₹280 & Sell 24750 PE @ ₹275. Net Cost: ₹5/share" },
        { step: "STOP_TARGET", title: "Target Defined", detail: "Stop loss on 24,450 spot breach | Target 25,500 (+₹750 gain per unit)" },
        { step: "POSITION", title: "1:1 Spot Tracking", detail: "NIFTY surges to 25,480 | Position generates ₹730/share profit on ₹5 initial debit" },
        { step: "EXIT", title: "Closed at Target", detail: "Sold combo for ₹725 net profit" },
        { step: "JOURNAL", title: "Audit Verification", detail: "100-Delta replication achieved with 95% capital savings" },
      ],
    },
    defaultParameters: { strike_mode: "ATM", target_dte: 30, stop_loss_pts: 300 },
    version: "1.0.0",
  },

  // 22. Jade Lizard / Covered Combination
  {
    number: "52",
    id: "options-strat-22",
    name: "Jade Lizard Range Neutral Income (No Upside Risk)",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Intermediate",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY", "TRENDING"],
    dataRequirements: ["Short OTM Put", "Short OTM Call", "Long OTM Call (Protection)", "Total Credit >= Call Spread Width"],
    whatItDoes:
      "Sells an OTM Put and simultaneously sells an OTM Bear Call Spread where the total net credit collected is strictly GREATER than the call spread width. Completely eliminates upside risk.",
    whyItExists:
      "A quantitative favorite because if the market rallies to infinity, the trader STILL makes a profit (since total credit exceeds the call spread max loss).",
    bestMarketConditions: [
      "Range-bound with neutral-to-bullish tilt",
      "High IV Rank where put skew gives elevated credits",
    ],
    unfavorableConditions: [
      "Severe market crashes breaching the short put strike",
    ],
    indicators: [
      { name: "Jade Criterion", parameter: "Total Credit > Call Width", purpose: "Mathematically guarantees zero upside risk", defaultSetting: "Credit > Width" },
      { name: "Short Put Delta", parameter: "0.20 - 0.25", purpose: "Safe put floor", defaultSetting: "20 Delta" },
    ],
    setupConditions: [
      { id: "c1", name: "Zero Upside Risk Rule", description: "Total credit collected strictly greater than call spread width", category: "RISK", required: true },
      { id: "c2", name: "High IV Environment", description: "IV Rank >= 40", category: "VOLATILITY", required: true },
    ],
    exampleTrade: {
      instrument: "BTC-OPT / NIFTY",
      direction: "LONG / SHORT",
      entryPrice: 66000,
      stopPrice: 59000,
      targetPrice: 66000,
      riskPct: 0.8,
      rrRatio: "1:2.20",
      positionSizingNote: "No-Upside-Risk Jade Lizard",
      steps: [
        { step: "SIGNAL", title: "IV Rank 52 with Put Skew PASS", detail: "BTC at $66,000 | IV Rank: 52 | Call Spread Width: $2,000" },
        { step: "ENTRY", title: "Jade Lizard Sold", detail: "Sell 60000 PE @ $1,450 | Sell 70000 CE @ $1,200 | Buy 72000 CE @ $480. Total Net Credit: $2,170" },
        { step: "STOP_TARGET", title: "Mathematical Edge", detail: "If BTC goes to infinity: Profit = $2,170 credit - $2,000 width = +$170 guaranteed | Max profit: $2,170 between $60k-$70k" },
        { step: "POSITION", title: "Theta Harvest", detail: "BTC stays at $67,500 | Options decay by 65%" },
        { step: "EXIT", title: "Closed Early", detail: "Bought back combo for $620 (+ $1,550 profit per unit)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Zero upside risk mechanics verified" },
      ],
    },
    defaultParameters: { put_delta: 0.20, call_spread_width_pts: 2000, min_iv_rank: 40, profit_target_pct: 60 },
    version: "1.0.0",
  },

  // 23. Double Diagonal Spread
  {
    number: "53",
    id: "options-strat-23",
    name: "Double Diagonal Multi-Tenor Boundary Spread",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "1D",
    alternateTimeframes: ["4H"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Sell Front-Month OTM Strangle", "Buy Back-Month OTM Strangle (Further out)", "Theta/Vega Advantage"],
    whatItDoes:
      "Combines an OTM Call Calendar Spread and an OTM Put Calendar Spread. Exploits front-month theta decay while retaining back-month vega protection across both wings.",
    whyItExists:
      "Provides wider profitability bounds and higher vega defense than a standard Iron Condor, profiting across longer multi-week consolidation periods.",
    bestMarketConditions: [
      "Low to moderate volatility with normal contango term structure",
      "Broad macro trading range",
    ],
    unfavorableConditions: [
      "Extreme single-day directional gaps running past the back-month strikes",
    ],
    indicators: [
      { name: "Term Structure Spread", parameter: "Back IV > Front IV", purpose: "Ensures favorable calendar roll pricing", defaultSetting: "Contango" },
      { name: "Front Delta", parameter: "0.15 - 0.20", purpose: "Safe front-month short strikes", defaultSetting: "18 Delta" },
    ],
    setupConditions: [
      { id: "c1", name: "Term Structure Normal", description: "Back-month IV >= Front-month IV", category: "VOLATILITY", required: true },
      { id: "c2", name: "Debit Ceiling", description: "Total net debit <= 35% of total wing boundaries", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY / BANKNIFTY",
      direction: "LONG / SHORT",
      entryPrice: 24600,
      stopPrice: 23800,
      targetPrice: 24600,
      riskPct: 0.6,
      rrRatio: "1:2.00",
      positionSizingNote: "4-Leg Double Diagonal Spread",
      steps: [
        { step: "SIGNAL", title: "Term Contango & 600-Pt Range PASS", detail: "NIFTY at 24,600 | Front 7-DTE vs Back 28-DTE | Contango term structure" },
        { step: "ENTRY", title: "Double Diagonal Executed", detail: "Sell 7-DTE 24200 PE / Buy 28-DTE 24000 PE & Sell 7-DTE 25000 CE / Buy 28-DTE 25200 CE. Net Debit: ₹95/share" },
        { step: "STOP_TARGET", title: "Payoff Sized", detail: "Front decay generates ₹45/share weekly rental | Back long legs provide vega hedge" },
        { step: "POSITION", title: "Front Expiration", detail: "NIFTY finishes at 24,680 | Front legs expire to ₹2 | Back legs retain ₹140 value" },
        { step: "EXIT", title: "Harvested & Closed", detail: "Liquidated combo for ₹138 (+45% return in 7 days)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Multi-tenor theta differential validated" },
      ],
    },
    defaultParameters: { front_dte: 7, back_dte: 28, front_delta: 0.18, profit_target_pct: 40 },
    version: "1.0.0",
  },

  // 24. Delta-Neutral Dynamic Iron Condor (0.15 Delta)
  {
    number: "54",
    id: "options-strat-24",
    name: "Delta-Neutral Dynamic Iron Condor Scalper",
    part: "PART VII — MULTI-LEG OPTIONS & INCOME",
    category: "Multi-Leg Options & Income",
    primaryTimeframe: "4H",
    alternateTimeframes: ["1H", "15M"],
    market: "NIFTY / BANKNIFTY / BTC / ETH Options",
    direction: "LONG / SHORT",
    complexity: "Institutional",
    status: "READY",
    compatibleRegimes: ["RANGING", "LOW VOLATILITY"],
    dataRequirements: ["Sub-Second Option Greeks", "0.15 Delta Dynamic Strike Selection", "Automated Delta Rebalancing", "IV Rank >= 30"],
    whatItDoes:
      "Deploys a precision 0.15-Delta 4-leg Iron Condor with active automated intraday delta rebalancing. Re-centers untested wings when portfolio net delta drifts beyond ±0.10.",
    whyItExists:
      "Automates institutional iron condor risk management, transforming a passive options structure into an active high-Sharpe algorithmic income bot.",
    bestMarketConditions: [
      "Range-bound sideways intraday action",
      "High frequency oscillations within standard deviation bounds",
    ],
    unfavorableConditions: [
      "Persistent unidirectional trend days triggering multiple roll-whipsaws",
    ],
    indicators: [
      { name: "Portfolio Net Delta", parameter: "± 0.10 Threshold", purpose: "Triggers dynamic wing rebalancing", defaultSetting: "Net Delta < 0.10" },
      { name: "Intraday IV Index", parameter: "1-Minute IV", purpose: "Real-time IV crush monitor", defaultSetting: "IV Rank > 30" },
      { name: "Wing Width", parameter: "200 pts (NIFTY) / $2000 (BTC)", purpose: "Fixed-risk wing spread", defaultSetting: "Defined Width" },
    ],
    setupConditions: [
      { id: "c1", name: "Delta Symmetry", description: "Short Call Delta = 0.15 and Short Put Delta = 0.15 at entry", category: "RISK", required: true },
      { id: "c2", name: "Credit Efficiency", description: "Net credit collected >= 32% of wing width", category: "RISK", required: true },
      { id: "c3", name: "Rebalance Rule Active", description: "Roll untested side when tested side delta hits 0.30", category: "RISK", required: true },
    ],
    exampleTrade: {
      instrument: "NIFTY 0-DTE / BTC Daily",
      direction: "LONG / SHORT",
      entryPrice: 24700,
      stopPrice: 25050,
      targetPrice: 24700,
      riskPct: 0.8,
      rrRatio: "1:2.20",
      positionSizingNote: "Dynamic Automated Delta-Rebalanced Condor",
      steps: [
        { step: "SIGNAL", title: "0.15 Delta Strike Calibration PASS", detail: "NIFTY at 24,700 | IV Rank: 38 | Put Wing: 24200/24000 | Call Wing: 25200/25400" },
        { step: "ENTRY", title: "4-Leg Combo Executed", detail: "Sell 24200 PE @ ₹32, Buy 24000 PE @ ₹11, Sell 25200 CE @ ₹29, Buy 25400 CE @ ₹9. Net Credit: ₹41/share" },
        { step: "STOP_TARGET", title: "Automated Rules Active", detail: "Target: 50% max profit (₹20.5 decay capture) | Rebalance trigger: Net Delta > 0.10" },
        { step: "POSITION", title: "Intraday Theta Burn", detail: "NIFTY trades in 24,650-24,740 range | Rapid theta decay without rebalance required" },
        { step: "EXIT", title: "Target Hit in 4 Hours", detail: "Closed combo at ₹18 value (+₹23/share net profit)" },
        { step: "JOURNAL", title: "Audit Verification", detail: "Precision algorithmic delta rebalancing audit completed" },
      ],
    },
    defaultParameters: { short_delta: 0.15, wing_width_pts: 200, rebalance_delta_threshold: 0.30, profit_target_pct: 50, dte: 7 },
    version: "1.0.0",
  },
];
