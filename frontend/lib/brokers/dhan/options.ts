/**
 * DhanHQ V2 Option Chain Service
 * ==============================
 * Fetches real-time option chains and dynamic expiry lists from official DhanHQ V2 APIs.
 * Supports NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY, SENSEX, and NSE F&O equities.
 */
import { DHAN_CONFIG } from "@/lib/market-data/config";
import { DHAN_OFFICIAL_SCRIP_MAP } from "./instruments";

export interface DhanOptionLeg {
  securityId?: string;
  ltp?: number | null;
  bid?: number | null;
  ask?: number | null;
  bidQty?: number | null;
  askQty?: number | null;
  volume?: number | null;
  oi?: number | null;
  prevOi?: number | null;
  iv?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  lastTradeTime?: number | null;
}

export interface DhanOptionStrikeRow {
  strike: number;
  isAtm?: boolean;
  ce: DhanOptionLeg | null;
  pe: DhanOptionLeg | null;
}

export interface DhanOptionChainResult {
  underlying: string;
  spotPrice: number;
  selectedExpiry: string;
  availableExpiries: string[];
  strikes: DhanOptionStrikeRow[];
  totalCallOI: number;
  totalPutOI: number;
  pcr: number;
  maxPain: number;
  atmStrike: number;
  timestamp: string;
}

// In-memory cache for Dhan option chain (TTL: 3.5 seconds to respect rate limits)
const chainCache = new Map<string, { data: DhanOptionChainResult; expiresAt: number }>();

export async function fetchDhanExpiryList(underlying: string): Promise<string[]> {
  const cleanSym = underlying.toUpperCase().trim();
  const scrip = DHAN_OFFICIAL_SCRIP_MAP[cleanSym] || { securityId: "13", segment: "IDX_I" };
  const creds = DHAN_CONFIG.getCredentials();

  if (!creds.accessToken || !creds.clientId) {
    return [];
  }

  const url = `${creds.restUrl}/optionchain/expirylist`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "access-token": creds.accessToken,
      "client-id": creds.clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      UnderlyingScrip: Number(scrip.securityId),
      UnderlyingSeg: scrip.segment,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) {
    throw new Error(`Dhan expirylist error HTTP ${res.status}`);
  }

  const json = await res.json();
  const list = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
  return list.map((e: any) => String(e).trim()).filter(Boolean).sort();
}

export async function fetchDhanOptionChain(
  underlying: string,
  requestedExpiry?: string
): Promise<DhanOptionChainResult | null> {
  const cleanSym = underlying.toUpperCase().trim();
  const scrip = DHAN_OFFICIAL_SCRIP_MAP[cleanSym] || { securityId: "13", segment: "IDX_I" };
  const creds = DHAN_CONFIG.getCredentials();

  if (!creds.accessToken || !creds.clientId) {
    return null;
  }

  const cacheKey = `${cleanSym}_${requestedExpiry || "DEFAULT"}`;
  const cached = chainCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // 1. Resolve Expiry List
  let expiries: string[] = [];
  try {
    expiries = await fetchDhanExpiryList(cleanSym);
  } catch (err) {
    console.warn(`[DhanOptions] Failed to fetch expiry list for ${cleanSym}:`, err);
  }

  let expiry = requestedExpiry;
  if (!expiry || (expiries.length > 0 && !expiries.includes(expiry))) {
    expiry = expiries[0] || new Date().toISOString().split("T")[0];
  }

  // 2. Query DhanHQ V2 Option Chain
  const url = `${creds.restUrl}/optionchain`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "access-token": creds.accessToken,
      "client-id": creds.clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      UnderlyingScrip: Number(scrip.securityId),
      UnderlyingSeg: scrip.segment,
      Expiry: expiry,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Dhan optionchain error HTTP ${res.status}`);
  }

  const json = await res.json();
  const payload = json.data || json;
  const spotPrice = Number(payload.last_price || payload.spot_price || 0);
  const oc = payload.oc || {};

  const strikeKeys = Object.keys(oc).sort((a, b) => Number(a) - Number(b));
  const strikes: DhanOptionStrikeRow[] = [];

  let totalCallOI = 0;
  let totalPutOI = 0;
  let closestAtmDiff = Infinity;
  let atmStrike = 0;

  for (const strKey of strikeKeys) {
    const strikeNum = parseFloat(strKey);
    if (isNaN(strikeNum)) continue;

    const diff = Math.abs(strikeNum - spotPrice);
    if (diff < closestAtmDiff) {
      closestAtmDiff = diff;
      atmStrike = strikeNum;
    }

    const item = oc[strKey] || {};
    const rawCe = item.ce || item.CE || null;
    const rawPe = item.pe || item.PE || null;

    const ce: DhanOptionLeg | null = rawCe
      ? {
          securityId: String(rawCe.security_id || rawCe.securityId || ""),
          ltp: rawCe.last_price != null ? Number(rawCe.last_price) : null,
          bid: rawCe.top_bid_price != null ? Number(rawCe.top_bid_price) : null,
          ask: rawCe.top_ask_price != null ? Number(rawCe.top_ask_price) : null,
          bidQty: rawCe.top_bid_quantity != null ? Number(rawCe.top_bid_quantity) : null,
          askQty: rawCe.top_ask_quantity != null ? Number(rawCe.top_ask_quantity) : null,
          volume: rawCe.volume != null ? Number(rawCe.volume) : 0,
          oi: rawCe.oi != null ? Number(rawCe.oi) : 0,
          prevOi: rawCe.previous_oi != null ? Number(rawCe.previous_oi) : null,
          iv: rawCe.implied_volatility != null ? Number(rawCe.implied_volatility) : null,
          delta: rawCe.delta != null ? Number(rawCe.delta) : null,
          gamma: rawCe.gamma != null ? Number(rawCe.gamma) : null,
          theta: rawCe.theta != null ? Number(rawCe.theta) : null,
          vega: rawCe.vega != null ? Number(rawCe.vega) : null,
          lastTradeTime: rawCe.last_trade_time || null,
        }
      : null;

    const pe: DhanOptionLeg | null = rawPe
      ? {
          securityId: String(rawPe.security_id || rawPe.securityId || ""),
          ltp: rawPe.last_price != null ? Number(rawPe.last_price) : null,
          bid: rawPe.top_bid_price != null ? Number(rawPe.top_bid_price) : null,
          ask: rawPe.top_ask_price != null ? Number(rawPe.top_ask_price) : null,
          bidQty: rawPe.top_bid_quantity != null ? Number(rawPe.top_bid_quantity) : null,
          askQty: rawPe.top_ask_quantity != null ? Number(rawPe.top_ask_quantity) : null,
          volume: rawPe.volume != null ? Number(rawPe.volume) : 0,
          oi: rawPe.oi != null ? Number(rawPe.oi) : 0,
          prevOi: rawPe.previous_oi != null ? Number(rawPe.previous_oi) : null,
          iv: rawPe.implied_volatility != null ? Number(rawPe.implied_volatility) : null,
          delta: rawPe.delta != null ? Number(rawPe.delta) : null,
          gamma: rawPe.gamma != null ? Number(rawPe.gamma) : null,
          theta: rawPe.theta != null ? Number(rawPe.theta) : null,
          vega: rawPe.vega != null ? Number(rawPe.vega) : null,
          lastTradeTime: rawPe.last_trade_time || null,
        }
      : null;

    if (ce?.oi) totalCallOI += ce.oi;
    if (pe?.oi) totalPutOI += pe.oi;

    strikes.push({
      strike: strikeNum,
      ce,
      pe,
    });
  }

  // Mark ATM strike
  for (const s of strikes) {
    s.isAtm = s.strike === atmStrike;
  }

  // Calculate Max Pain
  let minLoss = Infinity;
  let maxPain = atmStrike;
  for (const expStrike of strikes) {
    let totalLoss = 0;
    for (const optStrike of strikes) {
      if (optStrike.ce?.oi && expStrike.strike > optStrike.strike) {
        totalLoss += (expStrike.strike - optStrike.strike) * optStrike.ce.oi;
      }
      if (optStrike.pe?.oi && expStrike.strike < optStrike.strike) {
        totalLoss += (optStrike.strike - expStrike.strike) * optStrike.pe.oi;
      }
    }
    if (totalLoss < minLoss && totalLoss > 0) {
      minLoss = totalLoss;
      maxPain = expStrike.strike;
    }
  }

  const pcr = totalCallOI > 0 ? Number((totalPutOI / totalCallOI).toFixed(2)) : 0;

  const result: DhanOptionChainResult = {
    underlying: cleanSym,
    spotPrice,
    selectedExpiry: expiry,
    availableExpiries: expiries,
    strikes,
    totalCallOI,
    totalPutOI,
    pcr,
    maxPain,
    atmStrike,
    timestamp: new Date().toISOString(),
  };

  chainCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + 3500, // 3.5s cache
  });

  return result;
}
