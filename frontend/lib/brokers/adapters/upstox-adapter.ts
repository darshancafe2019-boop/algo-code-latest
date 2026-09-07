/**
 * Upstox Broker Adapter Implementation
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
import { UpstoxClient } from "../upstox/client";
import { UpstoxAuth } from "../upstox/auth";
import { UpstoxFunds, UpstoxPositions } from "../upstox/funds";
import { UpstoxOrders } from "../upstox/orders";
import { UpstoxInstruments } from "../upstox/instruments";
import { UpstoxWebSocket } from "../upstox/websocket";

export class UpstoxAdapter implements BrokerAdapter {
  public readonly broker: BrokerName = "upstox";
  public readonly capabilities: BrokerCapability = {
    broker: "upstox",
    brokerName: "Upstox Pro API v2/v3",
    supportsOptions: true,
    supportsFutures: true,
    supportsEquities: true,
    supportsHoldings: true,
    supportsOrderModification: true,
    supportsWebSocket: true,
    supportsOptionChain: true,
    supportsSandbox: false,
    supportsLiveOrders: true,
    requiresStaticIp: false,
  };

  private client: UpstoxClient;
  private auth: UpstoxAuth;
  private funds: UpstoxFunds;
  private positions: UpstoxPositions;
  private orders: UpstoxOrders;
  private instruments: UpstoxInstruments;
  private ws: UpstoxWebSocket;

  constructor(accessToken?: string) {
    this.client = new UpstoxClient(accessToken);
    this.auth = new UpstoxAuth(this.client);
    this.funds = new UpstoxFunds(this.client);
    this.positions = new UpstoxPositions(this.client);
    this.orders = new UpstoxOrders(this.client);
    this.instruments = new UpstoxInstruments(this.client);
    this.ws = new UpstoxWebSocket(this.client);
  }

  public async connect(): Promise<void> {
    await this.ws.connect();
  }

  public async disconnect(): Promise<void> {
    this.ws.disconnect();
  }

  public isAuthenticated(): boolean {
    return this.client.hasToken();
  }

  public getProfile(): Promise<AccountProfile> {
    return this.auth.getProfile();
  }

  public getFunds(): Promise<AccountFunds> {
    return this.funds.getFunds();
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
