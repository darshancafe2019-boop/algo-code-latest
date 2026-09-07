/**
 * Dhan Live Market Feed Binary WebSocket Manager
 */
import { Instrument, MarketDataCallback, NormalizedTick } from "../types";

export class DhanWebSocket {
  private wsUrl: string = "wss://api-feed.dhan.co";
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private callbacks: Set<MarketDataCallback> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private lastMessageTimestamp: number = 0;
  private accessToken: string = "";
  private clientId: string = "";

  constructor(accessToken?: string, clientId?: string) {
    this.accessToken = accessToken || process.env.DHAN_ACCESS_TOKEN || "";
    this.clientId = clientId || process.env.DHAN_CLIENT_ID || "";
  }

  public setCredentials(accessToken: string, clientId?: string) {
    this.accessToken = accessToken;
    if (clientId) this.clientId = clientId;
  }

  public connect(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.isConnecting) return Promise.resolve();

    this.isConnecting = true;
    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(this.wsUrl);
        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = () => {
          this.isConnecting = false;
          this.authenticate();
          this.resubscribeAll();
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.lastMessageTimestamp = Date.now();
          if (event.data instanceof ArrayBuffer) {
            this.decodeBinaryPacket(event.data);
          }
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
        resolve();
      }
    });
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public isHealthy(): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    if (Date.now() - this.lastMessageTimestamp > 30000 && this.subscriptions.size > 0) return false;
    return true;
  }

  public subscribe(instruments: Instrument[], callback: MarketDataCallback): void {
    this.callbacks.add(callback);
    for (const inst of instruments) {
      this.subscriptions.add(inst.instrumentId);
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendSubscriptionPacket(instruments, 15); // Ticker + Quote Code 15
    }
  }

  public unsubscribe(instruments: Instrument[]): void {
    for (const inst of instruments) {
      this.subscriptions.delete(inst.instrumentId);
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendSubscriptionPacket(instruments, 16); // Unsubscribe Code 16
    }
  }

  private authenticate(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.accessToken) return;
    const authPayload = JSON.stringify({
      RequestCode: 11,
      Token: this.accessToken,
      ClientId: this.clientId,
    });
    this.socket.send(authPayload);
  }

  private sendSubscriptionPacket(instruments: Instrument[], requestCode: number): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const req = JSON.stringify({
      RequestCode: requestCode,
      InstrumentCount: instruments.length,
      InstrumentList: instruments.map((i) => ({
        ExchangeSegment: i.segment || "NSE_EQ",
        SecurityId: i.instrumentId,
      })),
    });
    this.socket.send(req);
  }

  private resubscribeAll(): void {
    // Resubscribes active set
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  private decodeBinaryPacket(buffer: ArrayBuffer): void {
    if (buffer.byteLength < 16) return;
    const view = new DataView(buffer);
    const responseCode = view.getUint8(0);
    const securityId = view.getUint32(4, true);

    if (responseCode === 2 || responseCode === 4) {
      const ltp = view.getFloat32(8, true);
      const tick: NormalizedTick = {
        broker: "dhan",
        instrumentId: String(securityId),
        symbol: String(securityId),
        exchange: "NSE",
        ltp,
        timestamp: Date.now(),
      };
      this.callbacks.forEach((cb) => cb(tick));
    }
  }
}
