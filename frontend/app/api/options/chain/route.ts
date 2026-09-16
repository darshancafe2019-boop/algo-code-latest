import { NextRequest, NextResponse } from "next/server";
import { fetchDhanOptionChain, DhanOptionChainResult } from "@/lib/brokers/dhan/options";
import { getOptionChain as fetchUpstoxOptionChain } from "@/lib/upstox/options";
import { NormalizedOptionChainResponse } from "@/lib/upstox/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRYPTO_UNDERLYINGS = new Set(["BTC", "ETH", "SOL", "XRP", "XAUT", "AVAX", "DOGE"]);

interface ProviderCapability {
  provider: "DHAN" | "UPSTOX" | "DELTA" | "BINANCE";
  supportsIndianOptions: boolean;
  supportsCryptoOptions: boolean;
  supportsOptionChain: boolean;
  supportsGreeks: boolean;
  supportsOI: boolean;
  supportsWebSocket: boolean;
}

const PROVIDER_CAPABILITIES: Record<string, ProviderCapability> = {
  DHAN: {
    provider: "DHAN",
    supportsIndianOptions: true,
    supportsCryptoOptions: false,
    supportsOptionChain: true,
    supportsGreeks: true,
    supportsOI: true,
    supportsWebSocket: true,
  },
  UPSTOX: {
    provider: "UPSTOX",
    supportsIndianOptions: true,
    supportsCryptoOptions: false,
    supportsOptionChain: true,
    supportsGreeks: true,
    supportsOI: true,
    supportsWebSocket: true,
  },
  DELTA: {
    provider: "DELTA",
    supportsIndianOptions: false,
    supportsCryptoOptions: true,
    supportsOptionChain: true,
    supportsGreeks: true,
    supportsOI: true,
    supportsWebSocket: true,
  },
  BINANCE: {
    provider: "BINANCE",
    supportsIndianOptions: false,
    supportsCryptoOptions: false, // Binance Options not configured
    supportsOptionChain: false,
    supportsGreeks: false,
    supportsOI: false,
    supportsWebSocket: true,
  },
};

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const rawUnderlying = search.get("underlying") || search.get("symbol") || "NIFTY";
    const underlying = rawUnderlying.trim().toUpperCase();
    let sourceParam = (search.get("source") || "ALL").trim().toUpperCase();
    const expiry = search.get("expiry") || "";
    const strikeCount = parseInt(search.get("strike_count") || "20", 10);

    // If PAPER_SIMULATOR is passed as source, treat execution mode as paper but source as ALL real data
    if (sourceParam === "PAPER_SIMULATOR" || sourceParam === "PAPER") {
      sourceParam = "ALL";
    }

    const isCrypto = CRYPTO_UNDERLYINGS.has(underlying) || sourceParam.includes("DELTA");

    // ── 1. DETERMINE COMPATIBLE PROVIDERS ──────────────────────────────────────
    const compatibleProviders: string[] = isCrypto ? ["DELTA"] : ["DHAN", "UPSTOX"];

    // ── 2. CONCURRENT PROVIDER ORCHESTRATION VIA Promise.allSettled ───────────
    const providerPromises: Record<string, Promise<any>> = {};

    if (isCrypto) {
      if (sourceParam === "ALL" || sourceParam === "DELTA" || sourceParam === "DELTA_INDIA") {
        providerPromises["DELTA"] = (async () => {
          const t0 = Date.now();
          const { deltaProductService } = await import("@/lib/brokers/delta/delta-product-service");
          const snapshot = await deltaProductService.fetchOptionChainSnapshot(underlying, expiry || undefined);
          const latencyMs = Date.now() - t0;
          return { ...snapshot, latencyMs };
        })();
      }
    } else {
      // Indian Options: Fetch DHAN and/or UPSTOX
      if (sourceParam === "ALL" || sourceParam === "DHAN") {
        providerPromises["DHAN"] = (async () => {
          const t0 = Date.now();
          const dhanData = await fetchDhanOptionChain(underlying, expiry);
          const latencyMs = Date.now() - t0;
          if (!dhanData) throw new Error("Dhan option chain not configured or returned empty.");
          return { ...dhanData, latencyMs };
        })();
      }

      if (sourceParam === "ALL" || sourceParam === "UPSTOX") {
        providerPromises["UPSTOX"] = (async () => {
          const t0 = Date.now();
          const upstoxData = await fetchUpstoxOptionChain(underlying, expiry);
          const latencyMs = Date.now() - t0;
          if (!upstoxData) throw new Error("Upstox option chain returned empty.");
          return { ...upstoxData, latencyMs };
        })();
      }
    }

    const promiseKeys = Object.keys(providerPromises);
    const settledResults = await Promise.allSettled(Object.values(providerPromises));

    // ── 3. PROCESS AND NORMALIZE INDIVIDUAL PROVIDER SNAPSHOTS ────────────────
    const providersResponse: Record<string, any> = {
      DHAN: isCrypto ? { status: "not_applicable", message: "Dhan does not provide crypto options" } : { status: "unattempted" },
      UPSTOX: isCrypto ? { status: "not_applicable", message: "Upstox does not provide crypto options" } : { status: "unattempted" },
      DELTA: !isCrypto ? { status: "not_applicable", message: "Delta India does not provide Indian equity/index options" } : { status: "unattempted" },
      BINANCE: { status: "not_applicable", message: "Binance options integration not configured" },
    };

    settledResults.forEach((res, idx) => {
      const pKey = promiseKeys[idx];
      if (res.status === "fulfilled") {
        const val = res.value;

        // Normalization per provider
        if (pKey === "DHAN") {
          let strikes = val.strikes || [];
          if (strikes.length > strikeCount) {
            const atmIdx = strikes.findIndex((s: any) => s.isAtm);
            const half = Math.floor(strikeCount / 2);
            const startIdx = Math.max(0, atmIdx - half);
            strikes = strikes.slice(startIdx, startIdx + strikeCount);
          }

          const normalizeLeg = (leg: any, type: "CE" | "PE", strike: number) => {
            if (!leg) return null;
            const ltp = leg.ltp ?? leg.lastPrice ?? leg.markPrice ?? 0;
            const iv = leg.iv ?? leg.IV ?? 0;
            const oi = leg.oi ?? leg.OI ?? leg.openInterest ?? 0;
            const vol = leg.volume ?? leg.Volume ?? 0;
            return {
              ...leg,
              ltp,
              lastPrice: ltp,
              markPrice: ltp,
              iv,
              IV: iv,
              oi,
              OI: oi,
              openInterest: oi,
              volume: vol,
              delta: leg.delta ?? 0,
              gamma: leg.gamma ?? 0,
              theta: leg.theta ?? 0,
              vega: leg.vega ?? 0,
              rho: leg.rho ?? 0,
              symbol: leg.symbol ?? leg.tradingSymbol ?? `${type}-${underlying}-${strike}`,
              optionType: type,
            };
          };

          const formattedRows = strikes.map((s: any) => {
            const ceLeg = normalizeLeg(s.ce || s.call, "CE", s.strike);
            const peLeg = normalizeLeg(s.pe || s.put, "PE", s.strike);
            const isAtm = Boolean(s.isAtm ?? s.isATM ?? s.is_atm);
            return {
              strike: s.strike,
              strikePrice: s.strike,
              isATM: isAtm,
              isAtm: isAtm,
              is_atm: isAtm,
              ce: ceLeg,
              pe: peLeg,
              call: ceLeg,
              put: peLeg,
            };
          });

          providersResponse["DHAN"] = {
            status: "success",
            connected: true,
            provider: "DHAN",
            latencyMs: val.latencyMs || 45,
            timestamp: val.timestamp || new Date().toISOString(),
            spot: val.spotPrice,
            spotPrice: val.spotPrice,
            selectedExpiry: val.selectedExpiry,
            availableExpiries: val.availableExpiries,
            totalCallOI: val.totalCallOI,
            totalPutOI: val.totalPutOI,
            pcr: val.pcr,
            maxPain: val.maxPain,
            atmStrike: val.atmStrike,
            strikes: formattedRows,
            rows: formattedRows,
          };
        } else if (pKey === "UPSTOX") {
          let strikes = val.strikes || [];
          if (strikes.length > strikeCount) {
            const atmIdx = strikes.findIndex((s: any) => s.isAtm || s.is_atm || s.isATM);
            const half = Math.floor(strikeCount / 2);
            const startIdx = Math.max(0, atmIdx - half);
            strikes = strikes.slice(startIdx, startIdx + strikeCount);
          }

          const normalizeLeg = (leg: any, type: "CE" | "PE", strike: number) => {
            if (!leg) return null;
            const ltp = leg.ltp ?? leg.lastPrice ?? leg.markPrice ?? 0;
            const iv = leg.iv ?? leg.IV ?? 0;
            const oi = leg.oi ?? leg.OI ?? leg.openInterest ?? 0;
            const vol = leg.volume ?? leg.Volume ?? 0;
            return {
              ...leg,
              ltp,
              lastPrice: ltp,
              markPrice: ltp,
              iv,
              IV: iv,
              oi,
              OI: oi,
              openInterest: oi,
              volume: vol,
              delta: leg.delta ?? 0,
              gamma: leg.gamma ?? 0,
              theta: leg.theta ?? 0,
              vega: leg.vega ?? 0,
              rho: leg.rho ?? 0,
              symbol: leg.symbol ?? leg.tradingSymbol ?? `${type}-${underlying}-${strike}`,
              optionType: type,
            };
          };

          const formattedRows = strikes.map((s: any) => {
            const ceLeg = normalizeLeg(s.call || s.ce, "CE", s.strike);
            const peLeg = normalizeLeg(s.put || s.pe, "PE", s.strike);
            const isAtm = Boolean(s.isAtm ?? s.isATM ?? s.is_atm);
            return {
              strike: s.strike,
              strikePrice: s.strike,
              isATM: isAtm,
              isAtm: isAtm,
              is_atm: isAtm,
              ce: ceLeg,
              pe: peLeg,
              call: ceLeg,
              put: peLeg,
            };
          });

          const totalCallOI = formattedRows.reduce((sum: number, s: any) => sum + (s.ce?.oi || 0), 0);
          const totalPutOI = formattedRows.reduce((sum: number, s: any) => sum + (s.pe?.oi || 0), 0);
          const pcr = totalCallOI > 0 ? Number((totalPutOI / totalCallOI).toFixed(2)) : 0;

          providersResponse["UPSTOX"] = {
            status: "success",
            connected: true,
            provider: "UPSTOX",
            latencyMs: val.latencyMs || 55,
            timestamp: val.timestamp || new Date().toISOString(),
            spot: val.underlyingLtp,
            spotPrice: val.underlyingLtp,
            selectedExpiry: val.expiry,
            availableExpiries: val.availableExpiries,
            totalCallOI,
            totalPutOI,
            pcr,
            maxPain: val.atmStrike,
            atmStrike: val.atmStrike,
            strikes: formattedRows,
            rows: formattedRows,
          };
        } else if (pKey === "DELTA") {
          const expList = val.availableExpiries?.map((e: any) => e.expiryApiFormat || e) || [];
          const rows = val.rows || val.strikes || [];

          let filteredRows = rows;
          if (rows.length > strikeCount) {
            const atmIdx = rows.findIndex((r: any) => r.isATM || r.isAtm || r.is_atm);
            const half = Math.floor(strikeCount / 2);
            const startIdx = Math.max(0, atmIdx - half);
            filteredRows = rows.slice(startIdx, startIdx + strikeCount);
          }

          const normalizeLeg = (leg: any, type: "CE" | "PE", strike: number) => {
            if (!leg) return null;
            const ltp = leg.ltp ?? leg.lastPrice ?? leg.markPrice ?? leg.close ?? 0;
            const iv = leg.iv ?? leg.IV ?? 0;
            const oi = leg.oi ?? leg.OI ?? leg.openInterest ?? 0;
            const vol = leg.volume ?? leg.Volume ?? 0;
            return {
              ...leg,
              ltp,
              lastPrice: ltp,
              markPrice: ltp,
              iv,
              IV: iv,
              oi,
              OI: oi,
              openInterest: oi,
              volume: vol,
              delta: leg.delta ?? 0,
              gamma: leg.gamma ?? 0,
              theta: leg.theta ?? 0,
              vega: leg.vega ?? 0,
              rho: leg.rho ?? 0,
              symbol: leg.symbol ?? leg.tradingSymbol ?? `${underlying}-${strike}-${type}`,
              optionType: type,
            };
          };

          const formattedRows = filteredRows.map((s: any) => {
            const strikeVal = s.strike ?? s.strikePrice;
            const ceLeg = normalizeLeg(s.call || s.ce, "CE", strikeVal);
            const peLeg = normalizeLeg(s.put || s.pe, "PE", strikeVal);
            const isAtm = Boolean(s.isATM ?? s.isAtm ?? s.is_atm);
            return {
              strike: strikeVal,
              strikePrice: strikeVal,
              isATM: isAtm,
              isAtm: isAtm,
              is_atm: isAtm,
              ce: ceLeg,
              pe: peLeg,
              call: ceLeg,
              put: peLeg,
            };
          });

          const totalCallOI = formattedRows.reduce((sum: number, r: any) => sum + (r.ce?.oi || 0), 0);
          const totalPutOI = formattedRows.reduce((sum: number, r: any) => sum + (r.pe?.oi || 0), 0);
          const pcr = totalCallOI > 0 ? Number((totalPutOI / totalCallOI).toFixed(2)) : 0;

          providersResponse["DELTA"] = {
            status: "success",
            connected: true,
            provider: "DELTA",
            latencyMs: val.latencyMs || 18,
            timestamp: new Date().toISOString(),
            spot: val.spotPrice,
            spotPrice: val.spotPrice,
            selectedExpiry: val.selectedExpiry,
            availableExpiries: expList,
            totalCallOI,
            totalPutOI,
            pcr,
            maxPain: val.atmStrike,
            atmStrike: val.atmStrike,
            strikes: formattedRows,
            rows: formattedRows,
          };
        }
      } else {
        providersResponse[pKey] = {
          status: "error",
          connected: false,
          error: res.reason?.message || "Provider request failed",
        };
      }
    });

    // ── 4. DETERMINISTIC CANONICAL CHAIN SELECTION ────────────────────────────
    let selectedProvider: string | null = null;
    let canonicalChain: any = null;

    if (isCrypto) {
      if (providersResponse["DELTA"]?.status === "success") {
        selectedProvider = "DELTA";
        canonicalChain = providersResponse["DELTA"];
      }
    } else {
      // Priority 1: DHAN
      if (providersResponse["DHAN"]?.status === "success" && (sourceParam === "ALL" || sourceParam === "DHAN")) {
        selectedProvider = "DHAN";
        canonicalChain = providersResponse["DHAN"];
      }
      // Priority 2: UPSTOX (Failover or explicit selection)
      else if (providersResponse["UPSTOX"]?.status === "success" && (sourceParam === "ALL" || sourceParam === "UPSTOX")) {
        selectedProvider = "UPSTOX";
        canonicalChain = providersResponse["UPSTOX"];
      }
    }

    // Provider health summary counts
    const successfulCount = compatibleProviders.filter((p) => providersResponse[p]?.status === "success").length;
    const failedCount = compatibleProviders.length - successfulCount;

    // Optional comparison for diagnostics (if both Dhan & Upstox responded)
    let comparison = null;
    if (providersResponse["DHAN"]?.status === "success" && providersResponse["UPSTOX"]?.status === "success") {
      const dSpot = providersResponse["DHAN"].spot || 0;
      const uSpot = providersResponse["UPSTOX"].spot || 0;
      const diff = Number((dSpot - uSpot).toFixed(2));
      const diffPct = uSpot > 0 ? Number(((diff / uSpot) * 100).toFixed(4)) : 0;

      comparison = {
        dhanSpot: dSpot,
        upstoxSpot: uSpot,
        difference: diff,
        differencePercent: diffPct,
      };
    }

    // ── 5. ASSEMBLE STANDARDIZED CANONICAL RESPONSE ───────────────────────────
    if (canonicalChain) {
      return NextResponse.json({
        status: successfulCount === compatibleProviders.length ? "success" : "partial",
        success: true,
        underlying,
        assetClass: isCrypto ? "CRYPTO_OPTIONS" : "INDEX_OPTIONS",
        exchange: isCrypto ? "DELTA" : "NSE",
        requestedSource: sourceParam,
        selectedProvider,
        compatibleProviders,
        providerSummary: {
          applicable: compatibleProviders.length,
          successful: successfulCount,
          failed: failedCount,
        },
        providers: providersResponse,
        comparison,
        canonicalChain,
        marketSession: isCrypto ? "24X7" : "CLOSED",
        dataState: isCrypto ? "LIVE" : "LAST_TRADED",
        spot: canonicalChain.spot,
        spot_price: canonicalChain.spot,
        atmStrike: canonicalChain.atmStrike,
        atm_strike: canonicalChain.atmStrike,
        selectedExpiry: canonicalChain.selectedExpiry,
        selected_expiry: canonicalChain.selectedExpiry,
        availableExpiries: canonicalChain.availableExpiries,
        available_expiries: canonicalChain.availableExpiries,
        totalCallOI: canonicalChain.totalCallOI,
        totalPutOI: canonicalChain.totalPutOI,
        pcr: canonicalChain.pcr,
        maxPain: canonicalChain.maxPain,
        strikes: canonicalChain.strikes,
        rows: canonicalChain.rows,
        timestamp: canonicalChain.timestamp,
        data: {
          underlying,
          spot_price: canonicalChain.spot,
          atm_strike: canonicalChain.atmStrike,
          selected_expiry: canonicalChain.selectedExpiry,
          available_expiries: canonicalChain.availableExpiries,
          strikes: canonicalChain.strikes,
          pcr: canonicalChain.pcr,
          maxPain: canonicalChain.maxPain,
          totalCallOI: canonicalChain.totalCallOI,
          totalPutOI: canonicalChain.totalPutOI,
        },
      });
    }

    // ── 6. BACKEND GATEWAY DELEGATION ─────────────────────────────────────────
    // If direct Node fetch did not produce data, retrieve from central Python backend options gateway
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5050";
      const backendUrl = `${BACKEND_URL}/api/options/chain?underlying=${encodeURIComponent(underlying)}&source=${encodeURIComponent(sourceParam)}&strike_count=${strikeCount}${expiry ? `&expiry=${encodeURIComponent(expiry)}` : ""}`;
      const backendRes = await fetch(backendUrl, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData && (backendData.strikes?.length > 0 || backendData.rows?.length > 0 || backendData.status === "success")) {
          const strikes = backendData.strikes || backendData.rows || [];
          const spot = backendData.spot_price || backendData.spot || 0;
          const atm = backendData.atm_strike || backendData.atmStrike || (spot > 0 ? Math.round(spot / 50) * 50 : 0);
          const selExp = backendData.selected_expiry || backendData.selectedExpiry || expiry || "";
          const availExp = backendData.available_expiries || backendData.availableExpiries || [];
          const maxP = typeof backendData.max_pain === "number" ? backendData.max_pain : (backendData.maxPain || atm);
          const pcrVal = typeof backendData.pcr === "number" ? backendData.pcr : (backendData.pcr?.oi_pcr || 0.95);

          const formattedStrikes = strikes.map((s: any) => {
            const rawCe = s.ce || s.call;
            const rawPe = s.pe || s.put;
            const ceLeg = rawCe ? {
              ...rawCe,
              ltp: rawCe.ltp ?? rawCe.lastPrice ?? rawCe.markPrice ?? 0,
              lastPrice: rawCe.ltp ?? rawCe.lastPrice ?? rawCe.markPrice ?? 0,
              iv: rawCe.iv ?? rawCe.IV ?? 0,
              IV: rawCe.iv ?? rawCe.IV ?? 0,
              oi: rawCe.oi ?? rawCe.OI ?? rawCe.openInterest ?? 0,
              volume: rawCe.volume ?? rawCe.Volume ?? 0,
              delta: rawCe.delta ?? 0,
              gamma: rawCe.gamma ?? 0,
              theta: rawCe.theta ?? 0,
              vega: rawCe.vega ?? 0,
              rho: rawCe.rho ?? 0,
              symbol: rawCe.symbol ?? `CE-${underlying}-${s.strike}`,
              optionType: "CE",
            } : null;

            const peLeg = rawPe ? {
              ...rawPe,
              ltp: rawPe.ltp ?? rawPe.lastPrice ?? rawPe.markPrice ?? 0,
              lastPrice: rawPe.ltp ?? rawPe.lastPrice ?? rawPe.markPrice ?? 0,
              iv: rawPe.iv ?? rawPe.IV ?? 0,
              IV: rawPe.iv ?? rawPe.IV ?? 0,
              oi: rawPe.oi ?? rawPe.OI ?? rawPe.openInterest ?? 0,
              volume: rawPe.volume ?? rawPe.Volume ?? 0,
              delta: rawPe.delta ?? 0,
              gamma: rawPe.gamma ?? 0,
              theta: rawPe.theta ?? 0,
              vega: rawPe.vega ?? 0,
              rho: rawPe.rho ?? 0,
              symbol: rawPe.symbol ?? `PE-${underlying}-${s.strike}`,
              optionType: "PE",
            } : null;

            const isAtm = Boolean(s.is_atm ?? s.isAtm ?? s.isATM);
            return {
              strike: s.strike ?? s.strikePrice,
              strikePrice: s.strike ?? s.strikePrice,
              isATM: isAtm,
              isAtm: isAtm,
              is_atm: isAtm,
              ce: ceLeg,
              pe: peLeg,
              call: ceLeg,
              put: peLeg,
            };
          });

          return NextResponse.json({
            status: "success",
            success: true,
            underlying,
            assetClass: isCrypto ? "CRYPTO_OPTIONS" : "INDEX_OPTIONS",
            exchange: isCrypto ? "DELTA" : "NSE",
            requestedSource: sourceParam,
            selectedProvider: backendData.provider || (isCrypto ? "DELTA" : "UPSTOX"),
            compatibleProviders,
            providerSummary: {
              applicable: compatibleProviders.length,
              successful: compatibleProviders.length,
              failed: 0,
            },
            providers: backendData.sources || providersResponse,
            canonicalChain: backendData,
            marketSession: isCrypto ? "24X7" : "CLOSED",
            dataState: isCrypto ? "LIVE" : "LAST_TRADED",
            spot: spot,
            spot_price: spot,
            atmStrike: atm,
            atm_strike: atm,
            selectedExpiry: selExp,
            selected_expiry: selExp,
            availableExpiries: availExp,
            available_expiries: availExp,
            totalCallOI: backendData.total_call_oi || backendData.totalCallOI || 0,
            totalPutOI: backendData.total_put_oi || backendData.totalPutOI || 0,
            pcr: pcrVal,
            maxPain: maxP,
            strikes: formattedStrikes,
            rows: formattedStrikes,
            timestamp: backendData.timestamp || new Date().toISOString(),
            data: {
              underlying,
              spot_price: spot,
              atm_strike: atm,
              selected_expiry: selExp,
              available_expiries: availExp,
              strikes: formattedStrikes,
              pcr: pcrVal,
              maxPain: maxP,
              totalCallOI: backendData.total_call_oi || backendData.totalCallOI || 0,
              totalPutOI: backendData.total_put_oi || backendData.totalPutOI || 0,
            },
          });
        }
      }
    } catch (_backendErr) {
      console.warn("[/api/options/chain] Backend fallback query error:", _backendErr);
    }

    // If all compatible providers failed
    return NextResponse.json({
      status: "unavailable",
      success: false,
      reason: "NO_LIVE_PROVIDER",
      underlying,
      requestedSource: sourceParam,
      compatibleProviders,
      providerSummary: {
        applicable: compatibleProviders.length,
        successful: 0,
        failed: compatibleProviders.length,
      },
      providers: providersResponse,
      message: `No active option chain data available for '${underlying}'. Authenticate Dhan or Upstox to view live strikes.`,
      spot: null,
      spot_price: null,
      atmStrike: null,
      atm_strike: null,
      selectedExpiry: null,
      selected_expiry: null,
      availableExpiries: [],
      available_expiries: [],
      strikes: [],
      rows: [],
      pcr: 0,
      maxPain: null,
      totalCallOI: 0,
      totalPutOI: 0,
      timestamp: new Date().toISOString(),
      data: null,
    });
  } catch (error: any) {
    console.error("[/api/options/chain] Internal orchestrator error:", error);
    return NextResponse.json(
      {
        status: "error",
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
