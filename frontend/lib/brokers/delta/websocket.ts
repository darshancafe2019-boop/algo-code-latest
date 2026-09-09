/**
 * Delta Exchange India WebSocket Manager
 * Production-grade public & private WebSocket client.
 * Connects to wss://public-socket.india.delta.exchange using standard channels:
 * 'ticker', 'ob_l1', 'ob_l2', 'trades', 'mark_price', 'spot_price', 'funding_rate'
 */
import { Instrument, MarketDataCallback, NormalizedTick } from "../types";
import { DeltaClient } from "./client";

export class DeltaWebSocket {
  private wsUrl: string = "wss://public-socket.india.delta.exchange";
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private callbacks: Set<MarketDataCallback> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private lastMessageTimestamp: number = 0;
  private retryCount: number = 0;
  private client: DeltaClient;

  constructor(client: DeltaClient) {
    this.client = client;
  }

  public async connect(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.retryCount = 0;
        this.startHeartbeat();
        this.resubscribe();
      };

      this.socket.onmessage = (event) => {
        this.lastMessageTimestamp = Date.now();
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return;

          if (data.type === "ticker" || data.type === "v2/ticker") {
            const sym = data.symbol || data.s;
            const ltp = Number(data.mark_price ?? data.close ?? data.last_price ?? data.m ?? 0);
            if (sym && ltp > 0) {
              const tick: NormalizedTick = {
                broker: "delta",
                instrumentId: sym,
                symbol: sym,
                exchange: "DELTA_INDIA",
                ltp: ltp,
                timestamp: Date.now(),
              };
              this.callbacks.forEach((cb) => cb(tick));
            }
          }
        } catch {}
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
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
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }

  public subscribe(instruments: Instrument[], callback: MarketDataCallback): void {
    this.callbacks.add(callback);
    for (const inst of instruments) {
      this.subscriptions.add(inst.symbol.toUpperCase().trim());
    }
    this.resubscribe();
  }

  public unsubscribe(instruments: Instrument[]): void {
    const toRemove: string[] = [];
    for (const inst of instruments) {
      const sym = inst.symbol.toUpperCase().trim();
      this.subscriptions.delete(sym);
      toRemove.push(sym);
    }
    if (this.socket?.readyState === WebSocket.OPEN && toRemove.length > 0) {
      const payload = {
        type: "unsubscribe",
        payload: {
          channels: [
            {
              name: "ticker",
              symbols: toRemove,
            },
          ],
        },
      };
      this.socket.send(JSON.stringify(payload));
    }
  }

  public isHealthy(): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    if (Date.now() - this.lastMessageTimestamp > 35000 && this.subscriptions.size > 0) return false;
    return true;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "ping" }));
        } catch {}
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private resubscribe(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.subscriptions.size) return;
    const payload = {
      type: "subscribe",
      payload: {
        channels: [
          {
            name: "ticker",
            symbols: Array.from(this.subscriptions),
          },
        ],
      },
    };
    this.socket.send(JSON.stringify(payload));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.retryCount++;
    const delay = Math.min(30000, Math.pow(2, Math.min(this.retryCount, 5)) * 1000 + Math.random() * 1000);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
