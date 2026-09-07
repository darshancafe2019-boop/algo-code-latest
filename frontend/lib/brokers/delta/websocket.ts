/**
 * Delta Exchange India WebSocket Manager (Public Tickers & Private Authenticated Channels)
 */
import { Instrument, MarketDataCallback, NormalizedTick } from "../types";
import { DeltaClient } from "./client";

export class DeltaWebSocket {
  private wsUrl: string = "wss://socket.india.delta.exchange";
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private callbacks: Set<MarketDataCallback> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private lastMessageTimestamp: number = 0;
  private client: DeltaClient;

  constructor(client: DeltaClient) {
    this.client = client;
  }

  public async connect(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.authenticatePrivateChannels();
        this.resubscribe();
      };

      this.socket.onmessage = (event) => {
        this.lastMessageTimestamp = Date.now();
        try {
          const data = JSON.parse(event.data);
          if (data.type === "v2/ticker" && data.symbol) {
            const tick: NormalizedTick = {
              broker: "delta",
              instrumentId: data.symbol,
              symbol: data.symbol,
              exchange: "DELTA_INDIA",
              ltp: Number(data.mark_price ?? data.close ?? 0),
              timestamp: Date.now(),
            };
            this.callbacks.forEach((cb) => cb(tick));
          }
        } catch {}
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
      this.subscriptions.add(inst.symbol);
    }
    this.resubscribe();
  }

  public unsubscribe(instruments: Instrument[]): void {
    for (const inst of instruments) {
      this.subscriptions.delete(inst.symbol);
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      const payload = {
        type: "unsubscribe",
        payload: {
          channels: [
            {
              name: "v2/ticker",
              symbols: instruments.map((i) => i.symbol),
            },
          ],
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

  private authenticatePrivateChannels(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.client.hasCredentials()) return;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = this.client.generateSignature("GET", timestamp, "/live");

    const authPayload = {
      type: "auth",
      payload: {
        "api-key": process.env.DELTA_API_KEY || "",
        signature,
        timestamp,
      },
    };
    this.socket.send(JSON.stringify(authPayload));
  }

  private resubscribe(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.subscriptions.size) return;
    const payload = {
      type: "subscribe",
      payload: {
        channels: [
          {
            name: "v2/ticker",
            symbols: Array.from(this.subscriptions),
          },
        ],
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
