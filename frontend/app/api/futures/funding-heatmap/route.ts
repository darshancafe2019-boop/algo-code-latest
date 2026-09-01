import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEATMAP_DATA = [
  { symbol: "SOL/USDT:USDT", underlying: "SOL", markPrice: 188.8, change24h: 4.25, rate8h: 0.00022, apr: 24.09, countdown: "04:18:22", openInterestUsd: 480000000.0 },
  { symbol: "XRP/USDT:USDT", underlying: "XRP", markPrice: 0.582, change24h: 3.40, rate8h: 0.00015, apr: 16.43, countdown: "04:18:22", openInterestUsd: 260000000.0 },
  { symbol: "BTC/USDT:USDT", underlying: "BTC", markPrice: 78540.0, change24h: 2.65, rate8h: 0.00012, apr: 13.14, countdown: "04:18:22", openInterestUsd: 1850000000.0 },
  { symbol: "ETH/USDT:USDT", underlying: "ETH", markPrice: 3485.0, change24h: 1.95, rate8h: 0.00008, apr: 8.76, countdown: "04:18:22", openInterestUsd: 950000000.0 },
  { symbol: "BNB/USDT:USDT", underlying: "BNB", markPrice: 585.0, change24h: 1.15, rate8h: 0.00006, apr: 6.57, countdown: "04:18:22", openInterestUsd: 180000000.0 },
  { symbol: "DOGE/USDT:USDT", underlying: "DOGE", markPrice: 0.128, change24h: 5.80, rate8h: 0.00018, apr: 19.71, countdown: "04:18:22", openInterestUsd: 190000000.0 },
  { symbol: "AVAX/USDT:USDT", underlying: "AVAX", markPrice: 28.4, change24h: 2.10, rate8h: 0.00010, apr: 10.95, countdown: "04:18:22", openInterestUsd: 95000000.0 },
  { symbol: "LINK/USDT:USDT", underlying: "LINK", markPrice: 12.4, change24h: 1.80, rate8h: 0.00009, apr: 9.86, countdown: "04:18:22", openInterestUsd: 75000000.0 },
];

export async function GET() {
  return NextResponse.json(
    {
      status: "SUCCESS",
      count: HEATMAP_DATA.length,
      data: HEATMAP_DATA,
    },
    { status: 200 }
  );
}
