/**
 * QUANT.OS AUTHORITATIVE 21 OPTIONS STRATEGIES CATALOG & LEGS BUILDER
 * ====================================================================
 * Complete mathematical payoff models, automatic strike construction, Greeks calculation,
 * max profit/loss, and breakeven evaluation for all 21 standard option structures.
 */

export interface StrategyLegTemplate {
  legId: string;
  side: "BUY" | "SELL";
  optionType: "CE" | "PE" | "FUT" | "SPOT";
  strikeOffset: "ATM" | "ITM1" | "ITM2" | "OTM1" | "OTM2" | "OTM3" | "CUSTOM" | number; // strike offset in steps
  expiryOffset: "CURRENT" | "NEXT" | "MONTHLY" | number; // 0 = current expiry, 1 = next
  quantityMultiplier: number;
  lotMultiplier: number;
  role: "PRIMARY" | "HEDGE" | "INCOME" | "WING" | "BODY";
}

export interface OptionStrategyCatalogItem {
  id: string;
  number: string;
  name: string;
  shortName: string;
  category: "DIRECTIONAL" | "SPREAD" | "VOLATILITY" | "INCOME" | "COMBINATION";
  marketBias: "BULLISH" | "BEARISH" | "NEUTRAL" | "HIGH_VOLATILITY" | "LOW_VOLATILITY";
  netPremiumType: "NET_DEBIT" | "NET_CREDIT" | "VARIABLE";
  complexity: "Basic" | "Intermediate" | "Advanced";
  description: string;
  bestRegime: string;
  legsTemplate: StrategyLegTemplate[];
  maxProfitFormula: string;
  maxLossFormula: string;
  breakevenFormula: string;
}

export const CANONICAL_21_OPTION_STRATEGIES: OptionStrategyCatalogItem[] = [
  // 01 Long Call
  {
    id: "OPT_01_LONG_CALL",
    number: "01",
    name: "Long Call",
    shortName: "Long Call",
    category: "DIRECTIONAL",
    marketBias: "BULLISH",
    netPremiumType: "NET_DEBIT",
    complexity: "Basic",
    description: "Buys an ATM/OTM Call option for unlimited upside participation with risk strictly capped at premium paid.",
    bestRegime: "Strong Bullish Momentum with Expanding Volatility",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "CE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
    ],
    maxProfitFormula: "Unlimited (Spot - Strike - Premium)",
    maxLossFormula: "Premium Paid",
    breakevenFormula: "Strike + Premium Paid",
  },
  // 02 Long Put
  {
    id: "OPT_02_LONG_PUT",
    number: "02",
    name: "Long Put",
    shortName: "Long Put",
    category: "DIRECTIONAL",
    marketBias: "BEARISH",
    netPremiumType: "NET_DEBIT",
    complexity: "Basic",
    description: "Buys an ATM/OTM Put option for downside profits with risk strictly capped at premium paid.",
    bestRegime: "Strong Bearish Breakdown with Expanding Volatility",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "PE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
    ],
    maxProfitFormula: "Strike - Premium Paid",
    maxLossFormula: "Premium Paid",
    breakevenFormula: "Strike - Premium Paid",
  },
  // 03 Short Call
  {
    id: "OPT_03_SHORT_CALL",
    number: "03",
    name: "Short Call (Naked/Margin)",
    shortName: "Short Call",
    category: "INCOME",
    marketBias: "BEARISH",
    netPremiumType: "NET_CREDIT",
    complexity: "Advanced",
    description: "Sells an OTM Call option to collect upfront premium, profiting from theta decay below resistance.",
    bestRegime: "Bearish / Neutral Consolidation Below Heavy Overhead Supply",
    legsTemplate: [
      { legId: "leg_1", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
    ],
    maxProfitFormula: "Premium Received",
    maxLossFormula: "Unlimited (Above Breakeven)",
    breakevenFormula: "Strike + Premium Received",
  },
  // 04 Short Put
  {
    id: "OPT_04_SHORT_PUT",
    number: "04",
    name: "Short Put (Naked/Cash-Secured)",
    shortName: "Short Put",
    category: "INCOME",
    marketBias: "BULLISH",
    netPremiumType: "NET_CREDIT",
    complexity: "Intermediate",
    description: "Sells an OTM Put option to harvest premium or acquire the underlying at a statistical discount.",
    bestRegime: "Bullish / Range-bound Support Bounces with High IV",
    legsTemplate: [
      { legId: "leg_1", side: "SELL", optionType: "PE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
    ],
    maxProfitFormula: "Premium Received",
    maxLossFormula: "Strike - Premium Received",
    breakevenFormula: "Strike - Premium Received",
  },
  // 05 Bull Call Spread
  {
    id: "OPT_05_BULL_CALL_SPREAD",
    number: "05",
    name: "Bull Call Spread",
    shortName: "Bull Call Spread",
    category: "SPREAD",
    marketBias: "BULLISH",
    netPremiumType: "NET_DEBIT",
    complexity: "Intermediate",
    description: "Buys a lower strike Call and sells a higher strike Call to reduce upfront cost and mitigate IV crush.",
    bestRegime: "Moderate Directional Bull Trend",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "CE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
      { legId: "leg_2", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "HEDGE" },
    ],
    maxProfitFormula: "Higher Strike - Lower Strike - Net Debit",
    maxLossFormula: "Net Debit Paid",
    breakevenFormula: "Lower Strike + Net Debit",
  },
  // 06 Bear Put Spread
  {
    id: "OPT_06_BEAR_PUT_SPREAD",
    number: "06",
    name: "Bear Put Spread",
    shortName: "Bear Put Spread",
    category: "SPREAD",
    marketBias: "BEARISH",
    netPremiumType: "NET_DEBIT",
    complexity: "Intermediate",
    description: "Buys a higher strike Put and sells a lower strike Put for defined-risk bearish momentum.",
    bestRegime: "Moderate Directional Bear Trend",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "PE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
      { legId: "leg_2", side: "SELL", optionType: "PE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "HEDGE" },
    ],
    maxProfitFormula: "Higher Strike - Lower Strike - Net Debit",
    maxLossFormula: "Net Debit Paid",
    breakevenFormula: "Higher Strike - Net Debit",
  },
  // 07 Bull Put Spread
  {
    id: "OPT_07_BULL_PUT_SPREAD",
    number: "07",
    name: "Bull Put Credit Spread",
    shortName: "Bull Put Spread",
    category: "SPREAD",
    marketBias: "BULLISH",
    netPremiumType: "NET_CREDIT",
    complexity: "Intermediate",
    description: "Sells an OTM Put and buys a lower OTM Put to harvest credit with strictly defined downside protection.",
    bestRegime: "Bullish / Neutral Consolidation Above Key Support",
    legsTemplate: [
      { legId: "leg_1", side: "SELL", optionType: "PE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
      { legId: "leg_2", side: "BUY", optionType: "PE", strikeOffset: "OTM2", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "WING" },
    ],
    maxProfitFormula: "Net Credit Collected",
    maxLossFormula: "Spread Width - Net Credit Collected",
    breakevenFormula: "Short Strike - Net Credit",
  },
  // 08 Bear Call Spread
  {
    id: "OPT_08_BEAR_CALL_SPREAD",
    number: "08",
    name: "Bear Call Credit Spread",
    shortName: "Bear Call Spread",
    category: "SPREAD",
    marketBias: "BEARISH",
    netPremiumType: "NET_CREDIT",
    complexity: "Intermediate",
    description: "Sells an OTM Call and buys a higher OTM Call to collect net credit with capped upside risk.",
    bestRegime: "Bearish / Neutral Consolidation Below Key Resistance",
    legsTemplate: [
      { legId: "leg_1", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
      { legId: "leg_2", side: "BUY", optionType: "CE", strikeOffset: "OTM2", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "WING" },
    ],
    maxProfitFormula: "Net Credit Collected",
    maxLossFormula: "Spread Width - Net Credit Collected",
    breakevenFormula: "Short Strike + Net Credit",
  },
  // 09 Short Iron Condor
  {
    id: "OPT_09_SHORT_IRON_CONDOR",
    number: "09",
    name: "Short Iron Condor",
    shortName: "Short Iron Condor",
    category: "INCOME",
    marketBias: "NEUTRAL",
    netPremiumType: "NET_CREDIT",
    complexity: "Advanced",
    description: "Combines an OTM Bull Put Spread and an OTM Bear Call Spread to harvest high theta decay in tight ranges.",
    bestRegime: "Low Volatility Sideways Range-Bound Channel (ADX < 20, IVR > 35)",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "PE", strikeOffset: "OTM2", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "WING" },
      { legId: "leg_2", side: "SELL", optionType: "PE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
      { legId: "leg_3", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
      { legId: "leg_4", side: "BUY", optionType: "CE", strikeOffset: "OTM2", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "WING" },
    ],
    maxProfitFormula: "Total Net Credit Collected",
    maxLossFormula: "Wing Width - Net Credit Collected",
    breakevenFormula: "Lower: Short Put - Credit | Upper: Short Call + Credit",
  },
  // 10 Ratio Front Spread
  {
    id: "OPT_10_RATIO_FRONT_SPREAD",
    number: "10",
    name: "Ratio Front Spread (1x2)",
    shortName: "Ratio Spread",
    category: "COMBINATION",
    marketBias: "BULLISH",
    netPremiumType: "NET_CREDIT",
    complexity: "Advanced",
    description: "Buys 1 ATM Call and sells 2 OTM Calls to achieve zero-cost upside participation with premium surplus.",
    bestRegime: "Moderate Target Pin with IV Contraction",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "CE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
      { legId: "leg_2", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 2, lotMultiplier: 2, role: "INCOME" },
    ],
    maxProfitFormula: "Short Strike - Long Strike + Net Credit",
    maxLossFormula: "Unlimited on extreme upside runner",
    breakevenFormula: "Short Strike + (Max Profit / Excess Short Lots)",
  },
  // 11 Call Backspread
  {
    id: "OPT_11_CALL_BACKSPREAD",
    number: "11",
    name: "Call Backspread (1x2 Volatility)",
    shortName: "Call Backspread",
    category: "VOLATILITY",
    marketBias: "HIGH_VOLATILITY",
    netPremiumType: "NET_DEBIT",
    complexity: "Advanced",
    description: "Sells 1 ITM Call and buys 2 OTM Calls to profit massively from explosive upside volatility expansions.",
    bestRegime: "Impending Binary Event / Massive Breakout Catalyst",
    legsTemplate: [
      { legId: "leg_1", side: "SELL", optionType: "CE", strikeOffset: "ITM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
      { legId: "leg_2", side: "BUY", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 2, lotMultiplier: 2, role: "PRIMARY" },
    ],
    maxProfitFormula: "Unlimited on explosive upside expansion",
    maxLossFormula: "Higher Strike - Lower Strike - Net Credit",
    breakevenFormula: "(2 * Higher Strike) - Lower Strike +/- Cost",
  },
  // 12 Long Straddle
  {
    id: "OPT_12_LONG_STRADDLE",
    number: "12",
    name: "Long Straddle (Gamma Explosion)",
    shortName: "Long Straddle",
    category: "VOLATILITY",
    marketBias: "HIGH_VOLATILITY",
    netPremiumType: "NET_DEBIT",
    complexity: "Intermediate",
    description: "Buys both ATM Call and ATM Put with identical expiry, profiting from extreme moves in either direction.",
    bestRegime: "Pre-Earnings / Fed Rate / Macro Catalyst with Low IV",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "CE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
      { legId: "leg_2", side: "BUY", optionType: "PE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
    ],
    maxProfitFormula: "Unlimited (Move > Total Premium Paid)",
    maxLossFormula: "Total Combined Premium Paid",
    breakevenFormula: "Strike +/- Total Premium Paid",
  },
  // 13 Long Strangle
  {
    id: "OPT_13_LONG_STRANGLE",
    number: "13",
    name: "Long Strangle (Low-Cost Outlier)",
    shortName: "Long Strangle",
    category: "VOLATILITY",
    marketBias: "HIGH_VOLATILITY",
    netPremiumType: "NET_DEBIT",
    complexity: "Intermediate",
    description: "Buys OTM Call and OTM Put simultaneously for low upfront cost to capture large breakout tails.",
    bestRegime: "Low IV Compression Prior to Volatility Expansion",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
      { legId: "leg_2", side: "BUY", optionType: "PE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
    ],
    maxProfitFormula: "Unlimited",
    maxLossFormula: "Total Premium Paid",
    breakevenFormula: "Lower: Put Strike - Debit | Upper: Call Strike + Debit",
  },
  // 14 Short Straddle
  {
    id: "OPT_14_SHORT_STRADDLE",
    number: "14",
    name: "Short Straddle (Maximum Theta Decay)",
    shortName: "Short Straddle",
    category: "INCOME",
    marketBias: "NEUTRAL",
    netPremiumType: "NET_CREDIT",
    complexity: "Advanced",
    description: "Sells ATM Call and ATM Put simultaneously to harvest peak daily theta decay on expiry day.",
    bestRegime: "Pinning Range with Extreme IV Contraction",
    legsTemplate: [
      { legId: "leg_1", side: "SELL", optionType: "CE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
      { legId: "leg_2", side: "SELL", optionType: "PE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
    ],
    maxProfitFormula: "Total Premium Collected",
    maxLossFormula: "Unlimited in either direction",
    breakevenFormula: "Strike +/- Total Premium Collected",
  },
  // 15 Short Strangle
  {
    id: "OPT_15_SHORT_STRANGLE",
    number: "15",
    name: "Short Strangle (Statistical Range Credit)",
    shortName: "Short Strangle",
    category: "INCOME",
    marketBias: "NEUTRAL",
    netPremiumType: "NET_CREDIT",
    complexity: "Advanced",
    description: "Sells OTM Call and OTM Put around price channel to harvest statistical premium decay.",
    bestRegime: "Wide Range-Bound Channel with Rich Volatility (IVR > 40)",
    legsTemplate: [
      { legId: "leg_1", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
      { legId: "leg_2", side: "SELL", optionType: "PE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
    ],
    maxProfitFormula: "Total Premium Collected",
    maxLossFormula: "Unlimited on extreme breakout",
    breakevenFormula: "Lower: Put Strike - Credit | Upper: Call Strike + Credit",
  },
  // 16 Long Butterfly
  {
    id: "OPT_16_LONG_BUTTERFLY",
    number: "16",
    name: "Long Call Butterfly (Pinpoint Target)",
    shortName: "Long Butterfly",
    category: "COMBINATION",
    marketBias: "NEUTRAL",
    netPremiumType: "NET_DEBIT",
    complexity: "Intermediate",
    description: "Buys 1 lower Call, sells 2 middle Calls, buys 1 higher Call to target an exact pinpoint pin price.",
    bestRegime: "Expected Expiry Pinning at Middle Strike",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "CE", strikeOffset: "ITM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "WING" },
      { legId: "leg_2", side: "SELL", optionType: "CE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 2, lotMultiplier: 2, role: "BODY" },
      { legId: "leg_3", side: "BUY", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "WING" },
    ],
    maxProfitFormula: "Middle Strike - Lower Strike - Net Debit",
    maxLossFormula: "Net Debit Paid",
    breakevenFormula: "Lower: Lower Strike + Debit | Upper: Higher Strike - Debit",
  },
  // 17 Long Condor
  {
    id: "OPT_17_LONG_CONDOR",
    number: "17",
    name: "Long Condor (Defined Zone Pin)",
    shortName: "Long Condor",
    category: "COMBINATION",
    marketBias: "NEUTRAL",
    netPremiumType: "NET_DEBIT",
    complexity: "Advanced",
    description: "4-leg structure with wider sweet spot than butterfly (Buy ITM Call, Sell ITM Call, Sell OTM Call, Buy OTM Call).",
    bestRegime: "Anticipated Consolidation inside Middle Strike Window",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "CE", strikeOffset: "ITM2", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "WING" },
      { legId: "leg_2", side: "SELL", optionType: "CE", strikeOffset: "ITM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "BODY" },
      { legId: "leg_3", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "BODY" },
      { legId: "leg_4", side: "BUY", optionType: "CE", strikeOffset: "OTM2", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "WING" },
    ],
    maxProfitFormula: "Middle Spread Width - Net Debit Paid",
    maxLossFormula: "Net Debit Paid",
    breakevenFormula: "Lower: Strike 1 + Debit | Upper: Strike 4 - Debit",
  },
  // 18 Long Calendar
  {
    id: "OPT_18_LONG_CALENDAR",
    number: "18",
    name: "Long Calendar Spread (Time Decay Engine)",
    shortName: "Long Calendar",
    category: "SPREAD",
    marketBias: "NEUTRAL",
    netPremiumType: "NET_DEBIT",
    complexity: "Intermediate",
    description: "Sells near-term expiry option and buys longer-term expiry option at same strike to exploit decay differential.",
    bestRegime: "Low IV with Expected Stable Consolidation near Strike",
    legsTemplate: [
      { legId: "leg_1", side: "SELL", optionType: "CE", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
      { legId: "leg_2", side: "BUY", optionType: "CE", strikeOffset: "ATM", expiryOffset: "NEXT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
    ],
    maxProfitFormula: "Value of Back-Month Option minus Net Debit at Front Expiration",
    maxLossFormula: "Net Debit Paid",
    breakevenFormula: "Dependent on Back-Month Implied Volatility",
  },
  // 19 Diagonal Spread
  {
    id: "OPT_19_DIAGONAL_SPREAD",
    number: "19",
    name: "Diagonal Spread (Synthetic Covered Strangle)",
    shortName: "Diagonal Spread",
    category: "SPREAD",
    marketBias: "BULLISH",
    netPremiumType: "NET_DEBIT",
    complexity: "Advanced",
    description: "Buys deeper-dated ITM option and sells near-term OTM option at different strikes and expiries.",
    bestRegime: "Steady Multi-Week Trending Channel",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "CE", strikeOffset: "ITM1", expiryOffset: "NEXT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
      { legId: "leg_2", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
    ],
    maxProfitFormula: "Front Month Premium + Back Month Capital Appreciation",
    maxLossFormula: "Net Debit Paid",
    breakevenFormula: "Lower than standard calendar spread due to strike offset",
  },
  // 20 Covered Call
  {
    id: "OPT_20_COVERED_CALL",
    number: "20",
    name: "Covered Call (Underlying + Yield)",
    shortName: "Covered Call",
    category: "COMBINATION",
    marketBias: "BULLISH",
    netPremiumType: "NET_CREDIT",
    complexity: "Basic",
    description: "Holds long underlying position and sells an OTM Call against it to generate recurring yield.",
    bestRegime: "Moderate Bullish Accumulation / Stagnant Holding",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "SPOT", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
      { legId: "leg_2", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
    ],
    maxProfitFormula: "Short Strike - Purchase Price + Call Premium",
    maxLossFormula: "Purchase Price - Call Premium Received",
    breakevenFormula: "Underlying Entry Price - Call Premium Received",
  },
  // 21 Collar
  {
    id: "OPT_21_COLLAR",
    number: "21",
    name: "Collar (Downside Capital Insurance)",
    shortName: "Collar",
    category: "COMBINATION",
    marketBias: "BULLISH",
    netPremiumType: "VARIABLE",
    complexity: "Intermediate",
    description: "Holds long underlying, buys protective OTM Put, and sells OTM Call to fund insurance at zero net cost.",
    bestRegime: "Capital Preservation with Capped Upside",
    legsTemplate: [
      { legId: "leg_1", side: "BUY", optionType: "SPOT", strikeOffset: "ATM", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "PRIMARY" },
      { legId: "leg_2", side: "BUY", optionType: "PE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "HEDGE" },
      { legId: "leg_3", side: "SELL", optionType: "CE", strikeOffset: "OTM1", expiryOffset: "CURRENT", quantityMultiplier: 1, lotMultiplier: 1, role: "INCOME" },
    ],
    maxProfitFormula: "Call Strike - Purchase Price +/- Net Premium",
    maxLossFormula: "Purchase Price - Put Strike +/- Net Premium",
    breakevenFormula: "Purchase Price +/- Net Premium (Credit/Debit)",
  },
];
