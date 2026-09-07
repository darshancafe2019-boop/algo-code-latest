/**
 * Central Multi-Broker Manager & Registry
 */
import { BrokerAdapter, BrokerName, BrokerCapability } from "./types";
import { DhanAdapter } from "./adapters/dhan-adapter";
import { UpstoxAdapter } from "./adapters/upstox-adapter";
import { DeltaAdapter } from "./adapters/delta-adapter";

export class BrokerManager {
  private static instance: BrokerManager | null = null;
  private adapters: Map<BrokerName, BrokerAdapter> = new Map();
  private defaultBroker: BrokerName = "dhan";

  private constructor() {
    this.registerAdapter(new DhanAdapter());
    this.registerAdapter(new UpstoxAdapter());
    this.registerAdapter(new DeltaAdapter());
  }

  public static getInstance(): BrokerManager {
    if (!BrokerManager.instance) {
      BrokerManager.instance = new BrokerManager();
    }
    return BrokerManager.instance;
  }

  public registerAdapter(adapter: BrokerAdapter): void {
    this.adapters.set(adapter.broker, adapter);
  }

  public getAdapter(broker: BrokerName = this.defaultBroker): BrokerAdapter {
    const adapter = this.adapters.get(broker);
    if (!adapter) {
      throw new Error(`Broker '${broker}' is not registered in BrokerManager.`);
    }
    return adapter;
  }

  public getAllAdapters(): BrokerAdapter[] {
    return Array.from(this.adapters.values());
  }

  public getCapabilities(broker: BrokerName): BrokerCapability {
    return this.getAdapter(broker).capabilities;
  }

  public setDefaultBroker(broker: BrokerName): void {
    if (!this.adapters.has(broker)) {
      throw new Error(`Cannot set default broker to unregistered broker '${broker}'.`);
    }
    this.defaultBroker = broker;
  }

  public getDefaultBroker(): BrokerName {
    return this.defaultBroker;
  }
}

export const brokerManager = BrokerManager.getInstance();
