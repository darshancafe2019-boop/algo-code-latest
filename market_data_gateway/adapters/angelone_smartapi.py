"""
Angel One SmartAPI Adapter
===========================
NSE/BSE live data via Angel One SmartAPI (free tier, TOTP-based auth).
WebSocket feed for subscribed symbols; REST snapshot fallback.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)

logger = logging.getLogger("MDGateway.AngelOne")

ANGEL_REST_BASE = "https://apiconnect.angelone.in"

# SmartAPI WebSocket endpoint
ANGEL_WS_URL = "wss://smartapisocket.angelone.in/smart-stream"


def _configured() -> bool:
    key = os.environ.get("ANGELONE_API_KEY", "NOT_CONFIGURED")
    token = os.environ.get("ANGELONE_AUTH_TOKEN", "")
    return key not in ("NOT_CONFIGURED", "", None) and bool(token)


class AngelOneAdapter(BaseProviderAdapter):
    """
    Angel One SmartAPI market data adapter.
    Status is NOT_CONFIGURED until credentials are provided.

    Auth flow:
        1. Login with TOTP -> get jwtToken + feedToken
        2. Use feedToken for WebSocket connection
        3. Subscribe to instrument tokens (numeric IDs from symbol master)
    """

    def __init__(self):
        super().__init__("angelone", "Angel One SmartAPI")
        self._jwt_token: str = ""
        self._feed_token: str = ""
        self._ws_task: Optional[asyncio.Task] = None
        self._running = False
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        # Map canonical_symbol -> instrument_token (numeric NSE ID)
        self._token_map: Dict[str, str] = {}
        self._last_msg_time: float = 0.0

    async def connect(self) -> None:
        if not _configured():
            self._status = "NOT_CONFIGURED"
            logger.info("AngelOne SmartAPI: NOT_CONFIGURED (set ANGELONE_API_KEY, ANGELONE_CLIENT_ID, ANGELONE_TOTP_SECRET, ANGELONE_PIN in .env)")
            return

        ok = await self._authenticate()
        if not ok:
            self._status = "DISCONNECTED"
            return

        self._running = True
        self._status = "LIVE"
        logger.info("AngelOne SmartAPI connected (JWT obtained)")

    async def disconnect(self) -> None:
        self._running = False
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass
        self._status = "DISCONNECTED"

    async def subscribe(self, symbols: List[str]) -> None:
        if self._status == "NOT_CONFIGURED":
            return
        new_syms = [s for s in symbols if s not in self._subscribed_symbols]
        if not new_syms:
            return
        for s in new_syms:
            self._subscribed_symbols.add(s)
        # Resolve instrument tokens for new symbols
        await self._resolve_tokens(new_syms)
        await self._restart_ws()

    async def unsubscribe(self, symbols: List[str]) -> None:
        for s in symbols:
            self._subscribed_symbols.discard(s)
            self._quote_cache.pop(s, None)
            self._token_map.pop(s, None)
        if not self._subscribed_symbols:
            await self._stop_ws()
        else:
            await self._restart_ws()

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        result: Dict[str, NormalizedQuote] = {}
        if self._status == "NOT_CONFIGURED":
            return result
        for sym in symbols:
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
        """Fetch candle data via SmartAPI /candle endpoint."""
        if not self._jwt_token:
            return []

        interval_map = {
            "1m": "ONE_MINUTE", "5m": "FIVE_MINUTE", "15m": "FIFTEEN_MINUTE",
            "30m": "THIRTY_MINUTE", "1h": "ONE_HOUR", "1d": "ONE_DAY",
        }
        ang_interval = interval_map.get(timeframe, "ONE_DAY")
        token = self._token_map.get(symbol)
        if not token:
            await self._resolve_tokens([symbol])
            token = self._token_map.get(symbol)
        if not token:
            return []

        candles: List[OHLCVCandle] = []
        try:
            import aiohttp
            headers = {
                "Authorization": f"Bearer {self._jwt_token}",
                "X-PrivateKey": os.environ.get("ANGELONE_API_KEY", ""),
                "X-SourceID": "WEB",
                "X-ClientLocalIP": "127.0.0.1",
                "X-ClientPublicIP": "127.0.0.1",
                "X-MACAddress": "00:00:00:00:00:00",
                "X-UserType": "USER",
            }
            payload = {
                "exchange": "NSE",
                "symboltoken": token,
                "interval": ang_interval,
                "fromdate": from_dt.strftime("%Y-%m-%d %H:%M"),
                "todate": to_dt.strftime("%Y-%m-%d %H:%M"),
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{ANGEL_REST_BASE}/rest/secure/angelbroking/historical/v1/getCandleData",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    data = await resp.json()
                    rows = data.get("data", [])
                    for row in rows:
                        if len(row) >= 6:
                            ts = row[0]
                            candles.append(OHLCVCandle(
                                symbol=symbol, exchange="NSE", provider="angelone",
                                timeframe=timeframe, timestamp=ts,
                                open=float(row[1]), high=float(row[2]),
                                low=float(row[3]), close=float(row[4]),
                                volume=float(row[5]), is_closed=True,
                            ))
        except Exception as exc:
            logger.error("AngelOne history fetch error for %s: %s", symbol, exc)
        return candles

    async def get_instruments(self) -> List[CanonicalInstrument]:
        return []

    async def health_check(self) -> ProviderHealth:
        if self._status == "NOT_CONFIGURED":
            return ProviderHealth(
                provider_id="angelone",
                provider_name="Angel One SmartAPI",
                status="NOT_CONFIGURED",
                asset_classes=["INDIAN_EQUITIES", "INDIAN_INDICES"],
                message="Set ANGELONE_API_KEY, ANGELONE_CLIENT_ID, ANGELONE_TOTP_SECRET, ANGELONE_PIN in .env",
            )
        age = time.time() - self._last_msg_time if self._last_msg_time else 9999.0
        status = "STALE" if age > 15 and self._subscribed_symbols else self._status
        return ProviderHealth(
            provider_id="angelone",
            provider_name="Angel One SmartAPI",
            status=status,
            asset_classes=["INDIAN_EQUITIES", "INDIAN_INDICES"],
            subscribed_symbols=len(self._subscribed_symbols),
            error_count=self._error_count,
            last_tick_time=datetime.fromtimestamp(self._last_msg_time, tz=timezone.utc).isoformat() if self._last_msg_time else None,
        )

    # ─── Internal ─────────────────────────────────────────────────────────────

    async def _authenticate(self) -> bool:
        """Perform TOTP-based login to get JWT + feedToken."""
        try:
            import aiohttp
            import pyotp

            api_key = os.environ.get("ANGELONE_API_KEY", "")
            client_id = os.environ.get("ANGELONE_CLIENT_ID", "")
            totp_secret = os.environ.get("ANGELONE_TOTP_SECRET", "")
            pin = os.environ.get("ANGELONE_PIN", "")

            totp = pyotp.TOTP(totp_secret).now() if totp_secret else ""
            payload = {
                "clientcode": client_id,
                "password": pin,
                "totp": totp,
            }
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-UserType": "USER",
                "X-SourceID": "WEB",
                "X-ClientLocalIP": "127.0.0.1",
                "X-ClientPublicIP": "127.0.0.1",
                "X-MACAddress": "00:00:00:00:00:00",
                "X-PrivateKey": api_key,
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{ANGEL_REST_BASE}/rest/auth/angelbroking/user/v1/loginByPassword",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    data = await resp.json()
                    tokens = data.get("data", {})
                    self._jwt_token = tokens.get("jwtToken", "")
                    self._feed_token = tokens.get("feedToken", "")
                    if self._jwt_token:
                        logger.info("AngelOne SmartAPI auth succeeded")
                        return True
                    logger.error("AngelOne auth failed: %s", data.get("message", "Unknown"))
                    return False
        except ImportError:
            logger.error("pyotp not installed. Run: pip install pyotp")
            return False
        except Exception as exc:
            logger.error("AngelOne auth error: %s", exc)
            return False

    async def _resolve_tokens(self, symbols: List[str]) -> None:
        """Map canonical symbols to NSE instrument tokens via symbol master."""
        # Use a simple hardcoded mapping for common NSE instruments
        # Full master can be fetched from SmartAPI /symbolmaster endpoint
        NSE_TOKEN_MAP: Dict[str, str] = {
            "NIFTY": "26000", "BANKNIFTY": "26009", "FINNIFTY": "26037",
            "SENSEX": "1", "RELIANCE": "2885", "TCS": "11536", "INFY": "1594",
            "HDFCBANK": "1333", "ICICIBANK": "4963", "SBIN": "3045",
            "ITC": "1660", "BHARTIARTL": "10604", "KOTAKBANK": "1922",
            "LT": "11483", "AXISBANK": "5900", "HCLTECH": "7229",
            "ASIANPAINT": "236", "TITAN": "3506", "MARUTI": "10999",
            "SUNPHARMA": "3351", "BAJFINANCE": "317",
            "WIPRO": "3787", "ONGC": "2475", "ZOMATO": "5097",
            "ADANIENT": "25", "TATAMOTORS": "3456", "TATASTEEL": "3505",
        }
        for sym in symbols:
            if sym not in self._token_map:
                token = NSE_TOKEN_MAP.get(sym)
                if token:
                    self._token_map[sym] = token

    async def _restart_ws(self) -> None:
        await self._stop_ws()
        if self._subscribed_symbols and self._running and self._feed_token:
            self._ws_task = asyncio.create_task(self._ws_loop())

    async def _stop_ws(self) -> None:
        if self._ws_task and not self._ws_task.done():
            self._ws_task.cancel()
            try:
                await asyncio.wait_for(self._ws_task, timeout=3.0)
            except (asyncio.CancelledError, asyncio.TimeoutError):
                pass

    async def _ws_loop(self) -> None:
        """Angel One SmartStream WebSocket loop."""
        try:
            import websockets

            # Build subscription request
            token_list = [
                {"exchangeType": 1, "tokens": list(self._token_map.values())}
            ]
            sub_msg = json.dumps({
                "correlationID": "quantos_mdg",
                "action": 1,
                "params": {"mode": 3, "tokenList": token_list},
            })

            async with websockets.connect(
                ANGEL_WS_URL,
                extra_headers={
                    "Authorization": self._jwt_token,
                    "x-feed-token": self._feed_token,
                    "x-client-code": os.environ.get("ANGELONE_CLIENT_ID", ""),
                    "x-client-api-secret": os.environ.get("ANGELONE_API_KEY", ""),
                },
                ping_interval=25,
                ping_timeout=15,
            ) as ws:
                await ws.send(sub_msg)
                logger.info("AngelOne SmartStream WS connected (%d tokens)", len(self._token_map))
                async for msg in ws:
                    if not self._running:
                        break
                    self._parse_ws_message(msg)
        except Exception as exc:
            self._record_error(str(exc))
            logger.warning("AngelOne WS error: %s — reconnecting in 5s", exc)
            await asyncio.sleep(5)

    def _parse_ws_message(self, msg: Any) -> None:
        """Parse Angel One binary/JSON tick and emit NormalizedQuote."""
        try:
            # SmartStream sends binary data; decode LTP mode (mode=3)
            if isinstance(msg, bytes) and len(msg) >= 51:
                import struct
                # First byte: subscription type, bytes 1-25: token, 26-27: sequence, ...
                # LTP is at offset 43 as 4-byte int (divide by 100)
                ltp_raw = struct.unpack(">I", msg[43:47])[0]
                last_price = ltp_raw / 100.0
                token_bytes = msg[1:26].split(b"\x00")[0]
                token_str = token_bytes.decode("utf-8", errors="ignore")

                # Reverse-map token to canonical symbol
                canon_sym = next((k for k, v in self._token_map.items() if v == token_str), token_str)
                recv_iso = datetime.now(timezone.utc).isoformat()

                quote = NormalizedQuote(
                    symbol=canon_sym, exchange="NSE", provider="angelone",
                    last_price=last_price,
                    event_timestamp=recv_iso, received_timestamp=recv_iso,
                    data_mode="REAL_TIME",
                )
                self._quote_cache[canon_sym] = quote
                self._last_msg_time = time.time()
                self._emit(quote)
            elif isinstance(msg, str):
                # JSON heartbeat or error frame
                data = json.loads(msg)
                if data.get("type") == "pong":
                    pass
        except Exception as exc:
            logger.debug("AngelOne parse error: %s", exc)
