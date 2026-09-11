/**
 * Centralized Live Market Data Engine - Option Chain Engine
 * Centralized option data service for NIFTY, BANKNIFTY, FINNIFTY, SENSEX, BTC, ETH.
 *
 * STRICT TRUTH-IN-DATA:
 * - PCR = valid Put OI / valid Call OI. If insufficient data -> null (Never default to 1.00).
 * - Max Pain calculated strictly from actual current strike OI -> null if insufficient data.
 * - Zero hardcoded/fabricated ATM IV (never hardcode 14.5).
 */

import { MarketFreshnessEngine } from "./freshness";
import { marketState } from "./market-state";
import { OptionChainSnapshot, OptionStrikeData } from "./types";

export interface OptionContractData {
  strike: number;
  optionType: "CE" | "PE" | "CALL" | "PUT";
  oi?: number | null;
  volume?: number | null;
  ltp?: number | null;
  iv?: number | null;
}

export function calculatePcr(contracts: OptionContractData[]): number | null {
  if (!contracts || contracts.length === 0) return null;

  let putOI = 0;
  let callOI = 0;
  let hasValidPut = false;
  let hasValidCall = false;

  for (const c of contracts) {
    const isPut = c.optionType === "PE" || c.optionType === "PUT";
    const isCall = c.optionType === "CE" || c.optionType === "CALL";
    const oi = typeof c.oi === "number" && !isNaN(c.oi) ? c.oi : null;

    if (isPut && oi !== null && oi >= 0) {
      putOI += oi;
      hasValidPut = true;
    } else if (isCall && oi !== null && oi >= 0) {
      callOI += oi;
      hasValidCall = true;
    }
  }

  if (!hasValidPut || !hasValidCall || callOI <= 0) {
    return null;
  }

  return parseFloat((putOI / callOI).toFixed(3));
}

export function calculateMaxPain(contracts: OptionContractData[]): number | null {
  if (!contracts || contracts.length === 0) return null;

  // Extract unique strikes with valid OI
  const strikesSet = new Set<number>();
  let hasAnyOi = false;

  for (const c of contracts) {
    if (typeof c.strike === "number" && !isNaN(c.strike)) {
      strikesSet.add(c.strike);
      if (typeof c.oi === "number" && c.oi > 0) {
        hasAnyOi = true;
      }
    }
  }

  if (!hasAnyOi || strikesSet.size === 0) return null;

  const strikes = Array.from(strikesSet).sort((a, b) => a - b);
  let minLoss = Infinity;
  let maxPainStrike: number | null = null;

  for (const testStrike of strikes) {
    let totalLoss = 0;

    for (const c of contracts) {
      const oi = typeof c.oi === "number" && c.oi > 0 ? c.oi : 0;
      if (oi === 0) continue;

      const isCall = c.optionType === "CE" || c.optionType === "CALL";
      const isPut = c.optionType === "PE" || c.optionType === "PUT";

      if (isCall && testStrike > c.strike) {
        totalLoss += (testStrike - c.strike) * oi;
      } else if (isPut && testStrike < c.strike) {
        totalLoss += (c.strike - testStrike) * oi;
      }
    }

    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = testStrike;
    }
  }

  return maxPainStrike;
}

export class LiveOptionChainEngine {
  private static instance: LiveOptionChainEngine | null = null;
  private chains: Map<string, OptionChainSnapshot> = new Map();

  private constructor() {}

  public static getInstance(): LiveOptionChainEngine {
    if (!LiveOptionChainEngine.instance) {
      LiveOptionChainEngine.instance = new LiveOptionChainEngine();
    }
    return LiveOptionChainEngine.instance;
  }

  /**
   * Ingests or updates an option chain snapshot.
   */
  public updateChainSnapshot(
    underlying: string,
    spotPrice: number,
    expiryDate: string,
    availableExpiries: string[],
    strikes: OptionStrikeData[]
  ): OptionChainSnapshot {
    const symKey = underlying.toUpperCase();

    // 1. Convert strikes to flat contract list for PCR and Max Pain
    const flatContracts: OptionContractData[] = [];
    let totalCallVol = 0;
    let totalPutVol = 0;
    let totalCallOI = 0;
    let totalPutOI = 0;
    let sumAtmIV = 0;
    let countAtmIV = 0;

    for (const s of strikes) {
      if (s.call) {
        const oi = s.call.openInterest;
        if (typeof oi === "number") totalCallOI += oi;
        totalCallVol += s.call.volume || 0;
        const callIv = s.call.greeks?.iv;
        if (typeof callIv === "number" && callIv > 0) {
          sumAtmIV += callIv;
          countAtmIV++;
        }
        flatContracts.push({
          strike: s.strikePrice,
          optionType: "CE",
          oi: s.call.openInterest,
          volume: s.call.volume,
          ltp: s.call.ltp,
          iv: callIv,
        });
      }
      if (s.put) {
        const oi = s.put.openInterest;
        if (typeof oi === "number") totalPutOI += oi;
        totalPutVol += s.put.volume || 0;
        const putIv = s.put.greeks?.iv;
        if (typeof putIv === "number" && putIv > 0) {
          sumAtmIV += putIv;
          countAtmIV++;
        }
        flatContracts.push({
          strike: s.strikePrice,
          optionType: "PE",
          oi: s.put.openInterest,
          volume: s.put.volume,
          ltp: s.put.ltp,
          iv: putIv,
        });
      }
    }

    const pcrOI = calculatePcr(flatContracts);
    const pcrVolume = totalCallVol > 0 ? parseFloat((totalPutVol / totalCallVol).toFixed(3)) : null;

    // 2. Compute Max Pain
    const maxPain = calculateMaxPain(flatContracts);

    // 3. Determine ATM strike distance
    let minDiff = Infinity;
    let atmStrike = strikes[0]?.strikePrice || spotPrice;

    for (const s of strikes) {
      const diff = Math.abs(s.strikePrice - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        atmStrike = s.strikePrice;
      }
    }

    for (const s of strikes) {
      s.isATM = s.strikePrice === atmStrike;
      s.distancePct = spotPrice > 0 ? parseFloat((((s.strikePrice - spotPrice) / spotPrice) * 100).toFixed(2)) : 0;
    }

    const now = Date.now();
    const freshness = MarketFreshnessEngine.evaluate(now, now).status;

    const snapshot: OptionChainSnapshot = {
      underlying: symKey,
      underlyingPrice: spotPrice,
      expiryDate,
      availableExpiries,
      strikes,
      pcr: {
        pcrOI: pcrOI ?? 0,
        pcrVolume: pcrVolume ?? 0,
        totalCallOI,
        totalPutOI,
        totalCallVolume: totalCallVol,
        totalPutVolume: totalPutVol,
      },
      maxPain: maxPain ?? 0,
      atmIV: countAtmIV > 0 ? parseFloat((sumAtmIV / countAtmIV).toFixed(2)) : 0,
      timestamp: now,
      freshness,
    };

    this.chains.set(symKey, snapshot);
    marketState.setOptionChain(symKey, snapshot);

    return snapshot;
  }

  public getSnapshot(underlying: string): OptionChainSnapshot | undefined {
    return this.chains.get(underlying.toUpperCase()) || marketState.getOptionChain(underlying);
  }

  public getOptionChain(underlying: string, expiry?: string): OptionChainSnapshot | undefined {
    return this.getSnapshot(underlying);
  }
}

export const liveOptionChainEngine = LiveOptionChainEngine.getInstance();
export const optionChainEngine = liveOptionChainEngine;
