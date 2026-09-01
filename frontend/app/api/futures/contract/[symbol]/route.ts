import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const symbol = (params.symbol || "").toUpperCase();

  const contract = {
    symbol: symbol.includes(":") ? symbol : `${symbol}/USDT:USDT`,
    underlying: symbol.replace("/USDT:USDT", "").replace("/USDT", "").replace("-FUT", ""),
    displayName: `${symbol} Perpetual Contract`,
    contract_type: "PERPETUAL",
    venue: "BINANCE",
    mark_price: symbol.includes("BTC") ? 78540.0 : symbol.includes("ETH") ? 3485.0 : 188.8,
    index_price: symbol.includes("BTC") ? 78520.0 : symbol.includes("ETH") ? 3480.0 : 188.2,
    last_price: symbol.includes("BTC") ? 78540.0 : symbol.includes("ETH") ? 3485.0 : 188.8,
    change_24h_pct: 2.65,
    volume_24h_usd: 4200000000.0,
    open_interest_usd: 1850000000.0,
    open_interest_coins: 23554.8,
    max_leverage: 125,
    min_qty: 0.001,
    tick_size: 0.1,
    is_active: true,
    long_short_ratio: 1.12,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(
    {
      status: "SUCCESS",
      contract,
    },
    { status: 200 }
  );
}
