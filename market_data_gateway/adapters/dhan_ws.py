"""
Dhan HQ Live Market Data Feed WebSocket Adapter
=================================================
Official binary-decoded real-time WebSocket feed for Indian Stock Market:
- Equities (NSE/BSE)
- Indices (NIFTY 50, BANK NIFTY, FINNIFTY, INDIA VIX)
- Derivatives (NSE Futures & Options)

STRICT TRUTH-IN-DATA:
- Connects exclusively to official Dhan Live Market Feed endpoint: wss://api-feed.dhan.co
- Decodes official Dhan HQ binary frames using little-endian struct unpacking.
- Provides fallback to authorized REST snapshot endpoints (/v2/marketfeed/*).
- Dispatches canonical NormalizedQuote instances directly to the Gateway bus.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import struct
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    import websockets
    from websockets.exceptions import ConnectionClosed
    WS_AVAILABLE = True
except ImportError:
    WS_AVAILABLE = False

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)
from src.dhan_service import (
    global_dhan_service,
    OFFICIAL_DHAN_KEYS,
)

logger = logging.getLogger("MDGateway.DhanWS")
MAX_BACKOFF_SEC = 30.0


def is_indian_market_open() -> bool:
    """
    Checks if Indian stock market (NSE/BSE) is currently in regular trading session:
    Monday to Friday, 09:15 to 15:30 IST (UTC+05:30).
    """
    now_utc = datetime.now(timezone.utc)
    # IST = UTC + 5h30m
    ist_offset = timezone(timezone.utc.utcoffset(now_utc) or __import__("datetime").timedelta(hours=5, minutes=30))
    now_ist = now_utc.astimezone(ist_offset)

    # Check weekday (0 = Monday, ..., 4 = Friday, 5 = Saturday, 6 = Sunday)
    if now_ist.weekday() >= 5:
        return False

    current_time_minutes = now_ist.hour * 60 + now_ist.minute
    market_open_minutes = 9 * 60 + 15    # 09:15 IST
    market_close_minutes = 15 * 60 + 30  # 15:30 IST

    return market_open_minutes <= current_time_minutes <= market_close_minutes


class DhanWSAdapter(BaseProviderAdapter):
    """
    Official Dhan HQ API v2 Market Data WebSocket Adapter.
    Authorizes via Dhan credentials, subscribes to requested Security IDs,
    decodes incoming binary frames, and delivers NormalizedQuote objects.
    """

    def __init__(self):
        super().__init__("dhan_ws", "Dhan HQ Live Market Feed")
        self._ws = None
        self._ws_task: Optional[asyncio.Task] = None
        self._poll_task: Optional[asyncio.Task] = None
        self._running = False
        self._retry_count = 0
        self._last_msg_time: float = 0.0
        self._last_latency_ms: float = 0.0
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._subscribed_symbols: Set[str] = set()
        self._sec_id_to_symbol: Dict[str, str] = {}
        self._bytes_received = 0
        self._messages_received = 0
        self._ticks_received = 0
        self._auth_error_reason: Optional[str] = None
        self._feed_state = "DISCONNECTED"

        # Pre-populate security ID lookup from registry
        for sym, meta in OFFICIAL_DHAN_KEYS.items():
            sec_id = str(meta["security_id"])
            self._sec_id_to_symbol[sec_id] = sym

    @property
    def feed_state(self) -> str:
        if not global_dhan_service.is_authenticated:
            return global_dhan_service._auth_status if global_dhan_service._auth_status != "INITIAL" else "CREDENTIALS_MISSING"
        if not is_indian_market_open() and self._status == "CONNECTED":
            return "MARKET_CLOSED"
        return self._status

    # ─── Connection Lifecycle ────────────────────────────────────────────────

    async def connect(self) -> None:
        if not WS_AVAILABLE:
            logger.error("websockets package not installed. Run: pip install websockets")
            self._status = "DISCONNECTED"
            self._auth_error_reason = "WEBSOCKETS_PACKAGE_MISSING"
            return

        self._running = True

        # Pre-validate token before opening WebSocket connection
        val = global_dhan_service.validate_token()
        if not val.get("valid"):
            self._status = "NOT_CONFIGURED" if val.get("status") == "NOT_CONFIGURED" else "DISCONNECTED"
            self._auth_error_reason = val.get("status", "AUTH_REQUIRED")
            logger.info("Dhan WebSocket: %s (%s). Live feed idle.", self._auth_error_reason, val.get("message"))
            return

        self._status = "CONNECTING"
        logger.info("DhanWSAdapter connecting to official Dhan live feed...")
        if not self._ws_task or self._ws_task.done():
            self._ws_task = asyncio.create_task(self._ws_loop(), name="DhanWSLoop")
        if not self._poll_task or self._poll_task.done():
            self._poll_task = asyncio.create_task(self._rest_poll_fallback_loop(), name="DhanRestPollLoop")

    async def disconnect(self) -> None:
        self._running = False
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass
        if self._poll_task and not self._poll_task.done():
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None
        self._status = "DISCONNECTED"
        logger.info("DhanWSAdapter disconnected.")

    # ─── WebSocket Main Loop ─────────────────────────────────────────────────

    async def _ws_loop(self) -> None:
        """Continuous reconnection loop with exponential backoff."""
        while self._running:
            try:
                client_id = global_dhan_service.client_id
                access_token = global_dhan_service.access_token

                if not client_id or not access_token:
                    self._status = "DISCONNECTED"
                    await asyncio.sleep(5.0)
                    continue

                # Dhan Live Feed WebSocket endpoint
                ws_url = (
                    f"{global_dhan_service.DHAN_FEED_URL}"
                    f"?version=2&token={access_token}&clientId={client_id}&authType=2"
                )

                extra_headers = {
                    "access-token": access_token,
                    "client-id": client_id,
                }

                logger.info("DhanWS: Opening socket to %s", global_dhan_service.DHAN_FEED_URL)
                start_conn_time = time.monotonic()

                async with websockets.connect(
                    ws_url,
                    extra_headers=extra_headers,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                    max_size=10 * 1024 * 1024,
                ) as ws:
                    self._ws = ws
                    self._status = "CONNECTED"
                    self._retry_count = 0
                    self._last_latency_ms = round((time.monotonic() - start_conn_time) * 1000.0, 1)
                    logger.info("DhanWS: Connected successfully! Latency=%.1fms", self._last_latency_ms)

                    # Resubscribe to registered symbols
                    if self._subscribed_symbols:
                        await self._send_subscription(list(self._subscribed_symbols))

                    # Process incoming messages
                    async for raw_message in ws:
                        if not self._running:
                            break
                        self._last_msg_time = time.monotonic()
                        if isinstance(raw_message, bytes):
                            self._bytes_received += len(raw_message)
                            self._messages_received += 1
                            self._handle_binary_frame(raw_message)
                        elif isinstance(raw_message, str):
                            self._messages_received += 1
                            self._handle_text_frame(raw_message)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._error_count += 1
                self._status = "DISCONNECTED"
                self._retry_count += 1
                backoff = min(MAX_BACKOFF_SEC, 2.0 ** min(self._retry_count, 5))
                logger.warning(
                    "DhanWS connection error: %s (attempt %d). Retrying in %.1fs...",
                    exc, self._retry_count, backoff,
                )
                await asyncio.sleep(backoff)

    # ─── Binary Packet Decoding ──────────────────────────────────────────────

    def _handle_binary_frame(self, data: bytes) -> None:
        """
        Decodes official Dhan binary frames using struct.unpack.
        Header Format: <BHBI (8 bytes)
            - ResponseCode (uint8)
            - MessageLength (uint16)
            - ExchangeSegment (uint8)
            - SecurityId (uint32)
        """
        if len(data) < 8:
            return

        try:
            resp_code, msg_len, exch_seg, sec_id_int = struct.unpack_from("<BHBI", data, 0)
            sec_id_str = str(sec_id_int)
            symbol = self._sec_id_to_symbol.get(sec_id_str)

            now_iso = datetime.now(timezone.utc).isoformat()
            now_mono = time.monotonic()

            # ── 1. Ticker Packet (Response Code 2) ──────────────────────────
            if resp_code == 2 and len(data) >= 16:
                ltp, ltt = struct.unpack_from("<fI", data, 8)
                if not symbol:
                    symbol = f"DHAN_{sec_id_str}"

                quote = NormalizedQuote(
                    symbol=symbol,
                    exchange="NSE",
                    provider="dhan_ws",
                    last_price=round(float(ltp), 2),
                    volume=0.0,
                    data_mode="REAL_TIME",
                    event_timestamp=now_iso,
                    received_timestamp=now_iso,
                    feed_latency_ms=round((time.monotonic() - now_mono) * 1000.0, 1),
                )
                self._quote_cache[symbol] = quote
                self._ticks_received += 1
                self._emit(quote)

            # ── 2. Quote Packet (Response Code 4) ───────────────────────────
            elif resp_code == 4 and len(data) >= 50:
                (
                    ltp, ltq, ltt, avg_price, volume,
                    total_sell_qty, total_buy_qty,
                    open_price, close_price, high_price, low_price,
                ) = struct.unpack_from("<fHIfIIIffff", data, 8)

                if not symbol:
                    symbol = f"DHAN_{sec_id_str}"

                ltp_f = round(float(ltp), 2)
                prev_close = float(close_price) if close_price > 0 else ltp_f
                change_pct = round(((ltp_f - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

                quote = NormalizedQuote(
                    symbol=symbol,
                    exchange="NSE",
                    provider="dhan_ws",
                    last_price=ltp_f,
                    volume=float(volume),
                    open=round(float(open_price), 2) if open_price > 0 else None,
                    high=round(float(high_price), 2) if high_price > 0 else None,
                    low=round(float(low_price), 2) if low_price > 0 else None,
                    close=round(float(close_price), 2) if close_price > 0 else None,
                    change_pct=change_pct,
                    vwap=round(float(avg_price), 2) if avg_price > 0 else None,
                    data_mode="REAL_TIME",
                    event_timestamp=now_iso,
                    received_timestamp=now_iso,
                    feed_latency_ms=round((time.monotonic() - now_mono) * 1000.0, 1),
                )
                self._quote_cache[symbol] = quote
                self._ticks_received += 1
                self._emit(quote)

            # ── 3. Full Depth Packet (Response Code 8) ──────────────────────
            elif resp_code == 8 and len(data) >= 50:
                (
                    ltp, ltq, ltt, avg_price, volume,
                    total_sell_qty, total_buy_qty,
                    open_price, close_price, high_price, low_price,
                ) = struct.unpack_from("<fHIfIIIffff", data, 8)

                if not symbol:
                    symbol = f"DHAN_{sec_id_str}"

                ltp_f = round(float(ltp), 2)
                prev_close = float(close_price) if close_price > 0 else ltp_f
                change_pct = round(((ltp_f - prev_close) / prev_close) * 100.0, 2) if prev_close > 0 else 0.0

                # Extract best bid/ask from 5-depth payload if available
                best_bid = 0.0
                best_ask = 0.0
                oi_val = None

                # After 50 bytes, there are 5 bid structures (quantity int32, orders int16, price float32)
                # followed by 5 ask structures
                if len(data) >= 150:
                    try:
                        # Depth format per level: <Ih (quantity uint32, orders int16) followed by float32 price -> 10 bytes
                        best_bid_qty, best_bid_orders, best_bid_price = struct.unpack_from("<IHf", data, 50)
                        best_bid = round(float(best_bid_price), 2)
                        # Ask level 1 is at 50 + (5 * 10) = offset 100
                        best_ask_qty, best_ask_orders, best_ask_price = struct.unpack_from("<IHf", data, 100)
                        best_ask = round(float(best_ask_price), 2)
                    except Exception:
                        pass

                quote = NormalizedQuote(
                    symbol=symbol,
                    exchange="NSE",
                    provider="dhan_ws",
                    last_price=ltp_f,
                    bid=best_bid or ltp_f,
                    ask=best_ask or ltp_f,
                    volume=float(volume),
                    open=round(float(open_price), 2) if open_price > 0 else None,
                    high=round(float(high_price), 2) if high_price > 0 else None,
                    low=round(float(low_price), 2) if low_price > 0 else None,
                    close=round(float(close_price), 2) if close_price > 0 else None,
                    change_pct=change_pct,
                    vwap=round(float(avg_price), 2) if avg_price > 0 else None,
                    oi=oi_val,
                    data_mode="REAL_TIME",
                    event_timestamp=now_iso,
                    received_timestamp=now_iso,
                    feed_latency_ms=round((time.monotonic() - now_mono) * 1000.0, 1),
                )
                self._quote_cache[symbol] = quote
                self._ticks_received += 1
                self._emit(quote)

        except Exception as exc:
            logger.debug("Dhan binary unpack error: %s", exc)

    def _handle_text_frame(self, text: str) -> None:
        """Handles JSON control / acknowledgment frames from Dhan WebSocket."""
        try:
            msg = json.loads(text)
            if msg.get("type") == "error":
                logger.warning("Dhan feed error response: %s", msg)
        except Exception:
            pass

    # ─── REST Polling Fallback ───────────────────────────────────────────────

    async def _rest_poll_fallback_loop(self) -> None:
        """
        Background polling task that guarantees fresh quotes via Dhan REST endpoints
        when WebSocket is establishing or for symbols awaiting tick updates.
        """
        while self._running:
            try:
                await asyncio.sleep(5.0)
                if not global_dhan_service.is_authenticated:
                    continue

                symbols_to_poll = list(self._subscribed_symbols) or ["NIFTY", "BANKNIFTY", "RELIANCE", "HDFCBANK"]
                await self._poll_rest_quotes(symbols_to_poll)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.debug("Dhan REST poll fallback note: %s", exc)

    async def _poll_rest_quotes(self, symbols: List[str]) -> None:
        """Queries Dhan REST quote API for symbols and updates cache."""
        req_map: Dict[str, List[int]] = {}
        sym_by_sec_id: Dict[int, str] = {}

        for sym in symbols:
            meta = global_dhan_service.resolve_symbol(sym)
            if meta:
                sec_id = int(meta["security_id"])
                seg = meta.get("exchange_segment", "NSE_EQ")
                req_map.setdefault(seg, []).append(sec_id)
                sym_by_sec_id[sec_id] = sym

        if not req_map:
            return

        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(None, global_dhan_service.get_market_quote, req_map)

        if not resp or not isinstance(resp, dict) or "data" not in resp:
            return

        data_seg = resp.get("data", {})
        now_iso = datetime.now(timezone.utc).isoformat()

        for seg, items in data_seg.items():
            if not isinstance(items, dict):
                continue
            for sec_id_str, q_data in items.items():
                try:
                    sec_id_int = int(sec_id_str)
                    symbol = sym_by_sec_id.get(sec_id_int) or self._sec_id_to_symbol.get(sec_id_str, f"DHAN_{sec_id_str}")
                    ltp = float(q_data.get("last_price") or q_data.get("ltp") or 0.0)
                    if ltp <= 0:
                        continue

                    open_p = float(q_data.get("open") or 0.0) or None
                    high_p = float(q_data.get("high") or 0.0) or None
                    low_p = float(q_data.get("low") or 0.0) or None
                    close_p = float(q_data.get("close") or 0.0) or None
                    vol = float(q_data.get("volume") or 0.0)
                    chg_pct = float(q_data.get("net_change_percentage") or q_data.get("change_percentage") or 0.0)

                    quote = NormalizedQuote(
                        symbol=symbol,
                        exchange="NSE",
                        provider="dhan_ws",
                        last_price=round(ltp, 2),
                        open=round(open_p, 2) if open_p else None,
                        high=round(high_p, 2) if high_p else None,
                        low=round(low_p, 2) if low_p else None,
                        close=round(close_p, 2) if close_p else None,
                        volume=vol,
                        change_pct=round(chg_pct, 2),
                        data_mode="REAL_TIME" if self._status == "CONNECTED" else "CACHED",
                        event_timestamp=now_iso,
                        received_timestamp=now_iso,
                    )
                    self._quote_cache[symbol] = quote
                    self._emit(quote)
                except Exception as e:
                    logger.debug("Dhan REST item parse note: %s", e)

    # ─── Subscriptions ───────────────────────────────────────────────────────

    async def subscribe(self, symbols: List[str]) -> None:
        new_syms = [s for s in symbols if s not in self._subscribed_symbols]
        for s in symbols:
            self._subscribed_symbols.add(s)

        if new_syms and self._ws and self._status == "CONNECTED":
            await self._send_subscription(list(self._subscribed_symbols))
        
        # Trigger immediate REST poll for fast response
        if new_syms:
            asyncio.create_task(self._poll_rest_quotes(new_syms))

    async def unsubscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            self._subscribed_symbols.discard(s)

        if self._ws and self._status == "CONNECTED":
            await self._send_subscription(list(self._subscribed_symbols))

    async def _send_subscription(self, symbols: List[str]) -> None:
        """Sends JSON subscription payload to Dhan WebSocket."""
        if not self._ws or not self._running:
            return

        instruments: List[Dict[str, str]] = []
        for sym in symbols:
            meta = global_dhan_service.resolve_symbol(sym)
            if meta:
                instruments.append({
                    "ExchangeSegment": meta.get("exchange_segment", "NSE_EQ"),
                    "SecurityId": str(meta["security_id"]),
                })

        if not instruments:
            return

        payload = {
            "RequestCode": 16,  # 16 = Quote Feed (LTP + OHLC + Volume)
            "InstrumentCount": len(instruments),
            "InstrumentList": instruments,
        }

        try:
            await self._ws.send(json.dumps(payload))
            logger.info("DhanWS: Subscribed to %d instruments", len(instruments))
        except Exception as exc:
            logger.warning("DhanWS send subscription failed: %s", exc)

    # ─── Base Adapter Methods ────────────────────────────────────────────────

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        result: Dict[str, NormalizedQuote] = {}
        missing: List[str] = []
        for sym in symbols:
            if sym in self._quote_cache:
                result[sym] = self._quote_cache[sym]
            else:
                missing.append(sym)

        if missing and global_dhan_service.is_authenticated:
            await self._poll_rest_quotes(missing)
            for sym in missing:
                if sym in self._quote_cache:
                    result[sym] = self._quote_cache[sym]

        return result

    async def get_history(
        self,
        symbol: str,
        timeframe: str,
        from_dt: datetime,
        to_dt: datetime,
    ) -> List[OHLCVCandle]:
        meta = global_dhan_service.resolve_symbol(symbol)
        if not meta or not global_dhan_service.is_authenticated:
            return []

        sec_id = str(meta["security_id"])
        seg = meta.get("exchange_segment", "NSE_EQ")
        from_str = from_dt.strftime("%Y-%m-%d")
        to_str = to_dt.strftime("%Y-%m-%d")

        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(
            None,
            lambda: global_dhan_service.get_historical_charts(
                security_id=sec_id,
                exchange_segment=seg,
                from_date=from_str,
                to_date=to_str,
            ),
        )

        candles: List[OHLCVCandle] = []
        if not resp or not isinstance(resp, dict) or "data" not in resp:
            return candles

        chart_data = resp.get("data", {})
        timestamps = chart_data.get("timestamp", [])
        opens = chart_data.get("open", [])
        highs = chart_data.get("high", [])
        lows = chart_data.get("low", [])
        closes = chart_data.get("close", [])
        volumes = chart_data.get("volume", [])

        for i in range(len(timestamps)):
            try:
                dt_iso = datetime.fromtimestamp(timestamps[i], tz=timezone.utc).isoformat()
                candles.append(
                    OHLCVCandle(
                        symbol=symbol,
                        exchange="NSE",
                        provider="dhan_ws",
                        timeframe=timeframe,
                        timestamp=dt_iso,
                        open=float(opens[i]),
                        high=float(highs[i]),
                        low=float(lows[i]),
                        close=float(closes[i]),
                        volume=float(volumes[i]) if i < len(volumes) else 0.0,
                    )
                )
            except Exception:
                continue

        return candles

    async def get_instruments(self) -> List[CanonicalInstrument]:
        instruments: List[CanonicalInstrument] = []
        for sym, meta in OFFICIAL_DHAN_KEYS.items():
            instruments.append(
                CanonicalInstrument(
                    canonical_symbol=sym,
                    display_name=meta.get("name", sym),
                    asset_class=meta.get("asset_class", "INDIAN_EQUITIES"),
                    exchange=meta.get("exchange", "NSE"),
                    mic_code="XNSE",
                    region="IN",
                    currency="INR",
                    timezone="Asia/Kolkata",
                    lot_size=meta.get("lot_size", 1),
                    tick_size=meta.get("tick_size", 0.05),
                    provider_symbols={"dhan": str(meta["security_id"])},
                )
            )
        return instruments

    async def health_check(self) -> ProviderHealth:
        age_ms = 0.0
        if self._last_msg_time > 0:
            age_ms = round((time.monotonic() - self._last_msg_time) * 1000.0, 1)

        msg = (
            f"Active (ticks={self._ticks_received}, latency={self._last_latency_ms}ms)"
            if self._status == "CONNECTED"
            else self._auth_error_reason or "Dhan feed initializing"
        )

        return ProviderHealth(
            provider_id=self.provider_id,
            provider_name=self.provider_name,
            status=self.feed_state,
            asset_classes=["INDIAN_INDICES", "INDIAN_EQUITIES", "OPTIONS", "FUTURES"],
            subscribed_symbols=len(self._subscribed_symbols),
            latency_ms=self._last_latency_ms,
            error_count=self._error_count,
            last_tick_time=datetime.now(timezone.utc).isoformat() if self._last_msg_time > 0 else None,
            message=msg,
        )
