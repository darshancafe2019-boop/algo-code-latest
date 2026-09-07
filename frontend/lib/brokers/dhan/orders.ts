/**
 * Dhan HQ API v2 Orders & Trades Execution Service
 */
import { DhanClient } from "./client";
import { NormalizedOrder, OrderModification, OrderResult, Trade } from "../types";

export class DhanOrders {
  private client: DhanClient;

  constructor(client: DhanClient) {
    this.client = client;
  }

  public async getOrders(): Promise<OrderResult[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "orders",
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.data || [];
      return list.map((item: any) => ({
        success: true,
        clientOrderId: item.correlationId || item.clientOrderId || `DHAN-${item.orderId}`,
        brokerOrderId: String(item.orderId || ""),
        status: this.mapDhanOrderStatus(item.orderStatus || item.status),
        message: item.orderStatus,
        filledQuantity: Number(item.tradedQuantity ?? item.filledQty ?? 0),
        averageFillPrice: Number(item.tradedPrice ?? item.averagePrice ?? 0),
        timestamp: new Date(item.createTime || item.exchangeTime || Date.now()).getTime(),
      }));
    } catch {
      return [];
    }
  }

  public async placeOrder(order: NormalizedOrder): Promise<OrderResult> {
    const payload = {
      dhanClientId: process.env.DHAN_CLIENT_ID || "",
      correlationId: order.clientOrderId,
      transactionType: order.side.toUpperCase(),
      exchangeSegment: order.symbol.includes("OPT") || order.symbol.includes("FUT") ? "NSE_FNO" : "NSE_EQ",
      productType: order.productType || "CNC",
      orderType: order.orderType.toUpperCase(),
      validity: order.timeInForce || "DAY",
      tradingSymbol: order.symbol,
      securityId: order.instrumentId,
      quantity: order.quantity,
      price: order.price || 0,
      triggerPrice: order.triggerPrice || 0,
      afterMarketOrder: false,
    };

    try {
      const resp = await this.client.request({
        method: "POST",
        path: "orders",
        data: payload,
      });

      const orderId = resp.orderId || resp.data?.orderId || resp.brokerOrderId;
      const status = (resp.orderStatus || resp.status || "SUBMITTED").toUpperCase();

      return {
        success: Boolean(orderId),
        clientOrderId: order.clientOrderId,
        brokerOrderId: orderId ? String(orderId) : undefined,
        status: this.mapDhanOrderStatus(status),
        message: resp.message || `Order submitted to Dhan (${status})`,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: order.clientOrderId,
        status: "REJECTED",
        errorCode: err.dhanErrorCode || "ORDER_ERROR",
        message: err.message || "Failed to place order on Dhan",
        timestamp: Date.now(),
      };
    }
  }

  public async modifyOrder(orderId: string, changes: OrderModification): Promise<OrderResult> {
    const payload: Record<string, any> = {
      orderId,
    };
    if (changes.quantity !== undefined) payload.quantity = changes.quantity;
    if (changes.price !== undefined) payload.price = changes.price;
    if (changes.triggerPrice !== undefined) payload.triggerPrice = changes.triggerPrice;
    if (changes.orderType !== undefined) payload.orderType = changes.orderType;

    try {
      const resp = await this.client.request({
        method: "PUT",
        path: `orders/${orderId}`,
        data: payload,
      });

      return {
        success: true,
        clientOrderId: `MOD-${orderId}`,
        brokerOrderId: orderId,
        status: "OPEN",
        message: "Order successfully modified on Dhan",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: `MOD-${orderId}`,
        brokerOrderId: orderId,
        status: "FAILED",
        message: err.message || "Failed to modify order on Dhan",
        timestamp: Date.now(),
      };
    }
  }

  public async cancelOrder(orderId: string): Promise<OrderResult> {
    try {
      await this.client.request({
        method: "DELETE",
        path: `orders/${orderId}`,
      });

      return {
        success: true,
        clientOrderId: `CANCEL-${orderId}`,
        brokerOrderId: orderId,
        status: "CANCELLED",
        message: "Order cancelled on Dhan",
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        clientOrderId: `CANCEL-${orderId}`,
        brokerOrderId: orderId,
        status: "FAILED",
        message: err.message || "Failed to cancel order on Dhan",
        timestamp: Date.now(),
      };
    }
  }

  public async getTrades(): Promise<Trade[]> {
    try {
      const resp = await this.client.request({
        method: "GET",
        path: "trades",
      });

      const list: any[] = Array.isArray(resp) ? resp : resp?.data || [];
      return list.map((item: any) => ({
        tradeId: String(item.tradeId || item.exchangeTradeId || ""),
        orderId: String(item.orderId || ""),
        clientOrderId: item.correlationId,
        broker: "dhan",
        symbol: item.tradingSymbol || item.symbol || "UNKNOWN",
        instrumentId: String(item.securityId || ""),
        side: (item.transactionType || item.side || "BUY").toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: Number(item.tradedQuantity ?? item.quantity ?? 0),
        price: Number(item.tradedPrice ?? item.price ?? 0),
        executionTime: new Date(item.exchangeTime || item.tradeTime || Date.now()).getTime(),
      }));
    } catch {
      return [];
    }
  }

  private mapDhanOrderStatus(status?: string): OrderResult["status"] {
    const s = String(status || "").toUpperCase();
    if (s.includes("TRANSIT") || s.includes("PENDING")) return "SUBMITTED";
    if (s.includes("TRADED") || s.includes("FILLED")) return "FILLED";
    if (s.includes("PARTIAL")) return "PARTIALLY_FILLED";
    if (s.includes("CANCEL")) return "CANCELLED";
    if (s.includes("REJECT")) return "REJECTED";
    if (s.includes("OPEN")) return "OPEN";
    return "SUBMITTED";
  }
}
