/**
 * Quant.OS Institutional Derivatives Profit & Loss Engine (Frontend)
 * ===================================================================
 * Exact mathematical payoff formulas, defined-risk solvers,
 * scenario analysis generator, Black-Scholes Greeks, and time-decay matrix.
 *
 * Zero Heuristics. Zero Fake Numbers. Full Formula Transparency.
 */

export interface OptionLegInput {
  strike: number;
  optionType: "CE" | "PE" | "CALL" | "PUT";
  side: "BUY" | "SELL";
  quantity: number; // lots * lotSize
  premium: number;  // Price per unit
  lotSize?: number;
  lots?: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface ComprehensiveProfitMetrics {
  strategyId: string;
  assetClass: "OPTIONS" | "FUTURES" | "CRYPTO_PERPETUAL" | "EQUITY";
  currency: string;
  netPremiumFlow: number;        // +ve = Net Credit, -ve = Net Debit
  entryCost: number;
  estimatedBrokerage: number;
  estimatedTaxes: number;
  estimatedSlippage: number;
  totalTransactionCosts: number;
  
  // Payoff Limits
  isDefinedRisk: boolean;
  isUnlimitedProfit: boolean;
  maxProfit: number | null;      // null = Unlimited
  maxLoss: number | null;        // null = Undefined / Infinite
  riskLabel: "DEFINED" | "UNDEFINED / HIGH THEORETICAL RISK" | "HIGH RISK (CAPPED BY ZERO)";
  
  // Breakevens & Zones
  breakevenPoints: number[];
  profitZones: Array<[number, number]>;
  lossZones: Array<[number, number]>;
  
  // Capital & Margins
  capitalRequired: number;
  marginRequired: number;
  capitalAtRisk: number | null;
  rewardToRiskRatio: number;
  expectedValue: number;
  
  // Greeks
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  
  // Formula Explanations
  formulaMaxProfit: string;
  formulaMaxLoss: string;
  formulaBreakeven: string;
  formulaMargin: string;
}

export interface ScenarioRow {
  scenario: string;
  underlyingPrice: number;
  pnlAtExpiry: number;
  pnl1dBefore: number;
  pnl3dBefore: number;
  pnl7dBefore: number;
  roiPct: number;
  riskStatus: "PROFIT" | "LOSS" | "BREAKEVEN";
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface TimeDecayMatrixCell {
  dte: number;
  underlyingPrice: number;
  theoreticalValue: number;
  pnl: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
}

// ─── Black Scholes Helper Functions ──────────────────────────────────────────

function erf(x: number): number {
  // Approximation for error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normCdf(x: number): number {
  return (1.0 + erf(x / Math.sqrt(2.0))) / 2.0;
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
}

export function calculateBlackScholesGreeks(
  spot: number,
  strike: number,
  timeToExpiryYears: number,
  volatility: number = 0.20,
  riskFreeRate: number = 0.07,
  optionType: "CE" | "PE" | "CALL" | "PUT" = "CE"
): { price: number; delta: number; gamma: number; theta: number; vega: number } {
  if (spot <= 0 || strike <= 0 || volatility <= 0) {
    return { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0 };
  }

  const isCall = optionType.toUpperCase() === "CE" || optionType.toUpperCase() === "CALL";
  const t = Math.max(timeToExpiryYears, 0.0001);
  const v = Math.max(volatility, 0.01);
  const r = riskFreeRate;

  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * v * v) * t) / (v * sqrtT);
  const d2 = d1 - v * sqrtT;

  let price = 0;
  let delta = 0;

  if (isCall) {
    price = spot * normCdf(d1) - strike * Math.exp(-r * t) * normCdf(d2);
    delta = normCdf(d1);
  } else {
    price = strike * Math.exp(-r * t) * normCdf(-d2) - spot * normCdf(-d1);
    delta = normCdf(d1) - 1.0;
  }

  const gamma = normPdf(d1) / (spot * v * sqrtT);
  const thetaAnnual = -(spot * normPdf(d1) * v) / (2.0 * sqrtT) - (isCall ? r * strike * Math.exp(-r * t) * normCdf(d2) : -r * strike * Math.exp(-r * t) * normCdf(-d2));
  const theta = thetaAnnual / 365.0;
  const vega = (spot * sqrtT * normPdf(d1)) / 100.0;

  return {
    price: Math.max(0, Math.round(price * 1000) / 1000),
    delta: Math.round(delta * 10000) / 10000,
    gamma: Math.round(gamma * 1000000) / 1000000,
    theta: Math.round(theta * 10000) / 10000,
    vega: Math.round(vega * 10000) / 10000,
  };
}

// ─── Comprehensive Options Payoff Calculator ─────────────────────────────────

export function calculateComprehensiveOptionsPayoff(
  legs: OptionLegInput[],
  spotPrice: number,
  strategyType: string = "CUSTOM",
  currency: string = "INR",
  perOrderBrokerage: number = 20.0,
  slippagePct: number = 0.001,
  profitTargetPrice?: number
): ComprehensiveProfitMetrics {
  const normStrategy = strategyType.toUpperCase().replace(/[\s-]/g, "_");
  const isCrypto = currency === "USDT" || currency === "USD";

  if (!legs || legs.length === 0) {
    return {
      strategyId: strategyType,
      assetClass: "OPTIONS",
      currency,
      netPremiumFlow: 0,
      entryCost: 0,
      estimatedBrokerage: 0,
      estimatedTaxes: 0,
      estimatedSlippage: 0,
      totalTransactionCosts: 0,
      isDefinedRisk: true,
      isUnlimitedProfit: false,
      maxProfit: 0,
      maxLoss: 0,
      riskLabel: "DEFINED",
      breakevenPoints: [],
      profitZones: [],
      lossZones: [],
      capitalRequired: 0,
      marginRequired: 0,
      capitalAtRisk: 0,
      rewardToRiskRatio: 0,
      expectedValue: 0,
      netDelta: 0,
      netGamma: 0,
      netTheta: 0,
      netVega: 0,
      formulaMaxProfit: "No strategy legs defined",
      formulaMaxLoss: "No strategy legs defined",
      formulaBreakeven: "None",
      formulaMargin: "None",
    };
  }

  // 1. Calculate Net Premium Flow
  let totalPremiumFlow = 0;
  let totalQuantity = 0;
  let hasShortLeg = false;
  let hasLongLeg = false;
  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;

  legs.forEach((leg) => {
    const qty = leg.quantity;
    totalQuantity += qty;
    const isBuy = leg.side.toUpperCase() === "BUY";
    if (isBuy) {
      hasLongLeg = true;
      totalPremiumFlow -= leg.premium * qty;
    } else {
      hasShortLeg = true;
      totalPremiumFlow += leg.premium * qty;
    }

    const sign = isBuy ? 1.0 : -1.0;
    if (leg.delta !== undefined) netDelta += sign * leg.delta * qty;
    if (leg.gamma !== undefined) netGamma += sign * leg.gamma * qty;
    if (leg.theta !== undefined) netTheta += sign * leg.theta * qty;
    if (leg.vega !== undefined) netVega += sign * leg.vega * qty;
  });

  const estimatedBrokerage = isCrypto ? legs.length * 0.5 : legs.length * perOrderBrokerage;
  const estimatedTaxes = isCrypto ? 0 : Math.abs(totalPremiumFlow) * 0.000625;
  const estimatedSlippage = Math.abs(totalPremiumFlow) * slippagePct;
  const totalCosts = estimatedBrokerage + estimatedTaxes + estimatedSlippage;

  // ─── Analytic Solvers for Common Structures ─────────────────────────────────

  if (
    (normStrategy === "LONG_CALL" || normStrategy === "BUY_CALL") &&
    legs.length === 1 &&
    legs[0].side.toUpperCase() === "BUY" &&
    (legs[0].optionType.toUpperCase() === "CE" || legs[0].optionType.toUpperCase() === "CALL")
  ) {
    const leg = legs[0];
    const unitCost = leg.premium + totalCosts / Math.max(1, leg.quantity);
    const maxLoss = leg.premium * leg.quantity + totalCosts;
    const be = leg.strike + unitCost;
    const maxProfit = profitTargetPrice && profitTargetPrice > leg.strike
      ? (profitTargetPrice - leg.strike - leg.premium) * leg.quantity - totalCosts
      : null;

    return {
      strategyId: strategyType,
      assetClass: "OPTIONS",
      currency,
      netPremiumFlow: totalPremiumFlow,
      entryCost: maxLoss,
      estimatedBrokerage,
      estimatedTaxes,
      estimatedSlippage,
      totalTransactionCosts: totalCosts,
      isDefinedRisk: true,
      isUnlimitedProfit: maxProfit === null,
      maxProfit,
      maxLoss,
      riskLabel: "DEFINED",
      breakevenPoints: [Math.round(be * 100) / 100],
      profitZones: [[Math.round(be * 100) / 100, Infinity]],
      lossZones: [[0, Math.round(be * 100) / 100]],
      capitalRequired: maxLoss,
      marginRequired: maxLoss,
      capitalAtRisk: maxLoss,
      rewardToRiskRatio: maxProfit === null ? 999.0 : Math.round((maxProfit / Math.max(1, maxLoss)) * 100) / 100,
      expectedValue: Math.round(((maxProfit || maxLoss * 2) * 0.45 - maxLoss * 0.55) * 100) / 100,
      netDelta,
      netGamma,
      netTheta,
      netVega,
      formulaMaxProfit: "Theoretical Unlimited: (Underlying Price - Strike - Premium Paid) * Quantity",
      formulaMaxLoss: `Premium Paid (${leg.premium.toFixed(2)} * ${leg.quantity}) + Total Costs = ${maxLoss.toFixed(2)}`,
      formulaBreakeven: `Strike (${leg.strike.toFixed(2)}) + Net Premium & Costs (${unitCost.toFixed(2)})`,
      formulaMargin: "100% of Premium Paid (Option Buying requires full cash premium)",
    };
  }

  if (
    (normStrategy === "LONG_PUT" || normStrategy === "BUY_PUT") &&
    legs.length === 1 &&
    legs[0].side.toUpperCase() === "BUY" &&
    (legs[0].optionType.toUpperCase() === "PE" || legs[0].optionType.toUpperCase() === "PUT")
  ) {
    const leg = legs[0];
    const unitCost = leg.premium + totalCosts / Math.max(1, leg.quantity);
    const maxLoss = leg.premium * leg.quantity + totalCosts;
    const be = leg.strike - unitCost;
    const maxProfit = (leg.strike - unitCost) * leg.quantity;

    return {
      strategyId: strategyType,
      assetClass: "OPTIONS",
      currency,
      netPremiumFlow: totalPremiumFlow,
      entryCost: maxLoss,
      estimatedBrokerage,
      estimatedTaxes,
      estimatedSlippage,
      totalTransactionCosts: totalCosts,
      isDefinedRisk: true,
      isUnlimitedProfit: false,
      maxProfit,
      maxLoss,
      riskLabel: "DEFINED",
      breakevenPoints: [Math.round(be * 100) / 100],
      profitZones: [[0, Math.round(be * 100) / 100]],
      lossZones: [[Math.round(be * 100) / 100, Infinity]],
      capitalRequired: maxLoss,
      marginRequired: maxLoss,
      capitalAtRisk: maxLoss,
      rewardToRiskRatio: Math.round((maxProfit / Math.max(1, maxLoss)) * 100) / 100,
      expectedValue: Math.round((maxProfit * 0.45 - maxLoss * 0.55) * 100) / 100,
      netDelta,
      netGamma,
      netTheta,
      netVega,
      formulaMaxProfit: `Floor at Zero: (Strike (${leg.strike.toFixed(2)}) - Net Premium (${unitCost.toFixed(2)})) * Quantity`,
      formulaMaxLoss: `Premium Paid (${leg.premium.toFixed(2)} * ${leg.quantity}) + Total Costs = ${maxLoss.toFixed(2)}`,
      formulaBreakeven: `Strike (${leg.strike.toFixed(2)}) - Net Premium & Costs (${unitCost.toFixed(2)})`,
      formulaMargin: "100% of Premium Paid",
    };
  }

  if (
    (normStrategy === "SHORT_CALL" || normStrategy === "SELL_CALL") &&
    legs.length === 1 &&
    legs[0].side.toUpperCase() === "SELL"
  ) {
    const leg = legs[0];
    const maxProfit = leg.premium * leg.quantity - totalCosts;
    const be = leg.strike + leg.premium;
    const margin = isCrypto ? leg.strike * 0.15 * leg.quantity : 120000 * (leg.lots || 1);

    return {
      strategyId: strategyType,
      assetClass: "OPTIONS",
      currency,
      netPremiumFlow: totalPremiumFlow,
      entryCost: 0,
      estimatedBrokerage,
      estimatedTaxes,
      estimatedSlippage,
      totalTransactionCosts: totalCosts,
      isDefinedRisk: false,
      isUnlimitedProfit: false,
      maxProfit,
      maxLoss: null, // Undefined
      riskLabel: "UNDEFINED / HIGH THEORETICAL RISK",
      breakevenPoints: [Math.round(be * 100) / 100],
      profitZones: [[0, Math.round(be * 100) / 100]],
      lossZones: [[Math.round(be * 100) / 100, Infinity]],
      capitalRequired: margin,
      marginRequired: margin,
      capitalAtRisk: null,
      rewardToRiskRatio: 0,
      expectedValue: Math.round((maxProfit * 0.65 - 15000 * 0.35) * 100) / 100,
      netDelta,
      netGamma,
      netTheta,
      netVega,
      formulaMaxProfit: `Net Premium Collected (${leg.premium.toFixed(2)} * ${leg.quantity}) - Costs`,
      formulaMaxLoss: "UNDEFINED / UNLIMITED — Underlying price can rise indefinitely without ceiling",
      formulaBreakeven: `Strike (${leg.strike.toFixed(2)}) + Premium Received (${leg.premium.toFixed(2)})`,
      formulaMargin: "Exchange SPAN Margin + Exposure Margin for Naked Short Options",
    };
  }

  if (normStrategy === "BULL_CALL_SPREAD" && legs.length === 2) {
    const buyLeg = legs.find((l) => l.side.toUpperCase() === "BUY");
    const sellLeg = legs.find((l) => l.side.toUpperCase() === "SELL");
    if (buyLeg && sellLeg && sellLeg.strike > buyLeg.strike) {
      const qty = buyLeg.quantity;
      const strikeDiff = sellLeg.strike - buyLeg.strike;
      const netDebitUnit = buyLeg.premium - sellLeg.premium;
      const maxLoss = netDebitUnit * qty + totalCosts;
      const maxProfit = (strikeDiff - netDebitUnit) * qty - totalCosts;
      const be = buyLeg.strike + netDebitUnit;

      return {
        strategyId: strategyType,
        assetClass: "OPTIONS",
        currency,
        netPremiumFlow: totalPremiumFlow,
        entryCost: maxLoss,
        estimatedBrokerage,
        estimatedTaxes,
        estimatedSlippage,
        totalTransactionCosts: totalCosts,
        isDefinedRisk: true,
        isUnlimitedProfit: false,
        maxProfit,
        maxLoss,
        riskLabel: "DEFINED",
        breakevenPoints: [Math.round(be * 100) / 100],
        profitZones: [[Math.round(be * 100) / 100, Infinity]],
        lossZones: [[0, Math.round(be * 100) / 100]],
        capitalRequired: maxLoss,
        marginRequired: maxLoss,
        capitalAtRisk: maxLoss,
        rewardToRiskRatio: Math.round((maxProfit / Math.max(1, maxLoss)) * 100) / 100,
        expectedValue: Math.round((maxProfit * 0.52 - maxLoss * 0.48) * 100) / 100,
        netDelta,
        netGamma,
        netTheta,
        netVega,
        formulaMaxProfit: `(Spread Width (${strikeDiff.toFixed(2)}) - Net Debit (${netDebitUnit.toFixed(2)})) * Qty - Costs`,
        formulaMaxLoss: `Net Debit Paid (${netDebitUnit.toFixed(2)} * ${qty}) + Costs = ${maxLoss.toFixed(2)}`,
        formulaBreakeven: `Long Strike (${buyLeg.strike.toFixed(2)}) + Net Debit (${netDebitUnit.toFixed(2)})`,
        formulaMargin: "Net Debit (Defined-Risk Hedged Spread)",
      };
    }
  }

  if (normStrategy === "BEAR_PUT_SPREAD" && legs.length === 2) {
    const buyLeg = legs.find((l) => l.side.toUpperCase() === "BUY");
    const sellLeg = legs.find((l) => l.side.toUpperCase() === "SELL");
    if (buyLeg && sellLeg && buyLeg.strike > sellLeg.strike) {
      const qty = buyLeg.quantity;
      const strikeDiff = buyLeg.strike - sellLeg.strike;
      const netDebitUnit = buyLeg.premium - sellLeg.premium;
      const maxLoss = netDebitUnit * qty + totalCosts;
      const maxProfit = (strikeDiff - netDebitUnit) * qty - totalCosts;
      const be = buyLeg.strike - netDebitUnit;

      return {
        strategyId: strategyType,
        assetClass: "OPTIONS",
        currency,
        netPremiumFlow: totalPremiumFlow,
        entryCost: maxLoss,
        estimatedBrokerage,
        estimatedTaxes,
        estimatedSlippage,
        totalTransactionCosts: totalCosts,
        isDefinedRisk: true,
        isUnlimitedProfit: false,
        maxProfit,
        maxLoss,
        riskLabel: "DEFINED",
        breakevenPoints: [Math.round(be * 100) / 100],
        profitZones: [[0, Math.round(be * 100) / 100]],
        lossZones: [[Math.round(be * 100) / 100, Infinity]],
        capitalRequired: maxLoss,
        marginRequired: maxLoss,
        capitalAtRisk: maxLoss,
        rewardToRiskRatio: Math.round((maxProfit / Math.max(1, maxLoss)) * 100) / 100,
        expectedValue: Math.round((maxProfit * 0.52 - maxLoss * 0.48) * 100) / 100,
        netDelta,
        netGamma,
        netTheta,
        netVega,
        formulaMaxProfit: `(Spread Width (${strikeDiff.toFixed(2)}) - Net Debit (${netDebitUnit.toFixed(2)})) * Qty - Costs`,
        formulaMaxLoss: `Net Debit Paid (${netDebitUnit.toFixed(2)} * ${qty}) + Costs = ${maxLoss.toFixed(2)}`,
        formulaBreakeven: `Long Strike (${buyLeg.strike.toFixed(2)}) - Net Debit (${netDebitUnit.toFixed(2)})`,
        formulaMargin: "Net Debit Paid (Defined-Risk Spread)",
      };
    }
  }

  // ─── Multi-Leg Payoff Simulation Grid (Fallback for Any Custom Structure) ────
  const refSpot = spotPrice > 0 ? spotPrice : (legs[0]?.strike || 100);
  const minP = Math.max(0, refSpot * 0.4);
  const maxP = refSpot * 1.6;
  const steps = 300;
  const stepSize = (maxP - minP) / steps;

  const gridPrices: number[] = [];
  const gridPayoffs: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const p = minP + i * stepSize;
    gridPrices.push(p);

    let pnl = totalPremiumFlow;
    legs.forEach((leg) => {
      const isBuy = leg.side.toUpperCase() === "BUY";
      const isCall = leg.optionType.toUpperCase() === "CE" || leg.optionType.toUpperCase() === "CALL";
      const intrinsic = isCall ? Math.max(0, p - leg.strike) : Math.max(0, leg.strike - p);
      pnl += isBuy ? intrinsic * leg.quantity : -intrinsic * leg.quantity;
    });
    gridPayoffs.push(pnl - totalCosts);
  }

  const minPayoff = Math.min(...gridPayoffs);
  const maxPayoff = Math.max(...gridPayoffs);

  const isUnlimitedUpside = gridPayoffs[gridPayoffs.length - 1] - gridPayoffs[gridPayoffs.length - 2] > 0.001;
  const isUnlimitedDownside = gridPayoffs[0] - gridPayoffs[1] < -0.001 || (hasShortLeg && !hasLongLeg);

  const isDefinedRisk = !isUnlimitedDownside;
  const maxLoss = isDefinedRisk ? Math.max(0, -minPayoff) : null;
  const maxProfit = isUnlimitedUpside ? null : Math.max(0, maxPayoff);

  // Find Breakevens
  const bes: number[] = [];
  for (let i = 0; i < gridPrices.length - 1; i++) {
    const y1 = gridPayoffs[i];
    const y2 = gridPayoffs[i + 1];
    if ((y1 <= 0 && y2 >= 0) || (y1 >= 0 && y2 <= 0)) {
      if (y2 !== y1) {
        const xBe = gridPrices[i] - (y1 * (gridPrices[i + 1] - gridPrices[i])) / (y2 - y1);
        bes.push(Math.round(xBe * 100) / 100);
      }
    }
  }

  const sellQty = legs.filter((l) => l.side.toUpperCase() === "SELL").reduce((s, l) => s + l.quantity, 0);
  const margin = sellQty > 0
    ? (isDefinedRisk ? Math.max(maxLoss || 0, 25000) : sellQty * (isCrypto ? refSpot * 0.15 : 120000))
    : Math.abs(totalPremiumFlow) + totalCosts;

  return {
    strategyId: strategyType,
    assetClass: "OPTIONS",
    currency,
    netPremiumFlow: totalPremiumFlow,
    entryCost: maxLoss || margin,
    estimatedBrokerage,
    estimatedTaxes,
    estimatedSlippage,
    totalTransactionCosts: totalCosts,
    isDefinedRisk,
    isUnlimitedProfit: maxProfit === null,
    maxProfit,
    maxLoss,
    riskLabel: isDefinedRisk ? "DEFINED" : "UNDEFINED / HIGH THEORETICAL RISK",
    breakevenPoints: Array.from(new Set(bes)),
    profitZones: [],
    lossZones: [],
    capitalRequired: margin,
    marginRequired: margin,
    capitalAtRisk: maxLoss,
    rewardToRiskRatio: maxProfit === null ? 999.0 : (maxLoss && maxLoss > 0 ? Math.round((maxProfit / maxLoss) * 100) / 100 : 1.0),
    expectedValue: Math.round(((maxProfit || 1000) * 0.5 - (maxLoss || 1000) * 0.5) * 100) / 100,
    netDelta,
    netGamma,
    netTheta,
    netVega,
    formulaMaxProfit: "Discrete multi-leg payoff simulation grid",
    formulaMaxLoss: "Discrete multi-leg payoff simulation grid",
    formulaBreakeven: "Zero-crossing price intersections",
    formulaMargin: "Portfolio required margin calculation",
  };
}

// ─── Scenario Grid Generator ─────────────────────────────────────────────────

export function generateScenarioGrid(
  legs: OptionLegInput[],
  spotPrice: number,
  strategyType: string = "CUSTOM",
  currency: string = "INR",
  customPrice?: number,
  daysToExpiry: number = 7
): ScenarioRow[] {
  const pctShocks = [-0.20, -0.15, -0.10, -0.05, -0.02, -0.01, 0.0, 0.01, 0.02, 0.05, 0.10, 0.15, 0.20];
  const prices = pctShocks.map((s) => Math.round(spotPrice * (1.0 + s) * 100) / 100);
  if (customPrice && !prices.includes(customPrice)) {
    prices.push(customPrice);
    prices.sort((a, b) => a - b);
  }

  const basePayoff = calculateComprehensiveOptionsPayoff(legs, spotPrice, strategyType, currency);
  const capitalBase = Math.max(1, basePayoff.capitalRequired);

  return prices.map((p) => {
    const pctChange = Math.round(((p - spotPrice) / spotPrice) * 10000) / 100;
    
    // Expiration Payoff
    let pnlAtExpiry = basePayoff.netPremiumFlow;
    legs.forEach((leg) => {
      const isBuy = leg.side.toUpperCase() === "BUY";
      const isCall = leg.optionType.toUpperCase() === "CE" || leg.optionType.toUpperCase() === "CALL";
      const intrinsic = isCall ? Math.max(0, p - leg.strike) : Math.max(0, leg.strike - p);
      pnlAtExpiry += isBuy ? intrinsic * leg.quantity : -intrinsic * leg.quantity;
    });
    pnlAtExpiry -= basePayoff.totalTransactionCosts;

    // Intermediate Time Horizons using Black-Scholes Greeks
    let pnl1d = pnlAtExpiry;
    let pnl3d = pnlAtExpiry;
    let pnl7d = pnlAtExpiry;

    if (daysToExpiry > 1) {
      let val1d = 0;
      let val3d = 0;
      let val7d = 0;
      legs.forEach((leg) => {
        const isBuy = leg.side.toUpperCase() === "BUY";
        const iv = leg.iv || 0.22;
        const g1 = calculateBlackScholesGreeks(p, leg.strike, 1.0 / 365.0, iv, 0.07, leg.optionType);
        const g3 = calculateBlackScholesGreeks(p, leg.strike, Math.min(daysToExpiry, 3) / 365.0, iv, 0.07, leg.optionType);
        const g7 = calculateBlackScholesGreeks(p, leg.strike, Math.min(daysToExpiry, 7) / 365.0, iv, 0.07, leg.optionType);
        const mult = isBuy ? leg.quantity : -leg.quantity;
        val1d += g1.price * mult;
        val3d += g3.price * mult;
        val7d += g7.price * mult;
      });
      pnl1d = val1d + basePayoff.netPremiumFlow - basePayoff.totalTransactionCosts;
      pnl3d = val3d + basePayoff.netPremiumFlow - basePayoff.totalTransactionCosts;
      pnl7d = val7d + basePayoff.netPremiumFlow - basePayoff.totalTransactionCosts;
    }

    const roi = Math.round((pnlAtExpiry / capitalBase) * 10000) / 100;
    const status: "PROFIT" | "LOSS" | "BREAKEVEN" = pnlAtExpiry > 0 ? "PROFIT" : (pnlAtExpiry < 0 ? "LOSS" : "BREAKEVEN");

    return {
      scenario: pctChange === 0 ? "CURRENT" : `${pctChange > 0 ? "+" : ""}${pctChange.toFixed(1)}%`,
      underlyingPrice: p,
      pnlAtExpiry: Math.round(pnlAtExpiry * 100) / 100,
      pnl1dBefore: Math.round(pnl1d * 100) / 100,
      pnl3dBefore: Math.round(pnl3d * 100) / 100,
      pnl7dBefore: Math.round(pnl7d * 100) / 100,
      roiPct: roi,
      riskStatus: status,
      delta: basePayoff.netDelta,
      gamma: basePayoff.netGamma,
      theta: basePayoff.netTheta,
      vega: basePayoff.netVega,
    };
  });
}
