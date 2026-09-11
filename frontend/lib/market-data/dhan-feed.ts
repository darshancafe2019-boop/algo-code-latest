/**
 * Centralized Live Market Data Engine - DhanHQ V2 Live Market Feed
 * Authenticated binary feed connection with little-endian struct decoding.
 */

import { marketDataConfig, hasDhanCredentials } from "./config";
import { DHAN_REQUEST_CODES, EXCHANGE_SEGMENT_TO_DHAN_CODE } from "./constants";
import { DhanBinaryDecoder } from "./binary-decoder";
import { MarketDataNormalizer } from "./normalizer";
import { marketState } from "./market-state";
import { subscriptionManager } from "./subscription-manager";
import { ManagedWebSocket } from "./websocket-manager";
import { BrokerProvider, ConnectionState, InstrumentMasterRecord } from "./types";

export class DhanLiveFeed {
  private static instance: DhanLiveFeed | null = null;
  private sockets: ManagedWebSocket[] = [];
  private state: ConnectionState = "DISCONNECTED";

  private constructor() {
    this.initSockets();
    this.bindSubscriptionTransport();
  }

  public static getInstance(): DhanLiveFeed {
    if (!DhanLiveFeed.instance) {
      DhanLiveFeed.instance = new DhanLiveFeed();
    }
    return DhanLiveFeed.instance;
  }

  private initSockets() {
    // Dhan allows up to 5 concurrent WebSocket feeds
    for (let i = 0; i < 5; i++) {
      const socket = new ManagedWebSocket({
        id: i,
        name: `DhanFeed-${i}`,
        url: this.buildFeedUrl(),
        binaryType: "arraybuffer",
        onOpen: (ws) => {
          this.state = "LIVE";
          subscriptionManager.restoreSubscriptionsForConnection(i);
        },
        onBinaryMessage: (data) => {
          this.handleBinaryFrame(data);
        },
        onStateChange: (state) => {
          this.state = state;
        },
      });
      this.sockets.push(socket);
    }
  }

  private buildFeedUrl(): string {
    const { clientId, accessToken, feedUrl } = marketDataConfig.dhan;
    if (!clientId || !accessToken) return feedUrl;
    return `${feedUrl}?version=2&token=${accessToken}&clientId=${clientId}&authType=2`;
  }

  private bindSubscriptionTransport() {
    subscriptionManager.setTransportCallbacks(
      (provider, connectionId, records, feedMode) => {
        if (provider === "dhan") {
          this.sendSubscriptionPacket(connectionId, records, feedMode);
        }
      },
      (provider, connectionId, records) => {
        if (provider === "dhan") {
          this.sendUnsubscriptionPacket(connectionId, records);
        }
      }
    );
  }

  public connect(): void {
    if (!hasDhanCredentials()) {
      console.info("[DhanLiveFeed] Dhan credentials not configured. Live Dhan feed idle.");
      this.state = "DISCONNECTED";
      return;
    }

    // Connect primary socket
    const primarySocket = this.sockets[0];
    if (primarySocket) {
      primarySocket.setUrl(this.buildFeedUrl());
      primarySocket.connect();
    }
  }

  public disconnect(): void {
    this.sockets.forEach((s) => s.disconnect());
    this.state = "DISCONNECTED";
  }

  private handleBinaryFrame(data: ArrayBuffer | Uint8Array) {
    const decoded = DhanBinaryDecoder.decode(data);
    if (!decoded) return;

    const tick = MarketDataNormalizer.fromDhanPacket(decoded);
    marketState.updateTick(tick);
  }

  /**
   * Transmits a DhanHQ V2 JSON/Binary subscription message.
   */
  public sendSubscriptionPacket(
    connectionId: number,
    records: InstrumentMasterRecord[],
    feedMode: number = DHAN_REQUEST_CODES.SUBSCRIBE_FULL
  ): void {
    const socket = this.sockets[connectionId] || this.sockets[0];
    if (!socket) return;

    // Build Dhan JSON subscription payload
    const instruments = records.map((r) => ({
      ExchangeSegment: EXCHANGE_SEGMENT_TO_DHAN_CODE[r.exchange] || 1,
      SecurityId: r.securityId,
    }));

    const payload = JSON.stringify({
      RequestCode: feedMode,
      InstrumentCount: instruments.length,
      InstrumentList: instruments,
    });

    socket.send(payload);
  }

  public sendUnsubscriptionPacket(connectionId: number, records: InstrumentMasterRecord[]): void {
    const socket = this.sockets[connectionId] || this.sockets[0];
    if (!socket) return;

    const instruments = records.map((r) => ({
      ExchangeSegment: EXCHANGE_SEGMENT_TO_DHAN_CODE[r.exchange] || 1,
      SecurityId: r.securityId,
    }));

    const payload = JSON.stringify({
      RequestCode: DHAN_REQUEST_CODES.UNSUBSCRIBE,
      InstrumentCount: instruments.length,
      InstrumentList: instruments,
    });

    socket.send(payload);
  }

  public getState(): ConnectionState {
    return this.state;
  }
}

export const dhanLiveFeed = DhanLiveFeed.getInstance();
export const dhanFeed = dhanLiveFeed;

