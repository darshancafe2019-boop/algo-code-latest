/**
 * Upstox API v2 Order Routing & Trade Execution Service
 */
import { UpstoxClient } from "./client";
import { NormalizedOrder, OrderModification, OrderResult, Trade } from "../types";

export class UpstoxOrders {
  private client: UpstoxClient;

  constructor(client: UpstoxClient) {
    this.client = client;
  }

  public async getOrders(): Promise<OrderResult[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "order/retrieve-all",
      });

      const list = resp.data || [];
      return list.map((item: any) => ({
        success: true,
        clientOrderId: item.tag || item.order_id,
        brokerOrderId: item.order_id,
        status: this.mapUpstoxOrderStatus(item.status),
        message: item.status_message || item.status,
        filledQuantity: Number(item.filled_quantity ?? 0),
        averageFillPrice: Number(item.average_price ?? 0),
        timestamp: new Date(item.order_timestamp || Date.now()).getTime(),
      }));
    } catch {
      return [];
    }
  }

  public async placeOrder(order: NormalizedOrder): Promise<OrderResult> {
    const payload = {
      quantity: order.quantity,
      product: order.productType || "D",
      validity: order.timeInForce || "DAY",
      price: order.price || 0,
      tag: order.clientOrderId,
      instrument_token: order.instrumentId,
      order_type: order.orderType.toUpperCase(),
      transaction_type: order.side.toUpperCase(),
      disclosed_quantity: 0,
      trigger_price: order.triggerPrice || 0,
      is_amo: false,
    };

    try {
      const resp = await this.client.request({
        method: "POST",
        path: "order/place",
        data: payload,
      });

      const orderId = resp.data?.order_id;
      return {
        success: Boolean(orderId),
        clientOrderId: order.clientOrderId,
        brokerOrderId: orderId,
        status: "SUBMITTED",
        message: "Order placed on Upstox",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: order.clientOrderId,
        status: "REJECTED",
        message: err.message || "Failed to place order on Upstox",
        timestamp: Date.now(),
      };
    }
  }

  public async modifyOrder(orderId: string, changes: OrderModification): Promise<OrderResult> {
    const payload: Record<string, any> = {
      order_id: orderId,
    };
    if (changes.quantity !== undefined) payload.quantity = changes.quantity;
    if (changes.price !== undefined) payload.price = changes.price;
    if (changes.triggerPrice !== undefined) payload.trigger_price = changes.triggerPrice;
    if (changes.orderType !== undefined) payload.order_type = changes.orderType;

    try {
      await this.client.request({
        method: "PUT",
        path: "order/modify",
        data: payload,
      });

      return {
        success: true,
        clientOrderId: `MOD-${orderId}`,
        brokerOrderId: orderId,
        status: "OPEN",
        message: "Order modified on Upstox",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: `MOD-${orderId}`,
        brokerOrderId: orderId,
        status: "FAILED",
        message: err.message || "Failed to modify order on Upstox",
        timestamp: Date.now(),
      };
    }
  }

  public async cancelOrder(orderId: string): Promise<OrderResult> {
    try {
      await this.client.request({
        method: "DELETE",
        path: `order/cancel?order_id=${orderId}`,
      });

      return {
        success: true,
        clientOrderId: `CANCEL-${orderId}`,
        brokerOrderId: orderId,
        status: "CANCELLED",
        message: "Order cancelled on Upstox",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: `CANCEL-${orderId}`,
        brokerOrderId: orderId,
        status: "FAILED",
        message: err.message || "Failed to cancel order on Upstox",
        timestamp: Date.now(),
      };
    }
  }

  public async getTrades(): Promise<Trade[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "order/trades/get-trades-for-day",
      });

      const list = resp.data || [];
      return list.map((item: any) => ({
        tradeId: item.trade_id,
        orderId: item.order_id,
        clientOrderId: item.tag,
        broker: "upstox",
        symbol: item.trading_symbol || "UNKNOWN",
        instrumentId: item.instrument_token || "",
        side: (item.transaction_type || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: Number(item.quantity ?? 0),
        price: Number(item.average_price ?? item.price ?? 0),
        executionTime: new Date(item.trade_timestamp || Date.now()).getTime(),
      }));
    } catch {
      return [];
    }
  }

  private mapUpstoxOrderStatus(status?: string): OrderResult["status"] {
    const s = String(status || "").toLowerCase();
    if (s.includes("complete") || s.includes("traded")) return "FILLED";
    if (s.includes("partially_filled")) return "PARTIALLY_FILLED";
    if (s.includes("cancelled")) return "CANCELLED";
    if (s.includes("rejected")) return "REJECTED";
    if (s.includes("open") || s.includes("after market order req received")) return "OPEN";
    return "SUBMITTED";
  }
}
