/**
 * Delta Exchange India WebSocket Manager
 * Production-grade public & private WebSocket client.
 * Connects to wss://public-socket.india.delta.exchange using standard channels:
 * 'ticker', 'ob_l1', 'ob_l2', 'trades', 'mark_price', 'spot_price', 'funding_rate'
 */
import { Instrument, MarketDataCallback, NormalizedTick } from "../types";
import { DeltaClient } from "./client";

export type DeltaOptionTickCallback = (update: {
  symbol: string;
  productId?: number | null;
  markPrice?: number | null;
  spotPrice?: number | null;
  ltp?: number | null;
  bid?: number | null;
  ask?: number | null;
  bidSize?: number | null;
  askSize?: number | null;
  iv?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  rho?: number | null;
  openInterest?: number | null;
  volume?: number | null;
  timestamp: number;
}) => void;

export class DeltaWebSocket {
  private wsUrl: string = "wss://public-socket.india.delta.exchange";
  private socket: WebSocket | null = null;
  private subscriptions: Set<string> = new Set();
  private chainSubscriptions: Set<string> = new Set(); // e.g. "BTC-180926"
  private callbacks: Set<MarketDataCallback> = new Set();
  private optionCallbacks: Set<DeltaOptionTickCallback> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private lastMessageTimestamp: number = 0;
  private retryCount: number = 0;
  private client: DeltaClient;

  constructor(client?: DeltaClient) {
    this.client = client || new DeltaClient();
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
            const spotPrice = data.sp ? Number(data.sp) : undefined;
            const batch = Array.isArray(data.d) ? data.d : [data];

            for (const item of batch) {
              const sym = item.symbol || item.s;
              if (!sym) continue;

              const mark = item.mark_price ?? item.m ?? item.close ?? item.last_price;
              const ltp = mark !== undefined && mark !== null ? Number(mark) : null;
              const quotes = item.quotes || {};
              const greeks = item.greeks || {};

              const bid = quotes.best_bid !== undefined ? Number(quotes.best_bid) : (item.best_bid ? Number(item.best_bid) : null);
              const ask = quotes.best_ask !== undefined ? Number(quotes.best_ask) : (item.best_ask ? Number(item.best_ask) : null);
              const bidSize = quotes.bid_size !== undefined ? Number(quotes.bid_size) : null;
              const askSize = quotes.ask_size !== undefined ? Number(quotes.ask_size) : null;

              const rawIv = quotes.mark_iv ?? item.mark_vol ?? quotes.ask_iv;
              const iv = rawIv !== undefined && rawIv !== null ? (Number(rawIv) < 5.0 ? Number(rawIv) * 100 : Number(rawIv)) : null;

              const oi = item.oi ?? item.open_interest;
              const vol = item.volume ?? item.v;

              if (ltp && ltp > 0) {
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

              if (this.optionCallbacks.size > 0) {
                const optUpdate = {
                  symbol: sym,
                  productId: item.product_id ?? item.id ?? null,
                  markPrice: ltp,
                  spotPrice: spotPrice ?? (item.spot_price ? Number(item.spot_price) : null),
                  ltp: ltp,
                  bid,
                  ask,
                  bidSize,
                  askSize,
                  iv,
                  delta: greeks.delta !== undefined ? Number(greeks.delta) : null,
                  gamma: greeks.gamma !== undefined ? Number(greeks.gamma) : null,
                  theta: greeks.theta !== undefined ? Number(greeks.theta) : null,
                  vega: greeks.vega !== undefined ? Number(greeks.vega) : null,
                  rho: greeks.rho !== undefined ? Number(greeks.rho) : null,
                  openInterest: oi !== undefined ? Number(oi) : null,
                  volume: vol !== undefined ? Number(vol) : null,
                  timestamp: Date.now(),
                };
                this.optionCallbacks.forEach((cb) => cb(optUpdate));
              }
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

  public subscribeOptionChain(chainSymbol: string, callback: DeltaOptionTickCallback): () => void {
    const cleanSym = chainSymbol.toUpperCase().trim();
    this.chainSubscriptions.add(cleanSym);
    this.optionCallbacks.add(callback);
    this.resubscribe();

    return () => {
      this.chainSubscriptions.delete(cleanSym);
      this.optionCallbacks.delete(callback);
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({
            type: "unsubscribe",
            payload: {
              channels: [{ name: "ticker", symbols: [cleanSym] }],
            },
          })
        );
      }
    };
  }

  public isHealthy(): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    if (Date.now() - this.lastMessageTimestamp > 35000 && (this.subscriptions.size > 0 || this.chainSubscriptions.size > 0)) return false;
    return true;
  }

  public getStatus(): "LIVE" | "CONNECTING" | "DISCONNECTED" {
    if (this.socket?.readyState === WebSocket.OPEN) return "LIVE";
    if (this.isConnecting || this.socket?.readyState === WebSocket.CONNECTING) return "CONNECTING";
    return "DISCONNECTED";
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
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const allSymbols = Array.from(new Set([...Array.from(this.subscriptions), ...Array.from(this.chainSubscriptions)]));
    if (allSymbols.length === 0) return;

    const payload = {
      type: "subscribe",
      payload: {
        channels: [
          {
            name: "ticker",
            symbols: allSymbols,
          },
          {
            name: "ob_l1",
            symbols: allSymbols,
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

export const deltaWebSocket = new DeltaWebSocket();
