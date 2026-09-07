/**
 * Delta Exchange India Broker Adapter Implementation
 */
import {
  BrokerAdapter,
  BrokerCapability,
  BrokerName,
  AccountProfile,
  AccountFunds,
  Position,
  Holding,
  OrderResult,
  Trade,
  Instrument,
  MarketPrice,
  OHLC,
  MarketDataCallback,
  NormalizedOrder,
  OrderModification,
} from "../types";
import { DeltaClient } from "../delta/client";
import { DeltaAuth, DeltaWallet } from "../delta/auth";
import { DeltaPositions, DeltaOrders } from "../delta/orders";
import { DeltaInstruments } from "../delta/instruments";
import { DeltaWebSocket } from "../delta/websocket";

export class DeltaAdapter implements BrokerAdapter {
  public readonly broker: BrokerName = "delta";
  public readonly capabilities: BrokerCapability = {
    broker: "delta",
    brokerName: "Delta Exchange India",
    supportsOptions: true,
    supportsFutures: true,
    supportsEquities: false,
    supportsHoldings: false,
    supportsOrderModification: true,
    supportsWebSocket: true,
    supportsOptionChain: true,
    supportsSandbox: false,
    supportsLiveOrders: true,
    requiresStaticIp: false,
  };

  private client: DeltaClient;
  private auth: DeltaAuth;
  private wallet: DeltaWallet;
  private positions: DeltaPositions;
  private orders: DeltaOrders;
  private instruments: DeltaInstruments;
  private ws: DeltaWebSocket;

  constructor(apiKey?: string, apiSecret?: string) {
    this.client = new DeltaClient(apiKey, apiSecret);
    this.auth = new DeltaAuth(this.client);
    this.wallet = new DeltaWallet(this.client);
    this.positions = new DeltaPositions(this.client);
    this.orders = new DeltaOrders(this.client);
    this.instruments = new DeltaInstruments(this.client);
    this.ws = new DeltaWebSocket(this.client);
  }

  public async connect(): Promise<void> {
    await this.ws.connect();
  }

  public async disconnect(): Promise<void> {
    this.ws.disconnect();
  }

  public isAuthenticated(): boolean {
    return this.client.hasCredentials();
  }

  public getProfile(): Promise<AccountProfile> {
    return this.auth.getProfile();
  }

  public getFunds(): Promise<AccountFunds> {
    return this.wallet.getFunds();
  }

  public getPositions(): Promise<Position[]> {
    return this.positions.getPositions();
  }

  public getHoldings(): Promise<Holding[]> {
    return this.positions.getHoldings();
  }

  public getOrders(): Promise<OrderResult[]> {
    return this.orders.getOrders();
  }

  public getTrades(): Promise<Trade[]> {
    return this.orders.getTrades();
  }

  public getLTP(instruments: Instrument[]): Promise<MarketPrice[]> {
    return this.instruments.getLTP(instruments);
  }

  public getOHLC(instrument: Instrument, timeframe?: string, count?: number): Promise<OHLC[]> {
    return this.instruments.getOHLC(instrument, timeframe, count);
  }

  public async subscribeMarketData(instruments: Instrument[], callback: MarketDataCallback): Promise<void> {
    this.ws.subscribe(instruments, callback);
  }

  public async unsubscribeMarketData(instruments: Instrument[]): Promise<void> {
    this.ws.unsubscribe(instruments);
  }

  public placeOrder(order: NormalizedOrder): Promise<OrderResult> {
    return this.orders.placeOrder(order);
  }

  public modifyOrder(orderId: string, changes: OrderModification): Promise<OrderResult> {
    return this.orders.modifyOrder(orderId, changes);
  }

  public cancelOrder(orderId: string): Promise<OrderResult> {
    return this.orders.cancelOrder(orderId);
  }
}
