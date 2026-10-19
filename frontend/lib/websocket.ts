import { useBotStore } from "./store/bot-store";
import { getGatewayWsUrl } from "@/lib/config/gatewayConfig";

export interface WsMessage {
  type: string;
  timestamp: string;
  bot_id?: string;
  sequence: number;
  data: any;
}

type WsListener = (msg: WsMessage) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Set<WsListener> = new Set();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private retryDelay = 2000;
  private isExplicitDisconnect = false;

  public connect(): void {
    if (typeof window === "undefined") return;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.isExplicitDisconnect = false;
    try {
      const wsUrl = getGatewayWsUrl();

      if (!wsUrl) {
        return;
      }

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.retryDelay = 2000;
        try {
          useBotStore.getState().setWsConnected(true);
        } catch (_) {}
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.notifyListeners(msg);
        } catch (e) {}
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        try {
          useBotStore.getState().setWsConnected(false);
        } catch (_) {}
        if (!this.isExplicitDisconnect && this.listeners.size > 0) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        // Handled in onclose
      };
    } catch (e) {
      if (this.listeners.size > 0) {
        this.scheduleReconnect();
      }
    }
  }

  public disconnect(): void {
    this.isExplicitDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      const s = this.socket;
      this.socket = null;
      try {
        s.close();
      } catch (_) {}
    }
    try {
      useBotStore.getState().setWsConnected(false);
    } catch (_) {}
  }

  public subscribe(listener: WsListener): () => void {
    this.listeners.add(listener);
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeBot(botId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ action: "subscribe_bot", bot_id: botId }));
      } catch (_) {}
    }
  }

  private notifyListeners(msg: WsMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error("Error in WS message listener", err);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.retryDelay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: "ping", timestamp: new Date().toISOString() }));
        } catch (_) {}
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

export const wsClient = new WebSocketClient();
