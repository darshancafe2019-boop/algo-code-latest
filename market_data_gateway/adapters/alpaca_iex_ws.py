"""
Alpaca Free IEX Real-Time Market Data WebSocket Adapter
=========================================================
Real-time US equities market quotes and trades via Alpaca Data API v2 (IEX feed).
Endpoint: wss://stream.data.alpaca.markets/v2/iex
Clearly labeled as IEX REAL-TIME (free exchange feed, not full SIP consolidated data).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

import aiohttp
from market_data_gateway.adapters.base import (
    BaseProviderAdapter,
    CanonicalInstrument,
    NormalizedQuote,
    OHLCVCandle,
    ProviderHealth,
)

logger = logging.getLogger("MDGateway.AlpacaIEX")


class AlpacaIEXWSAdapter(BaseProviderAdapter):
    """
    Alpaca Free IEX WebSocket real-time market data provider adapter.
    """

    def __init__(self, api_key: Optional[str] = None, api_secret: Optional[str] = None):
        super().__init__("alpaca_iex", "Alpaca IEX (Real-Time)")
        self._api_key = (api_key or os.environ.get("ALPACA_API_KEY", "")).strip()
        self._api_secret = (api_secret or os.environ.get("ALPACA_API_SECRET", "")).strip()
        self._quote_cache: Dict[str, NormalizedQuote] = {}
        self._subscribed_symbols: Set[str] = set()
        self._ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self._session: Optional[aiohttp.ClientSession] = None
        self._listen_task: Optional[asyncio.Task] = None
        self._reconnect_task: Optional[asyncio.Task] = None
        self._authenticated = False
        self._running = False
        self._status = "LIVE" if (self._api_key and self._api_secret) else "NOT_CONFIGURED"

    async def connect(self) -> None:
        self._api_key = (self._api_key or os.environ.get("ALPACA_API_KEY", "")).strip()
        self._api_secret = (self._api_secret or os.environ.get("ALPACA_API_SECRET", "")).strip()
        if not self._api_key or not self._api_secret:
            self._status = "NOT_CONFIGURED"
            logger.info("AlpacaIEXWSAdapter: ALPACA_API_KEY or ALPACA_API_SECRET not set; NOT_CONFIGURED.")
            return

        self._running = True
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        await self._connect_ws()

    async def _connect_ws(self) -> None:
        if not self._running or not self._api_key or not self._api_secret:
            return

        url = "wss://stream.data.alpaca.markets/v2/iex"
        try:
            if self._session is None or self._session.closed:
                self._session = aiohttp.ClientSession()

            self._ws = await self._session.ws_connect(url, heartbeat=20.0)
            self._authenticated = False
            logger.info("AlpacaIEXWSAdapter connected to %s", url)

            if self._listen_task is None or self._listen_task.done():
                self._listen_task = asyncio.create_task(self._listen_loop())

        except Exception as exc:
            self._status = "ERROR"
            logger.error("AlpacaIEXWSAdapter WS connection failed: %s", exc)
            self._schedule_reconnect()

    def _schedule_reconnect(self) -> None:
        if self._running and (self._reconnect_task is None or self._reconnect_task.done()):
            self._reconnect_task = asyncio.create_task(self._reconnect_loop())

    async def _reconnect_loop(self) -> None:
        delay = 2.0
        while self._running and (self._ws is None or self._ws.closed):
            await asyncio.sleep(delay)
            logger.info("Attempting Alpaca IEX WS reconnect...")
            try:
                await self._connect_ws()
                if self._ws and not self._ws.closed:
                    break
            except Exception as e:
                logger.warning("Alpaca IEX WS reconnect attempt failed: %s", e)
            delay = min(delay * 1.5, 15.0)

    async def _listen_loop(self) -> None:
        while self._running and self._ws and not self._ws.closed:
            try:
                msg = await self._ws.receive()
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data_list = json.loads(msg.data)
                    if isinstance(data_list, list):
                        for item in data_list:
                            await self._parse_item(item)
                elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                    logger.warning("Alpaca IEX WS closed or error.")
                    break
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Alpaca IEX WS listen loop error: %s", exc)
                break

        if self._running:
            self._authenticated = False
            self._status = "DISCONNECTED"
            self._schedule_reconnect()

    async def _parse_item(self, item: dict) -> None:
        t_type = item.get("T")
        if t_type == "success":
            msg = item.get("msg")
            if msg == "connected":
                # Send authentication
                auth_msg = {
                    "action": "auth",
                    "key": self._api_key,
                    "secret": self._api_secret,
                }
                if self._ws and not self._ws.closed:
                    await self._ws.send_json(auth_msg)
                    logger.info("Sent Alpaca IEX authentication request.")
            elif msg == "authenticated":
                self._authenticated = True
                self._status = "LIVE"
                logger.info("Alpaca IEX WS authenticated successfully!")
                # Resubscribe symbols
                if self._subscribed_symbols:
                    await self._send_subscribe(list(self._subscribed_symbols))
        elif t_type == "error":
            logger.error("Alpaca IEX WS error msg: %s (code %s)", item.get("msg"), item.get("code"))
            if item.get("code") in (401, 402):
                self._status = "AUTH_REQUIRED"
        elif t_type in ("t", "q"):
            # 't' = Trade, 'q' = Quote
            sym = str(item.get("S", "")).upper().strip()
            if not sym:
                return

            now_iso = datetime.now(timezone.utc).isoformat()
            evt_ts = str(item.get("t") or now_iso)
            existing = self._quote_cache.get(sym)

            if t_type == "t":
                last_p = float(item.get("p", 0.0))
                if last_p <= 0:
                    return
                vol = float(item.get("s", 0.0))
                bid_val = existing.bid if existing else last_p
                ask_val = existing.ask if existing else last_p
                quote = NormalizedQuote(
                    symbol=sym,
                    exchange="IEX",
                    provider="alpaca_iex",
                    last_price=last_p,
                    bid=bid_val,
                    ask=ask_val,
                    volume=vol,
                    event_timestamp=evt_ts,
                    received_timestamp=now_iso,
                    data_mode="REAL_TIME",
                    status="LIVE",
                    is_stale=False,
                )
                self._quote_cache[sym] = quote
                self._emit(quote)
            elif t_type == "q":
                bp = float(item.get("bp") or 0.0)
                ap = float(item.get("ap") or 0.0)
                if bp <= 0 and ap <= 0:
                    return
                last_p = existing.last_price if existing else ((bp + ap) / 2.0 if (bp > 0 and ap > 0) else (bp or ap))
                if last_p <= 0:
                    return
                quote = NormalizedQuote(
                    symbol=sym,
                    exchange="IEX",
                    provider="alpaca_iex",
                    last_price=last_p,
                    bid=bp if bp > 0 else last_p,
                    ask=ap if ap > 0 else last_p,
                    volume=existing.volume if existing else 0.0,
                    event_timestamp=evt_ts,
                    received_timestamp=now_iso,
                    data_mode="REAL_TIME",
                    status="LIVE",
                    is_stale=False,
                )
                self._quote_cache[sym] = quote
                self._emit(quote)

    async def _send_subscribe(self, symbols: List[str]) -> None:
        if not self._ws or self._ws.closed or not self._authenticated:
            return
        sub_msg = {
            "action": "subscribe",
            "trades": symbols,
            "quotes": symbols,
        }
        await self._ws.send_json(sub_msg)
        logger.info("Alpaca IEX dispatched subscribe for trades and quotes: %s", symbols)

    async def subscribe(self, symbols: List[str]) -> None:
        if not self._api_key or not self._api_secret:
            return

        new_syms = [s.upper().strip() for s in symbols if s.upper().strip() not in self._subscribed_symbols]
        if not new_syms:
            return

        for s in new_syms:
            self._subscribed_symbols.add(s)

        if self._authenticated and self._ws and not self._ws.closed:
            await self._send_subscribe(new_syms)

    async def unsubscribe(self, symbols: List[str]) -> None:
        if not self._api_key or not self._api_secret:
            return

        unsub_syms = [s.upper().strip() for s in symbols if s.upper().strip() in self._subscribed_symbols]
        if not unsub_syms:
            return

        for s in unsub_syms:
            self._subscribed_symbols.discard(s)
            self._quote_cache.pop(s, None)

        if self._authenticated and self._ws and not self._ws.closed:
            unsub_msg = {
                "action": "unsubscribe",
                "trades": unsub_syms,
                "quotes": unsub_syms,
            }
            await self._ws.send_json(unsub_msg)

    async def get_snapshot(self, symbols: List[str]) -> Dict[str, NormalizedQuote]:
        res: Dict[str, NormalizedQuote] = {}
        missing: List[str] = []
        for s in symbols:
            upper_s = s.upper().strip()
            if upper_s in self._quote_cache:
                res[upper_s] = self._quote_cache[upper_s]
            else:
                missing.append(upper_s)

        if missing and self._api_key and self._api_secret and self._session:
            try:
                syms_param = ",".join(missing)
                url = f"https://data.alpaca.markets/v2/stocks/snapshots?symbols={syms_param}&feed=iex"
                headers = {
                    "APCA-API-KEY-ID": self._api_key,
                    "APCA-API-SECRET-KEY": self._api_secret,
                }
                async with self._session.get(url, headers=headers, timeout=3.0) as resp:
                    if resp.status == 200:
                        json_data = await resp.json()
                        now_iso = datetime.now(timezone.utc).isoformat()
                        if isinstance(json_data, dict):
                            for sym_k, snap in json_data.items():
                                canon_sym = sym_k.upper().strip()
                                trade = snap.get("latestTrade") or {}
                                quote_obj = snap.get("latestQuote") or {}
                                lp = float(trade.get("p") or quote_obj.get("ap") or 0.0)
                                if lp > 0:
                                    q = NormalizedQuote(
                                        symbol=canon_sym,
                                        exchange="IEX",
                                        provider="alpaca_iex",
                                        last_price=lp,
                                        bid=float(quote_obj.get("bp")) if quote_obj.get("bp") else lp,
                                        ask=float(quote_obj.get("ap")) if quote_obj.get("ap") else lp,
                                        volume=float(trade.get("s")) if trade.get("s") else 0.0,
                                        event_timestamp=now_iso,
                                        received_timestamp=now_iso,
                                        data_mode="REAL_TIME",
                                        is_stale=False,
                                    )
                                    self._quote_cache[canon_sym] = q
                                    res[canon_sym] = q
            except Exception as ex:
                logger.debug("Alpaca IEX REST snapshot note: %s", ex)

        return res

    async def get_history(self, symbol: str, timeframe: str, from_dt: datetime, to_dt: datetime) -> List[OHLCVCandle]:
        return []

    async def get_instruments(self) -> List[CanonicalInstrument]:
        return []

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            provider_id="alpaca_iex",
            provider_name="Alpaca IEX (Real-Time)",
            status=self._status,
            asset_classes=["GLOBAL_EQUITIES"],
            subscribed_symbols=len(self._subscribed_symbols),
            error_count=self._error_count,
            message="Alpaca Free IEX Real-Time Data Feed (IEX Real-Time, single exchange feed)." if (self._api_key and self._api_secret) else "Set ALPACA_API_KEY and ALPACA_API_SECRET in .env to activate.",
        )

    async def disconnect(self) -> None:
        self._running = False
        self._authenticated = False
        if self._ws and not self._ws.closed:
            await self._ws.close()
        if self._session and not self._session.closed:
            await self._session.close()
        self._status = "DISCONNECTED"
