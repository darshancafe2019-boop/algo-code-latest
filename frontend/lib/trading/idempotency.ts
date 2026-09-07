/**
 * Order Execution Idempotency & Duplicate Prevention Engine
 */
import { NormalizedOrder } from "../brokers/types";

export interface ExecutionLock {
  lockKey: string;
  clientOrderId: string;
  acquiredAt: number;
  expiresAt: number;
}

export class IdempotencyEngine {
  private static instance: IdempotencyEngine | null = null;
  private activeLocks: Map<string, ExecutionLock> = new Map();
  private processedOrders: Map<string, { timestamp: number; result: any }> = new Map();
  private lockTtlMs: number = 10000; // 10s execution lock

  public static getInstance(): IdempotencyEngine {
    if (!IdempotencyEngine.instance) {
      IdempotencyEngine.instance = new IdempotencyEngine();
    }
    return IdempotencyEngine.instance;
  }

  public generateClientOrderId(order: Partial<NormalizedOrder>, prefix: string = "QOS"): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    const sym = (order.symbol || "ORD").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
    return `${prefix}-${order.broker || "BROKER"}-${sym}-${timestamp}-${random}`.toUpperCase();
  }

  public generateIdempotencyKey(order: NormalizedOrder): string {
    return `${order.broker}:${order.symbol}:${order.side}:${order.quantity}:${order.strategyId || "manual"}:${Math.floor(Date.now() / 5000)}`;
  }

  public acquireLock(order: NormalizedOrder): { acquired: boolean; reason?: string } {
    this.cleanExpiredLocks();
    const lockKey = this.generateIdempotencyKey(order);

    if (this.activeLocks.has(lockKey)) {
      return {
        acquired: false,
        reason: `DUPLICATE_ORDER_LOCKED: An identical order for ${order.symbol} (${order.side} ${order.quantity}) is currently in flight.`,
      };
    }

    if (this.processedOrders.has(order.clientOrderId)) {
      return {
        acquired: false,
        reason: `IDEMPOTENT_ORDER_ALREADY_PROCESSED: Client Order ID ${order.clientOrderId} has already been submitted.`,
      };
    }

    const now = Date.now();
    this.activeLocks.set(lockKey, {
      lockKey,
      clientOrderId: order.clientOrderId,
      acquiredAt: now,
      expiresAt: now + this.lockTtlMs,
    });

    return { acquired: true };
  }

  public releaseLock(order: NormalizedOrder, result?: any): void {
    const lockKey = this.generateIdempotencyKey(order);
    this.activeLocks.delete(lockKey);
    if (result) {
      this.processedOrders.set(order.clientOrderId, {
        timestamp: Date.now(),
        result,
      });
    }
  }

  private cleanExpiredLocks(): void {
    const now = Date.now();
    for (const [key, lock] of this.activeLocks.entries()) {
      if (now > lock.expiresAt) {
        this.activeLocks.delete(key);
      }
    }
  }
}

export const idempotencyEngine = IdempotencyEngine.getInstance();
