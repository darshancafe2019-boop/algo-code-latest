/**
 * Upstox Option Contracts & Option Chain Service
 * ==============================================
 * Fetches dynamic option contracts, available expiries, and complete option chains
 * with Greeks and Implied Volatility directly from Upstox Option APIs.
 * Zero fabricated or hardcoded strikes/expiries.
 */

import { upstoxFetch } from "./client";
import {
  NormalizedOptionChainResponse,
  NormalizedOptionChainStrike,
  OptionContractLeg,
} from "./types";
import { resolveInstrumentKey } from "./instruments";
import { getLtp } from "./quotes";
import { UpstoxValidationError } from "./errors";

/**
 * Fetches all available option contracts and dynamic expiry dates for an underlying.
 */
export async function getOptionContracts(
  underlyingOrSymbol: string = "NIFTY",
  oauthToken?: string | null
): Promise<{ underlying: string; expiries: string[]; contractsCount: number }> {
  const underlyingKey = resolveInstrumentKey(underlyingOrSymbol) || underlyingOrSymbol;

  if (!underlyingKey || !underlyingKey.includes("|")) {
    throw new UpstoxValidationError(
      `Invalid underlying identifier '${underlyingOrSymbol}'. Expected format like 'NSE_INDEX|Nifty 50'.`
    );
  }

  const response = await upstoxFetch<any>("/option/contract", {
    params: { instrument_key: underlyingKey },
    oauthToken,
  });

  const contracts: any[] = response?.data || [];
  const expiriesSet = new Set<string>();

  contracts.forEach((c) => {
    if (c.expiry) {
      expiriesSet.add(c.expiry);
    }
  });

  const sortedExpiries = Array.from(expiriesSet).sort();

  return {
    underlying: underlyingKey,
    expiries: sortedExpiries,
    contractsCount: contracts.length,
  };
}

/**
 * Fetches and normalizes the full real-time option chain for an underlying and expiry.
 */
export async function getOptionChain(
  underlyingOrSymbol: string = "NIFTY",
  expiryDate?: string,
  oauthToken?: string | null
): Promise<NormalizedOptionChainResponse> {
  const underlyingKey = resolveInstrumentKey(underlyingOrSymbol) || underlyingOrSymbol;

  if (!underlyingKey || !underlyingKey.includes("|")) {
    throw new UpstoxValidationError(
      `Invalid underlying identifier '${underlyingOrSymbol}'. Expected format like 'NSE_INDEX|Nifty 50'.`
    );
  }

  // 1. Fetch available expiries first if not specified
  let targetExpiry = expiryDate;
  let availableExpiries: string[] = [];

  try {
    const contractsMeta = await getOptionContracts(underlyingKey, oauthToken);
    availableExpiries = contractsMeta.expiries;
    if (!targetExpiry && availableExpiries.length > 0) {
      targetExpiry = availableExpiries[0];
    }
  } catch {
    // If contracts endpoint is unavailable, continue with provided expiry
  }

  if (!targetExpiry) {
    throw new UpstoxValidationError(
      `No active expiry dates found for underlying '${underlyingKey}'.`
    );
  }

  // 2. Fetch Option Chain from Upstox
  const response = await upstoxFetch<any>("/option/chain", {
    params: {
      instrument_key: underlyingKey,
      expiry_date: targetExpiry,
    },
    oauthToken,
  });

  const rawStrikes: any[] = response?.data || [];

  // 3. Fetch Underlying Spot LTP
  let underlyingLtp = 0;
  try {
    const spot = await getLtp(underlyingKey, oauthToken);
    underlyingLtp = spot.ltp;
  } catch {
    // If spot quote fails, estimate from middle strike
    if (rawStrikes.length > 0) {
      const mid = rawStrikes[Math.floor(rawStrikes.length / 2)];
      underlyingLtp = mid?.strike_price || 0;
    }
  }

  // 4. Calculate ATM Strike
  let closestStrikeDiff = Infinity;
  let atmStrike = 0;

  rawStrikes.forEach((s) => {
    const sp = s.strike_price;
    const diff = Math.abs(sp - underlyingLtp);
    if (diff < closestStrikeDiff) {
      closestStrikeDiff = diff;
      atmStrike = sp;
    }
  });

  // 5. Normalize each strike level
  const strikes: NormalizedOptionChainStrike[] = rawStrikes.map((s) => {
    const strike = s.strike_price;
    const isAtm = strike === atmStrike;

    const callData = s.call_options || {};
    const putData = s.put_options || {};

    const callMarket = callData.market_data || {};
    const putMarket = putData.market_data || {};

    const callGreeks = callData.option_greeks || {};
    const putGreeks = putData.option_greeks || {};

    const callLeg: OptionContractLeg = {
      instrumentKey: callData.instrument_key || "",
      tradingSymbol: callData.trading_symbol,
      ltp: typeof callMarket.ltp === "number" ? callMarket.ltp : null,
      bid: typeof callMarket.bid_price === "number" ? callMarket.bid_price : null,
      ask: typeof callMarket.ask_price === "number" ? callMarket.ask_price : null,
      volume: typeof callMarket.volume === "number" ? callMarket.volume : null,
      oi: typeof callMarket.oi === "number" ? callMarket.oi : null,
      iv: typeof callGreeks.iv === "number" ? callGreeks.iv : null,
      delta: typeof callGreeks.delta === "number" ? callGreeks.delta : null,
      gamma: typeof callGreeks.gamma === "number" ? callGreeks.gamma : null,
      theta: typeof callGreeks.theta === "number" ? callGreeks.theta : null,
      vega: typeof callGreeks.vega === "number" ? callGreeks.vega : null,
      change: typeof callMarket.change === "number" ? callMarket.change : null,
      changePct: typeof callMarket.change_percent === "number" ? callMarket.change_percent : null,
    };

    const putLeg: OptionContractLeg = {
      instrumentKey: putData.instrument_key || "",
      tradingSymbol: putData.trading_symbol,
      ltp: typeof putMarket.ltp === "number" ? putMarket.ltp : null,
      bid: typeof putMarket.bid_price === "number" ? putMarket.bid_price : null,
      ask: typeof putMarket.ask_price === "number" ? putMarket.ask_price : null,
      volume: typeof putMarket.volume === "number" ? putMarket.volume : null,
      oi: typeof putMarket.oi === "number" ? putMarket.oi : null,
      iv: typeof putGreeks.iv === "number" ? putGreeks.iv : null,
      delta: typeof putGreeks.delta === "number" ? putGreeks.delta : null,
      gamma: typeof putGreeks.gamma === "number" ? putGreeks.gamma : null,
      theta: typeof putGreeks.theta === "number" ? putGreeks.theta : null,
      vega: typeof putGreeks.vega === "number" ? putGreeks.vega : null,
      change: typeof putMarket.change === "number" ? putMarket.change : null,
      changePct: typeof putMarket.change_percent === "number" ? putMarket.change_percent : null,
    };

    return {
      strike,
      expiry: targetExpiry!,
      isAtm,
      call: callLeg,
      put: putLeg,
    };
  });

  return {
    provider: "UPSTOX",
    underlying: underlyingKey,
    underlyingLtp,
    expiry: targetExpiry,
    availableExpiries,
    atmStrike,
    strikes,
    timestamp: new Date().toISOString(),
  };
}
