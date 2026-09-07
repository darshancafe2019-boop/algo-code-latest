import { NextRequest, NextResponse } from "next/server";
import { brokerManager } from "@/lib/brokers/broker-manager";
import { BrokerName } from "@/lib/brokers/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { broker: string; action: string } }
) {
  const brokerStr = (params.broker || "").toLowerCase();
  const action = (params.action || "").toLowerCase();

  const validBrokers: BrokerName[] = ["dhan", "upstox", "delta"];
  if (!validBrokers.includes(brokerStr as BrokerName)) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: `Unsupported broker '${params.broker}'. Supported brokers: ${validBrokers.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const broker = brokerStr as BrokerName;

  try {
    const adapter = brokerManager.getAdapter(broker);

    switch (action) {
      case "profile": {
        const profile = await adapter.getProfile().catch(() => ({
          broker,
          clientId: "NOT_CONFIGURED",
          clientIdMasked: "NOT_CONFIGURED",
          tradingMode: "PAPER" as const,
          connected: false,
          lastUpdated: Date.now(),
        }));
        return NextResponse.json({ success: true, profile });
      }

      case "funds": {
        const funds = await adapter.getFunds().catch(() => ({
          broker,
          connected: false,
          availableBalance: 0,
          availableMargin: 0,
          usedMargin: 0,
          collateral: 0,
          withdrawable: 0,
          currency: broker === "delta" ? "USD" : "INR",
          lastUpdated: Date.now(),
        }));
        return NextResponse.json({ success: true, funds });
      }

      case "positions": {
        const positions = await adapter.getPositions().catch(() => []);
        return NextResponse.json({ success: true, positions, count: positions.length });
      }

      case "holdings": {
        const holdings = await adapter.getHoldings().catch(() => []);
        return NextResponse.json({ success: true, holdings, count: holdings.length });
      }

      case "orders": {
        const orders = await adapter.getOrders().catch(() => []);
        return NextResponse.json({ success: true, orders, count: orders.length });
      }

      case "trades": {
        const trades = await adapter.getTrades().catch(() => []);
        return NextResponse.json({ success: true, trades, count: trades.length });
      }

      case "status": {
        try {
          const profile = await adapter.getProfile().catch(() => ({
            broker,
            clientId: "NOT_CONFIGURED",
            clientIdMasked: "NOT_CONFIGURED",
            tradingMode: "PAPER" as const,
            connected: false,
            lastUpdated: Date.now(),
          }));
          const funds = await adapter.getFunds().catch(() => ({
            broker,
            connected: false,
            availableBalance: 0,
            availableMargin: 0,
            usedMargin: 0,
            collateral: 0,
            withdrawable: 0,
            currency: broker === "delta" ? "USD" : "INR",
            lastUpdated: Date.now(),
          }));
          return NextResponse.json({
            status: "success",
            connected: adapter.isAuthenticated() && profile.connected,
            broker: broker.toUpperCase(),
            brokerName: adapter.capabilities?.brokerName || broker.toUpperCase(),
            clientId: profile.clientId,
            clientIdMasked: profile.clientIdMasked,
            capabilities: adapter.capabilities,
            funds,
            timestamp: new Date().toISOString(),
          });
        } catch {
          return NextResponse.json({
            status: "success",
            connected: false,
            broker: broker.toUpperCase(),
            brokerName: broker.toUpperCase(),
            clientId: "NOT_CONFIGURED",
            clientIdMasked: "NOT_CONFIGURED",
            funds: {
              broker,
              connected: false,
              availableBalance: 0,
              availableMargin: 0,
              usedMargin: 0,
              collateral: 0,
              withdrawable: 0,
              currency: broker === "delta" ? "USD" : "INR",
              lastUpdated: Date.now(),
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported broker action '${action}' for broker '${broker}'.` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: err.message || "Broker API request failed",
      },
      { status: 200 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { broker: string; action: string } }
) {
  const brokerStr = (params.broker || "").toLowerCase();
  const action = (params.action || "").toLowerCase();

  const validBrokers: BrokerName[] = ["dhan", "upstox", "delta"];
  if (!validBrokers.includes(brokerStr as BrokerName)) {
    return NextResponse.json(
      {
        success: false,
        error: `Unsupported broker '${params.broker}'. Supported brokers: ${validBrokers.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const broker = brokerStr as BrokerName;

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
        const funds = await adapter.getFunds().catch(() => null);
        const latencyMs = Math.round(performance.now() - t0);
        return NextResponse.json({
          success: true,
          connected: funds?.connected ?? false,
          latencyMs,
          broker: broker.toUpperCase(),
          message: `${adapter.capabilities?.brokerName || broker.toUpperCase()} ping diagnostic completed (${latencyMs}ms).`,
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
      { status: 400 }
    );
  }
}
