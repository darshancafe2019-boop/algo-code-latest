import { NextResponse } from "next/server";
import { marketDataConfig } from "@/lib/market-data/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDhan = Boolean(marketDataConfig.dhan.clientId && marketDataConfig.dhan.accessToken);
  const hasUpstox = Boolean(marketDataConfig.upstox.apiKey && marketDataConfig.upstox.accessToken);
  const hasDelta = Boolean(marketDataConfig.delta.apiKey);

  const accounts = [
    {
      brokerId: "dhan",
      brokerName: "Dhan HQ",
      accountType: "EQUITY_DERIVATIVES",
      currency: "INR",
      status: hasDhan ? "CONNECTED" : "NOT_CONFIGURED",
      balance: {
        totalCapital: 1000000.0,
        availableMargin: 850000.0,
        usedMargin: 150000.0,
        unrealizedPnl: 0.0,
        realizedPnl: 0.0,
      },
    },
    {
      brokerId: "upstox",
      brokerName: "Upstox V3",
      accountType: "EQUITY_DERIVATIVES",
      currency: "INR",
      status: hasUpstox ? "CONNECTED" : "NOT_CONFIGURED",
      balance: {
        totalCapital: 500000.0,
        availableMargin: 500000.0,
        usedMargin: 0.0,
        unrealizedPnl: 0.0,
        realizedPnl: 0.0,
      },
    },
    {
      brokerId: "delta",
      brokerName: "Delta Exchange India",
      accountType: "CRYPTO_DERIVATIVES",
      currency: "USD / USDT",
      status: hasDelta ? "CONNECTED" : "PUBLIC_DATA_ONLY",
      balance: {
        totalCapital: 10000.0,
        availableMargin: 10000.0,
        usedMargin: 0.0,
        unrealizedPnl: 0.0,
        realizedPnl: 0.0,
      },
    },
  ];

  return NextResponse.json({
    status: "success",
    timestamp: Date.now(),
    tradingMode: process.env.TRADING_MODE || "PAPER",
    paperTrading: true,
    accounts,
  });
}
