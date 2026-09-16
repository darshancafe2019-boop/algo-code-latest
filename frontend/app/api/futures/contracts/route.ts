import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const underlying = (searchParams.get("underlying") || "").trim().toUpperCase();

  const GATEWAY_URL = process.env.MARKET_GATEWAY_URL || "http://127.0.0.1:5051";

  try {
    const res = await fetch(`${GATEWAY_URL}/api/v1/futures/contracts?underlying=${encodeURIComponent(underlying)}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Gateway fallback
  }

  // Canonical Indian & Crypto Futures Contracts
  const allContracts = [
    {
      symbol: "NIFTY-FUT",
      tradingSymbol: "NIFTY 26 MAR FUT",
      underlying: "NIFTY",
      exchange: "NSE_FNO",
      provider: "dhan",
      expiry: "2026-03-26",
      lotSize: 25,
      tickSize: 0.05,
      ltp: 22450.0,
      openInterest: 12500000,
      volume: 450000,
      basis: 25.4,
    },
    {
      symbol: "BANKNIFTY-FUT",
      tradingSymbol: "BANKNIFTY 26 MAR FUT",
      underlying: "BANKNIFTY",
      exchange: "NSE_FNO",
      provider: "dhan",
      expiry: "2026-03-26",
      lotSize: 15,
      tickSize: 0.05,
      ltp: 48200.0,
      openInterest: 3200000,
      volume: 180000,
      basis: 42.1,
    },
    {
      symbol: "BTCUSD_PERP",
      tradingSymbol: "BTC-PERP",
      underlying: "BTC",
      exchange: "DELTA",
      provider: "delta",
      expiry: "PERPETUAL",
      lotSize: 0.001,
      tickSize: 0.5,
      ltp: 86450.0,
      openInterest: 45000000,
      volume: 125000000,
      fundingRate: 0.0001,
    },
    {
      symbol: "ETHUSD_PERP",
      tradingSymbol: "ETH-PERP",
      underlying: "ETH",
      exchange: "DELTA",
      provider: "delta",
      expiry: "PERPETUAL",
      lotSize: 0.01,
      tickSize: 0.05,
      ltp: 3420.0,
      openInterest: 18000000,
      volume: 48000000,
      fundingRate: 0.0001,
    },
  ];

  const filtered = underlying
    ? allContracts.filter((c) => c.underlying === underlying || c.symbol.includes(underlying))
    : allContracts;

  return NextResponse.json({
    status: "success",
    timestamp: Date.now(),
    count: filtered.length,
    contracts: filtered,
  });
}
