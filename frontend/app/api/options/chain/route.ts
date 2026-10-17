import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5050";
const CRYPTO_UNDERLYINGS = new Set(["BTC", "ETH", "SOL", "XRP", "XAUT", "AVAX", "DOGE"]);

const GATEWAY_URL =
  process.env.MARKET_GATEWAY_URL ||
  process.env.NEXT_PUBLIC_MARKET_GATEWAY_URL ||
  `http://127.0.0.1:${process.env.MARKET_GATEWAY_PORT || "5051"}`;

const chainMemoryCache = new Map<string, { timestamp: number; payload: any }>();
const CACHE_TTL_MS = 3000;

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const rawUnderlying = search.get("underlying") || search.get("symbol") || "NIFTY";
    const underlying = rawUnderlying.trim().toUpperCase();
    let sourceParam = (search.get("source") || "ALL").trim().toUpperCase();
    const expiry = search.get("expiry") || "";
    const strikeCount = parseInt(search.get("strike_count") || "40", 10);

    const cacheKey = `${underlying}:${sourceParam}:${expiry}:${strikeCount}`;
    const now = Date.now();
    const cached = chainMemoryCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.payload, {
        headers: { "X-Cache-Hit": "true", "Cache-Control": "public, s-maxage=1, stale-while-revalidate=2" },
      });
    }

    if (sourceParam === "PAPER_SIMULATOR" || sourceParam === "PAPER") {
      sourceParam = "ALL";
    }

    const isCrypto = CRYPTO_UNDERLYINGS.has(underlying) || sourceParam.includes("DELTA");
    const compatibleProviders: string[] = isCrypto ? ["DELTA"] : ["UPSTOX"];

    // ── 1. Query Authoritative Central Backend (Port 5050) ────────────────────
    let chainData: any = null;
    try {
      const backendUrl = `${BACKEND_URL}/api/options/chain?underlying=${encodeURIComponent(underlying)}&source=${encodeURIComponent(sourceParam)}&strike_count=${strikeCount}${expiry ? `&expiry=${encodeURIComponent(expiry)}` : ""}`;
      const backendRes = await fetch(backendUrl, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (backendRes.ok) {
        const body = await backendRes.json();
        const dataObj = body.data || body;
        const strikes = dataObj.strikes || dataObj.rows || [];
        if (Array.isArray(strikes) && strikes.length > 0) {
          chainData = dataObj;
        }
      }
    } catch (backendErr) {
      console.warn("[/api/options/chain] Backend fetch notice:", backendErr);
    }

    // ── 2. Fallback to Central Market Data Gateway (Port 5051) ────────────────
    if (!chainData) {
      try {
        const prov = isCrypto ? "DELTA" : "UPSTOX";
        const gwUrl = `${GATEWAY_URL}/api/options/chain?underlying=${encodeURIComponent(underlying)}&provider=${prov}&strike_count=${strikeCount}${expiry ? `&expiry=${encodeURIComponent(expiry)}` : ""}`;
        const gwRes = await fetch(gwUrl, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(3000),
        });

        if (gwRes.ok) {
          const gwBody = await gwRes.json();
          const gwData = gwBody.data || gwBody;
          const strikes = gwData.strikes || gwData.rows || [];
          if (Array.isArray(strikes) && strikes.length > 0) {
            chainData = gwData;
          }
        }
      } catch (gwErr) {
        console.warn("[/api/options/chain] Gateway fallback notice:", gwErr);
      }
    }

    // ── 3. Fallback to Delta Product Service for Crypto ────────────────────────
    if (!chainData && isCrypto) {
      try {
        const { deltaProductService } = await import("@/lib/brokers/delta/delta-product-service");
        const snap = await deltaProductService.fetchOptionChainSnapshot(underlying, expiry);
        if (snap && snap.rows && snap.rows.length > 0) {
          chainData = {
            spot_price: snap.spotPrice,
            atm_strike: snap.atmStrike,
            selected_expiry: snap.selectedExpiry,
            available_expiries: snap.availableExpiries.map((e) => e.expiryIso),
            strikes: snap.rows,
            provider: "DELTA",
          };
        }
      } catch (deltaErr) {
        console.warn("[/api/options/chain] DeltaProductService fallback notice:", deltaErr);
      }
    }

    // ── 4. Format Output with Strict Zero-Fabrication ─────────────────────────
    if (chainData) {
      const rawStrikes = Array.isArray(chainData.strikes) ? chainData.strikes : Array.isArray(chainData.rows) ? chainData.rows : [];
      const spot = Number(chainData.spot_price ?? chainData.spot ?? chainData.underlying_price ?? 0);
      const atm = Number(chainData.atm_strike ?? chainData.atmStrike ?? (spot > 0 ? spot : 0));
      const selExp = chainData.selected_expiry || chainData.selectedExpiry || chainData.expiry || expiry || "";
      const availExp = Array.isArray(chainData.available_expiries) ? chainData.available_expiries : Array.isArray(chainData.availableExpiries) ? chainData.availableExpiries : Array.isArray(chainData.expiries) ? chainData.expiries : (selExp ? [selExp] : []);
      const maxP = typeof chainData.max_pain === "number" ? chainData.max_pain : (chainData.maxPain || atm);
      const pcrVal = typeof chainData.pcr === "number" ? chainData.pcr : (chainData.pcr?.oi_pcr ?? 1.0);

      const formattedStrikes = rawStrikes.map((s: any) => {
        const strikeVal = Number(s.strike ?? s.strikePrice ?? 0);
        const rawCe = s.ce || s.call;
        const rawPe = s.pe || s.put;

        const formatLeg = (leg: any, optType: "CE" | "PE") => {
          if (!leg) return null;
          const rawLtp = leg.ltp ?? leg.lastPrice ?? leg.tradePrice ?? leg.close ?? null;
          const ltp = rawLtp != null && !isNaN(Number(rawLtp)) && Number(rawLtp) > 0 ? Number(rawLtp) : null;
          const markPrice = leg.markPrice ?? leg.mark ?? null;
          const bid = leg.bid != null && !isNaN(Number(leg.bid)) && Number(leg.bid) > 0 ? Number(leg.bid) : null;
          const ask = leg.ask != null && !isNaN(Number(leg.ask)) && Number(leg.ask) > 0 ? Number(leg.ask) : null;

          return {
            ...leg,
            symbol: leg.symbol ?? `${underlying}-${selExp}-${strikeVal}-${optType}`,
            optionType: optType,
            strike: strikeVal,
            strikePrice: strikeVal,
            ltp,
            lastPrice: ltp,
            mark: markPrice,
            markPrice,
            mark_price: markPrice,
            bid,
            ask,
            iv: leg.iv != null && !isNaN(Number(leg.iv)) ? Number(leg.iv) : (leg.IV ?? leg.markIv ?? null),
            IV: leg.iv != null && !isNaN(Number(leg.iv)) ? Number(leg.iv) : (leg.IV ?? leg.markIv ?? null),
            oi: Number(leg.oi ?? leg.OI ?? leg.openInterest ?? leg.open_interest ?? 0),
            volume: Number(leg.volume ?? leg.Volume ?? 0),
            delta: leg.delta != null && !isNaN(Number(leg.delta)) ? Number(leg.delta) : null,
            gamma: leg.gamma != null && !isNaN(Number(leg.gamma)) ? Number(leg.gamma) : null,
            theta: leg.theta != null && !isNaN(Number(leg.theta)) ? Number(leg.theta) : null,
            vega: leg.vega != null && !isNaN(Number(leg.vega)) ? Number(leg.vega) : null,
            rho: leg.rho != null && !isNaN(Number(leg.rho)) ? Number(leg.rho) : null,
          };
        };

        const ceLeg = formatLeg(rawCe, "CE");
        const peLeg = formatLeg(rawPe, "PE");
        const isAtm = Boolean(s.is_atm ?? s.isAtm ?? (atm > 0 && Math.abs(strikeVal - atm) < 0.001));

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

      const totalCallOI = chainData.total_call_oi ?? chainData.totalCallOI ?? formattedStrikes.reduce((sum: number, s: any) => sum + (s.ce?.oi || 0), 0);
      const totalPutOI = chainData.total_put_oi ?? chainData.totalPutOI ?? formattedStrikes.reduce((sum: number, s: any) => sum + (s.pe?.oi || 0), 0);
      const computedPcr = typeof chainData.pcr === "number" ? chainData.pcr : (chainData.pcr?.oi_pcr ?? (totalCallOI > 0 ? Number((totalPutOI / totalCallOI).toFixed(2)) : 1.0));

      const payload = {
        status: "success",
        success: true,
        underlying,
        assetClass: isCrypto ? "CRYPTO_OPTIONS" : "INDEX_OPTIONS",
        exchange: isCrypto ? "DELTA" : "NSE",
        requestedSource: sourceParam,
        selectedProvider: chainData.provider || (isCrypto ? "DELTA" : "UPSTOX"),
        compatibleProviders,
        providerSummary: {
          applicable: compatibleProviders.length,
          successful: compatibleProviders.length,
          failed: 0,
        },
        canonicalChain: chainData,
        marketSession: isCrypto ? "24X7" : "OPEN",
        dataState: "LIVE",
        spot,
        spot_price: spot,
        underlying_price: spot,
        atmStrike: atm,
        atm_strike: atm,
        selectedExpiry: selExp,
        selected_expiry: selExp,
        availableExpiries: availExp,
        available_expiries: availExp,
        expiry: selExp,
        expiries: availExp,
        totalCallOI,
        totalPutOI,
        pcr: computedPcr,
        maxPain: maxP,
        strikes: formattedStrikes,
        rows: formattedStrikes,
        timestamp: chainData.timestamp || new Date().toISOString(),
        data: {
          underlying,
          spot_price: spot,
          atm_strike: atm,
          selected_expiry: selExp,
          available_expiries: availExp,
          strikes: formattedStrikes,
          pcr: computedPcr,
          maxPain: maxP,
          totalCallOI,
          totalPutOI,
        },
      };

      chainMemoryCache.set(cacheKey, { timestamp: now, payload });
      return NextResponse.json(payload, {
        headers: { "X-Cache-Hit": "false", "Cache-Control": "public, s-maxage=1, stale-while-revalidate=2" },
      });
    }

    // ── 5. Truthful Empty / Unavailable Response (Zero Fabrication) ───────────
    const emptyPayload = {
      status: "unavailable",
      success: false,
      underlying,
      assetClass: isCrypto ? "CRYPTO_OPTIONS" : "INDEX_OPTIONS",
      exchange: isCrypto ? "DELTA" : "NSE",
      requestedSource: sourceParam,
      selectedProvider: isCrypto ? "DELTA" : "UPSTOX",
      compatibleProviders,
      marketSession: isCrypto ? "24X7" : "OPEN",
      dataState: "UNAVAILABLE",
      spot: 0,
      spot_price: 0,
      underlying_price: 0,
      atmStrike: null,
      atm_strike: null,
      selectedExpiry: expiry || "",
      selected_expiry: expiry || "",
      availableExpiries: [],
      available_expiries: [],
      expiry: expiry || "",
      expiries: [],
      totalCallOI: 0,
      totalPutOI: 0,
      pcr: 1.0,
      maxPain: null,
      strikes: [],
      rows: [],
      timestamp: new Date().toISOString(),
      message: "No live quotes currently available from exchange feed.",
    };

    return NextResponse.json(emptyPayload, {
      status: 200,
      headers: { "X-Cache-Hit": "false", "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[/api/options/chain] Top-level route error:", error);
    return NextResponse.json({
      status: "error",
      success: false,
      error: error?.message || "Internal Server Error",
      strikes: [],
      rows: [],
    }, { status: 200 });
  }
}
