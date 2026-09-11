/**
 * Centralized Live Market Data Engine - WebSocket Connection Manager
 * Production-grade resilient connection pool with watchdog & automatic backoff.
 */

import { DHAN_WS_LIMITS } from "./constants";
import { ConnectionState } from "./types";

export interface ManagedSocketConfig {
  id: number;
  url: string;
  name: string;
  binaryType?: BinaryType;
  onOpen?: (socket: WebSocket) => void;
  onBinaryMessage?: (data: ArrayBuffer | Uint8Array) => void;
  onTextMessage?: (text: string) => void;
  onError?: (err: Event) => void;
  onClose?: (code: number, reason: string) => void;
  onStateChange?: (state: ConnectionState) => void;
}

export class ManagedWebSocket {
  public readonly id: number;
  public readonly name: string;
  private url: string;
  private socket: WebSocket | null = null;
  private state: ConnectionState = "DISCONNECTED";
  private reconnectAttempt: number = 0;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private watchdogTimer: any = null;
  private lastMessageTime: number = 0;
  private isExplicitlyClosed: boolean = false;

  private config: ManagedSocketConfig;

  constructor(config: ManagedSocketConfig) {
    this.id = config.id;
    this.name = config.name;
    this.url = config.url;
    this.config = config;
  }

  public setUrl(newUrl: string): void {
    this.url = newUrl;
  }

  public connect(): void {
    if (typeof window === "undefined" && typeof global.WebSocket === "undefined") {
      // In server-side Node.js without native WebSocket, ensure graceful fallback
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setState("CONNECTING");

    try {
      this.socket = new WebSocket(this.url);
      this.socket.binaryType = this.config.binaryType || "arraybuffer";

      this.socket.onopen = () => {
        this.reconnectAttempt = 0;
        this.lastMessageTime = Date.now();
        this.setState("CONNECTED");
        this.startHeartbeat();
        this.startWatchdog();

        if (this.config.onOpen && this.socket) {
          this.config.onOpen(this.socket);
        }
      };

      this.socket.onmessage = (event) => {
        this.lastMessageTime = Date.now();
        if (this.state !== "LIVE") {
          this.setState("LIVE");
        }

        if (event.data instanceof ArrayBuffer && this.config.onBinaryMessage) {
          this.config.onBinaryMessage(event.data);
        } else if (typeof event.data === "string" && this.config.onTextMessage) {
          this.config.onTextMessage(event.data);
        }
      };

      this.socket.onerror = (err) => {
        this.setState("ERROR");
        if (this.config.onError) this.config.onError(err);
      };

      this.socket.onclose = (event) => {
        this.stopHeartbeat();
        this.stopWatchdog();
        this.setState("DISCONNECTED");
        if (this.config.onClose) this.config.onClose(event.code, event.reason);

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      console.warn(`[ManagedWebSocket ${this.name}] Connection init failed:`, e);
      this.setState("ERROR");
      this.scheduleReconnect();
    }
  }

  public send(data: string | ArrayBuffer | Uint8Array): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.socket.send(data);
      return true;
    } catch (e) {
      console.warn(`[ManagedWebSocket ${this.name}] Send failed:`, e);
      return false;
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    this.stopWatchdog();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.socket) {
      try {
        this.socket.close(1000, "Clean Teardown");
      } catch {}
      this.socket = null;
    }
    this.setState("DISCONNECTED");
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed || this.reconnectTimer) return;

    this.setState("RECONNECTING");
    const delays = DHAN_WS_LIMITS.RECONNECT_DELAYS_MS;
    const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];
    const jitter = Math.random() * 500;
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay + jitter);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send ping or heartbeat frame if needed
      }
    }, DHAN_WS_LIMITS.HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (this.state === "LIVE" || this.state === "CONNECTED") {
        const silenceTime = Date.now() - this.lastMessageTime;
        if (silenceTime > DHAN_WS_LIMITS.STALE_SILENCE_TIMEOUT_MS) {
          console.warn(
            `[ManagedWebSocket ${this.name}] Silent stall detected (${silenceTime}ms silence). Triggering reconnect.`
          );
          this.setState("STALE");
          this.socket?.close(4000, "Watchdog Timeout");
        }
      }
    }, 5000);
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      if (this.config.onStateChange) {
        this.config.onStateChange(newState);
      }
    }
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public getLastMessageTime(): number {
    return this.lastMessageTime;
  }
}
