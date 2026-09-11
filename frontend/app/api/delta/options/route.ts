import { NextRequest, NextResponse } from "next/server";
import { DeltaOptionChainSnapshot, DeltaOptionLeg, OptionChainRow } from "@/types/delta-options";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams;
    const underlying = (search.get("underlying") ?? "BTC").trim().toUpperCase();
    const expiry = search.get("expiry");

    // 1. Try canonical Gateway (Port 5051)
    try {
      const gwUrl = new URL(`${GATEWAY_URL}/api/options/chain`);
      gwUrl.searchParams.set("underlying", underlying);
      gwUrl.searchParams.set("source", "DELTA_INDIA");
      if (expiry) gwUrl.searchParams.set("expiry", expiry);

      const gwRes = await fetch(gwUrl.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (gwRes.ok) {
        const gwData = await gwRes.json();
        if (gwData?.success && Array.isArray(gwData?.rows) && gwData.rows.length > 0) {
          return NextResponse.json(gwData, { status: 200 });
        }
      }
    } catch {
      // Fallback to direct Delta REST
    }

    if (!expiry) {
      return NextResponse.json(
        {
          success: false,
          error: "EXPIRY_REQUIRED",
          example: "12-09-2026",
        },
        { status: 400 }
      );
    }

    const url = new URL("https://api.india.delta.exchange/v2/tickers");
    url.searchParams.set("contract_types", "call_options,put_options");
    url.searchParams.set("underlying_asset_symbols", underlying);
    url.searchParams.set("expiry_date", expiry);

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const payload: any = await response.json();

    if (!response.ok || !payload?.success) {
      return NextResponse.json(
        {
          success: false,
          source: "DELTA_EXCHANGE",
          broker: "DELTA",
          status: response.status,
          delta: payload,
        },
        { status: response.ok ? 502 : response.status }
      );
    }

    const contracts: any[] = Array.isArray(payload.result) ? payload.result : [];
    const rows = new Map<number, OptionChainRow>();

    let spot: number | null = null;
    let callCount = 0;
    let putCount = 0;

    for (const raw of contracts) {
      const strike = num(raw?.strike_price);
      if (strike === null) continue;

      if (spot === null) {
        spot = num(raw?.spot_price);
      }

      const quotes = raw?.quotes ?? {};
      const greeks = raw?.greeks ?? {};

      const leg: DeltaOptionLeg = {
        source: "DELTA_EXCHANGE",
        broker: "DELTA",
        symbol: String(raw?.symbol ?? ""),
        productId: num(raw?.product_id) ?? 0,
        side: raw?.contract_type === "call_options" ? "CALL" : "PUT",
        underlying,
        expiry,
        strike,
        spot: num(raw?.spot_price),
        mark: num(raw?.mark_price),
        bid: num(quotes?.best_bid),
        ask: num(quotes?.best_ask),
        bidSize: num(quotes?.bid_size),
        askSize: num(quotes?.ask_size),
        bidIv: num(quotes?.bid_iv),
        askIv: num(quotes?.ask_iv),
        markIv: num(raw?.mark_vol),
        delta: num(greeks?.delta),
        gamma: num(greeks?.gamma),
        theta: num(greeks?.theta),
        vega: num(greeks?.vega),
        rho: num(greeks?.rho),
        openInterest: num(raw?.oi),
        volume: num(raw?.volume),
        exchangeTs: num(raw?.timestamp),
        receivedAt: Date.now(),
        status: "LIVE",
      };

      let row = rows.get(strike);
      if (!row) {
        row = {
          strike,
          call: null,
          put: null,
        };
        rows.set(strike, row);
      }

      if (raw?.contract_type === "call_options") {
        row.call = leg;
        callCount++;
      } else if (raw?.contract_type === "put_options") {
        row.put = leg;
        putCount++;
      }
    }

    const chainRows = Array.from(rows.values()).sort((a, b) => a.strike - b.strike);

    let atmStrike: number | null = null;
    if (spot !== null && chainRows.length > 0) {
      atmStrike = chainRows.reduce((closest, row) => {
        return Math.abs(row.strike - spot!) < Math.abs(closest - spot!) ? row.strike : closest;
      }, chainRows[0].strike);
    }

    const snapshot: DeltaOptionChainSnapshot = {
      source: "DELTA_EXCHANGE",
      broker: "DELTA",
      underlying,
      expiry,
      spot,
      atmStrike,
      contracts: contracts.length,
      rows: chainRows,
      status: "LIVE",
      exchangeTs: Date.now(),
      receivedAt: Date.now(),
    };

    return NextResponse.json({
      success: true,
      source: "DELTA_EXCHANGE",
      broker: "DELTA",
      mode: "DIRECT_DIAGNOSTIC",
      underlying,
      expiry,
      spot,
      atmStrike,
      contracts: contracts.length,
      calls: callCount,
      puts: putCount,
      rowCount: chainRows.length,
      rows: chainRows,
      timestamp: new Date().toISOString(),
      snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Delta option-chain error",
      },
      { status: 500 }
    );
  }
}



