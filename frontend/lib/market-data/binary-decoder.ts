/**
 * Centralized Live Market Data Engine - DhanHQ V2 Binary Packet Decoder
 * Decodes little-endian binary frames from Dhan live market feed.
 */

import { DHAN_RESPONSE_CODES, DHAN_EXCHANGE_SEGMENTS } from "./constants";
import { instrumentMaster } from "./instrument-master";
import { DepthLevel, MarketDepth } from "./types";

export interface DecodedDhanPacket {
  responseCode: number;
  messageLength: number;
  exchangeSegmentCode: number;
  exchangeSegment: string;
  securityId: string;
  symbol: string;
  timestamp: number;

  ltp?: number;
  lastTradedQuantity?: number;
  lastTradedTime?: number;
  averagePrice?: number;
  volume?: number;
  totalBuyQty?: number;
  totalSellQty?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  previousClose?: number;

  openInterest?: number;
  oiHigh?: number;
  oiLow?: number;

  depth?: MarketDepth;
  disconnectCode?: number;
}

export class DhanBinaryDecoder {
  /**
   * Decodes a raw binary frame (ArrayBuffer or Buffer) into a structured DecodedDhanPacket.
   */
  public static decode(buffer: ArrayBuffer | Uint8Array | any): DecodedDhanPacket | null {
    let uint8Array: Uint8Array;
    if (buffer instanceof Uint8Array) {
      uint8Array = buffer;
    } else if (buffer instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(buffer);
    } else if (buffer && buffer.buffer instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset || 0, buffer.byteLength || buffer.length);
    } else {
      return null;
    }

    if (uint8Array.byteLength < 8) {
      return null;
    }

    const view = new DataView(
      uint8Array.buffer,
      uint8Array.byteOffset,
      uint8Array.byteLength
    );

    // 1. Unpack Header (<BHBI - 8 bytes)
    const responseCode = view.getUint8(0);
    const messageLength = view.getUint16(1, true); // Little-Endian
    const exchangeSegmentCode = view.getUint8(3);
    const securityIdInt = view.getUint32(4, true); // Little-Endian
    const securityId = securityIdInt.toString();

    const exchangeSegment = DHAN_EXCHANGE_SEGMENTS[exchangeSegmentCode] || "NSE_EQ";
    const instRecord = instrumentMaster.resolveBySecurityId(securityId, exchangeSegment as any);
    const symbol = instRecord ? instRecord.symbol : `DHAN_${securityId}`;

    const packet: DecodedDhanPacket = {
      responseCode,
      messageLength,
      exchangeSegmentCode,
      exchangeSegment,
      securityId,
      symbol,
      timestamp: Date.now(),
    };

    try {
      // ── 1. Index Packet (Response Code 1, 16 bytes) ─────────────────────────
      if (responseCode === DHAN_RESPONSE_CODES.INDEX && uint8Array.byteLength >= 16) {
        packet.ltp = parseFloat(view.getFloat32(8, true).toFixed(2));
        packet.lastTradedTime = view.getUint32(12, true);
        if (uint8Array.byteLength >= 20) {
          packet.previousClose = parseFloat(view.getFloat32(16, true).toFixed(2));
        }
        return packet;
      }

      // ── 2. Ticker Packet (Response Code 2, 16 bytes) ─────────────────────────
      if (responseCode === DHAN_RESPONSE_CODES.TICKER && uint8Array.byteLength >= 16) {
        packet.ltp = parseFloat(view.getFloat32(8, true).toFixed(2));
        packet.lastTradedTime = view.getUint32(12, true);
        return packet;
      }

      // ── 3. Quote Packet (Response Code 4, 50 bytes) ──────────────────────────
      if (responseCode === DHAN_RESPONSE_CODES.QUOTE && uint8Array.byteLength >= 50) {
        packet.ltp = parseFloat(view.getFloat32(8, true).toFixed(2));
        packet.lastTradedQuantity = view.getUint16(12, true);
        packet.lastTradedTime = view.getUint32(14, true);
        packet.averagePrice = parseFloat(view.getFloat32(18, true).toFixed(2));
        packet.volume = view.getUint32(22, true);
        packet.totalSellQty = view.getUint32(26, true);
        packet.totalBuyQty = view.getUint32(30, true);
        packet.open = parseFloat(view.getFloat32(34, true).toFixed(2));
        packet.close = parseFloat(view.getFloat32(38, true).toFixed(2));
        packet.high = parseFloat(view.getFloat32(42, true).toFixed(2));
        packet.low = parseFloat(view.getFloat32(46, true).toFixed(2));
        packet.previousClose = packet.close;
        return packet;
      }

      // ── 4. Open Interest Packet (Response Code 5 or legacy 8, 12 bytes) ──────
      if (
        (responseCode === DHAN_RESPONSE_CODES.OPEN_INTEREST || responseCode === 5) &&
        uint8Array.byteLength >= 12 &&
        uint8Array.byteLength < 50
      ) {
        packet.openInterest = view.getUint32(8, true);
        return packet;
      }

      // ── 5. Prev Close Packet (Response Code 6 or legacy 51, 16 bytes) ─────────
      if (
        (responseCode === DHAN_RESPONSE_CODES.PREV_CLOSE || responseCode === 51) &&
        uint8Array.byteLength >= 16 &&
        uint8Array.byteLength < 50
      ) {
        packet.previousClose = parseFloat(view.getFloat32(8, true).toFixed(2));
        if (uint8Array.byteLength >= 16) {
          packet.openInterest = view.getUint32(12, true);
        }
        return packet;
      }

      // ── 6. Market Status Packet (Response Code 7, 10-12 bytes) ───────────────
      if (responseCode === DHAN_RESPONSE_CODES.MARKET_STATUS && uint8Array.byteLength >= 10) {
        return packet;
      }

      // ── 7. Full Depth Packet (Response Code 8 or legacy 6, >= 50 bytes) ──────
      if (
        (responseCode === DHAN_RESPONSE_CODES.FULL_DEPTH || responseCode === 8 || responseCode === 6) &&
        uint8Array.byteLength >= 50
      ) {
        // Read quote base
        packet.ltp = parseFloat(view.getFloat32(8, true).toFixed(2));
        packet.lastTradedQuantity = view.getUint16(12, true);
        packet.lastTradedTime = view.getUint32(14, true);
        packet.averagePrice = parseFloat(view.getFloat32(18, true).toFixed(2));
        packet.volume = view.getUint32(22, true);
        packet.totalSellQty = view.getUint32(26, true);
        packet.totalBuyQty = view.getUint32(30, true);
        packet.open = parseFloat(view.getFloat32(34, true).toFixed(2));
        packet.close = parseFloat(view.getFloat32(38, true).toFixed(2));
        packet.high = parseFloat(view.getFloat32(42, true).toFixed(2));
        packet.low = parseFloat(view.getFloat32(46, true).toFixed(2));
        packet.previousClose = packet.close;

        // Decode 5-level Bids & Asks if bytes available
        let offset = 50;
        if (uint8Array.byteLength >= offset + 100) {
          const bids: DepthLevel[] = [];
          for (let i = 0; i < 5; i++) {
            const qty = view.getUint32(offset, true);
            const price = parseFloat(view.getFloat32(offset + 4, true).toFixed(2));
            const orders = view.getUint16(offset + 8, true);
            if (price > 0 || qty > 0) {
              bids.push({ price, quantity: qty, ordersCount: orders });
            }
            offset += 10;
          }

          const asks: DepthLevel[] = [];
          for (let i = 0; i < 5; i++) {
            const qty = view.getUint32(offset, true);
            const price = parseFloat(view.getFloat32(offset + 4, true).toFixed(2));
            const orders = view.getUint16(offset + 8, true);
            if (price > 0 || qty > 0) {
              asks.push({ price, quantity: qty, ordersCount: orders });
            }
            offset += 10;
          }

          const bestBid = bids[0]?.price || 0;
          const bestAsk = asks[0]?.price || 0;
          const spread = bestAsk > 0 && bestBid > 0 ? parseFloat((bestAsk - bestBid).toFixed(2)) : 0;
          const spreadPct = bestBid > 0 ? parseFloat(((spread / bestBid) * 100).toFixed(4)) : 0;

          const totalBidQty = bids.reduce((sum, b) => sum + b.quantity, 0);
          const totalAskQty = asks.reduce((sum, a) => sum + a.quantity, 0);
          const totalVol = totalBidQty + totalAskQty;
          const imbalanceRatio = totalVol > 0 ? parseFloat(((totalBidQty - totalAskQty) / totalVol).toFixed(4)) : 0;

          packet.depth = {
            bids,
            asks,
            spread,
            spreadPct,
            totalBidQty,
            totalAskQty,
            imbalanceRatio,
            timestamp: Date.now(),
          };
        }

        // Decode Open Interest if present at end of full packet
        if (uint8Array.byteLength >= offset + 12) {
          packet.openInterest = view.getUint32(offset, true);
          packet.oiHigh = view.getUint32(offset + 4, true);
          packet.oiLow = view.getUint32(offset + 8, true);
        }

        return packet;
      }

      // ── 8. Disconnect Packet (Response Code 50, 10 bytes) ─────────────────────
      if (responseCode === DHAN_RESPONSE_CODES.DISCONNECT && uint8Array.byteLength >= 10) {
        packet.disconnectCode = view.getUint16(8, true);
        return packet;
      }
    } catch (err) {
      console.warn(`[DhanBinaryDecoder] Malformed binary frame (code ${responseCode}):`, err);
      return null;
    }

    return packet;
  }
}
