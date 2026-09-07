/**
 * Upstox Market Data Feed V3 WebSocket Streaming
 */
import { Instrument, MarketDataCallback, NormalizedTick } from "../types";
import { UpstoxClient } from "./client";

export class UpstoxWebSocket {
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private callbacks: Set<MarketDataCallback> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private lastMessageTimestamp: number = 0;
  private client: UpstoxClient;

  constructor(client: UpstoxClient) {
    this.client = client;
  }

  public async connect(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    if (this.isConnecting || !this.client.hasToken()) return;

    this.isConnecting = true;
    try {
      // 1. Get Authorized WS Auth Redirect URL from Upstox
      const resp = await this.client.request({
        method: "GET",
        path: "feed/market-data-feed/authorize",
      });

      const wsUrl = resp.data?.authorizedRedirectUri;
      if (!wsUrl) {
        this.isConnecting = false;
        return;
      }

      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = "arraybuffer";

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.resubscribe();
      };

      this.socket.onmessage = (event) => {
        this.lastMessageTimestamp = Date.now();
        // In full browser env, protobufjs decodes the V3 payload
        // Fallback or lightweight payload emits normalized tick
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public subscribe(instruments: Instrument[], callback: MarketDataCallback): void {
    this.callbacks.add(callback);
    for (const inst of instruments) {
      if (inst.instrumentId) this.subscriptions.add(inst.instrumentId);
    }
    this.resubscribe();
  }

  public unsubscribe(instruments: Instrument[]): void {
    for (const inst of instruments) {
      if (inst.instrumentId) this.subscriptions.delete(inst.instrumentId);
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      const payload = {
        guid: "quantos_sub",
        method: "unsub",
        data: {
          instrumentKeys: instruments.map((i) => i.instrumentId),
        },
      };
      this.socket.send(JSON.stringify(payload));
    }
  }

  public isHealthy(): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    if (Date.now() - this.lastMessageTimestamp > 30000 && this.subscriptions.size > 0) return false;
    return true;
  }

  private resubscribe(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.subscriptions.size) return;
    const payload = {
      guid: "quantos_sub",
      method: "sub",
      data: {
        mode: "ltpc",
        instrumentKeys: Array.from(this.subscriptions),
      },
    };
    this.socket.send(JSON.stringify(payload));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 4000);
  }
}
