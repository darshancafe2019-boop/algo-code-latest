import { NextRequest, NextResponse } from "next/server";
import { brokerManager } from "@/lib/brokers/broker-manager";
import { BrokerName } from "@/lib/brokers/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { broker: string; action: string } }
) {
  const broker = params.broker.toLowerCase() as BrokerName;
  const action = params.action.toLowerCase();

  try {
    const adapter = brokerManager.getAdapter(broker);

    switch (action) {
      case "profile": {
        const profile = await adapter.getProfile();
        return NextResponse.json({ success: true, profile });
      }

      case "funds": {
        const funds = await adapter.getFunds();
        return NextResponse.json({ success: true, funds });
      }

      case "positions": {
        const positions = await adapter.getPositions();
        return NextResponse.json({ success: true, positions, count: positions.length });
      }

      case "holdings": {
        const holdings = await adapter.getHoldings();
        return NextResponse.json({ success: true, holdings, count: holdings.length });
      }

      case "orders": {
        const orders = await adapter.getOrders();
        return NextResponse.json({ success: true, orders, count: orders.length });
      }

      case "trades": {
        const trades = await adapter.getTrades();
        return NextResponse.json({ success: true, trades, count: trades.length });
      }

      case "status": {
        const profile = await adapter.getProfile();
        const funds = await adapter.getFunds();
        return NextResponse.json({
          status: "success",
          connected: adapter.isAuthenticated() && profile.connected,
          broker: broker.toUpperCase(),
          brokerName: adapter.capabilities.brokerName,
          clientId: profile.clientId,
          clientIdMasked: profile.clientIdMasked,
          capabilities: adapter.capabilities,
          funds,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported broker action '${action}' for broker '${broker}'.` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Broker API request failed" },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { broker: string; action: string } }
) {
  const broker = params.broker.toLowerCase() as BrokerName;
  const action = params.action.toLowerCase();

  try {
    const adapter = brokerManager.getAdapter(broker);
    const body = await req.json().catch(() => ({}));

    switch (action) {
      case "orders": {
        const result = await adapter.placeOrder(body);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "ping": {
        const t0 = performance.now();
        const funds = await adapter.getFunds();
        const latencyMs = Math.round(performance.now() - t0);
        return NextResponse.json({
          success: true,
          connected: funds.connected,
          latencyMs,
          broker: broker.toUpperCase(),
          message: `${adapter.capabilities.brokerName} ping diagnostic successful (${latencyMs}ms).`,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported POST action '${action}'` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Broker operation failed" },
      { status: 500 }
    );
  }
}
