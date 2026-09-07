/**
 * Dhan Broker Adapter Implementation
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
import { DhanClient } from "../dhan/client";
import { DhanAuth } from "../dhan/auth";
import { DhanFunds } from "../dhan/funds";
import { DhanPositions } from "../dhan/positions";
import { DhanOrders } from "../dhan/orders";
import { DhanInstruments } from "../dhan/instruments";
import { DhanWebSocket } from "../dhan/websocket";

export class DhanAdapter implements BrokerAdapter {
  public readonly broker: BrokerName = "dhan";
  public readonly capabilities: BrokerCapability = {
    broker: "dhan",
    brokerName: "Dhan HQ API v2",
    supportsOptions: true,
    supportsFutures: true,
    supportsEquities: true,
    supportsHoldings: true,
    supportsOrderModification: true,
    supportsWebSocket: true,
    supportsOptionChain: true,
    supportsSandbox: true,
    supportsLiveOrders: true,
    requiresStaticIp: true,
  };

  private client: DhanClient;
  private auth: DhanAuth;
  private funds: DhanFunds;
  private positions: DhanPositions;
  private orders: DhanOrders;
  private instruments: DhanInstruments;
  private ws: DhanWebSocket;

  constructor(accessToken?: string, clientId?: string, baseUrl?: string) {
    this.client = new DhanClient(accessToken, clientId, baseUrl);
    this.auth = new DhanAuth(this.client);
    this.funds = new DhanFunds(this.client);
    this.positions = new DhanPositions(this.client);
    this.orders = new DhanOrders(this.client);
    this.instruments = new DhanInstruments(this.client);
    this.ws = new DhanWebSocket(accessToken, clientId);
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
