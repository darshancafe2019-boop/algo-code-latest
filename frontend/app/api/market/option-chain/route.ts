import { NextRequest, NextResponse } from "next/server";
import {
  getBackendBaseUrl,
  getGatewayHttpUrl,
  getGatewaySecret,
} from "@/lib/config/gatewayConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const rawUnderlying = searchParams.get("underlying") || searchParams.get("symbol") || "NIFTY";
  const underlying = rawUnderlying.trim().toUpperCase();
  const marketType = (searchParams.get("market_type") || searchParams.get("market") || "INDIA_OPTION").toUpperCase();
  const expiry = searchParams.get("expiry") || undefined;
  const isCrypto = ["BTC", "ETH", "SOL", "XRP"].includes(underlying) || marketType.includes("CRYPTO");
  const provider = isCrypto ? "DELTA" : (searchParams.get("provider") || "UPSTOX");

  const GATEWAY_URL = getGatewayHttpUrl();
  const BACKEND_URL = getBackendBaseUrl();
  const GATEWAY_SECRET = getGatewaySecret();

  // ── 1. Query Central Market Data Gateway directly if configured ─────────────
  if (GATEWAY_URL) {
    try {
      let gwUrl = `${GATEWAY_URL}/api/options/chain?underlying=${encodeURIComponent(underlying)}&provider=${encodeURIComponent(provider)}`;
      if (expiry) {
        gwUrl += `&expiry=${encodeURIComponent(expiry)}`;
      }

      const gwRes = await fetch(gwUrl, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(GATEWAY_SECRET ? { "X-Gateway-Secret": GATEWAY_SECRET } : {}),
        },
        signal: AbortSignal.timeout(8000),
      });

      if (gwRes.ok) {
      const gwChain = await gwRes.json();
      const rawRows: any[] = gwChain.strikes || gwChain.rows || [];

      if (Array.isArray(rawRows) && rawRows.length > 0) {
        const spotPrice = Number(gwChain.spot_price ?? gwChain.spot ?? gwChain.underlying_price ?? 0);
        const atmStrike = Number(gwChain.atm_strike ?? gwChain.atmStrike ?? (spotPrice > 0 ? spotPrice : 0));
        const selectedExp = gwChain.selected_expiry || gwChain.selectedExpiry || gwChain.expiry || expiry || "";
        const availExps = gwChain.available_expiries || gwChain.availableExpiries || gwChain.expiries || (selectedExp ? [selectedExp] : []);

        const formattedRows = rawRows.map((r: any) => {
          const strike = Number(r.strike ?? r.strikePrice ?? 0);
          const c = r.call || r.ce;
          const p = r.put || r.pe;

          const formatLeg = (leg: any, optType: "CE" | "PE") => {
            if (!leg) return null;
            // True LTP from exchange (null if un-traded, never fabricated from bid/ask)
            const rawLtp = leg.ltp ?? leg.lastPrice ?? leg.tradePrice ?? leg.close ?? leg.last ?? null;
            const ltp = rawLtp != null && !isNaN(Number(rawLtp)) && Number(rawLtp) > 0 ? Number(rawLtp) : null;
            const mark = leg.mark != null && !isNaN(Number(leg.mark)) ? Number(leg.mark) : (leg.markPrice != null && !isNaN(Number(leg.markPrice)) ? Number(leg.markPrice) : (leg.mark_price != null && !isNaN(Number(leg.mark_price)) ? Number(leg.mark_price) : ltp));

            const bid = leg.bid != null && !isNaN(Number(leg.bid)) && Number(leg.bid) > 0 ? Number(leg.bid) : null;
            const ask = leg.ask != null && !isNaN(Number(leg.ask)) && Number(leg.ask) > 0 ? Number(leg.ask) : null;
            const oi = Number(leg.open_interest ?? leg.openInterest ?? leg.oi ?? 0);
            const vol = Number(leg.volume ?? 0);
            const iv = leg.iv != null && !isNaN(Number(leg.iv)) ? Number(leg.iv) : (leg.markIv != null ? Number(leg.markIv) : null);
            const delta = leg.delta != null && !isNaN(Number(leg.delta)) ? Number(leg.delta) : null;
            const gamma = leg.gamma != null && !isNaN(Number(leg.gamma)) ? Number(leg.gamma) : null;
            const theta = leg.theta != null && !isNaN(Number(leg.theta)) ? Number(leg.theta) : null;
            const vega = leg.vega != null && !isNaN(Number(leg.vega)) ? Number(leg.vega) : null;
            const rho = leg.rho != null && !isNaN(Number(leg.rho)) ? Number(leg.rho) : null;

            return {
              symbol: leg.symbol || `${underlying} ${selectedExp} ${strike} ${optType}`,
              strike: strike,
              option_type: optType,
              product_id: leg.productId || leg.securityId || leg.symbol || `${underlying}-${strike}-${optType}`,
              instrument_id: String(leg.productId || leg.securityId || leg.symbol || `${underlying}-${strike}-${optType}`),
              expiry: leg.expiry || selectedExp,
              ltp: ltp,
              last: ltp,
              price: ltp,
              premium: ltp,
              mark: mark,
              markPrice: mark,
              mark_price: mark,
              bid: bid,
              ask: ask,
              spread: (bid != null && ask != null) ? Math.max(0, ask - bid) : null,
              volume: vol,
              open_interest: oi,
              oi: oi,
              iv: iv,
              delta: delta,
              gamma: gamma,
              theta: theta,
              vega: vega,
              rho: rho,
              lot_size: Number(leg.lot_size || (isCrypto ? 0.001 : (underlying === "BANKNIFTY" ? 15 : 25))),
              tick_size: Number(leg.tick_size || 0.05),
              moneyness: leg.moneyness || (optType === "CE" ? (strike < spotPrice ? "ITM" : (strike === atmStrike ? "ATM" : "OTM")) : (strike > spotPrice ? "ITM" : (strike === atmStrike ? "ATM" : "OTM"))),
              greeks: {
                delta: delta,
                gamma: gamma,
                theta: theta,
                vega: vega,
                rho: rho,
                iv: iv,
                greeks_source: isCrypto ? "DELTA_LIVE" : "GATEWAY_LIVE",
              },
              exchange_ts: leg.exchangeTs || leg.exchange_timestamp || null,
              quote_age_ms: leg.quoteAgeMs ?? null,
              received_at: leg.receivedAt || new Date().toISOString(),
              status: leg.status || "LIVE",
            };
          };

          const callLeg = formatLeg(c, "CE");
          const putLeg = formatLeg(p, "PE");
          const isATM = atmStrike > 0 ? Math.abs(strike - atmStrike) < 0.1 : Boolean(r.is_atm || r.isATM);

          return {
            strike: strike,
            strikePrice: strike,
            call: callLeg,
            put: putLeg,
            ce: callLeg,
            pe: putLeg,
            isATM: isATM,
            is_atm: isATM,
          };
        });

        const isActuallyLive = gwChain.status === "LIVE" || gwChain.data_status === "LIVE";
        const responsePayload = {
          underlying,
          spot: spotPrice,
          spot_price: spotPrice,
          underlying_price: spotPrice,
          atm_strike: atmStrike,
          atmStrike: atmStrike,
          selected_expiry: selectedExp,
          selectedExpiry: selectedExp,
          expiry: selectedExp,
          available_expiries: availExps,
          availableExpiries: availExps,
          expiries: availExps,
          strikes: formattedRows,
          chain: formattedRows,
          rows: formattedRows,
          provider: gwChain.provider || provider,
          total_contracts: formattedRows.length,
          pcr: gwChain.pcr ?? gwChain.pcr_oi ?? (() => {
            let callOi = 0, putOi = 0;
            for (const row of formattedRows) {
              if (row.call?.open_interest) callOi += Number(row.call.open_interest);
              if (row.put?.open_interest) putOi += Number(row.put.open_interest);
            }
            return callOi > 0 ? Number((putOi / callOi).toFixed(2)) : 1.0;
          })(),
          max_pain: gwChain.max_pain || gwChain.maxPain || atmStrike,
          is_live: isActuallyLive,
          data_status: isActuallyLive ? "LIVE" : "REST_SNAPSHOT",
          timestamp: gwChain.timestamp || new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          data: responsePayload,
          ...responsePayload,
        });
      }
    }
  } catch (gwErr: any) {
    console.warn("[/api/market/option-chain] Gateway probe notice:", gwErr?.message);
  }
}

  // ── 2. Crypto Specialization: Delta Product Service fallback ──────────────
  if (isCrypto) {
    try {
      const { deltaProductService } = await import("@/lib/brokers/delta/delta-product-service");
      const snap = await deltaProductService.fetchOptionChainSnapshot(underlying, expiry);

      if (snap && snap.rows && snap.rows.length > 0) {
        const formattedRows = snap.rows.map((r) => {
          const c = r.call;
          const p = r.put;

          const formatLeg = (leg: any, optType: "CE" | "PE") => {
            if (!leg) return null;
            const rawLtp = leg.ltp ?? leg.lastPrice ?? leg.tradePrice ?? leg.close ?? null;
            const ltp = rawLtp != null && !isNaN(Number(rawLtp)) && Number(rawLtp) > 0 ? Number(rawLtp) : null;
            const markPrice = leg.markPrice ?? leg.mark ?? null;
            const bid = leg.bid != null && !isNaN(Number(leg.bid)) && Number(leg.bid) > 0 ? Number(leg.bid) : null;
            const ask = leg.ask != null && !isNaN(Number(leg.ask)) && Number(leg.ask) > 0 ? Number(leg.ask) : null;

            return {
              symbol: leg.symbol,
              strike: leg.strike,
              option_type: optType,
              product_id: leg.productId || leg.symbol,
              instrument_id: String(leg.productId || leg.symbol),
              expiry: leg.expiry || snap.selectedExpiry,
              ltp,
              last: ltp,
              price: ltp,
              premium: ltp,
              markPrice,
              bid,
              ask,
              spread: (bid != null && ask != null) ? Math.max(0, ask - bid) : null,
              volume: Number(leg.volume ?? 0),
              open_interest: Number(leg.openInterest ?? leg.oi ?? 0),
              oi: Number(leg.openInterest ?? leg.oi ?? 0),
              iv: leg.iv != null && !isNaN(Number(leg.iv)) ? Number(leg.iv) : (leg.markIv != null ? Number(leg.markIv) : null),
              delta: leg.delta != null && !isNaN(Number(leg.delta)) ? Number(leg.delta) : null,
              gamma: leg.gamma != null && !isNaN(Number(leg.gamma)) ? Number(leg.gamma) : null,
              theta: leg.theta != null && !isNaN(Number(leg.theta)) ? Number(leg.theta) : null,
              vega: leg.vega != null && !isNaN(Number(leg.vega)) ? Number(leg.vega) : null,
              lot_size: leg.lotSize ?? 0.001,
              tick_size: leg.tickSize ?? 0.1,
              moneyness: leg.moneyness || (optType === "CE" ? (r.strike < (snap.spotPrice || 0) ? "ITM" : "OTM") : (r.strike > (snap.spotPrice || 0) ? "ITM" : "OTM")),
              greeks: {
                delta: leg.delta != null && !isNaN(Number(leg.delta)) ? Number(leg.delta) : null,
                gamma: leg.gamma != null && !isNaN(Number(leg.gamma)) ? Number(leg.gamma) : null,
                theta: leg.theta != null && !isNaN(Number(leg.theta)) ? Number(leg.theta) : null,
                vega: leg.vega != null && !isNaN(Number(leg.vega)) ? Number(leg.vega) : null,
                iv: leg.iv != null && !isNaN(Number(leg.iv)) ? Number(leg.iv) : null,
                greeks_source: "DELTA_LIVE",
              },
            };
          };

          const callLeg = formatLeg(c, "CE");
          const putLeg = formatLeg(p, "PE");

          return {
            strike: r.strike,
            strikePrice: r.strike,
            call: callLeg,
            put: putLeg,
            ce: callLeg,
            pe: putLeg,
            isATM: snap.atmStrike != null ? Number(r.strike) === Number(snap.atmStrike) : false,
            is_atm: snap.atmStrike != null ? Number(r.strike) === Number(snap.atmStrike) : false,
          };
        });

        const responsePayload = {
          underlying,
          spot: snap.spotPrice,
          spot_price: snap.spotPrice,
          underlying_price: snap.spotPrice,
          atm_strike: snap.atmStrike,
          atmStrike: snap.atmStrike,
          selected_expiry: snap.selectedExpiry,
          selectedExpiry: snap.selectedExpiry,
          expiry: snap.selectedExpiry,
          available_expiries: snap.availableExpiries.map((e) => e.expiryIso),
          availableExpiries: snap.availableExpiries.map((e) => e.expiryIso),
          expiries: snap.availableExpiries.map((e) => e.expiryIso),
          strikes: formattedRows,
          chain: formattedRows,
          rows: formattedRows,
          provider: "DELTA",
          total_contracts: formattedRows.length,
          pcr: (() => {
            let callOi = 0, putOi = 0;
            for (const row of formattedRows) {
              if (row.call?.open_interest) callOi += Number(row.call.open_interest);
              if (row.put?.open_interest) putOi += Number(row.put.open_interest);
            }
            return callOi > 0 ? Number((putOi / callOi).toFixed(2)) : 1.0;
          })(),
          max_pain: snap.atmStrike || 0,
          is_live: true,
          timestamp: new Date().toISOString(),
        };

        return NextResponse.json({
          success: true,
          data: responsePayload,
          ...responsePayload,
        });
      }
    } catch (deltaErr: any) {
      console.warn("[/api/market/option-chain] deltaProductService fallback note:", deltaErr?.message);
    }
  }

  // ── 3. Query Backend API if configured ────────────────────────────────────
  if (BACKEND_URL) {
    try {
      const upstreamRes = await fetch(
        `${BACKEND_URL}/api/market/option-chain?${searchParams.toString()}`,
        { cache: "no-store", signal: AbortSignal.timeout(4000) }
      );
      if (upstreamRes.ok) {
        const body = await upstreamRes.json();
        const payload = body.data || body;
        const strikes = payload.strikes || payload.chain || payload.rows || [];
        if (Array.isArray(strikes) && strikes.length > 0) {
          return NextResponse.json({
            success: true,
            data: payload,
            ...payload,
          });
        }
      }
    } catch (err: any) {
      console.warn("[/api/market/option-chain] Backend query fallback:", err?.message);
    }
  }

  // ── 4. Truthful Unavailable Response (Zero Fabrication) ───────────────────
  return NextResponse.json({
    success: false,
    underlying,
    spot: 0,
    spot_price: 0,
    underlying_price: 0,
    atm_strike: null,
    atmStrike: null,
    selected_expiry: expiry || "",
    selectedExpiry: expiry || "",
    expiry: expiry || "",
    available_expiries: [],
    availableExpiries: [],
    expiries: [],
    strikes: [],
    chain: [],
    rows: [],
    provider: provider,
    total_contracts: 0,
    pcr: 1.0,
    max_pain: null,
    is_live: false,
    data_status: "UNAVAILABLE",
    timestamp: new Date().toISOString(),
    message: "No live option contracts currently available from exchange feed.",
  });
}
