/**
 * Delta Exchange India Positions & Orders
 */
import { DeltaClient } from "./client";
import { Position, Holding, NormalizedOrder, OrderModification, OrderResult, Trade } from "../types";

export class DeltaPositions {
  private client: DeltaClient;

  constructor(client: DeltaClient) {
    this.client = client;
  }

  public async getPositions(): Promise<Position[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "v2/positions",
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.result || [];
      return list.map((item: any) => ({
        broker: "delta",
        symbol: item.product_symbol || item.symbol || "UNKNOWN",
        instrumentId: String(item.product_id || ""),
        side: Number(item.size || 0) < 0 ? "SELL" : "BUY",
        quantity: Math.abs(Number(item.size || 0)),
        averagePrice: Number(item.entry_price ?? 0),
        ltp: Number(item.mark_price ?? 0),
        unrealizedPnl: Number(item.unrealized_pnl ?? 0),
        realizedPnl: Number(item.realized_pnl ?? 0),
        productType: item.product_type || "FUTURES",
        exchange: "DELTA_INDIA",
        updatedAt: Date.now(),
      }));
    } catch {
      return [];
    }
  }

  public async getHoldings(): Promise<Holding[]> {
    return []; // Delta is derivatives-only
  }
}

export class DeltaOrders {
  private client: DeltaClient;

  constructor(client: DeltaClient) {
    this.client = client;
  }

  public async getOrders(): Promise<OrderResult[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "v2/orders",
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.result || [];
      return list.map((item: any) => ({
        success: true,
        clientOrderId: item.client_order_id || String(item.id),
        brokerOrderId: String(item.id),
        status: this.mapDeltaOrderStatus(item.state || item.status),
        message: item.state,
        filledQuantity: Number(item.size ?? 0) - Number(item.unfilled_size ?? 0),
        averageFillPrice: Number(item.avg_fill_price ?? item.limit_price ?? 0),
        timestamp: new Date(item.created_at || Date.now()).getTime(),
      }));
    } catch {
      return [];
    }
  }

  public async placeOrder(order: NormalizedOrder): Promise<OrderResult> {
    const payload = {
      product_id: Number(order.instrumentId) || undefined,
      product_symbol: order.symbol,
      size: order.quantity,
      side: order.side.toLowerCase(),
      order_type: order.orderType.toLowerCase() === "market" ? "market_order" : "limit_order",
      limit_price: order.price ? String(order.price) : undefined,
      client_order_id: order.clientOrderId,
    };

    try {
      const resp = await this.client.request({
        method: "POST",
        path: "v2/orders",
        data: payload,
      });

      const orderId = resp.id || resp.result?.id;
      return {
        success: Boolean(orderId),
        clientOrderId: order.clientOrderId,
        brokerOrderId: orderId ? String(orderId) : undefined,
        status: "SUBMITTED",
        message: "Order placed on Delta Exchange India",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: order.clientOrderId,
        status: "REJECTED",
        message: err.message || "Failed to place order on Delta",
        timestamp: Date.now(),
      };
    }
  }

  public async modifyOrder(orderId: string, changes: OrderModification): Promise<OrderResult> {
    const payload: Record<string, any> = { id: Number(orderId) || orderId };
    if (changes.quantity !== undefined) payload.size = changes.quantity;
    if (changes.price !== undefined) payload.limit_price = String(changes.price);

    try {
      await this.client.request({
        method: "PUT",
        path: "v2/orders",
        data: payload,
      });

      return {
        success: true,
        clientOrderId: `MOD-${orderId}`,
        brokerOrderId: orderId,
        status: "OPEN",
        message: "Order modified on Delta",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: `MOD-${orderId}`,
        brokerOrderId: orderId,
        status: "FAILED",
        message: err.message || "Failed to modify order on Delta",
        timestamp: Date.now(),
      };
    }
  }

  public async cancelOrder(orderId: string): Promise<OrderResult> {
    try {
      await this.client.request({
        method: "DELETE",
        path: "v2/orders",
        data: { id: Number(orderId) || orderId },
      });

      return {
        success: true,
        clientOrderId: `CANCEL-${orderId}`,
        brokerOrderId: orderId,
        status: "CANCELLED",
        message: "Order cancelled on Delta",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: `CANCEL-${orderId}`,
        brokerOrderId: orderId,
        status: "FAILED",
        message: err.message || "Failed to cancel order on Delta",
        timestamp: Date.now(),
      };
    }
  }

  public async getTrades(): Promise<Trade[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "v2/fills",
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.result || [];
      return list.map((item: any) => ({
        tradeId: String(item.id || ""),
        orderId: String(item.order_id || ""),
        clientOrderId: item.client_order_id,
        broker: "delta",
        symbol: item.product_symbol || item.symbol || "UNKNOWN",
        instrumentId: String(item.product_id || ""),
        side: (item.side || "buy").toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: Number(item.size ?? 0),
        price: Number(item.price ?? 0),
        executionTime: new Date(item.created_at || Date.now()).getTime(),
      }));
    } catch {
      return [];
    }
  }

  private mapDeltaOrderStatus(status?: string): OrderResult["status"] {
    const s = String(status || "").toLowerCase();
    if (s === "closed" || s === "filled") return "FILLED";
    if (s === "partially_filled") return "PARTIALLY_FILLED";
    if (s === "cancelled") return "CANCELLED";
    if (s === "rejected") return "REJECTED";
    if (s === "open") return "OPEN";
    return "SUBMITTED";
  }
}
