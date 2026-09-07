/**
 * Unified Order Execution & Lifecycle Manager
 */
import { NormalizedOrder, OrderResult, BrokerName } from "../brokers/types";
import { brokerManager } from "../brokers/broker-manager";
import { idempotencyEngine } from "./idempotency";
import { riskEngine } from "./risk-engine";

export class UnifiedOrderManager {
  private static instance: UnifiedOrderManager | null = null;
  private orders: Map<string, NormalizedOrder & { result?: OrderResult; updatedAt: number }> = new Map();

  public static getInstance(): UnifiedOrderManager {
    if (!UnifiedOrderManager.instance) {
      UnifiedOrderManager.instance = new UnifiedOrderManager();
    }
    return UnifiedOrderManager.instance;
  }

  public async submitOrder(orderParams: Partial<NormalizedOrder>, brokerOverride?: BrokerName): Promise<OrderResult> {
    const broker = brokerOverride || orderParams.broker || brokerManager.getDefaultBroker();
    const clientOrderId = orderParams.clientOrderId || idempotencyEngine.generateClientOrderId(orderParams);

    const fullOrder: NormalizedOrder = {
      clientOrderId,
      broker,
      symbol: orderParams.symbol || "UNKNOWN",
      instrumentId: orderParams.instrumentId || orderParams.symbol || "",
      side: orderParams.side || "BUY",
      quantity: Number(orderParams.quantity || 1),
      orderType: orderParams.orderType || "MARKET",
      price: orderParams.price,
      triggerPrice: orderParams.triggerPrice,
      timeInForce: orderParams.timeInForce || "DAY",
      productType: orderParams.productType || "CNC",
      strategyId: orderParams.strategyId || "manual",
      tag: orderParams.tag || "QUANT_OS",
    };

    // 1. Pre-Trade Risk Checks
    const riskCheck = riskEngine.validatePreTrade(fullOrder);
    if (!riskCheck.passed) {
      return {
        success: false,
        clientOrderId,
        status: "REJECTED",
        errorCode: riskCheck.code,
        message: riskCheck.blockedReason,
        timestamp: Date.now(),
      };
    }

    // 2. Acquire Idempotency Lock
    const lock = idempotencyEngine.acquireLock(fullOrder);
    if (!lock.acquired) {
      return {
        success: false,
        clientOrderId,
        status: "REJECTED",
        errorCode: "DUPLICATE_ORDER_LOCKED",
        message: lock.reason || "Duplicate order blocked by execution lock.",
        timestamp: Date.now(),
      };
    }

    // 3. Route to Broker Adapter
    try {
      const adapter = brokerManager.getAdapter(broker);
      const result = await adapter.placeOrder(fullOrder);

      // 4. Release Lock & Save Order State
      idempotencyEngine.releaseLock(fullOrder, result);
      this.orders.set(clientOrderId, {
        ...fullOrder,
        result,
        updatedAt: Date.now(),
      });

      return result;
    } catch (err: any) {
      idempotencyEngine.releaseLock(fullOrder);
      const errorResult: OrderResult = {
        success: false,
        clientOrderId,
        status: "FAILED",
        message: err.message || "Broker order submission failed",
        timestamp: Date.now(),
      };
      this.orders.set(clientOrderId, {
        ...fullOrder,
        result: errorResult,
        updatedAt: Date.now(),
      });
      return errorResult;
    }
  }

  public getOrder(clientOrderId: string) {
    return this.orders.get(clientOrderId);
  }

  public getAllOrders() {
    return Array.from(this.orders.values());
  }
}

export const orderManager = UnifiedOrderManager.getInstance();
