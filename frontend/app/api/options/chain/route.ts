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

    // 1. If Delta provider or Crypto underlying: use authoritative Delta Product & Options Service
    if (isDelta) {
      try {
        const { deltaProductService } = await import("@/lib/brokers/delta/delta-product-service");
        const snapshot = await deltaProductService.fetchOptionChainSnapshot(underlying, expiry || undefined);

        const expList = snapshot.availableExpiries.map((e) => e.expiryApiFormat);
        populateOptionEngine(
          underlying,
          snapshot.spotPrice || 0,
          snapshot.selectedExpiry,
          expList,
          snapshot.rows as any
        );

        const responsePayload = {
          success: true,
          source: "DELTA_EXCHANGE",
          broker: "DELTA",
          underlying: snapshot.underlying,
          expiry: snapshot.selectedExpiry,
          selected_expiry: snapshot.selectedExpiry,
          available_expiries: expList,
          availableExpiries: expList,
          all_underlyings: snapshot.allUnderlyings,
          spot: snapshot.spotPrice,
          spot_price: snapshot.spotPrice,
          atmStrike: snapshot.atmStrike,
          atm_strike: snapshot.atmStrike,
          contracts: snapshot.contractsCount,
          calls: snapshot.callsCount,
          puts: snapshot.putsCount,
          rows: snapshot.rows,
          strikes: snapshot.rows,
          ws_subscription_symbol: snapshot.wsSubscriptionSymbol,
          status: snapshot.status,
          timestamp: new Date(snapshot.lastUpdated).toISOString(),
          data: {
            success: true,
            source: "DELTA_EXCHANGE",
            broker: "DELTA",
            underlying: snapshot.underlying,
            selected_expiry: snapshot.selectedExpiry,
            available_expiries: expList,
            spot_price: snapshot.spotPrice,
            atm_strike: snapshot.atmStrike,
            strikes: snapshot.rows,
            contracts: snapshot.contractsCount,
          },
        };

        return NextResponse.json(responsePayload, { status: 200 });
      } catch (deltaErr: any) {
        console.warn("[/api/options/chain] Delta Direct Service fallback:", deltaErr?.message);
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
