import { NextRequest, NextResponse } from "next/server";
import { optionChainEngine } from "@/lib/market-data/option-chain-engine";
import { marketState } from "@/lib/market-data/market-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:5050";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const underlying = searchParams.get("underlying") || searchParams.get("symbol");
  const expiry = searchParams.get("expiry") || undefined;
  const source = searchParams.get("source") || undefined;

  if (!underlying) {
    return NextResponse.json(
      { error: "UNDERLYING_REQUIRED", message: "Query parameter 'underlying' is required (e.g., BTC, NIFTY, BANKNIFTY)." },
      { status: 400 }
    );
  }

  const cleanUnderlying = underlying.trim().toUpperCase();
  let chain = optionChainEngine.getOptionChain(cleanUnderlying, expiry);

  // If not found in memory, query canonical gateway / backend to populate the engine
  if (!chain) {
    try {
      const isDelta = cleanUnderlying === "BTC" || cleanUnderlying === "ETH" || cleanUnderlying === "SOL" || (source && source.toUpperCase().includes("DELTA"));
      const targetUrl = isDelta
        ? `${GATEWAY_URL}/api/options/chain?underlying=${cleanUnderlying}&source=DELTA_INDIA${expiry ? `&expiry=${expiry}` : ""}`
        : `${BACKEND_URL}/api/options/chain?underlying=${cleanUnderlying}${expiry ? `&expiry=${expiry}` : ""}`;

      const res = await fetch(targetUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const payload = await res.json();
        // Check if engine is now populated or build snapshot directly
        chain = optionChainEngine.getOptionChain(cleanUnderlying, expiry);
        if (!chain && payload) {
          const rows = payload?.rows || payload?.strikes || payload?.data?.strikes || [];
          const spot = payload?.spot || payload?.spot_price || payload?.data?.spot_price || 0;
          const exp = payload?.expiry || payload?.selected_expiry || payload?.data?.selected_expiry || expiry || "";
          const expList = payload?.availableExpiries || payload?.available_expiries || [exp];

          if (rows.length > 0) {
            const strikes = rows.map((r: any) => ({
              strikePrice: r.strike || r.strikePrice,
              isATM: false,
              distancePct: 0,
              call: r.call ? {
                symbol: r.call.symbol || `C-${cleanUnderlying}-${r.strike}`,
                securityId: String(r.call.productId || r.strike),
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
              } : null,
              put: r.put ? {
                symbol: r.put.symbol || `P-${cleanUnderlying}-${r.strike}`,
                securityId: String(r.put.productId || r.strike),
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
              } : null,
            }));

            chain = optionChainEngine.updateChainSnapshot(cleanUnderlying, spot, exp, expList, strikes);
          }
        }
      }
    } catch {
      // upstream fetch failed
    }
  }

  if (!chain) {
    return NextResponse.json(
      {
        status: "NOT_FOUND",
        underlying: cleanUnderlying,
        message: `No active option chain data found for '${cleanUnderlying}'.`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: "SUCCESS",
    underlying: cleanUnderlying,
    chain,
    timestamp: new Date().toISOString(),
  });
}

