/**
 * Production-Grade Options Analytics Engine
 * Quantitative calculations for Greeks, PCR, Max Pain, OI Buildups, Flow Sentiment, and IST Session Status.
 */

import {
  Moneyness,
  OIBuildupType,
  FlowSentiment,
  FlowTradeSide,
  FlowSignalType,
  MarketSessionStatus,
  OptionGreeks,
  OptionContractQuote,
  OptionStrikeRowData,
  OptionFlowTrade,
  PCRMetrics,
} from "@/types/option-terminal";

// Standard Normal Cumulative Distribution Function
export function normCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);
  // Horner's approximation for erf
  const t = 1.0 / (1.0 + 0.3275911 * absX);
  const erf =
    1.0 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * erf);
}

// Standard Normal Probability Density Function
export function normPdf(x: number): number {
  return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculates analytical Black-Scholes Greeks and theoretical pricing
 */
export function calculateBlackScholesGreeks(
  optionType: "CE" | "PE" | "CALL" | "PUT",
  spot: number,
  strike: number,
  timeToExpiryYears: number,
  iv: number = 0.18,
  riskFreeRate: number = 0.065
): OptionGreeks {
  const isCall = optionType.toUpperCase() === "CE" || optionType.toUpperCase() === "CALL";
  const S = Math.max(0.01, spot);
  const K = Math.max(0.01, strike);
  const T = Math.max(1e-5, timeToExpiryYears);
  const r = riskFreeRate;
  const sigma = Math.max(0.01, iv);

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const cdfD1 = normCdf(d1);
  const cdfD2 = normCdf(d2);
  const pdfD1 = normPdf(d1);
  const expRt = Math.exp(-r * T);

  let delta = 0;
  let rho = 0;
  let theta = 0;

  if (isCall) {
    delta = cdfD1;
    rho = (K * T * expRt * cdfD2) / 100;
    // 365-day annualization for daily theta
    const term1 = (-S * pdfD1 * sigma) / (2 * sqrtT);
    const term2 = -r * K * expRt * cdfD2;
    theta = (term1 + term2) / 365;
  } else {
    delta = cdfD1 - 1;
    rho = (-K * T * expRt * (1 - cdfD2)) / 100;
    const term1 = (-S * pdfD1 * sigma) / (2 * sqrtT);
    const term2 = r * K * expRt * (1 - cdfD2);
    theta = (term1 + term2) / 365;
  }

  const gamma = pdfD1 / (S * sigma * sqrtT);
  const vega = (S * sqrtT * pdfD1) / 100; // 1% move in IV

  return {
    delta: parseFloat(delta.toFixed(4)),
    gamma: parseFloat(gamma.toFixed(6)),
    theta: parseFloat(theta.toFixed(3)),
    vega: parseFloat(vega.toFixed(3)),
    rho: parseFloat(rho.toFixed(4)),
    iv: parseFloat((sigma * 100).toFixed(2)),
  };
}

/**
 * Calculates Intrinsic and Time value
 */
export function calculateIntrinsicAndTimeValue(
  optionType: "CE" | "PE" | "CALL" | "PUT",
  spot: number,
  strike: number,
  ltp: number
): { intrinsic: number; timeValue: number } {
  const isCall = optionType.toUpperCase() === "CE" || optionType.toUpperCase() === "CALL";
  let intrinsic = 0;
  if (isCall) {
    intrinsic = Math.max(0, spot - strike);
  } else {
    intrinsic = Math.max(0, strike - spot);
  }
  const timeValue = Math.max(0, (ltp || 0) - intrinsic);
  return {
    intrinsic: parseFloat(intrinsic.toFixed(2)),
    timeValue: parseFloat(timeValue.toFixed(2)),
  };
}

/**
 * Classifies Open Interest buildup based on Price and OI movements
 */
export function classifyOIBuildup(
  priceChange: number,
  oiChange: number
): OIBuildupType {
  if (Math.abs(oiChange) === 0) return "NEUTRAL";

  if (priceChange > 0 && oiChange > 0) return "LONG_BUILDUP";
  if (priceChange < 0 && oiChange > 0) return "SHORT_BUILDUP";
  if (priceChange < 0 && oiChange < 0) return "LONG_UNWINDING";
  if (priceChange > 0 && oiChange < 0) return "SHORT_COVERING";

  return "NEUTRAL";
}

/**
 * Calculates ATM strike
 */
export function getATMStrike(spotPrice: number, availableStrikes: number[]): number {
  if (!availableStrikes || availableStrikes.length === 0) return spotPrice;
  let minDiff = Infinity;
  let bestStrike = availableStrikes[0];
  for (const s of availableStrikes) {
    const diff = Math.abs(s - spotPrice);
    if (diff < minDiff) {
      minDiff = diff;
      bestStrike = s;
    }
  }
  return bestStrike;
}

/**
 * Classifies Moneyness (ITM / ATM / OTM)
 */
export function classifyMoneyness(
  optionType: "CE" | "PE" | "CALL" | "PUT",
  strike: number,
  spotPrice: number,
  atmStrike: number
): Moneyness {
  if (strike === atmStrike) return "ATM";
  const isCall = optionType.toUpperCase() === "CE" || optionType.toUpperCase() === "CALL";
  if (isCall) {
    return strike < spotPrice ? "ITM" : "OTM";
  } else {
    return strike > spotPrice ? "ITM" : "OTM";
  }
}

/**
 * Calculates Put-Call Ratio (PCR)
 */
export function calculatePCRMetrics(strikes: OptionStrikeRowData[]): PCRMetrics {
  let totalCallOI = 0;
  let totalPutOI = 0;
  let totalCallVolume = 0;
  let totalPutVolume = 0;
  let totalCallOIChange = 0;
  let totalPutOIChange = 0;

  for (const row of strikes) {
    if (row.call) {
      totalCallOI += row.call.oi || 0;
      totalCallVolume += row.call.volume || 0;
      totalCallOIChange += row.call.oiChange || 0;
    }
    if (row.put) {
      totalPutOI += row.put.oi || 0;
      totalPutVolume += row.put.volume || 0;
      totalPutOIChange += row.put.oiChange || 0;
    }
  }

  const pcrOI = totalCallOI > 0 ? parseFloat((totalPutOI / totalCallOI).toFixed(3)) : null;
  const pcrVolume = totalCallVolume > 0 ? parseFloat((totalPutVolume / totalCallVolume).toFixed(3)) : null;
  const pcrOIChange =
    totalCallOIChange !== 0 && totalPutOIChange !== 0
      ? parseFloat((Math.abs(totalPutOIChange) / Math.abs(totalCallOIChange)).toFixed(3))
      : null;

  return {
    pcrOI,
    pcrVolume,
    pcrOIChange,
    totalCallOI,
    totalPutOI,
    totalCallVolume,
    totalPutVolume,
    totalCallOIChange,
    totalPutOIChange,
  };
}

/**
 * Computes Max Pain strike
 */
export function calculateMaxPain(strikes: OptionStrikeRowData[]): {
  maxPain: number | null;
  painMap: Record<number, number>;
} {
  const painMap: Record<number, number> = {};
  let validOiCount = 0;

  for (const targetRow of strikes) {
    const testStrike = targetRow.strike;
    let totalPain = 0;

    for (const row of strikes) {
      // Call buyers payout
      if (row.call && row.call.oi > 0) {
        validOiCount++;
        if (testStrike > row.strike) {
          totalPain += (testStrike - row.strike) * row.call.oi;
        }
      }
      // Put buyers payout
      if (row.put && row.put.oi > 0) {
        validOiCount++;
        if (testStrike < row.strike) {
          totalPain += (row.strike - testStrike) * row.put.oi;
        }
      }
    }
    painMap[testStrike] = totalPain;
  }

  if (validOiCount === 0 || Object.keys(painMap).length === 0) {
    return { maxPain: null, painMap: {} };
  }

  let minLoss = Infinity;
  let maxPainStrike: number | null = null;
  for (const [strikeStr, pain] of Object.entries(painMap)) {
    if (pain < minLoss) {
      minLoss = pain;
      maxPainStrike = parseFloat(strikeStr);
    }
  }

  return { maxPain: maxPainStrike, painMap };
}

/**
 * Identifies OI-based Support & Resistance Zones
 */
export function findSupportResistanceZones(strikes: OptionStrikeRowData[]): {
  supportZone: { strike: number; oi: number; label: string } | null;
  resistanceZone: { strike: number; oi: number; label: string } | null;
} {
  let maxCallOi = -1;
  let resistanceStrike: number | null = null;
  let maxPutOi = -1;
  let supportStrike: number | null = null;

  for (const r of strikes) {
    if (r.call && r.call.oi > maxCallOi) {
      maxCallOi = r.call.oi;
      resistanceStrike = r.strike;
    }
    if (r.put && r.put.oi > maxPutOi) {
      maxPutOi = r.put.oi;
      supportStrike = r.strike;
    }
  }

  return {
    supportZone:
      supportStrike !== null && maxPutOi > 0
        ? {
            strike: supportStrike,
            oi: maxPutOi,
            label: "OI-based support zone",
          }
        : null,
    resistanceZone:
      resistanceStrike !== null && maxCallOi > 0
        ? {
            strike: resistanceStrike,
            oi: maxCallOi,
            label: "OI-based resistance zone",
          }
        : null,
  };
}

/**
 * Indian Market (NSE/BSE) IST Session Time Checker
 */
export function getIndianMarketStatus(underlying: string): MarketSessionStatus {
  // Crypto runs 24/7
  if (["BTC", "ETH", "SOL", "XRP"].includes(underlying.toUpperCase())) {
    return "OPEN";
  }

  // Calculate current IST (UTC + 5:30)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utc + 5.5 * 3600000);

  const dayOfWeek = istDate.getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return "CLOSED";
  }

  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 09:00 - 09:15 = Pre-open
  if (timeInMinutes >= 540 && timeInMinutes < 555) {
    return "PRE_OPEN";
  }
  // 09:15 - 15:30 = Normal Market Open
  if (timeInMinutes >= 555 && timeInMinutes < 930) {
    return "OPEN";
  }
  // 15:30 - 16:00 = Post Market / Closing Session
  if (timeInMinutes >= 930 && timeInMinutes <= 960) {
    return "POST_MARKET";
  }

  return "CLOSED";
}

/**
 * Classifies single trade sentiment & signal type
 */
export function classifyTradeFlow(
  optionType: "CE" | "PE" | "CALL" | "PUT",
  side: FlowTradeSide,
  ltp: number,
  bid: number,
  ask: number,
  size: number,
  oi: number,
  premium: number,
  spotChange: number
): {
  sentiment: FlowSentiment;
  confidence: number;
  signalType: FlowSignalType;
} {
  const isCall = optionType.toUpperCase() === "CE" || optionType.toUpperCase() === "CALL";
  const isBuyer = side === "BUY" || (ask > 0 && ltp >= ask);
  const isSeller = side === "SELL" || (bid > 0 && ltp <= bid);

  let bullishScore = 50;
  let bearishScore = 50;

  if (isCall) {
    if (isBuyer) {
      bullishScore += 30;
    } else if (isSeller) {
      bearishScore += 25;
    }
  } else {
    // Put
    if (isBuyer) {
      bearishScore += 30;
    } else if (isSeller) {
      bullishScore += 25;
    }
  }

  if (spotChange > 0) bullishScore += 10;
  if (spotChange < 0) bearishScore += 10;

  const volOiRatio = oi > 0 ? size / oi : 1.0;
  let signalType: FlowSignalType = "REGULAR";

  if (volOiRatio >= 3.0 || premium >= 5000000) {
    signalType = "UNUSUAL_ACTIVITY";
  } else if (premium >= 2500000 || size >= 2500) {
    signalType = "LARGE_ACTIVITY";
  }

  let sentiment: FlowSentiment = "NEUTRAL";
  let confidence = 50;

  if (bullishScore > bearishScore + 10) {
    sentiment = "BULLISH";
    confidence = Math.min(95, Math.round(bullishScore));
  } else if (bearishScore > bullishScore + 10) {
    sentiment = "BEARISH";
    confidence = Math.min(95, Math.round(bearishScore));
  } else {
    sentiment = "NEUTRAL";
    confidence = 50;
  }

  return { sentiment, confidence, signalType };
}

/**
 * Professional Indian Currency & Number Formatter
 */
export function formatIndianCurrency(val: number | null | undefined, currency: string = "₹"): string {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  const absVal = Math.abs(val);
  const sign = val < 0 ? "-" : "";

  if (currency === "$") {
    if (absVal >= 1000000) return `${sign}$${(absVal / 1000000).toFixed(2)}M`;
    if (absVal >= 1000) return `${sign}$${(absVal / 1000).toFixed(2)}K`;
    return `${sign}$${val.toFixed(2)}`;
  }

  if (absVal >= 10000000) {
    // Crores
    return `${sign}${currency}${(absVal / 10000000).toFixed(2)} Cr`;
  }
  if (absVal >= 100000) {
    // Lakhs
    return `${sign}${currency}${(absVal / 100000).toFixed(2)} L`;
  }
  if (absVal >= 1000) {
    return `${sign}${currency}${(absVal / 1000).toFixed(2)} K`;
  }

  return `${sign}${currency}${val.toFixed(2)}`;
}

/**
 * Formats integer volume / open interest in Indian format (L, Cr, K)
 */
export function formatIndianQuantity(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "N/A";
  const absVal = Math.abs(val);
  const sign = val < 0 ? "-" : "";

  if (absVal >= 10000000) {
    return `${sign}${(absVal / 10000000).toFixed(2)} Cr`;
  }
  if (absVal >= 100000) {
    return `${sign}${(absVal / 100000).toFixed(2)} L`;
  }
  if (absVal >= 1000) {
    return `${sign}${(absVal / 1000).toFixed(1)} K`;
  }

  return `${sign}${Math.round(absVal).toLocaleString("en-IN")}`;
}
