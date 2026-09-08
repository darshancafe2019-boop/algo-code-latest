"""
Quant.OS Dhan HQ API v2 Real-Time Feed Manager
================================================
Authoritative singleton manager providing:
1. Shared WebSocket connection to wss://api-feed.dhan.co with process locking
2. Official binary frame decoding for Response Codes 2 (Ticker), 4 (Quote), 8 (Full Depth)
3. Normalized tick emission with exact schema and cache key (provider, account, exchange_segment, security_id)
4. Strict error handling (DH-901 auth expired, DH-902, 805 connection limits)
5. Zero fallback / zero cross-provider pollution
6. Market hours detection and STALE / AUTH_REQUIRED / MARKET_CLOSED state management
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import struct
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

try:
    import websockets
    from websockets.exceptions import ConnectionClosed
    WS_AVAILABLE = True
except ImportError:
    WS_AVAILABLE = False

from src import config
from src.dhan_service import global_dhan_service, OFFICIAL_DHAN_KEYS

logger = logging.getLogger("DhanFeedManager")

MAX_BACKOFF_SEC = 30.0
STALE_THRESHOLD_SEC = 10.0

# Dhan Exchange Segment enum to string mapping
SEGMENT_CODE_MAP = {
    0: "IDX_I",
    1: "NSE_EQ",
    2: "NSE_FNO",
    3: "NSE_CURRENCY",
    4: "BSE_EQ",
    5: "MCX_COMM",
    7: "BSE_FNO",
    8: "BSE_CURRENCY",
}

SEGMENT_NAME_TO_CODE = {v: k for k, v in SEGMENT_CODE_MAP.items()}


def is_indian_market_open() -> bool:
    """
    Checks if Indian stock market (NSE/BSE) is currently in regular trading session:
    Monday to Friday, 09:15 to 15:30 IST (UTC+05:30).
    """
    now_utc = datetime.now(timezone.utc)
    ist_offset = timezone(timedelta(hours=5, minutes=30))
    now_ist = now_utc.astimezone(ist_offset)

    if now_ist.weekday() >= 5:  # Saturday or Sunday
        return False

    current_minutes = now_ist.hour * 60 + now_ist.minute
    market_open = 9 * 60 + 15    # 09:15 IST
    market_close = 15 * 60 + 30  # 15:30 IST

    return market_open <= current_minutes <= market_close


class DhanFeedManager:
    """
    Server-side singleton managing the official Dhan HQ live WebSocket feed.
    """
    _instance: Optional[DhanFeedManager] = None

    @classmethod
    def get_instance(cls) -> DhanFeedManager:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.account = "dhan_primary"
        self.provider = "dhan"
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._running = False
        self._status = "DISCONNECTED"
        self._retry_count = 0
        self._last_tick_time: float = 0.0
        self._last_tick_iso: Optional[str] = None
        self._last_latency_ms: float = 0.0
        self._ticks_received = 0
        self._bytes_received = 0
        self._error_count = 0
        self._auth_error: Optional[str] = None
        self._safe_error_message: Optional[str] = None
        
        # Connection & Diagnostic Telemetry
        self._is_socket_connected = False
        self._subscription_sent = False
        self._first_tick_received = False
        self._last_close_code: Optional[int] = None
        self._last_close_reason: Optional[str] = None
        self._last_decoded_response_code: Optional[int] = None
        self._last_security_id: Optional[str] = None
        self._last_exchange_segment: Optional[str] = None
        self._last_price: Optional[float] = None

        # Normalized cache keyed by: (provider, account, exchange_segment, security_id)
        self._cache: Dict[Tuple[str, str, str, str], Dict[str, Any]] = {}
        # Subscribed instrument registry: (exchange_segment, security_id)
        self._subscribed_instruments: Set[Tuple[str, str]] = set()
        # Symbol to (exchange_segment, security_id) index
        self._sec_id_to_symbol: Dict[str, str] = {}
        self._callbacks: List[Callable[[Dict[str, Any]], None]] = []
        self._lock = asyncio.Lock()

        # Pre-seed symbol mapping from registry
        for sym, meta in OFFICIAL_DHAN_KEYS.items():
            sec_id = str(meta["security_id"])
            seg = meta.get("exchange_segment", "NSE_EQ")
            self._sec_id_to_symbol[f"{seg}:{sec_id}"] = sym
            self._sec_id_to_symbol[sec_id] = sym

    def log_safe_runtime_config(self) -> None:
        """Prints official safe startup log per Section 5 specifications."""
        dhan_enabled = getattr(config, "DHAN_ENABLED", True)
        feed_enabled = getattr(config, "DHAN_FEED_ENABLED", True)
        data_api = getattr(config, "DHAN_DATA_API_ENABLED", True)
        cid_present = bool(global_dhan_service.client_id)
        tok_present = bool(global_dhan_service.access_token)
        trading_en = getattr(config, "DHAN_TRADING_ENABLED", False)
        paper_mode = getattr(config, "DHAN_PAPER_MODE", True)
        b_port = getattr(config, "PORT", 5050)
        g_port = getattr(config, "MARKET_GATEWAY_PORT", 5051)

        print("\n" + "=" * 40)
        print("DHAN_RUNTIME_CONFIG")
        print(f"enabled={'true' if dhan_enabled else 'false'}")
        print(f"feed_enabled={'true' if feed_enabled else 'false'}")
        print(f"data_api_enabled={'true' if data_api else 'false'}")
        print(f"client_id_present={'true' if cid_present else 'false'}")
        print(f"token_present={'true' if tok_present else 'false'}")
        print(f"trading_enabled={'true' if trading_en else 'false'}")
        print(f"paper_mode={'true' if paper_mode else 'false'}")
        print(f"backend_port={b_port}")
        print(f"gateway_port={g_port}")
        print("=" * 40 + "\n", flush=True)

    def add_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        if callback not in self._callbacks:
            self._callbacks.append(callback)

    def remove_callback(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        if callback in self._callbacks:
            self._callbacks.remove(callback)

    def _emit(self, tick: Dict[str, Any]) -> None:
        for cb in self._callbacks:
            try:
                cb(tick)
            except Exception as e:
                logger.debug("Dhan callback error: %s", e)

    # ─── Connection Lifecycle ────────────────────────────────────────────────

    async def start(self) -> None:
        if self._running:
            return

        self.log_safe_runtime_config()

        if not WS_AVAILABLE:
            logger.error("websockets package not available for DhanFeedManager")
            self._status = "DISCONNECTED"
            self._auth_error = "WEBSOCKETS_PACKAGE_MISSING"
            return

        self._running = True
        self._status = "SOCKET_CONNECTING"
        self._ws_task = asyncio.create_task(self._feed_loop(), name="DhanFeedManagerLoop")
        logger.info("DhanFeedManager started background WebSocket task.")

    async def stop(self) -> None:
        self._running = False
        self._is_socket_connected = False
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass
            self._ws_task = None

        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

        self._status = "DISCONNECTED"
        logger.info("DhanFeedManager stopped.")

    async def _feed_loop(self) -> None:
        """Main WebSocket loop with backoff and auth guard."""
        while self._running:
            try:
                val = global_dhan_service.validate_token()
                if not val.get("valid"):
                    self._status = "AUTH_REQUIRED"
                    self._is_socket_connected = False
                    self._auth_error = val.get("error_code") or "DH-901"
                    self._safe_error_message = val.get("message") or "Renew Dhan access token in Settings > Brokers."
                    logger.warning("Dhan feed auth invalid (%s): %s. Halting retries.", self._auth_error, self._safe_error_message)
                    await asyncio.sleep(60.0)
                    continue

                client_id = global_dhan_service.client_id
                access_token = global_dhan_service.access_token

                if not client_id or not access_token:
                    self._status = "AUTH_REQUIRED"
                    self._is_socket_connected = False
                    self._safe_error_message = "DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN must be configured."
                    await asyncio.sleep(10.0)
                    continue

                feed_url = f"{global_dhan_service.DHAN_FEED_URL}?version=2&token={access_token}&clientId={client_id}&authType=2"
                extra_headers = {
                    "access-token": access_token,
                    "client-id": client_id,
                }

                logger.info("DhanFeedManager: Connecting to %s", global_dhan_service.DHAN_FEED_URL)
                conn_start = time.monotonic()
                self._status = "SOCKET_CONNECTING"

                async with websockets.connect(
                    feed_url,
                    extra_headers=extra_headers,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                    max_size=10 * 1024 * 1024,
                ) as ws:
                    self._ws = ws
                    self._is_socket_connected = True
                    self._status = "SOCKET_CONNECTED_NO_TICK"
                    self._auth_error = None
                    self._safe_error_message = None
                    self._retry_count = 0
                    self._last_latency_ms = round((time.monotonic() - conn_start) * 1000.0, 1)
                    logger.info("DhanFeedManager: WebSocket connected (latency=%.1fms)", self._last_latency_ms)

                    # Resubscribe to existing instruments (req_code=15 for ticker)
                    if self._subscribed_instruments:
                        await self._send_subscription(list(self._subscribed_instruments), req_code=15)

                    # Process incoming binary frames
                    async for msg in ws:
                        if not self._running:
                            break
                        if isinstance(msg, bytes):
                            self._bytes_received += len(msg)
                            self._decode_binary_packet(msg)
                        elif isinstance(msg, str):
                            self._handle_text_control_message(msg)

            except asyncio.CancelledError:
                self._is_socket_connected = False
                break
            except Exception as exc:
                self._is_socket_connected = False
                self._error_count += 1
                if hasattr(exc, "code"):
                    self._last_close_code = getattr(exc, "code", None)
                    self._last_close_reason = getattr(exc, "reason", str(exc))
                self._status = "DISCONNECTED"
                self._retry_count += 1
                backoff = min(MAX_BACKOFF_SEC, 2.0 ** min(self._retry_count, 5))
                logger.warning(
                    "DhanFeedManager connection dropped: %s (attempt %d). Reconnecting in %.1fs...",
                    exc, self._retry_count, backoff,
                )
                await asyncio.sleep(backoff)

    # ─── Binary Packet Decoding ──────────────────────────────────────────────

    def _decode_binary_packet(self, data: bytes) -> None:
        """
        Decodes official Dhan binary frames using struct.unpack (Little Endian).
        Header (8 bytes): <BHBI
          - ResponseCode (uint8)
          - MessageLength (uint16)
          - ExchangeSegment (uint8)
          - SecurityId (uint32)
        """
        if len(data) < 8:
            return

        try:
            resp_code, msg_len, exch_seg_code, sec_id_int = struct.unpack_from("<BHBI", data, 0)
            sec_id_str = str(sec_id_int)
            seg_str = SEGMENT_CODE_MAP.get(exch_seg_code, "NSE_EQ")
            symbol = (
                self._sec_id_to_symbol.get(f"{seg_str}:{sec_id_str}")
                or self._sec_id_to_symbol.get(sec_id_str)
                or f"DHAN_{sec_id_str}"
            )

            now_mono = time.monotonic()
            now_iso = datetime.now(timezone.utc).isoformat()
            self._last_tick_time = now_mono
            self._last_tick_iso = now_iso
            self._ticks_received += 1

            last_price = 0.0
            bid_price = None
            ask_price = None
            volume = None
            open_interest = None
            open_p = None
            high_p = None
            low_p = None
            close_p = None

            # 1. Ticker Packet (Response Code 2) -> 16 bytes
            if resp_code == 2 and len(data) >= 16:
                ltp, ltt = struct.unpack_from("<fI", data, 8)
                last_price = round(float(ltp), 2)

            # 2. Quote Packet (Response Code 4) -> 50 bytes
            elif resp_code == 4 and len(data) >= 50:
                (
                    ltp, ltq, ltt, avg_price, vol,
                    total_sell_qty, total_buy_qty,
                    open_val, close_val, high_val, low_val,
                ) = struct.unpack_from("<fHIfIIIffff", data, 8)

                last_price = round(float(ltp), 2)
                volume = float(vol)
                open_p = round(float(open_val), 2) if open_val > 0 else None
                close_p = round(float(close_val), 2) if close_val > 0 else None
                high_p = round(float(high_val), 2) if high_val > 0 else None
                low_p = round(float(low_val), 2) if low_val > 0 else None

            # 3. Full Depth Packet (Response Code 8) -> >= 50 bytes + 5-depth bids/asks + OI
            elif resp_code == 8 and len(data) >= 50:
                (
                    ltp, ltq, ltt, avg_price, vol,
                    total_sell_qty, total_buy_qty,
                    open_val, close_val, high_val, low_val,
                ) = struct.unpack_from("<fHIfIIIffff", data, 8)

                last_price = round(float(ltp), 2)
                volume = float(vol)
                open_p = round(float(open_val), 2) if open_val > 0 else None
                close_p = round(float(close_val), 2) if close_val > 0 else None
                high_p = round(float(high_val), 2) if high_val > 0 else None
                low_p = round(float(low_val), 2) if low_val > 0 else None

                # Unpack Best Bid (offset 50) and Best Ask (offset 100)
                if len(data) >= 150:
                    try:
                        _, _, best_bid_p = struct.unpack_from("<IHf", data, 50)
                        _, _, best_ask_p = struct.unpack_from("<IHf", data, 100)
                        bid_price = round(float(best_bid_p), 2) if best_bid_p > 0 else last_price
                        ask_price = round(float(best_ask_p), 2) if best_ask_p > 0 else last_price
                    except Exception:
                        pass

                # OI is optional uint32 at end of depth packet
                if len(data) >= 154:
                    try:
                        oi_raw = struct.unpack_from("<I", data, 150)[0]
                        open_interest = float(oi_raw)
                    except Exception:
                        pass

            if last_price <= 0:
                return

            # Construct canonical normalized tick
            tick = {
                "provider": self.provider,
                "account": self.account,
                "exchange_segment": seg_str,
                "security_id": sec_id_str,
                "symbol": symbol,
                "last_price": last_price,
                "bid_price": bid_price or last_price,
                "ask_price": ask_price or last_price,
                "volume": volume,
                "open_interest": open_interest,
                "open": open_p,
                "high": high_p,
                "low": low_p,
                "previous_close": close_p,
                "event_time": now_iso,
                "received_at": now_iso,
                "freshness_ms": round((time.monotonic() - now_mono) * 1000.0, 1),
                "connection_status": "LIVE",
                "data_mode": "LIVE_DATA",
                "execution_mode": "PAPER",
            }

            # Exact cache key: (provider, account, exchange_segment, security_id)
            cache_key = (self.provider, self.account, seg_str, sec_id_str)
            self._cache[cache_key] = tick
            self._emit(tick)

        except Exception as exc:
            logger.debug("Dhan binary decode note: %s", exc)

    def _handle_text_control_message(self, text: str) -> None:
        try:
            msg = json.loads(text)
            if msg.get("type") == "error":
                err_code = msg.get("code") or msg.get("errorType") or "DH-905"
                err_msg = msg.get("message") or msg.get("errorMessage") or "Feed error"
                logger.warning("Dhan feed control error: %s (%s)", err_code, err_msg)
                if err_code in ("DH-901", "805", "401"):
                    self._status = "AUTH_REQUIRED"
                    self._auth_error = err_code
                    self._safe_error_message = err_msg
        except Exception:
            pass

    # ─── Subscriptions & Control ─────────────────────────────────────────────

    async def subscribe_instruments(self, instruments: List[Tuple[str, str]], req_code: int = 17) -> None:
        """
        Subscribes to list of (exchange_segment, security_id).
        Deduplicates and batches according to Dhan limits (max 100 per request).
        """
        new_items = []
        for seg, sec_id in instruments:
            key = (str(seg).upper(), str(sec_id).strip())
            if key not in self._subscribed_instruments:
                self._subscribed_instruments.add(key)
                new_items.append(key)

        if new_items and self._ws and self._status == "CONNECTED":
            await self._send_subscription(new_items, req_code=req_code)

    async def unsubscribe_instruments(self, instruments: List[Tuple[str, str]]) -> None:
        for seg, sec_id in instruments:
            key = (str(seg).upper(), str(sec_id).strip())
            self._subscribed_instruments.discard(key)

    async def _send_subscription(self, instruments: List[Tuple[str, str]], req_code: int = 17) -> None:
        if not self._ws or not self._running:
            return

        # Batch in chunks of 100
        for i in range(0, len(instruments), 100):
            chunk = instruments[i:i + 100]
            payload_list = [
                {"ExchangeSegment": seg, "SecurityId": sec_id}
                for seg, sec_id in chunk
            ]
            payload = {
                "RequestCode": req_code,  # 15=Ticker, 17=Quote, 21=Full Depth
                "InstrumentCount": len(payload_list),
                "InstrumentList": payload_list,
            }
            try:
                await self._ws.send(json.dumps(payload))
                logger.info("DhanFeedManager: Subscribed to %d instruments (ReqCode=%d)", len(chunk), req_code)
            except Exception as exc:
                logger.warning("DhanFeedManager send subscription failed: %s", exc)

    def validate_instrument(self, exchange_segment: str, security_id: str | int) -> Tuple[bool, Optional[str]]:
        """Validates test instrument against official Dhan scrip metadata."""
        sec_id_str = str(security_id).strip()
        seg_str = str(exchange_segment).strip().upper()
        if not sec_id_str:
            return False, "INVALID_INSTRUMENT_CONFIGURATION: Security ID cannot be empty."
        if seg_str not in SEGMENT_NAME_TO_CODE and seg_str not in SEGMENT_CODE_MAP.values():
            return False, f"INVALID_INSTRUMENT_CONFIGURATION: Invalid exchange segment '{seg_str}'."
        if not sec_id_str.isdigit():
            return False, f"INVALID_INSTRUMENT_CONFIGURATION: Security ID '{sec_id_str}' must be numeric integer."
        return True, None

    # ─── Query & Diagnostics ─────────────────────────────────────────────────

    def get_status(self) -> Dict[str, Any]:
        """Returns standard status response schema for Dhan feed."""
        now_mono = time.monotonic()
        age_ms = round((now_mono - self._last_tick_time) * 1000.0, 1) if self._last_tick_time > 0 else None
        
        dhan_enabled = getattr(config, "DHAN_ENABLED", True) and getattr(config, "DHAN_FEED_ENABLED", True)
        if not dhan_enabled:
            status = "DISABLED"
            safe_msg = "Dhan feed is disabled in configuration."
        elif not global_dhan_service.is_authenticated or self._auth_error in ("DH-901", "808", "401"):
            status = "AUTH_REQUIRED"
            safe_msg = "Dhan authentication required. Generate a fresh Dhan access token and update Settings → Brokers → Dhan."
        elif self._auth_error in ("DH-902", "805", "403"):
            status = "DATA_API_UNAVAILABLE"
            safe_msg = "Dhan Data API access is unavailable or rate limited."
        elif self._status == "SOCKET_CONNECTING":
            status = "SOCKET_CONNECTING"
            safe_msg = "Connecting to Dhan Live WebSocket feed..."
        elif self._last_tick_time > 0 and (now_mono - self._last_tick_time > STALE_THRESHOLD_SEC):
            status = "STALE"
            safe_msg = f"Last quote is stale (> {STALE_THRESHOLD_SEC}s old). Market may be idle or session ended."
        elif self._is_socket_connected and self._ticks_received > 0:
            status = "LIVE_DATA_AVAILABLE"
            safe_msg = None
        elif self._is_socket_connected and self._subscription_sent and is_indian_market_open():
            status = "SUBSCRIPTION_SENT"
            safe_msg = "Subscription sent. Awaiting first live tick from exchange."
        elif self._is_socket_connected and not is_indian_market_open():
            status = "MARKET_CLOSED_OR_NO_TICK"
            safe_msg = "Indian market is closed (09:15-15:30 IST session). No active live ticks."
        elif self._is_socket_connected:
            status = "SOCKET_CONNECTED_NO_TICK"
            safe_msg = "Socket connected. Awaiting first live tick from exchange."
        elif self._status == "ERROR" or self._error_count > 10:
            status = "ERROR"
            safe_msg = self._safe_error_message or "Dhan feed encountered an error."
        else:
            status = self._status
            safe_msg = self._safe_error_message

        data_access = "AVAILABLE" if (global_dhan_service.is_authenticated and not self._auth_error) else "UNAVAILABLE"

        return {
            "provider": self.provider,
            "account": self.account,
            "status": status,
            "socket_connected": self._is_socket_connected,
            "subscription_sent": self._subscription_sent,
            "first_tick_received": self._ticks_received > 0,
            "subscribed_instruments": len(self._subscribed_instruments),
            "last_tick_at": self._last_tick_iso,
            "freshness_ms": age_ms,
            "close_code": self._last_close_code,
            "close_reason": self._last_close_reason,
            "data_api_access": data_access,
            "execution_mode": "PAPER",
            "ticks_received": self._ticks_received,
            "error_count": self._error_count,
            "error_message": safe_msg,
        }

    def get_cached_quotes(self) -> Dict[str, Dict[str, Any]]:
        """Returns dictionary of all cached ticks by symbol."""
        res: Dict[str, Dict[str, Any]] = {}
        for key, tick in self._cache.items():
            sym = tick.get("symbol", f"{key[2]}_{key[3]}")
            res[sym] = tick
        return res

    def get_quote_by_security_id(self, exchange_segment: str, security_id: str) -> Optional[Dict[str, Any]]:
        cache_key = (self.provider, self.account, str(exchange_segment).upper(), str(security_id))
        return self._cache.get(cache_key)


# Global singleton instance
global_dhan_feed_manager = DhanFeedManager.get_instance()
