import { NextRequest, NextResponse } from "next/server";
import { optionChainEngine } from "@/lib/market-data/option-chain-engine";
import { OptionStrikeData } from "@/lib/market-data/types";
import { DeltaOptionChainSnapshot, DeltaOptionLeg, OptionChainRow } from "@/types/delta-options";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";

function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalizes gateway / backend / raw Delta chain into standard OptionStrikeData for optionChainEngine
 */
function populateOptionEngine(
  underlying: string,
  spotPrice: number,
  expiry: string,
  availableExpiries: string[],
  rows: Array<{ strike: number; call: any | null; put: any | null }>
) {
  try {
    const strikes: OptionStrikeData[] = rows.map((r) => {
      const strikePrice = r.strike;
      const call = r.call
        ? {
            symbol: r.call.symbol || `C-${underlying}-${strikePrice}`,
            securityId: String(r.call.productId || strikePrice),
            ltp: r.call.mark ?? r.call.bid ?? 0,
            bid: r.call.bid ?? 0,
            ask: r.call.ask ?? 0,
            volume: r.call.volume ?? 0,
            openInterest: r.call.openInterest ?? 0,
            oiChange: 0,
            greeks: {
              delta: r.call.delta ?? 0,
              gamma: r.call.gamma ?? 0,
              theta: r.call.theta ?? 0,
              vega: r.call.vega ?? 0,
              rho: r.call.rho ?? 0,
              iv: r.call.markIv ?? r.call.askIv ?? 0,
            },
          }
        : null;

      const put = r.put
        ? {
            symbol: r.put.symbol || `P-${underlying}-${strikePrice}`,
            securityId: String(r.put.productId || strikePrice),
            ltp: r.put.mark ?? r.put.bid ?? 0,
            bid: r.put.bid ?? 0,
            ask: r.put.ask ?? 0,
            volume: r.put.volume ?? 0,
            openInterest: r.put.openInterest ?? 0,
            oiChange: 0,
            greeks: {
              delta: r.put.delta ?? 0,
              gamma: r.put.gamma ?? 0,
              theta: r.put.theta ?? 0,
              vega: r.put.vega ?? 0,
              rho: r.put.rho ?? 0,
              iv: r.put.markIv ?? r.put.askIv ?? 0,
            },
          }
        : null;

      return {
        strikePrice,
        isATM: false,
        distancePct: 0,
        call,
        put,
      };
    });

    optionChainEngine.updateChainSnapshot(
      underlying,
      spotPrice,
      expiry,
      availableExpiries,
      strikes
    );
  } catch (err) {
    console.error("[populateOptionEngine] Error caching to optionChainEngine:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const rawUnderlying = search.get("underlying") || search.get("symbol") || "BTC";
    const underlying = rawUnderlying.trim().toUpperCase();
    const source = (search.get("source") || "DELTA_INDIA").trim().toUpperCase();
    const environment = search.get("environment") || "LIVE";
    const expiry = search.get("expiry") || "";
    const strikeCount = search.get("strike_count") || "25";

    const isDelta = source.includes("DELTA") || ["BTC", "ETH", "SOL", "XRP", "XAUT"].includes(underlying);

    // 1. First probe Market Data Gateway (Port 5051)
    if (isDelta) {
      try {
        const gwUrl = new URL(`${GATEWAY_URL}/api/options/chain`);
        gwUrl.searchParams.set("underlying", underlying);
        gwUrl.searchParams.set("source", "DELTA_INDIA");
        if (expiry) gwUrl.searchParams.set("expiry", expiry);
        gwUrl.searchParams.set("strike_count", strikeCount);

        const gwRes = await fetch(gwUrl.toString(), {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });

        if (gwRes.ok) {
          const gwData = await gwRes.json();
          if (gwData?.success && Array.isArray(gwData?.rows) && gwData.rows.length > 0) {
            const expList = Array.isArray(gwData.availableExpiries) ? gwData.availableExpiries : [gwData.expiry || expiry];
            populateOptionEngine(
              underlying,
              gwData.spot || 0,
              gwData.expiry || expiry,
              expList,
              gwData.rows
            );

            // Structure data matching both gateway format and frontend OptionsUniverseView expectation
            const responsePayload = {
              success: true,
              source: "DELTA_EXCHANGE",
              broker: "DELTA",
              underlying,
              expiry: gwData.expiry || expiry,
              selected_expiry: gwData.expiry || expiry,
              available_expiries: expList,
              spot: gwData.spot,
              spot_price: gwData.spot,
              atmStrike: gwData.atmStrike,
              atm_strike: gwData.atmStrike,
              contracts: gwData.contracts,
              rows: gwData.rows,
              strikes: gwData.rows,
              timestamp: gwData.timestamp || new Date().toISOString(),
              data: {
                success: true,
                source: "DELTA_EXCHANGE",
                broker: "DELTA",
                underlying,
                selected_expiry: gwData.expiry || expiry,
                available_expiries: expList,
                spot_price: gwData.spot,
                atm_strike: gwData.atmStrike,
                strikes: gwData.rows,
                contracts: gwData.contracts,
              },
            };

            return NextResponse.json(responsePayload, { status: 200 });
          }
        }
      } catch {
        // Gateway probe failed, fall through to backend
      }
    }

    // 2. Second probe Quantitative Backend (Port 5050)
    try {
      const backendUrl = new URL(`${BACKEND_URL}/api/options/chain`);
      backendUrl.searchParams.set("underlying", underlying);
      backendUrl.searchParams.set("source", source);
      backendUrl.searchParams.set("environment", environment);
      if (expiry) backendUrl.searchParams.set("expiry", expiry);
      backendUrl.searchParams.set("strike_count", strikeCount);

      const bRes = await fetch(backendUrl.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (bRes.ok) {
        const bData = await bRes.json();
        const payload = bData?.data || bData;
        const rows = payload?.strikes || payload?.rows || [];

        if (Array.isArray(rows) && rows.length > 0) {
          const expList = payload?.available_expiries || payload?.availableExpiries || [payload?.selected_expiry || expiry];
          populateOptionEngine(
            underlying,
            payload?.spot_price || payload?.spot || 0,
            payload?.selected_expiry || payload?.expiry || expiry,
            expList,
            rows
          );

          return NextResponse.json(bData, { status: 200 });
        }
      }
    } catch {
      // Backend probe failed
    }

    // 3. Fallback: Direct Delta India REST call if upstream services are initializing
    if (isDelta) {
      let targetExpiry = expiry;
      let availableExpiries: string[] = [];

      // If no expiry provided, fetch available expiries from Delta products catalogue
      if (!targetExpiry) {
        try {
          const prodRes = await fetch(
            `https://api.india.delta.exchange/v2/products?contract_types=call_options,put_options&underlying_asset_symbols=${underlying}`,
            { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(3500) }
          );
          if (prodRes.ok) {
            const pData = await prodRes.json();
            const prods = Array.isArray(pData?.result) ? pData.result : [];
            const expSet = new Set<string>();
            const now = new Date();

            for (const p of prods) {
              const st = p?.settlement_time;
              if (!st) continue;
              const dt = new Date(st);
              if (isNaN(dt.getTime()) || dt < now) continue;
              const dd = String(dt.getUTCDate()).padStart(2, "0");
              const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
              const yyyy = dt.getUTCFullYear();
              expSet.add(`${dd}-${mm}-${yyyy}`);
            }

            availableExpiries = Array.from(expSet).sort((a, b) => {
              const [d1, m1, y1] = a.split("-").map(Number);
              const [d2, m2, y2] = b.split("-").map(Number);
              return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
            });

            if (availableExpiries.length > 0) {
              targetExpiry = availableExpiries[0];
            }
          }
        } catch {
          // catalogue fetch failed
        }
      }

      if (targetExpiry) {
        const deltaUrl = new URL("https://api.india.delta.exchange/v2/tickers");
        deltaUrl.searchParams.set("contract_types", "call_options,put_options");
        deltaUrl.searchParams.set("underlying_asset_symbols", underlying);
        deltaUrl.searchParams.set("expiry_date", targetExpiry);

        const deltaRes = await fetch(deltaUrl.toString(), {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });

        if (deltaRes.ok) {
          const dData = await deltaRes.json();
          const contracts = Array.isArray(dData?.result) ? dData.result : [];

          if (contracts.length > 0) {
            const rowsMap = new Map<number, OptionChainRow>();
            let spot: number | null = null;
            let callCount = 0;
            let putCount = 0;

            for (const raw of contracts) {
              const strike = toNum(raw?.strike_price);
              if (strike === null) continue;

              if (spot === null) {
                spot = toNum(raw?.spot_price);
              }

              const quotes = raw?.quotes ?? {};
              const greeks = raw?.greeks ?? {};

              const leg: DeltaOptionLeg = {
                source: "DELTA_EXCHANGE",
                broker: "DELTA",
                symbol: String(raw?.symbol ?? ""),
                productId: toNum(raw?.product_id) ?? 0,
                side: raw?.contract_type === "call_options" ? "CALL" : "PUT",
                underlying,
                expiry: targetExpiry,
                strike,
                spot: toNum(raw?.spot_price),
                mark: toNum(raw?.mark_price),
                bid: toNum(quotes?.best_bid),
                ask: toNum(quotes?.best_ask),
                bidSize: toNum(quotes?.bid_size),
                askSize: toNum(quotes?.ask_size),
                bidIv: toNum(quotes?.bid_iv),
                askIv: toNum(quotes?.ask_iv),
                markIv: toNum(raw?.mark_vol),
                delta: toNum(greeks?.delta),
                gamma: toNum(greeks?.gamma),
                theta: toNum(greeks?.theta),
                vega: toNum(greeks?.vega),
                rho: toNum(greeks?.rho),
                openInterest: toNum(raw?.oi),
                volume: toNum(raw?.volume),
                exchangeTs: toNum(raw?.timestamp),
                receivedAt: Date.now(),
                status: "LIVE",
              };

              let row = rowsMap.get(strike);
              if (!row) {
                row = { strike, call: null, put: null };
                rowsMap.set(strike, row);
              }

              if (raw?.contract_type === "call_options") {
                row.call = leg;
                callCount++;
              } else if (raw?.contract_type === "put_options") {
                row.put = leg;
                putCount++;
              }
            }

            const chainRows = Array.from(rowsMap.values()).sort((a, b) => a.strike - b.strike);
            let atmStrike: number | null = null;
            if (spot !== null && chainRows.length > 0) {
              atmStrike = chainRows.reduce((closest, row) => {
                return Math.abs(row.strike - spot!) < Math.abs(closest - spot!) ? row.strike : closest;
              }, chainRows[0].strike);
            }

            if (availableExpiries.length === 0) {
              availableExpiries = [targetExpiry];
            }

            populateOptionEngine(underlying, spot || 0, targetExpiry, availableExpiries, chainRows);

            return NextResponse.json({
              success: true,
              source: "DELTA_EXCHANGE",
              broker: "DELTA",
              underlying,
              expiry: targetExpiry,
              selected_expiry: targetExpiry,
              available_expiries: availableExpiries,
              spot,
              spot_price: spot,
              atmStrike,
              atm_strike: atmStrike,
              contracts: contracts.length,
              calls: callCount,
              puts: putCount,
              rowCount: chainRows.length,
              rows: chainRows,
              strikes: chainRows,
              timestamp: new Date().toISOString(),
              data: {
                success: true,
                source: "DELTA_EXCHANGE",
                broker: "DELTA",
                underlying,
                selected_expiry: targetExpiry,
                available_expiries: availableExpiries,
                spot_price: spot,
                atm_strike: atmStrike,
                strikes: chainRows,
                contracts: contracts.length,
              },
            });
          }
        }
      }
    }

    // 4. If memory cache has anything in optionChainEngine, return it
    const cached = optionChainEngine.getOptionChain(underlying, expiry);
    if (cached) {
      return NextResponse.json({
        success: true,
        source: isDelta ? "DELTA_EXCHANGE" : "CACHE",
        broker: isDelta ? "DELTA" : "UNKNOWN",
        underlying,
        expiry: cached.expiryDate,
        selected_expiry: cached.expiryDate,
        available_expiries: cached.availableExpiries,
        spot: cached.underlyingPrice,
        spot_price: cached.underlyingPrice,
        atmStrike: cached.strikes.find((s) => s.isATM)?.strikePrice || cached.underlyingPrice,
        atm_strike: cached.strikes.find((s) => s.isATM)?.strikePrice || cached.underlyingPrice,
        contracts: cached.strikes.length * 2,
        rows: cached.strikes,
        strikes: cached.strikes,
        timestamp: new Date(cached.timestamp).toISOString(),
        data: cached,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "OPTION_CHAIN_NOT_FOUND",
        message: `No active option chain data available for '${underlying}' on '${source}'.`,
      },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
